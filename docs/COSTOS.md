# Costos y panel de monitoreo

El chatbot guarda métricas de OpenAI y Meta en el esquema aislado
`blak_chatbot`. El panel está disponible en `/panel`.

El script `npm run db:bootstrap` es idempotente: crea las tablas e índices
necesarios sin modificar el esquema `public` que usa reservas y booking.

Las tablas principales son:

- `conversations`
- `messages`
- `openai_costs`
- `meta_costs`
- `pricing_config`
