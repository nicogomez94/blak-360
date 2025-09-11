/**
 * Servicio para interactuar con la API de OpenAI
 * Maneja la comunicación con GPT-3.5-turbo
 */

const OpenAI = require('openai');

// Configurar cliente de OpenAI
let openai;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ Cliente de OpenAI inicializado');
} else {
  console.warn('⚠️  OPENAI_API_KEY no configurada');
}

/**
 * Configuración del chatbot - Optimizada para costos
 */
const CHATBOT_CONFIG = {
  model: 'gpt-3.5-turbo',
  maxTokens: 150, // Optimizado para costos (era 500)
  temperature: 0.7,
  systemPrompt: `Eres el asistente virtual de BLAK PLOTEO, especialistas en ploteo y pintura de vehículos.

SERVICIOS Y PRECIOS:

1. PLOTEO CON PINTURA
   - AUTO/MINI SUV/UTILITARIA/MINI PICK UP → $249.000
   - SUV/PICK UP → $299.000
   - PICK UP XL → $349.000

2. PINTURA LLANTAS X4 → $50.000

3. PINTURA CALIPERS X4 → $50.000

4. FUMÉ ÓPTICAS X2 → $50.000
   - Variables: Mate o Brillante

5. PULIDO ÓPTICAS X2 → $50.000

6. POLARIZADO
   - STANDARD (Intermedio/Oscuro) → $99.000
   - 3M (Intermedio/Oscuro) → $199.000
   - ANTIVANDÁLICO (Intermedio/Oscuro) → $299.000
   - ANTIVANDÁLICO 3M (Intermedio/Oscuro) → $399.000

7. PLOTEO ACCESORIOS → $50.000 c/u
   - Parrilla, Logos, Cromados, Parantes, Alerón, Espejos
   - Techo → $149.000

8. PLOTEO CON VINILO
   - AUTO/MINI SUV/UTILITARIA/MINI PICK UP → $899.000
   - SUV/PICK UP → $999.000
   - PICK UP XL → $1.099.000

9. PPF TRANSPARENTE
   - AUTO/MINI SUV/UTILITARIA/MINI PICK UP → $1.649.000
   - SUV/PICK UP → $1.799.000
   - PICK UP XL → $1.899.000

PRODUCTOS ESPECIALES:
• Ploteo removible con vinilo marca VenomDip (4 años duración, 4 años garantía)
• Ploteo vinilo marca Dr Films (5 años duración, 5 años garantía)
• PPF marca Dr Films (10 años duración, 5 años garantía)

UBICACIÓN: Emilio Lamarca 857, CABA
HORARIOS: Lun a Vie 9-18h, Sáb 10-16h

DATOS BANCARIOS:
  Banco Galicia
  DU: 39560071
  CTA: 4107165-3 005-0
  CBU: 0070005430004107165308
  CUIL: 20395600711
  ALIAS: blakploteo
  NOMBRE: Rodrigo Hernán Gómez


INSTRUCCIONES:
- Responde en español, máximo 50 palabras
- Sé profesional pero amigable
- Ofrece presupuestos y agenda citas
- Proporciona información de garantías cuando sea relevante
- Para consultas específicas de colores, menciona el catálogo disponible`
};

/**
 * Almacén simple de conversaciones en memoria
 * En producción, considera usar una base de datos
 */
const conversations = new Map();

/**
 * Obtener respuesta de OpenAI para un mensaje
 * @param {string} message - Mensaje del usuario
 * @param {string} userId - ID único del usuario (número de teléfono)
 * @returns {Promise<string>} - Respuesta del chatbot
 */
async function getResponse(message, userId = 'anonymous') {
  try {
    console.log('\n🧠 === INICIO PROCESAMIENTO OPENAI ===');
    console.log(`📝 Mensaje recibido: "${message}"`);
    console.log(`👤 Usuario ID: ${userId}`);
    console.log(`📏 Longitud del mensaje: ${message.length} caracteres`);

    // Validar configuración
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ API key de OpenAI no configurada');
      throw new Error('API key de OpenAI no configurada');
    }

    if (!openai) {
      console.error('❌ Cliente de OpenAI no inicializado');
      throw new Error('Cliente de OpenAI no inicializado');
    }

    // Obtener historial de conversación del usuario
    let conversationHistory = conversations.get(userId) || [];
    
    if (conversationHistory.length === 0) {
      console.log('🆕 Creando nuevo historial de conversación para usuario');
    } else {
      console.log(`📚 Historial existente: ${conversationHistory.length} mensajes`);
    }

    // Agregar mensaje del usuario al historial
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Mantener solo los últimos 6 mensajes para optimizar costos
    if (conversationHistory.length > 6) {
      console.log('✂️  Recortando historial para optimizar costos');
      conversationHistory = conversationHistory.slice(-6);
    }

    // Preparar mensajes para la API
    const messages = [
      {
        role: 'system',
        content: CHATBOT_CONFIG.systemPrompt
      },
      ...conversationHistory
    ];

    console.log(`📤 Enviando ${messages.length} mensajes a OpenAI...`);
    console.log('💭 Contexto completo:', JSON.stringify(messages, null, 2));

    // Llamada a la API de OpenAI
    const response = await openai.chat.completions.create({
      model: CHATBOT_CONFIG.model,
      messages: messages,
      max_tokens: CHATBOT_CONFIG.maxTokens,
      temperature: CHATBOT_CONFIG.temperature,
    });

    console.log('📨 Respuesta cruda de OpenAI:');
    console.log(JSON.stringify(response, null, 2));

    // Extraer la respuesta
    const aiMessage = response.choices[0]?.message?.content;
    
    if (!aiMessage) {
      console.error('❌ No se pudo extraer mensaje de la respuesta de OpenAI');
      throw new Error('Respuesta inválida de OpenAI');
    }

    console.log(`💬 Mensaje extraído: "${aiMessage}"`);
    console.log(`📏 Longitud de respuesta: ${aiMessage.length} caracteres`);
    console.log(`💰 Tokens usados: ${response.usage?.total_tokens || 'No disponible'}`);

    // Agregar respuesta al historial
    conversationHistory.push({
      role: 'assistant',
      content: aiMessage
    });

    // Guardar historial actualizado
    conversations.set(userId, conversationHistory);

    console.log(`📚 Historial actualizado: ${conversationHistory.length} mensajes`);
    console.log('🧠 === FIN PROCESAMIENTO OPENAI ===\n');

    return aiMessage.trim();

  } catch (error) {
    console.error('\n❌ === ERROR EN OPENAI ===');
    console.error('🔴 Error tipo:', error.constructor.name);
    console.error('📋 Mensaje de error:', error.message);
    console.error('🔍 Código de error:', error.code || 'No disponible');
    console.error('📊 Detalles completos:', error);
    console.error('❌ === FIN ERROR OPENAI ===\n');

    // Manejar diferentes tipos de errores de OpenAI
    if (error.code === 'insufficient_quota') {
      throw new Error('Sin créditos suficientes en OpenAI. Agrega más créditos en: https://platform.openai.com/account/billing');
    }
    
    if (error.code === 'invalid_api_key') {
      throw new Error('API key de OpenAI inválida');
    }
    
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Límite de rate de OpenAI excedido');
    }

    // Error genérico
    throw new Error(`Error de OpenAI: ${error.message}`);
  }
}

/**
 * Limpiar historial de conversación de un usuario
 * @param {string} userId - ID del usuario
 */
function clearConversation(userId) {
  conversations.delete(userId);
  console.log(`🗑️  Historial de conversación limpiado para usuario: ${userId}`);
}

/**
 * Obtener estadísticas del servicio
 * @returns {object} - Estadísticas básicas
 */
function getStats() {
  return {
    activeConversations: conversations.size,
    totalMessages: Array.from(conversations.values()).reduce((total, conv) => total + conv.length, 0),
    model: CHATBOT_CONFIG.model,
    maxTokens: CHATBOT_CONFIG.maxTokens,
    temperature: CHATBOT_CONFIG.temperature
  };
}

/**
 * Configurar parámetros del chatbot
 * @param {object} config - Nueva configuración
 */
function updateConfig(config) {
  if (config.maxTokens) CHATBOT_CONFIG.maxTokens = config.maxTokens;
  if (config.temperature !== undefined) CHATBOT_CONFIG.temperature = config.temperature;
  if (config.systemPrompt) CHATBOT_CONFIG.systemPrompt = config.systemPrompt;
  
  console.log('⚙️  Configuración del chatbot actualizada:', CHATBOT_CONFIG);
}

module.exports = {
  getResponse,
  clearConversation,
  getStats,
  updateConfig
};
