/**
 * Servicio para gestionar conversaciones y control manual con PostgreSQL
 */

const db = require('../config/database');

class ConversationService {
  constructor() {
    // Cache en memoria para performance y fallback
    this.cache = new Map();
    this.messageHistory = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    
    // Verificar si la base de datos está configurada
    this.useDatabase = db.isDatabaseConfigured;
    console.log(`📊 ConversationService usando: ${this.useDatabase ? 'PostgreSQL' : 'Memoria'}`);
  }

  /**
   * Obtener una conversación por número de teléfono
   */
  async getConversation(phoneNumber) {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    
    if (!this.useDatabase) {
      // Fallback a memoria
      return this.cache.get(cleanPhone) || {
        phoneNumber: cleanPhone,
        isManualMode: false,
        assignedAdmin: null,
        lastActivity: new Date(),
        contactName: 'Sin nombre',
        messageCount: 0
      };
    }
    
    try {
      const result = await db.query(
        'SELECT * FROM conversations WHERE phone_number = $1',
        [cleanPhone]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          phoneNumber: row.phone_number,
          contactName: row.contact_name,
          isManualMode: row.is_manual_mode,
          assignedAdmin: row.assigned_admin,
          manualModeStarted: row.manual_mode_started,
          manualModeEnded: row.manual_mode_ended,
          messageCount: row.message_count,
          lastActivity: row.last_activity
        };
      } else {
        // Crear conversación por defecto si no existe
        const defaultConversation = {
          phoneNumber: cleanPhone,
          isManualMode: false,
          assignedAdmin: null,
          lastActivity: new Date(),
          contactName: 'Sin nombre',
          messageCount: 0
        };
        return defaultConversation;
      }
    } catch (error) {
      console.error('❌ Error obteniendo conversación (usando fallback):', error);
      // Fallback a conversación en memoria
      return this.cache.get(cleanPhone) || {
        phoneNumber: cleanPhone,
        isManualMode: false,
        assignedAdmin: null,
        lastActivity: new Date(),
        contactName: 'Sin nombre',
        messageCount: 0
      };
    }
  }

  /**
   * Crear o actualizar una conversación
   */
  async updateConversation(phoneNumber, updates) {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    
    if (!this.useDatabase) {
      // Fallback a memoria
      const existing = this.cache.get(cleanPhone) || {
        phoneNumber: cleanPhone,
        isManualMode: false,
        assignedAdmin: null,
        lastActivity: new Date(),
        contactName: 'Sin nombre',
        messageCount: 0
      };
      
      const updated = {
        ...existing,
        ...updates,
        phoneNumber: cleanPhone,
        lastActivity: new Date()
      };
      
      this.cache.set(cleanPhone, updated);
      return updated;
    }
    
    try {
      // Verificar si la conversación existe
      const existing = await db.query(
        'SELECT * FROM conversations WHERE phone_number = $1',
        [cleanPhone]
      );

      if (existing.rows.length > 0) {
        // Actualizar conversación existente
        const setClause = [];
        const values = [];
        let paramCounter = 1;

        if (updates.contactName !== undefined) {
          setClause.push(`contact_name = $${paramCounter++}`);
          values.push(updates.contactName);
        }
        if (updates.isManualMode !== undefined) {
          setClause.push(`is_manual_mode = $${paramCounter++}`);
          values.push(updates.isManualMode);
        }
        if (updates.assignedAdmin !== undefined) {
          setClause.push(`assigned_admin = $${paramCounter++}`);
          values.push(updates.assignedAdmin);
        }
        if (updates.manualModeStarted !== undefined) {
          setClause.push(`manual_mode_started = $${paramCounter++}`);
          values.push(updates.manualModeStarted);
        }
        if (updates.manualModeEnded !== undefined) {
          setClause.push(`manual_mode_ended = $${paramCounter++}`);
          values.push(updates.manualModeEnded);
        }
        if (updates.messageCount !== undefined) {
          setClause.push(`message_count = $${paramCounter++}`);
          values.push(updates.messageCount);
        }

        setClause.push(`last_activity = NOW(), updated_at = NOW()`);
        values.push(cleanPhone);

        const query = `
          UPDATE conversations 
          SET ${setClause.join(', ')}
          WHERE phone_number = $${paramCounter}
          RETURNING *
        `;

        const result = await db.query(query, values);
        return this.mapDbRowToConversation(result.rows[0]);
      } else {
        // Crear nueva conversación
        const result = await db.query(`
          INSERT INTO conversations (
            phone_number, contact_name, is_manual_mode, assigned_admin,
            manual_mode_started, manual_mode_ended, message_count, last_activity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING *
        `, [
          cleanPhone,
          updates.contactName || 'Sin nombre',
          updates.isManualMode || false,
          updates.assignedAdmin || null,
          updates.manualModeStarted || null,
          updates.manualModeEnded || null,
          updates.messageCount || 0
        ]);

        return this.mapDbRowToConversation(result.rows[0]);
      }
    } catch (error) {
      console.error('❌ Error actualizando conversación (usando fallback):', error);
      // Fallback a memoria
      return this.updateConversationInMemory(cleanPhone, updates);
    }
  }

  /**
   * Fallback para actualizar conversación en memoria
   */
  updateConversationInMemory(phoneNumber, updates) {
    const existing = this.cache.get(phoneNumber) || {
      phoneNumber,
      isManualMode: false,
      assignedAdmin: null,
      lastActivity: new Date(),
      contactName: 'Sin nombre',
      messageCount: 0
    };
    
    const updated = {
      ...existing,
      ...updates,
      phoneNumber,
      lastActivity: new Date()
    };
    
    this.cache.set(phoneNumber, updated);
    return updated;
  }

  /**
   * Activar modo manual para una conversación
   */
  async setManualMode(phoneNumber, adminId = 'admin') {
    console.log(`🔧 Activando modo manual para ${phoneNumber}`);
    return await this.updateConversation(phoneNumber, {
      isManualMode: true,
      assignedAdmin: adminId,
      manualModeStarted: new Date()
    });
  }

  /**
   * Desactivar modo manual (volver a IA)
   */
  async setAutoMode(phoneNumber) {
    console.log(`🤖 Activando modo automático para ${phoneNumber}`);
    return await this.updateConversation(phoneNumber, {
      isManualMode: false,
      assignedAdmin: null,
      manualModeEnded: new Date()
    });
  }

  /**
   * Verificar si una conversación está en modo manual
   */
  async isManualMode(phoneNumber) {
    const conversation = await this.getConversation(phoneNumber);
    return conversation.isManualMode || false;
  }

  /**
   * Agregar mensaje al historial
   */
  async addMessage(phoneNumber, message, sender = 'user', contactName = 'Sin nombre', messageId = null) {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    
    const messageData = {
      id: messageId || Date.now().toString(),
      text: message,
      sender,
      timestamp: new Date(),
      phoneNumber: cleanPhone
    };

    if (!this.useDatabase) {
      // Fallback a memoria
      if (!this.messageHistory.has(cleanPhone)) {
        this.messageHistory.set(cleanPhone, []);
      }
      
      this.messageHistory.get(cleanPhone).push(messageData);
      
      // Mantener solo los últimos 100 mensajes por conversación
      const messages = this.messageHistory.get(cleanPhone);
      if (messages.length > 100) {
        this.messageHistory.set(cleanPhone, messages.slice(-100));
      }
      
      // Actualizar conversación
      await this.updateConversation(cleanPhone, {
        contactName,
        messageCount: messages.length
      });
      
      console.log(`💬 Mensaje agregado (memoria): ${sender} -> ${cleanPhone}: "${message}"`);
      
      // Emitir evento de WebSocket para tiempo real
      this.emitNewMessage(cleanPhone, messageData, contactName);
      
      return messageData;
    }
    
    try {
      // Insertar mensaje en la base de datos
      await db.query(`
        INSERT INTO messages (phone_number, message_text, sender, message_id, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `, [cleanPhone, message, sender, messageId || Date.now().toString()]);

      // Actualizar contador de mensajes y última actividad
      const messageCount = await this.getMessageCount(cleanPhone);
      await this.updateConversation(cleanPhone, {
        contactName,
        messageCount
      });

      console.log(`💬 Mensaje agregado (DB): ${sender} -> ${cleanPhone}: "${message}"`);
      
      // Emitir evento de WebSocket para tiempo real
      this.emitNewMessage(cleanPhone, messageData, contactName);
      
      return messageData;
    } catch (error) {
      console.error('❌ Error agregando mensaje (usando fallback):', error);
      // Fallback a memoria
      if (!this.messageHistory.has(cleanPhone)) {
        this.messageHistory.set(cleanPhone, []);
      }
      this.messageHistory.get(cleanPhone).push(messageData);
      console.log(`💬 Mensaje agregado (memoria fallback): ${sender} -> ${cleanPhone}: "${message}"`);
      
      // Emitir evento de WebSocket para tiempo real
      this.emitNewMessage(cleanPhone, messageData, contactName);
      
      return messageData;
    }
  }

  /**
   * Obtener historial de mensajes de una conversación
   */
  async getMessageHistory(phoneNumber, limit = 50) {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    
    if (!this.useDatabase) {
      // Fallback a memoria
      const messages = this.messageHistory.get(cleanPhone) || [];
      return messages.slice(-limit);
    }
    
    try {
      const result = await db.query(`
        SELECT * FROM messages 
        WHERE phone_number = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [cleanPhone, limit]);

      return result.rows.map(row => ({
        id: row.id.toString(),
        text: row.message_text,
        sender: row.sender,
        timestamp: row.timestamp,
        phoneNumber: row.phone_number
      })).reverse(); // Mostrar en orden cronológico
    } catch (error) {
      console.error('❌ Error obteniendo historial (usando fallback):', error);
      // Fallback a memoria
      const messages = this.messageHistory.get(cleanPhone) || [];
      return messages.slice(-limit);
    }
  }

  /**
   * Obtener todas las conversaciones activas (últimas 24 horas)
   */
  async getActiveConversations() {
    if (!this.useDatabase) {
      // Fallback a memoria
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const active = [];

      for (const [phoneNumber, conversation] of this.cache.entries()) {
        if (conversation.lastActivity > yesterday) {
          const messages = await this.getMessageHistory(phoneNumber, 5); // Últimos 5 mensajes
          active.push({
            ...conversation,
            recentMessages: messages
          });
        }
      }

      return active.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    }

    try {
      const result = await db.query(`
        SELECT c.*, 
               COUNT(m.id) as total_messages,
               MAX(m.timestamp) as last_message_time
        FROM conversations c
        LEFT JOIN messages m ON c.phone_number = m.phone_number
        WHERE c.last_activity > NOW() - INTERVAL '24 hours'
        GROUP BY c.id, c.phone_number, c.contact_name, c.is_manual_mode, 
                 c.assigned_admin, c.manual_mode_started, c.manual_mode_ended,
                 c.message_count, c.last_activity, c.created_at, c.updated_at
        ORDER BY c.last_activity DESC
      `);

      const conversations = [];
      
      for (const row of result.rows) {
        const conversation = this.mapDbRowToConversation(row);
        
        // Obtener mensajes recientes para cada conversación
        const recentMessages = await this.getMessageHistory(conversation.phoneNumber, 5);
        
        conversations.push({
          ...conversation,
          recentMessages
        });
      }

      return conversations;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones activas (usando fallback):', error);
      // Fallback a memoria
      return this.getActiveConversations();
    }
  }

  /**
   * Obtener todas las conversaciones (no solo las activas)
   */
  async getAllConversations() {
    if (!this.useDatabase) {
      // Fallback a memoria
      const all = [];

      for (const [phoneNumber, conversation] of this.cache.entries()) {
        const messages = await this.getMessageHistory(phoneNumber, 5); // Últimos 5 mensajes
        all.push({
          ...conversation,
          recentMessages: messages
        });
      }

      return all.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    }

    try {
      const result = await db.query(`
        SELECT c.*, 
               COUNT(m.id) as total_messages,
               MAX(m.timestamp) as last_message_time
        FROM conversations c
        LEFT JOIN messages m ON c.phone_number = m.phone_number
        GROUP BY c.id, c.phone_number, c.contact_name, c.is_manual_mode, 
                 c.assigned_admin, c.manual_mode_started, c.manual_mode_ended,
                 c.message_count, c.last_activity, c.created_at, c.updated_at
        ORDER BY c.last_activity DESC
      `);

      const conversations = [];
      
      for (const row of result.rows) {
        const conversation = this.mapDbRowToConversation(row);
        
        // Obtener mensajes recientes para cada conversación
        const recentMessages = await this.getMessageHistory(conversation.phoneNumber, 5);
        
        conversations.push({
          ...conversation,
          recentMessages
        });
      }

      return conversations;
    } catch (error) {
      console.error('❌ Error obteniendo todas las conversaciones (usando fallback):', error);
      // Fallback a memoria sin base de datos
      const all = [];
      for (const [phoneNumber, conversation] of this.cache.entries()) {
        const messages = await this.getMessageHistory(phoneNumber, 5);
        all.push({
          ...conversation,
          recentMessages: messages
        });
      }
      return all.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    }
  }

  /**
   * Limpiar número de teléfono para consistencia
   */
  cleanPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/^whatsapp:\+?/, '').replace(/\+/, '');
  }

  /**
   * Obtener estadísticas generales
   */
  async getStats() {
    if (!this.useDatabase) {
      // Fallback a memoria
      const total = this.cache.size;
      const manual = Array.from(this.cache.values()).filter(c => c.isManualMode).length;
      const active = (await this.getActiveConversations()).length;

      return {
        totalConversations: total,
        manualMode: manual,
        autoMode: total - manual,
        activeToday: active,
        timestamp: new Date(),
        usingDatabase: false
      };
    }

    try {
      const totalResult = await db.query('SELECT COUNT(*) as total FROM conversations');
      const manualResult = await db.query('SELECT COUNT(*) as manual FROM conversations WHERE is_manual_mode = true');
      const activeResult = await db.query(`
        SELECT COUNT(*) as active 
        FROM conversations 
        WHERE last_activity > NOW() - INTERVAL '24 hours'
      `);

      const total = parseInt(totalResult.rows[0].total);
      const manual = parseInt(manualResult.rows[0].manual);
      const active = parseInt(activeResult.rows[0].active);

      return {
        totalConversations: total,
        manualMode: manual,
        autoMode: total - manual,
        activeToday: active,
        timestamp: new Date(),
        usingDatabase: true
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas (usando fallback):', error);
      // Fallback a memoria
      return this.getStats();
    }
  }

  /**
   * Buscar conversaciones por nombre o número
   */
  async searchConversations(query) {
    if (!this.useDatabase) {
      // Fallback a memoria
      const results = [];
      const searchTerm = query.toLowerCase();

      for (const [phoneNumber, conversation] of this.cache.entries()) {
        if (
          phoneNumber.includes(searchTerm) ||
          conversation.contactName.toLowerCase().includes(searchTerm)
        ) {
          const messages = await this.getMessageHistory(phoneNumber, 3);
          results.push({
            ...conversation,
            recentMessages: messages
          });
        }
      }

      return results;
    }

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      const result = await db.query(`
        SELECT * FROM conversations 
        WHERE LOWER(phone_number) LIKE $1 
           OR LOWER(contact_name) LIKE $1
        ORDER BY last_activity DESC
        LIMIT 20
      `, [searchTerm]);

      const conversations = [];
      
      for (const row of result.rows) {
        const conversation = this.mapDbRowToConversation(row);
        const recentMessages = await this.getMessageHistory(conversation.phoneNumber, 3);
        
        conversations.push({
          ...conversation,
          recentMessages
        });
      }

      return conversations;
    } catch (error) {
      console.error('❌ Error buscando conversaciones (usando fallback):', error);
      // Fallback a memoria
      return this.searchConversations(query);
    }
  }

  /**
   * Obtener conteo de mensajes para un teléfono
   */
  async getMessageCount(phoneNumber) {
    if (!this.useDatabase) {
      const messages = this.messageHistory.get(phoneNumber) || [];
      return messages.length;
    }

    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM messages WHERE phone_number = $1',
        [phoneNumber]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Error obteniendo conteo de mensajes:', error);
      return 0;
    }
  }

  /**
   * Mapear fila de base de datos a objeto de conversación
   */
  mapDbRowToConversation(row) {
    return {
      phoneNumber: row.phone_number,
      contactName: row.contact_name,
      isManualMode: row.is_manual_mode,
      assignedAdmin: row.assigned_admin,
      manualModeStarted: row.manual_mode_started,
      manualModeEnded: row.manual_mode_ended,
      messageCount: row.message_count,
      lastActivity: row.last_activity
    };
  }

  /**
   * Emitir evento de nuevo mensaje por WebSocket
   */
  emitNewMessage(phoneNumber, messageData, contactName) {
    // Solo emitir si global.io existe (WebSocket habilitado)
    if (typeof global !== 'undefined' && global.io) {
      const eventData = {
        phoneNumber: phoneNumber,
        contactName: contactName,
        message: {
          text: messageData.text,
          sender: messageData.sender,
          timestamp: messageData.timestamp,
          id: messageData.id
        },
        action: 'new_message'
      };

      console.log(`🔄 Emitiendo mensaje por WebSocket: ${messageData.sender} -> ${phoneNumber}`);
      global.io.emit('message-update', eventData);
    }
  }
}

module.exports = new ConversationService();
