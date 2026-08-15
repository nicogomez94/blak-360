/**
 * Rutas para el panel de monitoreo de costos
 * Endpoint: /panel
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

router.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/') {
    return next();
  }
  return requireAuth(req, res, next);
});

/**
 * GET /panel/costs/summary
 * Obtener resumen de costos
 */
router.get('/costs/summary', async (req, res) => {
  try {
    const { startDate, endDate, period = '7d' } = req.query;

    // Calcular fechas si no se proporcionan
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();
      
      // Calcular fecha de inicio según el periodo
      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case 'all':
          start = new Date('2020-01-01');
          break;
        default:
          start.setDate(start.getDate() - 7);
      }
    }

    // Costos de OpenAI
    const openaiCosts = await db.query(
      `SELECT 
        COUNT(*) as call_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost
       FROM openai_costs
       WHERE created_at >= $1 AND created_at <= $2`,
      [start, end]
    );

    // Costos de Meta
    const metaCosts = await db.query(
      `SELECT 
        COUNT(*) as conversation_count,
        SUM(cost) as total_cost
       FROM meta_costs
       WHERE created_at >= $1 AND created_at <= $2`,
      [start, end]
    );

    // Total combinado
    const totalOpenAI = parseFloat(openaiCosts.rows[0]?.total_cost || 0);
    const totalMeta = parseFloat(metaCosts.rows[0]?.total_cost || 0);
    const totalCost = totalOpenAI + totalMeta;

    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: period
      },
      openai: {
        calls: parseInt(openaiCosts.rows[0]?.call_count || 0),
        totalInputTokens: parseInt(openaiCosts.rows[0]?.total_input_tokens || 0),
        totalOutputTokens: parseInt(openaiCosts.rows[0]?.total_output_tokens || 0),
        totalTokens: parseInt(openaiCosts.rows[0]?.total_tokens || 0),
        totalCost: totalOpenAI
      },
      meta: {
        conversations: parseInt(metaCosts.rows[0]?.conversation_count || 0),
        totalCost: totalMeta
      },
      total: {
        totalCost: totalCost,
        currency: 'USD'
      }
    });

  } catch (error) {
    console.error('Error obteniendo resumen de costos:', error);
    res.status(500).json({
      error: 'Error obteniendo resumen de costos',
      message: error.message
    });
  }
});

/**
 * GET /panel/costs/daily
 * Obtener costos desglosados por día
 */
router.get('/costs/daily', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Costos diarios de OpenAI
    const openaiDaily = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as call_count,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost
       FROM openai_costs
       WHERE created_at >= $1
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate]
    );

    // Costos diarios de Meta
    const metaDaily = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as conversation_count,
        SUM(cost) as total_cost
       FROM meta_costs
       WHERE created_at >= $1
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate]
    );

    // Combinar resultados por fecha
    const dailyCosts = {};
    
    openaiDaily.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      dailyCosts[dateStr] = {
        date: dateStr,
        openai: {
          calls: parseInt(row.call_count),
          tokens: parseInt(row.total_tokens),
          cost: parseFloat(row.total_cost)
        },
        meta: {
          conversations: 0,
          cost: 0
        },
        total: parseFloat(row.total_cost)
      };
    });

    metaDaily.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (!dailyCosts[dateStr]) {
        dailyCosts[dateStr] = {
          date: dateStr,
          openai: { calls: 0, tokens: 0, cost: 0 },
          meta: { conversations: 0, cost: 0 },
          total: 0
        };
      }
      dailyCosts[dateStr].meta = {
        conversations: parseInt(row.conversation_count),
        cost: parseFloat(row.total_cost)
      };
      dailyCosts[dateStr].total += parseFloat(row.total_cost);
    });

    // Convertir a array y ordenar por fecha descendente
    const dailyArray = Object.values(dailyCosts).sort((a, b) => 
      b.date.localeCompare(a.date)
    );

    res.json({
      days: parseInt(days),
      data: dailyArray
    });

  } catch (error) {
    console.error('Error obteniendo costos diarios:', error);
    res.status(500).json({
      error: 'Error obteniendo costos diarios',
      message: error.message
    });
  }
});

/**
 * GET /panel/costs/by-phone
 * Obtener costos por número de teléfono
 */
router.get('/costs/by-phone', async (req, res) => {
  try {
    const { limit = 50, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Costos por teléfono (OpenAI)
    const openaiByPhone = await db.query(
      `SELECT 
        phone_number,
        COUNT(*) as call_count,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost
       FROM openai_costs
       WHERE created_at >= $1
       GROUP BY phone_number
       ORDER BY total_cost DESC
       LIMIT $2`,
      [startDate, parseInt(limit)]
    );

    // Costos por teléfono (Meta)
    const metaByPhone = await db.query(
      `SELECT 
        phone_number,
        COUNT(*) as conversation_count,
        SUM(cost) as total_cost
       FROM meta_costs
       WHERE created_at >= $1
       GROUP BY phone_number
       ORDER BY total_cost DESC
       LIMIT $2`,
      [startDate, parseInt(limit)]
    );

    // Obtener nombres de contacto
    const phoneNumbers = [...new Set([
      ...openaiByPhone.rows.map(r => r.phone_number),
      ...metaByPhone.rows.map(r => r.phone_number)
    ])];

    const contactNames = {};
    if (phoneNumbers.length > 0) {
      const contactsResult = await db.query(
        `SELECT phone_number, contact_name FROM conversations WHERE phone_number = ANY($1)`,
        [phoneNumbers]
      );
      contactsResult.rows.forEach(row => {
        contactNames[row.phone_number] = row.contact_name;
      });
    }

    // Combinar resultados
    const costsByPhone = {};
    
    openaiByPhone.rows.forEach(row => {
      costsByPhone[row.phone_number] = {
        phoneNumber: row.phone_number,
        contactName: contactNames[row.phone_number] || 'Desconocido',
        openai: {
          calls: parseInt(row.call_count),
          tokens: parseInt(row.total_tokens),
          cost: parseFloat(row.total_cost)
        },
        meta: {
          conversations: 0,
          cost: 0
        },
        total: parseFloat(row.total_cost)
      };
    });

    metaByPhone.rows.forEach(row => {
      if (!costsByPhone[row.phone_number]) {
        costsByPhone[row.phone_number] = {
          phoneNumber: row.phone_number,
          contactName: contactNames[row.phone_number] || 'Desconocido',
          openai: { calls: 0, tokens: 0, cost: 0 },
          meta: { conversations: 0, cost: 0 },
          total: 0
        };
      }
      costsByPhone[row.phone_number].meta = {
        conversations: parseInt(row.conversation_count),
        cost: parseFloat(row.total_cost)
      };
      costsByPhone[row.phone_number].total += parseFloat(row.total_cost);
    });

    // Convertir a array y ordenar por costo total
    const phoneArray = Object.values(costsByPhone).sort((a, b) => 
      b.total - a.total
    );

    res.json({
      limit: parseInt(limit),
      days: parseInt(days),
      data: phoneArray
    });

  } catch (error) {
    console.error('Error obteniendo costos por teléfono:', error);
    res.status(500).json({
      error: 'Error obteniendo costos por teléfono',
      message: error.message
    });
  }
});

/**
 * GET /panel/pricing
 * Obtener configuración de precios
 */
router.get('/pricing', async (req, res) => {
  try {
    const pricingResult = await db.query(
      `SELECT service, metric, price_per_unit, currency, updated_at, notes 
       FROM pricing_config 
       ORDER BY service, metric`
    );

    res.json({
      pricing: pricingResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo configuración de precios:', error);
    res.status(500).json({
      error: 'Error obteniendo configuración de precios',
      message: error.message
    });
  }
});

/**
 * PUT /panel/pricing/:service/:metric
 * Actualizar precio de un servicio
 */
router.put('/pricing/:service/:metric', async (req, res) => {
  try {
    const { service, metric } = req.params;
    const { price } = req.body;

    if (!price || isNaN(price)) {
      return res.status(400).json({
        error: 'Precio inválido',
        message: 'El precio debe ser un número válido'
      });
    }

    await db.query(
      `UPDATE pricing_config 
       SET price_per_unit = $1, updated_at = NOW()
       WHERE service = $2 AND metric = $3`,
      [parseFloat(price), service, metric]
    );

    res.json({
      success: true,
      message: 'Precio actualizado correctamente',
      service,
      metric,
      newPrice: parseFloat(price)
    });

  } catch (error) {
    console.error('Error actualizando precio:', error);
    res.status(500).json({
      error: 'Error actualizando precio',
      message: error.message
    });
  }
});

module.exports = router;
