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
const TOKEN_PATH = path.join(__dirname, 'token.json');
const SALES_PATH = path.join(__dirname, 'sales.json');
const VISITS_PATH = path.join(__dirname, 'visits.json');
function getBase(req){ const p=req.headers['x-forwarded-proto']||'https'; const h=req.headers['x-forwarded-host']||req.headers.host; return h?`${p}://${h}`:'https://fassel-v2-canva.vercel.app'; }
function readJson(p,d){ try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch{} return d; }
function writeJson(p,d){ try{ fs.mkdirSync(path.dirname(p),{recursive:true}); }catch{} fs.writeFileSync(p, JSON.stringify(d,null,2)); }
app.get('/',(req,res)=>{ const b=getBase(req); res.send(`<h1>FASSEL V2 OK</h1><a href="/auth/canva">auth-canva</a><br>Webhook: ${b}/webhook/payhip`); });
app.get('/health',(req,res)=>res.json({ok:true}));
app.get('/auth/canva',(req,res)=>{ const b=getBase(req); const redirect_uri=`${b}/auth/canva/callback`; const scope='design:content:read design:content:write'; const url=`https://www.canva.com/api/oauth/authorize?code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256&scope=${encodeURIComponent(scope)}&response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}`; res.redirect(url); });
app.get('/auth/canva/callback', async (req,res)=>{
  const code=req.query.code;
  if(!code) return res.status(400).send(`<pre>${JSON.stringify(req.query,null,2)}</pre>`);
  try{
    const b=getBase(req);
    const redirect_uri=`${b}/auth/canva/callback`;
    const params = new URLSearchParams();
    params.append('grant_type','authorization_code');
    params.append('code',code);
    params.append('code_verifier',CODE_VERIFIER);
    params.append('client_id',CLIENT_ID);
    params.append('client_secret',CLIENT_SECRET);
    params.append('redirect_uri',redirect_uri);
    const r=await fetch('https://api.canva.com/rest/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params});
    const d=await r.json();
    if(d.access_token){
      const nd={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Math.floor(Date.now()/1000)+(d.expires_in||3600)};
      writeJson(TOKEN_PATH,nd);
      return res.send(`<h1>Token Renewed! OK</h1><p>${nd.expires_at}</p><a href="/">home</a>`);
    } else res.status(400).send(`<pre>${JSON.stringify(d,null,2)}</pre>`);
  }catch(e){ res.status(500).send(e.message); }
});
app.post(['/webhook/payhip','/api/webhook/payhip'], async (req,res)=>{ try{ const p=req.body; let s=readJson(SALES_PATH,[]); s.push({time:new Date().toISOString(),email:p.buyer_email||p.email||'unknown'}); writeJson(SALES_PATH,s); res.json({ok:true}); }catch(e){ res.status(500).json({ok:false}); } });
app.get('/api/visits',(req,res)=>res.json(readJson(VISITS_PATH,[])));
app.listen(PORT,()=>console.log(`LIVE`));
export default app;
