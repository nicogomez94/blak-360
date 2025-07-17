# WhatsApp Chatbot Backend

Backend para chatbot de WhatsApp usando Node.js, Express, Twilio y OpenAI GPT-3.5-turbo.

## 🚀 Características

- ✅ Recibe mensajes de WhatsApp vía webhook de Twilio
- 🤖 Procesa mensajes con OpenAI GPT-3.5-turbo
- 📱 Envía respuestas automáticas por WhatsApp
- 💾 Mantiene historial de conversación por usuario
- 🔒 Manejo seguro de variables de entorno
- 📝 Logging detallado de eventos y errores
- 🏗️ Arquitectura modular y escalable

## 📋 Requisitos

- Node.js 16+ 
- Cuenta de Twilio con WhatsApp Sandbox configurado
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

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_de_twilio
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# Servidor
PORT=3000
NODE_ENV=development
DEBUG=true
```

## 🔧 Configuración de Twilio

### 1. Configurar Twilio Sandbox
1. Ve a [Twilio Console](https://console.twilio.com/)
2. Navega a **Messaging > Try it out > Send a WhatsApp message**
3. Sigue las instrucciones para configurar el sandbox
4. Obtén tus credenciales: Account SID y Auth Token

### 2. Configurar Webhook
1. En Twilio Console, ve a **Messaging > Settings > WhatsApp sandbox settings**
2. En "When a message comes in", configurar:
   - **URL**: `https://tu-dominio.com/webhook/whatsapp`
   - **HTTP Method**: POST

### Para desarrollo local con ngrok:
```bash
# Instalar ngrok globalmente
npm install -g ngrok

# Ejecutar ngrok en otra terminal
ngrok http 3000

# Usar la URL HTTPS que ngrok proporciona
# Ejemplo: https://abc123.ngrok.io/webhook/whatsapp
```

## 🔑 Configuración de OpenAI

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

Ejemplo de uso del endpoint de prueba:
```bash
curl -X POST http://localhost:3000/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, ¿cómo estás?",
    "phone": "whatsapp:+1234567890"
  }'
```

## 📁 Estructura del Proyecto

```
├── index.js                 # Punto de entrada principal
├── routes/
│   └── webhook.js           # Rutas para webhooks de WhatsApp
├── services/
│   ├── openai.js           # Servicio para OpenAI API
│   └── twilio.js           # Servicio para Twilio API
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

2. **Error de Twilio webhook**
   - Verificar que la URL del webhook sea accesible públicamente
   - Confirmar que el método sea POST
   - Verificar credenciales de Twilio

3. **Mensaje no llega**
   - Verificar que el número esté registrado en Twilio Sandbox
   - Confirmar el formato del número (whatsapp:+1234567890)

### Variables de debug
```env
DEBUG=true        # Mostrar headers y body de requests
NODE_ENV=development  # Mostrar errores detallados
```

## 🔐 Seguridad

- ✅ Variables de entorno para credenciales
- ✅ Validación de entrada de datos
- ✅ Manejo de errores sin exponer información sensible
- ✅ Rate limiting implícito por OpenAI y Twilio
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

Envía un mensaje al número de Twilio Sandbox y disfruta conversando con tu AI assistant.
