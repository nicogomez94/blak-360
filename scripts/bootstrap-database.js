const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL es requerida para inicializar el esquema del chatbot.');
  process.exit(1);
}

const needsSSL = connectionString.includes('.render.com')
  || connectionString.includes('oregon-postgres')
  || connectionString.includes('sslmode=require');

const client = new Client({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false
});

const statements = `
  CREATE SCHEMA IF NOT EXISTS blak_twilio;

  CREATE OR REPLACE FUNCTION blak_twilio.update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TABLE IF NOT EXISTS blak_twilio.conversations (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    contact_name VARCHAR(255) DEFAULT 'Sin nombre',
    is_manual_mode BOOLEAN DEFAULT false,
    assigned_admin VARCHAR(255),
    manual_mode_started TIMESTAMP,
    manual_mode_ended TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS blak_twilio.messages (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai', 'admin')),
    message_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS blak_twilio.pricing_config (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    metric VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(10, 8) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    UNIQUE(service, metric)
  );

  CREATE TABLE IF NOT EXISTS blak_twilio.openai_costs (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message_id INTEGER REFERENCES blak_twilio.messages(id) ON DELETE CASCADE,
    model VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    input_cost DECIMAL(10, 6) NOT NULL,
    output_cost DECIMAL(10, 6) NOT NULL,
    total_cost DECIMAL(10, 6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS blak_twilio.meta_costs (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    conversation_id INTEGER REFERENCES blak_twilio.conversations(id) ON DELETE CASCADE,
    message_id VARCHAR(255),
    conversation_category VARCHAR(50) DEFAULT 'service',
    cost DECIMAL(10, 6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_phone
    ON blak_twilio.conversations(phone_number);
  CREATE INDEX IF NOT EXISTS idx_conversations_last_activity
    ON blak_twilio.conversations(last_activity);
  CREATE INDEX IF NOT EXISTS idx_messages_phone
    ON blak_twilio.messages(phone_number);
  CREATE INDEX IF NOT EXISTS idx_messages_timestamp
    ON blak_twilio.messages(timestamp);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_message_id
    ON blak_twilio.messages(message_id) WHERE message_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_openai_costs_phone
    ON blak_twilio.openai_costs(phone_number);
  CREATE INDEX IF NOT EXISTS idx_openai_costs_created
    ON blak_twilio.openai_costs(created_at);
  CREATE INDEX IF NOT EXISTS idx_meta_costs_phone
    ON blak_twilio.meta_costs(phone_number);
  CREATE INDEX IF NOT EXISTS idx_meta_costs_created
    ON blak_twilio.meta_costs(created_at);

  DROP TRIGGER IF EXISTS update_conversations_updated_at ON blak_twilio.conversations;
  CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON blak_twilio.conversations
    FOR EACH ROW EXECUTE FUNCTION blak_twilio.update_updated_at_column();

  INSERT INTO blak_twilio.pricing_config (service, metric, price_per_unit, notes)
  VALUES
    ('openai_gpt35', 'input_token_1k', 0.0005, 'Valor de referencia configurable'),
    ('openai_gpt35', 'output_token_1k', 0.0015, 'Valor de referencia configurable'),
    ('meta_whatsapp', 'conversation', 0.0085, 'Valor de referencia configurable')
  ON CONFLICT (service, metric) DO NOTHING;
`;

async function bootstrap() {
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('blak_twilio_bootstrap'))");
    await client.query(statements);
    await client.query('COMMIT');
    console.log('Esquema aislado blak_twilio listo. No se modificaron objetos de public.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

bootstrap().catch((error) => {
  console.error('No se pudo inicializar el esquema aislado:', error.message);
  process.exit(1);
});
