/**
 * Configuración operativa del chatbot.
 *
 * Se guarda exclusivamente en el schema aislado blak_chatbot para que los
 * cambios hechos desde el dashboard persistan entre reinicios y despliegues.
 */

const db = require('../config/database');

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';
const DEFAULT_ACTIVE_FROM = 18;
const DEFAULT_ACTIVE_UNTIL = 9;

function readEnvironmentHour(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

function getDefaultSettings() {
  return {
    enabled: process.env.CHATBOT_ENABLED === 'true',
    activeFrom: readEnvironmentHour('CHATBOT_ACTIVE_FROM', DEFAULT_ACTIVE_FROM),
    activeUntil: readEnvironmentHour('CHATBOT_ACTIVE_UNTIL', DEFAULT_ACTIVE_UNTIL),
    timezone: process.env.CHATBOT_TIMEZONE || DEFAULT_TIMEZONE
  };
}

function validateHour(value, name) {
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`${name} debe ser una hora entera entre 0 y 23`);
  }
  return hour;
}

async function ensureSettingsTable() {
  if (!db.isDatabaseConfigured) return;

  const defaults = getDefaultSettings();
  await db.query(`
    CREATE TABLE IF NOT EXISTS chatbot_settings (
      id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
      enabled BOOLEAN NOT NULL DEFAULT false,
      active_from SMALLINT NOT NULL CHECK (active_from BETWEEN 0 AND 23),
      active_until SMALLINT NOT NULL CHECK (active_until BETWEEN 0 AND 23),
      timezone VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    INSERT INTO chatbot_settings (id, enabled, active_from, active_until, timezone)
    VALUES (true, $1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING
  `, [defaults.enabled, defaults.activeFrom, defaults.activeUntil, defaults.timezone]);
}

async function getChatbotSettings() {
  const defaults = getDefaultSettings();
  if (!db.isDatabaseConfigured) return defaults;

  await ensureSettingsTable();
  const result = await db.query(`
    SELECT enabled, active_from, active_until, timezone
    FROM chatbot_settings
    WHERE id = true
  `);
  const settings = result.rows[0];
  if (!settings) return defaults;

  return {
    enabled: settings.enabled,
    activeFrom: settings.active_from,
    activeUntil: settings.active_until,
    timezone: settings.timezone
  };
}

async function updateChatbotSettings(input = {}) {
  if (!db.isDatabaseConfigured) {
    throw new Error('La configuración persistente requiere PostgreSQL');
  }

  await ensureSettingsTable();
  const current = await getChatbotSettings();
  const next = {
    enabled: Object.hasOwn(input, 'enabled') ? input.enabled : current.enabled,
    activeFrom: Object.hasOwn(input, 'activeFrom') ? input.activeFrom : current.activeFrom,
    activeUntil: Object.hasOwn(input, 'activeUntil') ? input.activeUntil : current.activeUntil,
    timezone: current.timezone
  };

  if (typeof next.enabled !== 'boolean') {
    throw new Error('enabled debe ser verdadero o falso');
  }
  next.activeFrom = validateHour(next.activeFrom, 'activeFrom');
  next.activeUntil = validateHour(next.activeUntil, 'activeUntil');

  await db.query(`
    UPDATE chatbot_settings
    SET enabled = $1, active_from = $2, active_until = $3, updated_at = NOW()
    WHERE id = true
  `, [next.enabled, next.activeFrom, next.activeUntil]);

  return next;
}

module.exports = {
  getChatbotSettings,
  updateChatbotSettings
};
