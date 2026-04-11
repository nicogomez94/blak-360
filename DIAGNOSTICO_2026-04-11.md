# Diagnóstico WhatsApp Bot - 11 Abril 2026

## Datos de producción

| Variable | Valor |
|---|---|
| Servidor | https://blak-360.onrender.com |
| PHONE_NUMBER_ID | `879191825286629` |
| WABA ID | `25891405090484564` |
| App CHATBOT ID | `862710273293680` |
| App TEST WS AI ID | `678939211319146` |
| App TESTDENUEVO ID | `2396234710798050` |
| Webhook URL configurada en Meta | `https://blak-360.onrender.com/webhook/whatsapp` |
| WEBHOOK_VERIFY_TOKEN en Render | `blakverif1994` |
| DB | `dpg-d6sqp1ia214c73c704qg-a.oregon-postgres.render.com` |
| Schema DB | `blak_twilio` |

---

## Resultados de pruebas

### ✅ Token válido (viejo, antes de que venciera)
```bash
curl -s "https://graph.facebook.com/v21.0/me?access_token=<TOKEN_VIEJO>"
# Resultado: {"name":"Nicolás Gómez","id":"3613705462104666"}
```

### ✅ Número conectado y con calidad GREEN
```bash
curl -s "https://graph.facebook.com/v21.0/879191825286629?fields=display_phone_number,verified_name,quality_rating,status" \
  -H "Authorization: Bearer <TOKEN>"
# Resultado: {"display_phone_number":"+54 9 11 2388-9986","verified_name":"Zigo Dev","quality_rating":"GREEN","status":"CONNECTED","id":"879191825286629"}
```

### ✅ Servidor Render activo y respondiendo rápido
```bash
curl -s -o /dev/null -w "HTTP %{http_code} - Tiempo: %{time_total}s" "https://blak-360.onrender.com/health"
# Resultado: HTTP 200 - Tiempo: 0.37s
```

### ✅ Webhook GET (verificación Meta) funciona
```bash
curl -s "https://blak-360.onrender.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=blakverif1994&hub.challenge=TEST123"
# Resultado: TEST123
```

### ✅ Webhook POST procesa mensajes correctamente
```bash
curl -s -X POST "https://blak-360.onrender.com/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "object":"whatsapp_business_account",
    "entry":[{"id":"25891405090484564","changes":[{"value":{
      "messaging_product":"whatsapp",
      "metadata":{"display_phone_number":"+54 9 11 2388-9986","phone_number_id":"879191825286629"},
      "contacts":[{"profile":{"name":"Nicolas"},"wa_id":"5491152291994"}],
      "messages":[{"from":"5491152291994","id":"wamid.test001","timestamp":"1712800000","text":{"body":"hola bot"},"type":"text"}]
    },"field":"messages"}]}]
  }' -w "Status: %{http_code}"
# Resultado: Status: 200 - mensaje guardado en DB, OpenAI respondió
```

### ✅ App CHATBOT suscripta al WABA
```bash
curl -s "https://graph.facebook.com/v21.0/25891405090484564/subscribed_apps" \
  -H "Authorization: Bearer <TOKEN>"
# Resultado: {"data":[{"whatsapp_business_api_data":{"name":"CHATBOT","id":"862710273293680"}}]}
```

### ✅ Webhook configurado en el número
```bash
curl -s "https://graph.facebook.com/v21.0/25891405090484564/phone_numbers?fields=display_phone_number,status,webhook_configuration" \
  -H "Authorization: Bearer <TOKEN>"
# Resultado: webhook_configuration: {"application":"https://blak-360.onrender.com/webhook/whatsapp"}
```

### ✅ Resuscripción con campo messages explícito
```bash
curl -s -X POST "https://graph.facebook.com/v21.0/25891405090484564/subscribed_apps" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"subscribed_fields":["messages"]}'
# Resultado: {"success":true}
```

### ✅ Envío directo con token NUEVO funciona
```bash
curl -s -X POST "https://graph.facebook.com/v18.0/879191825286629/messages" \
  -H "Authorization: Bearer <TOKEN_NUEVO>" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"541152291994","type":"text","text":{"body":"test"}}'
# Resultado: {"messaging_product":"whatsapp","contacts":[{"input":"541152291994","wa_id":"5491152291994"}],...}
```

---

## ❌ Lo que falló / causa raíz

### Token vencido
```bash
curl -s -X POST "https://graph.facebook.com/v18.0/879191825286629/messages" \
  -H "Authorization: Bearer <TOKEN_VIEJO>"
# Resultado: {"error":{"message":"Error validating access token: Session has expired on Friday, 10-Apr-26 19:00:00 PDT.",...}}
```
**El token en Render estaba vencido desde las 19hs del 10/04/2026.**  
Por eso el bot recibía los mensajes (webhook GET/POST OK) pero no podía enviar las respuestas.

### Webhooks de Meta no llegan a Render (aún pendiente de confirmar)
- Los logs de Render no muestran nada cuando se envía un mensaje real desde WA
- Posible causa: app CHATBOT en **modo Desarrollo** → Meta solo envía webhooks a developers/testers de la app
- Se actualizó el token en Render y se hizo redeploy, pero los mensajes reales aún no disparan webhooks

---

## Estado actual

| Check | Estado |
|---|---|
| Servidor Render activo | ✅ |
| Webhook URL correcta en Meta | ✅ |
| Token nuevo en Render | ✅ (deployado) |
| App suscripta al WABA con campo `messages` | ✅ |
| Webhook POST procesa correctamente | ✅ |
| Envío directo con token nuevo | ✅ |
| Webhooks reales de Meta llegan a Render | ❌ pendiente confirmar |
| Token del servidor en runtime === token nuevo | ❓ pendiente verificar con `/diag` |

---

## Próximos pasos

1. Verificar token activo en runtime: `GET https://blak-360.onrender.com/diag`
2. Si el problema persiste → ir a **Meta Developers → CHATBOT → Roles de la app → Usuarios de prueba** y agregar la cuenta de Facebook vinculada al número +54 9 11 5229-1994
3. Alternativa: crear token de sistema permanente desde Business Manager → Usuarios del sistema (evita el vencimiento diario)
