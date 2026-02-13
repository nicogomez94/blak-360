# 🚀 Inicio Rápido - Sistema de Tracking de Costos

## 1️⃣ Ejecutar Migración

### En Windows:
```cmd
migrate-costs.bat
```

### En Linux/Mac:
```bash
chmod +x migrate-costs.sh
./migrate-costs.sh
```

### Manualmente (si los scripts no funcionan):
1. Abre tu cliente SQL favorito (pgAdmin, DBeaver, etc.)
2. Conecta a tu base de datos
3. Ejecuta el archivo `migrations/add_cost_tracking.sql`

## 2️⃣ Reiniciar el Servidor

```bash
npm start
```

## 3️⃣ Acceder al Panel

Abre tu navegador en: **http://localhost:3001/panel**

## ✅ ¡Listo!

El sistema ahora está trackeando automáticamente:
- ✅ Costos de OpenAI (por tokens)
- ✅ Costos de Meta WhatsApp (por conversación)

## 📚 Documentación Completa

Lee [TRACKING_COSTOS.md](TRACKING_COSTOS.md) para detalles completos sobre:
- Cómo funciona el sistema
- API endpoints disponibles
- Estructura de la base de datos
- Personalización del panel
- Y mucho más...

## 🎯 Características del Panel

- 📊 Vista general de costos
- 📈 Gráficos de tendencias diarias
- 👥 Top contactos por costo
- ⚙️ Configuración de precios
- 🔄 Auto-actualización cada 60 segundos

---

**Nota**: Si tienes algún problema, revisa los logs del servidor con `npm start` y busca mensajes con 💵 (costos registrados) o ❌ (errores).
