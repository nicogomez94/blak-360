# Sistema de Tracking de Costos

## 📋 Descripción

Sistema completo de monitoreo y tracking de costos para el chatbot de WhatsApp que registra:

- **OpenAI**: Costo por tokens (input + output)
- **Meta WhatsApp**: Costo por conversación (ventana de 24 horas)

## 🚀 Instalación

### 1. Ejecutar Migración de Base de Datos

Primero, ejecuta la migración para crear las tablas necesarias:

```bash
# Conectar a PostgreSQL
psql -U postgres -d tu_base_de_datos

# Ejecutar migraciones en orden
\i migrations/init.sql
\i migrations/add_cost_tracking.sql
```

O si usas un cliente de SQL:

```sql
-- Ejecuta primero init.sql
-- Luego ejecuta add_cost_tracking.sql
```

### 2. Reiniciar el Servidor

```bash
npm start
```

## 📊 Panel de Monitoreo

Accede al panel en: **http://localhost:3001/panel**

### Características del Panel:

#### 🎯 Vista General (Cards)
- **OpenAI**: Costo total, número de llamadas, tokens utilizados
- **Meta WhatsApp**: Costo total, número de conversaciones
- **Total**: Costo combinado de ambos servicios

#### 📈 Gráficos
1. **Costos por Día**: Gráfico de líneas mostrando evolución diaria
2. **Distribución de Costos**: Gráfico circular mostrando proporción OpenAI vs Meta

#### 👥 Top Contactos
Tabla mostrando los contactos con mayor costo, incluyendo:
- Nombre del contacto
- Número de teléfono
- Costo por servicio (OpenAI y Meta)
- Total acumulado
- Número de llamadas/conversaciones

#### ⚙️ Configuración de Precios
Actualiza los precios de los servicios cuando cambien.

### Períodos de Tiempo

- **Últimas 24 horas**: Vista de actividad reciente
- **Últimos 7 días** (por defecto): Vista semanal
- **Últimos 30 días**: Vista mensual
- **Todo el tiempo**: Histórico completo

## 💰 Cómo Funciona el Tracking

### OpenAI
Cada vez que se procesa un mensaje con OpenAI:

1. Se registra el número de tokens de entrada (prompt)
2. Se registra el número de tokens de salida (respuesta)
3. Se calcula el costo basado en:
   - Input: $0.0005 por 1000 tokens
   - Output: $0.0015 por 1000 tokens
4. Se guarda en la tabla `openai_costs`

### Meta WhatsApp
Cada vez que se envía un mensaje por WhatsApp:

1. Se verifica si hay un costo registrado en las últimas 24 horas
2. Si NO hay costo reciente (nueva conversación):
   - Se registra un costo de $0.0085 por conversación
   - Se guarda en la tabla `meta_costs`
3. Si YA hay costo reciente (misma ventana de 24h):
   - No se cobra nuevamente (Meta cobra por ventana de conversación)

**Importante**: Meta cobra por "ventana de conversación" de 24 horas, no por mensaje individual.

## 🗄️ Estructura de Base de Datos

### Tabla: `openai_costs`
```sql
- id: Identificador único
- phone_number: Número de teléfono
- message_id: Referencia al mensaje (opcional)
- model: Modelo usado (ej: gpt-3.5-turbo)
- input_tokens: Tokens de entrada
- output_tokens: Tokens de salida
- total_tokens: Total (calculado automáticamente)
- input_cost: Costo de entrada en USD
- output_cost: Costo de salida en USD
- total_cost: Costo total (calculado automáticamente)
- created_at: Fecha y hora del registro
```

### Tabla: `meta_costs`
```sql
- id: Identificador único
- phone_number: Número de teléfono
- conversation_id: Referencia a la conversación
- message_id: ID del mensaje de Meta (opcional)
- conversation_category: Tipo (service, marketing, utility, authentication)
- cost: Costo en USD
- created_at: Fecha y hora del registro
```

### Tabla: `pricing_config`
```sql
- id: Identificador único
- service: Nombre del servicio (openai_gpt35, meta_whatsapp)
- metric: Métrica (input_token_1k, output_token_1k, conversation)
- price_per_unit: Precio por unidad
- currency: Moneda (USD)
- updated_at: Última actualización
- notes: Notas adicionales
```

## 🔌 API Endpoints

### GET `/panel/costs/summary`
Obtener resumen de costos

**Query Params:**
- `period`: 24h, 7d, 30d, all (default: 7d)
- `startDate`: Fecha inicio (opcional)
- `endDate`: Fecha fin (opcional)

**Respuesta:**
```json
{
  "period": { "start": "...", "end": "...", "label": "7d" },
  "openai": {
    "calls": 150,
    "totalInputTokens": 25000,
    "totalOutputTokens": 18000,
    "totalTokens": 43000,
    "totalCost": 0.0395
  },
  "meta": {
    "conversations": 45,
    "totalCost": 0.3825
  },
  "total": {
    "totalCost": 0.422,
    "currency": "USD"
  }
}
```

### GET `/panel/costs/daily`
Obtener costos desglosados por día

**Query Params:**
- `days`: Número de días (default: 30)

### GET `/panel/costs/by-phone`
Obtener costos por número de teléfono

**Query Params:**
- `limit`: Número de resultados (default: 50)
- `days`: Período en días (default: 30)

### GET `/panel/pricing`
Obtener configuración de precios actual

### PUT `/panel/pricing/:service/:metric`
Actualizar precio de un servicio

**Body:**
```json
{
  "price": 0.0006
}
```

## 📈 Precios Actuales (Febrero 2026)

### OpenAI GPT-3.5-turbo
- Input: $0.0005 por 1000 tokens
- Output: $0.0015 por 1000 tokens

### Meta WhatsApp
- Conversación: $0.0085 promedio
- Categoría "service" (soporte)
- Ventana de 24 horas

## ⚠️ Notas Importantes

1. **Ventana de Conversación**: Meta cobra por ventana de 24 horas. El sistema automáticamente detecta si ya existe un costo registrado en las últimas 24 horas para evitar duplicados.

2. **Actualización de Precios**: Los precios pueden cambiar. Actualízalos desde el panel cuando sea necesario.

3. **Moneda**: Todos los costos están en USD.

4. **Auto-refresh**: El panel se actualiza automáticamente cada 60 segundos.

5. **Persistencia**: Los datos se guardan en PostgreSQL y persisten al reiniciar el servidor.

## 🔧 Mantenimiento

### Limpiar Datos Antiguos
Puedes ejecutar queries manuales para limpiar datos muy antiguos:

```sql
-- Eliminar costos de OpenAI mayores a 90 días
DELETE FROM openai_costs WHERE created_at < NOW() - INTERVAL '90 days';

-- Eliminar costos de Meta mayores a 90 días
DELETE FROM meta_costs WHERE created_at < NOW() - INTERVAL '90 days';
```

### Verificar Costos Totales
```sql
-- Total general de costos
SELECT 
  SUM(total_cost) as total_openai 
FROM openai_costs;

SELECT 
  SUM(cost) as total_meta 
FROM meta_costs;
```

## 🎨 Personalización

### Cambiar Colores del Panel
Edita [public/panel.css](public/panel.css) y modifica las variables CSS en `:root`.

### Ajustar Períodos de Auto-refresh
Edita [public/panel.js](public/panel.js) y cambia el valor en `setInterval` (línea ~35):

```javascript
// Auto-refresh cada 60 segundos (60000ms)
setInterval(loadAllData, 60000);
```

## 📞 Soporte

Para problemas o preguntas, revisa los logs del servidor:

```bash
npm start
```

Los eventos de tracking se registran con emojis específicos:
- 💵 Costo registrado
- 🔄 Conversación dentro de ventana de 24h
- ❌ Error registrando costos

## 🚀 Próximas Mejoras

- [ ] Exportar reportes a CSV/PDF
- [ ] Alertas cuando se supere un umbral de costo
- [ ] Proyección de costos mensual
- [ ] Comparación de períodos
- [ ] Dashboard en tiempo real con WebSocket
