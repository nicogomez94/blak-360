/**
 * Servidor principal para el chatbot de WhatsApp
 * Integra OpenAI, Express y PostgreSQL
 */

// Cargar variables de entorno (siempre .env.development)
require('dotenv').config({ path: '.env.development' });
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const openaiService = require('./services/openai');
const messageService = require('./services/messaging');
const conversationService = require('./services/conversation');

// Importar base de datos
const db = require('./config/database');
const { testConnection } = require('./config/database-init');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3001;

// Configurar WebSocket para tiempo real
io.on('connection', (socket) => {
  console.log('🔗 Cliente conectado al WebSocket:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
  
  // Enviar estado inicial de conversaciones
  socket.emit('conversations-update', {
    action: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Exportar io para usar en otros módulos
global.io = io;

// Middleware para parsear el body de las peticiones
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Rutas para el panel de administración (ANTES de los middlewares de captura)
app.use('/admin', adminRoutes);

// Rutas del webhook (mantener para compatibilidad)
app.use('/webhook', webhookRoutes);

// ⚠️ LOGGING SÚPER DETALLADO - Capturar CUALQUIER petición
app.use((req, res, next) => {
  console.log('\n🔴 ===== PETICIÓN RECIBIDA =====');
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 Método: ${req.method}`);
  console.log(`📍 URL: ${req.url}`);
  console.log(`🗂️ Path: ${req.path}`);
  console.log(`❓ Query: ${JSON.stringify(req.query)}`);
  console.log(`🔗 Original URL: ${req.originalUrl}`);
  console.log(`📋 User-Agent: ${req.get('User-Agent')}`);
  console.log(`🏠 Host: ${req.get('Host')}`);
  
  // console.log('\n📋 HEADERS COMPLETOS:');
  // Object.keys(req.headers).forEach(key => {
  //   console.log(`  ${key}: ${req.headers[key]}`);
  // });
  
  if (req.method === 'POST') {
    console.log('\n📦 BODY COMPLETO:');
    console.log('Tipo:', typeof req.body);
    console.log('Contenido:', JSON.stringify(req.body, null, 2));
    
    // También log del raw body si existe
    if (req.rawBody) {
      console.log('📦 RAW BODY:', req.rawBody.toString());
    }
  }
  
  console.log('🔴 ===== FIN PETICIÓN =====\n');
  next();
});

// ⚠️ Capturar ABSOLUTAMENTE CUALQUIER ruta con POST
app.use('*', (req, res, next) => {
  if (req.method === 'POST') {
    console.log(`\n🚨 POST DETECTADO EN: ${req.originalUrl}`);
    console.log(`📍 Path específico: ${req.path}`);
    console.log(`🔍 Params: ${JSON.stringify(req.params)}`);
  }
  next();
});

// Ruta para la raíz (formato estándar)
app.post('/', async (req, res) => {
  console.log('\n🏠 ===== WEBHOOK EN RUTA RAÍZ (/) =====');
  console.log('🎯 Procesando como formato estándar...');
  
  try {
    const { From, To, Body, MessageSid, ProfileName, WaId } = req.body;
    
    console.log('📱 INFORMACIÓN ESTÁNDAR:');
    console.log(`👤 De: ${From}`);
    console.log(`📞 Para: ${To}`);
    console.log(`💬 Mensaje: "${Body}"`);
    
    if (!Body || Body.trim() === '') {
      console.log('⚠️ Mensaje vacío, ignorando...');
      return res.status(200).send('OK');
    }

    const aiResponse = await openaiService.getResponse(Body, From);
    await messageService.sendMessage(From, aiResponse);
    
    console.log('✅ Mensaje procesado exitosamente (formato estándar)');
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error en ruta raíz:', error);
    res.status(200).send('Error procesado');
  }
});

// Capturar CUALQUIER POST que no haya sido manejado
app.post('*', (req, res) => {
  console.log('\n🔍 ===== POST NO MANEJADO =====');
  console.log(`📍 Ruta: ${req.path}`);
  console.log(`🌐 URL completa: ${req.originalUrl}`);
  console.log(`📦 Body: ${JSON.stringify(req.body, null, 2)}`);
  console.log('🔍 ===== FIN POST NO MANEJADO =====');
  
  res.status(200).send('OK - Post capturado');
});

// Ruta de health check con verificación de base de datos
app.get('/health', async (req, res) => {
  console.log('🏥 Health check solicitado');
  
  try {
    let databaseStatus = 'not_configured';
    let stats = null;
    
    if (db.isDatabaseConfigured) {
      const connectionTest = await db.testConnection();
      databaseStatus = connectionTest.connected ? 'connected' : 'disconnected';
    }
    
    // Obtener estadísticas (funciona con o sin DB)
    stats = await conversationService.getStats();
    
    res.json({
      status: 'OK',
      message: 'Servidor funcionando correctamente',
      timestamp: new Date().toISOString(),
      port: PORT,
      database: databaseStatus,
      storage: db.isDatabaseConfigured ? 'postgresql' : 'memory',
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        openai_configured: !!process.env.OPENAI_API_KEY,
        messaging_configured: !!process.env.DIALOG360_API_KEY,
        database_configured: db.isDatabaseConfigured
      },
      stats
    });
  } catch (error) {
    console.error('❌ Error en health check:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error en health check',
      error: error.message,
      database: 'error',
      storage: 'unknown'
    });
  }
});

// Ruta para información general
app.get('/', (req, res) => {
  console.log('📋 Información general solicitada');
  res.json({
    message: 'Chatbot de WhatsApp con OpenAI y PostgreSQL',
    version: '3.0.0',
    endpoints: {
      'webhook_whatsapp': 'POST /webhook/whatsapp',
      'webhook_standard': 'POST /',
      'dashboard': 'GET /admin/dashboard',
      'health': 'GET /health'
    },
    status: 'active'
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('❌ Error global capturado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: error.message
  });
});

// Inicializar base de datos y servidor
async function startServer() {
  try {
    console.log('\n🔗 Verificando configuración de PostgreSQL...');
    
    if (process.env.DATABASE_URL) {
      console.log('📊 PostgreSQL configurado, intentando conexión...');
      
      // Probar conexión
      const connected = await testConnection();
      
      if (connected) {
        console.log('✅ Conexión a PostgreSQL establecida exitosamente');
        console.log('✅ Base de datos conectada y lista para usar');
      } else {
        console.warn('⚠️ No se pudo conectar a PostgreSQL');
        console.warn('🔄 Continuando con almacenamiento en memoria...');
      }
    } else {
      console.log('📝 PostgreSQL no configurado, usando almacenamiento en memoria');
      console.log('💡 Para habilitar persistencia, configura DATABASE_URL en .env');
    }

    server.listen(PORT, () => {
      console.log('\n🚀 ==========================================');
      console.log(`🤖 Chatbot de WhatsApp iniciado`);
      console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
      console.log(`🔄 WebSocket: Activado para tiempo real`);
      console.log('🚀 ==========================================\n');

      // Verificar configuración
      const config = [];
      if (process.env.OPENAI_API_KEY) config.push('✅ OpenAI');
      if (process.env.DIALOG360_API_KEY) config.push('✅ Messaging API');
      if (db.isDatabaseConfigured) config.push('✅ PostgreSQL');
      
      console.log('📋 Configuración:', config.length > 0 ? config.join(', ') : 'Básica');
      
      if (!process.env.DIALOG360_API_KEY) {
        console.warn('⚠️ D360_API_KEY no configurada');
      }
      if (!db.isDatabaseConfigured) {
        console.warn('⚠️ DATABASE_URL no configurada (usando memoria)');
      }
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    console.error('Detalles:', error.message);
    
    // Intentar iniciar sin base de datos
    console.log('🔄 Intentando iniciar solo con memoria...');
    
    server.listen(PORT, () => {
      console.log('\n🚀 ==========================================');
      console.log(`🤖 Chatbot de WhatsApp iniciado (MODO MEMORIA)`);
      console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
      console.log(`📊 Dashboard Admin: http://localhost:${PORT}/admin/dashboard`);
      console.log(`🔄 WebSocket: Activado para tiempo real`);
      console.log('⚠️ IMPORTANTE: Los datos no persistirán al reiniciar');
      console.log('🚀 ==========================================\n');
    });
  }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});

// Cerrar conexiones al terminar
process.on('SIGTERM', async () => {
  console.log('🔄 Cerrando servidor...');
  await db.end();
  process.exit(0);
});

startServer();
