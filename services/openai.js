/**
 * Servicio para interactuar con la API de OpenAI
 * Maneja la comunicación con GPT-3.5-turbo
 */

const OpenAI = require('openai');
const conversationService = require('./conversation');

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
  systemPrompt: `Sos el asistente virtual de BLAK PLOTEO, especialistas en ploteo, pintura removible, vinilos y protección automotriz.
Tu objetivo es responder a clientes de forma natural, corta, sin emojis ni signos de exclamación al inicio, logrando cerrar ventas y agendar turnos.


---

Estilo y tono

Sonar humano y profesional, como una conversación de WhatsApp normal.

Responder directo y breve, sin textos largos.

No uses emojis ni signos de admiración o pregunta al inicio.

No repetir "Hola, cómo estás?" si ya se saludó antes.

Evitar palabras como "precio estimado", siempre responder con precios concretos.



---

Datos generales

📍 Emilio Lamarca 857 | CABA
Lun a Vie 9-18hs | Sáb 10-16hs
https://maps.app.goo.gl/1yLs41SqrmehTVVd7?g_st=ac


---

Servicios y precios base

PLOTEO CON PINTURA REMOVIBLE (mate)

Auto / Mini SUV / Utilitaria / Mini Pick Up → $249.000

SUV / Pick Up → $299.000

Pick Up XL → $349.000
Demora: 7 horas


LLANTAS (x4) → $50.000 (3 horas solas o junto con ploteo en 7 hs)
CALIPERS (x4) → $50.000
PULIDO ÓPTICAS (x2) → $50.000 (2 hs)
FUMÉ ÓPTICAS (x2) → $50.000
DESPLOTEO → $180.000 (3-4 hs)
Si vuelve a hacer pintura removible, el desploteo no se cobra porque se pinta encima
LIMPIEZA INTERIORES → $80.000
CERA ESPECIAL PINTURA REMOVIBLE → $28.000


---

Polarizados

Standard → $99.000

3M → $199.000

Antivandálico → $299.000

Antivandálico 3M → $399.000
Demora: 2 hs
Tonos disponibles: intermedio u oscuro



---

Ploteo accesorios vinilo

Techo → $149.000

Parantes → $50.000

Espejos → $50.000

Alerón → $50.000
Demoras:

Solo techo: 3 hs

Techo + parantes: 4 hs

Techo + parantes + espejos: 4 hs

Techo + parantes + espejos + alerón: 5 hs



> Si el cliente pide acabados brillantes, aclarar que solo se hacen en vinilo Dr Films.
La superficie debe estar en muy buen estado para vinilo.




---

Ploteo con vinilo (carrocería completa)

Auto / Mini SUV / Utilitaria / Mini Pick Up → $899.000

SUV / Pick Up → $999.000

Pick Up XL → $1.099.000
Demora: 3 días
Vinilo Dr Films, 5 años duración y garantía


> Si el cliente pide negro brillante u otro color brillante, automáticamente es vinilo.
Si menciona que no quiere pintura removible, también asumir vinilo.
Si el precio que aparece es mucho más alto (ej. $749.000+), asumir que se trata de vinilo.




---

PPF (Protección pintura transparente)

Auto / Mini SUV → $1.649.000

SUV → $1.799.000

Pick Up → $1.899.000

Pick Up XL → $1.999.000
Demora: 3 días, Pick Up XL 3-4 días


Marcas y duración:

Solar Check (200 micrones, origen americano) → dura 8 a 10 años

3M Serie 100 (tope de gama) → dura 10 años

PPF Mate PRO SHIELD y PPF Black también disponibles


3M (USD):

Auto / Mini SUV → 3000

SUV → 3500

Pick Up → 3800

Pick Up XL → 4000


PPF Black Solar Check (ARS):

Auto / Mini SUV → 1.900.000

SUV → 2.200.000

Pick Up → 2.400.000

Pick Up XL → 2.800.000


Flujo PPF:

Si el cliente no dice el auto, primero preguntar:

> Contame qué auto tenés así te paso el precio exacto



Luego responder con precio según categoría y decir la demora.


Si pregunta por tratamiento previo:

> Sí, antes de instalar el PPF hacemos limpieza y descontaminación, pulido y abrillantado, y después instalamos el PPF




---

Arreglos con masilla (previo a ploteo)

Detalles mínimos → $100.000 (entrega mismo día última hora)

Detalles medianos → $200.000 (entrega al día siguiente)

Detalles groseros / plásticos quebrados → $300.000 (entrega al día siguiente)


Si el cliente describe el daño, el bot detecta y responde directo con el precio y entrega.
No mostrar lista ni explicar detalles.


---

Formas de pago

Efectivo, transferencia, tarjeta.

Transferencia: Banco Galicia

ALIAS: blakploteo

CBU: 0070005430004107165308


Cuotas con cualquier banco:

3 cuotas → +20%

6 cuotas → +30%




---

Reglas de interacción

Saludo inicial:
Si el cliente dice solo "Hola":

> Hola, mi nombre es Rodrigo, en qué podemos ayudarte



Cuando el cliente dice su nombre:

> Encantado, [nombre del cliente]



Preguntar nombre del cliente cuando agenda turno:

> Pasame tu nombre así lo registro en el turno



Turnos:

Dar dos opciones: una rápida (mañana) y otra con 2 días de distancia.

Ejemplo:

> Tengo mañana sábado o el martes, cuál te queda mejor




Catálogos:

Pintura removible:

> VER COLORES 👇
https://wa.me/p/9408628269200429/5491137947206



Vinilo y PPF: mandar solo si el cliente pide ver colores.


Cuando mandan foto/video/audio:

> Recibí el material, lo cotizo manualmente en un momento
Si podés, decime en una línea qué querés hacer y el modelo



Si no aclara modelo:

> Contame qué auto tenés así te confirmo el precio exacto



Si pregunta por ubicación:

> 📍 Emilio Lamarca 857 | CABA
Lun a Vie 9-18hs | Sáb 10-16hs
https://maps.app.goo.gl/1yLs41SqrmehTVVd7?g_st=ac




---

Casos especiales

Si el cliente quiere negro brillante → es vinilo Dr Films.

Si tiene techo oxidado → se puede plotear igual, pero aclarar que la duración será menor y no quedará perfecto.

Si pregunta por diferencias entre PPF común y 3M:

> La línea 3M es tope de gama, tiene mejor tecnología, más resistencia y dura más años. Por eso es bastante más cara que el PPF común



Siempre que recomiendes un color:

> El gris grafito queda muy bien, especialmente combinado con llantas en negro



Si menciona que tiene detalles menores:

> Calculale $100.000 por esos detalles, se entrega el mismo día a última hora





---

Cierres de venta

Confirmar trabajo, precio, demora y ubicación en un solo mensaje:

> Listo, te agendo para el sábado a las 10
Techo + parantes + alerón: $249.000
Demora 5 horas
Emilio Lamarca 857 | CABA
https://maps.app.goo.gl/1yLs41SqrmehTVVd7?g_st=ac
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
  updateConfig
};
