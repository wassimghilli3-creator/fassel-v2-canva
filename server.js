const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();
app.use(cors());
app.use(express.json());
const VER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHAL = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
let tokens = { access: process.env.CANVA_ACCESS_TOKEN || null, refresh: process.env.CANVA_REFRESH_TOKEN || null, exp: 0 };
let sales = []; let visits = 0;
async function sendEmail(subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });
    await transporter.sendMail({
      from: `FASSEL V2 <${process.env.GMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.GMAIL_USER,
      subject, html
    });
    console.log('Email sent via Gmail OK');
    return true;
  } catch (e) { console.error('Gmail failed', e.message); return false; }
}
async function getValidToken() {
  if (tokens.access && Date.now() < tokens.exp - 60000) return tokens.access;
  if (!tokens.refresh) return null;
  try {
    const r = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh,
        client_id: process.env.CANVA_CLIENT_ID,
        client_secret: process.env.CANVA_CLIENT_SECRET
      })
    });
    const j = await r.json();
    if (j.access_token) {
      tokens.access = j.access_token;
      tokens.refresh = j.refresh_token || tokens.refresh;
      tokens.exp = Date.now() + (j.expires_in * 1000);
      return tokens.access;
    }
  } catch (e) { console.error(e); }
  return null;
}
app.get('/', (req, res) => {
  res.send(`<h1>FASSEL V2 - PERMANENT - Token: ${tokens.refresh ? '✅ OK' : 'NOT SET'}</h1><p>Sales: ${sales.length} | Visits: ${visits}</p><p><a href="/a/c">Renew</a> | <a href="/health">Health</a> | <a href="/api/test/sale">Test Email</a></p>`);
});
app.get('/a/c', (req, res) => {
  const url = `https://www.canva.com/api/oauth/authorize?code_challenge=${CHAL}&code_challenge_method=S256&scope=design:content:read%20design:content:write%20asset:read%20asset:write%20profile:read&response_type=code&client_id=${process.env.CANVA_CLIENT_ID}&redirect_uri=${encodeURIComponent('https://fassel-v2-canva.vercel.app/a/c/callback')}`;
  res.redirect(url);
});
app.get('/a/c/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code');
  try {
    const r = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: VER,
        client_id: process.env.CANVA_CLIENT_ID,
        client_secret: process.env.CANVA_CLIENT_SECRET,
        redirect_uri: 'https://fassel-v2-canva.vercel.app/a/c/callback'
      })
    });
    const j = await r.json();
    if (j.access_token) {
      tokens.access = j.access_token;
      tokens.refresh = j.refresh_token;
      tokens.exp = Date.now() + (j.expires_in * 1000);
      res.send(`<h1>PERMANENT SUCCESS! Email Push Ready</h1><p>Token: ${j.refresh_token}</p><p>Copy to Vercel ENV</p><p>Email: ${process.env.GMAIL_USER} Push ACTIVE</p>`);
    } else { res.send(`Error: ${JSON.stringify(j)}`); }
  } catch (e) { res.send('Error: ' + e.message); }
});
app.post('/webhook/payhip', async (req, res) => {
  const { product, price, email } = req.body;
  const sale = { id: Date.now().toString(), product: product || 'FASSEL_V2', price: price || 14, email: email || '', time: new Date().toISOString() };
  sales.push(sale);
  await sendEmail(`🎉 FASSEL V2 - New Sale $${sale.price}!`, `<h1>New Sale!</h1><p>Product: ${sale.product}</p><p>Price: $${sale.price}</p><p>Email: ${sale.email}</p>`);
  res.json({ ok: true });
});
app.get('/api/test/sale', async (req, res) => {
  const sale = { id: Date.now().toString(), product: 'FASSEL_V2_TEST', price: 14, time: new Date().toISOString() };
  sales.push(sale);
  const sent = await sendEmail(`🎉 FASSEL V2 - New Sale $${sale.price}! (TEST)`, `<h1>Test Sale!</h1><p>Test email from FASSEL V2</p><p>Price: $${sale.price}</p>`);
  res.json({ ok: true, message: `Test sale + Email ${sent ? 'sent' : 'FAILED'} to ${process.env.GMAIL_USER}`, sale });
});
app.get('/api/sales', (req, res) => res.json(sales));
app.get('/api/visits', (req, res) => { visits++; res.json({ visits }); });
app.get('/health', (req, res) => res.json({ ok: true, token: !!tokens.refresh }));
app.listen(3000, () => console.log('FASSEL V2 Running'));
module.exports = app;
