/**
 * Ventana horaria del chatbot automático.
 *
 * El horario se evalúa en la zona configurada, no en la zona del servidor
 * (el servidor puede ejecutarse en UTC). Por defecto el bot atiende de 18:00 a 09:00
 * hora de Argentina, dejando el horario de la operadora (09:00–18:00) libre.
 */

const { getChatbotSettings } = require('./chatbot-settings');

async function getChatbotSchedule() {
  return getChatbotSettings();
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

function isWithinChatbotWindow(date, schedule) {
  const { activeFrom, activeUntil, timezone } = schedule;
  const hour = getLocalHour(date, timezone);

  if (activeFrom === activeUntil) return true;
  if (activeFrom > activeUntil) {
    return hour >= activeFrom || hour < activeUntil;
  }
  return hour >= activeFrom && hour < activeUntil;
}

async function isChatbotActiveNow(date = new Date()) {
  const schedule = await getChatbotSchedule();
  return schedule.enabled && isWithinChatbotWindow(date, schedule);
}

module.exports = {
  getChatbotSchedule,
  getLocalHour,
  isWithinChatbotWindow,
  isChatbotActiveNow
};
