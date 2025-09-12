/**
 * Rutas para el dashboard de administración
 */

const express = require('express');
const router = express.Router();
const conversationService = require('../services/conversation');
const messageService = require('../services/messaging');

/**
 * Dashboard principal - Página HTML
 */
router.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - WhatsApp Bot</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        .header {
            background: #25D366;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .container { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number { font-size: 2rem; font-weight: bold; color: #25D366; }
        .stat-label { color: #666; margin-top: 0.5rem; }
        .conversations {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .conversations-header {
            background: #f8f9fa;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .refresh-btn {
            background: #25D366;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
        }
        .conversation {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .conversation:hover { background: #f8f9fa; }
        .conversation-info h3 { margin-bottom: 0.25rem; }
        .conversation-meta { color: #666; font-size: 0.9rem; }
        .conversation-actions {
            display: flex;
            gap: 0.5rem;
        }
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
        }
        .btn-manual { background: #ff6b6b; color: white; }
        .btn-auto { background: #51cf66; color: white; }
        .btn-view { background: #339af0; color: white; }
        .manual-mode { border-left: 4px solid #ff6b6b; }
        .auto-mode { border-left: 4px solid #51cf66; }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        }
        .modal-content {
            background: white;
            margin: 5% auto;
            padding: 2rem;
            width: 80%;
            max-width: 600px;
            border-radius: 8px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .close {
            float: right;
            font-size: 1.5rem;
            cursor: pointer;
        }
        .message {
            margin: 1rem 0;
            padding: 1rem;
            border-radius: 8px;
        }
        .message-user { background: #e3f2fd; }
        .message-ai { background: #e8f5e8; }
        .message-admin { background: #fff3e0; }
        .send-message {
            margin-top: 1rem;
            display: flex;
            gap: 0.5rem;
        }
        .send-message input {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        /* Animación para notificaciones */
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Dashboard WhatsApp Bot</h1>
        <p>Gestión de conversaciones en tiempo real</p>
    </div>

    <div class="container">
        <div class="stats" id="stats">
            <!-- Se carga dinámicamente -->
        </div>

        <div class="conversations">
            <div class="conversations-header">
                <h2>Conversaciones Activas</h2>
                <button class="refresh-btn" onclick="loadData()">🔄 Actualizar</button>
            </div>
            <div id="conversations-list">
                <!-- Se carga dinámicamente -->
            </div>
        </div>
    </div>

    <!-- Modal para ver conversación -->
    <div id="conversationModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h2 id="modalTitle">Conversación</h2>
            <div id="modalMessages"></div>
            <div class="send-message">
                <input type="text" id="messageInput" placeholder="Escribe tu mensaje...">
                <button class="btn btn-auto" onclick="sendMessage()">Enviar</button>
            </div>
        </div>
    </div>

    <script>
        let currentConversation = null;
        let socket = null;

        // Conectar WebSocket para tiempo real
        function connectWebSocket() {
            socket = io();
            
            socket.on('connect', () => {
                console.log('🔗 Conectado al WebSocket');
            });
            
            socket.on('message-update', (data) => {
                console.log('🔄 Nuevo mensaje recibido:', data);
                handleNewMessage(data);
            });
            
            socket.on('disconnect', () => {
                console.log('🔌 Desconectado del WebSocket');
            });
        }

        // Manejar nuevo mensaje en tiempo real
        function handleNewMessage(data) {
            // Recargar conversaciones para actualizar contadores
            loadData();
            
            // Si estamos viendo esta conversación, actualizar mensajes
            if (currentConversation === data.phoneNumber) {
                viewConversation(data.phoneNumber);
            }
            
            // Mostrar notificación visual
            showNotification(\`Nuevo mensaje de \${data.contactName}\`);
        }

        // Mostrar notificación
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: #25D366;
                color: white;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 1000;
                animation: slideIn 0.3s ease;
            \`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        async function loadData() {
            try {
                // Cargar estadísticas
                const statsResponse = await fetch('/admin/api/stats');
                const stats = await statsResponse.json();
                
                document.getElementById('stats').innerHTML = \`
                    <div class="stat-card">
                        <div class="stat-number">\${stats.totalConversations || 0}</div>
                        <div class="stat-label">Total Conversaciones</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.activeToday || 0}</div>
                        <div class="stat-label">Activas Hoy</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.manualMode || 0}</div>
                        <div class="stat-label">Modo Manual</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.autoMode || 0}</div>
                        <div class="stat-label">Modo Automático</div>
                    </div>
                \`;

                // Cargar conversaciones
                const conversationsResponse = await fetch('/admin/api/conversations');
                const conversations = await conversationsResponse.json();
                
                const conversationsList = document.getElementById('conversations-list');
                
                if (conversations.length === 0) {
                    conversationsList.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No hay conversaciones activas</div>';
                    return;
                }
                
                conversationsList.innerHTML = conversations.map(conv => \`
                    <div class="conversation \${conv.isManualMode ? 'manual-mode' : 'auto-mode'}">
                        <div class="conversation-info">
                            <h3>\${conv.contactName} (\${conv.phoneNumber})</h3>
                            <div class="conversation-meta">
                                \${conv.isManualMode ? '🔧 Modo Manual' : '🤖 Modo Automático'} | 
                                \${conv.messageCount} mensajes | 
                                \${new Date(conv.lastActivity).toLocaleString()}
                            </div>
                        </div>
                        <div class="conversation-actions">
                            <button class="btn btn-view" onclick="viewConversation('\${conv.phoneNumber}')">Ver</button>
                            \${conv.isManualMode ? 
                                \`<button class="btn btn-auto" onclick="setMode('\${conv.phoneNumber}', 'auto')">Auto</button>\` :
                                \`<button class="btn btn-manual" onclick="setMode('\${conv.phoneNumber}', 'manual')">Manual</button>\`
                            }
                        </div>
                    </div>
                \`).join('');
                
            } catch (error) {
                console.error('Error cargando datos:', error);
            }
        }

        async function setMode(phoneNumber, mode) {
            try {
                const response = await fetch(\`/admin/api/conversations/\${phoneNumber}/\${mode}\`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    loadData(); // Recargar datos
                } else {
                    alert('Error cambiando modo');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error cambiando modo');
            }
        }

        async function viewConversation(phoneNumber) {
            try {
                currentConversation = phoneNumber;
                const response = await fetch(\`/admin/api/conversation/\${phoneNumber}\`);
                const data = await response.json();
                
                document.getElementById('modalTitle').textContent = \`\${data.conversation.contactName} (\${phoneNumber})\`;
                
                const messagesDiv = document.getElementById('modalMessages');
                messagesDiv.innerHTML = data.messages.map(msg => \`
                    <div class="message message-\${msg.sender}">
                        <strong>\${msg.sender === 'user' ? data.conversation.contactName : (msg.sender === 'ai' ? 'IA' : 'Admin')}:</strong>
                        <div>\${msg.text}</div>
                        <small>\${new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                \`).join('');
                
                document.getElementById('conversationModal').style.display = 'block';
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error cargando conversación');
            }
        }

        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message || !currentConversation) return;
            
            try {
                const response = await fetch(\`/admin/api/send/\${currentConversation}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                
                if (response.ok) {
                    input.value = '';
                    // Activar modo manual automáticamente
                    await setMode(currentConversation, 'manual');
                    // Recargar conversación
                    await viewConversation(currentConversation);
                } else {
                    alert('Error enviando mensaje');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error enviando mensaje');
            }
        }

        function closeModal() {
            document.getElementById('conversationModal').style.display = 'none';
            currentConversation = null;
        }

        // Conectar WebSocket y cargar datos al inicio
        connectWebSocket();
        loadData();
        
        // Auto-refresh cada 60 segundos (menos frecuente porque WebSocket maneja tiempo real)
        setInterval(loadData, 60000);
        
        // Cerrar modal al presionar Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
        
        // Enviar mensaje con Enter
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>
  `;
  
  res.send(html);
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
 * API: Obtener conversaciones activas
 */
router.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await conversationService.getActiveConversations();
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
    
    // Agregar mensaje al historial como admin
    await conversationService.addMessage(phoneNumber, message, 'admin');
    
    // Enviar mensaje por WhatsApp
    const messageService = require('../services/messaging');
    await messageService.sendMessage(phoneNumber, message);
    
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

// Mantener las rutas originales para compatibilidad
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
    const messageService = require('../services/messaging');
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

module.exports = router;
