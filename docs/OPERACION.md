# Operación del chatbot BLAK

## Rutas

- Webhook de Meta: `/webhook/whatsapp`
- Health check: `/health`
- Panel administrativo: `/`

## Horario automático

La IA responde de 18:00 a 09:00 en `America/Argentina/Buenos_Aires`.
Entre 09:00 y 18:00 el chatbot no envía respuestas automáticas, para que
atienda la operadora desde WhatsApp Business.

Variables relacionadas:

- `CHATBOT_ENABLED`
- `CHATBOT_ACTIVE_FROM`
- `CHATBOT_ACTIVE_UNTIL`
- `CHATBOT_TIMEZONE`

## Variables necesarias

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `META_ACCESS_TOKEN`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_WABA_ID`
- `PHONE_NUMBER_ID`
- `WEBHOOK_VERIFY_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Las credenciales nunca se guardan en Git.
