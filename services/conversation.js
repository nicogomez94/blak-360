/**
 * Servicio para gestionar conversaciones y control manual
 */

class ConversationService {
  constructor() {
    // Almacenamiento en memoria (en producción usar una base de datos)
    this.conversations = new Map();
    this.messageHistory = new Map();
  }

  /**
   * Obtener una conversación por número de teléfono
   */
  getConversation(phoneNumber) {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    return this.conversations.get(cleanPhone) || {
      phoneNumber: cleanPhone,
      isManualMode: false,
      assignedAdmin: null,
      lastActivity: new Date(),
      contactName: 'Sin nombre',
      messageCount: 0
    };
  }

  /**
   * Crear o actualizar una conversación
   */
  updateConversation(phoneNumber, updates) {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    const existing = this.getConversation(cleanPhone);
    const updated = {
      ...existing,
      ...updates,
      phoneNumber: cleanPhone,
      lastActivity: new Date()
    };
    
    this.conversations.set(cleanPhone, updated);
    return updated;
  }

  /**
   * Activar modo manual para una conversación
   */
  setManualMode(phoneNumber, adminId = 'admin') {
    console.log(`🔧 Activando modo manual para ${phoneNumber}`);
    return this.updateConversation(phoneNumber, {
      isManualMode: true,
      assignedAdmin: adminId,
      manualModeStarted: new Date()
    });
  }

  /**
   * Desactivar modo manual (volver a IA)
   */
  setAutoMode(phoneNumber) {
    console.log(`🤖 Activando modo automático para ${phoneNumber}`);
    return this.updateConversation(phoneNumber, {
      isManualMode: false,
      assignedAdmin: null,
      manualModeEnded: new Date()
    });
  }

  /**
   * Verificar si una conversación está en modo manual
   */
  isManualMode(phoneNumber) {
    const conversation = this.getConversation(phoneNumber);
    return conversation.isManualMode || false;
  }

  /**
   * Agregar mensaje al historial
   */
  addMessage(phoneNumber, message, sender = 'user', contactName = 'Sin nombre') {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    
    if (!this.messageHistory.has(cleanPhone)) {
      this.messageHistory.set(cleanPhone, []);
    }

    const messageData = {
      id: Date.now().toString(),
      text: message,
      sender, // 'user', 'ai', 'admin'
      timestamp: new Date(),
      phoneNumber: cleanPhone
    };

    this.messageHistory.get(cleanPhone).push(messageData);

    // Actualizar conversación
    this.updateConversation(cleanPhone, {
      contactName,
      messageCount: this.messageHistory.get(cleanPhone).length
    });

    // Mantener solo los últimos 100 mensajes por conversación
    const messages = this.messageHistory.get(cleanPhone);
    if (messages.length > 100) {
      this.messageHistory.set(cleanPhone, messages.slice(-100));
    }

    console.log(`💬 Mensaje agregado: ${sender} -> ${cleanPhone}: "${message}"`);
    return messageData;
  }

  /**
   * Obtener historial de mensajes de una conversación
   */
  getMessageHistory(phoneNumber, limit = 50) {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    const messages = this.messageHistory.get(cleanPhone) || [];
    return messages.slice(-limit);
  }

  /**
   * Obtener todas las conversaciones activas (últimas 24 horas)
   */
  getActiveConversations() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const active = [];

    for (const [phoneNumber, conversation] of this.conversations.entries()) {
      if (conversation.lastActivity > yesterday) {
        const messages = this.getMessageHistory(phoneNumber, 5); // Últimos 5 mensajes
        active.push({
          ...conversation,
          recentMessages: messages
        });
      }
    }

    return active.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
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
  getStats() {
    const total = this.conversations.size;
    const manual = Array.from(this.conversations.values()).filter(c => c.isManualMode).length;
    const active = this.getActiveConversations().length;

    return {
      totalConversations: total,
      manualMode: manual,
      autoMode: total - manual,
      activeToday: active,
      timestamp: new Date()
    };
  }

  /**
   * Buscar conversaciones por nombre o número
   */
  searchConversations(query) {
    const results = [];
    const searchTerm = query.toLowerCase();

    for (const [phoneNumber, conversation] of this.conversations.entries()) {
      if (
        phoneNumber.includes(searchTerm) ||
        conversation.contactName.toLowerCase().includes(searchTerm)
      ) {
        const messages = this.getMessageHistory(phoneNumber, 3);
        results.push({
          ...conversation,
          recentMessages: messages
        });
      }
    }

    return results;
  }
}

module.exports = new ConversationService();
