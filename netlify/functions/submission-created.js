/* Runs automatically after every Netlify Forms submission.
   Sends the "you are on the waiting list" email from the SketchRoot Gmail account.

   Needs two environment variables in Netlify (Site configuration > Environment variables):
     GMAIL_USER          sketchroot.official@gmail.com
     GMAIL_APP_PASSWORD  a 16 character Google App Password for that account
   Never put the password in the repo. */
const nodemailer = require('nodemailer');

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

exports.handler = async function (event) {
  var payload;
  try { payload = JSON.parse(event.body).payload || {}; } catch (e) { return { statusCode: 400, body: 'bad payload' }; }

  if (payload.form_name !== FORM) return { statusCode: 200, body: 'ignored form ' + payload.form_name };

  var data = payload.data || {};
  var to = String(data.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { statusCode: 200, body: 'no valid email' };

  var user = process.env.GMAIL_USER;
  var pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.error('GMAIL_USER or GMAIL_APP_PASSWORD is not set; confirmation email skipped.');
    return { statusCode: 500, body: 'mail not configured' };
  }

  var transport = nodemailer.createTransport({ service: 'gmail', auth: { user: user, pass: pass } });
  var mail = buildMail(data.name, data.exam);
  try {
    await transport.sendMail({
      from: '"' + FROM_NAME + '" <' + user + '>',
      to: to,
      replyTo: user,
      subject: 'You are on the SketchRoot waiting list',
      text: mail.text,
      html: mail.html
    });
    return { statusCode: 200, body: 'sent' };
  } catch (err) {
    console.error('sendMail failed:', err && err.message);
    return { statusCode: 500, body: 'send failed' };
  }
};