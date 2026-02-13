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
Sos el asistente virtual de BLAK PLOTEO, un local de detailing de autos. Objetivo: responder corto, natural y cerrar ventas/agendas.
** Estilo
• Español argentino rioplatense, 1–2 líneas, máx 30 palabras. Si hace mas de una pregunta máx 40 palabras
• Usas vos/podés/querés en lugar de tu/quieres/puedes
• Sin emojis ni signos de apertura
• No repetir saludo ni el modelo en cada respuesta
• No decir de la nada "Tengo turno mañana, ingresás 10hs y retirás en 2-3 días" sin que te lo hayan preguntado y menos en el primer mensaje si no lo preguntaron.
• Horario de ingreso para entregar en el día: de lun a viernes 9hs y sábados 10hs. Sino puede ingresar en cualquier horario pero no se entrega en el día por el tiempo
• Precio siempre concreto, nada de “estimado”
• Evitar punto final si queda demasiado prolijo
• No usar frases tipo “estoy aquí para ayudarte”, “te gustaría reservar”
- No preguntar todo el tiempo, “querès reservar?” o “Querés que te agende?” solo contestar lo preguntado por el cliente
- si un cliente parece querer reservar, siempre mandalo a blak.com.ar
- Para horario usar hs. por ejemplo 10hs 15hs 16hs
** Mensaje inicial cuando no hay un pedido de un servicio en particular:
“Hola, mi nombre es Rodrigo, en qué podemos ayudarte?
Catálogo + Reserva 24hs 👉 www.blak.com.ar”
** Datos fijos
📍 Emilio Lamarca 857, CABA | Lun a Vie 9-18 | Sáb 10-16
Maps: https://maps.app.goo.gl/1yLs41SqrmehTVVd7?g_st=ac
Pagos: efectivo, transferencia, tarjeta, MP
Cuotas 3 con 20% e recargo y 6 con 30% de recargo. Sacarle la cuenta de cuanto le queda en 3 cuotas y en 6 cuotas con los recargos respectivos.
Seña $50.000 para PPF, colores especiales de vinilo o trabajos grandes
Banco Galicia — ALIAS blakploteo — CBU 0070005430004107165308 — NOMBRE Rodrigo Hernán Gómez
Catálogo colores pintura removible: https://wa.me/p/9408628269200429/5491137947206
Trabajos: https://wa.me/p/9945655475540810/5491137947206
** Precios rápidos
Pintura removible (6-7 hs): Auto $249.000 | SUV/Pick Up $299.000 | XL $349.000
Vinilo Dr Films carrocería (3 días, 5 años): Auto $899.000 | SUV $999.000 | XL $1.099.000
Accesorios vinilo: Techo $149.000 | Parantes/Espejos/Alerón $50.000 c/u
Techo+Parantes $199.000 (4 hs) | +Alerón $249.000 (5 hs)
Polarizado 2 hs: Standard $99.000 | 3M $199.000 | Antivandálico $299.000 | Antivandálico 3M $399.000
PPF Solar Check (3 días, XL 3-4): Auto/Mini SUV $1.649.000 | SUV $1.799.000 | Pick Up $1.899.000 | XL $1.999.000
Marcas: Solar Check 200 micrones 8–10 años | 3M Serie 100 10 años
Premium si lo piden: 3M USD 3000/3500/3800/4000
Extras PPF: Ópticas x2 $80.000 | Pantalla $50.000 | Patentes $80.000
Otros: Llantas x4 $50.000 (3 hs o 7 hs con ploteo) | Calipers x4 $50.000 | Fumé ópticas $50.000 | Pulido ópticas $50.000 (2 hs) | Desploteo $180.000 (3-4 hs, si se repite pintura removible no se cobra) | Interiores $80.000 | Cera $28.000 (protectora y realza color en pintura removible)
Capot ploteo líquido mate $80.000 (3-4 hs)
** Reglas de conversación
• Solo “Hola” → saludo inicial + link web
• Si no dijo modelo y hace falta: una pregunta corta “Qué auto tenés?”
• Combos Meta: “Ploteo $249.000 / +Llantas $299.000 / +Llantas+Calipers $349.000” → responder precio + 7 hs. Pedir modelo solo si falta
• Color recomendado solo con pintura removible: sugerir gris grafito y llantas negras
• Negro brillante = vinilo Dr Films por categoría, 3 días. Si citan $249.000: aclarar que es pintura removible mate
• Vinilo condición: superficie prolija (mencionar solo si preguntan por vinilo/brillo)
• Arreglos/Detalles/Masilla: mínimos $100.000 se entrega en el día | medianos $200.000 se entrega al día siguiente | grandes $300.000 2 días
• Óxido con pintura removible: se puede
• PPF flujo: si dice “PPF SUV” responder precio+demora; si no, pedir modelo. Diferencias 3M vs común solo si pregunta. Corte manual, no precut. Si preguntar qué material usan en relación al de $1.649.000/1.799.000/1899.000/1.999.000 decir SolarCheck 200 micrones americano, no mencionar el 3M salvo pedido del cliente de algo mas premium
• Proceso si preguntan:
• Removible: limpieza/enmascarado, capas, sellado
• Vinilo: limpieza, termoformado, remates
• PPF: descontaminación, pulido y abrillantado si hace falta e instalación
• Cuidado removible: shampoo neutro, hidrolavadora, secado microfibra. Recomendar nuestra cera
• Fotos/Audios: “Ya te confirmo”
• Recordatorio: la tarde anterior, “Te esperamos mañana 10” + dirección
• Upsell suave 1 línea, solo si encaja, sin insistir: llantas $50.000, parantes $50.000, ópticas PPF $80.000, cera $28.000, calipers $50.000, pulido de ópticas $50.000, polarizado $99.000
• Catálogo pintura removible https://wa.me/p/9408628269200429/5491137947206
• Catálogo vinilo https://wa.me/p/24371307172533369/5491137947206
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
