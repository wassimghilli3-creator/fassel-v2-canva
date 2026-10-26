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
app.get('/',(req,res)=>{ res.send('<h1>FASSEL V2 OK</h1><a href="/auth/【entity-canva¦canonical_name=Canva】">auth-【entity-canva¦canonical_name=Canva】 Renew</a>'); });
app.get('/health',(req,res)=>res.json({ok:true}));
app.get('/auth/【entity-canva¦canonical_name=Canva】',(req,res)=>{
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const base = `https://${host}`;
  const redirect_uri = `${base}/auth/canva/callback`;
  const scope = 'design:content:read design:content:write';
  const url = `https://www.canva.com/api/oauth/authorize?code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256&scope=${encodeURIComponent(scope)}&response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  res.redirect(url);
});
app.get('/auth/【entity-canva¦canonical_name=Canva】/callback', async (req,res)=>{
  const code = req.query.code;
  if(!code) return res.status(400).send(`<pre>${JSON.stringify(req.query,null,2)}</pre>`);
  try{
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const base = `https://${host}`;
    const redirect_uri = `${base}/auth/canva/callback`;
    const params = new URLSearchParams();
    params.append('grant_type','authorization_code');
    params.append('code',code);
    params.append('code_verifier',CODE_VERIFIER);
    params.append('client_id',CLIENT_ID);
    params.append('client_secret',CLIENT_SECRET);
    params.append('redirect_uri',redirect_uri);
    const r = await fetch('https://api.canva.com/rest/oauth/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:params
    });
    const d = await r.json();
    if(d.access_token){
      fs.writeFileSync(TOKEN_PATH, JSON.stringify({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Math.floor(Date.now()/1000)+(d.expires_in||3600)},null,2));
      return res.send(`<h1>Token Renewed! SUCCESS</h1><p>expires_at: ${Math.floor(Date.now()/1000)+(d.expires_in||3600)}</p><a href="/">console</a>`);
    } else {
      return res.status(400).send(`<pre>${JSON.stringify(d,null,2)}</pre>`);
    }
  }catch(e){ res.status(500).send(e.message); }
});
app.post(['/webhook/payhip','/api/webhook/payhip'], async (req,res)=>{
  try{ const p=req.body; let s=[]; try{ s=JSON.parse(fs.readFileSync(SALES_PATH,'utf8')); }catch{} s.push({time:new Date().toISOString(),email:p.buyer_email||'unknown'}); fs.writeFileSync(SALES_PATH, JSON.stringify(s,null,2)); res.json({ok:true}); }catch(e){ res.status(500).json({ok:false}); }
});
app.listen(PORT,()=>console.log('LIVE'));
export default app;
