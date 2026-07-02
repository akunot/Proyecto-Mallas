#!/bin/sh
set -e

# Remove any default nginx configs
rm -rf /etc/nginx/conf.d/* /etc/nginx/http.d/* 2>/dev/null || true

# Generate .env from environment if missing
if [ ! -f /var/www/html/.env ]; then
    cat > /var/www/html/.env << EOF
APP_NAME=\${APP_NAME:-Mallas}
APP_ENV=\${APP_ENV:-production}
APP_KEY=\${APP_KEY}
APP_DEBUG=\${APP_DEBUG:-false}
APP_URL=\${APP_URL:-http://localhost}
DB_CONNECTION=\${DB_CONNECTION:-mysql}
DB_HOST=\${DB_HOST:-mysql}
DB_PORT=\${DB_PORT:-3306}
DB_DATABASE=\${DB_DATABASE:-mallas_db}
DB_USERNAME=\${DB_USERNAME:-root}
DB_PASSWORD=\${DB_PASSWORD}
SESSION_DRIVER=\${SESSION_DRIVER:-file}
QUEUE_CONNECTION=\${QUEUE_CONNECTION:-database}
CACHE_STORE=\${CACHE_STORE:-file}
MAIL_MAILER=\${MAIL_MAILER:-log}
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
php /var/www/html/artisan storage:link --force --no-interaction 2>/dev/null || true

# Run migrations
php /var/www/html/artisan migrate --force --no-interaction 2>/dev/null || true

# Cache config and routes for production
if [ "${APP_ENV}" = "production" ]; then
    php /var/www/html/artisan config:cache --no-interaction 2>/dev/null || true
    php /var/www/html/artisan route:cache --no-interaction 2>/dev/null || true
    php /var/www/html/artisan view:cache --no-interaction 2>/dev/null || true
fi

exec "$@"
