# 🔍 Diagnóstico de Seguridad — Proyecto-Mallas (análisis read-only)

## Arquitectura HTTPS determinada

- __Entrada pública:__ `docker/nginx.conf` → `server { listen 80; }` (línea 43). __Solo HTTP__, sin bloque `443`, sin `ssl_certificate`, sin redirección a HTTPS.
- `docker-compose.yml` → `app` mapea `8080:80` (línea 45) y `APP_URL: http://localhost` (línea 50).
- __Conclusión: Nginx NO termina TLS.__ El TLS debe estar en una capa externa (reverse proxy / load balancer / WAF, p. ej. en `mallas.manizales.unal.edu.co`**), pero __no se configura la confianza de proxies__ (no hay `TrustProxies` en `bootstrap/app.php`), por lo que Laravel no sabrá que la petición original es HTTPS (ver hallazgo 8).

---

## Hallazgos por alerta OWASP ZAP

### 1 🟥 Content-Security-Policy Header Not Set

- __Causa:__ No existe CSP en ningún nivel (ni Nginx ni middleware de Laravel).

- __Archivo:__ `docker/nginx.conf` (bloque `server`, líneas 47‑49 solo tiene Frame/TypeOptions/XSS); `app.blade.php` no incluye meta CSP; no hay middleware global (`app/Http/Middleware` solo tiene `Authenticate`, `AuthenticateWithToken`, `HandleInertiaRequests`, `VerifyCsrfToken`).

- __Solución:__ Agregar middleware `SecurityHeaders` registrado en `bootstrap/app.php` (global) o `add_header Content-Security-Policy` en Nginx. La política __debe__ permitir los orígenes externos en uso (ver hallazgo 3):

  - `default-src 'self'`
  - `font-src 'self' https://fonts.bunny.net https://fonts.gstatic.com data:`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.bunny.net`
  - `style-src-elem` idem Google/Bunny
  - `img-src 'self' data: https://images.unsplash.com`
  - `connect-src 'self' <API-https>`
  - `script-src 'self'` (en prod Vite emite assets propios; Inertia usa atributo `data-page`, no scripts inline)
  - `frame-ancestors 'self'`

- __Riesgo de romper funcionalidad:__ __ALTO.__ React genera __estilos inline__ (`style={{...}}`) e Inline Inertia no es afectado, pero cualquier política restrictiva que omita `'unsafe-inline'` en `style-src` romperá la UI; Material Symbols / fonts de CDN se verán afectados; las imágenes Unsplash se bloquearán si no van en `img-src`.

- __Prueba:__ `curl -sI https://dominio | grep -i content-security-policy`; cargar cada página y verificar fuentes/iconos/estilos en la consola del navegador; re-escaneo ZAP.

### 2 🟥 Missing Subresource Integrity (SRI)

- __Causa:__ Hojas de estilo externas sin atributos `integrity` ni `crossorigin`.

- __Archivo:__ `resources/views/app.blade.php` __líneas 13-18__:

  - ⚠ La Línea 14 carga `https://fonts.bunny.net/css?family=instrument-sans…`
  - ⚠ Línea 17 `fonts.googleapis.com/css2?family=Hanken+Grotesk…`
  - ⚠ Línea 18 `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined…`

- __Solución:__ Idealmente __autoalojar__ las fuentes y el CSS en `public/` (ya hay un patrón: `resources/css/unal-fonts.css` sirve `Ancizar` como self-hosted con `@font-face` en `public/unal/fonts/`). Si deben seguir desde CDN, añadir `integrity="…" crossorigin="anonymous"` (exige recuperar el hash correcto, que cambia si Google rota el CSS).

- __Riesgo:__ auto-hospedar = bajo (quitar EULA/formatos que cambian); usar SRI con backend de Google = medio (hash frágil, requiere mantenimiento).

- __Prueba:__ `npm run build`, recargar, comprobar tipografías aplicadas y que NO hay warning de SRI en consola; escaneo ZAP.

### 3 🟥/🟧 Missing SRI / CSP por __carga de terceros__ (recursos externos)

Referencias externas encontradas (para whitelist en CSP y evaluar SRI): `app.blade.php` (13-18), `resources/js/pages/welcome.tsx:7-9` (bunny, página probablemente de dev), __`resources/js/pages/Inicio/ProgramasActivos.tsx:34-63`__ (imágenes `images.unsplash.com`), `resources/js/components/InstitutionalFooter.tsx:1-23` (enlaces externos; línea 10 tiene `http://siga.unal.edu.co` __http__ → __mixed content__ bajo HTTPS).

Fuentes/Js que consumen Material Symbols, Hanken, Inter, Instrument Sans: `resources/css/app.css` (`.material-symbols-outlined` línea 723; `Hanken Grotesk` líneas 939, 1084, 1101, 1218, 1311, 1533, 1651; `Instrument Sans` líneas 10, 2872) y múltiples `resources/js/pages/**` que usan `material-symbols-outlined`.

- __Causa:__ dependencia de font-icons externos ⇒ sin SRI y mayor superficie CSP.
- __Solución:__ Migrar Material Symbols / Google Fonts a ficheros locales en `public/` (mismo enfoque que `unal-fonts.css`). Para Unsplash, o auto-hospedar o mantener en `img-src`.
- __Riesgo:__ medio; mantener tipografía y ligaduras de icons es laborioso.
- __Prueba:__ comparar render antes/después (iconos del visualizador, títulos).

### 3 🟠 Cookies `Secure` / `SameSite` / `HttpOnly`

- __Causa:__ `config/session.php:172` lee `SESSION_SECURE_COOKIE`, pero __no está definido__ en `.env.example` ni en las variables de entorno de `docker-compose.yml`. Resultado: la cookie de sesión se envía sin `Secure`.
- __Solución:__ fijar `SESSION_SECURE_COOKIE=true` en `.env.example` y en el `environment:` de `docker-compose.yml` (y `SANCTUM`), porque en producción siempre será HTTPS. `HttpOnly` ya está en `true` (línea 185) y `SameSite=lax` (línea 202) — mantenidos.
- __Riesgo:__ bajo (en localhost HTTP se perderá login si se fuerza; se debe dejar con valor por entorno: `true` en prod, `null`/no fijado en local).
- __Prueba:__ `curl` a una respuesta e inspeccionar el `Set-Cookie`; verificar `Secure`, `HttpOnly`, `SameSite=Lax`; re-escanear ZAP; probar login.

### 4 🟠 X-Powered-By / Server version disclosure

- __Causa:__ `docker/php.ini` __no__ define `expose_php = Off`; `docker/nginx.conf` __no__ define `server_tokens off;`.
- __Archivo:__ `docker/php.ini` (topes); `docker/nginx.conf` (en bloque `http`, tras línea 11).
- __Solución:__ `expose_php = Off` en php-fpm y `server_tokens off;` en nginx `http { }`.
- __Riesgo:__ nulo.
- __Prueba:__ `curl -I https://dominio | findstr -i "Server X-Powered-By"` → debe ocultar versión.

### 5 🟠 Strict-Transport-Security (HSTS) no presente

- __Causa:__ No hay cabecera y no hay TLS local. Requiere que el TLS esté terminado (externo o nginx 443 con certificados).
- __Archivo:__ `docker/nginx.conf`; o bien `config/cors.php`… no aplica; se setea en nginx o REVERSE.
- __Solución (depende de § arquitectura):__ si existe LB externo, agregar `Strict-Transport-Security: max-age=31536000; includeSubDomains` en ese LB; si se decide TLS en nginx, añadir `add_header Strict-Transport-Security … always;` en el server 443.
- __Riesgo:__ bajo–medio (con `includeSubDomains` + HTTPS pleno; si una subdominio o "mailpit" en HTTP, puede volverse irreversibles 1 año — usar `max-age` corto primero).
- __Prueba:__ curl de cabeceras con HTTPS activo.

### 6 🟠 CORS

- __Causa:__ `config/cors.php` con `allowed_origins => ['http://localhost:5173']` __hardcoded__ (línea 22) y `allowed_methods => ['*']` (línea 20), `allowed_headers => ['*', ...]` (línea 26), `supports_credentials => true` (línea 32). No usa `env()`, así que en producción no refleja el dominio real.
- __Solución:__ parametrizar con `env('CORS_ALLOWED_ORIGINS', '*')` (split en array), restringir métodos a los usados (`GET,POST,PUT,PATCH,DELETE`) y header `authorization`. Verificar `SANCTUM_STATEFUL_DOMAINS` (ya tokenizado en config/sanctum, líneas 18-24).
- __Riesgo:__ medio en producción si se añade mal el dominio correcto; no cambiar lógica.
- __Prueba:__ peticiones cross‑origin desde el dominio de producción; `OPTIONS` preflight.

### 6 🟠 Trusted proxies / esquema HTTPS no detectado

- __Causa:__ No hay `TrustedProxies` configurado (`bootstrap/app.php` no lo registra). Al estar tras TLS en otro nodo, `APP_URL` y sesión no detectan `https`.
- __Solución:__ `$middleware->trustProxies(at: ['*'], headers: …)` o, mejor, restricción por IP del LB + `X-Forwarded-Proto`.
- __Riesgo:__ bajo (si confías en IPs del LB).
- __Prueba:__ behind proxy, comprobar `request()->isSecure()` y URL generadas.

### 3 🟡 Cabeceras auxiliares que ZAP puede alertar

- `X-Frame-Options` ya en nginx (línea 47) pero ver hallazgo 8. `X-XSS-Protection` (línea 49) obsoleta. Faltan __`Referrer-Policy: strict-origin-when-cross-origin`__ y __`Permissions-Policy`__.
- __Solución:__ agregarlo junto al middleware de cabeceras o en nginx.

### 4 🟡 AdvertCache estático romipe las cabeceras de seguridad (hallazgo indirecto importante)

- __Causa:__ En `docker/nginx.conf` __líneas 73-76__ el `location ~* .(css|js|woff…)` define su propio `add_header Cache-Control`, y en Nginx __un `location` con `add_header` reemplaza los `add_header` heredados del `server`__ → los envíos de CSS/JS/\&fonts no llevan `X-Frame-Options`/`X-Content-Type-Options`/`X-XSS-Protection` (y tampoco el CSP futuro).
- __Solución:__ repetir `add_header X-Content-Type-Options "nosniff";` (y el CSP/`always`) dentro de ese `location`, o mover a `http`/`include` compartido.
- __Riesgo:__ bajo.
- __Prueba:__ descargar un `.css` del build y revisar cabeceras.

---

## Detalles complementarios

- __Rate limiting:__ ya hay `throttle:otp-request` / `otp-verify` en `routes/api.php:49-50`. Considerar un umbral global en rutas de la API (60 req/min) acorde a RNF‑02.
- __`APP_DEBUG`/`APP_URL`:__ en `.env` local `APP_DEBUG=true` (ok solo dev); en `docker-compose.yml` `APP_URL` http localhost — actualizar a https real de producción.
- __Axios/mixed‑content:__ `resources/js/api/axios.ts:4` usa `http://127.0.0.1:8000/api` por defecto (envurable `VITE_API_URL`); en producción debe apuntar a la API __https__ para evitar mixed content.
- __CSRF en API:__ `config/cors.php` `paths` incluye `api/*` y la API usa Sanctum con tokens (`Authorization: Bearer`); el flujo SPA se apoya en `/sanctum/csrf-cookie`. Nota: `app/Http/Middleware/VerifyCsrfToken.php` exime `api/*`, `sanctum/*`, `auth/*` — revisar que no se relativicen rutas sensibles.

---

# 🗂️ PLAN DE CAMBIOS (ordenado por prioridad)

### P1 — Crítico (bloquea seguridad)

1. __Header CSP + cabeceras faltantes__ (Ref‑Policy, Permissions‑Policy, y asegurar que `<location>` de assets no suprima las cabeceras). Aplicar vía middleware global o nginx — priorizar `X-Frame-Options`, `X-Content-Type-Options` (repetir en `location` de estáticos) y CSP inicial basado en la whitelist de orígenes.
2. __TLS/HSTS y esquema__: confirmar si hay terminación externa; si es en la nube, agregar HSTS y configurar __TrustedProxies__ en `bootstrap/app.php`. Si es decisión mover TLS a Nginx, hacerlo con certificados. No implementar `includeSubDomains` sin un inventario de hostnames.
3. __Cookies Secure__: `SESSION_SECURE_COOKIE=true` en `.env.example` y en `environment` de `docker-compose.yml`.
4. __ocultar versión__: `expose_php=Off` + `server_tokens off;`.

### P2 — Alto

5. __SRI / auto‑hosting__: apuntar fonts (Instrument, Hanken, Inter, Clone O?) y Material Symbols a local (`public/fonts`, siguiendo patrón `unal-fonts.css`), __o__ añadir `integrity`+`crossorigin`. Ajustar CSP `font-src`/`style-src` acorde.
6. __CORS__: dominios por env, métodos/headers restringidos, `supports_credentials` sólo para dominios de confianza.

### P3 — Medio

7. __Imágenes Unsplash__: auto‑hospedar o proxy; añadir a `img-src` del CSP.
8. __Axios baseURL https real__ en `.env.example`/VITE y eliminar `http://siga.unal.edu.co` (lint de mixed content) en `InstitutionalFooter.tsx`.
9. __Rate limit__ global de API.

### P4 — Bajo / Revision

10. Revisar exenciones CSRF (`VerifyCsrfToken.php`).

---

### 🔁 Riesgo resumido

- __P1 (CSP)__ es el de mayor riesgo de romper funcionalidad → recomiendo rollout gradual: primera iteración solo reportada (`Content-Security-Policy-Report-Only`) unos días, luego endurecer.
- __P1 (TLS/LB)__ tiene impacto infraestructura → coordinar con quien administra el dominio/certificados (no es solo código).
- __Resstructo__ (nginx `always` y colocación de headers) es de menor riesgo pero requiere re‑test de estáticos.

📌 __No modifiqué ningún archivo; este es solo diagnóstico.__ Si deseas, en un siguiente paso en modo "act" puedo crear un plan/parches concretos (p. ej., un middleware `SecurityHeaders` o un bloque CSP en Nginx) bajo supervisión y pruebas.
