# Brief: Jamaica courier/freight-forwarder market + software research (web, read-only)

**Agent:** codex `gpt-5.6-sol`, high reasoning, with web search enabled. **Mode: research and report only — make NO edits to the repo, NO commits.**

## Why this is needed

We are building `apps/couriers`, a multitenant SaaS for Jamaican package-forwarding companies ("couriers"): consumers get a US warehouse address (usually Florida) + a mailbox number, shop on Amazon/eBay/etc., the courier air-freights the packages to Jamaica, clears customs, and the consumer collects at a local branch. We need to know what the incumbent companies' customer-facing websites do and what software powers them, so our hosted customer portal matches (or beats) the industry-standard flow.

## Questions to answer

1. For each of these Jamaican courier companies, find their website and describe the **customer-facing flow**: how signup works, whether/how a mailbox number and US address are shown, what the customer dashboard offers (package tracking, invoices, pre-alerts, rate calculator, branch selection), and anything notable:
   - RocketShip JA — https://rocketshipja.com/home (priority: identify the courier-management software/platform powering their customer portal — inspect page source clues, subdomains, login URL patterns, "powered by" footers, JS bundle origins)
   - ShipKet (Jamaica)
   - QuikShip / Quick Ship Couriers (Jamaica)
   - Kuikshippa / "quikkashippa" (spelling uncertain — search variants; if it does not exist, say so explicitly)
   - Plus 2–3 other prominent Jamaican couriers you find (e.g. MailPac, ShipMe, Tara Couriers) for comparison.
2. Identify the **white-label courier-management software vendors** serving this market (e.g. Zoom Property/eZone-style platforms, "Deliver-It", "CourierMate", "MyCTS", ParcelPerfect, Magaya, WSI SmartCourier — verify which actually serve Caribbean couriers). For each: does it offer a hosted customer portal per courier, custom domains/subdomains, and what does the courier's own branding look like on it?
3. What are the **standard portal features** across these sites (the feature checklist a Jamaican consumer expects): pre-alerts/invoice upload, package status stages (e.g. "at warehouse" → "in transit" → "at customs" → "ready for pickup"), branch pickup selection, delivery scheduling, rate calculators by weight, customs/duty estimation, referral programs?
4. How do these companies handle **custom domains vs subdomains** for their portals (courier.example.com vs portal.vendorapp.com/courier)? What is the dominant pattern?

## Method notes

- Use web search + fetching the actual sites. For rocketshipja.com specifically, look at the HTML source, login/signup URLs, asset hosts, and any redirect target domains to fingerprint the platform.
- If a company or product cannot be found, state that explicitly rather than guessing.
- Current year is 2026 — prefer recent sources.

## Return shape (mandatory)

Markdown report with sections 1–4. Per company: URL, signup flow summary, dashboard features, platform fingerprint (with the evidence — e.g. "login redirects to X", "footer says Y"). End with **"Implications for our portal"**: a ranked feature checklist (must-have vs nice-to-have) and the dominant domain-hosting pattern, in ≤15 bullets.
