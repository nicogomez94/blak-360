const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');


// La lógica de inicialización automática de la base de datos ha sido eliminada.
// Ejecuta las migraciones manualmente cuando sea necesario.

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
