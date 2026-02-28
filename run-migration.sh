#!/bin/bash

# Script para ejecutar migraciones en Render (Linux)
# Este script usa las variables de entorno directamente, sin archivos .env

echo "🚀 Ejecutando migración de tracking de costos..."
echo ""

# Verificar si DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurada"
    echo "Configura la variable de entorno DATABASE_URL en Render"
    exit 1
fi

echo "✅ DATABASE_URL encontrada"
echo ""

# Verificar si psql está instalado
if ! command -v psql &> /dev/null; then
    echo "⚠️ psql no está disponible, intentando con node-postgres..."
    
    # Si no hay psql, intentar ejecutar con node
    if command -v node &> /dev/null; then
        node migrations/run-migration.js
        exit $?
    else
        echo "❌ Error: No se puede ejecutar la migración"
        exit 1
    fi
fi

echo "📝 Ejecutando migración: add_cost_tracking.sql"
echo ""

# Ejecutar la migración
psql "$DATABASE_URL" -f migrations/add_cost_tracking.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Migración completada exitosamente!"
    echo ""
    echo "🎉 El sistema de tracking de costos está listo"
    echo ""
else
    echo ""
    echo "⚠️ Error ejecutando la migración (puede ser que ya exista)"
    echo "Continuando de todos modos..."
    echo ""
fi
