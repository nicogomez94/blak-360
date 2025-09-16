# 🚀 Guía de Deployment en Vercel con PostgreSQL

## 📋 Checklist de configuración

### 1. ✅ Base de datos configurada
- [x] Neon PostgreSQL creado
- [x] DATABASE_URL obtenida
- [x] Archivo de migración creado (`migrations/init.sql`)
- [x] Script de inicialización creado (`config/database-init.js`)

### 2. 🔧 Variables de entorno en Vercel

En tu proyecto Vercel → **Settings** → **Environment Variables**, agregá:

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_OPENAI_API_KEY_HERE

# 360dialog Production
D360_API_KEY=YOUR_ACTUAL_D360_API_KEY_HERE
D360_API_URL=https://waba-v2.360dialog.io
D360_PHONE_NUMBER=whatsapp:+YOUR_PHONE_NUMBER_HERE

# Database (la que te dio Neon)
DATABASE_URL=postgresql://usuario:password@ep-xxxxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Environment
NODE_ENV=production
```

### 3. 📦 Deployment

```bash
# 1. Commit todos los cambios
git add .
git commit -m "Add database migration and production config"

# 2. Push a main (Vercel despliega automáticamente)
git push origin main
```

### 4. 🔗 Configurar Webhook de 360dialog

Una vez deployado, ejecutá este comando para configurar el webhook:

```bash
curl --request POST \
  --url https://waba-v2.360dialog.io/v1/configs/webhook \
  --header 'Content-Type: application/json' \
  --header 'D360-Api-Key: YOUR_ACTUAL_D360_API_KEY_HERE' \
  --data '{"url": "https://blak-360d.vercel.app/webhook/whatsapp"}'
```

### 5. ✅ Verificar que todo funciona

1. **Dashboard**: https://blak-360d.vercel.app/admin/dashboard
2. **Health Check**: https://blak-360d.vercel.app/health
3. **Webhook**: Enviá un mensaje de WhatsApp para probar

---

## 🐛 Troubleshooting

### Si las tablas no se crean automáticamente:

1. Conectate a Neon Console
2. Ejecutá manualmente el contenido de `migrations/init.sql`
3. Redesplegá en Vercel

### Si hay errores de conexión:

1. Verificá que `DATABASE_URL` esté bien configurada
2. Asegurate de que incluya `?sslmode=require`
3. Revisá los logs de Vercel

---

## 🎯 Resultado esperado

- ✅ App deployada en https://blak-360d.vercel.app
- ✅ Base de datos PostgreSQL funcionando
- ✅ Webhook de 360dialog configurado
- ✅ Dashboard admin accesible
- ✅ Mensajes de WhatsApp procesándose automáticamente

## 🔄 Para desarrollo local (Sandbox)

Para que funcione el entorno de desarrollo con el sandbox, ejecutá:

```bash
npm run dev:sandbox
```

O también podés usar el script:

```bash
./dev-start.sh
```

Esto iniciará:
- Servidor local en puerto 3001
- ngrok para webhook público
- Conexión a base de datos local o remota
