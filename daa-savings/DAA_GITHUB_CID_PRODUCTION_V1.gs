/**
 * DAA SAVINGS SUMMARY — GITHUB + CID PRODUCTION V1
 *
 * PURPOSE
 * - GitHub is the stable production asset source.
 * - Google Slides is NOT used anywhere in the send path.
 * - The client image is fetched from raw.githubusercontent.com, then embedded
 *   inside the outgoing Gmail message via CID / inlineImages.
 * - The recipient does not depend on a temporary googleusercontent URL.
 *
 * QUEUE TAB
 * DAA_GITHUB_SEND_QUEUE
 *
 * Columns:
 * Status | Email | First Name | Client Name | Client ID | GitHub Image URL |
 * Sent At | Gmail Message ID | Send Error
 */

const DAA_GH = Object.freeze({
  QUEUE_SHEET: 'DAA_GITHUB_SEND_QUEUE',
  REPO_RAW_PREFIX: 'https://raw.githubusercontent.com/andrewsmith-cpu/frontline-email-assets/main/daa-savings/production/',
  SELF_TEST_EMAIL: 'andrew.smith@contactdaa.com',
  SENDER_NAME: 'Andrew L. Smith',
  REPLY_TO: 'andrew.smith@contactdaa.com',
  CALL_PHONE: '(619) 552-3941',
  TEXT_PHONE: '(858) 257-9162',
  WEBSITE: 'https://www.debtadvisorsofamerica.com/',
  INLINE_KEY: 'savingsSummary',
  BATCH_SIZE: 25,
  STATUS_READY: 'READY',
  STATUS_SENT: 'SENT',
  STATUS_HOLD: 'HOLD'
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DAA GITHUB PRODUCTION')
    .addItem('0 — Install / Verify Queue', 'installGithubSendQueue')
    .addSeparator()
    .addItem('1 — Test First READY → Andrew', 'testFirstReadyGithubToAndrew')
    .addItem('2 — Send Next 25 READY', 'sendNext25GithubCid')
    .addItem('3 — Verify Latest Sent MIME', 'verifyLatestGithubCidSend')
    .addToUi();
}

function installGithubSendQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open the DAA production spreadsheet first.');

  let sh = ss.getSheetByName(DAA_GH.QUEUE_SHEET);
  if (!sh) sh = ss.insertSheet(DAA_GH.QUEUE_SHEET);

  const headers = [
    'Status', 'Email', 'First Name', 'Client Name', 'Client ID',
    'GitHub Image URL', 'Sent At', 'Gmail Message ID', 'Send Error'
  ];

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existing = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getDisplayValues()[0];
    headers.forEach((h, i) => {
      if (String(existing[i] || '').trim() !== h) sh.getRange(1, i + 1).setValue(h);
    });
  }

  sh.setFrozenRows(1);
  SpreadsheetApp.getUi().alert(
    'GitHub production queue ready.\n\n' +
    'Only READY rows are sent.\n' +
    'Google Slides is not used by this sender.'
  );
}

function testFirstReadyGithubToAndrew() {
  const ctx = getGithubQueueContext_();
  const row = findNextGithubReadyRow_(ctx);
  if (!row) throw new Error('No READY rows found in ' + DAA_GH.QUEUE_SHEET + '.');

  const data = readGithubQueueRow_(ctx, row);
  validateGithubQueueRow_(data, row);
  const blob = fetchGithubImageBlob_(data.githubImageUrl)
    .setName(safeFilename_(data.clientName + ' Savings Summary.jpg'));

  sendGithubCidMessage_(data, blob, DAA_GH.SELF_TEST_EMAIL, true);

  SpreadsheetApp.getUi().alert(
    'GITHUB CID SELF-TEST SENT',
    data.clientName + ' was sent to ' + DAA_GH.SELF_TEST_EMAIL + '\n\n' +
    'The image came from GitHub and was embedded into the message as CID bytes.\n' +
    'The queue row was not marked SENT.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function sendNext25GithubCid() {
  const ctx = getGithubQueueContext_();
  let sent = 0;
  let failed = 0;
  let held = 0;

  const remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota <= 0) throw new Error('Google reports no remaining recipient quota for today.');
  const maxThisRun = Math.min(DAA_GH.BATCH_SIZE, remainingQuota);

  for (let row = 2; row <= ctx.sheet.getLastRow() && sent < maxThisRun; row++) {
    const status = String(ctx.sheet.getRange(row, ctx.col.Status).getDisplayValue() || '')
      .trim().toUpperCase();

    if (status === DAA_GH.STATUS_HOLD) {
      held++;
      continue;
    }
    if (status !== DAA_GH.STATUS_READY) continue;

    const data = readGithubQueueRow_(ctx, row);

    try {
      validateGithubQueueRow_(data, row);
      const blob = fetchGithubImageBlob_(data.githubImageUrl)
        .setName(safeFilename_(data.clientName + ' Savings Summary.jpg'));
      const result = sendGithubCidMessage_(data, blob, data.email, false);

      ctx.sheet.getRange(row, ctx.col.Status).setValue(DAA_GH.STATUS_SENT);
      ctx.sheet.getRange(row, ctx.col['Sent At']).setValue(new Date());
      ctx.sheet.getRange(row, ctx.col['Gmail Message ID']).setValue(result.messageId || '');
      ctx.sheet.getRange(row, ctx.col['Send Error']).clearContent();
      sent++;
    } catch (err) {
      failed++;
      ctx.sheet.getRange(row, ctx.col['Send Error'])
        .setValue(String(err && err.message ? err.message : err));
    }
  }

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    'GITHUB CID BATCH COMPLETE',
    'Sent: ' + sent + '\n' +
    'Failed/held for review: ' + failed + '\n' +
    'Pre-existing HOLD rows skipped: ' + held + '\n\n' +
    'Every successful message used GitHub as the asset source and embedded CID image bytes.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function sendGithubCidMessage_(data, imageBlob, recipient, isSelfTest) {
  const firstName = data.firstName || data.clientName.split(/\s+/)[0] || data.clientName;
  const subject = (isSelfTest ? '[GITHUB CID TEST] ' : '') + firstName + ' — Your Updated Savings Summary';
  const htmlBody = buildApprovedGithubEmailHtml_(data, firstName, isSelfTest);
  const plainBody = buildApprovedGithubPlainText_(data, firstName, isSelfTest);

  GmailApp.sendEmail(recipient, subject, plainBody, {
    htmlBody: htmlBody,
    inlineImages: { [DAA_GH.INLINE_KEY]: imageBlob },
    name: DAA_GH.SENDER_NAME,
    replyTo: DAA_GH.REPLY_TO
  });

  Utilities.sleep(800);
  return { messageId: findLatestGithubSentMessageId_(recipient, subject) };
}

function fetchGithubImageBlob_(url) {
  const normalized = String(url || '').trim();
  if (!normalized.startsWith(DAA_GH.REPO_RAW_PREFIX)) {
    throw new Error('Image URL is not in the approved GitHub production path.');
  }

  const response = UrlFetchApp.fetch(normalized, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': 'DAA-GitHub-CID-Production' }
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('GitHub image fetch failed: HTTP ' + code);
  }

  const blob = response.getBlob();
  const type = String(blob.getContentType() || '').toLowerCase();
  if (!/^image\/(png|jpeg|jpg|webp)$/.test(type)) {
    throw new Error('GitHub asset is not a supported image: ' + type);
  }
  return blob;
}

function buildApprovedGithubEmailHtml_(data, firstName, isSelfTest) {
  const who = isSelfTest ? 'Andrew' : firstName;
  const selfNote = isSelfTest
    ? '<p style="font-size:13px;color:#6B7280;margin:0 0 14px;"><strong>DELIVERY TEST:</strong> intended recipient: ' + escapeHtml_(data.email) + '</p>'
    : '';

  return `
  <div style="max-width:1050px;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#263b50;">
    ${selfNote}
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">Hi ${escapeHtml_(who)},</p>

    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">
      This is <strong>Andrew Logan Smith with Debt Advisors of America</strong>. I have your file open as part of a quality-control review and noticed we were never able to move forward after your original consultation.
    </p>

    <p style="font-size:18px;line-height:1.45;margin:0 0 14px;color:#3b6484;font-weight:600;">The hard part is already done.</p>

    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">
      We already have your creditor information, eligible debt, budget, and the information from your original review — <strong>you do not need to start over.</strong>
    </p>

    <p style="font-size:16px;line-height:1.55;margin:0 0 16px;color:#173a57;font-weight:700;">
      With a new month and another billing cycle beginning, if your balances are still close to where they were when we last spoke, this is a good time to revisit your options before another month of minimum payments and interest goes by.
    </p>

    <p style="font-size:16px;line-height:1.55;margin:0 0 16px;">
      Please take a close look at the updated Savings Summary below. It should give you a very good idea of what your options could look like today.
    </p>

    <img src="cid:${DAA_GH.INLINE_KEY}"
         alt="${escapeHtml_(data.clientName)} — Your Savings Summary"
         style="display:block;width:100%;max-width:1050px;height:auto;border:0;margin:0 0 18px;">

    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">
      ${escapeHtml_(firstName)}, if nothing else, I’d genuinely appreciate your feedback on what kept you from moving forward.
    </p>

    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">
      If your situation has changed, we can simply <strong>pick up where you left off</strong> and review the numbers together.
    </p>

    <p style="font-size:16px;line-height:1.55;margin:0 0 18px;">
      Feel free to reply here, call me directly at <strong>${DAA_GH.CALL_PHONE}</strong>, or text me at <strong>${DAA_GH.TEXT_PHONE}</strong>.
    </p>

    <div style="font-size:15px;line-height:1.5;margin-top:14px;color:#263b50;">
      <strong>Andrew L. Smith</strong><br>
      Senior Certified Debt Specialist<br>
      <a href="${DAA_GH.WEBSITE}" style="color:#173a57;text-decoration:none;"><strong>Debt Advisors of America</strong></a><br>
      Call: ${DAA_GH.CALL_PHONE}<br>
      Text: ${DAA_GH.TEXT_PHONE} <span style="color:#6B7280;">(New Ad Text Line)</span><br>
      <a href="mailto:${DAA_GH.REPLY_TO}" style="color:#173a57;">${DAA_GH.REPLY_TO}</a><br>
      <a href="${DAA_GH.WEBSITE}" style="color:#173a57;">www.debtadvisorsofamerica.com</a>
    </div>
  </div>`;
}

function buildApprovedGithubPlainText_(data, firstName, isSelfTest) {
  const who = isSelfTest ? 'Andrew' : firstName;
  return [
    'Hi ' + who + ',',
    '',
    'This is Andrew Logan Smith with Debt Advisors of America. I have your file open as part of a quality-control review and noticed we were never able to move forward after your original consultation.',
    '',
    'The hard part is already done.',
    '',
    'We already have your creditor information, eligible debt, budget, and the information from your original review — you do not need to start over.',
    '',
    'Please review the Savings Summary in the HTML version of this email.',
    '',
    firstName + ', if nothing else, I’d genuinely appreciate your feedback on what kept you from moving forward.',
    '',
    'Andrew L. Smith',
    'Senior Certified Debt Specialist',
    'Debt Advisors of America',
    'Call: ' + DAA_GH.CALL_PHONE,
    'Text: ' + DAA_GH.TEXT_PHONE,
    DAA_GH.REPLY_TO,
    'www.debtadvisorsofamerica.com'
  ].join('\n');
}

function verifyLatestGithubCidSend() {
  const ctx = getGithubQueueContext_();
  const sh = ctx.sheet;
  let targetRow = null;

  for (let r = sh.getLastRow(); r >= 2; r--) {
    if (String(sh.getRange(r, ctx.col.Status).getDisplayValue()).trim().toUpperCase() === DAA_GH.STATUS_SENT) {
      targetRow = r;
      break;
    }
  }
  if (!targetRow) throw new Error('No SENT row found.');

  const data = readGithubQueueRow_(ctx, targetRow);
  const subject = (data.firstName || data.clientName.split(/\s+/)[0]) + ' — Your Updated Savings Summary';
  const threads = GmailApp.search('in:sent to:' + data.email + ' subject:"' + subject.replace(/"/g, '') + '"', 0, 5);
  if (!threads.length) throw new Error('Could not find the sent message for verification.');

  const msgs = threads[0].getMessages();
  const latest = msgs[msgs.length - 1];
  const raw = latest.getRawContent();
  const hasCidRef = raw.indexOf('cid:' + DAA_GH.INLINE_KEY) >= 0;
  const hasContentId = /Content-ID:\s*<[^>]+>/i.test(raw);
  const hasGoogleusercontent = /googleusercontent\.com/i.test(raw);
  const hasSlidesReference = /docs\.google\.com\/presentation|slides\.googleapis\.com/i.test(raw);

  SpreadsheetApp.getUi().alert(
    'GITHUB CID MIME VERIFICATION',
    'Client: ' + data.clientName + '\n' +
    'HTML cid reference: ' + (hasCidRef ? 'YES' : 'NO') + '\n' +
    'MIME Content-ID part: ' + (hasContentId ? 'YES' : 'NO') + '\n' +
    'googleusercontent reference: ' + (hasGoogleusercontent ? 'FOUND — REVIEW' : 'NONE') + '\n' +
    'Slides reference: ' + (hasSlidesReference ? 'FOUND — REVIEW' : 'NONE') + '\n\n' +
    'Production target: CID YES, Content-ID YES, googleusercontent NONE, Slides NONE.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function getGithubQueueContext_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open the DAA production spreadsheet first.');
  const sheet = ss.getSheetByName(DAA_GH.QUEUE_SHEET);
  if (!sheet) throw new Error('Missing ' + DAA_GH.QUEUE_SHEET + '. Run Install / Verify Queue first.');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const col = {};
  headers.forEach((h, i) => col[String(h || '').trim()] = i + 1);
  const required = ['Status','Email','First Name','Client Name','Client ID','GitHub Image URL','Sent At','Gmail Message ID','Send Error'];
  const missing = required.filter(h => !col[h]);
  if (missing.length) throw new Error('Queue is missing columns: ' + missing.join(', '));
  return { ss, sheet, col };
}

function findNextGithubReadyRow_(ctx) {
  for (let r = 2; r <= ctx.sheet.getLastRow(); r++) {
    if (String(ctx.sheet.getRange(r, ctx.col.Status).getDisplayValue()).trim().toUpperCase() === DAA_GH.STATUS_READY) return r;
  }
  return null;
}

function readGithubQueueRow_(ctx, row) {
  const v = ctx.sheet.getRange(row, 1, 1, ctx.sheet.getLastColumn()).getDisplayValues()[0];
  const g = h => String(v[ctx.col[h] - 1] || '').trim();
  return {
    row,
    status: g('Status'),
    email: g('Email'),
    firstName: g('First Name'),
    clientName: g('Client Name'),
    clientId: g('Client ID'),
    githubImageUrl: g('GitHub Image URL')
  };
}

function validateGithubQueueRow_(d, row) {
  if (!d.clientName) throw new Error('Row ' + row + ': Client Name is blank.');
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    throw new Error('Row ' + row + ': invalid email.');
  }
  if (!d.githubImageUrl) throw new Error('Row ' + row + ': GitHub Image URL is blank.');
  if (!d.githubImageUrl.startsWith(DAA_GH.REPO_RAW_PREFIX)) {
    throw new Error('Row ' + row + ': image is outside the approved GitHub production path.');
  }
}

function findLatestGithubSentMessageId_(recipient, subject) {
  try {
    const q = 'in:sent to:' + recipient + ' subject:"' + subject.replace(/"/g, '') + '" newer_than:1d';
    const threads = GmailApp.search(q, 0, 5);
    if (!threads.length) return '';
    let latest = null;
    threads.forEach(t => t.getMessages().forEach(m => {
      if (!latest || m.getDate().getTime() > latest.getDate().getTime()) latest = m;
    }));
    return latest ? latest.getId() : '';
  } catch (e) {
    return '';
  }
}

function safeFilename_(s) {
  return String(s || 'Savings Summary.jpg')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
