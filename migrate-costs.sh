#!/bin/bash

# Script para ejecutar la migración de tracking de costos
# Uso: ./migrate-costs.sh

echo "🚀 Iniciando migración de tracking de costos..."
echo ""

# Verificar si existe .env.development
if [ ! -f .env.development ]; then
    echo "❌ Error: No se encuentra .env.development"
    echo "Por favor crea el archivo .env.development con la variable DATABASE_URL"
    exit 1
fi

# Cargar variables de entorno
export $(cat .env.development | grep DATABASE_URL | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurada en .env.development"
    exit 1
fi

echo "✅ DATABASE_URL encontrada"
echo ""

# Extraer información de la URL de PostgreSQL
# Formato: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 Conectando a PostgreSQL..."
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Verificar si psql está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql no está instalado"
    echo "Instala PostgreSQL client para continuar"
    exit 1
fi

echo "📝 Ejecutando migración: add_cost_tracking.sql"
echo ""

# Ejecutar la migración
psql "$DATABASE_URL" -f migrations/add_cost_tracking.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Migración completada exitosamente!"
    echo ""
    echo "🎉 El sistema de tracking de costos está listo para usar"
    echo ""
    echo "📍 Accede al panel en: http://localhost:3001/panel"
    echo ""
else
    echo ""
    echo "❌ Error ejecutando la migración"
    echo "Revisa los mensajes de error arriba"
    exit 1
fi
