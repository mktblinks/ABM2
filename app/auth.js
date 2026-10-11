import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const notice=$('notice');
let navigating=false;

function msg(text,type='info'){
  notice.textContent=text;
  notice.classList.add('show');
  notice.style.background=type==='error'?'#fff0f0':'#f7f4ea';
  notice.style.color=type==='error'?'#9b3f3f':'#6f5b23';
}
function mode(which){
  const login=which==='login';
  $('loginTab').classList.toggle('active',login);
  $('signupTab').classList.toggle('active',!login);
  $('loginForm').style.display=login?'grid':'none';
  $('signupForm').style.display=login?'none':'grid';
  $('formTitle').textContent=login?'Entrar':'Criar sua conta';
  $('formSubtitle').textContent=login?'Acesse o painel do seu restaurante.':'Seu link de performance será criado automaticamente.';
  notice.classList.remove('show');
}
$('loginTab').onclick=()=>mode('login');
$('signupTab').onclick=()=>mode('signup');

async function existingRestaurant(){
  const {data,error}=await sb.from('mktb_restaurants').select('id').order('created_at',{ascending:true}).limit(1);
  if(error) throw error;
  return data&&data.length?data[0]:null;
}
async function isPlatformAdmin(){
  try{
    const {data,error}=await sb.rpc('mktb_is_platform_admin');
    return !error&&data===true;
  }catch{return false}
}
async function ensureRestaurant(){
  const existing=await existingRestaurant();
  if(existing)return existing;

  const pending=JSON.parse(localStorage.getItem('mktb_pending_restaurant')||'null');
  if(!pending)return null;

  const {data,error}=await sb.rpc('mktb_create_restaurant',{
    p_name:pending.name,
    p_ifood_url:pending.ifood_url
  });
  if(error) throw error;
  localStorage.removeItem('mktb_pending_restaurant');
  return data;
}
async function refreshSubscription(restaurantId){
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return null;

  const {data:sub}=await sb.from('mktb_subscriptions').select('*').eq('restaurant_id',restaurantId).maybeSingle();
  if(!sub)return null;

  if(sub.provider_subscription_id){
    try{
      const r=await fetch(SUPABASE_URL+'/functions/v1/mktb-billing-sync',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_KEY},
        body:JSON.stringify({restaurant_id:restaurantId})
      });
      if(r.ok){
        const j=await r.json();
        return j.subscription||sub;
      }
    }catch{}
  }
  return sub;
}
async function routeAuthenticatedUser(){
  if(navigating)return;

  if(await isPlatformAdmin()){
    navigating=true;
    location.replace('./admin/');
    return;
  }

  const restaurant=await ensureRestaurant();
  if(restaurant){
    const sub=await refreshSubscription(restaurant.id);
    navigating=true;
    location.replace(sub?.status==='active'?'./dashboard.html':'./payment.html');
    return;
  }

  await sb.auth.signOut();
  msg('Esta conta ainda não possui um restaurante vinculado. Crie uma conta do restaurante para continuar.','error');
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;btn.textContent='Entrando...';
  try{
    const {error}=await sb.auth.signInWithPassword({
      email:$('loginEmail').value.trim(),
      password:$('loginPassword').value
    });
    if(error)throw error;
    await routeAuthenticatedUser();
  }catch(err){
    msg(err.message||'Não foi possível entrar.','error');
    try{await sb.auth.signOut()}catch{}
  }finally{
    if(!navigating){btn.disabled=false;btn.textContent='Entrar no painel'}
  }
});

$('signupForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;btn.textContent='Criando conta...';
  const pending={
    name:$('restaurantName').value.trim(),
    ifood_url:$('ifoodUrl').value.trim()
  };
  localStorage.setItem('mktb_pending_restaurant',JSON.stringify(pending));

  try{
    const {data,error}=await sb.auth.signUp({
      email:$('signupEmail').value.trim(),
      password:$('signupPassword').value,
      options:{data:{full_name:$('signupName').value.trim()}}
    });
    if(error)throw error;

    if(data.session){
      await routeAuthenticatedUser();
    }else{
      mode('login');
      msg('Conta criada. Confirme seu e-mail. No primeiro acesso você será direcionado ao pagamento e o Dashboard será liberado somente após a aprovação.');
    }
  }catch(err){
    msg(err.message||'Não foi possível criar a conta.','error');
  }finally{
    if(!navigating){btn.disabled=false;btn.textContent='Criar minha conta'}
  }
});

const params=new URLSearchParams(location.search);
if(params.get('error')==='no_restaurant'){
  msg('Esta conta não possui um restaurante vinculado. Entre com a conta correta ou crie um novo restaurante.','error');
}

const {data:{session}}=await sb.auth.getSession();
if(session){
  try{
    await routeAuthenticatedUser();
  }catch(err){
    await sb.auth.signOut();
    msg('Sua sessão foi encerrada para evitar um erro de acesso. Entre novamente.','error');
  }
}
