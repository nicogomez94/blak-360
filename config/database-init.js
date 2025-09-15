const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Inicializar base de datos con migración automática
 * Se ejecuta automáticamente al iniciar la aplicación
 */
async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', 'init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Ejecutar migración
    await pool.query(migrationSQL);
    
    console.log('✅ Base de datos inicializada correctamente');
    console.log('📊 Tablas creadas: conversations, messages');
    
    // Verificar que las tablas existen
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'messages')
    `);
    
    console.log('🔍 Tablas encontradas:', result.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Verificar conexión a la base de datos
 */
async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conexión a PostgreSQL exitosa');
    console.log('🕐 Tiempo del servidor:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

module.exports = {
  initializeDatabase,
  testConnection
};
