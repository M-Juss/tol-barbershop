# Production Deployment Notes

This deployment uses Netlify Free for `frontend/` and Hostinger Premium Shared Hosting for `backend/`. Browsers must call Laravel through the Netlify same-origin rewrites at `/api/*` and `/sanctum/*`. Do not configure the browser to call the backend hostname directly.

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
BACKEND_URL=https://backend.example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public VAPID key used by Laravel>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your Cloudinary cloud name>
```

`BACKEND_URL` must be a clean HTTPS origin without credentials, a path, query string, or fragment. The production build intentionally fails when it is missing or unsafe.

Do not set `NEXT_PUBLIC_API_URL` to the backend hostname. The application fixes it to `/api/v1` so cookies and CSRF remain same-origin from the browser's perspective.

Use one stable production frontend hostname (the Netlify custom domain). Deploy Preview URLs are development-only and must not be added to backend CORS, Sanctum stateful domains, or any production allowlist.

## Laravel Environment

Create `backend/.env` on Hostinger via the File Manager or SSH. Set owner-only permissions immediately after creation. Start from `.env.example`, then apply at least these production values:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://backend.example.com
FRONTEND_URL=https://www.example.com
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
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

SANCTUM_STATEFUL_DOMAINS=www.example.com

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
```

`SESSION_DOMAIN` must remain unset or `null`. Laravel cookies travel to the browser through the Netlify rewrite, so assigning the backend domain to them will break login and CSRF.

Do not add Deploy Preview domains, wildcard domains, or unused ngrok domains to `SANCTUM_STATEFUL_DOMAINS` or CORS in production.

Use `QUEUE_CONNECTION=sync` unless Hostinger's plan has a continuously supervised queue worker. The application does not require Redis.

Configure the Hostinger hPanel cron scheduler to run Laravel's scheduler every minute:

```cron
* * * * * cd /home/<user>/public_html/backend && php artisan schedule:run >/dev/null 2>&1
```

Without this cron job, inactive support tickets are not cancelled automatically.

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
curl --proto '=https' --tlsv1.2 -sS -D - -o /dev/null https://www.example.com/
```

Confirm the response contains CSP, HSTS, frame denial, `nosniff`, referrer policy, permissions policy, and no `X-Powered-By` header.

Verify the CSRF handshake through Netlify, not through the backend hostname:

```bash
curl --proto '=https' --tlsv1.2 -sS -c cookies.txt -D - -o /dev/null https://www.example.com/sanctum/csrf-cookie
```

Confirm an `XSRF-TOKEN` cookie is returned with `Secure` and `SameSite=Lax`. Confirm authenticated state-changing requests without a matching XSRF header receive HTTP 419.

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

## Maintenance

Run these checks before each production release:

```bash
composer validate --strict --no-check-publish
composer audit --locked --no-dev --abandoned=fail
php artisan test
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
