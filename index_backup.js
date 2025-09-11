/**
 * Backup del archivo index.js original
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const openaiService = require('./services/openai');
const messageService = require('./services/messaging');
const conversationService = require('./services/conversation');

const app = express();
const PORT = process.env.PORT || 3001;

// Backup completo guardado para referencia
