@echo off
echo 🚀 Iniciando entorno de desarrollo con Sandbox...
echo.

:: Configurar variables de entorno
set NODE_ENV=development
set SANDBOX_MODE=true

:: Verificar si ngrok está instalado
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ngrok no está instalado.
    echo Instala ngrok desde: https://ngrok.com/
    pause
    exit /b 1
)

echo 📡 Iniciando ngrok...
start /b ngrok http 3001

:: Esperar a que ngrok se inicie
timeout /t 5 /nobreak > nul

echo ✅ ngrok iniciado
echo.
echo 📋 Para obtener la URL pública:
echo    Ve a http://localhost:4040 en tu navegador
echo.

echo 🚀 Iniciando servidor Node.js...
npm start

pause
