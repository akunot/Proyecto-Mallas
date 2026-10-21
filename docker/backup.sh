#!/bin/sh
# Backup diario de la base de datos de la aplicación.
#
# Se ejecuta en un contenedor mysql:8.0 para usar el mysqldump oficial: el
# cliente MariaDB de Alpine no soporta caching_sha2_password (MySQL 8) y
# generaba dumps vacíos. Vive en un archivo aparte para que docker-compose
# 1.29 no intente interpolar los "$" del script.

DB_NAME="${DB_DATABASE:-mallas_db}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_DIR=/backups

# La contraseña va por variable de entorno, no en la línea de comandos
export MYSQL_PWD="${DB_PASSWORD}"

while true; do
    TS=$(date +%Y%m%d_%H%M%S)
    FILE="${BACKUP_DIR}/dump_${TS}.sql.gz"
    echo "[${TS}] Ejecutando backup de ${DB_NAME}..."

    if mysqldump -h mysql -u root --databases "${DB_NAME}" \
        --single-transaction --routines --triggers --no-tablespaces \
        > "${BACKUP_DIR}/.dump_${TS}.sql" \
        && gzip -c "${BACKUP_DIR}/.dump_${TS}.sql" > "${FILE}.tmp" \
        && mv "${FILE}.tmp" "${FILE}"; then
        echo "[$(date +%Y%m%d_%H%M%S)] Backup completo: ${FILE} ($(du -h "${FILE}" | cut -f1))"
        find "${BACKUP_DIR}" -name 'dump_*.sql*' -mtime +"${RETENTION_DAYS}" -delete
    else
        echo "[$(date +%Y%m%d_%H%M%S)] ERROR: el backup falló; se conservan los anteriores" >&2
        rm -f "${FILE}.tmp"
    fi
    rm -f "${BACKUP_DIR}/.dump_${TS}.sql"

    echo "Próximo backup en 24h..."
    sleep 86400
done
