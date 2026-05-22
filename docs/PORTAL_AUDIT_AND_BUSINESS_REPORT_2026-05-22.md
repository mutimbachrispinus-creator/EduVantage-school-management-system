# EduVantage Portal Audit and Business Report

Date: 2026-05-22  
Scope: codebase, deployment posture, security-critical workflows, dependency risk, API readiness, legal/compliance checklist, operating cost model, and valuation projection.

## Executive Summary

EduVantage is a broad multi-tenant school management portal with learner records, grades, attendance, fees, finance, SMS/WhatsApp, email, M-Pesa/Pesapal, analytics, parent access, super-admin controls, and Cloudflare Pages deployment.

The portal is commercially promising, but the most urgent risks were security and deployment hygiene. I implemented the critical fixes now:

- Removed high-risk PWA/workbox dependency chain.
- Upgraded Next.js from `15.5.2` to `15.5.18`.
- `npm audit --omit=dev` now reports `found 0 vulnerabilities`.
- Disabled unsafe direct password recovery endpoint.
- Required non-default `JWT_SECRET` and `PASS_SALT` in production.
- Restricted sensitive `/api/db` writes for marks, attendance, duties, and messages.
- Added upload type/size validation and removed Edge-incompatible `Buffer` usage.
- Required `CRON_SECRET` for backup cron route.
- Added baseline security headers.

## Critical Findings and Status

| Area | Risk | Status |
| --- | --- | --- |
| Dependency security | `next@15.5.2` and PWA/workbox chain produced production audit findings. | Fixed. Next upgraded, PWA plugin removed, production audit clean. |
| Password recovery | `/api/auth/recovery` reset passwords using tenant + username + phone. | Fixed. Endpoint now returns `410`; OTP reset flow is required. |
| Secret management | Production could fall back to static JWT/password salt defaults. | Fixed. Production now fails if `JWT_SECRET` or `PASS_SALT` is missing/default. |
| Data integrity | Some `/api/db` write actions allowed any authenticated role to change marks, attendance, messages, or duties. | Fixed. Added role checks. |
| Uploads | Any file type/size could be stored as base64 in DB; `Buffer` was used in Edge runtime. | Fixed. Allowed PDF/JPEG/PNG/WebP only, 2 MB cap, Edge-safe base64. |
| Cron backup | Backup route could run without `CRON_SECRET` if the env var was missing. | Fixed. Missing secret returns `500`; wrong/missing bearer returns `401`. |
| Headers | Missing common browser hardening headers. | Fixed. Added `nosniff`, frame denial, referrer policy, permissions policy. |

## Required APIs and Accounts

| API / Vendor | Purpose | Required Secrets | Estimated Cost |
| --- | --- | --- | --- |
| Turso | Primary edge SQLite/libSQL database. | `TURSO_URL`, `TURSO_TOKEN` | Official pricing shows Free, Developer `$5.99/mo`, Scaler `$29/mo`, Pro `$499/mo`, with storage/read/write quotas. Source: https://turso.tech/pricing?frequency=monthly |
| Cloudflare Pages / Workers | Hosting, edge functions, deploys. | Cloudflare account + project env vars | Workers limits: Free worker size `3 MB`, Paid `10 MB`; Paid also raises CPU capacity. Source: https://developers.cloudflare.com/workers/platform/limits/ |
| Resend | Transactional email receipts/reports. | `RESEND_API_KEY` | Free `3,000 emails/mo`, Pro `$20/mo` for `50,000 emails/mo`, overage `$0.90/1,000`. Source: https://resend.com/pricing |
| Africa's Talking | SMS and WhatsApp-like messaging bridge currently used by code paths. | `AT_USERNAME`, `AT_API_KEY`, sender ID | Pricing depends on country/network and product. Use official pricing page before launch: https://africastalking.com/pricing |
| Safaricom Daraja / M-Pesa | STK Push, payment callbacks, payment verification. | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` | API access is via Safaricom Developer/Daraja; transaction charges follow Safaricom M-Pesa business tariffs. Confirm production paybill/till tariffs during go-live: https://developer.safaricom.co.ke/ |
| Pesapal | Alternative card/mobile payment processor. | `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_ENV` | Processor charges vary by merchant agreement. Use only if schools require card/mobile-money aggregation. |
| S3-compatible backup storage | Offsite backup of school data snapshots. | `BACKUP_S3_*` variables | Use Cloudflare R2, AWS S3, or equivalent. Budget KES 500-3,000/mo at early stage. |

## Legal and Compliance Checklist

This is an operational checklist, not legal advice. Confirm final filings with a Kenyan advocate/accountant.

| Item | Why It Matters | Estimated Official Cost / Action |
| --- | --- | --- |
| Business name or limited company registration | Needed for contracts, invoices, bank/paybill onboarding. | BRS lists Business Name registration at `Kshs 950`. Source: https://brs.go.ke/fee-schedule-companies-registry/ |
| Private limited company | Better for SaaS contracts, investors, liability separation. | BRS/eCitizen company incorporation should be budgeted separately; third-party 2026 summaries commonly cite about KES 10,650, but verify in eCitizen before payment. Official BRS portal: https://brsv2.ecitizen.go.ke/ |
| KRA PIN, eTIMS, tax setup | Required for invoicing schools and compliance. | Register with KRA; budget accountant support if needed. |
| ODPC registration | You process minors' data, education records, parent contacts, payments, and possibly sensitive records. | ODPC guidance lists registration/renewal fees by category; public entities example is KES 4,000 registration and KES 2,000 renewal every 2 years. Verify your correct category. Source: https://www.odpc.go.ke/faqs/ |
| Data Processing Agreements | Schools are likely data controllers; EduVantage is likely a processor for hosted SaaS. | Add DPA, breach process, processor/subprocessor list, backup retention policy. |
| Terms, Privacy Policy, Acceptable Use | Required for SaaS onboarding and parent/staff trust. | Existing `/privacy` and `/terms` pages exist; update with company details after registration. |
| M-Pesa merchant onboarding | Needed for production payment collection. | Paybill/till, Daraja app approval, callback URL, settlement bank details. |

## Operating Cost Projection

Lean production monthly budget, excluding salaries:

| Stage | Schools | Recommended Stack | Monthly Cost Estimate |
| --- | ---: | --- | ---: |
| Pilot | 1-5 | Cloudflare Free/Paid if needed, Turso Free/Developer, Resend Free, SMS pay-as-you-go | KES 2,000-10,000 |
| Early SaaS | 6-25 | Cloudflare Workers Paid, Turso Developer/Scaler, Resend Pro, backup storage, SMS wallet | KES 10,000-45,000 |
| Growth | 26-100 | Turso Scaler/Pro if usage requires, paid monitoring, support line, stronger backups | KES 45,000-180,000 |

Largest variable costs will be SMS/WhatsApp, payment transaction fees, support time, and database reads/writes during report-card/analytics periods.

## Valuation Projection

Assumptions:

- Target customer: Kenyan private and low/mid-cost schools.
- Pricing model: KES 8,000-25,000 per school per term or KES 2,500-10,000 per month depending on learner count and modules.
- Gross margin target after infra/SMS/payment costs: 70-85%.
- SaaS valuation range for small vertical SaaS: roughly `1.5x-4x ARR` when churn is controlled; higher only with strong growth, contracts, and clean compliance.

| Scenario | Paying Schools | ARPA / Month | ARR | Indicative Valuation |
| --- | ---: | ---: | ---: | ---: |
| Pilot traction | 10 | KES 5,000 | KES 600,000 | KES 0.9M-2.4M |
| Local product-market fit | 50 | KES 7,500 | KES 4.5M | KES 6.75M-18M |
| County-scale SaaS | 200 | KES 10,000 | KES 24M | KES 36M-96M |
| Regional scale | 1,000 | KES 12,000 | KES 144M | KES 216M-576M |

To improve valuation, focus on signed annual contracts, low churn, clean data protection compliance, reliable onboarding, and payment collection proof.

## Product Roadmap Priorities

1. Security and compliance: enforce OTP recovery, secrets, audit logs, RBAC, data retention, backups.
2. School onboarding: guided setup, import templates, demo tenant reset, support playbook.
3. Billing: subscription enforcement, invoice history, learner-count-based pricing.
4. Reliability: automated backups, health dashboard, deploy smoke test, monitoring alerts.
5. Reporting: report cards, fees, CBC analytics, parent summaries.
6. Integrations: M-Pesa production, SMS sender ID, email domain authentication, backup storage.

## Remaining Risks

- `@cloudflare/next-on-pages@1.13.16` declares a peer range capped at older Next versions. The build passes with `next@15.5.18` using project `.npmrc` `legacy-peer-deps=true`, but the medium-term fix is migrating to Cloudflare's current OpenNext adapter.
- TypeScript and ESLint are ignored during builds. This keeps deploys moving but hides defects; turn both back on after reducing errors.
- Stored file uploads are base64 in SQL. Move production documents/images to R2/S3 and keep DB metadata only.
- Local DB files are ignored but still present on disk. Do not commit them.
- The app has many powerful repair/debug/admin routes. Keep all protected with `CRON_SECRET` or super-admin session checks.

## Verification Required Before Release

- `npm audit --omit=dev`
- `npm run next:build`
- `npm run pages:build`
- Cloudflare deployment with all secrets configured:
  - `JWT_SECRET`
  - `PASS_SALT`
  - `CRON_SECRET`
  - `TURSO_URL`
  - `TURSO_TOKEN`
  - `RESEND_API_KEY`
  - `AT_API_KEY` and SMS credentials
  - M-Pesa/Pesapal credentials as needed
