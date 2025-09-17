/**
 * Rutas para el dashboard de administración
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const conversationService = require('../services/conversation');
const messageService = require('../services/messaging');

// --- SSE: Clientes conectados ---
let sseClients = [];

// Función para emitir eventos SSE (exportada para uso desde otros módulos)
function emitSSEEvent(eventType, data) {
  const sseData = {
    type: eventType,
    data: data
  };
  sseClients.forEach(res => {
    res.write(`data: ${JSON.stringify(sseData)}\n\n`);
  });
}

// Endpoint SSE para eventos en tiempo real
router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

/**
 * Dashboard principal - Servir archivo HTML estático
 */
router.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, '..', 'public', 'admin-dashboard.html');
  res.sendFile(htmlPath);
});

/**
 * API: Obtener estadísticas
 */
router.get('/api/stats', async (req, res) => {
  try {
    const stats = await conversationService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Obtener todas las conversaciones
 */
router.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await conversationService.getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Obtener una conversación específica con su historial
 */
router.get('/api/conversation/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const conversation = await conversationService.getConversation(phoneNumber);
    const messages = await conversationService.getMessageHistory(phoneNumber);
    
    res.json({
      conversation,
      messages
    });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Activar modo manual
 */
router.post('/api/conversations/:phoneNumber/manual', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const conversation = await conversationService.setManualMode(phoneNumber);
    
    console.log(`🔧 Admin activó modo manual para ${phoneNumber}`);
    
    res.json({
      success: true,
      conversation,
      message: `Modo manual activado para ${phoneNumber}`
    });
  } catch (error) {
    console.error('Error activando modo manual:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Activar modo automático
 */
router.post('/api/conversations/:phoneNumber/auto', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const conversation = await conversationService.setAutoMode(phoneNumber);
    
    console.log(`🤖 Admin activó modo automático para ${phoneNumber}`);
    
    res.json({
      success: true,
      conversation,
      message: `Modo automático activado para ${phoneNumber}`
    });
  } catch (error) {
    console.error('Error activando modo automático:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Enviar mensaje como admin
 */
router.post('/api/send/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
    
    // Obtener el nombre del contacto de la conversación existente
    const conversation = await conversationService.getConversation(phoneNumber);
    const contactName = conversation.contactName || 'Cliente';
    
    // Agregar mensaje al historial como admin
    await conversationService.addMessage(phoneNumber, message, 'admin', contactName);

    // Enviar mensaje por WhatsApp
    await messageService.sendMessage(phoneNumber, message);

    // Notificar a todos los clientes SSE
    emitSSEEvent('message-update', {
      phoneNumber,
      contactName,
      message: {
        sender: 'admin',
        text: message,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`👨‍💼 Admin envió mensaje a ${phoneNumber}: "${message}"`);

    res.json({
      success: true,
      message: 'Mensaje enviado correctamente'
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Borrar conversación completa
 */
router.delete('/api/conversations/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const result = await conversationService.deleteConversation(phoneNumber);
    
    console.log(`🗑️ Admin borró conversación: ${phoneNumber}`);
    
    res.json({
      success: true,
      message: result.message,
      deletedPhone: result.deletedPhone
    });
  } catch (error) {
    console.error('Error borrando conversación:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Buscar conversaciones
 */
router.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json([]);
    }
    
    const results = await conversationService.searchConversations(q.trim());
    res.json(results);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// RUTAS LEGACY (COMPATIBILIDAD HACIA ATRÁS)
// =============================================================================

/**
 * API: Obtener estadísticas (legacy)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await conversationService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Obtener conversaciones activas (legacy)
 */
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await conversationService.getActiveConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Obtener una conversación específica con su historial (legacy)
 */
router.get('/conversation/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const conversation = await conversationService.getConversation(phoneNumber);
    const messages = await conversationService.getMessageHistory(phoneNumber);
    
    res.json({
      conversation,
      messages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Activar modo manual (legacy)
 */
router.post('/manual/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const conversation = await conversationService.setManualMode(phoneNumber);
    
    console.log(`🔧 Admin activó modo manual para ${phoneNumber}`);
    
    res.json({
      success: true,
      conversation,
      message: `Modo manual activado para ${phoneNumber}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Activar modo automático (legacy)
 */
router.post('/auto/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const conversation = await conversationService.setAutoMode(phoneNumber);
    
    console.log(`🤖 Admin activó modo automático para ${phoneNumber}`);
    
    res.json({
      success: true,
      conversation,
      message: `Modo automático activado para ${phoneNumber}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Enviar mensaje manual (legacy)
 */
router.post('/send/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
    
    // Activar modo manual automáticamente
    await conversationService.setManualMode(phoneNumber);
    
    // Agregar mensaje al historial como admin
    await conversationService.addMessage(phoneNumber, message.trim(), 'admin');
    
    // Enviar mensaje por WhatsApp
    await messageService.sendMessage(phoneNumber, message.trim());
    
    console.log(`📤 Admin envió mensaje a ${phoneNumber}: "${message.trim()}"`);
    
    res.json({
      success: true,
      message: 'Mensaje enviado correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error enviando mensaje manual:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Buscar conversaciones (legacy)
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json([]);
    }
    
    const results = await conversationService.searchConversations(q.trim());
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar tanto el router como la función de emisión SSE
module.exports = router;
module.exports.emitSSEEvent = emitSSEEvent;
