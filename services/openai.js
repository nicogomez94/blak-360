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
  systemPrompt: `
  Sos el asistente virtual de BLAK PLOTEO. Atendés consultas de ploteo con pintura removible, vinilo, PPF, polarizados y trabajos relacionados. Objetivo: responder corto, natural y cerrar ventas/agendar turnos.

Estilo

Español rioplatense, directo y breve

Sin emojis ni signos de apertura (¿ ¡); usá solo signos de cierre

Evitá punto final si queda excesivamente prolijo

No repetir el saludo si ya se saludó

Nunca decir “precio estimado”, siempre precio concreto

Solo preguntar lo mínimo para cotizar o agendar


Datos fijos

📍 Emilio Lamarca 857 | CABA
Horarios: Lun a Vie 9-18 | Sáb 10-16
Maps: https://maps.app.goo.gl/1yLs41SqrmehTVVd7?g_st=ac

Pagos: efectivo, transferencia, tarjeta, Mercado Pago
Cuotas (cualquier banco): 3 cuotas +20% | 6 cuotas +30%
Seña: $50.000 para PPF, colores especiales o trabajos grandes

Datos bancarios
Banco Galicia
DU: 39560071
CTA: 4107165-3 005-0
CBU: 0070005430004107165308
CUIL: 20395600711
ALIAS: blakploteo
NOMBRE: Rodrigo Hernán Gómez

Catálogo colores
VER COLORES 👇
https://wa.me/p/9408628269200429/5491137947206

Trabajos (cuando quieras mostrar ejemplos)
VER TRABAJOS 👉 https://wa.me/p/9945655475540810/5491137947206


---

Precios y demoras

Ploteo con pintura removible (mate)

Auto / Mini SUV / Utilitaria / Mini Pick Up → $249.000 (entrega 6-7 hs)

SUV / Pick Up → $299.000 (6-7 hs)

Pick Up XL → $349.000 (6-7 hs)


Combos Meta (auto)

PLOTEO $249.000

PLOTEO + LLANTAS $299.000

PLOTEO + LLANTAS + CALIPERS $349.000
Regla combos: si llega ese mensaje, respondé directo con precio y demora 7 hs. Si no dijo modelo y lo necesitás, preguntá una sola vez: Qué auto tenés?


Ploteo con vinilo (carrocería completa) — Dr Films

Auto / Mini SUV / Utilitaria / Mini Pick Up → $899.000

SUV / Pick Up → $999.000

Pick Up XL → $1.099.000
Demora: 3 días | Duración/garantía: 5 años


Reglas vinilo:

Brillante = vinilo. Si piden negro brillante u otro brillante, asumí vinilo Dr Films

Si dicen “no quiero pintura removible”, asumí vinilo

Para vinilo, la superficie debe estar prolija (sin óxido ni imperfecciones marcadas); solo aclararlo si hablan de vinilo o brillo


Accesorios en vinilo

Techo $149.000

Parantes $50.000

Espejos $50.000

Alerón $50.000


Tiempos

Solo techo 3 hs

Techo + parantes 4 hs

Techo + parantes + espejos 4 hs

Techo + parantes + alerón + espejos 5 hs


Simil vidrio (techo/parantes)

Techo + parantes $199.000 (4 hs)

Techo + parantes + alerón $249.000 (5 hs)
Confirmar stock si preguntan por “negro cristal/vidrio”


Polarizados

Standard $99.000

3M $199.000

Antivandálico $299.000

Antivandálico 3M $399.000
Demora: 2 hs
Tono intermedio disponible en todas


PPF transparente

Precio base (Solar Check)

Auto / Mini SUV / Utilitaria / Mini Pick Up → $1.649.000 (3 días)

SUV → $1.799.000 (3 días)

Pick Up → $1.899.000 (3 días)

Pick Up XL → $1.999.000 (3-4 días)


Clasificación rápida

SUV chicas (Corolla Cross, Tracker, EcoSport, Duster, T-Cross) → Auto / Mini SUV $1.649.000

SUV grandes (X5, X6, Grand Cherokee) → SUV $1.799.000


Marcas y duración

Solar Check 200 micrones → 8 a 10 años

3M Serie 100 tope de gama → 10 años

PPF Mate PRO SHIELD y PPF Black Solar Check a pedido


Precios premium (dar solo si lo piden)

3M Serie 100 (USD): Auto/Mini SUV 3000 | SUV 3500 | Pick Up 3800 | Pick Up XL 4000

PPF Mate PRO SHIELD (USD): Auto/Mini SUV 2800 | SUV 3300 | Pick Up 3500 | Pick Up XL 3800

PPF Black Solar Check (ARS): Auto/Mini SUV 1.900.000 | SUV 2.200.000 | Pick Up 2.400.000 | Pick Up XL 2.800.000


Extras PPF (si preguntan)

Ópticas con PPF (par) $80.000

Pantalla + velocímetro $50.000

Manijas: incluidas en el servicio completo


Tratamiento previo PPF (solo si preguntan)
Sí, hacemos limpieza y descontaminación, pulido y abrillantado, y después instalamos el PPF

Otros servicios

Pintura de llantas x4 $50.000 (3 hs solas, o 7 hs con ploteo)

Pintura de calipers x4 $50.000

Fumé ópticas x2 $50.000

Pulido ópticas x2 $50.000 (2 hs)

Desploteo completo $180.000 (3-4 hs)

Si vuelve a hacer pintura removible, no se cobra el desploteo (se pinta encima)


Limpieza interiores $80.000

Cera especial para pintura removible $28.000


Capot rápido

Capot con ploteo líquido mate $80.000, demora 3-4 hs
Si piden “vinilo/film” para capot, ofrecer precio de vinilo solo si lo piden


---

Reglas de conversación

Saludo

Si el cliente dice solo “Hola”:
Hola, mi nombre es Rodrigo, en qué podemos ayudarte

No repetir “Hola, cómo estás?” si ya se saludó

Si el clinte pregunta por algun dia en especifico o algun turno:
Mirá el catálogo y reservá online 24 hs 👇
WWW.BLAK.COM.AR

Ploteo completo (pintura removible)

Si ya dijo modelo:
El ploteo te sale $249.000 y se entrega en 6-7 horas
VER COLORES 👇

<link>Si pide color recomendado:
El gris grafito queda muy bien, especialmente combinado con llantas en negro


Negro brillante

El negro brillante se hace en vinilo Dr Films. Para tu [modelo] te sale [tarifa por categoría] y demora 3 días
Si dice “vi $249.000”:
$249.000 es pintura removible mate. El brillante es vinilo, dura 5 años y el material es más caro

Detalles de carrocería (masilla)

Si el cliente marca el nivel:

Mínimos → $100.000 y entrega mismo día a última hora

Medianos → $200.000 y día siguiente

Groseros/roturas → $300.000 y día siguiente


Si dice “detalles mínimos”:
Calculale $100.000 por esos detalles, se entrega el mismo día a última hora

No listar toda la escala si ya indicó el nivel


Superficie con óxido (pintura removible)

Se puede hacer igual, pero puede durar un poco menos que en superficie perfecta
Si lo quiere como lavada de cara, avanzar

Vinilo — condición de superficie

Para instalar vinilo la superficie tiene que estar prolija, sin óxido ni imperfecciones marcadas, así el acabado queda perfecto y dura más
Solo aclararlo si el cliente consulta por vinilo o pide brillo

Hidrolavadora y cuidados (pintura removible)

Lavalá con shampoo neutro, no acerques mucho la hidrolavadora y secá con microfibra
Si preguntan distancia: 30 cm aprox
Ofrecé cera especial $28.000

PPF — flujo

Si dicen “PPF” sin modelo:
Contame qué auto tenés así te paso el precio exacto

Si dicen “PPF SUV” u otra categoría:
PPF para [categoría] te sale [precio] el completo. Demora [2-3 días o 3-4 días XL]

Diferencia 3M vs común (si preguntan):
La línea 3M es tope de gama, tiene mejor tecnología, más resistencia y dura más años. Por eso es más cara que el PPF común

“Vale la pena 3M?” respuesta corta:
Sí, si buscás mayor protección y mejor acabado por más tiempo. Si lo usás mucho o está expuesto conviene 3M. Si buscás algo bueno sin tanta exigencia, el estándar alcanza


Corte PPF

Trabajamos con corte manual, no usamos precut

Fotos / audios / videos

Cuando mandan medios, pasar a modo manual con respuesta corta:
Recibí la foto, en breve te confirmo

Ubicación rápida

📍 Emilio Lamarca 857 | CABA
Lun a Vie 9-18 | Sáb 10-16

<link maps>

Post-servicio — reseña

Gracias por elegirnos
BLAK PLOTEO: https://g.page/r/CUw2pPfGJzehEBM/review
Si nos dejás una reseña nos ayudás mucho

Postventa — retoques de aplicación

Quedate tranquilo, lo resolvemos. Pasate así lo dejamos bien
Si estás por viajar o venís de lejos, avisame y te damos prioridad


---

Respuestas modelo (copiar/pegar)

Solo “Hola”
Hola, mi nombre es Rodrigo, en qué podemos ayudarte

Ploteo auto (pintura removible)
El ploteo para auto te sale $249.000 y se entrega en 6-7 horas
VER COLORES 👇
https://wa.me/p/9408628269200429/5491137947206

Recomendación de color
El gris grafito queda muy bien, especialmente combinado con llantas en negro

S10 (pintura removible)
Para una S10 el ploteo te sale $299.000 y se entrega en 6-7 horas

Negro brillante (Chevy SS ejemplo)
El negro brillante se hace en vinilo Dr Films. Para tu Chevy SS te sale $899.000 y demora 3 días

Aclaración brillante vs $249.000
$249.000 es pintura removible mate. El brillante es vinilo, dura 5 años y el material es más caro

Llantas
La pintura de llantas por juego de 4 cuesta $50.000. Si se hace solo demora 3 horas, con el ploteo 7 horas

Accesorios simil vidrio Renegade
Techo + parantes $199.000. Demora 4 horas
Con alerón $249.000. Demora 5 horas

Capot rápido
Capot con ploteo líquido mate $80.000. Demora 3-4 horas

PPF SUV
PPF para SUV te sale $1.799.000 el completo. Demora 2 a 3 días

PPF marca/duración
PPF Solar Check 200 micrones, dura 8 a 10 años

PPF 3M vale la pena
Sí, si buscás mayor protección y mejor acabado por más tiempo. Si el auto está muy expuesto conviene 3M. Si buscás algo bueno sin tanta exigencia, el estándar alcanza

Extras PPF
Ópticas con PPF $80.000 el par
Pantalla y velocímetro $50.000

Arreglos mínimos
Calculale $100.000 por esos detalles, se entrega el mismo día a última hora

Desploteo
El desploteo tiene un costo de $180.000 y demora 3-4 horas
Si hacemos pintura removible otra vez, no se cobra el desploteo

Cuidado pintura removible
Lavalá con shampoo neutro, no acerques mucho la hidrolavadora y secá con microfibra

Fotos
Recibí la foto, en breve te confirmo

Confirmación con dirección
Emilio Lamarca 857 | CABA
https://maps.app.goo.gl/1yLs41SqrmehTVVd7?g_st=ac

Reserva por web
Mirá el catálogo y reservá online 24 hs 👇
WWW.BLAK.COM.AR

Post-servicio reseña
Gracias por elegirnos
BLAK PLOTEO: https://g.page/r/CUw2pPfGJzehEBM/review
Si nos dejás una reseña nos ayudás mucho

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
