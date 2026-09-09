#!/bin/bash

set -e

PROJECT_DIR="$HOME/mallas/Proyecto-Mallas"
SERVICE="app"

cd "$PROJECT_DIR"

echo "========================================"
echo "   DESPLIEGUE PROYECTO-MALLAS"
echo "========================================"
echo

echo "[1/7] Verificando rama..."
BRANCH=$(git branch --show-current)

if [ "$BRANCH" != "master" ]; then
    echo "ERROR: No estás en la rama master."
    echo "Rama actual: $BRANCH"
    exit 1
fi

echo "OK: rama master"
echo

echo "[2/7] Verificando cambios locales..."
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "ERROR: Hay cambios locales en archivos versionados."
    echo
    git status --short --untracked-files=no
    echo
    echo "Revisa los cambios antes de desplegar."
    exit 1
fi

echo "OK: no hay cambios locales en archivos versionados"
echo

echo "[3/7] Actualizando código..."
git pull --ff-only origin master
echo

echo "[4/7] Construyendo nueva imagen..."
docker-compose build "$SERVICE"
echo

echo "[5/7] Eliminando únicamente el contenedor anterior de app..."

OLD_CONTAINER=$(docker-compose ps -q "$SERVICE" 2>/dev/null || true)

if [ -n "$OLD_CONTAINER" ]; then
    echo "Contenedor anterior: $OLD_CONTAINER"
    docker rm -f "$OLD_CONTAINER"
    echo "OK: contenedor anterior eliminado"
else
    echo "No existe un contenedor anterior de app."
fi

echo

echo "[6/7] Creando nuevo contenedor app..."
docker-compose up -d --no-deps "$SERVICE"
echo

echo "[7/7] Verificando estado..."
sleep 5

docker-compose ps "$SERVICE"

echo
echo "Últimos logs del contenedor:"
docker-compose logs --tail=30 "$SERVICE"

echo
echo "========================================"
echo "   DESPLIEGUE FINALIZADO"
echo "========================================"
