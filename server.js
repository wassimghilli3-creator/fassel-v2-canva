import express from 'express';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.json());
const ID = process.env.CANVA_CLIENT_ID || 'OC-AaFbjj1F4ytM';
const SECRET = process.env.CANVA_CLIENT_SECRET || '';
const VER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHAL = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

app.get('/',(req,res)=>res.send('<h1>FASSEL V2 OK</h1><a href="/a/c">renew</a>'));
app.get('/health',(req,res)=>res.json({ok:true}));

function getBase(req){
  const h = req.headers['x-forwarded-host'] || req.headers.host;
  return 'https://'+h;
}

app.get('/a/c',(req,res)=>{
  const base = getBase(req);
  const redirect = base + '/a/c/callback';
  const scope = 'design:content:read design:content:write';
  const url = 'https://www.canva.com/api/oauth/authorize?code_challenge='+CHAL+'&code_challenge_method=S256&scope='+encodeURIComponent(scope)+'&response_type=code&client_id='+ID+'&redirect_uri='+encodeURIComponent(redirect);
  res.redirect(url);
});

app.get('/a/c/callback', async (req,res)=>{
  const code = req.query.code;
  if(!code) return res.send('<pre>'+JSON.stringify(req.query,null,2)+'</pre>');
  const base = getBase(req);
  const redirect = base + '/a/c/callback';
  const p = new URLSearchParams();
  p.append('grant_type','authorization_code');
  p.append('code',code);
  p.append('code_verifier',VER);
  p.append('client_id',ID);
  p.append('client_secret',SECRET);
  p.append('redirect_uri',redirect);
  const eps = [
    'https://api.canva.com/rest/oauth/token',
    'https://api.canva.com/oauth/token',
    'https://www.canva.com/api/oauth/token'
  ];
  let last = null;
  for(const ep of eps){
    try{
      const r = await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:p});
      const d = await r.json();
      if(d.access_token){
        return res.send('<h1>Token SUCCESS via '+ep+'</h1>');
      } else last = d;
    }catch(e){ last = e.message; }
  }
  res.send('<pre>'+JSON.stringify(last,null,2)+'</pre>');
});

app.post(['/webhook/payhip','/api/webhook/payhip'],(req,res)=>res.json({ok:true}));
app.listen(process.env.PORT||10000);
export default app;
