import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// CONFIG
const ID = process.env.CANVA_CLIENT_ID || 'OC-AaFbjj1F4ytM';
const SECRET = process.env.CANVA_CLIENT_SECRET || '';
const VER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHAL = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

// STORE - Vercel Free (memory + ENV fallback)
let store = {
  access_token: null,
  refresh_token: process.env.【entity-CANVA_REFRESH_TOKEN¦canonical_name=CANVA】 || null,
  expires_at: 0,
  sales: [],
  visits: {}
};

function getBase(req){
  const h = req.headers['x-forwarded-host'] || req.headers.host;
  return 'https://' + h;
}

async function getValidToken(){
  if(!store.refresh_token) return store.access_token;
  if(Date.now() < store.expires_at - 60000) return store.access_token;
  
  try{
    const p = new URLSearchParams();
    p.append('grant_type','refresh_token');
    p.append('refresh_token', store.refresh_token);
    p.append('client_id', ID);
    p.append('client_secret', SECRET);

    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString()
    });
    const d = await r.json();
    
    if(d.access_token){
      store.access_token = d.access_token;
      if(d.refresh_token) store.refresh_token = d.refresh_token;
      store.expires_at = Date.now() + (d.expires_in * 1000);
      console.log('AUTO REFRESH OK - expires in', d.expires_in);
      return store.access_token;
    }
  }catch(e){
    console.log('Refresh error', e.message);
  }
  return store.access_token;
}

// ROUTES
app.get('/', (req,res) => {
  res.send(`
    <h1>FASSEL V2 - AUTOMATIC PERMANENT</h1>
    <p>Token: ${store.access_token ? '✅ OK' : '❌ NOT SET'} | Expires: ${store.expires_at ? new Date(store.expires_at).toLocaleString() : 'N/A'}</p>
    <p>Sales: ${store.sales.length} | Visits: ${Object.values(store.visits).reduce((a,b)=>a+b,0)}</p>
    <p><a href="/a/c">Renew Token</a> | <a href="/api/sales">Sales</a> | <a href="/api/visits">Visits</a> | <a href="/health">Health</a></p>
    <p>Webhook: /webhook/payhip LIVE | Endpoint: ${TOKEN_URL}</p>
  `);
});

app.get('/health', (req,res) => {
  res.json({
    ok: true,
    token: !!store.access_token,
    expires_at: store.expires_at,
    sales: store.sales.length,
    visits: store.visits,
    permanent: 'auto-refresh every 3h + on sale'
  });
});

// AUTH - Short route (no "【entity-canva¦canonical_name=CANVA】" word to avoid bug)
app.get('/a/c', (req,res) => {
  const redirect = getBase(req) + '/a/c/callback';
  const scope = 'design:content:read design:content:write asset:read asset:write profile:read brand_template:content:read brand_template:meta:read design:meta:read';
  const url = `https://www.canva.com/api/oauth/authorize?code_challenge=${CHAL}&code_challenge_method=S256&scope=${encodeURIComponent(scope)}&response_type=code&client_id=${ID}&redirect_uri=${encodeURIComponent(redirect)}`;
  res.redirect(url);
});

app.get('/a/c/callback', async (req,res) => {
  const code = req.query.code;
  if(!code) return res.status(400).send('No code: ' + JSON.stringify(req.query));

  const redirect = getBase(req) + '/a/c/callback';
  const p = new URLSearchParams();
  p.append('grant_type','authorization_code');
  p.append('code', code);
  p.append('code_verifier', VER);
  p.append('client_id', ID);
  p.append('client_secret', SECRET);
  p.append('redirect_uri', redirect);

  try{
    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString()
    });
    const d = await r.json();

    if(d.access_token){
      store.access_token = d.access_token;
      store.refresh_token = d.refresh_token;
      store.expires_at = Date.now() + (d.expires_in * 1000);
      
      return res.send(`
        <h1>Token Renewed SUCCESS! PERMANENT READY</h1>
        <p>Access: ${d.access_token.substring(0,30)}...</p>
        <p>Refresh: ${d.refresh_token.substring(0,30)}... (90 days)</p>
        <p>Expires in: ${d.expires_in}s</p>
        <p><b>IMPORTANT:</b> Copy refresh_token and add to Vercel ENV: CANVA_REFRESH_TOKEN</p>
        <p>Value: <code>${d.refresh_token}</code></p>
        <a href="/">Dashboard</a>
      `);
    }else{
      return res.send('<h1>Failed</h1><pre>'+JSON.stringify(d,null,2)+'</pre>');
    }
  }catch(e){
    res.send('Error: ' + e.message);
  }
});

// TRACKING PIXEL
app.get('/api/track/pixel', (req,res) => {
  const prod = req.query.product || 'unknown';
  store.visits[prod] = (store.visits[prod] || 0) + 1;
  console.log('VISIT', prod);
  res.setHeader('Content-Type','image/gif');
  res.send(Buffer.from('[STRIPPED 56 bytes]','base64'));
});

app.get('/api/visits', (req,res) => res.json(store.visits));
app.get('/api/sales', (req,res) => res.json(store.sales));

// CRON - Auto refresh every 3h
app.get('/api/cron/refresh', async (req,res) => {
  const token = await getValidToken();
  res.json({ ok: true, refreshed: !!token, expires_at: store.expires_at });
});

app.get('/api/refresh', async (req,res) => {
  const token = await getValidToken();
  res.json({ ok: true, token: token ? 'OK' : 'FAIL', expires_at: store.expires_at });
});

// PAYHIP WEBHOOK - $14 + LOG ONLY 【entity-WhatsApp¦canonical_name=WhatsApp】 212720408226
app.post(['/webhook/payhip','/api/webhook/payhip'], async (req,res) => {
  try{
    await getValidToken();
    const data = req.body;
    const sale = {
      id: Date.now(),
      date: new Date().toISOString(),
      product: data.product || 'FASSEL_V2',
      email: data.email || data.buyer_email || 'unknown',
      price: data.price || 14,
      source: 'payhip'
    };
    store.sales.push(sale);
    console.log('SALE:', JSON.stringify(sale));
    console.log('【entity-WHATSAPP¦canonical_name=WhatsApp】 LOG ONLY 212720408226 - NO MESSAGE SENT -', sale.email);
    
    res.json({ ok: true, permanent: true });
  }catch(e){
    console.log('Webhook error', e);
    res.json({ ok: true });
  }
});

app.listen(process.env.PORT || 10000);
export default app;
