# Production Deployment Notes

This deployment uses Netlify Free for `frontend/` and Hostinger Premium Shared Hosting for `backend/`. The normal production architecture is direct browser-to-backend: the frontend at `https://www.saysontest.online` and the Laravel API at `https://api.saysontest.online`, which the browser calls directly using CORS and credentials. The Netlify `/api/*` and `/sanctum/*` rewrites are retained temporarily only as a migration fallback while direct mode is validated; they are not the intended permanent browser request path.

Netlify Free allows commercial use with custom domains. Use branch-based Deploy Previews only for development or non-production validation; do not point authenticated production traffic at a Deploy Preview URL.

## Required Runtime

| Component | Requirement |
|---|---|
| Frontend | Node.js 22.x, npm, Netlify OpenNext adapter (no Node.js runtime required) |
| Backend | PHP 8.4 or newer within the PHP 8.4 line |
| Database | MySQL 8+ |
| PHP extensions | ctype, curl, dom, fileinfo, filter, hash, iconv, json, libxml, openssl, pcre, PDO MySQL, session, SimpleXML, tokenizer, XML, XMLWriter |
| TLS | HTTPS on both frontend and backend origins |

The backend dependency lock is generated for PHP 8.4. Do not deploy it under PHP 8.3.

## Netlify Configuration

Connect the repository to Netlify and configure the project with these settings:

```text
Base directory:        (leave unset — repository root)
Package directory:     frontend
Build command:         npm run build
Publish directory:     .next
```

The OpenNext adapter is detected automatically and provisions Edge Functions for `proxy.ts` middleware and serverless functions for SSR/ISR where needed. Do not pin the adapter version — Netlify keeps it current with each build.

Set these Netlify environment variables in the dashboard:

```dotenv
NODE_VERSION=22
BACKEND_URL=https://api.saysontest.online
NEXT_PUBLIC_API_ORIGIN=https://api.saysontest.online
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public VAPID key used by Laravel>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your Cloudinary cloud name>
```

`BACKEND_URL` must be a clean HTTPS origin without credentials, a path, query string, or fragment. The production build intentionally fails when it is missing or unsafe. It remains present while the `/api/*` and `/sanctum/*` rewrites exist as fallback.

`NEXT_PUBLIC_API_ORIGIN` enables direct browser-to-backend mode. `NEXT_PUBLIC_API_URL` is derived by `frontend/next.config.ts` from `NEXT_PUBLIC_API_ORIGIN` and must not be manually configured. With it set, browser API requests go to `https://api.saysontest.online/api/v1/*`, CSRF initialization goes to `https://api.saysontest.online/sanctum/csrf-cookie`, and requests use `credentials: include`. GET/HEAD/OPTIONS requests do not send `X-XSRF-TOKEN`; state-changing requests send it when available. The frontend CSP `connect-src` must permit `https://api.saysontest.online`.

Use one stable production frontend hostname (the Netlify custom domain). Deploy Preview URLs are development-only and must not be added to backend CORS, Sanctum stateful domains, or any production allowlist.

## Temporary Fallback Rewrites

The Next.js rewrites at `/api/*` and `/sanctum/*` remain available during the migration and act as a fallback while direct mode is validated (via `BACKEND_URL`). They are not the intended normal browser request path once `NEXT_PUBLIC_API_ORIGIN` is enabled, and they should not be treated as permanent architecture. Production cutover is not yet assumed complete.

## Laravel Environment

Create `backend/.env` on Hostinger via the File Manager or SSH. Set owner-only permissions immediately after creation. Start from `.env.example`, then apply at least these production values:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.saysontest.online
FRONTEND_URL=https://www.saysontest.online
SHOP_TIMEZONE=Asia/Manila
APP_KEY=<php artisan key:generate --show>

LOG_CHANNEL=daily
LOG_LEVEL=warning
LOG_DAILY_DAYS=14

DB_CONNECTION=mysql
DB_HOST=<database host>
DB_PORT=3306
DB_DATABASE=<database name>
DB_USERNAME=<dedicated least-privilege database user>
DB_PASSWORD=<strong database password>

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
SESSION_DOMAIN=.saysontest.online
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

SANCTUM_STATEFUL_DOMAINS=www.saysontest.online,saysontest.online

CACHE_STORE=database
QUEUE_CONNECTION=sync

MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=<smtp host>
MAIL_PORT=587
MAIL_USERNAME=<smtp username>
MAIL_PASSWORD=<smtp password>
MAIL_FROM_ADDRESS=<verified sender address>
MAIL_FROM_NAME="TOL Barbershop"

VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:<operational email>
PUSH_ALLOWED_ENDPOINT_HOSTS=fcm.googleapis.com,push.services.mozilla.com,updates.push.services.mozilla.com,.push.apple.com,.notify.windows.com

CLOUDINARY_URL=<Cloudinary URL>
CLOUDINARY_FOLDER=tol-barbershop/landing-gallery

# Default manager account (used by seeders — rotate before public launch)
DEFAULT_MANAGER_EMAIL=<manager email>
DEFAULT_MANAGER_PASSWORD=<strong manager password>
DEFAULT_MANAGER_NAME=<manager fullname>
DEFAULT_MANAGER_CONTACT=<manager phone>
```

`SESSION_DOMAIN=.saysontest.online` is required for the sibling-subdomain Sanctum SPA architecture. `www.saysontest.online` and `api.saysontest.online` are different origins but the same registrable site, so a shared cookie domain lets the browser return the session and `XSRF-TOKEN` cookies to the API origin automatically. Cookies are sent with `Secure`, `SameSite=Lax`, and `HttpOnly` (session cookie), which keeps CSRF-token reads protected in this cross-origin but same-site setup. This configuration has been manually verified.

Do not add Deploy Preview domains, wildcard domains, or unused ngrok domains to `SANCTUM_STATEFUL_DOMAINS` or CORS in production.

Use `QUEUE_CONNECTION=sync` unless Hostinger's plan has a continuously supervised queue worker. The application does not require Redis.

Configure the Hostinger hPanel cron scheduler to run Laravel's scheduler every minute:

```cron
* * * * * cd /home/<user>/public_html/backend && php artisan schedule:run >/dev/null 2>&1
```

Without this cron job, inactive support tickets are not cancelled automatically.

## CORS and Sanctum

Because the browser calls the backend directly, credentialed CORS is mandatory:

- Credentialed CORS means `Access-Control-Allow-Origin` must echo exactly `https://www.saysontest.online` with `Access-Control-Allow-Credentials: true`. Never use `Access-Control-Allow-Origin: *`.
- CORS must cover `api/*` (including `/api/v1/*`) and `sanctum/csrf-cookie`.
- The `OPTIONS` preflight must allow the production Origin, the methods used (GET, POST, PUT, PATCH, DELETE, OPTIONS), and the headers `content-type`, `x-xsrf-token`, and `accept`.
- `SANCTUM_STATEFUL_DOMAINS=www.saysontest.online,saysontest.online` makes Sanctum treat the frontend origin as stateful, so the SPA session cookie authenticates API calls.
- Session authentication remains cookie-based. The `XSRF-TOKEN` cookie (readable by the frontend) must be echoed back as the `X-XSRF-TOKEN` header on state-changing requests; the `HttpOnly` session cookie is sent automatically by the shared cookie domain.

This exact CORS/CSRF behavior has been manually verified against `https://api.saysontest.online` (credentialed responses, preflight 204, CSRF cookie issuance, login, and authenticated `/api/v1/user`).

## Shared Hosting Layout

On Hostinger, set the backend hostname document root to:

```text
/home/<user>/public_html/backend/public
```

Never expose the repository root, `.env`, `vendor`, `storage`, database files, or source files as web-accessible paths.

Recommended permissions (run via SSH or File Manager):

```bash
chmod 600 .env
chmod -R 755 app bootstrap config database public resources routes vendor
chmod -R 775 storage bootstrap/cache
```

Do not use `777` permissions. The PHP process owner must be able to write only to `storage/` and `bootstrap/cache/`.

Do not create a public storage link for this deployment. Staff photo uploads and local staff-image delivery are intentionally disabled. Gallery images use Cloudinary.

## Backend Deployment

Back up the database before the first deployment containing the security migrations.

The integrity migrations fail closed instead of silently changing ambiguous production records. Before migrating, confirm these queries return no rows and resolve any results manually:

```sql
SELECT barber_user_id, appointment_date, appointment_time, COUNT(*) AS duplicate_count
FROM appointments
WHERE status IN ('pending', 'approved')
GROUP BY barber_user_id, appointment_date, appointment_time
HAVING COUNT(*) > 1;

SELECT date_closed, COUNT(*) AS duplicate_count
FROM closed_dates
GROUP BY date_closed
HAVING COUNT(*) > 1;
```

Connect to Hostinger via SSH and deploy from the `backend/` directory:

```bash
git pull origin main
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan optimize
php artisan production:verify
```

If environment values change, rebuild Laravel's cached configuration:

```bash
php artisan optimize:clear
php artisan optimize
```

Do not run `composer update` on the production server. Deploy the reviewed `composer.lock` file.

Hostinger uses OpenLiteSpeed. `.htaccess` rules in `backend/public` handle Laravel routing automatically. Do not disable or modify `.htaccess` unless Hostinger support confirms it is safe for your plan.

## Seeder Warning

The current deployment seeders intentionally include known manager, barber, and customer credentials. This was retained for the deployment phase by explicit decision.

Do not run `php artisan db:seed --force` on a publicly accessible production database unless those accounts are intentionally required. Before public launch, rotate every seeded credential and confirm that no predictable account remains active.

Never expose a seeded manager account while DNS or the public frontend is open to untrusted users.

## Security Verification

After deployment, verify frontend headers:

```bash
curl --proto '=https' --tlsv1.2 -sS -D - -o /dev/null https://www.saysontest.online/
```

Confirm the response contains CSP, HSTS, frame denial, `nosniff`, referrer policy, permissions policy, and no `X-Powered-By` header.

Verify the CSRF handshake directly against the backend as the primary test, using the frontend origin and referer so CORS and shared cookies are exercised:

```bash
curl --proto '=https' --tlsv1.2 -sS -c cookies.txt -D - -o /dev/null \
  -H "Origin: https://www.saysontest.online" \
  -H "Referer: https://www.saysontest.online/" \
  https://api.saysontest.online/sanctum/csrf-cookie
```

Confirm a `204` response that sets `XSRF-TOKEN` and session cookies scoped to `.saysontest.online` with `Secure` and `SameSite=Lax`, plus `Access-Control-Allow-Origin: https://www.saysontest.online` and `Access-Control-Allow-Credentials: true`. Confirm authenticated state-changing requests without a matching XSRF header receive HTTP 419.

Verify direct authenticated API traffic from the frontend origin:

```bash
curl --proto '=https' --tlsv1.2 -sS -b cookies.txt \
  -H "Origin: https://www.saysontest.online" \
  -H "Referer: https://www.saysontest.online/" \
  https://api.saysontest.online/api/v1/user
```

It should return HTTP 200 with the current user and the credentialed CORS headers when a valid session exists.

Verify these application cases manually:

1. Customer, admin, and manager login and logout.
2. A disabled admin loses existing access immediately.
3. An admin can access only assigned modules, including direct URLs and direct API requests.
4. A customer cannot read another customer's appointments, support tickets, feedback, or notifications.
5. Customer barber responses contain no barber email or phone number.
6. Email changes require the current password and require verification of the new address.
7. Sunday, closed-date, past, over-30-day, inactive-resource, overlapping, and duplicate bookings are rejected by the API.
8. Group approval or rejection succeeds atomically.
9. Registration verification and password reset emails arrive through the production SMTP account.
10. Support ticket creation and claiming remain single-owner under repeated clicks.
11. Service deletion archives the service without deleting appointment history.
12. Staff image upload attempts are rejected.
13. Push subscription endpoints reject non-provider URLs.

## Operational Protection

Hostinger Premium's weekly backup is not sufficient for appointment data. Configure a daily MySQL backup or export to storage outside the hosting account. Encrypt it, retain at least seven daily and four weekly copies, and test a restore at least monthly. Keep the weekly Hostinger backup enabled as a second recovery path.

Configure uptime checks at five-minute intervals for all three paths and send failures to an actively monitored email or phone:

```text
https://www.saysontest.online/
https://api.saysontest.online/api/v1/public-booking-settings
https://api.saysontest.online/up
```

API health and application checks target `api.saysontest.online` directly rather than routing API monitoring through the frontend. Frontend health stays on `https://www.saysontest.online/`, and backend health stays on `https://api.saysontest.online/up`. Public API checks use `https://api.saysontest.online/api/v1/...`.

Configure error alerts for backend 5xx responses and Laravel production log errors. Review repeated 401, 403, 419, 422, and 429 responses for authentication, CSRF, validation, or abuse patterns. In Netlify, enable credit-usage notifications before the monthly allowance is exhausted and set more than one threshold so there is time to react.

Run the public read workload against a staging deployment while watching Hostinger's PHP worker, CPU, and MySQL connection metrics:

```bash
node operations/load-test.mjs https://staging.example.com --confirm-staging
```

The default workload is 15 virtual users for 15 minutes. It fails on request errors, non-2xx responses, or p95 latency above 1000 ms. Do not target production. Record p95 latency, 5xx responses, peak PHP workers, peak CPU, and peak MySQL connections in the release notes.

## Maintenance

Run these checks before each production release:

```bash
composer validate --strict --no-check-publish
composer audit --locked --no-dev --abandoned=fail
php artisan test
composer run test:mysql
vendor/bin/pint --test
```

```bash
npm ci --ignore-scripts
npm audit --package-lock-only --omit=dev --ignore-scripts --audit-level=moderate
npm run lint
npx tsc --noEmit
npm run build
```

Keep automated database backups outside the hosting account and periodically test a restore. Retain bounded daily application logs and monitor repeated 401, 403, 419, 422, 429, and 500 responses.

## Accepted Temporary Risks

The six-character password policy and absence of MFA are retained by explicit deployment decision. They should be reviewed before broader public use, especially for manager and admin accounts.

The frontend CSP permits inline scripts because nonce-based Next.js CSP would force dynamic rendering and increase Edge Function usage. The application compensates by avoiding user-controlled HTML, removing `dangerouslySetInnerHTML`, disabling inline script attributes, enforcing server-side sanitization, and keeping all API authorization on Laravel.
