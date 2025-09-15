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
            transition: all 0.3s ease;
        }
        .filter-card {
            cursor: pointer;
        }
        .filter-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .filter-card.active-filter {
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
        }
        .filter-card.active-filter .stat-number,
        .filter-card.active-filter .stat-label {
            color: white;
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
        .btn-delete { background: #e74c3c; color: white; border: none; padding: 0.25rem 0.5rem; }
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
        /* Estilos del Modal Chat WhatsApp */
        .modal-content {
            background: #e5ddd5;
            margin: 2% auto;
            padding: 0;
            width: 90%;
            max-width: 800px;
            border-radius: 12px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease;
        }
        
        /* Header del Chat */
        .chat-header {
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .chat-header-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .chat-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #128C7E;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2rem;
        }
        
        .chat-name {
            font-size: 1.1rem;
            font-weight: 500;
        }
        
        .chat-status {
            font-size: 0.8rem;
            opacity: 0.9;
        }
        
        /* Área de Mensajes */
        .messages-container {
            height: 400px;
            overflow-y: auto;
            padding: 1rem;
            background: #e5ddd5;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4edda' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        
        /* Mensajes estilo WhatsApp */
        .message {
            margin: 0.5rem 0;
            display: flex;
            animation: fadeIn 0.3s ease;
        }
        
        .message-user {
            justify-content: flex-end;
        }
        
        .message-ai, .message-admin {
            justify-content: flex-start;
        }
        
        .message-bubble {
            max-width: 70%;
            padding: 0.8rem 1rem;
            border-radius: 18px;
            position: relative;
            word-wrap: break-word;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* Burbujas de usuario (derecha) */
        .message-user .message-bubble {
            background: #dcf8c6;
            border-bottom-right-radius: 5px;
        }
        
        
        /* Burbujas de IA/Admin (izquierda) */
        .message-ai .message-bubble, .message-admin .message-bubble {
            background: white;
            border-bottom-left-radius: 5px;
        }
        
        .message-sender {
            font-weight: bold;
            font-size: 0.9rem;
            margin-bottom: 0.3rem;
        }
        
        .message-user .message-sender {
            color: #128C7E;
        }
        
        .message-ai .message-sender {
            color: #25D366;
        }
        
        .message-admin .message-sender {
            color: #ff6b6b;
        }
        
        .message-text {
            line-height: 1.4;
            margin-bottom: 0.3rem;
        }
        
        .message-time {
            font-size: 0.7rem;
            color: #666;
            text-align: right;
        }
        
        /* Área de envío */
        .send-message {
            padding: 1rem;
            background: #f0f0f0;
            display: flex;
            gap: 0.8rem;
            align-items: flex-end;
        }
        
        .message-input {
            flex: 1;
            padding: 0.8rem 1rem;
            border: none;
            border-radius: 20px;
            background: white;
            font-size: 1rem;
            outline: none;
            resize: none;
            min-height: 40px;
            max-height: 100px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .send-btn {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(37, 211, 102, 0.3);
        }
        
        .send-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.5);
        }
        
        .send-btn:active {
            animation: buttonPress 0.2s ease;
            transform: scale(0.95);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: scale(1);
        }
        
        /* Scroll personalizado */
        .messages-container::-webkit-scrollbar {
            width: 6px;
        }
        
        .messages-container::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.2);
            border-radius: 3px;
        }
        
        .messages-container::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.3);
        }
        
        /* Animaciones */
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes buttonPress {
            0% { transform: scale(1); }
            50% { transform: scale(0.9); }
            100% { transform: scale(1); }
        }
        
        /* Indicador de escritura */
        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            margin: 0.5rem 0;
        }
        
        .typing-dots {
            display: flex;
            gap: 0.2rem;
        }
        
        .typing-dot {
            width: 6px;
            height: 6px;
            background: #999;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        
        .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0%, 60%, 100% {
                transform: scale(1);
                opacity: 0.5;
            }
            30% {
                transform: scale(1.2);
                opacity: 1;
            }
        }

        /* Mensajes informativos del modo */
        .mode-info {
            animation: fadeIn 0.5s ease;
        }
        
        .manual-info div {
            background: linear-gradient(135deg, #e8f5e8, #f1f8f1) !important;
            border: 1px solid #c8e6c9;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.1);
        }
        
        .auto-info div {
            background: linear-gradient(135deg, #e3f2fd, #f0f7ff) !important;
            border: 1px solid #bbdefb;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
        }
        
        .mode-info small {
            opacity: 0.8;
            font-size: 0.85rem;
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
            <!-- Header del Chat -->
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-avatar" id="chatAvatar">👤</div>
                    <div>
                        <div class="chat-name" id="chatName">Conversación</div>
                        <div class="chat-status" id="chatStatus">En línea</div>
                    </div>
                </div>
                <span class="close" onclick="closeModal()" style="font-size: 1.5rem; cursor: pointer;">&times;</span>
            </div>
            
            <!-- Área de Mensajes -->
            <div class="messages-container" id="modalMessages">
                <!-- Los mensajes se cargan aquí -->
            </div>
            
            <!-- Área de Envío -->
            <div class="send-message">
                <textarea 
                    class="message-input" 
                    id="messageInput" 
                    placeholder="Escribe un mensaje..."
                    rows="1"
                    onkeydown="handleKeyPress(event)"
                    oninput="autoResize(this)"
                ></textarea>
                <button class="send-btn" id="sendBtn" onclick="sendMessage()" disabled>
                    ➤
                </button>
            </div>
        </div>
    </div>

    <script>
        let currentConversation = null;
        let socket = null;
        let allConversations = []; // Array para almacenar todas las conversaciones
        let currentFilter = 'all'; // Filtro actual

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
            console.log('🔄 Nuevo mensaje recibido:', data);
            
            // Recargar conversaciones para actualizar contadores
            loadData();
            
            // Si estamos viendo esta conversación, actualizar mensajes con animación
            if (currentConversation === data.phoneNumber) {
                // Mostrar indicador de escritura si es respuesta de IA
                if (data.message.sender === 'ai') {
                    const indicator = showTypingIndicator();
                    setTimeout(() => {
                        hideTypingIndicator();
                        viewConversation(data.phoneNumber);
                    }, 1000);
                } else {
                    viewConversation(data.phoneNumber);
                }
            }
            
            // Mostrar notificación visual con emoji
            const emoji = data.message.sender === 'user' ? '💬' : 
                         (data.message.sender === 'ai' ? '🤖' : '👨‍💼');
            showNotification(\`\${emoji} Nuevo mensaje de \${data.contactName}\`);
        }

        // Mostrar notificación moderna
        function showNotification(message) {
            // Remover notificaciones existentes
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(n => n.remove());
            
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(37, 211, 102, 0.3);
                z-index: 1000;
                animation: slideIn 0.4s ease;
                font-weight: 500;
                min-width: 200px;
                max-width: 300px;
                backdrop-filter: blur(10px);
            \`;
            notification.innerHTML = \`
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div>\${message}</div>
                    <div onclick="this.parentElement.parentElement.remove()" 
                         style="cursor: pointer; opacity: 0.7; margin-left: auto;">✕</div>
                </div>
            \`;
            document.body.appendChild(notification);
            
            // Auto-remove con animación
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'fadeIn 0.3s ease reverse';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 4000);
        }

        async function loadData() {
            try {
                // Cargar estadísticas
                const statsResponse = await fetch('/admin/api/stats');
                const stats = await statsResponse.json();
                
                document.getElementById('stats').innerHTML = \`
                    <div class="stat-card filter-card" onclick="applyFilter('all')" data-filter="all">
                        <div class="stat-number">\${stats.totalConversations || 0}</div>
                        <div class="stat-label">Total Conversaciones</div>
                    </div>
                    <div class="stat-card filter-card" onclick="applyFilter('activeToday')" data-filter="activeToday">
                        <div class="stat-number">\${stats.activeToday || 0}</div>
                        <div class="stat-label">Activas Hoy</div>
                    </div>
                    <div class="stat-card filter-card" onclick="applyFilter('manual')" data-filter="manual">
                        <div class="stat-number">\${stats.manualMode || 0}</div>
                        <div class="stat-label">Modo Manual</div>
                    </div>
                    <div class="stat-card filter-card" onclick="applyFilter('auto')" data-filter="auto">
                        <div class="stat-number">\${stats.autoMode || 0}</div>
                        <div class="stat-label">Modo Automático</div>
                    </div>
                \`;

                // Cargar conversaciones
                const conversationsResponse = await fetch('/admin/api/conversations');
                allConversations = await conversationsResponse.json();
                
                // Aplicar filtro actual
                renderConversations(applyCurrentFilter(allConversations));
                
                // Establecer filtro activo visual
                setTimeout(() => {
                    document.querySelectorAll('.filter-card').forEach(card => {
                        card.classList.remove('active-filter');
                    });
                    const activeCard = document.querySelector(\`[data-filter="\${currentFilter}"]\`);
                    if (activeCard) {
                        activeCard.classList.add('active-filter');
                    }
                }, 100);
                
            } catch (error) {
                console.error('Error cargando datos:', error);
            }
        }

        // Función para aplicar el filtro actual
        function applyCurrentFilter(conversations) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            switch(currentFilter) {
                case 'all':
                    return conversations;
                case 'activeToday':
                    return conversations.filter(conv => {
                        const lastActivity = new Date(conv.lastActivity);
                        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        return lastActivity > twentyFourHoursAgo;
                    });
                case 'manual':
                    return conversations.filter(conv => conv.isManualMode);
                case 'auto':
                    return conversations.filter(conv => !conv.isManualMode);
                default:
                    return conversations;
            }
        }

        // Función para renderizar las conversaciones
        function renderConversations(conversations) {
            const conversationsList = document.getElementById('conversations-list');
            
            if (conversations.length === 0) {
                const filterText = currentFilter === 'all' ? '' : ' para el filtro "' + getFilterLabel(currentFilter) + '"';
                conversationsList.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No hay conversaciones' + filterText + '</div>';
                return;
            }
            
            conversationsList.innerHTML = conversations.map(conv => {
                // Formatear número tipo +54 9 11 XXX XXXX
                function formatPhoneNumber(phone) {
                    // Elimina cualquier caracter no numérico
                    phone = phone.replace(/\D/g, '');
                    // Asume formato argentino: 54911XXXXXXXX
                    if (phone.length === 13 && phone.startsWith('549')) {
                        return \`+54 9 11 \${phone.slice(5,9)} \${phone.slice(9,13)}\`;
                    }
                    // Si es 11 dígitos (ej: 115XXXXXXXX)
                    if (phone.length === 11 && phone.startsWith('11')) {
                        return \`+54 9 11 \${phone.slice(2,6)} \${phone.slice(6,10)}\`;
                    }
                    // Si es 10 dígitos (ej: 911XXXXXXXX)
                    if (phone.length === 10 && phone.startsWith('9')) {
                        return \`+54 9 11 \${phone.slice(3,7)} \${phone.slice(7,11)}\`;
                    }
                    // Si es 8 dígitos (ej: XXXXXXXX)
                    if (phone.length === 8) {
                        return \`+54 9 11 \${phone.slice(0,4)} \${phone.slice(4,8)}\`;
                    }
                    // Si no matchea, devuelve el original
                    return phone;
                }
                const formattedPhone = formatPhoneNumber(conv.phoneNumber);
                return \`
                    <div class="conversation \${conv.isManualMode ? 'manual-mode' : 'auto-mode'}" data-phone="\${conv.phoneNumber}">
                        <div class="conversation-info">
                            <h3 class="conversation-name">\${conv.contactName} (\${formattedPhone})</h3>
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
                            <button class="btn btn-delete" onclick="deleteConversation('\${conv.phoneNumber}')">🗑️</button>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        // Función para aplicar filtro
        function applyFilter(filterType) {
            currentFilter = filterType;
            
            // Actualizar estilos de las tarjetas
            document.querySelectorAll('.filter-card').forEach(card => {
                card.classList.remove('active-filter');
            });
            document.querySelector(\`[data-filter="\${filterType}"]\`).classList.add('active-filter');
            
            // Aplicar filtro y renderizar
            const filteredConversations = applyCurrentFilter(allConversations);
            renderConversations(filteredConversations);
            
            // Mostrar notificación
            const filterLabels = {
                'all': 'Todas las conversaciones',
                'activeToday': 'Conversaciones activas hoy',
                'manual': 'Conversaciones en modo manual',
                'auto': 'Conversaciones en modo automático'
            };
            showNotification(\`🔍 Filtro aplicado: \${filterLabels[filterType]}\`);
        }

        // Función helper para obtener etiqueta del filtro
        function getFilterLabel(filterType) {
            const labels = {
                'activeToday': 'Activas Hoy',
                'manual': 'Modo Manual',
                'auto': 'Modo Automático'
            };
            return labels[filterType] || 'Todas';
        }

        async function setMode(phoneNumber, mode) {
            // Obtener información de la conversación actual
            const conversationElement = document.querySelector(\`[data-phone="\${phoneNumber}"]\`);
            const contactName = conversationElement ? 
                conversationElement.querySelector('.conversation-name').textContent.split('(')[0].trim() : 
                'Cliente';
            
            // Configurar mensaje de confirmación según el modo
            let confirmMessage, successMessage, actionEmoji;
            
            if (mode === 'manual') {
                confirmMessage = \`🔧 ¿Activar MODO MANUAL para \${contactName}?\\n\\n\` +
                               \`• Los mensajes NO se responderán automáticamente\\n\` +
                               \`• Deberás responder manualmente desde el dashboard\\n\` +
                               \`• La IA se pausará hasta que desactives el modo manual\`;
                successMessage = \`🔧 Modo Manual ACTIVADO para \${contactName}\`;
                actionEmoji = '🔧';
            } else {
                confirmMessage = \`🤖 ¿Activar MODO AUTOMÁTICO para \${contactName}?\\n\\n\` +
                               \`• Los mensajes se responderán automáticamente con IA\\n\` +
                               \`• Ya no necesitarás intervenir manualmente\\n\` +
                               \`• El chatbot tomará el control de la conversación\`;
                successMessage = \`🤖 Modo Automático ACTIVADO para \${contactName}\`;
                actionEmoji = '🤖';
            }
            
            // Mostrar confirmación personalizada
            const confirmed = await showCustomConfirm(confirmMessage);
            if (!confirmed) {
                return; // Usuario canceló
            }
            
            try {
                const response = await fetch(\`/admin/api/conversations/\${phoneNumber}/\${mode}\`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    loadData(); // Recargar datos
                    
                    // Mostrar notificación de éxito
                    showNotification(\`\${actionEmoji} \${successMessage}\`);
                    
                    // Si estamos viendo esta conversación, actualizar el header
                    if (currentConversation === phoneNumber) {
                        viewConversation(phoneNumber);
                    }
                } else {
                    alert('❌ Error cambiando modo. Inténtalo de nuevo.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('❌ Error de conexión. Verifica tu conexión a internet.');
            }
        }

        async function deleteConversation(phoneNumber) {
            // Obtener información de la conversación actual
            const conversationElement = document.querySelector(\`[data-phone="\${phoneNumber}"]\`);
            const contactName = conversationElement ? 
                conversationElement.querySelector('.conversation-name').textContent.split('(')[0].trim() : 
                'Cliente';
            
            // Mensaje de confirmación con advertencia
            const confirmMessage = \`⚠️ ¿BORRAR COMPLETAMENTE la conversación de \${contactName}?\\n\\n\` +
                                 \`📞 Número: \${phoneNumber}\\n\` +
                                 \`❌ Se eliminarán TODOS los mensajes\\n\` +
                                 \`🔄 Si escribe de nuevo, iniciará una conversación desde cero\\n\\n\` +
                                 \`Esta acción NO se puede deshacer.\`;
            
            // Mostrar confirmación personalizada
            const confirmed = await showCustomConfirm(confirmMessage);
            if (!confirmed) {
                return; // Usuario canceló
            }
            
            try {
                const response = await fetch(\`/admin/api/conversations/\${phoneNumber}\`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    // Si estamos viendo esta conversación, cerrar el modal
                    if (currentConversation === phoneNumber) {
                        closeModal();
                        currentConversation = null;
                    }
                    
                    loadData(); // Recargar la lista de conversaciones
                    
                    // Mostrar notificación de éxito
                    showNotification(\`🗑️ Conversación de \${contactName} eliminada completamente\`);
                    
                } else {
                    const errorData = await response.json();
                    alert(\`❌ Error borrando conversación: \${errorData.error || 'Error desconocido'}\`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('❌ Error de conexión. No se pudo borrar la conversación.');
            }
        }

        async function viewConversation(phoneNumber) {
            try {
                currentConversation = phoneNumber;
                const response = await fetch(\`/admin/api/conversation/\${phoneNumber}\`);
                const data = await response.json();
                
                // Actualizar header del chat
                const chatName = document.getElementById('chatName');
                const chatStatus = document.getElementById('chatStatus');
                const chatAvatar = document.getElementById('chatAvatar');
                
                chatName.textContent = \`\${data.conversation.contactName} (\${phoneNumber})\`;
                chatStatus.textContent = data.conversation.isManualMode ? '🟢 Modo Manual' : '🤖 Modo Automático';
                chatAvatar.textContent = data.conversation.contactName.charAt(0).toUpperCase();
                
                // Renderizar mensajes con estilo WhatsApp
                const messagesDiv = document.getElementById('modalMessages');
                messagesDiv.innerHTML = data.messages.map(msg => {
                    const senderName = msg.sender === 'user' ? data.conversation.contactName : 
                                     (msg.sender === 'ai' ? '🤖 IA' : '👨‍💼 Admin');
                    const time = new Date(msg.timestamp).toLocaleTimeString('es-AR', { 
                        hour: '2-digit', minute: '2-digit' 
                    });
                    
                    return \`
                        <div class="message message-\${msg.sender}">
                            <div class="message-bubble">
                                <div class="message-sender">\${senderName}</div>
                                <div class="message-text">\${msg.text}</div>
                                <div class="message-time">\${time}</div>
                            </div>
                        </div>
                    \`;
                }).join('');
                
                // Controlar visibilidad del área de envío según el modo
                const sendMessageArea = document.querySelector('.send-message');
                const messageInput = document.getElementById('messageInput');
                
                if (data.conversation.isManualMode) {
                    // Modo Manual: Mostrar área de envío
                    sendMessageArea.style.display = 'flex';
                    // Agregar mensaje informativo si no hay mensajes del admin
                    if (!data.messages.some(msg => msg.sender === 'admin')) {
                        const infoMessage = document.createElement('div');
                        infoMessage.className = 'mode-info manual-info';
                        infoMessage.innerHTML = \`
                            <div style="text-align: center; padding: 1rem; background: #e8f5e8; border-radius: 8px; margin: 1rem 0; color: #2d5016;">
                                🔧 <strong>Modo Manual Activado</strong><br>
                                <small>Puedes responder directamente desde aquí. La IA está pausada.</small>
                            </div>
                        \`;
                        messagesDiv.appendChild(infoMessage);
                    }
                } else {
                    // Modo Automático: Ocultar área de envío
                    sendMessageArea.style.display = 'none';
                    // Agregar mensaje informativo
                    const infoMessage = document.createElement('div');
                    infoMessage.className = 'mode-info auto-info';
                    infoMessage.innerHTML = \`
                        <div style="text-align: center; padding: 1rem; background: #e3f2fd; border-radius: 8px; margin: 1rem 0; color: #1565c0;">
                            🤖 <strong>Modo Automático Activado</strong><br>
                            <small>La IA responde automáticamente. Para intervenir manualmente, activa el Modo Manual.</small>
                        </div>
                    \`;
                    messagesDiv.appendChild(infoMessage);
                }
                
                // Mostrar modal y hacer scroll automático
                document.getElementById('conversationModal').style.display = 'block';
                setTimeout(() => scrollToBottom(), 100);
                
                // Focus en el input solo si está en modo manual
                if (data.conversation.isManualMode) {
                    messageInput.focus();
                }
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error cargando conversación');
            }
        }

        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const message = input.value.trim();
            
            if (!message || !currentConversation) return;
            
            // Animación del botón
            sendBtn.style.transform = 'scale(0.9)';
            sendBtn.disabled = true;
            
            try {
                const response = await fetch(\`/admin/api/send/\${currentConversation}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                
                if (response.ok) {
                    input.value = '';
                    input.style.height = 'auto';
                    
                    // Verificar si ya está en modo manual antes de activarlo
                    const currentResponse = await fetch(\`/admin/api/conversation/\${currentConversation}\`);
                    const currentData = await currentResponse.json();
                    
                    if (!currentData.conversation.isManualMode) {
                        // Solo activar modo manual si no está activado
                        await setMode(currentConversation, 'manual');
                    }
                    
                    // Recargar conversación con animación
                    await viewConversation(currentConversation);
                    
                    showNotification('✅ Mensaje enviado');
                } else {
                    showNotification('❌ Error enviando mensaje');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('❌ Error de conexión');
            } finally {
                // Restaurar botón
                setTimeout(() => {
                    sendBtn.style.transform = 'scale(1)';
                    sendBtn.disabled = false;
                }, 200);
            }
        }

        // Auto-resize del textarea
        function autoResize(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
            
            // Habilitar/deshabilitar botón según contenido
            const sendBtn = document.getElementById('sendBtn');
            sendBtn.disabled = !textarea.value.trim();
        }

        // Manejar Enter para enviar
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }

        // Auto-scroll suave al final
        function scrollToBottom() {
            const messagesDiv = document.getElementById('modalMessages');
            if (messagesDiv) {
                messagesDiv.scrollTo({
                    top: messagesDiv.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }

        // Mostrar indicador de escritura (simulado)
        function showTypingIndicator() {
            const messagesDiv = document.getElementById('modalMessages');
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typing-indicator';
            typingDiv.className = 'message message-ai';
            typingDiv.innerHTML = \`
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <div class="typing-dots">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                </div>
            \`;
            messagesDiv.appendChild(typingDiv);
            scrollToBottom();
            return typingDiv;
        }

        // Ocultar indicador de escritura
        function hideTypingIndicator() {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.remove();
            }
        }

        // Función de confirmación personalizada para evitar problemas de z-index
        function showCustomConfirm(message) {
            return new Promise((resolve) => {
                // Crear modal de confirmación
                const confirmModal = document.createElement('div');
                confirmModal.className = 'custom-confirm-modal';
                confirmModal.style.cssText = \`
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.7);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                \`;
                
                const confirmBox = document.createElement('div');
                confirmBox.style.cssText = \`
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 400px;
                    margin: 0 1rem;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    text-align: center;
                \`;
                
                const messageP = document.createElement('p');
                messageP.textContent = message;
                messageP.style.cssText = \`
                    margin-bottom: 2rem;
                    line-height: 1.5;
                    color: #333;
                    white-space: pre-line;
                \`;
                
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = \`
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                \`;
                
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancelar';
                cancelBtn.style.cssText = \`
                    padding: 0.75rem 1.5rem;
                    border: 2px solid #ddd;
                    background: white;
                    color: #666;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                \`;
                
                const confirmBtn = document.createElement('button');
                confirmBtn.textContent = 'Aceptar';
                confirmBtn.style.cssText = \`
                    padding: 0.75rem 1.5rem;
                    border: none;
                    background: #e74c3c;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                \`;
                
                // Eventos
                cancelBtn.onclick = () => {
                    document.body.removeChild(confirmModal);
                    resolve(false);
                };
                
                confirmBtn.onclick = () => {
                    document.body.removeChild(confirmModal);
                    resolve(true);
                };
                
                // Escape key
                const escapeHandler = (e) => {
                    if (e.key === 'Escape') {
                        document.body.removeChild(confirmModal);
                        document.removeEventListener('keydown', escapeHandler);
                        resolve(false);
                    }
                };
                document.addEventListener('keydown', escapeHandler);
                
                // Armar y mostrar
                buttonContainer.appendChild(cancelBtn);
                buttonContainer.appendChild(confirmBtn);
                confirmBox.appendChild(messageP);
                confirmBox.appendChild(buttonContainer);
                confirmModal.appendChild(confirmBox);
                document.body.appendChild(confirmModal);
                
                // Focus en el botón de cancelar por defecto
                cancelBtn.focus();
            });
        }

        function closeModal() {
            document.getElementById('conversationModal').style.display = 'none';
            currentConversation = null;
            hideTypingIndicator();
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
