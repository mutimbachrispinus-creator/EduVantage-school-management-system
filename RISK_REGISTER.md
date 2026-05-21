# EduVantage Platform — Risk Register & Deployment Roadmap
**Version:** 1.1 — Updated 21 May 2026  
**Auditor:** Antigravity AI Engineering  
**Owner:** Chrispinus Mutimba (Platform Founder)

---

## 1. Active Risk Register

| # | Risk | Severity | Owner | Mitigation | Status |
|---|------|----------|-------|------------|--------|
| R1 | **Safaricom Daraja API changes / downtime** | 🔴 HIGH | Engineering | Exponential backoff retry (3× with jitter) added to `lib/mpesa.js`. Structured `logDarajaEvent()` for reconciliation. Monitor [Safaricom Developer Blog](https://developer.safaricom.co.ke) for deprecation notices. | ✅ **DONE** (21 May 2026) |
| R2 | **Cross-tenant data leak via SQL query misconfiguration** | 🔴 CRITICAL | Engineering | All queries include `tenant_id = ?` binding. Mandatory pre-launch SQL audit recommended. Implement automated tenant isolation regression test suite. Consider row-level security at DB abstraction layer. | ⚠️ Partial — regression tests pending |
| R3 | **ODPC enforcement action for DPA non-compliance** | 🔴 HIGH | Legal / Founder | Complete ODPC registration and DPIA before processing live school data. Appoint a Data Protection Officer (DPO). Publish Privacy Policy (already live). | ⚠️ ODPC registration pending |
| R4 | **CBK classifying platform as unlicensed payment service** | 🔴 HIGH | Legal / Founder | Engage payment law specialist. Structure fee flow so schools retain their own M-Pesa Paybills (already implemented — each school uses own shortcode). Platform acts as SaaS tool, not PSP. | ✅ Architecture correct — legal review pending |
| R5 | **Cloudflare D1 storage limits exceeded at scale** | 🟡 MEDIUM | Engineering | Implement data archiving policy (marks older than 3 years). Monitor Turso storage weekly. Budget for Cloudflare paid plan upgrade at >10 active tenants. | ⚠️ Archiving policy not yet implemented |
| R6 | **Single-founder bus factor — platform unavailable if developer unavailable** | 🔴 HIGH | Founder | Document all API credentials, architecture, and deployment procedures. Onboard a second technical team member. Store credentials in a shared vault (e.g., 1Password Teams). | ⚠️ Documentation in progress |
| R7 | **Competitor entry (Zeraki, uLesson expanding ERP features)** | 🟡 MEDIUM | Product | Maintain strong CBC curriculum depth and M-Pesa payment UX as key moat. Build school switching cost through data history (report cards, merit lists, fee records). | ✅ Core moat established |
| R8 | **Africa's Talking SMS sender ID rejection / carrier blocking** | 🟡 MEDIUM | Engineering | Register a branded sender ID (e.g., `EDUVNTGE`) with AT. Maintain fallback to numeric shortcode. Documented in `.env.example`. | ⚠️ AT registration pending |
| R9 | **School fee payment dispute / M-Pesa reversal** | 🟡 MEDIUM | Engineering + Legal | Idempotency lock implemented in M-Pesa callback (receipt dedup via `mpesa_receipt_*` KV key + `paylog` check). Maintain full M-Pesa transaction log (`nexed_mpesa_logs`). Define dispute resolution policy in SSA. | ✅ Idempotency done — dispute policy pending |
| R10 | **Duplicate M-Pesa callback double-charging** | 🔴 HIGH | Engineering | Dual-lock idempotency: (1) check `paylog` for existing `mpesaCode`, (2) `INSERT … ON CONFLICT DO NOTHING` into KV receipt lock. | ✅ **DONE** |
| R11 | **`/api/saas/init` unprotected — could reset super-admin** | 🔴 CRITICAL | Engineering | Added `CRON_SECRET` Bearer auth guard. | ✅ **DONE** (21 May 2026) |
| R12 | **PesaPal `expires_at` type inconsistency (bare date vs ISO string)** | 🟡 MEDIUM | Engineering | `saas/init` fixed to emit `2027-05-01T00:00:00.000Z`. `saas/manage` now normalises all client-supplied dates via `new Date().toISOString()`. | ✅ **DONE** (21 May 2026) |
| R13 | **No SMS delivery receipt tracking** | 🟡 MEDIUM | Engineering | `/api/sms/delivery` webhook upgraded — stores structured receipts, cross-references `paav7_sms` log, rolling 2000-entry window. Register URL in AT dashboard. | ✅ **DONE** (21 May 2026) |
| R14 | **B2C payroll disbursement — no rate limiting for large schools** | 🟡 MEDIUM | Engineering | Added warning comment in `lib/mpesa.js` `b2cTransfer()`. Queue/throttle pattern required before enabling live B2C at scale. | ⚠️ Queue implementation pending |
| R15 | **Jitsi (`meet.jit.si`) downtime outside EduVantage control** | 🟡 MEDIUM | Engineering | Consider self-hosted Jitsi or Daily.co for production SLA. Current: acceptable for pilot phase. | ⚠️ For post-pilot roadmap |

---

## 2. Critical Fixes — Completed (Audit Cycle May 2026)

| Fix | File | Date |
|-----|------|------|
| Exponential backoff + `logDarajaEvent()` on all Daraja calls | `lib/mpesa.js` | 21 May 2026 |
| Full monitoring dashboard at `GET /api/health?detail=1` | `app/api/health/route.js` | 21 May 2026 |
| SMS delivery receipt webhook (AT callback) | `app/api/sms/delivery/route.js` | 21 May 2026 |
| CRON_SECRET guard on `/api/saas/init` | `app/api/saas/init/route.js` | 21 May 2026 |
| `expires_at` ISO normalisation in `saas/manage` | `app/api/saas/manage/route.js` | 21 May 2026 |
| Fixed bare date `'2027-05-01'` → `'2027-05-01T00:00:00.000Z'` | `app/api/saas/init/route.js` | 21 May 2026 |
| `.env.example` documents AT delivery webhook + branded sender ID | `.env.example` | 21 May 2026 |

---

## 3. Deployment Roadmap

### Phase 1 — Legal Foundation (Month 1–2)
- [ ] Incorporate EduVantage Limited (Private Limited Company)
- [ ] Obtain KRA PIN for the company
- [ ] Register with ODPC (Office of the Data Protection Commissioner)
- [ ] File trademark for "EduVantage" brand
- [ ] Draft and publish Terms of Service & Privacy Policy *(Privacy Policy is live)*
- [ ] Appoint Data Protection Officer (DPO)
- [ ] Engage payment law specialist (CBK licensing risk assessment)

### Phase 2 — Payment Integration (Month 2–3)
- [ ] Complete Safaricom Daraja **production** go-live review
- [ ] Register branded AT sender ID (`EDUVNTGE`)
- [ ] Configure numeric shortcode fallback in AT dashboard
- [ ] Register AT delivery report callback: `https://YOUR_DOMAIN/api/sms/delivery`
- [ ] Stress-test M-Pesa STK Push + callback with 50 concurrent payments
- [ ] Enable Pesapal production credentials

### Phase 3 — School Pilot (Month 3–4)
- [ ] Onboard 5 pilot schools (target: 3× CBC, 1× Cambridge, 1× TVET)
- [ ] Monitor `/api/health?detail=1` daily for pending payment spikes
- [ ] Collect feedback on report cards, merit lists, attendance
- [ ] Enable SMS delivery receipt tracking in school admin portal UI
- [ ] Break-even validation: 5 schools × KES 45,000/term = KES 225,000/term

### Phase 4 — Hardening & Scale (Month 4–6)
- [ ] Implement automated tenant isolation regression tests (R2)
- [ ] Implement data archiving policy for marks > 3 years (R5)
- [ ] Implement B2C payroll queue/rate-limiter for large schools (R14)
- [ ] Onboard second technical team member (R6)
- [ ] Evaluate Jitsi → self-hosted or Daily.co (R15)
- [ ] Scale to 15+ schools (break-even threshold for premium plan tier)

### Phase 5 — Platform v2 (Month 7–12)
- [ ] Row-level security audit at DB abstraction layer (R2)
- [ ] CMS for legal pages (non-developer edits)
- [ ] WhatsApp channel integration (beyond SMS)
- [ ] Mobile app (React Native wrapper)
- [ ] Expand curricula: Montessori national partnerships

---

## 4. Break-Even Analysis Reference

| Metric | Value |
|--------|-------|
| Basic plan revenue per school/term | KES 45,000 |
| Monthly equivalent (at 5 schools) | KES 75,000 |
| Monthly operating cost (growth phase) | KES 60,000 |
| Break-even school count | **3–15 schools** (depending on plan tier) |
| One-time launch costs | KES 231,050 – 651,650 |

---

## 5. Action Items for Founder

> Review this register monthly. Update the **Status** column as items are resolved.

| Priority | Action | Deadline |
|----------|--------|----------|
| 🔴 Immediate | ODPC registration | Before first live school data |
| 🔴 Immediate | Safaricom Daraja production approval | Before public launch |
| 🔴 Immediate | Payment law specialist consultation | Before accepting school fees |
| 🟡 Soon | AT branded sender ID registration | Before SMS blast campaigns |
| 🟡 Soon | Onboard second technical team member | Before 10 schools |
| 🟢 Planned | Data archiving policy | Before 20 active tenants |

---

*Last updated: 21 May 2026 — Antigravity AI Engineering*
