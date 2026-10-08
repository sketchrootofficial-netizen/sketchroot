/* Runs automatically after every Netlify Forms submission.
   Sends the "you are on the waiting list" email.

   Preferred sender: Resend, from a verified sketchroot.com address.
     RESEND_API_KEY   Resend API key (mark as secret in Netlify)
     MAIL_FROM        e.g. SketchRoot <hello@sketchroot.com>
   Fallback while Resend is not set up: Gmail SMTP.
     GMAIL_USER, GMAIL_APP_PASSWORD
   Never put keys or passwords in the repo. */
const nodemailer = require('nodemailer');

const SUBJECT = 'You are on the SketchRoot waiting list';

const FORM = 'early-access';
const FROM_NAME = 'SketchRoot';

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

async function sendWithResend(key, from, to, mail) {
  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: from,
      to: [to],
      reply_to: from.replace(/^.*<|>$/g, ''),
      subject: SUBJECT,
      text: mail.text,
      html: mail.html,
      headers: { 'List-Unsubscribe': '<mailto:' + from.replace(/^.*<|>$/g, '') + '?subject=unsubscribe>' }
    })
  });
  if (!res.ok) throw new Error('Resend ' + res.status + ' ' + (await res.text()).slice(0, 200));
}

async function sendWithGmail(user, pass, to, mail) {
  var transport = nodemailer.createTransport({ service: 'gmail', auth: { user: user, pass: pass } });
  await transport.sendMail({
    from: '"' + FROM_NAME + '" <' + user + '>',
    to: to,
    replyTo: user,
    subject: SUBJECT,
    text: mail.text,
    html: mail.html
  });
}

exports.handler = async function (event) {
  var payload;
  try { payload = JSON.parse(event.body).payload || {}; } catch (e) { return { statusCode: 400, body: 'bad payload' }; }

  if (payload.form_name !== FORM) return { statusCode: 200, body: 'ignored form ' + payload.form_name };

  var data = payload.data || {};
  var to = String(data.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { statusCode: 200, body: 'no valid email' };

  var mail = buildMail(data.name, data.exam);
  var resendKey = process.env.RESEND_API_KEY;
  var gmailUser = process.env.GMAIL_USER;
  var gmailPass = process.env.GMAIL_APP_PASSWORD;

  try {
    if (resendKey) {
      await sendWithResend(resendKey, process.env.MAIL_FROM || (FROM_NAME + ' <hello@sketchroot.com>'), to, mail);
    } else if (gmailUser && gmailPass) {
      await sendWithGmail(gmailUser, gmailPass, to, mail);
    } else {
      console.error('No mail provider configured (set RESEND_API_KEY, or GMAIL_USER and GMAIL_APP_PASSWORD).');
      return { statusCode: 500, body: 'mail not configured' };
    }
    return { statusCode: 200, body: 'sent' };
  } catch (err) {
    console.error('send failed:', err && err.message);
    return { statusCode: 500, body: 'send failed' };
  }
};