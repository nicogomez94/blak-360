# Producción del chatbot BLAK

El chatbot se ejecuta como un Web Service independiente. Comparte la instancia
de PostgreSQL de BLAK, pero todas sus tablas, índices y funciones viven dentro
del schema `blak_twilio`; el script de inicialización no modifica objetos del
schema `public` usado por reservas y booking.

## Despliegue

- Build: `npm ci --include=dev && npm run db:bootstrap`
- Start: `npm start`
- Health check: `/health`
- Webhook de Meta: `/webhook/whatsapp`
- Dashboard: `/`

El script `npm run db:bootstrap` es transaccional e idempotente. Nunca ejecuta
las migraciones históricas destructivas de `migrations/`.

## Activación de WhatsApp

El servicio se despliega con `CHATBOT_ENABLED=false` y sin `PHONE_NUMBER_ID`.
De esta forma puede verificarse el webhook y el dashboard sin enviar mensajes.
Para activar el número más adelante:

1. Confirmar en Meta que el número productivo figure conectado y verificado.
2. Configurar `PHONE_NUMBER_ID` en Render.
3. Confirmar que el token pertenezca a la app productiva y tenga permisos
   `whatsapp_business_management` y `whatsapp_business_messaging`.
4. Cambiar `CHATBOT_ENABLED=true` y ejecutar un smoke test controlado.

No se debe guardar ningún secreto en Git. Las credenciales de producción se
configuran exclusivamente como variables de entorno de Render.
