# 📋 Cómo suscribir y validar la app en WhatsApp Business API

Para que tu app pueda enviar y recibir mensajes, debes suscribirla a la cuenta de WhatsApp Business y luego validar la suscripción.

**Suscribir la app:**
```bash
curl -X POST "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <TU_TOKEN>"
```

**Validar la suscripción:**
```bash
curl -G "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <TU_TOKEN>"
```

Esto asegura que tu app está correctamente vinculada y autorizada para operar con la cuenta de WhatsApp Business.

# 📋 Cómo obtener el PHONE_NUMBER_ID

****IR A PANEL IZQUIERDO --> CONFIG DE LA API

Para obtener el `PHONE_NUMBER_ID` correcto para tu número de WhatsApp Business, ejecuta el siguiente comando en tu terminal (reemplaza el WABA ID y el token por los tuyos):

```bash
curl -G "https://graph.facebook.com/v21.0/<WABA_ID>/phone_numbers" \
  -H "Authorization: Bearer <TOKEN>";
```

Ejemplo real:

```bash
curl -G "https://graph.facebook.com/v21.0/717522090907631/phone_numbers" \
  -H "Authorization: Bearer <TU_TOKEN>";
```

El resultado te mostrará el `id` de cada número de teléfono asociado a esa cuenta de WhatsApp Business. Usa ese valor en tu `.env` como `PHONE_NUMBER_ID`.
# WhatsApp Chatbot Backend

Backend para chatbot de WhatsApp usando Node.js, Express y OpenAI GPT-3.5-turbo.

## 🚀 Características

- ✅ Recibe mensajes de WhatsApp vía webhook
- 🤖 Procesa mensajes con OpenAI GPT-3.5-turbo
- 📱 Envía respuestas automáticas por WhatsApp
- 💾 Mantiene historial de conversación por usuario
- 🔒 Manejo seguro de variables de entorno
- 📝 Logging detallado de eventos y errores
- 🏗️ Arquitectura modular y escalable

## 📋 Requisitos

- Node.js 16+ 
- Cuenta de proveedor de WhatsApp configurada
- API Key de OpenAI
- ngrok (para desarrollo local) o servidor con HTTPS

## ⚙️ Instalación

1. **Clonar y configurar el proyecto**
```bash
git clone <tu-repo>
cd whatsapp-chatbot-backend
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```env
# OpenAI
OPENAI_API_KEY=sk-tu-api-key-de-openai

# WhatsApp Cloud API (Meta)
META_ACCESS_TOKEN=tu_token_de_acceso_aqui
PHONE_NUMBER_ID=tu_phone_number_id_aqui
WEBHOOK_VERIFY_TOKEN=blak_webhook_token

# Servidor
PORT=3000
NODE_ENV=development
```

## 🔧 Configuración de WhatsApp Cloud API

### 1. Configurar WhatsApp Cloud API (Meta)
1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una nueva aplicación de WhatsApp Business
3. Configura tu número de WhatsApp Business
4. Obtén tu `PHONE_NUMBER_ID` y `META_ACCESS_TOKEN`
5. Configura el webhook con tu `WEBHOOK_VERIFY_TOKEN`

### 2. Configurar Webhook
1. En la configuración de tu proveedor, establece:
   - **URL del Webhook**: `https://tu-dominio.com/webhook/whatsapp`
   - **HTTP Method**: POST

### Para desarrollo local con ngrok:
```bash
# Instalar ngrok globalmente
npm install -g ngrok

# Ejecutar ngrok en otra terminal
npx ngrok http 3000

# Usar la URL HTTPS que ngrok proporciona
# Ejemplo: https://abc123.ngrok.io/webhook/whatsapp
```

## �️ Configuración de Base de Datos

El proyecto usa PostgreSQL para persistir conversaciones y mensajes. Puedes usar una base local o en la nube.

### Inicialización de la Base de Datos

Una vez que tengas tu base de datos PostgreSQL configurada, ejecuta el script de migración inicial:

```bash
# Configurar la variable DATABASE_URL en tu entorno
export DATABASE_URL="postgresql://usuario:password@host:puerto/nombre_db"

# Ejecutar el script de inicialización
psql $DATABASE_URL -f migrations/init.sql
```

### Para bases de datos en Render o servicios similares:

```bash
# Ejemplo con credenciales específicas
PGPASSWORD='tu_password' psql -h tu-host.render.com -U tu_usuario -d tu_database -f migrations/init.sql
```

### Reset completo de la base (si necesitas empezar desde cero):

```bash
# 1. Conectarse a la base
PGPASSWORD='tu_password' psql -h tu-host.render.com -U tu_usuario -d tu_database

# 2. Dentro de psql, ejecutar:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO tu_usuario;
GRANT ALL ON SCHEMA public TO public;

# 3. Salir y ejecutar el script
\q
PGPASSWORD='tu_password' psql -h tu-host.render.com -U tu_usuario -d tu_database -f migrations/init.sql
```

### Estructura de tablas creadas:

- **`conversations`**: Almacena información de cada conversación (número, modo manual/automático, etc.)
- **`messages`**: Historial completo de mensajes (usuario, AI, admin)
- **`update_updated_at_column()`**: Función para actualizar timestamps automáticamente

## �🔑 Configuración de OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Crea una cuenta y obtén una API key
3. Asegúrate de tener créditos disponibles
4. Copia la API key al archivo `.env`

## 🏃‍♂️ Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Verificar que todo funciona
```bash
# Verificar servidor
curl http://localhost:3000/health

# Verificar webhook
curl http://localhost:3000/webhook/status
```

## 📡 Endpoints API

### Principales
- `POST /webhook/whatsapp` - Webhook principal para mensajes de WhatsApp
- `GET /health` - Health check del servidor
- `GET /` - Información general de la API

### Debugging y testing
- `GET /webhook/status` - Estado del webhook
- `POST /webhook/test` - Enviar mensaje de prueba




## 📁 Estructura del Proyecto

```
├── index.js                 # Punto de entrada principal
├── routes/
│   └── webhook.js           # Rutas para webhooks de WhatsApp
├── services/
│   ├── openai.js           # Servicio para OpenAI API
│   └── messaging.js        # Servicio para Messaging API
├── .env.example            # Ejemplo de variables de entorno
├── package.json            # Dependencias y scripts
└── README.md              # Este archivo
```

## 🔧 Configuración del Chatbot

El comportamiento del chatbot se puede personalizar en `services/openai.js`:

```javascript
const CHATBOT_CONFIG = {
  model: 'gpt-3.5-turbo',        // Modelo de OpenAI
  maxTokens: 500,                // Máximo tokens por respuesta
  temperature: 0.7,              // Creatividad (0-1)
  systemPrompt: '...'            // Personalidad del bot
};
```

## 📊 Monitoring y Logs

El sistema incluye logging detallado:

```bash
# Los logs aparecen en consola con timestamps
[2025-01-16T10:30:00.000Z] POST /webhook/whatsapp
📨 Mensaje recibido de WhatsApp
👤 De: whatsapp:+1234567890 (Juan)
💬 Mensaje: Hola, ¿cómo estás?
🤖 Enviando mensaje a OpenAI...
🤖 Respuesta de OpenAI: ¡Hola! Estoy muy bien, gracias por preguntar...
📤 Enviando respuesta por WhatsApp...
✅ Respuesta enviada exitosamente
```

## 🐛 Debugging

### Problemas comunes

1. **Error 401 de OpenAI**
   - Verificar que la API key sea válida
   - Confirmar que tienes créditos disponibles

2. **Error de webhook**
   - Verificar que la URL del webhook sea accesible públicamente
   - Confirmar que el método sea POST
   - Verificar credenciales del proveedor

3. **Mensaje no llega**
   - Verificar que el número esté configurado correctamente
   - Confirmar el formato del número (whatsapp:+1234567890)

### Variables de debug
```env
NODE_ENV=development  # Mostrar errores detallados
```

## 🔐 Seguridad

- ✅ Variables de entorno para credenciales
- ✅ Validación de entrada de datos
- ✅ Manejo de errores sin exponer información sensible
- ✅ Rate limiting implícito por OpenAI y el proveedor de mensajería
- ⚠️ Para producción, considera agregar autenticación de webhook

## 📈 Escalabilidad

Para uso en producción, considera:

1. **Base de datos**: Reemplazar el almacén en memoria por Redis o MongoDB
2. **Rate limiting**: Implementar límites por usuario
3. **Queue system**: Usar Bull.js o similar para procesar mensajes
4. **Monitoring**: Integrar con Sentry, LogRocket, etc.
5. **Caching**: Cachear respuestas frecuentes

## 🛠️ Scripts Disponibles

```bash
npm start          # Ejecutar en producción
npm run dev        # Ejecutar en desarrollo con nodemon
npm test           # Ejecutar tests (no implementado)
```

## 📝 Licencia

MIT License

## 🆘 Soporte

Para reportar bugs o solicitar características:
1. Crear un issue en GitHub
2. Incluir logs de error
3. Describir los pasos para reproducir el problema

---

**¡Tu chatbot de WhatsApp está listo! 🎉**

Envía un mensaje a tu número de WhatsApp Business y disfruta conversando con tu AI assistant.

## 🤖 Modo Manual y PPF (Pasaje Por Falla)

El chatbot soporta un modo "manual" para la gestión de conversaciones. Cuando ocurre un evento de PPF (Pasaje Por Falla), la conversación pasa automáticamente de modo automático a modo manual, permitiendo que un operador humano continúe la atención.

- Cuando se detecta un PPF, el sistema marca la conversación como `is_manual_mode = true` y asigna el operador correspondiente.
- El usuario final sigue conversando, pero los mensajes son gestionados por un humano hasta que se cierre el modo manual.
- Al finalizar la intervención manual, la conversación vuelve automáticamente a modo automático.

Puedes personalizar la lógica de PPF y el pasaje entre modos en el archivo `services/conversation.js`.
