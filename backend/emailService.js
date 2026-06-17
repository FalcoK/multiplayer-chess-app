const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'Schach-Arena <no-reply@chess-arena.com>';

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: parseInt(SMTP_PORT) === 465, // True for 465, false for 587/others
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
  console.log('Email Service Mode: SMTP Transporter initialized.');
} else {
  console.log('Email Service Mode: MOCK (Verification links will be printed to the server console).');
}

/**
 * Sends a registration verification email.
 * @param {string} to - Recipient email
 * @param {string} username - Recipient username
 * @param {string} token - Verification token
 * @param {string} originHost - Host where frontend/backend requests resolve (to build link)
 */
async function sendVerificationEmail(to, username, token, originHost) {
  // Resolve host (defaults to localhost:3001 if local)
  const host = originHost || 'localhost:3001';
  // Standard http vs https check (use https if not localhost)
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const verificationLink = `${protocol}://${host}/api/auth/verify?token=${token}`;

  const subject = 'Bitte bestätige deine E-Mail-Adresse für die Schach-Arena';
  
  const textContent = `Hallo ${username},\n\nvielen Dank für deine Registrierung in der Schach-Arena!\n\nBitte bestätige deine E-Mail-Adresse, indem du auf den folgenden Link klickst:\n${verificationLink}\n\nDanach kannst du dich sofort anmelden.\n\nViele Grüße,\ndein Schach-Arena Team`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #38bdf8; text-align: center;">Willkommen in der Schach-Arena! 👑</h2>
      <p>Hallo <strong>${username}</strong>,</p>
      <p>vielen Dank für deine Registrierung. Um dein Konto freizuschalten, klicke bitte auf den untenstehenden Bestätigungs-Button:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="background: linear-gradient(135deg, #38bdf8, #4f46e5); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);">
          Konto verifizieren
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 0.88rem;">Falls der Button nicht funktioniert, kannst du auch den folgenden Link kopieren und in deinen Browser einfügen:</p>
      <p style="word-break: break-all; font-size: 0.82rem; color: #4f46e5;">${verificationLink}</p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">Diese E-Mail wurde automatisch generiert. Bitte antworte nicht auf diese Nachricht.</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`Verification email sent to ${to} successfully.`);
    } catch (err) {
      console.error(`Failed to send verification email to ${to}:`, err.message);
      throw err;
    }
  } else {
    // Print to console fallback
    console.log('\n================================================================');
    console.log(`📧 MOCK EMAIL DISPATCH to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Verification Link: ${verificationLink}`);
    console.log('================================================================\n');
  }
}

module.exports = {
  sendVerificationEmail,
  isMockMode: !transporter
};

