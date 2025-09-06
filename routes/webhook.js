/**
 * Rutas para manejar webhooks de WhatsApp desde 360dialog
 */

const express = require('express');
const router = express.Router();
const openaiService = require('../services/openai');
const twilioService = require('../services/twilio'); // Ahora es 360dialog service

/**
 * Webhook principal para recibir mensajes de WhatsApp
 * 360dialog enviará un POST a esta ruta cuando llegue un mensaje
 */
router.post('/whatsapp', async (req, res) => {
  try {
    console.log('\n🚨 ===== WEBHOOK 360DIALOG RECIBIDO =====');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('🌐 Método:', req.method);
    console.log('📍 URL:', req.url);
    
    // LOG COMPLETO del body para debugging
    console.log('\n📦 ANÁLISIS COMPLETO DEL BODY:');
    console.log('- Tipo:', typeof req.body);
    console.log('- Es array?:', Array.isArray(req.body));
    console.log('- Keys:', Object.keys(req.body || {}));
    console.log('- Body completo:');
    console.log(JSON.stringify(req.body, null, 2));
    
    // Responder inmediatamente a 360dialog para confirmar recepción
    res.status(200).send('OK');
    
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
    
    // Formato 1: Webhook directo de 360dialog
    if (webhookData.messages) {
      console.log('✅ Formato detectado: Webhook con array de mensajes');
      console.log('📬 Cantidad de mensajes:', webhookData.messages.length);
    }
    
    // Formato 2: Un solo mensaje
    if (webhookData.message) {
      console.log('✅ Formato detectado: Webhook con mensaje único');
    }
    
    // Formato 3: Formato similar a Twilio
    if (webhookData.Body || webhookData.From) {
      console.log('✅ Formato detectado: Similar a Twilio (Body/From)');
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
      return res.status(200).send('OK - Sin mensajes');
    }
    
    // Intentar extraer mensaje según diferentes formatos
    let messageText, fromNumber, messageId, messageType, contactName;
    
    // Formato 360dialog estándar
    if (webhookData.messages && webhookData.messages.length > 0) {
      const message = webhookData.messages[0];
      const contact = webhookData.contacts?.[0];
      
      messageId = message.id;
      messageType = message.type;
      messageText = message.text?.body;
      fromNumber = message.from;
      contactName = contact?.profile?.name || 'Sin nombre';
      
      console.log('📱 Formato 360dialog detectado y procesado');
    }
    // Formato Twilio-like
    else if (webhookData.Body && webhookData.From) {
      messageText = webhookData.Body;
      fromNumber = webhookData.From.replace('whatsapp:', '');
      messageId = webhookData.MessageSid || 'unknown';
      messageType = 'text';
      contactName = webhookData.ProfileName || 'Sin nombre';
      
      console.log('📱 Formato Twilio-like detectado y procesado');
    }
    // Formato de Facebook/Meta webhook
    else if (webhookData.entry && webhookData.entry[0]?.changes) {
      const change = webhookData.entry[0].changes[0];
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
      return res.status(200).send('OK');
    }

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

    // ===== LOG: Enviando respuesta por WhatsApp =====
    console.log('\n📤 ===== ENVIANDO RESPUESTA POR WHATSAPP =====');
    console.log(`📱 Destinatario: whatsapp:+${fromNumber}`);
    console.log(`💬 Mensaje final: "${aiResponse}"`);
    console.log('⏳ Enviando via 360dialog...');
    
    const result360 = await twilioService.sendMessage(`whatsapp:+${fromNumber}`, aiResponse);
    
    // ===== LOG: Resultado del envío =====
    console.log('\n✅ ===== RESULTADO DEL ENVÍO =====');
    console.log('📤 Mensaje enviado exitosamente a WhatsApp via 360dialog');
    console.log('🆔 360dialog Result:', JSON.stringify(result360, null, 2));
    console.log('🏁 ===== FIN PROCESAMIENTO EXITOSO =====\n');

    // Responder a 360dialog con 200 OK
    res.status(200).send('OK');

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
        await twilioService.sendMessage(phoneNumber, errorMessage);
      }
    } catch (sendError) {
      console.error('❌ Error enviando mensaje de error:', sendError);
    }

    // Siempre responder 200 para evitar reintentos
    res.status(200).send('Error procesado');
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
router.post('/test', async (req, res) => {
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
    await twilioService.sendMessage(phone, aiResponse);

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
