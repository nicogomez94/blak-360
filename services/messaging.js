/**
 * Servicio para interactuar con WhatsApp Cloud API de Meta
 * Maneja el envío de mensajes de WhatsApp
 */

const axios = require('axios');
const db = require('../config/database');

// Configuración de WhatsApp Cloud API
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const META_API_URL = 'https://graph.facebook.com/v18.0';

// Detectar entorno
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.SANDBOX_MODE === 'true';
const SANDBOX_PHONE = process.env.SANDBOX_PHONE_NUMBER;

// Verificar configuración
if (META_ACCESS_TOKEN && PHONE_NUMBER_ID) {
  console.log(`✅ WhatsApp Cloud API configurada (Entorno: ${isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN'})`);
  if (isDevelopment && SANDBOX_PHONE) {
    console.log(`🧪 Sandbox activo - Número de prueba: ${SANDBOX_PHONE}`);
  }
} else {
  console.warn('⚠️  META_ACCESS_TOKEN o PHONE_NUMBER_ID no configurados. Configura las variables de entorno para Cloud API');
}

/**
 * Enviar mensaje de WhatsApp usando Cloud API de Meta
 * @param {string} to - Número de destino (formato: whatsapp:+5491137947206)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<object>} - Resultado del envío
 */
async function sendMessage(to, message) {
  try {
    console.log('📤 Enviando mensaje via WhatsApp Cloud API...');

    if (!to || !message) {
      throw new Error('Faltan parámetros: to y message son requeridos');
    }
    if (!META_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      throw new Error('META_ACCESS_TOKEN o PHONE_NUMBER_ID no configurados');
    }

    // Formatear número: usar formato internacional sin + (estándar Cloud API)
    let phoneNumber = to.replace('whatsapp:', '').replace('+', '');

    // Corregir formato para Argentina: eliminar el 9 después del 54 si existe (Meta espera 5411...)
    if (phoneNumber.startsWith('549') && phoneNumber.length > 11) {
      phoneNumber = '54' + phoneNumber.slice(3);
    }

    console.log(`📱 Enviando a: ${phoneNumber}`);
    console.log(`📱 Formato original: ${to}`);

    if (message.length > 4096) {
      console.warn('⚠️ Mensaje muy largo, recortando...');
      message = message.substring(0, 4093) + '...';
    }

    // Payload para Cloud API
    const payload = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: {
        body: message
      }
    };

    console.log('💬 Mensaje:', `"${message}"`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const apiUrl = `${META_API_URL}/${PHONE_NUMBER_ID}/messages`;
    console.log('🌐 URL completa:', apiUrl);
    
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 15000, // 15 segundos de timeout
      validateStatus: function (status) {
        return status < 500; // Acepta cualquier status < 500 para debugging
      }
    });

    console.log(`📊 Status: ${response.status}`);
    console.log('📨 Respuesta:', JSON.stringify(response.data, null, 2));
    console.log('✅ Mensaje enviado exitosamente');

    // Registrar costo de Meta en la base de datos
    try {
      await trackMetaCost({
        phoneNumber,
        messageId: response.data.messages?.[0]?.id,
        conversationCategory: 'service'
      });
      console.log('💵 Costo de Meta registrado exitosamente');
    } catch (costError) {
      console.error('❌ Error registrando costo de Meta:', costError.message);
      // No lanzar error, continuar con la respuesta
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error enviando mensaje:');
    
    if (error.response) {
      // Error de respuesta HTTP
      console.error(`📊 Status: ${error.response.status}`);
      console.error('📋 Error data:', JSON.stringify(error.response.data, null, 2));
      console.error('📋 Error headers:', JSON.stringify(error.response.headers, null, 2));
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Error de red
      console.error('🌐 Error de red:', error.request);
      throw new Error(`Error de red: ${error.message}`);
    } else {
      // Error de configuración
      console.error('⚙️ Error de configuración:', error.message);
      throw new Error(`Error de configuración: ${error.message}`);
    }
  }
}

/**
 * Registrar costo de una conversación de WhatsApp (Meta)
 * Meta cobra por conversación, no por mensaje individual
 * @param {object} params - Parámetros de costo
 * @param {string} params.phoneNumber - Número de teléfono
 * @param {string} params.messageId - ID del mensaje de Meta
 * @param {string} params.conversationCategory - Categoría de conversación (service, marketing, utility, authentication)
 */
async function trackMetaCost({ phoneNumber, messageId, conversationCategory = 'service' }) {
  try {
    // Obtener el conversation_id de la base de datos
    const convResult = await db.query(
      'SELECT id FROM conversations WHERE phone_number = $1',
      [phoneNumber]
    );
    
    const conversationId = convResult.rows.length > 0 ? convResult.rows[0].id : null;

    // Obtener precio de la configuración
    const priceResult = await db.query(
      `SELECT price_per_unit FROM pricing_config WHERE service = 'meta_whatsapp' AND metric = 'conversation'`
    );
    
    const cost = priceResult.rows.length > 0 ? parseFloat(priceResult.rows[0].price_per_unit) : 0.0085;

    // Verificar si ya se registró un costo para esta conversación en las últimas 24 horas
    // Meta cobra por ventana de conversación de 24 horas
    const existingCostResult = await db.query(
      `SELECT id FROM meta_costs 
       WHERE phone_number = $1 
       AND conversation_category = $2
       AND created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [phoneNumber, conversationCategory]
    );

    // Solo registrar si no hay un costo reciente (ventana de 24 horas)
    if (existingCostResult.rows.length === 0) {
      await db.query(
        `INSERT INTO meta_costs 
         (phone_number, conversation_id, message_id, conversation_category, cost)
         VALUES ($1, $2, $3, $4, $5)`,
        [phoneNumber, conversationId, messageId, conversationCategory, cost]
      );
      console.log(`💵 Costo de Meta registrado: $${cost.toFixed(6)} para conversación con ${phoneNumber}`);
    } else {
      console.log(`🔄 Conversación dentro de ventana de 24h, no se cobra nuevamente`);
    }
  } catch (error) {
    console.error('Error registrando costo de Meta:', error);
    throw error;
  }
}

module.exports = {
  sendMessage,
  trackMetaCost
};
