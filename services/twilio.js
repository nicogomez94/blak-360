/**
 * Servicio para interactuar con la API de Twilio
 * Maneja el envío de mensajes de WhatsApp
 */

const twilio = require('twilio');

// Inicializar cliente de Twilio
let twilioClient;

// Verificar que las credenciales estén configuradas antes de inicializar
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Cliente de Twilio inicializado');
  } catch (error) {
    console.error('❌ Error inicializando cliente de Twilio:', error);
  }
} else {
  console.warn('⚠️  Credenciales de Twilio no configuradas. Cliente no inicializado.');
  console.warn('📝 Configura TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en el archivo .env');
}

/**
 * Enviar mensaje de WhatsApp usando Twilio
 * @param {string} to - Número de destino (formato: whatsapp:+1234567890)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<object>} - Resultado del envío
 */
async function sendMessage(to, message) {
  try {
    console.log('📤 Enviando mensaje via Twilio...');
    
    // Validar parámetros
    if (!to || !message) {
      throw new Error('Faltan parámetros: to y message son requeridos');
    }

    // Validar configuración de Twilio
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Credenciales de Twilio no configuradas');
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER no configurado');
    }

    // Asegurar que el número de destino tenga el formato correcto
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    // Validar longitud del mensaje (WhatsApp tiene límites)
    if (message.length > 1600) {
      console.warn('⚠️  Mensaje muy largo, será truncado');
      message = message.substring(0, 1600) + '...';
    }

    console.log(`📱 Enviando a: ${formattedTo}`);
    console.log(`💬 Mensaje: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    // Enviar mensaje
    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo
    });

    console.log('✅ Mensaje enviado exitosamente');
    console.log(`🆔 MessageSid: ${messageResponse.sid}`);
    console.log(`📊 Estado: ${messageResponse.status}`);

    return {
      success: true,
      messageSid: messageResponse.sid,
      status: messageResponse.status,
      to: formattedTo,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error enviando mensaje con Twilio:', error);
    
    // Manejar diferentes tipos de errores de Twilio
    if (error.code === 20003) {
      console.error('❌ Número de teléfono no válido');
      throw new Error('Número de teléfono no válido');
    }
    
    if (error.code === 20404) {
      console.error('❌ Número de WhatsApp no encontrado o no válido para sandbox');
      throw new Error('Número de WhatsApp no válido para sandbox');
    }
    
    if (error.status === 401) {
      console.error('❌ Credenciales de Twilio inválidas');
      throw new Error('Credenciales de Twilio inválidas');
    }

    if (error.code === 21211) {
      console.error('❌ Número de teléfono no verificado en Twilio sandbox');
      throw new Error('Número no verificado en Twilio sandbox');
    }

    // Re-lanzar el error para que lo maneje el llamador
    throw error;
  }
}

/**
 * Verificar el estado de un mensaje enviado
 * @param {string} messageSid - ID del mensaje de Twilio
 * @returns {Promise<object>} - Estado del mensaje
 */
async function getMessageStatus(messageSid) {
  try {
    if (!messageSid) {
      throw new Error('MessageSid es requerido');
    }

    const message = await twilioClient.messages(messageSid).fetch();
    
    return {
      sid: message.sid,
      status: message.status,
      direction: message.direction,
      from: message.from,
      to: message.to,
      dateCreated: message.dateCreated,
      dateUpdated: message.dateUpdated,
      dateSent: message.dateSent,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    };

  } catch (error) {
    console.error('❌ Error obteniendo estado del mensaje:', error);
    throw error;
  }
}

/**
 * Obtener lista de mensajes recientes
 * @param {number} limit - Número máximo de mensajes a obtener
 * @returns {Promise<Array>} - Lista de mensajes
 */
async function getRecentMessages(limit = 10) {
  try {
    const messages = await twilioClient.messages.list({
      limit: limit
    });

    return messages.map(message => ({
      sid: message.sid,
      from: message.from,
      to: message.to,
      body: message.body,
      status: message.status,
      direction: message.direction,
      dateCreated: message.dateCreated
    }));

  } catch (error) {
    console.error('❌ Error obteniendo mensajes recientes:', error);
    throw error;
  }
}

/**
 * Verificar configuración de Twilio
 * @returns {object} - Estado de la configuración
 */
function checkConfiguration() {
  const config = {
    accountSid: !!process.env.TWILIO_ACCOUNT_SID,
    authToken: !!process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
    clientInitialized: !!twilioClient
  };

  const isValid = Object.values(config).every(value => value === true);

  return {
    isValid,
    config,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'No configurado'
  };
}

/**
 * Obtener información de la cuenta de Twilio
 * @returns {Promise<object>} - Información de la cuenta
 */
async function getAccountInfo() {
  try {
    const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    
    return {
      sid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status,
      type: account.type,
      dateCreated: account.dateCreated,
      dateUpdated: account.dateUpdated
    };

  } catch (error) {
    console.error('❌ Error obteniendo información de la cuenta:', error);
    throw error;
  }
}

module.exports = {
  sendMessage,
  getMessageStatus,
  getRecentMessages,
  checkConfiguration,
  getAccountInfo
};
