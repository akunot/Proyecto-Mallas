FROM php:8.3-fpm-alpine AS base

RUN apk add --no-cache \
    curl \
    git \
    unzip \
    nginx \
    supervisor \
    nodejs \
    npm \
    bash

RUN docker-php-ext-install pdo_mysql mbstring bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

USER root

COPY composer.json composer.lock package.json package-lock.json ./

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts \
    && npm ci --no-audit --no-fund

COPY . .

RUN npm run build \
    && composer install --no-dev --optimize-autoloader --no-interaction

RUN rm -rf node_modules

RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app

RUN mkdir -p /var/log/supervisor /var/log/nginx /run/nginx \
    && chown -R app:app /var/www/html/storage /var/www/html/bootstrap/cache /var/log/nginx /var/log/supervisor /run/nginx

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-docker.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
