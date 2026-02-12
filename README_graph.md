# WhatsApp Cloud API Setup -- Producción

------------------------------------------------------------------------

# 🎯 Objetivo

Configurar un número real de WhatsApp Business para usarlo con Meta
WhatsApp Cloud API en producción, incluyendo:

-   Registro del número
-   Vinculación al WABA
-   Suscripción de la app
-   Envío de mensajes
-   Webhook funcional

------------------------------------------------------------------------

# 1️⃣ Crear / Verificar WABA y Número

Ir a:

business.facebook.com/settings

→ Cuentas\
→ Cuentas de WhatsApp

-   Crear o verificar WhatsApp Business Account (WABA)
-   Agregar número
-   Aprobar nombre visible

------------------------------------------------------------------------

# 2️⃣ Obtener WABA ID

Desde Cuentas de WhatsApp → seleccionar la cuenta.

Ejemplo:

WABA_ID = 25891405090484564

------------------------------------------------------------------------

# 3️⃣ Obtener phone_number_id (Graph API)

Ir a:

https://developers.facebook.com/tools/explorer/

Seleccionar la app correcta.

### GET

25891405090484564/phone_numbers

Respuesta esperada:

{ "data": \[ { "id": "879191825286629", "display_phone_number": "+54 9
11 2388-9986" } \] }

Guardar:

PHONE_NUMBER_ID = 879191825286629

------------------------------------------------------------------------

# 4️⃣ Registrar el número (Registration API)

⚠️ Paso obligatorio para pasar de "Pending" a "Connected"

### POST

879191825286629/register

Body:

{ "messaging_product": "whatsapp", "pin": "TU_PIN_DE_6\_DIGITOS" }

Respuesta esperada:

{ "success": true }

------------------------------------------------------------------------

# 5️⃣ Vincular el WABA a la App CHATBOT

Ir a:

business.facebook.com/settings

→ Cuentas\
→ Cuentas de WhatsApp\
→ Seleccionar WABA\
→ Agregar activos\
→ Seleccionar app CHATBOT\
→ Control total

------------------------------------------------------------------------

# 6️⃣ Suscribir la App al WABA (Graph API)

Seleccionar app CHATBOT en Graph Explorer.

### POST

25891405090484564/subscribed_apps

Respuesta:

{ "success": true }

Verificación:

### GET

25891405090484564/subscribed_apps

------------------------------------------------------------------------

# 7️⃣ Generar Token Permanente

Ir a:

business.facebook.com/settings

→ Usuarios del sistema\
→ Crear system user (Admin)\
→ Asignar activos: - App CHATBOT (Full Control) - WABA (Full Control)

Generar token con permisos:

-   whatsapp_business_management
-   whatsapp_business_messaging

Guardar el token de forma segura.

------------------------------------------------------------------------

# 8️⃣ Enviar mensaje de prueba

En Graph API Explorer (app CHATBOT):

### POST

879191825286629/messages

Body:

{ "messaging_product": "whatsapp", "to": "54911XXXXXXXX", "type":
"text", "text": { "body": "Probando desde la app CHATBOT 🚀" } }

Respuesta esperada:

{ "messages": \[ { "id": "wamid.HBgL..." } \] }

Si devuelve "wamid", el envío fue exitoso.

------------------------------------------------------------------------

# 9️⃣ Configurar Webhook

En Meta Developers → App CHATBOT → Webhooks

Producto: WhatsApp Business Account

Endpoint: https://blak-360.onrender.com/webhook/whatsapp

Suscribirse a eventos:

-   messages
-   message_deliveries
-   message_reads

------------------------------------------------------------------------

# 🔟 Estructura Webhook esperada

Cuando alguien envía mensaje al número:

{ "entry": \[ { "changes": \[ { "value": { "messages": \[ { "from":
"54911XXXXXXXX", "text": { "body": "Hola" } } \] } } \] } \] }

------------------------------------------------------------------------

# Responder mensaje vía API

### POST

879191825286629/messages

{ "messaging_product": "whatsapp", "to": "NUMERO_DEL_USUARIO", "type":
"text", "text": { "body": "Respuesta automática" } }

------------------------------------------------------------------------

# 🚨 Errores comunes

-   (#200) permisos → Token incorrecto o sin permisos
-   Recipient not allowed → App en modo desarrollo
-   Template required → Pasaron más de 24h sin interacción

------------------------------------------------------------------------

# 🏗 Arquitectura Final

Número → WABA\
WABA → Vinculado a App CHATBOT\
App CHATBOT → Suscripta al WABA\
App CHATBOT → Webhook → Backend (Render)\
Backend → Envía mensajes vía Cloud API

------------------------------------------------------------------------

# ✅ Estado Final Esperado

-   Número: Conectado\
-   subscribed_apps: success\
-   POST /messages devuelve wamid\
-   Webhook recibe eventos correctamente

------------------------------------------------------------------------

Documentación generada automáticamente.
