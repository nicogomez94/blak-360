/**
 * Configuración de la base de datos PostgreSQL
 */

const { Pool } = require('pg');

// Verificar si está configurada la base de datos
const isDatabaseConfigured = !!(
  process.env.DATABASE_URL || 
  (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME)
);

console.log(`🔍 Base de datos configurada: ${isDatabaseConfigured}`);

// Configuración de la conexión a PostgreSQL (solo si está configurada)
let pool = null;

if (isDatabaseConfigured) {
  const config = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  } : {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'whatsapp_bot',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  };

  pool = new Pool({
    ...config,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Evento para manejar errores de conexión
  pool.on('error', (err, client) => {
    console.error('❌ Error en el pool de conexiones de PostgreSQL:', err);
  });
}

// Función para probar la conexión
async function testConnection() {
  if (!isDatabaseConfigured) {
    return { connected: false, reason: 'not_configured' };
  }

  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida exitosamente');
    client.release();
    return { connected: true };
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return { connected: false, reason: error.message };
  }
}

// Función para inicializar las tablas
async function initializeTables() {
  if (!isDatabaseConfigured) {
    console.log('⚠️ Base de datos no configurada, omitiendo inicialización de tablas');
    return;
  }

  try {
    const client = await pool.connect();
    
    // Crear tabla de conversaciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
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
    `);

    // Crear tabla de mensajes
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        message_text TEXT NOT NULL,
        sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai', 'admin')),
        message_id VARCHAR(255),
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Crear índices para mejorar performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
      CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity);
      CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone_number);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);

    console.log('✅ Tablas de base de datos inicializadas correctamente');
    client.release();
  } catch (error) {
    console.error('❌ Error inicializando tablas:', error);
    throw error;
  }
}

// Función para ejecutar consultas
async function query(text, params) {
  if (!isDatabaseConfigured) {
    console.warn('⚠️ Base de datos no configurada, usando fallback');
    throw new Error('DATABASE_NOT_CONFIGURED');
  }

  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Función para cerrar el pool
async function end() {
  if (pool) {
    await pool.end();
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  initializeTables,
  initializeSchema: initializeTables, // Alias para compatibilidad
  end,
  isDatabaseConfigured
};
