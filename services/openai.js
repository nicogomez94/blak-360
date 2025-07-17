/**
 * Servicio para interactuar con la API de OpenAI
 * Maneja la comunicación con GPT-3.5-turbo
 */

const OpenAI = require('openai');

// Configurar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Configuración del chatbot
 */
const CHATBOT_CONFIG = {
  model: 'gpt-3.5-turbo',
  maxTokens: 500,
  temperature: 0.7,
  systemPrompt: `Eres un asistente virtual útil y amigable que responde a través de WhatsApp. 
    Mantén tus respuestas concisas pero informativas, máximo 200 palabras por respuesta.
    Sé conversacional y natural. Si no sabes algo, admítelo honestamente.
    Responde siempre en español a menos que te pidan específicamente otro idioma.`
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
async function getResponse(message, userId) {
  try {
    console.log('🤖 Procesando mensaje con OpenAI...');
    
    // Validar que tenemos la API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    // Obtener historial de conversación del usuario
    let conversationHistory = conversations.get(userId) || [];
    
    // Agregar mensaje del usuario al historial
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Mantener solo los últimos 10 mensajes para no exceder límites
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    // Preparar mensajes para OpenAI
    const messages = [
      {
        role: 'system',
        content: CHATBOT_CONFIG.systemPrompt
      },
      ...conversationHistory
    ];

    console.log(`📝 Enviando ${messages.length} mensajes a OpenAI`);

    // Llamar a la API de OpenAI
    const completion = await openai.chat.completions.create({
      model: CHATBOT_CONFIG.model,
      messages: messages,
      max_tokens: CHATBOT_CONFIG.maxTokens,
      temperature: CHATBOT_CONFIG.temperature,
    });

    // Extraer respuesta
    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No se recibió respuesta válida de OpenAI');
    }

    // Agregar respuesta del asistente al historial
    conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });

    // Guardar historial actualizado
    conversations.set(userId, conversationHistory);

    console.log('✅ Respuesta generada exitosamente');
    
    // Log de tokens utilizados
    if (completion.usage) {
      console.log(`📊 Tokens utilizados: ${completion.usage.total_tokens} (prompt: ${completion.usage.prompt_tokens}, completion: ${completion.usage.completion_tokens})`);
    }

    return aiResponse.trim();

  } catch (error) {
    console.error('❌ Error en servicio OpenAI:', error);
    
    // Manejar diferentes tipos de errores
    if (error.code === 'insufficient_quota') {
      return 'Lo siento, he alcanzado mi límite de uso por hoy. Por favor intenta más tarde.';
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return 'Estoy recibiendo muchas consultas ahora. Por favor espera un momento e intenta de nuevo.';
    }
    
    if (error.status === 401) {
      console.error('❌ API key de OpenAI inválida o expirada');
      return 'Hay un problema con mi configuración. Por favor contacta al administrador.';
    }

    // Error genérico
    return 'Lo siento, no pude procesar tu mensaje en este momento. Por favor intenta de nuevo.';
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
