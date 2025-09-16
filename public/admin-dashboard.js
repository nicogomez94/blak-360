// Variables globales
let currentConversation = null;
let socket = null;
let allConversations = []; // Array para almacenar todas las conversaciones
let currentFilter = 'all'; // Filtro actual

// Conectar WebSocket para tiempo real
function connectWebSocket() {
    // Detectar si estamos en producción (Vercel no soporta WebSockets)
    if (window.location.hostname.includes('vercel.app')) {
        console.log('🚫 WebSocket deshabilitado en producción (Vercel)');
        return;
    }
    
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
    showNotification(`${emoji} Nuevo mensaje de ${data.contactName}`);
}

// Función alternativa para polling en producción
function checkForUpdates() {
    if (!window.location.hostname.includes('vercel.app')) return;
    
    // En producción, verificar actualizaciones cada cierto tiempo
    // Esta es una implementación básica, se puede mejorar
    loadData();
}

// Mostrar notificación moderna
function showNotification(message) {
    // Remover notificaciones existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00ff41, #00b82d);
        color: #000;
        padding: 1.2rem 2rem;
        border-radius: 12px;
        border: 2px solid #00ff41;
        box-shadow: 0 8px 32px rgba(0,255,65,0.4);
        z-index: 10000;
        animation: slideIn 0.4s ease;
        font-weight: 700;
        min-width: 250px;
        max-width: 350px;
        backdrop-filter: blur(15px);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div>${message}</div>
            <div onclick="this.parentElement.parentElement.remove()" 
                 style="cursor: pointer; opacity: 0.7; margin-left: auto;">✕</div>
        </div>
    `;
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
        
        document.getElementById('stats').innerHTML = `
            <div class="stat-card filter-card" onclick="applyFilter('all')" data-filter="all">
                <div class="stat-number">${stats.totalConversations || 0}</div>
                <div class="stat-label">Total Conversaciones</div>
            </div>
            <div class="stat-card filter-card" onclick="applyFilter('activeToday')" data-filter="activeToday">
                <div class="stat-number">${stats.activeToday || 0}</div>
                <div class="stat-label">Activas Hoy</div>
            </div>
            <div class="stat-card filter-card" onclick="applyFilter('manual')" data-filter="manual">
                <div class="stat-number">${stats.manualMode || 0}</div>
                <div class="stat-label">Modo Manual</div>
            </div>
            <div class="stat-card filter-card" onclick="applyFilter('auto')" data-filter="auto">
                <div class="stat-number">${stats.autoMode || 0}</div>
                <div class="stat-label">Modo Automático</div>
            </div>
        `;

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
            const activeCard = document.querySelector(`[data-filter="${currentFilter}"]`);
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
                return `+54 9 11 ${phone.slice(5,9)} ${phone.slice(9,13)}`;
            }
            // Si es 11 dígitos (ej: 115XXXXXXXX)
            if (phone.length === 11 && phone.startsWith('11')) {
                return `+54 9 11 ${phone.slice(2,6)} ${phone.slice(6,10)}`;
            }
            // Si es 10 dígitos (ej: 911XXXXXXXX)
            if (phone.length === 10 && phone.startsWith('9')) {
                return `+54 9 11 ${phone.slice(3,7)} ${phone.slice(7,11)}`;
            }
            // Si es 8 dígitos (ej: XXXXXXXX)
            if (phone.length === 8) {
                return `+54 9 11 ${phone.slice(0,4)} ${phone.slice(4,8)}`;
            }
            // Si no matchea, devuelve el original
            return phone;
        }
        const formattedPhone = formatPhoneNumber(conv.phoneNumber);
        return `
            <div class="conversation ${conv.isManualMode ? 'manual-mode' : 'auto-mode'}" data-phone="${conv.phoneNumber}">
                <div class="conversation-info">
                    <h3 class="conversation-name">${conv.contactName} (${formattedPhone})</h3>
                    <div class="conversation-meta">
                        ${conv.isManualMode ? '🔧 Modo Manual' : '🤖 Modo Automático'} | 
                        ${conv.messageCount} mensajes | 
                        ${new Date(conv.lastActivity).toLocaleString()}
                    </div>
                </div>
                <div class="conversation-actions">
                    <button class="btn btn-view" onclick="viewConversation('${conv.phoneNumber}')">Ver</button>
                    ${conv.isManualMode ? 
                        `<button class="btn btn-auto" onclick="setMode('${conv.phoneNumber}', 'auto')">Auto</button>` :
                        `<button class="btn btn-manual" onclick="setMode('${conv.phoneNumber}', 'manual')">Manual</button>`
                    }
                    <button class="btn btn-delete" onclick="deleteConversation('${conv.phoneNumber}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Función para aplicar filtro
function applyFilter(filterType) {
    currentFilter = filterType;
    
    // Actualizar estilos de las tarjetas
    document.querySelectorAll('.filter-card').forEach(card => {
        card.classList.remove('active-filter');
    });
    document.querySelector(`[data-filter="${filterType}"]`).classList.add('active-filter');
    
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
    showNotification(`🔍 Filtro aplicado: ${filterLabels[filterType]}`);
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
    const conversationElement = document.querySelector(`[data-phone="${phoneNumber}"]`);
    const contactName = conversationElement ? 
        conversationElement.querySelector('.conversation-name').textContent.split('(')[0].trim() : 
        'Cliente';
    
    // Configurar mensaje de confirmación según el modo
    let confirmMessage, successMessage, actionEmoji;
    
    if (mode === 'manual') {
        confirmMessage = `🔧 ¿Activar MODO MANUAL para ${contactName}?\n\n` +
                       `• Los mensajes NO se responderán automáticamente\n` +
                       `• Deberás responder manualmente desde el dashboard\n` +
                       `• La IA se pausará hasta que desactives el modo manual`;
        successMessage = `🔧 Modo Manual ACTIVADO para ${contactName}`;
        actionEmoji = '🔧';
    } else {
        confirmMessage = `🤖 ¿Activar MODO AUTOMÁTICO para ${contactName}?\n\n` +
                       `• Los mensajes se responderán automáticamente con IA\n` +
                       `• Ya no necesitarás intervenir manualmente\n` +
                       `• El chatbot tomará el control de la conversación`;
        successMessage = `🤖 Modo Automático ACTIVADO para ${contactName}`;
        actionEmoji = '🤖';
    }
    
    // Mostrar confirmación personalizada
    const confirmed = await showCustomConfirm(confirmMessage);
    if (!confirmed) {
        return; // Usuario canceló
    }
    
    try {
        const response = await fetch(`/admin/api/conversations/${phoneNumber}/${mode}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadData(); // Recargar datos
            
            // Mostrar notificación de éxito
            showNotification(`${actionEmoji} ${successMessage}`);
            
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
    const conversationElement = document.querySelector(`[data-phone="${phoneNumber}"]`);
    const contactName = conversationElement ? 
        conversationElement.querySelector('.conversation-name').textContent.split('(')[0].trim() : 
        'Cliente';
    
    // Mensaje de confirmación con advertencia
    const confirmMessage = `⚠️ ¿BORRAR COMPLETAMENTE la conversación de ${contactName}?\n\n` +
                         `📞 Número: ${phoneNumber}\n` +
                         `❌ Se eliminarán TODOS los mensajes\n` +
                         `🔄 Si escribe de nuevo, iniciará una conversación desde cero\n\n` +
                         `Esta acción NO se puede deshacer.`;
    
    // Mostrar confirmación personalizada
    const confirmed = await showCustomConfirm(confirmMessage);
    if (!confirmed) {
        return; // Usuario canceló
    }
    
    try {
        const response = await fetch(`/admin/api/conversations/${phoneNumber}`, {
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
            showNotification(`🗑️ Conversación de ${contactName} eliminada completamente`);
            
        } else {
            const errorData = await response.json();
            alert(`❌ Error borrando conversación: ${errorData.error || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. No se pudo borrar la conversación.');
    }
}

async function viewConversation(phoneNumber) {
    try {
        currentConversation = phoneNumber;
        const response = await fetch(`/admin/api/conversation/${phoneNumber}`);
        const data = await response.json();
        
        // Actualizar header del chat
        const chatName = document.getElementById('chatName');
        const chatStatus = document.getElementById('chatStatus');
        const chatAvatar = document.getElementById('chatAvatar');
        
        chatName.textContent = `${data.conversation.contactName} (${phoneNumber})`;
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
            
            return `
                <div class="message message-${msg.sender}">
                    <div class="message-bubble">
                        <div class="message-sender">${senderName}</div>
                        <div class="message-text">${msg.text}</div>
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
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
                infoMessage.innerHTML = `
                    <div style="text-align: center; padding: 1rem; background: #e8f5e8; border-radius: 8px; margin: 1rem 0; color: #2d5016;">
                        🔧 <strong>Modo Manual Activado</strong><br>
                        <small>Puedes responder directamente desde aquí. La IA está pausada.</small>
                    </div>
                `;
                messagesDiv.appendChild(infoMessage);
            }
        } else {
            // Modo Automático: Ocultar área de envío
            sendMessageArea.style.display = 'none';
            // Agregar mensaje informativo
            const infoMessage = document.createElement('div');
            infoMessage.className = 'mode-info auto-info';
            infoMessage.innerHTML = `
                <div style="text-align: center; padding: 1rem; background: #e3f2fd; border-radius: 8px; margin: 1rem 0; color: #1565c0;">
                    🤖 <strong>Modo Automático Activado</strong><br>
                    <small>La IA responde automáticamente. Para intervenir manualmente, activa el Modo Manual.</small>
                </div>
            `;
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
        const response = await fetch(`/admin/api/send/${currentConversation}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        if (response.ok) {
            input.value = '';
            input.style.height = 'auto';
            
            // Verificar si ya está en modo manual antes de activarlo
            const currentResponse = await fetch(`/admin/api/conversation/${currentConversation}`);
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
    typingDiv.innerHTML = `
        <div class="message-bubble">
            <div class="typing-indicator">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
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
        confirmModal.style.cssText = `
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
        `;
        
        const confirmBox = document.createElement('div');
        confirmBox.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 400px;
            margin: 0 1rem;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            text-align: center;
        `;
        
        const messageP = document.createElement('p');
        messageP.textContent = message;
        messageP.style.cssText = `
            margin-bottom: 2rem;
            line-height: 1.5;
            color: #333;
            white-space: pre-line;
        `;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: center;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.cssText = `
            padding: 0.75rem 1.5rem;
            border: 2px solid #ddd;
            background: white;
            color: #666;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
        `;
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Aceptar';
        confirmBtn.style.cssText = `
            padding: 0.75rem 1.5rem;
            border: none;
            background: #e74c3c;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
        `;
        
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

// Auto-refresh: más frecuente en producción donde no hay WebSocket
const refreshInterval = window.location.hostname.includes('vercel.app') ? 10000 : 60000;
setInterval(loadData, refreshInterval);

console.log(`🔄 Auto-refresh configurado cada ${refreshInterval/1000} segundos`);

// Cerrar modal al presionar Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

// Enviar mensaje con Enter
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});
