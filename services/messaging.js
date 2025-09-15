/**
 * Servicio para interactuar con la API de 360dialog
 * Maneja el envío de mensajes de WhatsApp
 */

const axios = require('axios');

// Configuración de 360dialog
const D360_API_KEY = process.env.DIALOG360_API_KEY || process.env.D360_API_KEY;
const D360_API_URL = process.env.NODE_ENV === 'development' ? 'https://waba-sandbox.360dialog.io' : (process.env.D360_API_URL || 'https://waba-v2.360dialog.io');

// Detectar entorno
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.SANDBOX_MODE === 'true';
const SANDBOX_PHONE = process.env.SANDBOX_PHONE_NUMBER;

// Verificar configuración
if (D360_API_KEY) {
  console.log(`✅ API Key de 360dialog configurada (Entorno: ${isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN'})`);
  if (isDevelopment && SANDBOX_PHONE) {
    console.log(`🧪 Sandbox activo - Número de prueba: ${SANDBOX_PHONE}`);
  }
} else {
  console.warn('⚠️  D360_API_KEY no configurada. Agrega tu API Key de 360dialog en el archivo .env');
}

/**
 * Enviar mensaje de WhatsApp usando 360dialog
 * @param {string} to - Número de destino (formato: whatsapp:+5491137947206)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<object>} - Resultado del envío
 */
async function sendMessage(to, message) {
  try {
    console.log('📤 Enviando mensaje via 360dialog...');

    if (!to || !message) {
      throw new Error('Faltan parámetros: to y message son requeridos');
    }
    if (!D360_API_KEY) {
      throw new Error('D360_API_KEY no configurada');
    }

    // Formatear número: usar formato internacional sin + (estándar 360dialog)
    let phoneNumber = to.replace('whatsapp:', '').replace('+', '');
    
    // Asegurar formato internacional completo para Argentina
    if (!phoneNumber.startsWith('54')) {
      if (phoneNumber.startsWith('9')) {
        phoneNumber = '54' + phoneNumber; // 549XXXXXXXXX
      }
    }
    
    console.log(`📱 Enviando a: ${phoneNumber}`);
    console.log(`📱 Formato original: ${to}`);

    if (message.length > 4096) {
      console.warn('⚠️ Mensaje muy largo, recortando...');
      message = message.substring(0, 4093) + '...';
    }

    // Payload para 360dialog API
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

    const apiUrl = `${D360_API_URL}/messages`;
    console.log('🌐 URL completa:', apiUrl);
    
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': D360_API_KEY,
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
