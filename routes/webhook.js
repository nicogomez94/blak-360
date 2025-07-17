/**
 * Rutas para manejar webhooks de WhatsApp desde Twilio
 */

const express = require('express');
const router = express.Router();
const openaiService = require('../services/openai');
const twilioService = require('../services/twilio');

/**
 * Webhook principal para recibir mensajes de WhatsApp
 * Twilio enviará un POST a esta ruta cuando llegue un mensaje
 */
router.post('/whatsapp', async (req, res) => {
  try {
    console.log('📨 Mensaje recibido de WhatsApp');
    
    // Extraer información del mensaje de Twilio
    const {
      From,           // Número del remitente (formato: whatsapp:+1234567890)
      To,             // Número receptor (tu número de Twilio)
      Body,           // Contenido del mensaje
      MessageSid,     // ID único del mensaje
      ProfileName     // Nombre del perfil del usuario (si está disponible)
    } = req.body;

    // Validar que el mensaje tenga contenido
    if (!Body || Body.trim() === '') {
      console.log('⚠️  Mensaje vacío recibido');
      return res.status(200).send('OK'); // Twilio espera 200 para confirmar recepción
    }

    // Log del mensaje recibido
    console.log(`👤 De: ${From} (${ProfileName || 'Sin nombre'})`);
    console.log(`💬 Mensaje: ${Body}`);
    console.log(`🆔 MessageSid: ${MessageSid}`);

    // Obtener respuesta de OpenAI
    console.log('🤖 Enviando mensaje a OpenAI...');
    const aiResponse = await openaiService.getResponse(Body, From);
    
    if (!aiResponse) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    console.log(`🤖 Respuesta de OpenAI: ${aiResponse}`);

    // Enviar respuesta via Twilio
    console.log('📤 Enviando respuesta por WhatsApp...');
    await twilioService.sendMessage(From, aiResponse);
    
    console.log('✅ Respuesta enviada exitosamente');

    // Responder a Twilio con 200 OK
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error procesando mensaje de WhatsApp:', error);
    
    // Intentar enviar mensaje de error al usuario
    try {
      const errorMessage = 'Lo siento, hubo un problema procesando tu mensaje. Por favor intenta de nuevo.';
      await twilioService.sendMessage(req.body.From, errorMessage);
    } catch (sendError) {
      console.error('❌ Error enviando mensaje de error:', sendError);
    }

    // Siempre responder 200 a Twilio para evitar reintentos
    res.status(200).send('Error procesado');
  }
});

/**
 * Endpoint para verificar el estado del webhook
 * Útil para debugging y monitoreo
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    webhook: '/webhook/whatsapp',
    message: 'Webhook de WhatsApp funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint para probar la integración manualmente
 * Útil para testing durante desarrollo
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
