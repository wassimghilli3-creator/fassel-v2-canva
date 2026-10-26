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
const CLIENT_ID = process.env.CANVA_CLIENT_ID || 'OC-AaFbjj1F4ytM';
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET || '';
const CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CODE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const SALES_PATH = path.join(__dirname, 'fassel_v2', 'sales.json');
const TOKEN_PATH = path.join(__dirname, 'fassel_v2', 'token.json');
const VISITS_PATH = path.join(__dirname, 'visits.json');
function getBase(req){ const proto=req.headers['x-forwarded-proto']||'https'; const host=req.headers['x-forwarded-host']||req.headers.host; return host?`${proto}://${host}`:'https://fassel-v2-canva.vercel.app'; }
function readJson(p,d){ try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch{} return d; }
function writeJson(p,data){ try{ fs.mkdirSync(path.join(__dirname,'fassel_v2'),{recursive:true}); }catch{} fs.writeFileSync(p, JSON.stringify(data,null,2)); }
function logSale(e){ let arr=readJson(SALES_PATH,[]); arr.push(e); writeJson(SALES_PATH,arr); console.log(`WhatsApp LOG ONLY 212720408226: ${e.email}`); }
function addVisit(req){ let v=readJson(VISITS_PATH,[]); v.push({time:new Date().toISOString(), ip:req.headers['x-forwarded-for']||req.ip||'', product:req.query.product||'FASSEL_V2'}); try{ fs.writeFileSync(VISITS_PATH, JSON.stringify(v,null,2)); }catch{} }
async function getToken(){ const t=readJson(TOKEN_PATH,null); if(!t) return null; const now=Math.floor(Date.now()/1000); if(t.expires_at && t.expires_at-300<now && t.refresh_token){ try{ const r=await fetch('https://api.canva.com/rest/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'refresh_token',client_id:CLIENT_ID,client_secret:CLIENT_SECRET,refresh_token:t.refresh_token})}); const d=await r.json(); if(d.access_token){ const nd={access_token:d.access_token,refresh_token:d.refresh_token||t.refresh_token,expires_at:Math.floor(Date.now()/1000)+(d.expires_in||3600)}; writeJson(TOKEN_PATH,nd); return nd; } }catch{} } return t; }
app.get('/', (req,res)=>{ const b=getBase(req); res.send(`<h1>FASSEL V2 CONSOLE</h1><p>Server OK - ${b}</p><ul><li><a href="/health">health</a></li><li><a href="/auth/canva">auth-canva - Renew 1-Click</a></li><li><a href="/api/sales/stats">sales-stats</a></li><li><a href="/api/visits">visits</a></li></ul><p>Webhook: ${b}/webhook/payhip</p>`); });
app.get('/health',(req,res)=>res.json({ok:true}));
app.get('/auth/canva',(req,res)=>{ const b=getBase(req); const redirect_uri=`${b}/auth/canva/callback`; const scope='design:content:read design:content:write'; const url=`https://www.canva.com/api/oauth/authorize?code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256&scope=${encodeURIComponent(scope)}&response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}`; res.redirect(url); });
app.get('/auth/canva/callback', async (req,res)=>{ const code=req.query.code; if(!code) return res.status(400).send(`<pre>${JSON.stringify(req.query,null,2)}</pre><a href="/auth/canva">retry</a>`); try{ const b=getBase(req); const redirect_uri=`${b}/auth/canva/callback`; const r=await fetch('https://api.canva.com/rest/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'authorization_code',code,code_verifier:CODE_VERIFIER,client_id:CLIENT_ID,client_secret:CLIENT_SECRET,redirect_uri})}); const d=await r.json(); if(d.access_token){ const nd={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Math.floor(Date.now()/1000)+(d.expires_in||3600)}; writeJson(TOKEN_PATH,nd); return res.send(`<h1>Token Renewed!</h1><p>expires_at ${nd.expires_at}</p><a href="/">console</a>`);} else res.status(400).send(`<pre>${JSON.stringify(d,null,2)}</pre>`);}catch(e){ res.status(500).send(e.message);} });
app.post(['/webhook/payhip','/api/webhook/payhip'], async (req,res)=>{ try{ const p=req.body; const email=p.buyer_email||p.email||'unknown'; await getToken(); logSale({time:new Date().toISOString(),email,price_cents:p.price_cents||1400}); res.json({ok:true}); }catch(e){ res.status(500).json({ok:false}); } });
app.get('/api/track/pixel',(req,res)=>{ addVisit(req); const pix=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64'); res.set('Content-Type','image/gif'); res.set('Cache-Control','no-cache'); res.send(pix); });
app.get('/api/visits',(req,res)=>{ const v=readJson(VISITS_PATH,[]); res.json({total:v.length,visits:v.slice(-50).reverse()}); });
app.get('/api/sales/stats',(req,res)=>{ const s=readJson(SALES_PATH,[]); res.json({total:s.length,last:s[s.length-1]||null}); });
app.get('/api/sales',(req,res)=>res.json(readJson(SALES_PATH,[])));
app.listen(PORT,()=>console.log(`LIVE ${PORT}`));
export default app;
