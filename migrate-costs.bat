@echo off
REM Script para ejecutar la migración de tracking de costos en Windows
REM Uso: migrate-costs.bat

echo 🚀 Iniciando migración de tracking de costos...
echo.

REM Verificar si existe .env.development
if not exist .env.development (
    echo ❌ Error: No se encuentra .env.development
    echo Por favor crea el archivo .env.development con la variable DATABASE_URL
    pause
    exit /b 1
)

echo ✅ Archivo .env.development encontrado
echo.

REM Leer DATABASE_URL del archivo .env.development
for /f "tokens=1,2 delims==" %%a in ('findstr /r "^DATABASE_URL=" .env.development') do set DATABASE_URL=%%b

if "%DATABASE_URL%"=="" (
    echo ❌ Error: DATABASE_URL no está configurada en .env.development
    pause
    exit /b 1
)

echo ✅ DATABASE_URL encontrada
echo.

REM Verificar si psql está instalado
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: psql no está instalado o no está en PATH
    echo.
    echo Opciones:
    echo 1. Instala PostgreSQL desde: https://www.postgresql.org/download/windows/
    echo 2. O agrega psql.exe al PATH de Windows
    echo 3. O ejecuta manualmente la migración desde pgAdmin o tu cliente SQL favorito
    echo.
    echo Archivo de migración: migrations\add_cost_tracking.sql
    echo.
    pause
    exit /b 1
)

echo 📝 Ejecutando migración: add_cost_tracking.sql
echo.

REM Ejecutar la migración
psql "%DATABASE_URL%" -f migrations\add_cost_tracking.sql

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡Migración completada exitosamente!
    echo.
    echo 🎉 El sistema de tracking de costos está listo para usar
    echo.
    echo 📍 Accede al panel en: http://localhost:3001/panel
    echo.
) else (
    echo.
    echo ❌ Error ejecutando la migración
    echo.
    echo Si tienes problemas con psql, puedes ejecutar la migración manualmente:
    echo 1. Abre pgAdmin o tu cliente SQL favorito
    echo 2. Conecta a tu base de datos
    echo 3. Ejecuta el archivo: migrations\add_cost_tracking.sql
    echo.
)

pause
