# DAA GENIE MASTER — LOCKED PRODUCTION PACKAGE

Status: LOCKED / APPROVED
Lock phrase: **DAA GENIE**
Locked branch: `daa-genie-locked-v1`
Reference approval: user approved the actual Gmail draft/inbox rendering on 2026-09-18 and described it as "absolutely ... unbelievable."

## What "DAA GENIE" means

When the user says **DAA GENIE**, load and use this exact production package.

Do not redesign it.
Do not reinterpret it.
Do not rebuild the visual with a different renderer.
Do not add, remove, resize, restyle, or reposition boxes, borders, footer elements, payment cards, savings bar, icons, typography, or decorative elements unless the user explicitly asks for a change.

Only replace client-specific fields inside the locked visual structure.

## Locked visual reference

Approved functional proof image:
`daa-savings/production/proofs/Jeffrey_Rawlins_APPROVED_PROOF.jpg`

Exact approved image commit:
`5f6ea2873d184b9bd0419eab1f35522ca074e61e`

Commit-pinned image URL:
`https://raw.githubusercontent.com/andrewsmith-cpu/frontline-email-assets/5f6ea2873d184b9bd0419eab1f35522ca074e61e/daa-savings/production/proofs/Jeffrey_Rawlins_APPROVED_PROOF.jpg`

The proof is the visual authority. Future production should match its geometry and appearance.

## Locked subject

`[First Name]… I Reviewed Your File and Pulled Your Numbers Back Up`

## Locked email body

Hi [First Name],

This is Andrew Logan Smith with Debt Advisors of America. I have your file open as part of a quality-control review and noticed we were never able to move forward after your original consultation.

Can you tell me what happened, or what kept us from being able to move forward at the time? I’d genuinely appreciate the feedback.

The hard part is already done.

We already have your creditor information, eligible debt, budget, and the information from your original review — you do not need to start over.

With a new month and another billing cycle beginning, if your balances are still close to where they were when we last spoke, this is a good time to revisit your options before another month of minimum payments and interest goes by.

[LOCKED SAVINGS SUMMARY IMAGE]

Please take a close look at the updated Savings Summary above. It should give you a very good idea of what your options could look like today.

If your situation has changed, we can simply pick up where you left off and review the numbers together.

Feel free to reply here, call me directly at (619) 552-3941, or text me at (858) 257-9162.

Best,

## Locked signature

Use:
`daa-savings/production/email-signature-v1.html`

Andrew L. Smith
Senior Certified Debt Specialist
🇺🇸 Debt Advisors of America

📞 Call: (619) 552-3941
💬 Text: (858) 257-9162
✉️ Email: Andrew.Smith@contactdaa.com
🌐 Website: https://www.debtadvisorsofamerica.com

🛡️ BBB Accredited — A+ Rating & Reviews
https://www.bbb.org/us/ca/san-diego/profile/debt-relief-services/debt-advisors-of-america-1126-1000064078

⭐ Trustpilot Reviews
https://www.trustpilot.com/review/debtadvisorsofamerica.com

🇺🇸 We advise. We guide. You decide.

## Functional Gmail reference

Approved inbox message ID:
`1a0b6d536c571777`

Approved draft created immediately before that inbox test:
`r-1870891984951807552`

These are the real functional Gmail references, not mockups.

## Production rules

1. The existing DAA calculation engine remains authoritative.
2. Do not alter formulas, term logic, savings math, or client data merely to make the graphic fit.
3. The visual must fit the data, not the other way around.
4. Use 24 / 36 / 48 / 54 / 60 month presentation as supported by the existing engine.
5. Where a term is unavailable, show **Inquire** rather than inventing a payment.
6. Do not use generative image recreation for production financial graphics.
7. Do not substitute older renderers or dynamically redraw the approved composition.
8. For any production change, create one real Gmail draft first and verify it before client sending.
9. "DAA GENIE" by itself never authorizes a client send. Sending still requires an explicit instruction to send.

## Recall shorthand

**DAA GENIE** = exact locked visual + subject + body + signature + existing calculator logic.

Examples:
- "DAA Genie for John Smith" → generate the locked package for John Smith.
- "Put DAA Genie for John Smith in drafts" → create a Gmail draft only.
- "Send DAA Genie to John Smith" → send only when explicitly instructed.


## PRODUCTION DATA SAFETY LOCK — 2026-09-18

- DAA GENIE is presentation only. It must never manufacture or estimate client financial values.
- The authoritative path is: Zenith client record -> Andrew S. Do Nothing Calculator / verified stored calculator values -> DAA GENIE -> Gmail.
- Never send from a row populated by the V8.7 bulk-estimate helper or any equivalent synthetic calculation.
- Automatic HOLD signature: current monthly payment = eligible debt × 3.00%, do-nothing total = eligible debt × 2.14, and payment options match the fixed V8.7 term-factor estimates. Any row matching that pattern is synthetic and must not send.
- A repeated complete financial set across unrelated Zenith IDs is an automatic STOP.
- DAA GENIE visual edits never authorize changes to calculator values or source data.


## FERRARI DATA ENGINE RESTORE — 2026-09-18

- The original authoritative calculator has been re-identified and is the only approved calculator source:
  - Google Sheet: Andrew S. | Do Nothing Calculator
  - Calculator ID: `1je-Sf5W8Nk2jI08hnpLu7wgoltHDTZkQ0vxSWfZsuIY`
- Restored original dashboard bridge mapping:
  - Dashboard F7 = Eligible Debt
  - Dashboard F8 = Current Monthly Payments
  - Dashboard F9 = Payoff Years
  - Dashboard F13 = Do Nothing Total
  - Dashboard F16 = Program Payment
  - Dashboard F19 = Program Total
  - Dashboard F21 = Monthly Savings
  - Dashboard F22 = Total Savings
  - Input D6 = Client Name
  - Input D10 = Program Term
- Exact client-name matching is mandatory before calculator import.
- DAA GENIE production terms are 24 / 36 / 48 / 54 / 60.
- Verified rows must carry `WOW Data Source = CALCULATOR VERIFIED` or `ZENITH VERIFIED`.
- Synthetic estimate rows are HOLD only and can never authorize production.
- Restored additive Apps Script source is preserved in the user's Library as `/DAA/DAA_FERRARI_DATA_ENGINE.gs`.
