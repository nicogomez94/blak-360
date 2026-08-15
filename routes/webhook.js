/**
 * Rutas para manejar webhooks de WhatsApp
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const openaiService = require('../services/openai');
const messageService = require('../services/messaging');
const conversationService = require('../services/conversation');
const { requireAuth } = require('../middleware/auth');
const { getChatbotSchedule, isChatbotActiveNow } = require('../services/chatbot-hours');

function verifyMetaSignature(req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const appSecret = process.env.META_APP_SECRET;
  const signature = req.get('x-hub-signature-256') || '';
  if (!appSecret || !signature.startsWith('sha256=') || !req.rawBody) {
    return res.sendStatus(401);
  }

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length
      || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return res.sendStatus(401);
  }

  next();
}

/**
 * Verificación de webhook para Cloud API de Meta
 * GET /webhook/whatsapp?hub.mode=subscribe&hub.challenge=CHALLENGE_SENT_BY_FACEBOOK&hub.verify_token=YOUR_VERIFY_TOKEN
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verificar que los parámetros están presentes
  if (mode && token) {
    // Verificar el token (debe coincidir con el configurado en tu app de Facebook)
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'blak_webhook_token';
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verificado exitosamente');
      res.status(200).send(challenge);
    } else {
      console.error('❌ Token de verificación incorrecto');
      res.sendStatus(403);
    }
  } else {
    console.error('❌ Parámetros de verificación faltantes');
    res.sendStatus(400);
  }
});

/**
 * Webhook principal para recibir mensajes de WhatsApp
 * El proveedor enviará un POST a esta ruta cuando llegue un mensaje
 */
router.post('/whatsapp', verifyMetaSignature, async (req, res) => {
  try {
    console.log('\n🚨 ===== WEBHOOK RECIBIDO =====');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('🌐 Método:', req.method);
    console.log('📍 URL:', req.url);
    
    // LOG COMPLETO del body para debugging
    // console.log('\n📦 ANÁLISIS COMPLETO DEL BODY:');
    // console.log('- Tipo:', typeof req.body);
    // console.log('- Es array?:', Array.isArray(req.body));
    // console.log('- Keys:', Object.keys(req.body || {}));
    // console.log('- Body completo:');
    // console.log(JSON.stringify(req.body, null, 2));
    
  // Responder inmediatamente para confirmar recepción (ACK) y continuar procesando de forma asíncrona
  // Importante: NO volver a usar "res" en este handler después de este punto
  res.status(200).end();
    
    // Procesar el mensaje de forma asíncrona
    const webhookData = req.body;
    
    if (!webhookData) {
      console.log('⚠️ Body vacío, ignorando webhook');
      return;
    }
    console.log('\n📦 BODY COMO STRING:');
    console.log(req.body.toString());
    
    // Verificar si hay query parameters
    console.log('\n📋 Query Parameters:');
    console.log(JSON.stringify(req.query, null, 2));
    
    // Log de todas las propiedades del body
    console.log('\n🔍 PROPIEDADES DEL BODY:');
    if (typeof req.body === 'object' && req.body !== null) {
      Object.keys(req.body).forEach(key => {
        console.log(`- ${key}:`, typeof req.body[key], req.body[key]);
      });
    }
    
    // Agregar múltiples verificaciones para diferentes formatos
    console.log('\n🔍 ANALIZANDO FORMATO DEL WEBHOOK:');
    
    // Formato 1: webhook con array de mensajes
    if (webhookData.messages) {
      console.log('✅ Formato detectado: Webhook con array de mensajes');
      console.log('📬 Cantidad de mensajes:', webhookData.messages.length);
    }
    
    // Formato 2: Un solo mensaje
    if (webhookData.message) {
      console.log('✅ Formato detectado: Webhook con mensaje único');
    }
    
    // Formato 3: Formato estándar (Body/From)
    if (webhookData.Body || webhookData.From) {
      console.log('✅ Formato detectado: Similar a estándar (Body/From)');
    }
    
    // Formato 4: Verificar entry (formato de Facebook/Meta)
    if (webhookData.entry) {
      console.log('✅ Formato detectado: Facebook/Meta Webhook (entry)');
    }
    
    // Verificar si es un mensaje entrante válido
    if (!webhookData.messages && !webhookData.message && !webhookData.Body && !webhookData.entry) {
  console.log('⚠️  Webhook recibido pero sin formato de mensaje reconocido');
  console.log('📋 Estructura completa para análisis:');
  console.log(JSON.stringify(webhookData, null, 2));
  // Ya se respondió al inicio, solo terminar
  return;
    }
    
    // Intentar extraer mensaje según diferentes formatos
    let messageText, fromNumber, messageId, messageType, contactName;
    
    // Formato estándar
    if (webhookData.messages && webhookData.messages.length > 0) {
      const message = webhookData.messages[0];
      const contact = webhookData.contacts?.[0];
      
      messageId = message.id;
      messageType = message.type;
      messageText = message.text?.body;
      fromNumber = message.from;
      contactName = contact?.profile?.name || 'Sin nombre';
      
      console.log('📱 Formato estándar detectado y procesado');
    }
    // Formato estándar
    else if (webhookData.Body && webhookData.From) {
      messageText = webhookData.Body;
      fromNumber = webhookData.From.replace('whatsapp:', '');
      messageId = webhookData.MessageSid || 'unknown';
      messageType = 'text';
      contactName = webhookData.ProfileName || 'Sin nombre';
      
      console.log('📱 Formato estándar detectado y procesado');
    }
    // Formato de Facebook/Meta webhook
    else if (webhookData.entry && webhookData.entry[0]?.changes) {
      const change = webhookData.entry[0].changes[0];
      
      // Verificar si es un status update (delivered, read, sent) y no un mensaje
      if (change.value?.statuses && !change.value?.messages) {
        console.log('📋 Status update recibido (delivered/read/sent) - Ignorando');
        // Ya se respondió al inicio, solo terminar
        return;
      }
      
      if (change.value?.messages && change.value.messages[0]) {
        const message = change.value.messages[0];
        messageText = message.text?.body;
        fromNumber = message.from;
        messageId = message.id;
        messageType = message.type;
        contactName = change.value.contacts?.[0]?.profile?.name || 'Sin nombre';
        
        console.log('📱 Formato Facebook/Meta webhook detectado y procesado');
      }
    }
    
    // ===== LOG: Datos extraídos del mensaje =====
    console.log('\n📝 DATOS EXTRAÍDOS DEL MENSAJE:');
    console.log(`👤 De: ${fromNumber}`);
    console.log(`👥 Nombre: ${contactName}`);
    console.log(`🆔 MessageId: ${messageId}`);
    console.log(`📋 Tipo: ${messageType}`);
    console.log(`💬 Contenido: "${messageText}"`);

    // Solo procesar mensajes de texto
    if (messageType !== 'text' || !messageText || messageText.trim() === '') {
      console.log('⚠️  Mensaje no es de texto o está vacío, ignorando...');
      // Ya se respondió al inicio
      return;
    }

    // Verificar que tengamos los datos mínimos necesarios
    if (!fromNumber) {
      console.log('⚠️  No se pudo extraer número de teléfono, ignorando...');
      // Ya se respondió al inicio
      return;
    }

    if (!(await isChatbotActiveNow())) {
      const schedule = await getChatbotSchedule();
      console.log(`⏸️ Chatbot automático pausado fuera de horario (${schedule.activeFrom}:00–${schedule.activeUntil}:00, ${schedule.timezone}) o por configuración`);
      return;
    }

    // ===== GESTIÓN DE CONVERSACIONES =====
    console.log('\n🎯 ===== GESTIÓN DE CONVERSACIÓN =====');
    
    // Registrar mensaje del usuario
    await conversationService.addMessage(fromNumber, messageText.trim(), 'user', contactName);
    
    // Verificar si la conversación está en modo manual
    const isManual = await conversationService.isManualMode(fromNumber);
    
    if (isManual) {
      console.log('🔧 Conversación en modo MANUAL - No procesando con IA');
      console.log(`👤 Usuario: ${contactName} (${fromNumber})`);
      console.log(`💬 Mensaje: "${messageText.trim()}"`);
      console.log('⏳ Esperando intervención manual del administrador...');
      
      // En modo manual NO se envía ningún mensaje automático
      // El administrador debe responder manualmente desde el dashboard
      console.log('🤫 No se enviará respuesta automática - Modo manual activo');
      return;
    }
    
    console.log('🤖 Conversación en modo AUTOMÁTICO - Procesando con IA');

    // ===== LOG: Texto que se enviará a OpenAI =====
    console.log('\n🤖 ===== ENVIANDO A OPENAI =====');
    console.log(`📝 Texto a procesar: "${messageText.trim()}"`);
    console.log(`👤 Usuario ID: whatsapp:+${fromNumber}`);
    console.log('⏳ Esperando respuesta de OpenAI...');
    
    const aiResponse = await openaiService.getResponse(messageText.trim(), `whatsapp:+${fromNumber}`);
    
    if (!aiResponse) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    // ===== LOG: Respuesta recibida de OpenAI =====
    console.log('\n✅ ===== RESPUESTA DE OPENAI =====');
    console.log(`🤖 Respuesta completa: "${aiResponse}"`);
    console.log(`📏 Longitud: ${aiResponse.length} caracteres`);

    console.log('📤 ===== ENVIANDO RESPUESTA POR WHATSAPP =====');
    console.log(`📱 Destinatario: whatsapp:+${fromNumber}`);
    console.log(`💬 Mensaje final: "${aiResponse}"`);
    console.log('⏳ Enviando mensaje...');
    
    const result = await messageService.sendMessage(`whatsapp:+${fromNumber}`, aiResponse);
    
    // Registrar respuesta de la IA
    await conversationService.addMessage(fromNumber, aiResponse, 'ai', contactName);
    
    // ===== LOG: Resultado del envío =====
    console.log('\n✅ ===== RESULTADO DEL ENVÍO =====');
    console.log('📤 Mensaje enviado exitosamente a WhatsApp');
    console.log('🆔 Result:', JSON.stringify(result, null, 2));
    console.log('🏁 ===== FIN PROCESAMIENTO EXITOSO =====\n');

  // Ya se respondió con ACK al inicio

  } catch (error) {
    console.error('\n❌ ===== ERROR EN WEBHOOK =====');
    console.error('🔴 Error completo:', error);
    console.error('📋 Stack trace:', error.stack);
    console.error('❌ ===== FIN ERROR =====\n');
    
    // Intentar enviar mensaje de error al usuario
    try {
      if (req.body.From || req.body.messages?.[0]?.from) {
        const errorMessage = 'Lo siento, hubo un problema procesando tu mensaje. Por favor intenta de nuevo.';
        const phoneNumber = req.body.From || `whatsapp:+${req.body.messages[0].from}`;
        await messageService.sendMessage(phoneNumber, errorMessage);
      }
    } catch (sendError) {
      console.error('❌ Error enviando mensaje de error:', sendError);
    }

  // Ya se respondió con ACK al inicio; no enviar otra respuesta
  }
});

/**
 * Endpoint adicional para capturar CUALQUIER POST que llegue al webhook
 * Útil para debugging
 */
router.post('*', (req, res) => {
  console.log('\n🚨 ===== POST RECIBIDO EN RUTA NO ESPECÍFICA =====');
  console.log('🌐 Ruta:', req.path);
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🚨 ===== FIN POST NO ESPECÍFICO =====\n');
  
  res.status(200).send('OK - Webhook genérico');
});

/**
 * Endpoint para verificar el estado del webhook
 */
router.get('/status', (req, res) => {
  console.log('🏥 Status check solicitado');
  res.json({
    status: 'active',
    webhook: '/webhook/whatsapp',
    message: 'Webhook de WhatsApp funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint para probar la integración manualmente
 */
router.post('/test', requireAuth, async (req, res) => {
  try {
    const { message, phone } = req.body;
    
    if (!message || !phone) {
      return res.status(400).json({
        error: 'Se requieren los campos: message, phone'
      });
    }

    console.log('🧪 Test manual del chatbot');
    console.log(`📱 Teléfono: ${phone}`);
    console.log(`💬 Mensaje: ${message}`);

    // Obtener respuesta de OpenAI
    const aiResponse = await openaiService.getResponse(message, phone);
    
    // Enviar por WhatsApp
    await messageService.sendMessage(phone, aiResponse);

    res.json({
      success: true,
      message: 'Mensaje de prueba enviado exitosamente',
      aiResponse
    });

  } catch (error) {
    console.error('❌ Error en test manual:', error);
    res.status(500).json({
      error: 'Error procesando mensaje de prueba',
      details: error.message
    });
  }
});

module.exports = router;
