import express from 'express';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.json());
const CLIENT_ID = process.env.CANVA_CLIENT_ID || 'OC-AaFbjj1F4ytM';
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET || '';
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

app.get('/',(req,res)=>res.send('<h1>FASSEL V2 OK</h1><a href="/auth/【entity-canva¦canonical_name=Canva】">renew</a>'));
app.get('/health',(req,res)=>res.json({ok:true}));

app.get('/auth/【entity-canva¦canonical_name=Canva】',(req,res)=>{
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = 'https://'+host;
  const redirect = base+'/auth/【entity-canva¦canonical_name=Canva】/callback';
  const scope = 'design:content:read design:content:write';
  const url = 'https://www.canva.com/api/oauth/authorize?code_challenge='+CHALLENGE+'&code_challenge_method=S256&scope='+encodeURIComponent(scope)+'&response_type=code&client_id='+CLIENT_ID+'&redirect_uri='+encodeURIComponent(redirect);
  res.redirect(url);
});

app.get('/auth/canva/callback', async (req,res)=>{
  const code = req.query.code;
  if(!code) return res.send('<pre>'+JSON.stringify(req.query,null,2)+'</pre><a href="/auth/canva">retry</a>');
  try{
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const base = 'https://'+host;
    const redirect = base+'/auth/canva/callback';
    const p = new URLSearchParams();
    p.append('grant_type','authorization_code');
    p.append('code',code);
    p.append('code_verifier',VERIFIER);
    p.append('client_id',CLIENT_ID);
    p.append('client_secret',CLIENT_SECRET);
    p.append('redirect_uri',redirect);
    
    // جرب 3 endpoints - Canva بدل API
    const endpoints = [
      'https://api.canva.com/rest/oauth/token',
      'https://api.canva.com/oauth/token',
      'https://www.canva.com/api/oauth/token'
    ];
    
    let lastError = null;
    for(const endpoint of endpoints){
      try{
        const r = await fetch(endpoint,{
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:p
        });
        const d = await r.json();
        if(d.access_token){
          return res.send('<h1>Token Renewed SUCCESS via '+endpoint+'</h1><p>expires_in: '+d.expires_in+'</p><a href="/">home</a>');
        } else {
          lastError = d;
        }
      }catch(e){
        lastError = e.message;
      }
    }
    return res.send('<h1>All endpoints failed</h1><pre>'+JSON.stringify(lastError,null,2)+'</pre><p>Tried: '+endpoints.join(', ')+'</p>');
  }catch(e){ res.send('Error: '+e.message); }
});

app.post(['/webhook/payhip','/api/webhook/payhip'],(req,res)=>res.json({ok:true}));
app.listen(process.env.PORT||10000);
export default app;
