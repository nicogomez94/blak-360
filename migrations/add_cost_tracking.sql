-- Migración para tracking de costos - VERSION LIMPIA

-- Eliminar objetos existentes en orden correcto
DROP TRIGGER IF EXISTS pricing_config_updated_at ON pricing_config;
DROP FUNCTION IF EXISTS update_pricing_config_updated_at();
DROP VIEW IF EXISTS cost_summary;
DROP TABLE IF EXISTS meta_costs CASCADE;
DROP TABLE IF EXISTS openai_costs CASCADE;
DROP TABLE IF EXISTS pricing_config CASCADE;

-- Tabla para precios de referencia
CREATE TABLE pricing_config (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    metric VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(10, 8) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(service, metric)
);

-- Insertar precios actualizados (Febrero 2026)
INSERT INTO pricing_config (service, metric, price_per_unit, notes) VALUES
('openai_gpt35', 'input_token_1k', 0.0005, 'GPT-3.5-turbo input tokens por cada 1000'),
('openai_gpt35', 'output_token_1k', 0.0015, 'GPT-3.5-turbo output tokens por cada 1000'),
('meta_whatsapp', 'conversation', 0.0085, 'Costo por conversación de WhatsApp (promedio)');

-- Tabla para tracking de costos de OpenAI
CREATE TABLE openai_costs (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    model VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    input_cost DECIMAL(10, 6) NOT NULL,
    output_cost DECIMAL(10, 6) NOT NULL,
    total_cost DECIMAL(10, 6) GENERATED ALWAYS AS (input_cost + output_cost) STORED,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para tracking de costos de Meta (WhatsApp)
CREATE TABLE meta_costs (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    message_id VARCHAR(255),
    conversation_category VARCHAR(50) DEFAULT 'service',
    cost DECIMAL(10, 6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_openai_costs_phone ON openai_costs(phone_number);
CREATE INDEX idx_openai_costs_created ON openai_costs(created_at);
CREATE INDEX idx_meta_costs_phone ON meta_costs(phone_number);
CREATE INDEX idx_meta_costs_created ON meta_costs(created_at);

-- Vista combinada de costos
CREATE VIEW cost_summary AS
SELECT 
    'openai' as service,
    phone_number,
    SUM(total_cost) as total_cost,
    COUNT(*) as transaction_count,
    DATE(created_at) as date
FROM openai_costs
GROUP BY phone_number, DATE(created_at)
UNION ALL
SELECT 
    'meta' as service,
    phone_number,
    SUM(cost) as total_cost,
    COUNT(*) as transaction_count,
    DATE(created_at) as date
FROM meta_costs
GROUP BY phone_number, DATE(created_at);

-- Trigger para actualizar updated_at en pricing_config
CREATE FUNCTION update_pricing_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pricing_config_updated_at
    BEFORE UPDATE ON pricing_config
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_config_updated_at();