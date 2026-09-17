# DAA Savings Summary — Production Lock V1

Locked: 2026-09-16

## Approved visual master
- Asset: `daa-savings/production/DAA_SAVINGS_SUMMARY_PRODUCTION_MASTER_V1.png`
- Git blob SHA: `7495e3c9149ca087fcbd1d94a58bee1ce2c8cc0a`
- This asset is the approved visual reference for the Savings Summary architecture and styling.

## Gmail delivery lock
- Sender implementation: `daa-savings/DAA_GITHUB_CID_PRODUCTION_V1.gs`
- Permanent asset source: `https://raw.githubusercontent.com/andrewsmith-cpu/frontline-email-assets/main/daa-savings/production/`
- Outgoing Gmail HTML references the image as `cid:savingsSummary`.
- The image bytes are embedded in the email MIME body with `inlineImages`; the recipient does not depend on a temporary Google Slides or googleusercontent URL after send.
- Production validation target: CID reference = YES, MIME Content-ID = YES, googleusercontent reference = NONE, Slides reference = NONE.

## Non-breakage rules
1. Never send a Savings Summary using a temporary ChatGPT, Google Slides, or googleusercontent image URL.
2. Import each final client rendering into `daa-savings/production/` before sending.
3. Use a unique immutable filename for each client rendering; never overwrite an image that has already been sent.
4. Send through the GitHub + CID production sender so the image bytes are embedded in Gmail.
5. Keep `daa-savings/import-manifest.txt` empty after each successful permanent import.
