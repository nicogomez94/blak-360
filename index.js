/**
 * Servidor principal para el chatbot de WhatsApp
 * Integra Twilio, OpenAI y Express
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const webhookRoutes = require('./routes/webhook');
const openaiService = require('./services/openai');
const twilioService = require('./services/twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear el body de las peticiones
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Middleware para logging detallado de todas las peticiones
app.use((req, res, next) => {
  console.log(`\n🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  if (req.method === 'POST') {
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  
  next();
});

// ⚠️ RUTA TEMPORAL: Capturar mensajes de Twilio que llegan a la raíz
app.post('/', async (req, res) => {
  try {
    console.log('\n🚨 WEBHOOK EN RUTA RAÍZ - Procesando mensaje de WhatsApp...');
    
    // Log completo del body recibido de Twilio
    console.log('📨 Datos completos recibidos de Twilio:');
    console.log(JSON.stringify(req.body, null, 2));

    // Extraer información del mensaje de Twilio
    const {
      From,           // Número del remitente (formato: whatsapp:+1234567890)
      To,             // Número receptor (tu número de Twilio)
      Body,           // Contenido del mensaje
      MessageSid,     // ID único del mensaje
      ProfileName,    // Nombre del perfil del usuario
      WaId           // WhatsApp ID del usuario
    } = req.body;

    // Log detallado del mensaje recibido
    console.log('\n📱 INFORMACIÓN DEL MENSAJE:');
    console.log(`👤 De: ${From}`);
    console.log(`📞 Para: ${To}`);
    console.log(`👨‍💼 Nombre: ${ProfileName || 'Sin nombre'}`);
    console.log(`🆔 WhatsApp ID: ${WaId || 'No disponible'}`);
    console.log(`💬 Mensaje: "${Body}"`);
    console.log(`🔗 MessageSid: ${MessageSid}`);

    // Validar que el mensaje tenga contenido
    if (!Body || Body.trim() === '') {
      console.log('⚠️  Mensaje vacío recibido, ignorando...');
      return res.status(200).send('OK');
    }

    // Log: enviando a OpenAI
    console.log('\n🤖 ENVIANDO A OPENAI:');
    console.log(`📝 Texto para OpenAI: "${Body}"`);
    console.log(`👤 Usuario: ${From}`);
    
    // Obtener respuesta de OpenAI
    const aiResponse = await openaiService.getResponse(Body, From);
    
    if (!aiResponse) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    // Log: respuesta de OpenAI
    console.log('\n🧠 RESPUESTA DE OPENAI:');
    console.log(`💭 Respuesta: "${aiResponse}"`);
    console.log(`📏 Longitud: ${aiResponse.length} caracteres`);

    // Log: enviando por WhatsApp
    console.log('\n📤 ENVIANDO POR WHATSAPP:');
    console.log(`📱 Destinatario: ${From}`);
    console.log(`💬 Mensaje a enviar: "${aiResponse}"`);
    
    // Enviar respuesta via Twilio
    const sendResult = await twilioService.sendMessage(From, aiResponse);
    
    // Log: resultado del envío
    console.log('\n✅ RESULTADO DEL ENVÍO:');
    console.log('📊 Resultado:', JSON.stringify(sendResult, null, 2));
    
    console.log('\n🎉 FLUJO COMPLETADO EXITOSAMENTE');

    // Responder a Twilio con 200 OK
    res.status(200).send('OK');

  } catch (error) {
    console.error('\n❌ ERROR EN EL FLUJO PRINCIPAL:');
    console.error('🔴 Error completo:', error);
    console.error('📋 Stack trace:', error.stack);
    
    // Intentar enviar mensaje de error al usuario
    try {
      console.log('\n🩹 Intentando enviar mensaje de error al usuario...');
      const errorMessage = 'Lo siento, hubo un problema procesando tu mensaje. Por favor intenta de nuevo en unos momentos.';
      await twilioService.sendMessage(req.body.From, errorMessage);
      console.log('✅ Mensaje de error enviado al usuario');
    } catch (sendError) {
      console.error('❌ Error enviando mensaje de error al usuario:', sendError);
    }

    // Siempre responder 200 a Twilio para evitar reintentos
    res.status(200).send('Error procesado');
  }
});

// Rutas del webhook (mantener para referencia futura)
app.use('/webhook', webhookRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  console.log('🏥 Health check solicitado');
  
  res.json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: PORT,
      openai_configured: !!process.env.OPENAI_API_KEY,
      twilio_configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    }
  });
});

// Ruta para información general
app.get('/', (req, res) => {
  res.json({
    message: 'Chatbot de WhatsApp con OpenAI',
    version: '1.0.0',
    endpoints: {
      webhook: 'POST /',
      health: 'GET /health',
      test: 'POST /webhook/test'
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
  console.log('\n🚀 ========================================');
  console.log(`🤖 Chatbot de WhatsApp iniciado`);
  console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('🚀 ========================================\n');

  // Verificar configuración de variables de entorno
  const missingVars = [];
  if (!process.env.OPENAI_API_KEY) missingVars.push('OPENAI_API_KEY');
  if (!process.env.TWILIO_ACCOUNT_SID) missingVars.push('TWILIO_ACCOUNT_SID');
  if (!process.env.TWILIO_AUTH_TOKEN) missingVars.push('TWILIO_AUTH_TOKEN');
  if (!process.env.TWILIO_PHONE_NUMBER) missingVars.push('TWILIO_PHONE_NUMBER');

  if (missingVars.length > 0) {
    console.warn('⚠️  Variables de entorno faltantes:', missingVars);
  } else {
    console.log('✅ Todas las variables de entorno están configuradas');
    console.log('💰 Nota: Verifica que tengas créditos en OpenAI: https://platform.openai.com/account/billing');
  }
});
