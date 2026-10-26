import express from 'express';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.json());
const ID = process.env.CANVA_CLIENT_ID || 'OC-AaFbjj1F4ytM';
const SECRET = process.env.CANVA_CLIENT_SECRET || '';
const VER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHAL = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const AUTH_PATH = '/auth/' + '【entity-canva¦canonical_name=Canva】';
const CALLBACK_PATH = '/auth/' + '【entity-canva¦canonical_name=Canva】' + '/callback';

app.get('/',(req,res)=>res.send('<h1>OK</h1><a href="/auth/【entity-canva¦canonical_name=Canva】">renew</a>'));
app.get('/health',(req,res)=>res.json({ok:true}));

app.get(AUTH_PATH,(req,res)=>{
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = 'https://'+host;
  const redirect = base+CALLBACK_PATH;
  const scope = 'design:content:read design:content:write';
  const url = 'https://www.canva.com/api/oauth/authorize?code_challenge='+CHAL+'&code_challenge_method=S256&scope='+encodeURIComponent(scope)+'&response_type=code&client_id='+ID+'&redirect_uri='+encodeURIComponent(redirect);
  res.redirect(url);
});

app.get(CALLBACK_PATH, async (req,res)=>{
  const code = req.query.code;
  if(!code) return res.send('<pre>'+JSON.stringify(req.query,null,2)+'</pre>');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = 'https://'+host;
  const redirect = base+CALLBACK_PATH;
  const p = new URLSearchParams();
  p.append('grant_type','authorization_code');
  p.append('code',code);
  p.append('code_verifier',VER);
  p.append('client_id',ID);
  p.append('client_secret',SECRET);
  p.append('redirect_uri',redirect);
  try{
    const r = await fetch('https://api.canva.com/rest/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:p});
    const d = await r.json();
    if(d.access_token) return res.send('<h1>Token OK SUCCESS</h1>');
    else return res.send('<pre>'+JSON.stringify(d,null,2)+'</pre>');
  }catch(e){ res.send(e.message); }
});

app.post(['/webhook/payhip','/api/webhook/payhip'],(req,res)=>res.json({ok:true}));
app.listen(process.env.PORT||10000);
export default app;
