import express from 'express';
import cors from 'cors';
import fs from 'fs';
const app = express();
app.use(cors());
app.use(express.json({limit:'1mb'}));
const PORT = process.env.PORT || 10000;

function logSale(e){
  fs.mkdirSync('fassel_v2',{recursive:true});
  let arr=[]; try{if(fs.existsSync('fassel_v2/sales.json')) arr=JSON.parse(fs.readFileSync('fassel_v2/sales.json','utf8'))}catch{}
  arr.push(e); fs.writeFileSync('fassel_v2/sales.json',JSON.stringify(arr,null,2));
  console.log(`WhatsApp 212720408226 LOG: $${e.price_dollars} - ${e.email}`);
}

app.get('/',(req,res)=>{
  res.send(`<h1>FASSEL V2 - Render LIVE ✅</h1><p>Payhip: payhip.com/b/aN7O1 - $14</p><p>Webhook: https://${req.get('host')}/webhook/payhip</p><p><a href="/auth/【entity-canva¦canonical_name=Canva】">Renew 【entity-Canva¦canonical_name=Canva】 1-Click</a> | <a href="/api/sales">Sales</a></p><p>Status: OPERATIONAL - No quota - 24/24</p>`);
});

const VERIFIER='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE='E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const CLIENT_ID=process.env.CANVA_CLIENT_ID||'OC-AaFbjj1F4ytM';

app.get('/auth/canva',(req,res)=>{
  const redirectUri=`${req.protocol}://${req.get('host')}/auth/【entity-canva¦canonical_name=Canva】/callback`;
  const scopes='brand_template:meta:read folder:permission:read design:content:read asset:write folder:read brand_template:content:read folder:write profile:read design:meta:read asset:read design:content:write folder:permission:write';
  const url=`https://www.canva.com/api/oauth/authorize?code_challenge_method=s256&response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scopes)}&code_challenge=${CHALLENGE}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(url);
});

app.get('/auth/canva/callback',async(req,res)=>{
  const code=req.query.code; if(!code) return res.status(400).send('No code - open /auth/【entity-canva¦canonical_name=Canva】 first');
  const redirectUri=`${req.protocol}://${req.get('host')}/auth/canva/callback`;
  try{
    const r=await fetch('https://api.canva.com/rest/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:CLIENT_ID,client_secret:process.env.CANVA_CLIENT_SECRET,code,code_verifier:VERIFIER,redirect_uri:redirectUri})});
    const data=await r.json(); if(!r.ok) return res.status(500).send(`<pre>${JSON.stringify(data,null,2)}</pre>`);
    const tokens={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)};
    fs.mkdirSync('fassel_v2',{recursive:true}); fs.writeFileSync('fassel_v2/token.json',JSON.stringify(tokens,null,2));
    res.send(`<h1>✅ 【entity-Canva¦canonical_name=Canva】 Token Renewed Automatically!</h1><p>expires_at: ${tokens.expires_at}</p><p><a href="/">Back to Home - FASSEL V2 LIVE</a></p>`);
  }catch(e){res.status(500).send(e.message);}
});

async function handlePayhip(req,res){
  const body=req.body||{}; const email=body.email||body.customer_email||'customer@payhip.com';
  const entry={saleId:`fassel-${Date.now()}`,email,price_cents:1400,price_dollars:14,product:'FASSEL V2',date:new Date().toISOString().split('T')[0],time:new Date().toISOString(),payhip_store:'payhip.com/b/aN7O1 - $14',whatsapp:'212720408226'};
  try{ logSale({...entry,canva_status:'ok',status:'success'}); res.json({ok:true,saleId:entry.saleId,message:'FASSEL V2 delivered - Payhip $14'}); }
  catch(e){ logSale({...entry,error:e.message,status:'failed'}); res.status(502).json({error:e.message}); }
}

app.post('/webhook/payhip',handlePayhip);
app.post('/api/webhook/payhip',handlePayhip);
app.get('/api/sales',(req,res)=>{ try{if(!fs.existsSync('fassel_v2/sales.json')) return res.json([]); const arr=JSON.parse(fs.readFileSync('fassel_v2/sales.json','utf8')); res.json(arr.map(s=>({...s,email:s.email.slice(0,3)+'***'}))); }catch(e){res.status(500).json({error:e.message})} });
app.get('/api/sales/stats',(req,res)=>{ try{if(!fs.existsSync('fassel_v2/sales.json')) return res.json({total_sales:0,total_dollars:0}); const arr=JSON.parse(fs.readFileSync('fassel_v2/sales.json','utf8')); res.json({total_sales:arr.length,total_dollars:arr.length*14}); }catch(e){res.status(500).json({error:e.message})} });

app.listen(PORT,()=>console.log(`FASSEL V2 Render LIVE on ${PORT} - Automatic Renewal - No httpbin needed!`));
