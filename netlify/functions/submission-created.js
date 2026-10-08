/* Runs automatically after every Netlify Forms submission.
   1. Saves the signup as a Resend contact (the subscriber list).
   2. Sends the "you are on the waiting list" email from a verified sketchroot.com address.

   Netlify environment variables:
     RESEND_API_KEY      Resend API key with Full access (contacts need it). Mark as secret.
     MAIL_FROM           e.g. SketchRoot <hello@sketchroot.com>
     RESEND_SEGMENT_ID   optional, overrides the default "General" segment
   Never put keys or passwords in the repo.
   Netlify Forms keeps its own copy of every submission as a backup. */

const FORMS = ['early-access', 'early-access-page'];
const FROM_NAME = 'SketchRoot';
const SUBJECT = 'You are on the SketchRoot waiting list';
const DEFAULT_SEGMENT = '63870331-c905-4aa5-9c65-c74a6bb4117e';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function buildMail(name, exam) {
  var first = String(name || '').trim().split(/\s+/)[0] || 'there';
  var examLine = exam ? ' for ' + exam : '';
  var text =
    'Hi ' + first + ',\n\n' +
    'You are on the SketchRoot waiting list' + examLine + '.\n\n' +
    'We are drawing the first sketches now. As soon as early access opens, you will be among the first to hear from us, and we will send occasional updates as each subject goes live.\n\n' +
    'No action needed. If you ever want to leave the list, just reply to this email.\n\n' +
    'Memory, redrawn.\nTeam SketchRoot\nhttps://sketchroot.com\n';
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;background:#f3efe5;padding:24px">' +
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;color:#1c1a16">' +
    '<img src="https://sketchroot.com/assets/img/logo-512.png" alt="SketchRoot" width="120" style="display:block;margin:0 0 18px">' +
    '<h1 style="font-size:22px;margin:0 0 12px">You are on the waiting list</h1>' +
    '<p style="font-size:16px;line-height:1.55;margin:0 0 12px">Hi ' + esc(first) + ',</p>' +
    '<p style="font-size:16px;line-height:1.55;margin:0 0 12px">You are on the SketchRoot waiting list' + esc(examLine) + '. We are drawing the first sketches now. As soon as early access opens, you will be among the first to hear from us, plus occasional updates as each subject goes live.</p>' +
    '<p style="font-size:16px;line-height:1.55;margin:0 0 12px">No action needed. If you ever want to leave the list, just reply to this email.</p>' +
    '<p style="font-size:16px;line-height:1.55;margin:18px 0 0">Memory, redrawn.<br><strong>Team SketchRoot</strong><br><a href="https://sketchroot.com" style="color:#b57d00">sketchroot.com</a></p>' +
    '</div></div>';
  return { text: text, html: html };
}

function resend(key, path, body) {
  return fetch('https://api.resend.com' + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function saveContact(key, data) {
  var parts = String(data.name || '').trim().split(/\s+/).filter(Boolean);
  var body = {
    email: data.email,
    unsubscribed: false,
    segments: [{ id: process.env.RESEND_SEGMENT_ID || DEFAULT_SEGMENT }]
  };
  if (parts.length) body.first_name = parts[0];
  if (parts.length > 1) body.last_name = parts.slice(1).join(' ');
  var props = {};
  if (data.exam) props.exam = String(data.exam);
  if (data.year) props.year = String(data.year);
  if (Object.keys(props).length) body.properties = props;
  var res = await resend(key, '/contacts', body);
  if (!res.ok) throw new Error('contact ' + res.status + ' ' + (await res.text()).slice(0, 200));
}

async function sendEmail(key, from, to, mail) {
  var addr = from.replace(/^.*<|>$/g, '');
  var res = await resend(key, '/emails', {
    from: from,
    to: [to],
    reply_to: addr,
    subject: SUBJECT,
    text: mail.text,
    html: mail.html,
    headers: { 'List-Unsubscribe': '<mailto:' + addr + '?subject=unsubscribe>' }
  });
  if (!res.ok) throw new Error('email ' + res.status + ' ' + (await res.text()).slice(0, 200));
}

exports.handler = async function (event) {
  var payload;
  try { payload = JSON.parse(event.body).payload || {}; } catch (e) { return { statusCode: 400, body: 'bad payload' }; }

  if (FORMS.indexOf(payload.form_name) === -1) return { statusCode: 200, body: 'ignored form ' + payload.form_name };

  var data = payload.data || {};
  var to = String(data.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { statusCode: 200, body: 'no valid email' };
  data.email = to;

  var key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('RESEND_API_KEY is not set; signup was not added to the list and no email was sent.');
    return { statusCode: 500, body: 'mail not configured' };
  }

  var failed = false;
  try { await saveContact(key, data); } catch (err) { failed = true; console.error('saveContact failed:', err && err.message); }
  try {
    await sendEmail(key, process.env.MAIL_FROM || (FROM_NAME + ' <hello@sketchroot.com>'), to, buildMail(data.name, data.exam));
  } catch (err) { failed = true; console.error('sendEmail failed:', err && err.message); }

  return { statusCode: failed ? 500 : 200, body: failed ? 'partial failure' : 'ok' };
};
