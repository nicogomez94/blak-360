/**
 * Ventana horaria del chatbot automático.
 *
 * El horario se evalúa en la zona configurada, no en la zona del servidor
 * (Render suele ejecutar en UTC). Por defecto el bot atiende de 18:00 a 09:00
 * hora de Argentina, dejando el horario de la operadora (09:00–18:00) libre.
 */

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';
const DEFAULT_ACTIVE_FROM = 18;
const DEFAULT_ACTIVE_UNTIL = 9;

function readHour(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

function getChatbotSchedule() {
  return {
    timezone: process.env.CHATBOT_TIMEZONE || DEFAULT_TIMEZONE,
    activeFrom: readHour('CHATBOT_ACTIVE_FROM', DEFAULT_ACTIVE_FROM),
    activeUntil: readHour('CHATBOT_ACTIVE_UNTIL', DEFAULT_ACTIVE_UNTIL)
  };
}

function getLocalHour(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  // Some Intl implementations render midnight as 24; normalize it to 0.
  return hour === 24 ? 0 : hour;
}

function isWithinChatbotWindow(date = new Date()) {
  const { activeFrom, activeUntil, timezone } = getChatbotSchedule();
  const hour = getLocalHour(date, timezone);

  if (activeFrom === activeUntil) return true;
  if (activeFrom > activeUntil) {
    return hour >= activeFrom || hour < activeUntil;
  }
  return hour >= activeFrom && hour < activeUntil;
}

function isChatbotActiveNow(date = new Date()) {
  return process.env.CHATBOT_ENABLED === 'true' && isWithinChatbotWindow(date);
}

module.exports = {
  getChatbotSchedule,
  getLocalHour,
  isWithinChatbotWindow,
  isChatbotActiveNow
};
