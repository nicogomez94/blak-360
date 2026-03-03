# 🔐 Sistema de Login - BLAK Chatbot

## Descripción

Sistema de autenticación básico para demos usando localStorage del navegador. Permite sesiones extendidas de hasta 30 días para que no se cierre la sesión rápidamente.

## 🚀 Acceso

**URL de Login:** `/login.html` o simplemente `/`

## 👤 Credenciales de Demo

| Usuario | Contraseña | Descripción |
|---------|-----------|-------------|
| `demo` | `abraesnniikkoo` | Usuario demo general |
| `admin` | `admin123` | Usuario administrador |
| `cliente` | `cliente123` | Usuario cliente |

## ✨ Características

- **Sesión extendida**: Por defecto, la sesión dura **30 días**
- **Almacenamiento local**: Usa localStorage del navegador
- **Auto-login**: Si marcas "Mantener sesión iniciada" (activado por defecto)
- **Protección automática**: Las páginas protegidas redirigen al login si no estás autenticado
- **Botón de logout**: Aparece automáticamente en todas las páginas protegidas

## 📁 Archivos del Sistema

```
public/
├── login.html          # Página de inicio de sesión
├── login.css          # Estilos del login
├── auth.js            # Lógica de autenticación
├── index.html         # Redirección automática
├── admin-dashboard.html  # Dashboard protegido
└── panel.html         # Panel de costos protegido
```

## 🔒 Páginas Protegidas

Las siguientes páginas requieren autenticación:
- `/admin-dashboard.html` - Dashboard principal
- `/panel.html` - Panel de monitoreo de costos

## 💻 Uso Técnico

### Verificar si un usuario está autenticado:
```javascript
if (isAuthenticated()) {
    // Usuario autenticado
}
```

### Proteger una nueva página:
```html
<script src="/auth.js"></script>
<script>
    requireAuth(); // Redirige a login si no está autenticado
</script>
```

### Agregar botón de logout:
```javascript
addLogoutButton('nombre-de-contenedor');
```

### Cerrar sesión manualmente:
```javascript
logout();
```

### Obtener información del usuario actual:
```javascript
const user = getCurrentUser();
console.log(user.username);
console.log(user.expiresAt);
```

## 🔧 Configuración

Para cambiar la duración de la sesión, edita `auth.js`:

```javascript
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días
```

Para agregar nuevos usuarios de demo, edita `login.html`:

```javascript
const validUsers = {
    'demo': 'abraesnniikkoo',
    'admin': 'admin123',
    'cliente': 'cliente123',
    'tuusuario': 'tupassword'  // Agregar aquí
};
```

## 📝 Notas

- **Este sistema es SOLO para demos**. No usar en producción.
- Las credenciales están hardcodeadas en el frontend
- No hay cifrado de contraseñas
- Para producción, implementar autenticación backend real (JWT, OAuth, etc.)

## 🎯 Flujo de Usuario

1. Usuario accede a `/` o cualquier página
2. Si no está autenticado → redirige a `/login.html`
3. Usuario ingresa credenciales
4. Sistema guarda sesión en localStorage (30 días)
5. Usuario es redirigido al dashboard
6. Usuario puede navegar libremente entre páginas
7. Botón de logout disponible en todas las páginas
8. Al hacer logout, se limpia localStorage y redirige a login

## 🌐 URLs del Sistema

- `/` → Redirige automáticamente según autenticación
- `/login.html` → Página de inicio de sesión
- `/admin-dashboard.html` → Dashboard principal (protegido)
- `/panel.html` → Panel de costos (protegido)

---

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Propósito:** Sistema de demo con sesión extendida
