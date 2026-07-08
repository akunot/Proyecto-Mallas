#!/bin/sh
set -e

# Remove any default nginx configs
rm -rf /etc/nginx/conf.d/* /etc/nginx/http.d/* 2>/dev/null || true

# Generate .env from environment if missing
if [ ! -f /var/www/html/.env ]; then
    cat > /var/www/html/.env << EOF
APP_NAME=${APP_NAME:-Mallas}
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=${APP_URL:-http://localhost}
DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-mallas_db}
DB_USERNAME=${DB_USERNAME:-root}
DB_PASSWORD=${DB_PASSWORD}
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PASSWORD=${REDIS_PASSWORD:-null}
REDIS_PORT=${REDIS_PORT:-6379}
SESSION_DRIVER=${SESSION_DRIVER:-redis}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-redis}
CACHE_STORE=${CACHE_STORE:-redis}
LOG_CHANNEL=${LOG_CHANNEL:-daily}
LOG_DAILY_DAYS=${LOG_DAILY_DAYS:-30}
LOG_LEVEL=${LOG_LEVEL:-error}
MAIL_MAILER=${MAIL_MAILER:-log}
EOF
fi

# Wait for MySQL to be ready
if [ -n "$DB_HOST" ]; then
    echo "Waiting for MySQL..."
    max_tries=60
    counter=0
    connected=false
    while [ "$connected" = false ] && [ $counter -lt $max_tries ]; do
        if php -r "
            try {
                new PDO(
                    'mysql:host=$DB_HOST;port=${DB_PORT:-3306}',
                    '$DB_USERNAME',
                    '$DB_PASSWORD',
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                exit(0);
            } catch (PDOException \$e) {
                exit(1);
            }
        " 2>/dev/null; then
            connected=true
            echo "MySQL is ready."
        else
            counter=$((counter + 1))
            sleep 2
        fi
    done
    if [ "$connected" = false ]; then
        echo "Warning: MySQL not available after $max_tries attempts, continuing..."
    fi
fi

# Create storage link
php /var/www/html/artisan storage:link --force --no-interaction || true

# Create storage/logs directory if missing (for supervisord/nginx logs)
mkdir -p /var/www/html/storage/logs
chown app:app /var/www/html/storage/logs

# Run migrations
echo ""
echo "=============================================="
echo "  Running database migrations..."
echo "=============================================="
php /var/www/html/artisan migrate --force --no-interaction || true

# Run seeders only if no data exists (safe for restarts)
echo ""
echo "=============================================="
echo "  Checking if seeders are needed..."
echo "=============================================="
HAS_DATA=$(php -r "
    try {
        \$pdo = new PDO('mysql:host=$DB_HOST;port=${DB_PORT:-3306};dbname=$DB_DATABASE', '$DB_USERNAME', '$DB_PASSWORD');
        return \$pdo->query('SELECT COUNT(*) FROM sedes')->fetchColumn();
    } catch (Exception \$e) {
        return 0;
    }
" 2>/dev/null || echo 0)
if [ "$HAS_DATA" = "0" ]; then
    echo "  Database is empty, running seeders..."
    php /var/www/html/artisan db:seed --force --no-interaction || true
else
    echo "  Database already has data, skipping seeders."
fi

# Cache config and routes for production
if [ "${APP_ENV}" = "production" ]; then
    echo ""
    echo "=============================================="
    echo "  Caching config, routes and views..."
    echo "=============================================="
    php /var/www/html/artisan config:cache --no-interaction || true
    php /var/www/html/artisan route:cache --no-interaction || true
    php /var/www/html/artisan view:cache --no-interaction || true
fi

echo ""
echo "=============================================="
echo "  Entrypoint completed - starting services"
echo "=============================================="

exec "$@"
