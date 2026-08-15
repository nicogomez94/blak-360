/**
 * Sesión administrativa respaldada por el servidor.
 */

const AUTH_KEY = 'blak_auth_session';

/**
 * Iniciar sesión
 */
function login(username, token, expiresAt) {
    const sessionData = {
        username,
        token,
        loginTime: Date.now(),
        expiresAt
    };
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
    console.log('✅ Sesión iniciada para:', username);
}

/**
 * Cerrar sesión
 */
function logout() {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem(AUTH_KEY);
    console.log('✅ Sesión cerrada - localStorage limpiado');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 100);
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
        
        return Boolean(session.token);
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
            token: session.token,
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
function getAuthToken() {
    const user = getCurrentUser();
    return user?.token || '';
}

async function authFetch(input, init = {}) {
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${getAuthToken()}`);
    const response = await fetch(input, { ...init, headers });

    if (response.status === 401) {
        logout();
        throw new Error('Sesión vencida');
    }

    return response;
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
        console.log('❌ No hay usuario autenticado');
        return;
    }
    
    console.log('✅ Usuario encontrado:', user.username);
    
    const container = document.querySelector('.' + containerId) || document.querySelector('.header') || document.body;
    console.log('📦 Contenedor encontrado:', container);
    
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
    logoutBtn.type = 'button';
    logoutBtn.textContent = '🚪 Cerrar Sesión';
    
    // Agregar evento de click
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🖱️ Click en botón de logout detectado');
        logout();
    }, false);
    
    console.log('🔘 Botón de logout creado');
    
    // Ensamblar elementos
    userInfo.appendChild(userDetails);
    userInfo.appendChild(logoutBtn);
    
    // Insertar al final del header
    if (container.classList.contains('header') || container.classList.contains('header-content')) {
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.appendChild(userInfo);
        console.log('✅ Botón de logout agregado al DOM');
    } else {
        console.log('⚠️ Contenedor no es header o header-content');
    }
}

// Exportar funciones para uso global
window.login = login;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.getAuthToken = getAuthToken;
window.authFetch = authFetch;
window.requireAuth = requireAuth;
window.addLogoutButton = addLogoutButton;
