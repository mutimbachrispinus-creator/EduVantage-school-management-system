# EduVantage Stability Audit Risk Register

Prepared for: Chrispinus Mutimba  
Audit date: 17 May 2026  
Implementation status: hardening pass applied after the audit findings.

## Flagged Areas Implemented

| Area | Implementation |
| --- | --- |
| Duplicate M-Pesa callbacks | Added receipt-level idempotency locking, explicit payment IDs, duplicate paylog checks, and settlement queue deduplication. |
| Signup staff ID collision | Signup and PesaPal activation use `crypto.randomUUID()`-based staff IDs. |
| PesaPal subscription dates | PesaPal renewals now store ISO `expires_at` values and extend from a valid current expiry date when present. |
| PesaPal activation integrity | Paid registration activation now checks tenant slug and admin username collisions before creating records. |
| Debug and seed exposure | `/api/debug` and `/api/seed` now require a configured `CRON_SECRET` bearer token. |
| Performance & Insights access | Role access now includes the actual `/analytics` route used by the navigation item. |

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Safaricom Daraja API changes or downtime | HIGH | Implement exponential backoff retry logic; maintain reconciliation logs; monitor Safaricom developer blog for deprecation notices. |
| Cross-tenant data leak via SQL query misconfiguration | CRITICAL | Mandatory pre-launch code audit; enforce tenant scoping at DB layer; add automated tenant isolation regression tests. |
| ODPC enforcement action for DPA non-compliance | HIGH | Complete ODPC registration and DPIA before processing live school data; appoint DPO. |
| CBK classifying platform as unlicensed payment service | HIGH | Engage payment law specialist; structure fee flow so schools retain their own M-Pesa Paybills. |
| Cloudflare D1 or edge storage limits exceeded at scale | MEDIUM | Implement data archiving policy; monitor storage weekly; budget for Cloudflare paid plan upgrade. |
| Single-founder bus factor | HIGH | Document API credentials, architecture, and deployment procedures; onboard a second technical team member. |
| Competitor entry expanding ERP features | MEDIUM | Maintain strong CBC curriculum depth and M-Pesa payment UX as key moat; build school switching cost through data history. |
| Africa's Talking SMS sender ID rejection or carrier blocking | MEDIUM | Register branded sender ID; maintain fallback numeric shortcode. |
| School fee payment dispute or M-Pesa reversal | MEDIUM | Maintain idempotent ledger credits, full M-Pesa transaction log, and a dispute resolution policy in SLA. |
