import express from 'express';
import cors from 'cors';
const app=express();
app.use(cors());
app.use(express.json());
const ID=process.env.CANVA_CLIENT_ID||'OC-AaFbjj1F4ytM';
const SECRET=process.env.CANVA_CLIENT_SECRET||'';
const VER='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHAL='E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const TOKEN_URL='https://api.canva.com/rest/v1/oauth/token';
let store={access_token:null,refresh_token:process.env.CANVA_REFRESH_TOKEN||null,expires_at:0,sales:[],visits:{}};
function getBase(req){const h=req.headers['x-forwarded-host']||req.headers.host;return 'https://'+h;}
async function getValidToken(){if(!store.refresh_token)return store.access_token;if(Date.now()<store.expires_at-60000)return store.access_token;try{const p=new URLSearchParams();p.append('grant_type','refresh_token');p.append('refresh_token',store.refresh_token);p.append('client_id',ID);p.append('client_secret',SECRET);const r=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:p.toString()});const d=await r.json();if(d.access_token){store.access_token=d.access_token;if(d.refresh_token)store.refresh_token=d.refresh_token;store.expires_at=Date.now()+(d.expires_in*1000);return store.access_token;}}catch(e){}return store.access_token;}
app.get('/',(req,res)=>{res.send('<h1>FASSEL V2 OK</h1><p><a href="/a/c">Renew</a> | <a href="/health">Health</a></p>');});
app.get('/health',(req,res)=>{res.json({ok:true,token:!!store.access_token});});
app.get('/a/c',(req,res)=>{const redirect=getBase(req)+'/a/c/callback';const scope='design:content:read design:content:write asset:read asset:write profile:read';const url='https://www.canva.com/api/oauth/authorize?code_challenge='+CHAL+'&code_challenge_method=S256&scope='+encodeURIComponent(scope)+'&response_type=code&client_id='+ID+'&redirect_uri='+encodeURIComponent(redirect);res.redirect(url);});
app.get('/a/c/callback',async(req,res)=>{const code=req.query.code;if(!code)return res.status(400).send('No code');const redirect=getBase(req)+'/a/c/callback';const p=new URLSearchParams();p.append('grant_type','authorization_code');p.append('code',code);p.append('code_verifier',VER);p.append('client_id',ID);p.append('client_secret',SECRET);p.append('redirect_uri',redirect);try{const r=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:p.toString()});const d=await r.json();if(d.access_token){store.access_token=d.access_token;store.refresh_token=d.refresh_token;store.expires_at=Date.now()+(d.expires_in*1000);return res.send('<h1>SUCCESS!</h1><code>'+d.refresh_token+'</code><br><a href="/">Home</a>');}else{return res.send('<pre>'+JSON.stringify(d,null,2)+'</pre>');}}catch(e){res.send('Error:'+e.message);}});
app.get('/api/track/pixel',(req,res)=>{const prod=req.query.product||'unknown';store.visits[prod]=(store.visits[prod]||0)+1;res.setHeader('Content-Type','image/gif');res.send(Buffer.from('[STRIPPED 56 bytes]','base64'));});
app.get('/api/visits',(req,res)=>{res.json(store.visits);});
app.get('/api/sales',(req,res)=>{res.json(store.sales);});
app.post(['/webhook/payhip','/api/webhook/payhip'],async(req,res)=>{try{await getValidToken();const data=req.body;const sale={id:Date.now(),date:new Date().toISOString(),product:data.product||'FASSEL_V2',email:data.email||'unknown',price:data.price||14};store.sales.push(sale);res.json({ok:true});}catch(e){res.json({ok:true});}});
app.listen(process.env.PORT||10000);
export default app;
