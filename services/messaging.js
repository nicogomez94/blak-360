/**
 * Servicio para interactuar con WhatsApp Cloud API de Meta
 * Maneja el envío de mensajes de WhatsApp
 */

const axios = require('axios');

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

module.exports = {
  sendMessage
};
