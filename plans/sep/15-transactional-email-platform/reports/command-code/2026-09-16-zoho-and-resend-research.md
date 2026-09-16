# Research: Zoho email model + Resend contract verification

Research date: 2026-09-16. Repo state: branch `feature/transactional-email-platform`.

**Scope and method.** All web access was made through the Browserbase `browse` CLI
(`browse cloud search`, `browse cloud fetch`, `browse open`/`browse screenshot` against a remote
Browserbase browser). No `curl`/`wget`/other fetcher was used. No repository source code was
modified; nothing was committed.

**Read budget.** Only the three permitted files were read:
`apps/communications-api/src/providers/{resend-provider.ts,resend-webhook.ts,email-provider.ts}`.

**Honesty convention.** Every factual claim carries a source URL. Anything not confirmed from a
source is marked **unconfirmed** — never guessed. Two research limitations are recorded up front
because they bound Part B's completeness:

1. Browserbase's fetch quota returned `402 {}` partway through the run. It was exhausted only after
   every source cited below had already been retrieved, so no cited claim is affected — but it did
   prevent a few secondary Zoho KB pages from being re-fetched (flagged inline where relevant).
2. A live Zoho Books tenant was **not** available. No screen was captured from an authenticated
   session. All 17 screenshots are the real product screens as published by Zoho in its own
   documentation (see "Screenshots captured"). Nothing about a screen's contents is invented; where
   only a screenshot — not prose — establishes a fact, that source is cited as the image URL.

---

## Part A — Zoho organization email setup

Canonical page for the whole topic: **Emails | Help | Zoho Books** —
https://www.zoho.com/us/books/help/settings/emails.html

Navigation path as documented: *Settings* (top-right) → **Email Notifications** under
*Reminders & Notifications* → **Sender Email Preferences** (left pane).
(https://www.zoho.com/us/books/help/settings/emails.html)

### A1 Sender configuration

**Where the org chooses the From address.** Zoho Books calls the screen **Sender Email Preferences**.
It lists the addresses the organization may use in the **From** field:

> "You can configure the email addresses used in the **From** field of emails sent from Zoho Books."
> — https://www.zoho.com/us/books/help/settings/emails.html

One address can be flagged as the **primary contact**, which becomes the default From:

> "Also, this email address will be used as default in the **From** address of emails sent from Zoho
> Books, unless you change it manually while sending an email."
> — https://www.zoho.com/us/books/help/settings/emails.html ("Mark Primary Contacts")

The Organization Profile page restates this under a **Default Sender Email** label:
> "This address is also used as the default **From** field when sending invoices, estimates, and other
> communications from Zoho Books, unless you manually change them."
> — https://www.zoho.com/us/books/help/settings/organization/organization-profile.html

**Two distinct verification concepts — do not conflate them.** Zoho has *both* a per-address email
verification and a per-domain authentication, and they are surfaced in different places:

| | Per-address verification | Per-domain authentication |
|---|---|---|
| Proves | the mailbox owner consents to be a sender | the org controls the domain's DNS |
| Mechanism | verification email + link | DKIM TXT record in DNS |
| UI state | `Unverified` badge + "Resend Email" | "Unauthenticated Domains" → "Authenticated Domains" |
| Source | https://www.zoho.com/us/books/help/settings/emails.html | https://www.zoho.com/us/books/help/settings/emails.html |

**Single-address verification flow.** Add a Name + Email, and the address is usable in From only after
the mailbox owner verifies:

> "Now, a verification email will be sent to the email address that you added. Once the email address
> has been verified, you will be able to use it in the *From* field of emails sent from Zoho Books."
> — https://www.zoho.com/us/books/help/settings/emails.html ("Add New Sender Email Addresses")

> "Click **Resend Email** next to an email address that has not been verified yet. The verification
> email will be sent again."
> — https://www.zoho.com/us/books/help/settings/emails.html ("Resend Verification Emails")

The unverified state renders as a warning badge next to the address, confirmed from the official
screenshot `resend-email.png`, which shows rows labelled
`⚠ Unverified (Resend Email)` — https://www.zoho.com/books/help/images/settings/emails/resend-email.png

**Whole-domain verification flow.** From the same page, click **Authenticate Now** next to a domain:

> "Emails listed under the **Unauthenticated Domains** section can be authenticated by adding DKIM
> records for their domains. … Click **Authenticate Now** next to the domain that you want to
> authenticate. Copy the **Host Name** and **Value** for the **DKIM** record and add it to the DNS
> settings of your domain name provider. Click **Validate**."
> — https://www.zoho.com/us/books/help/settings/emails.html ("Authenticate Domains")

**Where a verified sender is forced — and what happens with none verified.** This is the single most
instructive Zoho behaviour for 876. Zoho does **not block** sending; it **silently rewrites the From**
to a Zoho-owned address and preserves the org's address as Reply-To:

> "Domains without DKIM records configured are considered unauthenticated. If you use an email address
> from such a domain as the sender in Zoho Books, the email may be flagged as spam. To prevent this,
> Zoho Books automatically replaces the sender's email address to
> **message-service@sender.zohobooks.com** when sending emails on your behalf."
> "The address message-service@sender.zohobooks.com is used only in the From address of emails sent by
> Zoho Books, not in the Reply address. This means your customers will still see your name in their
> inbox, and when they reply, the response will be delivered directly to your email address."
> — https://www.zoho.com/us/books/help/settings/emails.html ("Unauthenticated Domains")

Confirmed visually: the captured Sender Email Preferences screen states under **Unauthenticated
Domains** that "emails will be sent from **message-service@sender.zohobooks.com** to prevent them from
landing in the Spam folder" — see `zoho-books-sender-preferences-unauthenticated.png`
(source image: https://www.zoho.com/books/help/images/settings/emails/unauthenticated-domains.png).

Three further cases qualify the rewrite rule:

- **Public domains (Gmail/Yahoo) are replaced by default but have an opt-out toggle**
  (Sender Email Preferences → **Public Domains** → "Emails Are Sent Through" → *Email address of
  sender*): "If you use an email address that belongs to a public domain, such as **Gmail** or
  **Yahoo Mail**, in the From address …, it will be replaced with
  **message-service@sender.zohobooks.com**. This happens because SPF and DKIM records cannot be added
  for public domains" — https://www.zoho.com/us/books/kb/general/send-email-from-own-address.md
- **DMARC on the public domain overrides the opt-out**: "For emails sent from DMARC-enabled public
  domains like Gmail, message-service@sender.zohobooks.com will be used, even if you have selected the
  sender's email address." — https://www.zoho.com/us/books/kb/general/send-email-from-own-address.md
- **A hard block does exist for AOL**: "If you create your Zoho Books account using an AOL email
  address, you won't be able to send invoices, quotes to your customers as AOL's DMARC policy does not
  allow Zoho Books to send emails on behalf of users/businesses using AOL addresses."
  — https://www.zoho.com/us/books/kb/general/unable-to-send-emails-from-aol-address.md

**Which features consume the sender list.** The reminder module's From dropdown draws only from this
list — "Only the email addresses added as senders in the **Sender Email Preferences** page will be
listed under the **From** field of reminder templates."
(https://www.zoho.com/us/books/kb/reminders/new-sender-email-rem.md)

**Branches/locations:** if enabled, each transaction mails from that location's primary contact
address — "Emails of such transactions will be sent to your contacts from the primary contact's email
address of the respective location or branch."
(https://www.zoho.com/us/books/help/settings/emails.html)

**Alternative sending path — custom SMTP.** Zoho Books supports an **Email Relay**: "Using a custom
SMTP allows businesses to send emails from their own domain or other public domains … You now have the
option to set up email relay servers to send emails from Zoho Books with custom SMTP." Fields: Server
Name, Port, **Daily Mail Limit**, Use Secure Connection, **Mail Delivery Preference**
(Domain-based / Email-based), Domain in this Server, Authentication Required.
(https://www.zoho.com/us/books/help/settings/emails.html → "Email Relay")

- **Zoho Mail connection is inbound-only for this purpose.** The integration is described as pulling
  conversations into the *Mails* tab, not as an outbound path
  (https://www.zoho.com/us/books/help/integrations/zoho-mail-integration.html). An explicit "not
  supported for sending" statement was **not found** — treat as **unconfirmed**, but no doc describes
  outbound via a connected mailbox.
- **Cap on the number of sender addresses — unconfirmed.** No Zoho document found states a numeric
  limit.

### A2 Domain authentication

**DNS records required.** Zoho Books' in-product flow asks for **one DKIM record, added as a TXT
record**. The modal text is explicit about the type:

> "Add **DKIM** (Domain Keys Identified Mail) in the DNS settings of your domain provider to prevent
> your emails from landing in the Spam folder."
> "Add the Host Name and the Value provided below in the DNS settings of your domain provider as a
> **TXT record**."
> — https://www.zoho.com/books/help/images/settings/emails/authticate-dkim.png

Confirmed visually in `zoho-books-dns-spf-dkim-records.png` (same source image). Field shapes
observed: **HOST NAME** = `1522905413783._domainkey.zillum.com`, **VALUE** =
`k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCr6K…`. So the DKIM selector is a
**numeric/timestamp-style selector**, the host is `<selector>._domainkey.<domain>`, and the value is a
standard `k=rsa; p=` DKIM public key. A second selector example appears in the GoDaddy note
(`1522406527365._domainkey.patricia.com`) — https://www.zoho.com/us/books/help/settings/emails.html

Note the help page's image caption says "Add SPF and DKIM Records", but **the dialog itself only
surfaces DKIM** — SPF is documented separately (below). Do not read the caption as evidence of an SPF
step in this flow.

| Record | Type | Name / Host | Value | Source |
|---|---|---|---|---|
| DKIM | TXT | `<numeric-selector>._domainkey.<domain>` | `k=rsa; p=<public key>` | https://www.zoho.com/books/help/images/settings/emails/authticate-dkim.png |
| SPF | TXT | `@` | `v=spf1 include:sender.zoho-books.com ~all` | https://www.zoho.com/us/books/kb/general/spf-record-not-found.md |
| DMARC | — | — | **not required by Zoho Books** (unconfirmed as a Books requirement) | see below |
| Return-path / CNAME | — | — | **not documented for Zoho Books** | see below |

**SPF specifics.** SPF is documented in the KB rather than the product flow, and must be merged with
existing SPF records:

> "If your domain has multiple SPF records, they need to be combined into a single entry. … you will
> also need to include the Zoho Books SPF record, which can be copied from the **Sender Email
> Preference** page in Zoho Books. The combined SPF record should look like this:
> `v=spf1 include:abc.com include:def.com include:sender.zoho-books.com ~all`"
> "**Pro Tip:** For organizations created in the Indian Data Centre, the Zoho Books SPF record is
> `include:sender.zoho-books.in`."
> "Ensure that the **Type** is set to _TXT_ and the **Host** is specified as **@**."
> "An SPF record can only have up to 10 DNS lookups."
> — https://www.zoho.com/us/books/kb/general/spf-record-not-found.md

**Doc inconsistency worth flagging:** three different SPF tokens appear across Zoho Books sources —
`zoho.com` (https://www.zoho.com/us/books/kb/general/spf-dkim-for-emails.md), `zohobooks.com`
(https://www.zoho.com/us/books/kb/invoices/prevents-intimation-emails-spam.html), and
`sender.zoho-books.com` (the SPF-record KB above). The last is the most specific and current. Also note
the From-rewrite domain is `sender.zoho**books**.com` (no hyphen) while the SPF include is
`sender.zoho**-books**.com` (hyphen). No source reconciles these.

**DMARC — not a documented Zoho Books sending requirement.** No Zoho Books page instructs the
customer to publish DMARC for Books sending; Books only *reacts* to a recipient domain's DMARC policy
(the Gmail remap and AOL block in A1). DMARC is documented in depth for **Zoho Mail**, where the record
is `_dmarc.yourdomain.com` TXT e.g.
`v=DMARC1; p=none; rua=mailto:admin@yourdomain.com; sp=none; adkim=r; aspf=s; pct=40`
(https://www.zoho.com/mail/help/adminconsole/dmarc-policy.html). **Treat a DMARC requirement for
Zoho Books as unconfirmed.**

**Return-path / CNAME — not documented for Zoho Books.** No Zoho Books documentation of a return-path
or bounce CNAME was found. The only CNAME in this area belongs to **Zoho Mail** and is for
**domain-ownership verification**, not return-path: alias `zb*******` → `zmverify.zoho.com`
(https://www.zoho.com/mail/help/adminconsole/domain-verification.html). Custom return-path (CNAME) is a
*Zoho Campaigns/ZeptoMail* feature, not a Books one
(https://www.zoho.com/zeptomail/guide/email-authentication.html). **Unconfirmed for Books.**

**Verification states.** Zoho Books exposes only a **two-bucket** domain model plus a per-address
badge — this is much coarser than Resend's:

- **Domain level: `Unauthenticated` → `Authenticated`.** Confirmed from the official screenshots:
  the unauthenticated section carries a red-cross icon and an **Authenticate Now →** action; the
  authenticated section shows a green tick ("Zylker domain is authenticated already"). Sources:
  https://www.zoho.com/books/help/images/settings/emails/unauthenticated-domains.png and
  https://www.zoho.com/books/help/images/settings/emails/authenticated-domains.png
- **Address level: `Unverified` (with a **Resend Email** action) → verified** (badge disappears).
  Source: https://www.zoho.com/books/help/images/settings/emails/resend-email.png
- A named "verification in progress" or "failed" domain state is **unconfirmed** — the docs only say
  validation can fail and to retry.

**While a domain is pending: you can still send, from the Zoho fallback address.** Two verbatim
statements cover this:

> "**Insight:** It will take a while for your newly added records to reflect on the DNS server. If your
> validation fails, wait for a while and try again. Also, **you can continue to use Zoho Books while
> the records are being validated**."
> — https://www.zoho.com/us/books/help/settings/emails.html

Emails continue to be sent, with the From rewritten to `message-service@sender.zohobooks.com` and the
org's address in Reply-To (see A1) — https://www.zoho.com/us/books/help/settings/emails.html

**Re-trigger and timing.** Re-trigger by reopening **Authenticate Now → Validate**; for a single
address, click **Resend Email**. On timing, Zoho Books says only "it takes a while"; the concrete
figures (1–2 h propagation, 12–24 h depending on TTL) are **Zoho Mail** guidance, not Books:
https://www.zoho.com/mail/help/adminconsole/domain-verification.html. **A Books-specific SLA is
unconfirmed.**

**Zoho Mail vs Zoho Books (only as far as it explains domain auth).** They are separate systems with
different record sets. Zoho Mail setup requires ownership verification (TXT
`zoho-verification=zb****.zmverify.zoho.com` at `@`, or CNAME, or HTML file upload —
https://www.zoho.com/mail/help/adminconsole/domain-verification.html) plus **SPF**
(`v=spf1 include:zohomail.com -all` — https://www.zoho.com/mail/help/adminconsole/spf-configuration.html),
**DKIM** (TXT at `<selector>._domainkey.<domain>`, default selector `zoho` —
https://www.zoho.com/mail/help/adminconsole/dkim-configuration.html) and **DMARC**. Neither system uses
a DKIM **CNAME**; the only CNAME in scope is Mail's ownership-verification record.

### A3 Templates

**There are two independent template galleries.** Email templates live under *Settings → Email
Notifications → Templates*; PDF templates live under *Settings → Customization → PDF Templates*.
They are separate bindings — the contact object's `default_templates` map carries distinct keys
(`invoice_template_id` for PDF vs `invoice_email_template_id` for email).
Sources: https://www.zoho.com/us/books/help/settings/emails.html ;
https://www.zoho.com/us/books/help/settings/pdf-templates/ ; https://www.zoho.com/books/api/v3/contacts/

**Template categories, confirmed from the live UI.** The captured screen
`zoho-books-email-template-list-invoice-notification.png` shows the real left-pane module list (the
visible portion of it; the pane scrolls). Categories visible:

`Retainer Invoice Notification` · `Retainer Payment Thank-You` · `Sales Order Notification` ·
`Delivery Challan Notification` · `Invoice Notification` · `Recurring Invoice Notification` ·
`Credit Note Notification` · `Payment Thank-you`
— source image: https://www.zoho.com/books/kb/images/invoices/email-notification.png

The official Contacts API exposes the bound per-contact email-template keys, which corroborate and
extend that list: `invoice_email_template_id`, `estimate_email_template_id` (estimate/quote),
`creditnote_email_template_id`, `purchaseorder_email_template_id`,
`salesorder_email_template_id`, `retainerinvoice_email_template_id`,
`paymentthankyou_email_template_id`, `retainerinvoice_paymentthankyou_email_template_id`,
`payment_remittance_email_template_id` — https://www.zoho.com/books/api/v3/contacts/

**Two important negatives for the brief's category list:**

- **Payment reminder is NOT an email-template category.** It is a separate feature under
  *Settings → Reminders* (see A7). Sources: https://www.zoho.com/us/books/help/settings/reminders.html ;
  https://www.zoho.com/books/kb/reminders/display-cx-bal-in-rem.md
- **"Statement" is a PDF-only category.** The API object exposes `statement_template_id` (PDF) with no
  corresponding `*_email_template_id`, so whether a customer statement has its own **email** template is
  **unconfirmed**. Source: https://www.zoho.com/books/api/v3/contacts/

**Scoping: per organization, per module, and per language.**

- **Per module:** "In the **Templates** section, select the module for which you want to create the
  email template." — https://www.zoho.com/us/books/help/settings/emails.html
- **Per language:** templates can exist as separate per-language sets, and the language-appropriate
  template is assigned per customer — Zoho's own sample iterates email templates, matches
  `type == module + "_notification"`, selects the template whose **name equals the customer's
  `language_code_formatted`**, and writes it to the contact's `default_templates`
  (https://github.com/zoho/zohofinance-automation-samples/blob/main/CustomFunctions/associate_template.ds).
  **Payment reminders specifically cannot be multilingual**: "You cannot configure payment reminders in
  different languages at this point of time."
  (https://www.zoho.com/books/kb/reminders/send-rem-diff-lang.md)

**The default per category, and how it is set.** There is exactly one default per module, and the
create/edit form has a **"Set this to default"** checkbox:

> "Mark **Set this to default** if you want to use this template as the default."
> — https://www.zoho.com/us/books/help/settings/emails.html

Visually, the default is labelled in the list: the captured template list shows the row
`Default` with a blue **Default Template** label beneath it and subject
`Invoice - %InvoiceNumber% from %CompanyName%`
(`zoho-books-email-template-list-invoice-notification.png` —
https://www.zoho.com/books/kb/images/invoices/email-notification.png).

**Binding precedence (official API text): explicit selection → customer-associated template → module
default.**

> "Get the email content based on a specific email template. If this param is not inputted, then the
> content will be based on the email template associated with the customer. If no template is
> associated with the customer, then default template will be used."
> — https://www.zoho.com/books/api/v3/invoices/ ("Get invoice email content")

**Can an org add its own?** Yes — **+New** creates one, and shipped templates can be **cloned**:

> "**Pro Tip:** You can also **clone** a pre-built email template, make changes to it, and then save it
> as a new template."
> — https://www.zoho.com/us/books/help/settings/emails.html

**The only documented template limit** is attachments: "You can also add up to five files (each of
5MB) to each email template by clicking **Attach File(s)**."
(https://www.zoho.com/us/books/help/settings/emails.html). A maximum number of templates is
**unconfirmed**.

**Per-customer override.** *Customers → select customer → **More** → **Associate Templates***; the
chosen templates "will be set as default for this customer and will be used for all future emails."
(https://www.zoho.com/us/books/help/settings/emails.html)

**Template fields.** The template editor holds **From, CC, BCC**, **Subject**, the rich-text
**body**, an **Edit Signature** action shared across a module's templates, and **Attach File(s)** —
so the envelope (From/CC/BCC) is part of the *template*, not only the send dialog:
> "Add or select email addresses for the **From**, **CC** and **BCC** fields. Enter the **Subject** of
> the email."
> — https://www.zoho.com/us/books/help/settings/emails.html

### A4 Placeholders

**Exact syntax: `%VariableName%` — percent-wrapped, confirmed from the live product UI.**

The captured template list shows the default invoice subject literally rendered as
`Invoice - %InvoiceNumber% from %CompanyName%`
(`zoho-books-email-template-list-invoice-notification.png`).

The captured **template editor** for the default invoice notification shows four more document and
organization tokens in the shipped subject and body — Subject `Invoice - %InvoiceNumber% from
%CompanyName%`, body opening `Dear %CustomerName%,` and closing `%UserName%` / `%CompanyName%`:
`zoho-books-template-editor-1.png` /
https://www.zoho.com/books/help/images/settings/emails/customize-template-1.png

The captured reminder content editor adds a third context with three more — `%InvoiceNumber%`,
`%InvoiceDate%`, `%OverdueDays%` — in a single sentence:

> "May we remind you that the invoice `%InvoiceNumber%` issued on `%InvoiceDate%` is overdue by
> `%OverdueDays%` day(s). If you have already paid this invoice, accept our apologies and ignore this
> reminder. We have attached the invoice for your reference."
> — `zoho-books-reminders-content-editor.png` /
> https://www.zoho.com/books/help/images/settings/reminder-content.png

Combined, the UI evidence verifies this token set across three separate contexts:
`%InvoiceNumber%`, `%InvoiceDate%`, `%OverdueDays%`, `%CustomerName%`, `%CompanyName%`, `%UserName%`.
Note that `%CompanyName%` and `%UserName%` are **organization/user** values and `%InvoiceNumber%` /
`%InvoiceDate%` / `%OverdueDays%` are **document** values — so both kinds are drawn from one flat
namespace, which is why Zoho needs no taxonomy (see below).

This is **primary UI evidence**, which matters because Zoho never publishes the placeholder list in
prose. Independent official confirmation of the same delimiter comes from the KB, which instructs
adding `%CustomerBalance%` and notes `%OutstandingBalance%`, and separately `%DepositeTo%` (note the
spelling):
https://www.zoho.com/books/kb/templates/customize-invoice-footer.md ;
https://www.zoho.com/books/kb/templates/display-deposit-to-account.md

**A second, distinct syntax exists for dates** — a parenthesised component form used in journal
Notes/Description fields: `%(d)%`, `%(day)%`, `%(DAY)%`, `%(m)%`, `%(month)%`, `%(MONTH)%`, `%(mm)%`,
`%(y)%`, `%(year)%`, `%(YEAR)%`, with arithmetic such as `%(d-1)%`, `%(m+3)%`. Valid delimiters between
components are whitespace, comma, hyphen or dot, defaulting to space; only one delimiter may be used
between a pair. Source: https://www.zoho.com/books/kb/accountant/date-placeholder.md
This matters for our renderer: it is **not** a second placeholder namespace we need, but it does show
Zoho offers computed/derived values, which a flat map cannot express.

**Is the variable set fixed per category?** Zoho does not document this. The indirect evidence points
to a **curated subset per module/context**: the automation KB says to select the transaction number
"of the module for which the email alert is set up", implying the offered list depends on the module
(https://www.zoho.com/books/kb/automation/module-details.md). Whether there is additionally one global
pool available everywhere is **unconfirmed**. Likewise, **no organization-variable vs
document-variable taxonomy is published** — **unconfirmed**.

**Custom fields are usable as placeholders in both Subject and Body**:
https://www.zoho.com/en-sg/books/kb/templates/cf-email-template.md

**Conditionals and loops: none documented.** The only documented dynamics are flat substitution plus
date arithmetic. Zoho appears to do flat single-value substitution, but an `if`/`for` capability
**cannot be definitively ruled out** — **unconfirmed**.

**Escaping/encoding: not documented** — **unconfirmed.** Two adjacent behaviours are documented and
relevant to a strict renderer:

- A custom-field placeholder with **no value is simply not rendered** (the placeholder disappears).
  Source: https://www.zoho.com/en-sg/books/kb/templates/cf-email-template.md
- The email-content API returns `deprecated_placeholders_used` and `error_list`, implying placeholders
  can become **deprecated** and can **error** during generation.
  Source: https://www.zoho.com/books/api/v3/invoices/ ("Get invoice email content")

### A5 Compose dialog

**Limitation up front.** Zoho's docs enumerate the *template editor's* fields precisely but do **not**
enumerate the send/compose dialog's fields in prose, and a live tenant was unavailable. The
authoritative text establishes how sending is triggered and what the template supplies; several
dialog-level details remain **unconfirmed**. I have flagged each individually below rather than
filling gaps by inference.

**How sending is triggered.** From a saved invoice: *Sales → Invoices → select invoice → **Mail / SMS**
dropdown → choose channel → "Go through the template and click **Send**."*
(https://www.zoho.com/us/books/help/invoice/other-actions.html)

The captured invoice detail toolbar shows that **Mail / SMS** control and its menu — *Send Mail*,
*Send SMS*, *Send Snail Mail* — alongside **Reminders**, **PDF / Print**, **Share**, **Record
Payment**, and **Comments & History**:
source image https://www.zoho.com/books/help/images/invoice/mail-invoice.png

**Fields the template supplies (confirmed).** Because the template itself carries **From, CC, BCC,
Subject** and the body, the compose step starts from a fully-populated message:
> "Add or select email addresses for the **From**, **CC** and **BCC** fields. Enter the **Subject** of
> the email."
> — https://www.zoho.com/us/books/help/settings/emails.html

The captured template editor shows these fields concretely for the default invoice notification —
**Template Name** `Default`, **From** `Patricia Boyle<patriciab@zillum.com>`, **Cc** and **Bcc**
populated with the same address, **Subject** `Invoice - %InvoiceNumber% from %CompanyName%`, and a
**Set this to default** checkbox already ticked: `zoho-books-template-editor-1.png` /
https://www.zoho.com/books/help/images/settings/emails/customize-template-1.png

**Is the From address editable at send time? Partially confirmed — yes.** The template editor's own
helper text under the From field states:

> "This email address will be used as the from address while sending invoices. **Other users can
> choose their email address if they wish to change it.**"
> — `zoho-books-template-editor-1.png` /
> https://www.zoho.com/books/help/images/settings/emails/customize-template-1.png

So the template provides the **default** From, and the sender may substitute their own address during
the send flow. This corroborates the prose that the primary contact address is used "unless you change
it manually while sending an email" (https://www.zoho.com/us/books/help/settings/emails.html), and it
is the strongest available evidence that the compose step exposes an editable From. Note the
constraint implied by A1: the substituted address must itself be one of the org's registered senders —
the reminder KB confirms only registered senders appear in that From dropdown
(https://www.zoho.com/us/books/kb/reminders/new-sender-email-rem.md).

**Is the body editable before sending?** The docs say only to "Go through the template and click
**Send**" (https://www.zoho.com/us/books/help/invoice/other-actions.html) and that templates are
customisable. They do **not** explicitly state that the body is editable inside the send dialog.
**Unconfirmed** — the phrase "go through the template" hints at a review step, but that is inference,
not evidence.

**"Send me a copy" / CC myself — no dialog checkbox documented.** The documented mechanism is instead
to put your own address in the **CC** field of the transaction notification template
(*Settings → Email Notifications → Templates → select module → Show Mail Content → CC → Save*):
https://www.zoho.com/us/books/kb/general/invoice-notification-email-missing.html
A dedicated "send me a copy" toggle in the compose dialog is **unconfirmed**.

**Attach-PDF — a global preference, not a per-send toggle.** The setting is
*Settings → General → PDF Attachment*: **"Attach PDF file with the link while emailing the invoice &
quote?"** (https://www.zoho.com/us/books/kb/quotes/attach-quote-pdf-in-emails.html), described in the
preferences page as "Attach the corresponding PDF of the quote or invoice in the email while sending
it to your customer" (https://www.zoho.com/us/books/help/settings/preferences.html). A related
**Encrypt PDF Files** preference exists there too. Whether a user can un-check the PDF for a single
send is **unconfirmed** — the docs describe an org-level setting.

Evidence the PDF really is attached by default in transactional flows: the shipped reminder body
asserts "**We have attached the invoice for your reference**"
(`zoho-books-reminders-content-editor.png` /
https://www.zoho.com/books/help/images/settings/reminder-content.png), and the invoice email-content
API returns `attach_pdf: true` with `file_name: "INV-00001.pdf"`
(https://www.zoho.com/books/api/v3/invoices/).

**Scheduling — confirmed.** At creation, **Save and Send Later** → in the **Schedule Mail** page
"select the schedule date under *When would you like to send the email?*" → **Schedule**:
https://www.zoho.com/us/books/help/invoice/

**"Send" vs "Mark as Sent" are distinct.** **Mark as Sent** records an invoice as Sent **without**
emailing it (https://www.zoho.com/us/books/help/invoice/other-actions.html). Whether emailing
automatically flips Draft → Sent is strongly implied but not stated verbatim — **implied only**.

**Also unconfirmed:** an in-dialog email-template selector (the doc that sounds like one actually
describes choosing a **PDF** template — https://www.zoho.com/us/books/kb/templates/select-multiple-invoice-templates.md);
an ad-hoc attachment picker in the send dialog; scheduling from the detail page rather than creation;
and whether the compose dialog exposes To/CC/BCC individually. The **From** field is the one envelope
field with positive evidence of being editable at send time (helper text, above); the rest remain
**unconfirmed**.

### A6 Delivery history

**Feature: "Email Insights".** Enabled at *Settings → Email Notifications (Reminders & Notifications) →
Email Insights* → toggle **"Track the emails sent to your customers"**. Tracking scope is exactly
**Invoices, Retainer Invoices, and Quotes**:
> "When you enable email insights, you will be able to track notification emails for: **Invoices**,
> **Retainer Invoices**, **Quotes**."
> — https://www.zoho.com/us/books/help/settings/emails.html

**Granularity: three states only.** Zoho documents exactly three icons:

| Icon | Meaning | Source |
|---|---|---|
| Mail (sent) | "the transaction was sent via mail" | https://www.zoho.com/us/books/help/settings/emails.html |
| Open Mail (opened) | "the transaction's notification mail was opened" | https://www.zoho.com/us/books/help/settings/emails.html |
| Eye (viewed) | "the transaction was viewed from the customer portal" | https://www.zoho.com/us/books/help/settings/emails.html |

**`delivered`, `bounced`, `clicked` and `failed` are not documented anywhere** in Zoho Books Email
Insights — **unconfirmed** (i.e. no evidence they exist). This is a striking contrast with Resend,
whose event set covers all four (B3).

**Where it appears:**
- **Transaction list views** for Invoices / Retainer Invoices / Quotes, as an icon per row. A view
  filter **"Client Viewed"** isolates customer-viewed transactions.
  https://www.zoho.com/us/books/help/settings/emails.html
- **Transaction details page**, under **Comments & History** in the top-right corner.
  https://www.zoho.com/us/books/help/settings/emails.html

**Open time is exposed** — you can "view the time and date the emails … were opened"
(https://www.zoho.com/us/books/kb/invoices/email-insights.html); the help scenario cites "the exact
date and time when he viewed it" (https://www.zoho.com/us/books/help/settings/emails.html).

**Attribution rule:** "If the email you sent has multiple recipients, the corresponding transaction
will be marked as viewed when any one of them opens it."
(https://www.zoho.com/us/books/help/settings/emails.html)

**Mechanism and its accuracy caveat — web beacons.** "A small graphic, the size of one pixel, is
embedded at the bottom of HTML emails sent from Zoho Books. When a recipient opens the email and
chooses to display images in it, this tiny image is downloaded from our server."
> "**Warning:** If your customer does not choose to display images for your email, Zoho Books will not
> be able to track the status. Hence, in some cases, Zoho Books could display the status of your email
> as being unopened, even if it was opened by your customers."
> — https://www.zoho.com/us/books/help/settings/emails.html

**Unconfirmed:** an org-wide email log (status is surfaced **per transaction**); any retention period
for insights data; per-email sender attribution (the Audit Trail records transaction *modifications*,
and email sends are not explicitly listed as audited events —
https://www.zoho.com/us/books/kb/reports/audit-trail.html).

### A7 Reminders

**Setup path:** *Settings → Reminders* (under *Reminders & Notifications*), then the **Invoices** tab
(or **Bills** for vendor-side). Source: https://www.zoho.com/us/books/help/settings/reminders.html

**Structure, confirmed from the live UI.** The captured **Automated Reminders** screen shows two
groupings and the exact schedule grammar (`zoho-books-reminders-automated-invoice.png` /
https://www.zoho.com/books/help/images/settings/reminder-automated.png):

**Reminders Based on Expected Payment Date**
- `Payment Expected` — "Remind me **0 day(s) After** expected payment date" — ON

**Reminders Based on Due Date**
- `Reminder - 1` — "Remind me 0 day(s) After due date" — OFF
- `Reminder - 2` — "Remind me 0 day(s) After due date" — OFF
- `Reminder - 3` — "Remind me 0 day(s) After due date" — OFF
- `Invoice-Reminder` — "**Remind customer and copy me** 5 day(s) After due date" — ON
- `+ New Reminder`

That single screen establishes most of the model: reminders are **named**, scheduled as an
**offset in days before or after** a reference date, have a **recipient mode** ("remind customer and
copy me"), and are individually **toggled on/off**. Zoho ships **three** reminder slots by default:

> "By default, there are **three** reminders. You can choose to send reminders **before or after**
> their due date. Based on your preferences you can set the time interval."
> — https://www.zoho.com/us/books/help/settings/reminders.html

**Per-reminder content is editable**, and each reminder's content editor offers **Insert Placeholders**
and a **Delete this reminder** action — confirmed in `zoho-books-reminders-content-editor.png`
(https://www.zoho.com/books/help/images/settings/reminder-content.png). You can also add external
users to a reminder's **Cc/Bcc**, for both manual and automated reminders
(https://www.zoho.com/us/books/kb/reminders/add-ext-users.html).

**Manual reminders** exist too: *Sales → Invoices → select overdue invoice → **Reminders → Send Now***,
with the two manual cases "Reminders for Overdue Invoices" and "Reminders for Sent Invoices"
("enabled by default for all the customers"):
https://www.zoho.com/us/books/help/settings/reminders.html

**Expect-then-suppress is a first-class concept.** Setting an **Expected Payment Date** on the invoice
offers "don't remind about payment until then", which suppresses the regular reminders until that
date: *Reminders → Expected Payment Date* →
https://www.zoho.com/us/books/help/settings/reminders.html

**Per-customer overrides — disable is confirmed, reschedule is not.** *Customers → select customer →
**More** → **Stop All Reminders***: "All reminders associated with the selected customer will be
disabled." (https://www.zoho.com/us/books/kb/reminders/stop-rem.html ;
https://www.zoho.com/us/books/kb/users-and-roles/stop-reminders.html) Changing an individual
customer's *intervals* is **not documented** — **unconfirmed**; intervals are configured globally on
the reminder template.

**Scope:** the Reminders module tabs are **Invoices** and **Bills** only. Reminders are **not
documented for quotes/estimates** — note this differs from Email Insights, which does cover Quotes
(https://www.zoho.com/us/books/help/settings/reminders.html).

### Screenshots captured

All 17 PNGs were captured with `browse open <image-url> --remote -s <session>` followed by
`browse screenshot --full-page`, and are stored in
`plans/sep/15-transactional-email-platform/reports/command-code/screenshots/`.

**Provenance and its limits (read this before using them):** these are Zoho's own published captures
of the real setup screens, rendered in a browser and re-captured. They are **not** from a live
authenticated Zoho tenant — no Zoho login was available. Each file's source is the Zoho image URL
listed below. Screens are cropped as Zoho published them, so some panels (e.g. a scrolling module
list) show only a portion; where that matters it is noted in the relevant section above.

| Filename | Screen | Source |
|---|---|---|
| `zoho-books-sender-preferences-unauthenticated.png` | Sender Email Preferences — Unauthenticated Domains, showing the From-rewrite fallback address | https://www.zoho.com/books/help/images/settings/emails/unauthenticated-domains.png |
| `zoho-books-sender-preferences-authenticated.png` | Sender Email Preferences — Authenticated Domains | https://www.zoho.com/books/help/images/settings/emails/authenticated-domains.png |
| `zoho-books-dns-spf-dkim-records.png` | "Authenticate &lt;domain&gt;" modal — DKIM TXT host name + value, Validate | https://www.zoho.com/books/help/images/settings/emails/authticate-dkim.png |
| `zoho-books-add-sender-dialog.png` | + New Sender entry point | https://www.zoho.com/books/help/images/settings/emails/new-sender.png |
| `zoho-books-resend-verification-email.png` | Unverified address rows with "Resend Email" | https://www.zoho.com/books/help/images/settings/emails/resend-email.png |
| `zoho-books-edit-delete-senders.png` | Edit / delete sender addresses | https://www.zoho.com/books/help/images/settings/emails/edit-delete-senders.png |
| `zoho-books-mark-primary-contacts.png` | Mark as Primary Contact | https://www.zoho.com/books/help/images/settings/emails/mark-primary-contact.png |
| `zoho-books-email-template-list-invoice-notification.png` | **Template list** — module pane + Default template showing `%InvoiceNumber%` / `%CompanyName%` | https://www.zoho.com/books/kb/images/invoices/email-notification.png |
| `zoho-books-create-email-template.png` | Create template (+New) | https://www.zoho.com/books/help/images/settings/emails/new-template.png |
| `zoho-books-template-editor-1.png` | **Template editor** — name, From/CC/BCC, Subject, "Set this to default" | https://www.zoho.com/books/help/images/settings/emails/customize-template-1.png |
| `zoho-books-template-editor-2.png` | **Template editor** — body toolbar, Insert Placeholders, Insert Image | https://www.zoho.com/books/help/images/settings/emails/customize-template-2.png |
| `zoho-books-associate-templates-with-customers.png` | Associate Templates with a customer | https://www.zoho.com/books/help/images/settings/emails/associate-templates.png |
| `zoho-books-enable-email-insights.png` | Email Insights enable toggle | https://www.zoho.com/books/help/images/settings/emails/enable-email-insights.png |
| `zoho-books-email-tracking-list-view.png` | Delivery status icons in the transaction list | https://www.zoho.com/books/help/images/settings/emails/track-email-1.png |
| `zoho-books-email-tracking-detail-page.png` | Delivery status under Comments & History | https://www.zoho.com/books/help/images/settings/emails/track-email-2.png |
| `zoho-books-reminders-automated-invoice.png` | **Automated Reminders** — schedule + recipient mode + toggles | https://www.zoho.com/books/help/images/settings/reminder-automated.png |
| `zoho-books-reminders-content-editor.png` | **Reminder content editor** — `%InvoiceNumber%` / `%InvoiceDate%` / `%OverdueDays%`, Insert Placeholders | https://www.zoho.com/books/help/images/settings/reminder-content.png |

A live capture of the **invoice compose dialog** was not obtained. The closest real evidence is the
**Mail / SMS → Send Mail** menu on the invoice toolbar (source image
https://www.zoho.com/books/help/images/invoice/mail-invoice.png); the dialog's own field list remains
**unconfirmed** (see A5). No compose-dialog screenshot is claimed.

### What 876 should copy / deliberately not copy

**Copy these — they are the load-bearing parts of Zoho's model**

1. **Verified sender is the unit of configuration, not a raw From string.** Zoho makes the org
   register addresses and domains up front and then pick from that set. 876 should mirror this: a
   per-organization registry of sending identities (address and/or domain), each with an explicit
   verification state, so "who may we send as" is a stored fact rather than a per-send free choice.
2. **Two distinct verification axes, kept visibly separate in the UI.** Zoho separates *address
   consent* (verification email; `Unverified` badge) from *domain control* (DNS DKIM; Unauthenticated
   → Authenticated). These fail for entirely different reasons and need different remedies. 876 should
   not collapse them into one boolean.
3. **A graceful, visible fallback instead of a hard failure.** The `message-service@sender.zohobooks.com`
   rewrite is Zoho's best idea: an unverified sender does not block the business process; the send
   still happens from a deliverable address, and the org's real address is preserved as **Reply-To** so
   customer replies still route correctly. Zoho also documents this openly in the UI
   (`zoho-books-sender-preferences-unauthenticated.png`). 876 has the same business constraint
   (invoice/payment mail must not silently fail) and should adopt the same shape: send, rewrite, keep
   Reply-To, and *tell the org in the UI that it happened*.
4. **The "pending" window is not a dead end.** "you can continue to use Zoho Books while the records
   are being validated" plus an explicit **Validate** retry is a well-judged UX: DNS propagation
   latency is surfaced as a normal state, not an error. 876's domain flow should allow sending during
   pending and expose a re-check action.
5. **A single default per (module, language), with a documented resolution order.** Zoho's precedence —
   *explicit template → customer-associated template → module default* — is a clean, explainable
   resolution algorithm, and per-language sets follow the same rule. 876 should adopt the same
   precedence and make it explicit, because "which template did this email use" is otherwise
   unanswerable.
6. **Clone-and-edit over build-from-scratch.** Shipping a working `Default` template per category and
   letting orgs clone it (rather than authoring HTML from a blank page) is what makes template
   customisation safe for non-technical org staff.
7. **Reminder scheduling as (offset, direction, recipient-mode) with per-reminder toggles.** The
   captured schedule grammar — *"Remind customer and copy me N day(s) after due date"*, individually
   toggleable — is a compact and sufficient model. 876 should copy the *shape* verbatim rather than
   inventing a cron-like surface.
8. **Expect-then-suppress.** An "expected payment date" that suppresses the reminder cadence until
   that date prevents the single most annoying billing-email failure mode (chasing a customer who has
   already promised a date). This is cheap to model and high-value.
9. **Per-customer override as an escape hatch.** *Stop All Reminders* per customer is a blunt but
   genuinely needed control; 876 should have an equivalent at the organization→customer level.

**Deliberately do NOT copy**

1. **The undocumented placeholder list.** Zoho's variable set is not published anywhere — it is only a
   UI dropdown, and its per-module scope is itself unconfirmed (A4). 876's renderer already takes an
   **explicit flat variable map**, which is strictly better: it is testable, versionable, and can
   reject an unknown key at render time. Do not evolve toward "whatever the UI offers" — publish the
   per-category variable set as a contract instead.
2. **Zoho's placeholder syntax.** `%VariableName%` is ambiguous with literal percent signs (no
   documented escaping — A4), and Zoho additionally carries a *second* syntax (`%(d-1)%` with
   arithmetic). Adopting `%…%` would force us to guess at escaping rules Zoho never specified. Keep an
   unambiguous delimiter for the flat map.
3. **Number and date arithmetic inside templates** (`%(m+1)%`). It is a second, weakly-typed
   expression language hiding inside a "flat" substitution system — exactly the complexity 876 should
   keep out of a renderer. Compute derived values in code and pass them as ordinary variables.
4. **Envelope fields (From/CC/BCC) living on the template.** Zoho puts From/CC/BCC in the *template*
   (A3), which conflates presentation with routing and makes "which address did this mail come from?"
   depend on template-selection logic. 876 should keep the sender identity on the *sending context*
   (organization + document type) and let the template own only subject/body.
5. **The three-state delivery model.** Zoho shows only sent/opened/viewed and documents no
   delivered/bounced/failed (A6) — so an org literally cannot tell a hard bounce from a silent
   non-delivery. Resend already gives 876 `email.delivered` / `email.bounced` /
   `email.delivery_delayed` / `email.failed` (B3.7). Surface the richer set; a billing platform
   needs to distinguish "not delivered" from "not read".
6. **Web-beacon open tracking as the primary signal.** Zoho's own warning — "Zoho Books could display
   the status of your email as being unopened, even if it was opened" (A6) — makes open status
   unreliable as a business input, and web beacons bring privacy/compliance surface with them. Treat
   opens as a soft, optional signal at most; do not build billing decisions on it.
7. **Binary unauthenticated/authenticated domain states.** Zoho exposes no in-progress or failed
   domain state (A2), which leaves an org unable to tell "still propagating" from "your DNS is wrong
   and will never verify". 876 should keep richer states — which Resend already returns,
   `pending` / `fail*` variants included (B2.7) — rather than flattening to Zoho's two buckets.
8. **The DKIM-only authentication flow.** Zoho Books asks only for a DKIM TXT record and documents
   DMARC for a *different product* (Mail) (A2). SPF/DMARC alignment matters for a platform sending
   invoices at volume. 876 should surface the full record set the provider returns — which is a
   problem today, because our adapter drops part of it (B6 finding 3).
9. **Per-send attachments being an org-global preference only.** Zoho's attach-PDF control is a
   global setting (A5), so an org cannot choose per document. 876 should make attachment choice
   expressible per send — though note our provider interface currently cannot express attachments at
   all (B6 finding 7).
10. **A multilingual template matrix as the default assumption.** Zoho scopes templates per language
    and then admits payment reminders *cannot* be multilingual (A3) — an inconsistency worth not
    inheriting. Add language scoping when a real customer needs it, not before.

---

## Part B — Resend contract

Verified against the live Resend docs and, where the rendered docs and the machine-readable schema
disagree, against the **official OpenAPI spec** (`info.version: 1.5.1`, OpenAPI 3.1.2,
https://raw.githubusercontent.com/resend/resend-openapi/main/resend.yaml). Base URL
`https://api.resend.com`; auth `Authorization: Bearer re_xxxxxxxxx`
(https://resend.com/docs/api-reference/introduction).

### B1 `POST /emails`

**Request body — exact JSON keys** (schema: OpenAPI `SendEmailRequest`; prose:
https://resend.com/docs/api-reference/emails/send-email).

| Key | Type | Required | Notes |
|---|---|---|---|
| `from` | string | **yes** | Friendly-name form `"Name <email@example.com>"` supported |
| `to` | string \| string[] | **yes** | **Max 50** |
| `subject` | string | **yes** | |
| `cc` | string \| string[] | no | no documented cap (**unconfirmed**) |
| `bcc` | string \| string[] | no | no documented cap (**unconfirmed**) |
| `reply_to` | string \| string[] | no | in spec + examples; omitted from the rendered docs' parameter widget |
| `html` | string | no | |
| `text` | string | no | if omitted, generated from `html`; `""` opts out |
| `headers` | object | no | custom headers |
| `attachments` | array | no | see B5 |
| `tags` | array | no | `{ name, value }`, each ≤256 chars, `[A-Za-z0-9_-]` |
| `scheduled_at` | string | no | ISO 8601 **or** natural language ("in 1 hour"); max 30 days ahead |
| `template` | object | no | `{ id, variables }`; mutually exclusive with `html`/`text`/`react` |
| `topic_id` | string | no | spec-only; omitted from the rendered docs |
| `react` | — | no | Node.js SDK only; not a wire field |

**Idempotency.** Header name is exactly **`Idempotency-Key`** (spec: `in: header`,
`maxLength: 256`). SMTP equivalent `Resend-Idempotency-Key`. Supported on `POST /emails` and
`POST /emails/batch` only.
- **Value:** free-form string, **1–256 characters**; docs recommend a UUID or
  `<event-type>/<entity-id>` — format is not enforced.
- **Retention: 24 hours.** "Idempotency keys are kept in the system for **24 hours**."
  (https://resend.com/docs/dashboard/emails/idempotency-keys; the send-email page repeats
  "Idempotency keys expire after 24 hours").
- **Replay semantics: returns the ORIGINAL response and does not resend.** "Resend checks whether an
  email with the same idempotency key has already been sent in the last 24 hours … you can make the
  same request and our API will give the same response, without actually sending the email again."
  (https://resend.com/docs/dashboard/emails/idempotency-keys)
- **Idempotency-specific errors:** `400 invalid_idempotency_key` (length out of range);
  `409 invalid_idempotent_request` (key reused within 24 h with a **different body**);
  `409 concurrent_idempotent_requests` (same key still in flight).

**Success response — HTTP 200, body has exactly one documented field:** `{ "id": "<uuid>" }`
(OpenAPI `SendEmailResponse`; https://resend.com/docs/api-reference/emails/send-email). The batch
endpoint returns `{ "data": [ { "id": "…" } ] }`.

**Error body shape:** `{ "name": <machine code>, "statusCode": <number>, "message": <human text> }`
— e.g. the `422 validation_error` example at https://resend.com/docs/api-reference/pagination.
A `type` field is **unconfirmed** (not present in any observed error body); `name` is the stable
identifier. Documented codes include: `400 validation_error` / `invalid_idempotency_key`;
`401 missing_api_key` / `restricted_api_key`; `403 email_above_quota` / `invalid_permission` /
`suspended_api_key` / `validation_error` (unverified `from` domain, test-mode recipient restriction);
`404 not_found`; `409` (idempotency, `resource_locked`); `422 invalid_attachment` /
`invalid_parameter` / `missing_required_field` / `missing_required_parameter`;
`429 daily_quota_exceeded` / `monthly_quota_exceeded` / `rate_limit_exceeded`;
`500 application_error`; `503 service_unavailable`.
(https://resend.com/docs/api-reference/errors)
Also documented: a **missing `User-Agent` header is rejected with 403** (error code `1010`) — all API
requests must send one (https://resend.com/docs/api-reference/introduction).

### B2 Domains endpoints

| Endpoint | Success | Response shape | Source |
|---|---|---|---|
| `POST /domains` | **201** | `CreateDomainResponse`: `id`, `name`, `created_at`, `status`, `capabilities`, `records[]`, `region`, `open_tracking`, `click_tracking`, `tracking_subdomain` | https://resend.com/docs/api-reference/domains/create-domain |
| `GET /domains` | 200 | `{ object: "list", has_more: bool, data: ListDomainsItem[] }` — **no total** | https://resend.com/docs/api-reference/domains/list-domains |
| `GET /domains/:id` | 200 | full `Domain` incl. `records[]` and `object: "domain"` | https://resend.com/docs/api-reference/domains/get-domain |
| `POST /domains/:id/verify` | 200 | `{ object: "domain", id }` | https://resend.com/docs/api-reference/domains/verify-domain |
| `DELETE /domains/:id` | 200 | `{ object: "domain", id, deleted: true }` | https://resend.com/docs/api-reference/domains/delete-domain |

**Create request body:** `name` (**required**), plus optional `region`, `custom_return_path`
(defaults to `send`), `open_tracking`, `click_tracking`, `tls` (`opportunistic` | `enforced`),
`capabilities` (`{ sending, receiving }`), `tracking_subdomain`.

**`region` values (exact):** `us-east-1` | `eu-west-1` | `sa-east-1` | `ap-northeast-1`;
**optional**, defaults to `us-east-1` (OpenAPI enum;
https://resend.com/docs/dashboard/domains/regions).

**Enterprise plan required? No.** Neither the endpoint docs nor the spec gate it, and the free tier now
includes up to 3 verified domains in any region
(https://resend.com/changelog/three-domains-on-the-free-tier).

**Pagination:** cursor-based — `limit` (1–100; if omitted, all items are returned), `after`, `before`
(by object `id`); `after` + `before` together → `422`
(https://resend.com/docs/api-reference/pagination).

**Verify semantics — asynchronous, and it forces `pending`:** triggering verification temporarily marks
the domain `pending` regardless of its prior status while verification runs, and emits `domain.updated`
webhooks as the status changes (https://resend.com/docs/api-reference/domains/verify-domain).

**DOMAIN STATUS — exact values.** The authoritative OpenAPI enum (identical on
`CreateDomainResponse.status`, `Domain.status`, `ListDomainsItem.status`) is:

> `not_started` | `pending` | `verified` | `partially_verified` | `partially_failed` | `failed`

Note `failed`, **not** `failure`. The docs' prose adds a seventh, `temporary_failure` (a previously
verified domain whose records can no longer be detected; rechecked for 72 h, then becomes `failed`) —
but that token is **absent from the domain-status enum in the spec** and is present only in the
*record*-status enum. Treat `temporary_failure` as **prose-documented but not in the machine-readable
domain enum** (likely spec lag). Sources:
https://raw.githubusercontent.com/resend/resend-openapi/main/resend.yaml ;
https://resend.com/docs/dashboard/domains/manage-domains

**DNS RECORDS ARRAY — exact field names** (OpenAPI `DomainRecord`):

| Field | Type | Exact values / notes |
|---|---|---|
| `record` | string | **purpose**: `SPF` \| `DKIM` \| `Receiving` \| `Tracking` \| `TrackingCAA` |
| `name` | string | record name/host |
| `type` | string | **DNS type**: `MX` \| `TXT` \| `CNAME` \| `CAA` |
| `value` | string | record value |
| `status` | string | `pending` \| `verified` \| `failed` \| `temporary_failure` \| `not_started` |
| `ttl` | string | e.g. `"Auto"` |
| `priority` | integer | **only applicable to MX records** |

Two corrections to the brief's premise, both material:

- **There is no DMARC record.** `DMARC` appears in neither the `record` nor the `type` enum, and no
  documented example contains one. Resend returns SPF, DKIM, Tracking (and Receiving/TrackingCAA where
  applicable). Source: https://raw.githubusercontent.com/resend/resend-openapi/main/resend.yaml
- **The field holding the DNS kind is `type`; the field holding the record's *purpose* is `record`.**
  A DNS name like `send` is not self-describing, so `record` is what tells you a row is SPF vs DKIM.

Record counts vary by configuration and the docs are internally inconsistent: the create-domain
example returns **6** records (SPF MX + SPF TXT + **three** DKIM CNAMEs + Tracking CNAME), while the
get-domain example returns **4** (SPF MX + SPF TXT + **one** DKIM TXT named `resend._domainkey` +
Tracking CNAME). SPF is consistently returned as **two** records (one MX + one TXT). `Receiving` and
`TrackingCAA` appear only in the enum with no example — counts **unconfirmed**.
Sources: https://resend.com/docs/api-reference/domains/create-domain ;
https://resend.com/docs/api-reference/domains/get-domain

### B3 Webhooks

**Signing scheme: Svix** (which implements the Standard Webhooks spec). Evidence: Resend's own
verify guide instructs `npm install svix` and `import { Webhook } from 'svix'`
(https://resend.com/docs/webhooks/verify-webhooks-requests), and the OpenAPI spec's Webhook Events
group states deliveries are "signed using Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`)".
Svix's `svix-*` headers are the Svix-branded aliases of the spec's `webhook-*` headers
(https://docs.svix.com/receiving/verifying-payloads/how).

**Headers — exact names:** `svix-id`, `svix-timestamp`, `svix-signature`.
Example values from Resend's docs: `svix-id: msg_p5jXN8AQM9LWM0D4loKWxJek`,
`svix-timestamp: 1614265330`, `svix-signature: v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=`.
(https://resend.com/docs/webhooks/verify-webhooks-requests)

**Algorithm and signed string:** **HMAC-SHA256** over the concatenation
**`{svix-id}.{svix-timestamp}.{raw body}`** with literal `.` separators. Verbatim from Svix:
`const signedContent = \`${svix_id}.${svix_timestamp}.${body}\`;` where `body` is the **raw request
body string**, not re-serialized JSON. Resend repeats the warning: "Make sure that you're using the raw
request body when verifying webhooks… Some frameworks parse the request as JSON and then stringify it,
and this will also break the signature verification."
(https://docs.svix.com/receiving/verifying-payloads/how-manual ;
https://resend.com/docs/webhooks/verify-webhooks-requests)

**Signature header value format:** each signature is `v1,<base64 HMAC>`; multiple signatures are
**space-separated** and a payload is valid if your computed signature matches **any** of them.
(https://docs.svix.com/receiving/verifying-payloads/how-manual)

**Secret format:** literal prefix **`whsec_`**, and the remainder is **base64-encoded bytes** that
must be decoded to get the HMAC key: `Buffer.from(secret.split('_')[1], "base64")`
(https://docs.svix.com/receiving/verifying-payloads/how-manual). Found in the Resend dashboard on the
webhook's details page, and returned as `signing_secret` by the create/get/list/rotate webhook
endpoints (https://resend.com/docs/api-reference/webhooks/create-webhook). Rotation is available at
`POST /webhooks/{id}/signing-secret/rotate`; after rotation **both old and new secrets sign for 24
hours**.

**Tolerance window: 5 minutes (300 s), symmetric (past or future).** "Our libraries automatically
reject webhooks with a timestamp that are more than five minutes away (past or future) from the current
time." (https://docs.svix.com/receiving/verifying-payloads/why) Resend's own docs do not restate a
number — a **Resend-specific** tolerance is **unconfirmed**; 300 s is the Svix library default.

**Event types — full documented list** (https://resend.com/docs/webhooks/event-types):

| Group | Event strings |
|---|---|
| Email | `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, `email.failed`, `email.scheduled`, `email.received`, `email.suppressed` |
| Domain | `domain.created`, `domain.updated`, `domain.deleted` |
| Contact | `contact.created`, `contact.updated`, `contact.deleted` |
| Suppression | `suppression.added`, `suppression.removed` |

Two corrections to the brief's assumed list: **`domain.verified` and `domain.failed` do not exist**
(only created/updated/deleted), and **`email.suppressed` exists** but was missing from the brief.

**Payload shape.** Every event is `{ type, created_at, data }`, where `created_at` is an ISO 8601
timestamp for the *event*. Email `data` objects share: `broadcast_id`, `created_at` (the *email's*
creation time — distinct from the top-level field), `email_id`, `message_id` (RFC Message-ID),
`from`, `to` (array), `subject`, `template_id`, `tags`. Event-specific additions:
`email.bounced` → `bounce` object (`message`, `subType` e.g. `Suppressed`, `type` e.g. `Permanent`,
`diagnosticCode` array); `email.failed` → `failed.reason` (e.g. `reached_daily_quota`);
`email.clicked` → `click` object (`ipAddress`, `link`, `timestamp`, `userAgent`);
`email.received` → `received_for` (**metadata only** — no body/headers/attachments; fetch content via
the received-emails API); `email.suppressed` → suppression details.
(https://resend.com/docs/webhooks/emails/{sent,delivered,bounced,failed,clicked,received,suppressed})

**Delivery semantics:** at-least-once (duplicates possible — dedupe on `svix-id`; ordering is not
guaranteed, sort by payload `created_at`). Retry schedule on non-2xx:
`5s → 5m → 30m → 2h → 5h → 10h`. Source IPs for allowlisting: `44.228.126.217`, `50.112.21.217`,
`52.24.126.164`, `54.148.139.208`, IPv6 `2600:1f24:64:8000::/52`.
(https://resend.com/docs/webhooks/introduction)

**Management + filtering:** `POST /webhooks` requires `endpoint` and an explicit `events` string array
— that list *is* the event filter (https://resend.com/docs/api-reference/webhooks/create-webhook).
Also available: `GET /webhooks`, `GET /webhooks/{id}`, `PATCH /webhooks/{id}`, `DELETE /webhooks/{id}`,
`POST /webhooks/{id}/signing-secret/rotate`, `GET /webhooks/{id}/events`,
`GET /webhooks/{id}/events/{event_id}`, `POST /webhooks/{id}/events/{event_id}/replay`,
`GET /webhooks/{id}/events/{event_id}/attempts`.

### B4 API key permissions

**Exactly two permissions** — `full_access` ("Can create, delete, get, and update any resource") and
`sending_access` ("Can only send emails"). Verbatim:
https://resend.com/docs/api-reference/api-keys/create-api-key ;
https://resend.com/changelog/new-api-key-permissions

**There is no third key type.** Domain scoping is a *modifier* on a sending key, not a tier: `domain_id`
— "Restrict an API key to send emails only from a specific domain. This is only used when the
`permission` is set to `sending_access`." A `full_access` key cannot be domain-restricted.
(https://resend.com/docs/api-reference/api-keys/create-api-key)

**Which endpoints a sending-only key cannot call — Resend publishes no per-endpoint table.** The rule
is stated categorically ("sending access … can only send emails"), and the OpenAPI spec carries only a
global bearer scheme with no per-operation scopes, so there is no machine-readable enumeration. The
following are **implied but not individually enumerated** by Resend, and I am flagging them rather than
asserting them: `POST /domains`, `GET /domains`, `GET /domains/:id`, `POST /domains/:id/verify`,
`DELETE /domains/:id`, webhook management. Whether `GET /emails/:id` is blocked is **genuinely
ambiguous — unconfirmed**.

**The status code for a forbidden call is 401, not 403** — a correction to the brief's assumption. The
errors reference documents: **`restricted_api_key` — status `401` — message "This API key is restricted
to only send emails."** with the remedy "Make sure the API key has `Full access` to perform actions
other than sending emails."
(https://resend.com/docs/api-reference/errors) Note a **different** case reuses the same error string
at 403 (`restricted_api_key` = "API key is not active") — the two must not be conflated. Resend's
agent-facing auth doc loosely says "403 — Key lacks permission for this resource"
(https://resend.com/auth), which conflicts with the precise errors-reference entry; handle both.

**Key format/expiry:** prefix **`re_`** (https://resend.com/auth). **Keys do not expire automatically**
— "Resend API keys don't expire automatically. Keys remain valid until you manually delete them."
Recommended rotation ≈90 days. The key value is shown **once** at creation; later reads return metadata
only. Only `name` is API-updatable; `permission`/`domain_id` require a new key.
(https://resend.com/docs/knowledge-base/how-to-handle-api-keys)

### B5 Limits

**Rate limit: 10 requests/second per team** — shared across all API keys under the team, not per key or
per domain. Exceeding returns **429 `rate_limit_exceeded`**. Response headers (IETF ratelimit draft):
`ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`, `retry-after`.
`POST /emails/batch` (≤100 emails) counts as **one** request.
(https://resend.com/docs/api-reference/rate-limit ;
https://resend.com/docs/knowledge-base/account-quotas-and-limits)

**Attachments:** maximum **40 MB per email, measured after Base64 encoding** of attachments
(https://resend.com/docs/api-reference/emails/send-email ;
https://resend.com/docs/dashboard/emails/attachments). Per attachment: either `content`
(Base64 string) **or** `path` (remote URL) is required — neither → `422 invalid_attachment`; other
fields `filename`, `content_type`, `content_id` (for inline `cid:` images, **&lt;128 chars**).
**Attachments cannot be sent via the batch endpoint.** Executable/script extensions are blocked —
a long explicit list including `.exe`, `.js`, `.ps1`, `.bat`, `.cmd`, `.com`, `.scr`, `.vbs`, `.reg`,
`.msi`, `.scr` (full list at
https://resend.com/docs/knowledge-base/what-attachment-types-are-not-supported). **Maximum *number* of
attachments is not documented — unconfirmed.**

**Recipients:** `to` **max 50**. `cc` and `bcc` maxima are **not documented — unconfirmed**.
Quota accounting is per-recipient: "Multiple `To`, `CC`, or `BCC` recipients in sent emails count as
separate emails." Batch endpoint: ≤100 emails/request, ≤50 recipients each, atomic.
(https://resend.com/docs/knowledge-base/account-quotas-and-limits)

**Quota headers:** `x-resend-daily-quota` (**Free plan only**), `x-resend-monthly-quota`.
Quota errors: `429 daily_quota_exceeded`, `429 monthly_quota_exceeded`.
(https://resend.com/docs/api-reference/rate-limit)

**Plans:** Free — 100 emails/day (UTC calendar day, resets midnight UTC), 3,000/month, 3 domains.
Paid — monthly-only caps (Pro from $20/50k; Scale to $1,150/2.5M), overage hard-capped at **5× monthly
quota**, after which sending pauses. Also: **bounce rate must stay under 4%** and **complaint rate
under 0.08%**; **data retention 30 days** on Free/Pro/Scale.
(https://resend.com/docs/knowledge-base/what-is-resend-pricing ;
https://resend.com/docs/knowledge-base/account-quotas-and-limits)

### B6 Findings: our implementation vs the docs

Eight findings. Each states what our code does, what the docs say, and the concrete consequence.
**Nothing was changed — this is report-only.**

---

**Finding 1 — A genuinely failed domain is reported as `pending`, permanently.**

- **Our code:** `apps/communications-api/src/providers/resend-provider.ts:38` —
  `case 'failure': return 'failed'` inside the `switch` at lines 34–45.
- **Docs say:** the terminal error status is `failed`, **not** `failure`. OpenAPI domain-status enum:
  `not_started | pending | verified | partially_verified | partially_failed | failed`
  (https://raw.githubusercontent.com/resend/resend-openapi/main/resend.yaml ;
  https://resend.com/docs/dashboard/domains/manage-domains).
- **Consequence:** the `'failure'` case **can never match**. A domain Resend reports as `failed`
  (docs: DNS records not detected within 72 hours) falls through to `default:` at line 42 and is
  returned to callers as `'pending'`. An organization whose DNS is wrong — and whose domain will never
  verify without intervention — is shown "pending" indefinitely. This is the highest-impact finding:
  it converts a terminal, actionable error into an indistinguishable "still working" state, and any
  polling loop keyed on non-terminal status would poll forever.

---

**Finding 2 — Three documented domain states collapse into `pending`, erasing partial progress.**

- **Our code:** `resend-provider.ts:42-43` — `default: return 'pending'`.
- **Docs say:** `not_started`, `partially_verified` and `partially_failed` are distinct documented
  statuses (same enum as Finding 1; semantics at
  https://resend.com/docs/dashboard/domains/manage-domains — `partially_verified` = one of
  send/receive verified, or 2 CNAMEs of which only 1 is verified; `partially_failed` = verified for
  the domain but one feature not verified).
- **Consequence:** two separate losses. (a) `not_started` (domain created, **Verify never clicked**)
  is reported identically to `pending` (verification genuinely in flight), so the UI cannot tell the
  org whether it must *act* or *wait* — the exact distinction Zoho's "Authenticate Now" button exists
  to make (A1/A2). (b) `partially_verified` / `partially_failed` are flattened, so an org that has
  correctly added 2 of 3 DKIM records sees a flat "pending" with no indication that partial progress
  was detected — removing the feedback that makes DNS debugging tractable.

---

**Finding 3 — The DNS records' `record` purpose field is dropped, so records cannot be labelled.**

- **Our code:** the record schema at `resend-provider.ts:13-20` declares only
  `name`, `type`, `value`, `status`, `ttl`, `priority`; `normalizeDomain` at lines 53–60 maps
  exactly those keys. The `record` field is never read, and Zod's default object behavior silently
  strips unknown keys — so it does not error, it disappears. Correspondingly,
  `ProviderDomainRecord` in `apps/communications-api/src/providers/email-provider.ts:9-16` has no
  field to carry it even if parsed.
- **Docs say:** `DomainRecord.record` is an enum — `SPF` | `DKIM` | `Receiving` | `Tracking` |
  `TrackingCAA` — described as "The type of record (SPF for sending, DKIM for sending, Receiving for
  inbound emails, Tracking & TrackingCAA for click and open tracking)". The separate `type` field is
  only the DNS kind (`MX` | `TXT` | `CNAME` | `CAA`).
  (https://raw.githubusercontent.com/resend/resend-openapi/main/resend.yaml ;
  https://resend.com/docs/api-reference/domains/get-domain)
- **Consequence:** a real response mixes a `send` MX, a `send` TXT, several `_domainkey` CNAME/TXT
  records and a `links` CNAME. With `record` dropped, all that survives is `name` + DNS `type` — and
  the names are not self-describing (`send` appears twice with different `type`s; `resend._domainkey`
  only hints at DKIM). A DNS setup screen built on this can only print undifferentiated rows; it
  cannot say "add your SPF record" / "add your DKIM records", cannot group or count them, and cannot
  distinguish the two SPF records the API always returns (B2). It also forecloses the Resend
  equivalent of Zoho's per-record status explanation.

---

**Finding 4 — Provider error bodies are discarded, so machine-readable error `name`s are lost.**

- **Our code:** `resend-provider.ts:138-146` parses the body into `body`, then lines 148–153 throw
  using **only** `response.status` and a fixed string:
  `Resend request failed with HTTP ${response.status}.` The parsed `body` is never inspected on the
  error path (it is only used for the success return at line 156).
- **Docs say:** errors carry a structured body — `{ name, statusCode, message }` — with stable machine
  codes such as `restricted_api_key`, `validation_error`, `missing_required_field`,
  `invalid_attachment`, `invalid_idempotent_request`, `concurrent_idempotent_requests`,
  `daily_quota_exceeded`, `monthly_quota_exceeded`, `rate_limit_exceeded`, `email_above_quota`.
  (https://resend.com/docs/api-reference/errors)
- **Consequence:** every 4xx becomes the same indistinguishable `'rejected'` error carrying only an
  integer. Operators cannot tell apart, for example: a **permission misconfiguration**
  (`401 restricted_api_key` — a sending-only key calling a domains endpoint, or an inactive key), an
  **unverified `from` domain** (`403 validation_error`), a **bad payload** (`422`), and a
  **quota exhaustion** (`429 email_above_quota`). These have entirely different remedies — reconfigure
  the key, finish domain verification, fix a template, raise the plan — and the one field that
  distinguishes them is thrown away. It also makes Finding 6 unfixable as-is: telling retryable from
  terminal 429s *requires* `name`. Note this is a *provider-layer* loss: the body was already read
  into memory, so no extra I/O is needed to preserve it.

---

**Finding 5 — 429 is classified as non-retryable, though 429 is the documented rate-limit response.**

- **Our code:** `resend-provider.ts:149-153` — `response.status >= 500 ? 'unavailable' : 'rejected'`.
  Only 5xx maps to `'unavailable'`; `EmailProviderError`'s kind union is
  `'unavailable' | 'rejected' | 'invalid-response'` (`email-provider.ts:60`).
- **Docs say:** the normal over-rate response is **429** — "10 requests per second per team", with
  `rate_limit_exceeded` ("Too many requests. Please limit the number of requests per second."), and
  the IETF-style `ratelimit-*`/`retry-after` headers are returned so clients can back off deliberately.
  (https://resend.com/docs/api-reference/rate-limit ;
  https://resend.com/docs/api-reference/errors)
- **Consequence:** with a 10 req/s budget shared across the whole team — and 876 fanning out invoice
  and courier notifications across multiple organizations — rate limiting is an expected steady-state
  event, not an anomaly. Classified as `'rejected'`, it is treated as a terminal failure by any policy
  keyed on `'unavailable'`, so sends are dropped exactly when volume is high. A blanket "retry all
  429s" would be wrong too, because `daily_quota_exceeded` and `monthly_quota_exceeded` are also 429
  and genuinely terminal until the window resets. Correct handling needs the error `name` from
  Finding 4 plus the `retry-after` header, neither of which currently survives this layer.

---

**Finding 6 — Sends are attempted from unverified domains/addressees with no pre-send check.**

- **Our code:** `send` at `resend-provider.ts:99-117` posts `input.from` straight through
  (line 104), with no validation against domain-verification state. `ProviderSendInput.from` is a
  plain `string` (`email-provider.ts:32`). The provider does expose `retrieveDomain` (line 87) and
  `verifyDomain` (line 91), but nothing in these files connects that state to a send.
- **Docs say:** sending from an unverified `from` domain is rejected with `403 validation_error`.
  Verified-domain status is readable via `GET /domains/:id` and the domain status enum
  (https://resend.com/docs/api-reference/errors ;
  https://resend.com/docs/api-reference/domains/get-domain).
- **Consequence:** the failure surfaces as an opaque `'rejected'` (Findings 4–5) at send time rather
  than as a clear configuration error earlier — precisely the failure mode Zoho designs *around* by
  keeping an explicit sender registry and rewriting the From for unverified domains (A1). Because
  Finding 1 means a `failed` domain reads as `pending`, even a caller that *did* check status first
  would conclude "verification in progress, this will start working soon" when in fact it will never
  work without DNS changes. 876 has no equivalent of Zoho's visible, deliberate fallback path.

---

**Finding 7 — The idempotency key's documented bounds and replay semantics are not represented.**

- **Our code:** `ProviderSendInput.idempotencyKey` is an unconstrained `string`
  (`email-provider.ts:40`), always forwarded verbatim as the `Idempotency-Key` header
  (`resend-provider.ts:102`). Nothing constrains its length or shape, and the replay contract is not
  expressed anywhere in the interface.
- **Docs say:** the key must be **1–256 characters** (out-of-range → `400 invalid_idempotency_key`);
  keys are retained for **24 hours**; a replay with the **same key and same body** returns the
  **original** response without resending; the same key with a **different body** within 24 h returns
  `409 invalid_idempotent_request`; the same key while still in flight returns
  `409 concurrent_idempotent_requests`.
  (https://resend.com/docs/dashboard/emails/idempotency-keys ;
  https://resend.com/docs/api-reference/errors)
- **Consequence:** two distinct risks. (a) A key derived from a composite value (a concatenated URL,
  a JSON blob) can exceed 256 characters and fail with a `400` that Findings 4–5 render
  indistinguishable from any other bad request — the bound is neither enforced locally nor documented
  on the interface. (b) Because a *changed body* under the same key is rejected rather than sent,
  any "resend with a correction" path (fixing a typo'd recipient, regenerating a stale invoice PDF)
  will silently not send if it reuses the stored key within 24 h. The `24h` window and the
  body-must-match rule need to be explicit properties of whatever generates keys upstream — they are
  invisible from this interface today.

---

**Finding 8 — The webhook payload type is narrower than the documented payloads, and `svix-id` is not surfaced for dedup.**

- **Our code:** `resendWebhookEventSchema` (`resend-webhook.ts:5-19`) types only `type`, `created_at`,
  and a `data` object declaring **only** `email_id` and `to` as optional. `parseResendWebhook`
  (lines 74–81) returns that shape. `verifySvixWebhook` (lines 24–72) accepts the three Svix headers
  and returns a **boolean**, so the validated `headers.id` does not flow out of the function.
- **Docs say:** email `data` objects include `broadcast_id`, `created_at`, `email_id`, `message_id`,
  `from`, `to`, `subject`, `template_id`, `tags`, plus event-specific objects — `bounce`
  (`message`, `subType`, `type`, `diagnosticCode`) on `email.bounced`, `failed.reason` on
  `email.failed`, `click` on `email.clicked`, `received_for` on `email.received`. Delivery is
  **at-least-once** with duplicates expected, the documented remedy being to **dedupe on `svix-id`**;
  retries run `5s → 5m → 30m → 2h → 5h → 10h`.
  (https://resend.com/docs/webhooks/emails/bounced ;
  https://resend.com/docs/webhooks/emails/failed ;
  https://resend.com/docs/webhooks/introduction)
- **Consequence:** two things. (a) `.passthrough()` at line 13 means extra fields *survive at
  runtime* but are **not typed**, so TypeScript consumers cannot read `bounce.type` (permanent vs
  temporary), `bounce.subType`, `failed.reason`, or `click` without casting — which is exactly the
  data needed to decide whether a bounce should suppress an address or merely retry, and whether a
  failure is a quota problem. (b) Nothing in this module surfaces `svix-id` as an idempotency handle;
  since retries are expected up to ~17 hours, without dedup on that id a duplicate delivery would be
  processed twice. *Caveat:* the consumer of `verifySvixWebhook` is outside the three files in scope
  and may well dedupe on its own — I could not verify that, so treat (b) as **needing confirmation**
  rather than a confirmed defect.

---

**Confirmed-correct areas (no finding raised).** For completeness, three things our implementation
gets exactly right against the docs, which is worth stating given how much is wrong elsewhere:

- **The Svix signed string** at `resend-webhook.ts:54` —
  `` `${headers.id}.${headers.timestamp}.${payload}` `` — matches the documented
  `{id}.{timestamp}.{payload}` byte-for-byte, including literal dot separators and the requirement to
  use the raw body.
- **The secret handling** at lines 39 and 45–52 — the `whsec_` prefix check and base64-decoding the
  remainder — matches the documented format.
- **The default tolerance** at line 36 (`toleranceSeconds = 300`) matches Svix's documented 5-minute
  window, and the version/space-separated parsing at lines 59–70 correctly handles `v1,<base64>`
  candidates and uses a constant-time comparison.

---

## Sources

All retrieved 2026-09-16 via the `browse` CLI.

**Zoho Books — help & KB (primary)**

- https://www.zoho.com/us/books/help/settings/emails.html
- https://www.zoho.com/us/books/help/settings/reminders.html
- https://www.zoho.com/us/books/help/settings/preferences.html
- https://www.zoho.com/us/books/help/settings/organization/organization-profile.html
- https://www.zoho.com/us/books/help/settings/pdf-templates/
- https://www.zoho.com/us/books/help/settings/automation/workflow-actions/email-alerts.html
- https://www.zoho.com/us/books/help/invoice/
- https://www.zoho.com/us/books/help/invoice/other-actions.html
- https://www.zoho.com/us/books/help/contacts/associating-templates.html
- https://www.zoho.com/us/books/help/integrations/zoho-mail-integration.html
- https://www.zoho.com/us/books/kb/general/send-email-from-own-address.md
- https://www.zoho.com/us/books/kb/general/spf-record-not-found.md
- https://www.zoho.com/us/books/kb/general/spf-dkim-for-emails.html
- https://www.zoho.com/us/books/kb/general/unable-to-send-emails-from-aol-address.md
- https://www.zoho.com/us/books/kb/general/configure-emails.md
- https://www.zoho.com/us/books/kb/general/add-email-address-to-smp.md
- https://www.zoho.com/us/books/kb/general/external-smtp.md
- https://www.zoho.com/us/books/kb/general/invoice-notification-email-missing.html
- https://www.zoho.com/us/books/kb/invoices/prevents-intimation-emails-spam.html
- https://www.zoho.com/us/books/kb/invoices/email-insights.html
- https://www.zoho.com/us/books/kb/invoices/client-viewed-transactions.html
- https://www.zoho.com/us/books/kb/invoices/invoice-email-template.html
- https://www.zoho.com/us/books/kb/invoices/new-mail-address.html
- https://www.zoho.com/us/books/kb/quotes/attach-quote-pdf-in-emails.html
- https://www.zoho.com/us/books/kb/reminders/new-sender-email-rem.md
- https://www.zoho.com/us/books/kb/reminders/stop-rem.html
- https://www.zoho.com/us/books/kb/reminders/add-ext-users.html
- https://www.zoho.com/us/books/kb/reminders/display-cx-bal-in-rem.md
- https://www.zoho.com/books/kb/reminders/send-rem-diff-lang.md
- https://www.zoho.com/us/books/kb/templates/customize-invoice-footer.md
- https://www.zoho.com/books/kb/templates/display-deposit-to-account.md
- https://www.zoho.com/books/kb/templates/select-multiple-invoice-templates.md
- https://www.zoho.com/us/books/kb/accountant/date-placeholder.md
- https://www.zoho.com/us/books/kb/automation/module-details.md
- https://www.zoho.com/us/books/kb/reports/audit-trail.html
- https://www.zoho.com/en-sg/books/kb/templates/cf-email-template.md
- https://www.zoho.com/books/api/v3/contacts/
- https://www.zoho.com/books/api/v3/invoices/
- https://www.zoho.com/books/api/v3/emailtemplates/ (returns 404 — endpoint undocumented)

**Zoho Mail (domain authentication only)**

- https://www.zoho.com/mail/help/adminconsole/domain-verification.html
- https://www.zoho.com/mail/help/adminconsole/spf-configuration.html
- https://www.zoho.com/mail/help/adminconsole/dkim-configuration.html
- https://www.zoho.com/mail/help/adminconsole/dmarc-policy.html

**Zoho Books — screenshot sources (the 17 captures)**

- https://www.zoho.com/books/help/images/settings/emails/unauthenticated-domains.png
- https://www.zoho.com/books/help/images/settings/emails/authenticated-domains.png
- https://www.zoho.com/books/help/images/settings/emails/authticate-dkim.png
- https://www.zoho.com/books/help/images/settings/emails/new-sender.png
- https://www.zoho.com/books/help/images/settings/emails/resend-email.png
- https://www.zoho.com/books/help/images/settings/emails/edit-delete-senders.png
- https://www.zoho.com/books/help/images/settings/emails/mark-primary-contact.png
- https://www.zoho.com/books/help/images/settings/emails/new-template.png
- https://www.zoho.com/books/help/images/settings/emails/customize-template-1.png
- https://www.zoho.com/books/help/images/settings/emails/customize-template-2.png
- https://www.zoho.com/books/help/images/settings/emails/associate-templates.png
- https://www.zoho.com/books/help/images/settings/emails/enable-email-insights.png
- https://www.zoho.com/books/help/images/settings/emails/track-email-1.png
- https://www.zoho.com/books/help/images/settings/emails/track-email-2.png
- https://www.zoho.com/books/kb/images/invoices/email-notification.png
- https://www.zoho.com/books/help/images/settings/reminder-automated.png
- https://www.zoho.com/books/help/images/settings/reminder-content.png
- https://www.zoho.com/books/help/images/invoice/mail-invoice.png

**Zoho — third-party (corroboration only, non-authoritative)**

- https://support.valimail.com/en/articles/8758255-zoho-books
- https://www.solution4guru.com/knowledge-base/how-do-you-create-and-send-invoices-in-zoho-books/

**Resend — docs & API reference**

- https://resend.com/docs/api-reference/introduction
- https://resend.com/docs/api-reference/errors
- https://resend.com/docs/api-reference/pagination
- https://resend.com/docs/api-reference/rate-limit
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/api-reference/domains/create-domain
- https://resend.com/docs/api-reference/domains/list-domains
- https://resend.com/docs/api-reference/domains/get-domain
- https://resend.com/docs/api-reference/domains/verify-domain
- https://resend.com/docs/api-reference/domains/delete-domain
- https://resend.com/docs/api-reference/webhooks/create-webhook
- https://resend.com/docs/api-reference/api-keys/create-api-key
- https://resend.com/docs/dashboard/domains/manage-domains
- https://resend.com/docs/dashboard/domains/regions
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/docs/dashboard/emails/attachments
- https://resend.com/docs/dashboard/api-keys/introduction
- https://resend.com/docs/webhooks/introduction
- https://resend.com/docs/webhooks/event-types
- https://resend.com/docs/webhooks/verify-webhooks-requests
- https://resend.com/docs/webhooks/emails/sent
- https://resend.com/docs/webhooks/emails/bounced
- https://resend.com/docs/webhooks/emails/failed
- https://resend.com/docs/webhooks/emails/clicked
- https://resend.com/docs/webhooks/emails/received
- https://resend.com/docs/webhooks/emails/suppressed
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/docs/knowledge-base/what-is-resend-pricing
- https://resend.com/docs/knowledge-base/how-to-handle-api-keys
- https://resend.com/docs/knowledge-base/what-attachment-types-are-not-supported
- https://resend.com/docs/create-an-api-key
- https://resend.com/auth
- https://resend.com/changelog/new-api-key-permissions
- https://resend.com/changelog/three-domains-on-the-free-tier
- **https://raw.githubusercontent.com/resend/resend-openapi/main/resend.yaml** (OpenAPI 3.1.2,
  `info.version: 1.5.1` — authoritative for field names, types and enums)

**Svix (webhook signing)**

- https://docs.svix.com/receiving/verifying-payloads/how-manual
- https://docs.svix.com/receiving/verifying-payloads/how
- https://docs.svix.com/receiving/verifying-payloads/why

**Zoho engineering samples (used to corroborate template scoping/binding)**

- https://github.com/zoho/zohofinance-automation-samples/blob/main/CustomFunctions/associate_template.ds
- https://github.com/zoho/zohofinance-automation-samples/blob/main/CustomFunctions/bulk_email.ds

---

### Consolidated "unconfirmed" register

Stated plainly so nothing here is mistaken for a verified fact.

**Zoho:** the numeric cap on sender addresses; any named "in-progress" or "failed" domain
authentication state (only Unauthenticated→Authenticated and per-address Unverified exist); a
Books-specific verification SLA; DMARC as a Books sending requirement; return-path/bounce CNAME for
Books; outbound sending via a connected Zoho Mail mailbox; the **complete placeholder catalogue** (the
canonical list is a JS-only community thread that could not be rendered — only the six tokens verified
in A4 from the live UI, plus the KB tokens cited there, are confirmed); whether the placeholder set is
per-category or one global pool; escaping/encoding rules; existence of `if`/`for` constructs; a maximum
template count; whether a customer statement has a distinct email template; per-language template UI
workflow; the invoice compose dialog's full enumerated field list — **From is the exception, with
positive evidence of send-time editability** (A5), but whether the body is editable there, a "send me a
copy" control, a per-send attach-PDF toggle, an ad-hoc attachment picker, an in-dialog email-template
selector, and editable To/CC/BCC all remain unconfirmed; delivered/bounced/clicked/failed delivery
statuses; an org-wide email log; insights retention; per-email sender attribution; per-customer
reminder reschedule; reminders for quotes; re-enabling a "Stop All Reminders" customer.

**Resend:** whether the standard `webhook-*` header aliases are emitted (every Resend source shows
only `svix-*`); a Resend-published tolerance number (300 s is the Svix library default); a
per-endpoint allow/deny table for `sending_access` keys (including whether `GET /emails/:id` is
blocked); the maximum number of attachments per email; maximum `cc`/`bcc` recipients; an error-body
`type` field; the exact `Receiving`/`TrackingCAA` record counts; whether `temporary_failure` is a
valid *domain* status in practice (prose says yes, the OpenAPI domain enum omits it).
