/**
 * Servicio para inter  systemPrompt: `
INSTRUCCIÓN CRÍTICA: NO hagas preguntas al final. NO uses frases comerciales.
RESPONDE ÚNICAMENTE: precio + tiempo de entrega. NADA MÁS.
EJEMPLOS PROHIBIDOS: "¿te gustaría?", "¿querés?", "¡esperamos!", "proceso sencillo"
MÁXIMO 15 palabras. Sin emojis decorativos.
SÉ COMO UN EMPLEADO EXPERIMENTADO: directo, sin vender.

Inicio SIEMPRE (solo primera vez)
 Hola, mi nombre es Rodrigo, en qué podemos ayudarte
 Catálogo + Reserva 24hs 👉 www.blak.com.ar la API de OpenAI
 * Maneja la comunicación con GPT-3.5-turbo
 */

const OpenAI = require('openai');
const conversationService = require('./conversation');
const db = require('../config/database');

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
  maxTokens: 200, // Extremadamente corto para evitar muletillas
  temperature: 0.2,// Mínima creatividad, máxima consistencia
  systemPrompt: `
Sos el asistente de una agencia de viajes.

Reglas:
- Mensajes muy breves (máximo 2 líneas).
- Una sola pregunta por mensaje.
- Sin repetir frases como “estoy aquí para ayudarte”.
- Sin textos largos ni explicaciones innecesarias.
- Ir directo a captar datos.

Flujo:

Si el cliente dice destino:
→ Pedir fechas.

Si da fechas:
→ Pedir cantidad de personas.

Si da personas:
→ Pedir ciudad de salida.

Cuando tengas:
- Destino
- Fechas
- Personas
- Ciudad de salida

→ Informar que un asesor enviará opciones en breve.
`
};

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

    // Obtener historial de conversación del usuario desde PostgreSQL
    const phoneNumber = userId.replace('whatsapp:+', '');
    
    // 🔍 DETECCIÓN AUTOMÁTICA DE PRODUCTOS PREMIUM
    const productKeywords = [
      'ppf', 'instalacion', 'instalación', 'instalar', 'premium',
      'transparente', 'proteccion', 'protección', 'paint protection',
      'film protector', 'vinilo premium', '3m serie', 'mate pro shield',
      'black solar check', 'antivandálico', 'polarizado 3m',
      'trabajo especial', 'personalizado', 'complejo', 'difícil'
    ];
    
    const messageText = message.toLowerCase();
    const hasProductKeyword = productKeywords.some(keyword => 
      messageText.includes(keyword.toLowerCase())
    );
    
    if (hasProductKeyword) {
      console.log('🔧 Detectado producto premium/complejo - Activando modo manual automáticamente');
      
      // Verificar si ya está en modo manual
      const isAlreadyManual = await conversationService.isManualMode(phoneNumber);
      
      if (!isAlreadyManual) {
        try {
          await conversationService.setManualMode(phoneNumber, 'auto-detected');
          console.log(`✅ Conversación ${phoneNumber} cambiada a modo manual automáticamente`);
          
          // Retornar mensaje indicando el cambio y que un agente se contactará
          return 'Aguardame un minuto y te confirmo la disponibilidad de turnos';
        } catch (error) {
          console.error('❌ Error activando modo manual automático:', error);
          // Si falla, continúa con la respuesta normal de IA
        }
      } else {
        console.log('ℹ️ Conversación ya está en modo manual');
        // Si ya está en manual, no procesamos con IA, devolvemos mensaje indicativo
        return 'Tu consulta está siendo atendida por un agente. Te responderá en breve 👨‍💼';
      }
    }
    
    const messageHistory = await conversationService.getMessageHistory(phoneNumber);
    
    // Convertir historial de DB a formato OpenAI (solo los últimos 6 mensajes)
    let conversationHistory = [];
    if (messageHistory && messageHistory.length > 0) {
      console.log(`📚 Historial existente en DB: ${messageHistory.length} mensajes`);
      // Tomar los últimos 6 mensajes para optimizar costos
      const recentMessages = messageHistory.slice(-6);
      conversationHistory = recentMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text || msg.content
      }));
    } else {
      console.log('🆕 Creando nuevo historial de conversación para usuario');
    }

    // Agregar el mensaje actual del usuario
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Preparar mensajes para la API
    const messages = [
      {
        role: 'system',
        content: CHATBOT_CONFIG.systemPrompt
      },
      ...conversationHistory
    ];

    console.log(`📤 Enviando ${messages.length} mensajes a OpenAI...`);
    // console.log('💭 Contexto completo:', JSON.stringify(messages, null, 2));

    // Llamada a la API de OpenAI
    const response = await openai.chat.completions.create({
      model: CHATBOT_CONFIG.model,
      messages: messages,
      max_tokens: CHATBOT_CONFIG.maxTokens,
      temperature: CHATBOT_CONFIG.temperature,
    });

    // console.log('📨 Respuesta cruda de OpenAI:');
    // console.log(JSON.stringify(response, null, 2));

    // Extraer la respuesta
    const aiMessage = response.choices[0]?.message?.content;
    
    if (!aiMessage) {
      console.error('❌ No se pudo extraer mensaje de la respuesta de OpenAI');
      throw new Error('Respuesta inválida de OpenAI');
    }

    console.log(`💬 Mensaje extraído: "${aiMessage}"`);
    console.log(`📏 Longitud de respuesta: ${aiMessage.length} caracteres`);
    console.log(`💰 Tokens usados: ${response.usage?.total_tokens || 'No disponible'}`);

    // Registrar costos en la base de datos
    if (response.usage) {
      try {
        await trackOpenAICost({
          phoneNumber,
          model: CHATBOT_CONFIG.model,
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        });
        console.log('💵 Costos registrados exitosamente');
      } catch (costError) {
        console.error('❌ Error registrando costos:', costError.message);
        // No lanzar error, continuar con la respuesta
      }
    }

    console.log(`📚 Historial actualizado: ${conversationHistory.length + 1} mensajes`);
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
 * Registrar costos de una llamada a OpenAI
 * @param {object} params - Parámetros de costo
 * @param {string} params.phoneNumber - Número de teléfono
 * @param {string} params.model - Modelo usado
 * @param {number} params.inputTokens - Tokens de entrada
 * @param {number} params.outputTokens - Tokens de salida
 * @param {number} params.messageId - ID del mensaje (opcional)
 */
async function trackOpenAICost({ phoneNumber, model, inputTokens, outputTokens, messageId = null }) {
  try {
    // Obtener precios de la configuración
    const pricesResult = await db.query(
      `SELECT metric, price_per_unit FROM pricing_config WHERE service = 'openai_gpt35'`
    );
    
    const prices = {};
    pricesResult.rows.forEach(row => {
      prices[row.metric] = parseFloat(row.price_per_unit);
    });

    // Calcular costos (precios son por 1000 tokens)
    const inputCost = (inputTokens / 1000) * (prices.input_token_1k || 0.0005);
    const outputCost = (outputTokens / 1000) * (prices.output_token_1k || 0.0015);

    // Insertar en la base de datos
    await db.query(
      `INSERT INTO openai_costs 
       (phone_number, message_id, model, input_tokens, output_tokens, input_cost, output_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [phoneNumber, messageId, model, inputTokens, outputTokens, inputCost, outputCost]
    );

    console.log(`💵 Costo registrado: Input $${inputCost.toFixed(6)} + Output $${outputCost.toFixed(6)} = $${(inputCost + outputCost).toFixed(6)}`);
  } catch (error) {
    console.error('Error registrando costo de OpenAI:', error);
    throw error;
  }
}

/**
 * Limpiar historial de conversación de un usuario
 * @param {string} userId - ID del usuario
 */
async function clearConversation(userId) {
  const phoneNumber = userId.replace('whatsapp:+', '');
  // Note: Implementar si es necesario - por ahora solo log
  console.log(`🗑️  Historial de conversación limpiado para usuario: ${userId}`);
}

/**
 * Obtener estadísticas del servicio
 * @returns {Promise<object>} - Estadísticas básicas
 */
async function getStats() {
  try {
    const conversations = await conversationService.getAllConversations();
    const totalMessages = conversations.reduce((total, conv) => total + (conv.messageCount || 0), 0);
    
    return {
      activeConversations: conversations.length,
      totalMessages: totalMessages,
      model: CHATBOT_CONFIG.model,
      maxTokens: CHATBOT_CONFIG.maxTokens,
      temperature: CHATBOT_CONFIG.temperature
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      activeConversations: 0,
      totalMessages: 0,
      model: CHATBOT_CONFIG.model,
      maxTokens: CHATBOT_CONFIG.maxTokens,
      temperature: CHATBOT_CONFIG.temperature
    };
  }
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
  updateConfig,
  trackOpenAICost
};
