# Migracion a base compartida (Render)

Este proyecto puede quedar aislado en la misma base usando un schema propio: `blak_twilio`.

## 1) Crear schema aislado

```bash
PGPASSWORD=5qKWDSyE5T9svRX1BwlRUabLM7IcU5L9 \
psql -h dpg-d6sqp1ia214c73c704qg-a.oregon-postgres.render.com -U basefree_user -d basefree \
  -c "CREATE SCHEMA IF NOT EXISTS blak_twilio AUTHORIZATION basefree_user;"
```

## 2) Configurar DATABASE_URL para Prisma + consultas SQL sin prefijos

```env
DATABASE_URL=postgresql://basefree_user:5qKWDSyE5T9svRX1BwlRUabLM7IcU5L9@dpg-d6sqp1ia214c73c704qg-a.oregon-postgres.render.com/basefree?sslmode=require&schema=blak_twilio&options=-c%20search_path%3Dblak_twilio%2Cpublic
```

- `schema=blak_twilio`: Prisma crea/lee tablas en ese schema.
- `search_path=blak_twilio,public`: tus queries SQL actuales (`SELECT * FROM conversations`) siguen funcionando sin tocar nombres.

## 3) Aplicar schema Prisma

```bash
npx prisma@6.7.0 db push
```

## 4) Seed inicial de precios

```sql
INSERT INTO pricing_config (service, metric, price_per_unit, currency, notes)
VALUES
  ('openai_gpt35', 'input_token_1k', 0.0005, 'USD', 'GPT-3.5-turbo input tokens por cada 1000'),
  ('openai_gpt35', 'output_token_1k', 0.0015, 'USD', 'GPT-3.5-turbo output tokens por cada 1000'),
  ('meta_whatsapp', 'conversation', 0.0085, 'USD', 'Costo por conversacion de WhatsApp (promedio)')
ON CONFLICT (service, metric) DO UPDATE
SET
  price_per_unit = EXCLUDED.price_per_unit,
  currency = EXCLUDED.currency,
  notes = EXCLUDED.notes,
  updated_at = NOW();
```
