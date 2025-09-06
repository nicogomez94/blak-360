/**
 * Servidor principal para el chatbot de WhatsApp
 * Integra 360dialog, OpenAI y Express
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const webhookRoutes = require('./routes/webhook');
const openaiService = require('./services/openai');
const twilioService = require('./services/twilio');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para parsear el body de las peticiones
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
  
  console.log('\n📋 HEADERS COMPLETOS:');
  Object.keys(req.headers).forEach(key => {
    console.log(`  ${key}: ${req.headers[key]}`);
  });
  
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

// Ruta para la raíz (formato Twilio)
app.post('/', async (req, res) => {
  console.log('\n🏠 ===== WEBHOOK EN RUTA RAÍZ (/) =====');
  console.log('🎯 Procesando como formato Twilio...');
  
  try {
    const { From, To, Body, MessageSid, ProfileName, WaId } = req.body;
    
    console.log('📱 INFORMACIÓN TWILIO:');
    console.log(`👤 De: ${From}`);
    console.log(`📞 Para: ${To}`);
    console.log(`💬 Mensaje: "${Body}"`);
    
    if (!Body || Body.trim() === '') {
      console.log('⚠️ Mensaje vacío, ignorando...');
      return res.status(200).send('OK');
    }

    const aiResponse = await openaiService.getResponse(Body, From);
    await twilioService.sendMessage(From, aiResponse);
    
    console.log('✅ Mensaje procesado exitosamente (Twilio format)');
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error en ruta raíz:', error);
    res.status(200).send('Error procesado');
  }
});

// Ruta específica para 360dialog
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('\n📱 ===== WEBHOOK 360DIALOG (/webhook/whatsapp) =====');
  console.log('🎯 Procesando como formato 360dialog...');
  
  try {
    const webhookData = req.body;
    
    console.log('📦 Datos 360dialog completos:', JSON.stringify(webhookData, null, 2));
    
    // Intentar extraer mensaje según formato 360dialog
    let messageText, fromNumber, messageId;
    
    // Formato 1: webhookData.messages (array)
    if (webhookData.messages && webhookData.messages.length > 0) {
      const message = webhookData.messages[0];
      messageText = message.text?.body;
      fromNumber = message.from;
      messageId = message.id;
      console.log('✅ Formato messages[] detectado');
    }
    // Formato 2: webhookData.message (objeto único)
    else if (webhookData.message) {
      messageText = webhookData.message.text?.body;
      fromNumber = webhookData.message.from;
      messageId = webhookData.message.id;
      console.log('✅ Formato message único detectado');
    }
    // Formato 3: Webhook de Facebook/Meta
    else if (webhookData.entry) {
      const change = webhookData.entry[0]?.changes?.[0];
      if (change?.value?.messages?.[0]) {
        const message = change.value.messages[0];
        messageText = message.text?.body;
        fromNumber = message.from;
        messageId = message.id;
        console.log('✅ Formato Facebook/Meta detectado');
      }
    }
    
    console.log('📝 DATOS EXTRAÍDOS:');
    console.log(`👤 De: ${fromNumber}`);
    console.log(`🆔 MessageId: ${messageId}`);
    console.log(`💬 Texto: "${messageText}"`);
    
    if (!messageText || messageText.trim() === '') {
      console.log('⚠️ Sin texto de mensaje, ignorando...');
      return res.status(200).send('OK');
    }

    const aiResponse = await openaiService.getResponse(messageText.trim(), `whatsapp:+${fromNumber}`);
    await twilioService.sendMessage(`whatsapp:+${fromNumber}`, aiResponse);
    
    console.log('✅ Mensaje procesado exitosamente (360dialog format)');
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error en webhook 360dialog:', error);
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

// Rutas del webhook (mantener para compatibilidad)
app.use('/webhook', webhookRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  console.log('🏥 Health check solicitado');
  res.json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      openai_configured: !!process.env.OPENAI_API_KEY,
      d360_configured: !!process.env.D360_API_KEY
    }
  });
});

// Ruta para información general
app.get('/', (req, res) => {
  console.log('📋 Información general solicitada');
  res.json({
    message: 'Chatbot de WhatsApp con OpenAI y 360dialog',
    version: '2.0.0',
    endpoints: {
      'webhook_360dialog': 'POST /webhook/whatsapp',
      'webhook_twilio': 'POST /',
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n🚀 ==========================================');
  console.log(`🤖 Chatbot de WhatsApp iniciado`);
  console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Webhook 360dialog: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`📡 Webhook Twilio: http://localhost:${PORT}/`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('🚀 ==========================================\n');

  // Verificar configuración
  const config = [];
  if (process.env.OPENAI_API_KEY) config.push('✅ OpenAI');
  if (process.env.D360_API_KEY) config.push('✅ 360dialog');
  
  console.log('📋 Configuración:', config.join(', '));
  
  if (!process.env.D360_API_KEY) {
    console.warn('⚠️ D360_API_KEY no configurada');
  }
});
