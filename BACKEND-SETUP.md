# Heart Tool API — backend scaffold

This repository now includes a Cloudflare Workers + D1 backend scaffold.

## What this backend provides
- Creator registration and login with PBKDF2 password hashing and hashed session tokens.
- Creator-owned experience CRUD with tenant ownership checks.
- Public published-page metadata endpoint that deliberately excludes locked content.
- Database schema for creators, sessions, experiences, levels and orders.
- A health endpoint.

## What is deliberately disabled
The checkout and payment webhook endpoints return HTTP 503. They do not simulate success. This is intentional: a production payment adapter must be built against the creator's approved WeChat Pay / Alipay merchant or sub-merchant arrangement, including signed callback verification, idempotency, refunds and reconciliation. Do not collect real money until the payment institution approves the exact product, merchant, creator onboarding model and settlement route.

## Deploy requirements
1. Create a Cloudflare account and a D1 database.
2. Replace the placeholder database_id in backend/wrangler.toml.
3. Apply backend/schema.sql to the D1 database.
4. Deploy the Worker from the backend directory using Wrangler.
5. Configure a strict allowed-origin list and custom API domain.
6. Add rate limiting, email verification, password reset, session revocation, audit logs, abuse reporting and backups before public launch.

## Important
The current static GitHub Pages app is a visual prototype. It is not yet wired to this API. The old share-by-URL prototype embeds content in the URL and is not a secure paid-content mechanism. Production creator content must be stored server-side and only returned after the backend verifies the paid order.
