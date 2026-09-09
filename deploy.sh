#!/bin/bash

set -e

PROJECT_DIR="$HOME/mallas/Proyecto-Mallas"
SERVICE="app"

cd "$PROJECT_DIR"

echo "========================================"
echo "   DESPLIEGUE PROYECTO-MALLAS"
echo "========================================"
echo

echo "[1/6] Verificando rama..."
BRANCH=$(git branch --show-current)

if [ "$BRANCH" != "master" ]; then
    echo "ERROR: No estás en la rama master. Rama actual: $BRANCH"
    exit 1
fi

echo "OK: rama master"
echo

echo "[2/6] Verificando cambios locales..."

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

echo "OK: árbol de trabajo limpio"
echo

echo "[3/6] Actualizando código..."
git pull --ff-only origin master
echo

echo "[4/6] Construyendo nueva imagen..."
docker-compose build "$SERVICE"
echo

echo "[5/6] Recreando únicamente el servicio app..."
docker-compose up -d --force-recreate "$SERVICE"
echo

echo "[6/6] Verificando estado..."
sleep 5

docker-compose ps "$SERVICE"

echo
echo "Últimos logs del contenedor:"
docker-compose logs --tail=30 "$SERVICE"

echo
echo "========================================"
echo "   DESPLIEGUE FINALIZADO"
echo "========================================"
