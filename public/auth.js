/**
 * Sistema de autenticación básico usando localStorage
 * Para demos con sesión extendida
 */

const AUTH_KEY = 'blak_auth_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos

/**
 * Iniciar sesión
 */
function login(username, rememberMe = true) {
    const sessionData = {
        username: username,
        loginTime: Date.now(),
        expiresAt: rememberMe ? Date.now() + SESSION_DURATION : Date.now() + (24 * 60 * 60 * 1000) // 30 días o 24 horas
    };
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
    console.log('✅ Sesión iniciada para:', username);
}

/**
 * Cerrar sesión
 */
function logout() {
    localStorage.removeItem(AUTH_KEY);
    console.log('🚪 Sesión cerrada');
    window.location.href = '/login.html';
}

/**
 * Verificar si el usuario está autenticado
 */
function isAuthenticated() {
    const sessionData = localStorage.getItem(AUTH_KEY);
    
    if (!sessionData) {
        return false;
    }
    
    try {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        
        // Verificar si la sesión expiró
        if (session.expiresAt && now > session.expiresAt) {
            console.log('⏰ Sesión expirada');
            localStorage.removeItem(AUTH_KEY);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error al verificar sesión:', error);
        localStorage.removeItem(AUTH_KEY);
        return false;
    }
}

/**
 * Obtener información del usuario actual
 */
function getCurrentUser() {
    const sessionData = localStorage.getItem(AUTH_KEY);
    
    if (!sessionData) {
        return null;
    }
    
    try {
        const session = JSON.parse(sessionData);
        return {
            username: session.username,
            loginTime: new Date(session.loginTime),
            expiresAt: new Date(session.expiresAt)
        };
    } catch (error) {
        console.error('❌ Error al obtener usuario:', error);
        return null;
    }
}

/**
 * Extender la sesión (útil para actividad del usuario)
 */
function extendSession() {
    const sessionData = localStorage.getItem(AUTH_KEY);
    
    if (!sessionData) {
        return false;
    }
    
    try {
        const session = JSON.parse(sessionData);
        session.expiresAt = Date.now() + SESSION_DURATION;
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        return true;
    } catch (error) {
        console.error('❌ Error al extender sesión:', error);
        return false;
    }
}

/**
 * Middleware para proteger páginas
 * Agregar esto al inicio de cada página que requiera autenticación
 */
function requireAuth() {
    if (!isAuthenticated()) {
        console.log('🔒 Acceso denegado - Redirigiendo a login');
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Agregar botón de logout a la página
 */
function addLogoutButton(containerId = 'header') {
    const user = getCurrentUser();
    
    if (!user) {
        return;
    }
    
    const container = document.querySelector('.' + containerId) || document.querySelector('.header') || document.body;
    
    // Crear contenedor principal
    const userInfo = document.createElement('div');
    userInfo.className = 'auth-user-info';
    
    // Crear info del usuario
    const userDetails = document.createElement('div');
    userDetails.className = 'auth-user-details';
    userDetails.innerHTML = `
        <div class="auth-username">👤 ${user.username}</div>
        <div class="auth-session-expiry">Sesión hasta: ${user.expiresAt.toLocaleDateString()}</div>
    `;
    
    // Crear botón de logout
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'auth-logout-btn';
    logoutBtn.textContent = '🚪 Cerrar Sesión';
    logoutBtn.addEventListener('click', function() {
        logout();
    });
    
    // Ensamblar elementos
    userInfo.appendChild(userDetails);
    userInfo.appendChild(logoutBtn);
    
    // Insertar al final del header
    if (container.classList.contains('header') || container.classList.contains('header-content')) {
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.appendChild(userInfo);
    }
}

// Exportar funciones para uso global
window.login = login;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.extendSession = extendSession;
window.requireAuth = requireAuth;
window.addLogoutButton = addLogoutButton;
