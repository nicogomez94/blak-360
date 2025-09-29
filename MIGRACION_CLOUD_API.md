# Migración a WhatsApp Cloud API

Este proyecto ha sido migrado de 360dialog a **WhatsApp Cloud API de Meta**.

## 🔄 Cambios Principales

### 1. Variables de Entorno
**Antes (360dialog):**
```env
DIALOG360_API_KEY=tu_api_key_aqui
D360_API_URL=https://waba-v2.360dialog.io
```

**Ahora (Cloud API):**
```env
META_ACCESS_TOKEN=tu_token_de_acceso_permanente_aqui
PHONE_NUMBER_ID=tu_phone_number_id_aqui
WEBHOOK_VERIFY_TOKEN=blak_webhook_token
```

### 2. Endpoints de API
- **Antes:** `https://waba-v2.360dialog.io/messages`
- **Ahora:** `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`

### 3. Autenticación
- **Antes:** Header `D360-API-KEY`
- **Ahora:** Header `Authorization: Bearer {META_ACCESS_TOKEN}`

### 4. Verificación de Webhook
Se agregó un endpoint GET para la verificación inicial de webhook:
```javascript
GET /webhook/whatsapp?hub.mode=subscribe&hub.challenge=CHALLENGE&hub.verify_token=TOKEN
```

## 🚀 Configuración

### 1. Obtener Credenciales de Cloud API

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una nueva aplicación
3. Agrega el producto "WhatsApp Business"
4. Configura tu número de teléfono
5. Genera un token de acceso permanente
6. Obtén tu Phone Number ID

### 2. Configurar Webhook

1. En la configuración de Cloud API, establece:
   - **URL del Webhook:** `https://tu-dominio.com/webhook/whatsapp`
   - **Verify Token:** `blak_webhook_token` (o el que definas)
   - **Campos suscritos:** `messages`

### 3. Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Completa las siguientes variables:
```env
META_ACCESS_TOKEN=EAAxxxxxxx  # Token permanente de tu app
PHONE_NUMBER_ID=123456789    # ID del número de teléfono
WEBHOOK_VERIFY_TOKEN=blak_webhook_token  # Token para verificar webhook
```

## ✅ Funcionalidades Migradas

- ✅ Envío de mensajes de texto
- ✅ Recepción de webhooks
- ✅ Verificación de webhook (GET)
- ✅ Manejo de formatos de mensaje de Cloud API
- ✅ Integración con OpenAI
- ✅ Dashboard de administración
- ✅ Modo manual de conversaciones

## 🔍 Archivos Modificados

- `services/messaging.js` - Migrado a Cloud API
- `routes/webhook.js` - Agregada verificación GET
- `index.js` - Actualizada configuración
- `README.md` - Documentación actualizada
- `.env.example` - Variables de Cloud API

## 📋 Checklist de Migración

- [x] Actualizar servicio de messaging
- [x] Agregar verificación de webhook
- [x] Actualizar variables de entorno
- [x] Modificar documentación
- [ ] Probar envío de mensajes
- [ ] Verificar recepción de webhooks
- [ ] Validar con números reales

## 🐛 Troubleshooting

### Error: "META_ACCESS_TOKEN no configurado"
- Verifica que tu token esté correctamente copiado en `.env`
- Asegúrate de que sea un token permanente (no temporal)

### Error: "Webhook verification failed"
- Verifica que `WEBHOOK_VERIFY_TOKEN` coincida con lo configurado en Meta
- Asegúrate de que el endpoint GET esté funcionando

### Mensajes no se envían
- Verifica que `PHONE_NUMBER_ID` sea correcto
- Confirma que el número de destino esté en formato internacional
- Revisa los logs del servidor para errores específicos

## 📚 Referencias

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Authentication Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#access-tokens)