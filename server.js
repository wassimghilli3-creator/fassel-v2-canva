import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({limit:'1mb'}));

const PORT = process.env.PORT || 10000;
const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID || 'OC-AaFbjj1F4ytM';
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET || '';
const CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CODE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const SALES_PATH = path.join(__dirname, 'fassel_v2', 'sales.json');
const TOKEN_PATH = path.join(__dirname, 'fassel_v2', 'token.json');
const VISITS_PATH = path.join(__dirname, 'visits.json');

function getBaseUrl(req){
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if(host) return `${proto}://${host}`;
  return 'https://fassel-v2-canva.vercel.app';
}

function ensureDir(){
  try{ fs.mkdirSync(path.join(__dirname,'fassel_v2'),{recursive:true}); }catch{}
}
function readJson(p, def){
  try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch{}
  return def;
}
function writeJson(p, data){
  ensureDir();
  fs.writeFileSync(p, JSON.stringify(data,null,2));
}
function logSale(e){
  ensureDir();
  let arr=readJson(SALES_PATH, []);
  arr.push(e);
  writeJson(SALES_PATH, arr);
  console.log(`WhatsApp 212720408226 LOG ONLY: New sale ${e.email || ''} - NO MESSAGE SENT`);
}
function appendVisit(req){
  let visits=readJson(VISITS_PATH, []);
  const visit={ time:new Date().toISOString(), ip: req.headers['x-forwarded-for'] || req.ip || '', product: req.query.product || 'FASSEL_V2', ua: (req.headers['user-agent']||'').substring(0,120), referer: req.headers['referer'] || '' };
  visits.push(visit);
  try{ fs.writeFileSync(VISITS_PATH, JSON.stringify(visits,null,2)); }catch{}
  return visit;
}
async function refreshAccessToken(refresh_token){
  if(!refresh_token) return null;
  try{
    const resp = await fetch('https://api.canva.com/rest/oauth/token',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ grant_type:'refresh_token', client_id:CANVA_CLIENT_ID, client_secret:CANVA_CLIENT_SECRET, refresh_token })
    });
    const data = await resp.json();
    if(data.access_token){
      const tokenData = { access_token: data.access_token, refresh_token: data.refresh_token || refresh_token, expires_at: Math.floor(Date.now()/1000) + (data.expires_in || 3600) };
      writeJson(TOKEN_PATH, tokenData);
      return tokenData;
    }
  }catch(e){}
  return null;
}
async function getValidToken(){
  const token = readJson(TOKEN_PATH, null);
  if(!token) return null;
  const now = Math.floor(Date.now()/1000);
  if(token.expires_at && token.expires_at - 300 < now){
    const refreshed = await refreshAccessToken(token.refresh_token);
    if(refreshed) return refreshed;
  }
  return token;
}

app.get('/', (req,res)=>{ res.send(`<h1>FASSEL V2 OPERATIONS CONSOLE</h1><p>Server reachable</p><ul><li><a href="/health">/health</a></li><li><a href="/auth/【entity-canva¦canonical_name=CANVA】">/auth/【entity-canva¦canonical_name=CANVA】 - Renew 【entity-Canva¦canonical_name=CANVA】 1-Click</a></li><li><a href="/api/sales/stats">/api/sales/stats</a></li><li><a href="/api/visits">/api/visits</a></li></ul><p>Webhook: ${getBaseUrl(req)}/webhook/payhip</p>`); });
app.get('/health', (req,res)=> res.json({ok:true}));

app.get('/auth/canva', (req,res)=>{
  const base = getBaseUrl(req);
  const redirect_uri = `${base}/auth/canva/callback`;
  const scope = 'asset:write brand_template:content:write design:content:write';
  const authUrl = `https://www.canva.com/api/oauth/authorize?code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256&scope=${encodeURIComponent(scope)}&response_type=code&client_id=${CANVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  res.redirect(authUrl);
});

app.get('/auth/canva/callback', async (req,res)=>{
  const code = req.query.code;
  const error = req.query.error;
  const error_description = req.query.error_description;
  if(!code){
    return res.status(400).send(`<h1>【entity-Canva¦canonical_name=CANVA】 Debug - No code</h1><pre>Query: ${JSON.stringify(req.query, null, 2)}</pre><p>Error: ${error}</p><p>Desc: ${error_description}</p><a href="/auth/canva">Retry</a>`);
  }
  try{
    const base = getBaseUrl(req);
    const redirect_uri = `${base}/auth/canva/callback`;
    const resp = await fetch('https://api.canva.com/rest/oauth/token',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ grant_type:'authorization_code', code, code_verifier: CODE_VERIFIER, client_id: CANVA_CLIENT_ID, client_secret: CANVA_CLIENT_SECRET, redirect_uri })
    });
    const data = await resp.json();
    if(data.access_token){
      const tokenData = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Math.floor(Date.now()/1000) + (data.expires_in || 3600) };
      writeJson(TOKEN_PATH, tokenData);
      return res.send(`<h1>FASSEL V2 Token Renewed Automatically!</h1><p>expires_at: ${tokenData.expires_at}</p><a href="/">Console</a>`);
    } else {
      return res.status(400).send(`<pre>${JSON.stringify(data,null,2)}</pre>`);
    }
  }catch(e){ return res.status(500).send(e.message); }
});

app.post(['/webhook/payhip','/api/webhook/payhip'], async (req,res)=>{
  try{
    const payload = req.body;
    const email = payload.buyer_email || payload.email || 'unknown';
    const price_cents = payload.price_cents || 1400;
    const token = await getValidToken();
    const saleEntry = { time: new Date().toISOString(), email, buyer_email: email, price_cents, token_valid: !!token };
    logSale(saleEntry);
    res.json({ok:true});
  }catch(e){ res.status(500).json({ok:false}); }
});

app.get('/api/track/pixel', (req,res)=>{
  appendVisit(req);
  const pixel = Buffer.from('[STRIPPED 56 bytes]','base64');
  res.set('Content-Type','image/gif');
  res.set('Cache-Control','no-cache');
  res.send(pixel);
});
app.get('/api/visits', (req,res)=>{
  const visits = readJson(VISITS_PATH, []);
  res.json({ total: visits.length, today: visits.filter(v=> v.time.startsWith(new Date().toISOString().split('T')[0])).length, visits: visits.slice(-50).reverse() });
});
app.get('/api/visits/stats', (req,res)=>{
  const visits = readJson(VISITS_PATH, []);
  const sales = readJson(SALES_PATH, []);
  res.json({ visits_total: visits.length, sales_total: sales.length, conversion: visits.length ? ((sales.length/visits.length)*100).toFixed(2)+'%' : '0%' });
});
app.get('/api/sales', (req,res)=>{
  const sales = readJson(SALES_PATH, []);
  res.json(sales);
});
app.get('/api/sales/stats', (req,res)=>{
  const sales = readJson(SALES_PATH, []);
  res.json({ total: sales.length, last_sale: sales[sales.length-1] || null });
});
app.listen(PORT, ()=> console.log(`FASSEL V2 LIVE on ${PORT}`));
export default app;
