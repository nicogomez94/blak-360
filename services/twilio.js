/**
 * Servicio para interactuar con la API de 360dialog
 * Maneja el envío de mensajes de WhatsApp
 */

const axios = require('axios'); // Cambiar fetch por axios

// Configuración de 360dialog
const D360_API_KEY = process.env.D360_API_KEY;
const D360_API_URL = process.env.D360_API_URL || 'https://waba-v2.360dialog.io';

// Verificar configuración
if (D360_API_KEY) {
  console.log('✅ API Key de 360dialog configurada');
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

    // Formatear número: quitar prefijo whatsapp: y +
    const phoneNumber = to.replace('whatsapp:', '').replace('+', '');
    console.log(`📱 Enviando a: ${phoneNumber}`);

    if (message.length > 4096) {
      console.warn('⚠️ Mensaje muy largo, recortando...');
      message = message.substring(0, 4093) + '...';
    }

    // Payload correcto para 360dialog API v2
    const payload = {
      to: phoneNumber,  // Solo el número sin prefijos
      type: "text",
      text: {
        body: message
      }
    };

    console.log('💬 Mensaje:', `"${message}"`);
    console.log('📦 Payload 360dialog:', JSON.stringify(payload, null, 2));

    // Usar axios en lugar de fetch
    const response = await axios.post(`${D360_API_URL}/v1/messages`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': D360_API_KEY
      }
    });

    console.log(`📊 Status: ${response.status}`);
    console.log('📨 Respuesta de 360dialog:', JSON.stringify(response.data, null, 2));
    console.log('✅ Mensaje enviado exitosamente');

    return response.data;

  } catch (error) {
    console.error('❌ Error enviando mensaje con 360dialog:');
    
    if (error.response) {
      // Error de respuesta HTTP
      console.error(`📊 Status: ${error.response.status}`);
      console.error('📋 Error data:', JSON.stringify(error.response.data, null, 2));
      console.error('📋 Error headers:', JSON.stringify(error.response.headers, null, 2));
      throw new Error(`360dialog API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
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
