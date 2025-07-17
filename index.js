/**
 * WhatsApp Chatbot Backend con Twilio y OpenAI
 * 
 * Instrucciones de configuración:
 * 1. Copiar .env.example a .env y completar con tus credenciales
 * 2. Ejecutar: npm install
 * 3. Para desarrollo: npm run dev
 * 4. Para producción: npm start
 * 
 * Configuración de Twilio Webhook:
 * - URL del webhook: http://tu-dominio.com/webhook/whatsapp
 * - Método: POST
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

// Importar rutas
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  if (process.env.DEBUG === 'true') {
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
  }
  next();
});

// Rutas
app.use('/webhook', webhookRoutes);

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'WhatsApp Chatbot Backend está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Chatbot Backend con Twilio y OpenAI',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      webhook: '/webhook/whatsapp'
    }
  });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  
  // Verificar variables de entorno
  const requiredEnvVars = ['OPENAI_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Variables de entorno faltantes:', missingVars.join(', '));
    console.warn('📝 Asegúrate de configurar el archivo .env correctamente');
  } else {
    console.log('✅ Todas las variables de entorno están configuradas');
  }
});

// Manejo elegante de cierre
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});
