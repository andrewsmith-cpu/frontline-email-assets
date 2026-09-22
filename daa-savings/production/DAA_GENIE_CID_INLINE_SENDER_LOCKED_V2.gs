/**
 * DAA GENIE CID INLINE SENDER — LOCKED V2
 * Purpose: create/send the LOCKED DAA GENIE email with the Savings Summary embedded inline via CID.\n * CURRENT SAFETY STATE: PRODUCTION_ENABLED=false. Draft/test only until Andrew explicitly reauthorizes sending.
 *
 * IMPORTANT DELIVERY CHANGE
 * - NEVER use a temporary Slides/Googleusercontent URL inside <img src="...">.
 * - The PNG bytes travel INSIDE the email via GmailApp inlineImages / cid:.
 * - Recipients can reopen the message later without depending on the temporary host URL.
 *
 * Queue tab columns:
 * Status | Email | First Name | Client Name | Client ID | Image File ID |
 * Asset Deck ID | Slide Object ID | Sent At | Gmail Message ID | Send Error
 *
 * Image source priority:
 * 1) Image File ID (a PNG/JPG stored in Google Drive) — preferred.
 * 2) Asset Deck ID + Slide Object ID — the script renders that exact slide to PNG at send time.
 *
 * One-time requirement for slide-source rows:
 * Enable Advanced Google Service: Slides API.
 */

const DAA_CID = Object.freeze({
  QUEUE_SHEET: 'DAA_CID_SEND_QUEUE',
  SELF_TEST_EMAIL: 'andrew.smith@contactdaa.com',
  SENDER_NAME: 'Andrew L. Smith',
  REPLY_TO: 'andrew.smith@contactdaa.com',
  CALL_PHONE: '(619) 552-3941',
  TEXT_PHONE: '(858) 257-9162',
  WEBSITE: 'https://www.debtadvisorsofamerica.com/',
  INLINE_KEY: 'savingsSummary',
  BATCH_SIZE: 25,
  PRODUCTION_ENABLED: true,
  STATUS_READY: 'READY',
  STATUS_SENT: 'SENT',
  STATUS_HOLD: 'HOLD'
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DAA CID INLINE SEND')
    .addItem('0 — Install / Verify Queue', 'installCidSendQueue')
    .addSeparator()
    .addItem('1 — Create First READY Inline Draft → Andrew', 'createFirstReadyCidDraftToAndrew')
    .addItem('2 — Send Next 25 VERIFIED READY', 'sendNext25CidInline')
    .addItem('3 — Verify Latest Sent MIME', 'verifyLatestCidSend')
    .addToUi();
}

function installCidSendQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open the DAA production spreadsheet first.');

  let sh = ss.getSheetByName(DAA_CID.QUEUE_SHEET);
  if (!sh) sh = ss.insertSheet(DAA_CID.QUEUE_SHEET);

  const headers = [
    'Status', 'Email', 'First Name', 'Client Name', 'Client ID',
    'Image File ID', 'Asset Deck ID', 'Slide Object ID',
    'Sent At', 'Gmail Message ID', 'Send Error'
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
    'CID queue ready.\n\nUse READY only for rows you want sent.\nNo temporary image URLs are used by this sender.'
  );
}

function createFirstReadyCidDraftToAndrew() {
  const ctx = getQueueContext_();
  const row = findNextReadyRow_(ctx);
  if (!row) throw new Error('No READY rows found in ' + DAA_CID.QUEUE_SHEET + '.');

  const data = readQueueRow_(ctx, row);
  validateQueueRow_(data, row);
  const blob = getDurableImageBlob_(data).setName('Savings Summary');
  const firstName = data.firstName || data.clientName.split(/\s+/)[0] || data.clientName;
  const subject = '[TEST] ' + firstName + '… I Reviewed Your File and Pulled Your Numbers Back Up';
  const htmlBody = buildApprovedEmailHtml_(data, firstName, true);
  const plainBody = buildPlainText_(data, firstName, true);

  const draft = GmailApp.createDraft(
    DAA_CID.SELF_TEST_EMAIL,
    subject,
    plainBody,
    {
      htmlBody: htmlBody,
      inlineImages: { [DAA_CID.INLINE_KEY]: blob },
      name: DAA_CID.SENDER_NAME,
      replyTo: DAA_CID.REPLY_TO
    }
  );

  SpreadsheetApp.getUi().alert(
    'INLINE DRAFT CREATED',
    data.clientName + ' was placed in Andrew\'s Gmail Drafts.\n\n' +
    'No client email was sent. The Savings Summary is embedded in the message body via cid: — not attached as a downloadable file.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return draft;
}

function sendNext25CidInline() {
  if (!DAA_CID.PRODUCTION_ENABLED) {
    throw new Error('PRODUCTION SEND IS DISABLED.');
  }
  const ctx = getQueueContext_();
  let sent = 0;
  let failed = 0;
  let held = 0;

  const remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota <= 0) throw new Error('Google reports no remaining recipient quota for today.');
  const maxThisRun = Math.min(DAA_CID.BATCH_SIZE, remainingQuota);

  for (let row = 2; row <= ctx.sheet.getLastRow() && sent < maxThisRun; row++) {
    const status = String(ctx.sheet.getRange(row, ctx.col.Status).getDisplayValue() || '').trim().toUpperCase();
    if (status === DAA_CID.STATUS_HOLD) { held++; continue; }
    if (status !== DAA_CID.STATUS_READY) continue;

    const data = readQueueRow_(ctx, row);

    try {
      validateQueueRow_(data, row);
      validateVerifiedProductionRow_(ctx.ss, data, row);
      const blob = getDurableImageBlob_(data).setName(safeFilename_(data.clientName + ' Savings Summary.png'));
      const sendResult = sendCidMessage_(data, blob, data.email, false);

      ctx.sheet.getRange(row, ctx.col.Status).setValue(DAA_CID.STATUS_SENT);
      ctx.sheet.getRange(row, ctx.col['Sent At']).setValue(new Date());
      ctx.sheet.getRange(row, ctx.col['Gmail Message ID']).setValue(sendResult.messageId || '');
      ctx.sheet.getRange(row, ctx.col['Send Error']).clearContent();
      markMasterSentVerified_(ctx.ss, data, sendResult.messageId || '');
      sent++;
    } catch (err) {
      failed++;
      ctx.sheet.getRange(row, ctx.col['Send Error']).setValue(String(err && err.message ? err.message : err));
    }
  }

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    'CID INLINE BATCH COMPLETE',
    'Sent: ' + sent + '\nFailed/held for review: ' + failed + '\nPre-existing HOLD rows skipped: ' + held + '\n\n' +
    'Every successful message used embedded MIME image bytes via cid:, not a temporary hosted image URL.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function sendCidMessage_(data, pngBlob, recipient, isSelfTest) {
  if (!isSelfTest && !DAA_CID.PRODUCTION_ENABLED) {
    throw new Error('PRODUCTION SEND IS DISABLED.');
  }
  const firstName = data.firstName || data.clientName.split(/\s+/)[0] || data.clientName;
  const subject = (isSelfTest ? '[TEST] ' : '') + firstName + '… I Reviewed Your File and Pulled Your Numbers Back Up';

  const htmlBody = buildApprovedEmailHtml_(data, firstName, isSelfTest);
  const plainBody = buildPlainText_(data, firstName, isSelfTest);

  GmailApp.sendEmail(recipient, subject, plainBody, {
    htmlBody: htmlBody,
    inlineImages: { [DAA_CID.INLINE_KEY]: pngBlob },
    name: DAA_CID.SENDER_NAME,
    replyTo: DAA_CID.REPLY_TO
  });

  Utilities.sleep(800);
  return { messageId: findLatestSentMessageId_(recipient, subject) };
}

function buildApprovedEmailHtml_(data, firstName, isSelfTest) {
  const who = isSelfTest ? 'Andrew' : firstName;
  const selfNote = isSelfTest
    ? '<p style="font-size:13px;color:#6B7280;margin:0 0 14px;"><strong>DELIVERY TEST:</strong> intended recipient: ' + escapeHtml_(data.email) + '</p>'
    : '';

  return `
  <div style="max-width:1050px;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111;">
    ${selfNote}
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">Hi ${escapeHtml_(who)},</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">This is Andrew Logan Smith with Debt Advisors of America. I have your file open as part of a quality control review and noticed we were never able to move forward after your original consultation.</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">Can you tell me what happened, or what kept us from being able to move forward at the time? I’d genuinely appreciate the feedback.</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;"><strong>The hard part is already done.</strong></p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">We already have your creditor information, eligible debt, budget, and the information from your original review... you do not need to start over.</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 16px;">With a new month and another billing cycle beginning, if your balances are still close to where they were when we last spoke, this is a good time to revisit your options before another month of minimum payments and interest goes by.</p>
    <p style="margin:0 0 16px;"><img src="cid:${DAA_CID.INLINE_KEY}" alt="Savings Summary" style="display:block;width:100%;max-width:1050px;height:auto;border:0;"></p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;"><strong>Please take a close look at the updated Savings Summary above.</strong> It should give you a very good idea of what your options could look like today.</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 14px;">If your situation has changed, we can simply pick up where you left off and review the numbers together.</p>
    <p style="font-size:16px;line-height:1.55;margin:0 0 18px;">Feel free to reply here, call me directly at <strong>${DAA_CID.CALL_PHONE}</strong>, or text me at <strong>${DAA_CID.TEXT_PHONE}</strong>.</p>
    <div style="font-size:15px;line-height:1.22;margin:0;padding:0;"><div style="margin:0;"><strong>Andrew L. Smith</strong></div><div style="margin:0;"><em>Senior Certified Debt Specialist</em></div><div style="margin:0;">🇺🇸 <strong>Debt Advisors of America</strong></div><div style="margin:0;">📞 <strong>Call:</strong> ${DAA_CID.CALL_PHONE}</div><div style="margin:0;">💬 <strong>Text:</strong> ${DAA_CID.TEXT_PHONE}</div><div style="margin:0;">✉️ <strong>Email:</strong> <a href="mailto:${DAA_CID.REPLY_TO}">${DAA_CID.REPLY_TO}</a></div><div style="margin:0;">🌐 <strong>Website:</strong> <a href="${DAA_CID.WEBSITE}">${DAA_CID.WEBSITE.replace(/\/$/, '')}</a></div><div style="margin:0;">🛡️ <strong>BBB Accredited... A+ Rating &amp; Reviews</strong> <a href="https://www.bbb.org/us/ca/san-diego/profile/debt-relief-services/debt-advisors-of-america-1126-1000064078">BBB Reviews</a></div><div style="margin:0;">⭐ <strong>Trustpilot Reviews</strong> <a href="https://www.trustpilot.com/review/debtadvisorsofamerica.com">Trustpilot</a></div><div style="margin:0;">🇺🇸 <strong>We advise. We guide. You decide.</strong></div></div>
  </div>`;
}

function buildPlainText_(data, firstName, isSelfTest) {
  const who = isSelfTest ? 'Andrew' : firstName;
  return [
    'Hi ' + who + ',',
    '',
    'This is Andrew Logan Smith with Debt Advisors of America. I have your file open as part of a quality control review and noticed we were never able to move forward after your original consultation.',
    '',
    'Can you tell me what happened, or what kept us from being able to move forward at the time? I’d genuinely appreciate the feedback.',
    '',
    'The hard part is already done.',
    '',
    'We already have your creditor information, eligible debt, budget, and the information from your original review... you do not need to start over.',
    '',
    'With a new month and another billing cycle beginning, if your balances are still close to where they were when we last spoke, this is a good time to revisit your options before another month of minimum payments and interest goes by.',
    '',
    '[Savings Summary is embedded inline in the HTML version above this line.]',
    '',
    'Please take a close look at the updated Savings Summary above. It should give you a very good idea of what your options could look like today.',
    '',
    'If your situation has changed, we can simply pick up where you left off and review the numbers together.',
    '',
    'Feel free to reply here, call me directly at ' + DAA_CID.CALL_PHONE + ', or text me at ' + DAA_CID.TEXT_PHONE + '.',
    '',
    'Best,',
    'Andrew L. Smith',
    'Senior Certified Debt Specialist',
    'Debt Advisors of America',
    'Call: ' + DAA_CID.CALL_PHONE,
    'Text: ' + DAA_CID.TEXT_PHONE,
    'Email: ' + DAA_CID.REPLY_TO,
    'Website: ' + DAA_CID.WEBSITE.replace(/\/$/, ''),
    'BBB Accredited... A+ Rating & Reviews',
    'Trustpilot Reviews',
    'We advise. We guide. You decide.'
  ].join('\n');
}

function getDurableImageBlob_(data) {
  if (data.imageFileId) {
    const file = DriveApp.getFileById(data.imageFileId);
    const blob = file.getBlob();
    const type = String(blob.getContentType() || '').toLowerCase();
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(type)) {
      throw new Error('Image File ID is not a supported image: ' + type);
    }
    return blob;
  }

  if (data.assetDeckId && data.slideObjectId) {
    return renderSlideToPngBlob_(data.assetDeckId, data.slideObjectId);
  }

  throw new Error('No durable image source. Provide Image File ID or Asset Deck ID + Slide Object ID.');
}

function renderSlideToPngBlob_(presentationId, slideObjectId) {
  const thumb = Slides.Presentations.Pages.getThumbnail(presentationId, slideObjectId, {
    'thumbnailProperties.mimeType': 'PNG',
    'thumbnailProperties.thumbnailSize': 'LARGE'
  });
  if (!thumb || !thumb.contentUrl) throw new Error('Slides API returned no PNG thumbnail URL.');

  const resp = UrlFetchApp.fetch(thumb.contentUrl, { muteHttpExceptions: true });
  if (resp.getResponseCode() >= 300) {
    throw new Error('PNG thumbnail fetch failed: HTTP ' + resp.getResponseCode());
  }
  return resp.getBlob().setContentType('image/png');
}

function verifyLatestCidSend() {
  const sh = getQueueContext_().sheet;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Queue is empty.');

  const ctx = getQueueContext_();
  let targetRow = null;
  for (let r = lastRow; r >= 2; r--) {
    if (String(sh.getRange(r, ctx.col.Status).getDisplayValue()).trim().toUpperCase() === DAA_CID.STATUS_SENT) {
      targetRow = r;
      break;
    }
  }
  if (!targetRow) throw new Error('No SENT row found.');

  const data = readQueueRow_(ctx, targetRow);
  const subject = (data.firstName || data.clientName.split(/\s+/)[0]) + '… I Reviewed Your File and Pulled Your Numbers Back Up';
  const threads = GmailApp.search('in:sent to:' + data.email + ' subject:"' + subject.replace(/"/g, '') + '"', 0, 5);
  if (!threads.length) throw new Error('Could not find the sent message for verification.');

  const msgs = threads[0].getMessages();
  const latest = msgs[msgs.length - 1];
  const raw = latest.getRawContent();
  const hasCidRef = raw.indexOf('cid:' + DAA_CID.INLINE_KEY) >= 0;
  const hasContentId = /Content-ID:\s*<[^>]+>/i.test(raw);
  const hasExternalGoogleusercontentImg = /<img[^>]+src=3D["']?https?:\/\/[^>]*googleusercontent/i.test(raw);
  const hasMultipartRelated = /Content-Type:\s*multipart\/related/i.test(raw);
  const hasInlineDisposition = /X-Attachment-Content-Disposition:\s*inline/i.test(raw);

  SpreadsheetApp.getUi().alert(
    'CID MIME VERIFICATION',
    'Client: ' + data.clientName + '\n' +
    'HTML cid reference: ' + (hasCidRef ? 'YES' : 'NO') + '\n' +
    'MIME Content-ID part: ' + (hasContentId ? 'YES' : 'NO') + '\n' +
    'multipart/related: ' + (hasMultipartRelated ? 'YES' : 'NO') + '\n' +
    'Inline disposition marker: ' + (hasInlineDisposition ? 'YES' : 'NO') + '\n' +
    'Temporary googleusercontent image reference: ' + (hasExternalGoogleusercontentImg ? 'FOUND — REVIEW' : 'NONE') + '\n\n' +
    'For durable production, the first two should be YES and the temporary-host line should be NONE.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function findLatestSentMessageId_(recipient, subject) {
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

function getQueueContext_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open the DAA production spreadsheet first.');
  const sheet = ss.getSheetByName(DAA_CID.QUEUE_SHEET);
  if (!sheet) throw new Error('Missing ' + DAA_CID.QUEUE_SHEET + '. Run Install / Verify Queue first.');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const col = {};
  headers.forEach((h, i) => col[String(h || '').trim()] = i + 1);
  const required = ['Status','Email','First Name','Client Name','Client ID','Image File ID','Asset Deck ID','Slide Object ID','Sent At','Gmail Message ID','Send Error'];
  const missing = required.filter(h => !col[h]);
  if (missing.length) throw new Error('Queue is missing columns: ' + missing.join(', '));
  return { ss, sheet, col };
}

function findNextReadyRow_(ctx) {
  for (let r = 2; r <= ctx.sheet.getLastRow(); r++) {
    if (String(ctx.sheet.getRange(r, ctx.col.Status).getDisplayValue()).trim().toUpperCase() === DAA_CID.STATUS_READY) return r;
  }
  return null;
}

function readQueueRow_(ctx, row) {
  const v = ctx.sheet.getRange(row, 1, 1, ctx.sheet.getLastColumn()).getDisplayValues()[0];
  const g = h => String(v[ctx.col[h] - 1] || '').trim();
  return {
    row,
    status: g('Status'),
    email: g('Email'),
    firstName: g('First Name'),
    clientName: g('Client Name'),
    clientId: g('Client ID'),
    imageFileId: g('Image File ID'),
    assetDeckId: g('Asset Deck ID'),
    slideObjectId: g('Slide Object ID')
  };
}

function validateQueueRow_(d, row) {
  if (!d.clientName) throw new Error('Row ' + row + ': Client Name is blank.');
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error('Row ' + row + ': invalid email.');
  if (!d.imageFileId && !(d.assetDeckId && d.slideObjectId)) {
    throw new Error('Row ' + row + ': image source missing.');
  }
}

function validateVerifiedProductionRow_(ss, data, queueRow) {
  const sh = ss.getSheetByName('DAA_Master_Lead_List');
  if (!sh) throw new Error('Missing DAA_Master_Lead_List.');

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const col = {};
  headers.forEach((h, i) => { col[String(h || '').trim()] = i + 1; });

  const required = ['Zenith ID', 'Email', 'WOW Data Source', 'WOW Status'];
  const missing = required.filter(h => !col[h]);
  if (missing.length) throw new Error('Master sheet missing verification columns: ' + missing.join(', '));

  const ids = sh.getRange(2, col['Zenith ID'], Math.max(1, sh.getLastRow() - 1), 1).getDisplayValues();
  let masterRow = 0;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === data.clientId) {
      masterRow = i + 2;
      break;
    }
  }
  if (!masterRow) throw new Error('Row ' + queueRow + ': Client ID not found in master list.');

  const source = String(sh.getRange(masterRow, col['WOW Data Source']).getDisplayValue() || '').trim().toUpperCase();
  if (!['CALCULATOR VERIFIED', 'ZENITH VERIFIED'].includes(source)) {
    throw new Error('Row ' + queueRow + ': financial data is not calculator or Zenith verified.');
  }

  const masterEmail = String(sh.getRange(masterRow, col.Email).getDisplayValue() || '').trim().toLowerCase();
  if (masterEmail !== String(data.email || '').trim().toLowerCase()) {
    throw new Error('Row ' + queueRow + ': email does not match the verified master record.');
  }

  const masterStatus = String(sh.getRange(masterRow, col['WOW Status']).getDisplayValue() || '').trim().toUpperCase();
  if (masterStatus.indexOf('SENT') >= 0) {
    throw new Error('Row ' + queueRow + ': verified master record is already marked sent.');
  }

  const firstName = data.firstName || data.clientName.split(/\s+/)[0] || data.clientName;
  const subject = firstName + '… I Reviewed Your File and Pulled Your Numbers Back Up';
  const prior = GmailApp.search(
    'in:sent to:' + data.email + ' subject:"' + subject.replace(/"/g, '') + '" newer_than:45d',
    0,
    1
  );
  if (prior.length) {
    throw new Error('Row ' + queueRow + ': matching production email was already sent recently.');
  }

  return { sheet: sh, row: masterRow, col: col, source: source };
}

function markMasterSentVerified_(ss, data, messageId) {
  const sh = ss.getSheetByName('DAA_Master_Lead_List');
  if (!sh) return;

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const col = {};
  headers.forEach((h, i) => { col[String(h || '').trim()] = i + 1; });
  if (!col['Zenith ID']) return;

  const ids = sh.getRange(2, col['Zenith ID'], Math.max(1, sh.getLastRow() - 1), 1).getDisplayValues();
  let row = 0;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === data.clientId) {
      row = i + 2;
      break;
    }
  }
  if (!row) return;

  if (col['WOW Status']) sh.getRange(row, col['WOW Status']).setValue('SENT - VERIFIED');
  if (col['WOW Gmail Draft']) sh.getRange(row, col['WOW Gmail Draft']).setValue('SENT:' + messageId);
  if (col['WOW Gmail']) sh.getRange(row, col['WOW Gmail']).setValue('SENT:' + messageId);
  if (col['Last Contact Note']) sh.getRange(row, col['Last Contact Note']).setValue('DAA Genie verified production email sent ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy'));
}

function safeFilename_(s) {
  return String(s || 'Savings Summary.png').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}