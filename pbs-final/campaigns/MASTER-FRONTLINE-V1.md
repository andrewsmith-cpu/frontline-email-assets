# PBS FRONTLINE Master Campaign v1

STATUS: PRODUCTION CANDIDATE

Purpose:
Reconnect with prior DAA clients from the deduplicated master list who completed an original consultation but did not move forward.

This campaign is separate from the locked immediate quick send command FRONTLINE [FIRST NAME].

Canonical template:
pbs-final/campaigns/master-frontline-v1-PRODUCTION.html

Personalization:
{{FIRST_NAME}} only

Production subject:
Hi {{FIRST_NAME}}... I was reviewing your file and wanted you to have these.

Data source:
Use the current deduplicated DAA master list and existing suppression rules.
Exclude internal @contactdaa.com addresses.
Do not send duplicate recipients.

Assets:
Reuse the immutable approved FRONTLINE assets pinned to commit cecde13b8928193da90ee9099945b31d9d274044.

Do not alter the locked immediate FRONTLINE production version when working on this campaign.
