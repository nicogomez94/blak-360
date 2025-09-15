#!/bin/bash

echo "🚀 Iniciando entorno de desarrollo con Sandbox..."
echo ""

# Cargar variables de entorno de desarrollo
export NODE_ENV=development
export SANDBOX_MODE=true

# Verificar si ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok no está instalado."
    echo "Instalá ngrok desde: https://ngrok.com/"
    exit 1
fi

# Función para cleanup
cleanup() {
    echo ""
    echo "🔄 Cerrando servicios..."
    kill $NGROK_PID 2>/dev/null
    kill $NODE_PID 2>/dev/null
    exit 0
}

# Trap para cleanup al salir
trap cleanup SIGINT SIGTERM

echo "📡 Iniciando ngrok..."
ngrok http 3001 &
NGROK_PID=$!

# Esperar a que ngrok se inicie
sleep 3

# Obtener la URL pública de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ "$NGROK_URL" != "null" ] && [ ! -z "$NGROK_URL" ]; then
    echo "✅ ngrok activo en: $NGROK_URL"
    echo ""
    echo "📋 Para configurar el webhook del sandbox:"
    echo "URL: $NGROK_URL/webhook/whatsapp"
    echo ""
else
    echo "❌ Error obteniendo URL de ngrok"
    exit 1
fi

echo "🚀 Iniciando servidor Node.js..."
npm start &
NODE_PID=$!

echo ""
echo "🎯 Entorno de desarrollo activo:"
echo "   • Servidor local: http://localhost:3001"
echo "   • Dashboard: http://localhost:3001/admin"
echo "   • Webhook público: $NGROK_URL/webhook/whatsapp"
echo ""
echo "📱 Configurá el sandbox de 360dialog con la URL del webhook"
echo "💡 Presioná Ctrl+C para parar todos los servicios"

# Mantener el script corriendo
wait
