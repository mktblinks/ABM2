import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
let restaurant=null,subscription=null,selectedPlan='monthly',checking=false;

const {data:{session}}=await sb.auth.getSession();
if(!session){location.replace('./');throw new Error('not_authenticated')}

async function isAdmin(){
  try{
    const {data}=await sb.rpc('mktb_is_platform_admin');
    return data===true;
  }catch{return false}
}
if(await isAdmin()){location.replace('./admin/');throw new Error('admin_routing')}

const {data:restaurants,error:rerr}=await sb.from('mktb_restaurants').select('*').order('created_at',{ascending:true}).limit(1);
if(rerr||!restaurants?.length){
  await sb.auth.signOut();
  location.replace('./?error=no_restaurant');
  throw new Error('restaurant_not_found');
}
restaurant=restaurants[0];

async function loadSubscription(){
  const {data,error}=await sb.from('mktb_subscriptions').select('*').eq('restaurant_id',restaurant.id).maybeSingle();
  if(error)throw error;
  subscription=data;
  if(subscription?.status==='active'){
    location.replace('./dashboard.html');
    return false;
  }
  if(subscription?.plan_code==='annual')selectedPlan='annual';
  else selectedPlan='monthly';
  updatePlanUI();
  return true;
}
function updatePlanUI(){
  document.querySelectorAll('[data-plan]').forEach(btn=>btn.classList.toggle('active',btn.dataset.plan===selectedPlan));
  if(selectedPlan==='annual'){
    $('billingLabel').textContent='Cobrança anual';
    $('billingTotal').textContent='R$ 1.678,80';
  }else{
    $('billingLabel').textContent='Cobrança mensal';
    $('billingTotal').textContent='R$ 149,90';
  }
}
function status(text,type=''){
  const el=$('paymentStatus');
  el.textContent=text;
  el.className='paywall-status show'+(type?' '+type:'');
}
async function syncPayment({silent=false}={}){
  if(checking)return false;
  checking=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(SUPABASE_URL+'/functions/v1/mktb-billing-sync',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+session.access_token,
        'apikey':SUPABASE_KEY
      },
      body:JSON.stringify({restaurant_id:restaurant.id})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok){
      if(!silent){
        if(j.error==='billing_not_configured')status('A cobrança ainda não foi conectada. Entre em contato com a MKTB.','bad');
        else status('Não foi possível consultar o pagamento agora. Tente novamente em alguns instantes.','bad');
      }
      return false;
    }
    subscription=j.subscription||subscription;
    if(j.status==='active'){
      status('Pagamento aprovado. Liberando seu Dashboard...','ok');
      setTimeout(()=>location.replace('./dashboard.html'),700);
      return true;
    }
    if(!silent){
      const map={
        incomplete:'Pagamento ainda não confirmado. Se você acabou de pagar, aguarde alguns segundos e verifique novamente.',
        past_due:'O pagamento não foi aprovado. Regularize a cobrança para liberar o Dashboard.',
        canceled:'A assinatura está cancelada. Escolha um plano para reativar o acesso.'
      };
      status(map[j.status]||'Aguardando confirmação do pagamento.');
    }
    return false;
  }catch{
    if(!silent)status('Não foi possível consultar o pagamento agora.','bad');
    return false;
  }finally{checking=false}
}

document.querySelectorAll('[data-plan]').forEach(btn=>btn.onclick=()=>{
  selectedPlan=btn.dataset.plan;
  updatePlanUI();
});

$('payBtn').onclick=async()=>{
  const btn=$('payBtn'),old=btn.textContent;
  btn.disabled=true;btn.textContent='Abrindo pagamento...';
  try{
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(SUPABASE_URL+'/functions/v1/mktb-billing-checkout',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+session.access_token,
        'apikey':SUPABASE_KEY
      },
      body:JSON.stringify({restaurant_id:restaurant.id,plan_code:selectedPlan})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok){
      if(j.error==='billing_not_configured'){status('A conta Mercado Pago da MKTB ainda não foi conectada.','bad');return}
      throw new Error(j.detail||j.error||'checkout_failed');
    }
    location.href=j.checkout_url;
  }catch{
    status('Não foi possível abrir o pagamento. Tente novamente.','bad');
  }finally{
    btn.disabled=false;btn.textContent=old;
  }
};

$('checkPaymentBtn').onclick=async()=>{
  const btn=$('checkPaymentBtn'),old=btn.textContent;
  btn.disabled=true;btn.textContent='Verificando...';
  await syncPayment();
  btn.disabled=false;btn.textContent=old;
};

$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.replace('./')};

await loadSubscription();

const returned=new URLSearchParams(location.search).get('return')==='1';
if(returned){
  status('Pagamento recebido. Confirmando a aprovação com o Mercado Pago...');
  for(let i=0;i<12;i++){
    if(await syncPayment({silent:i>0}))break;
    await new Promise(r=>setTimeout(r,5000));
  }
}else if(subscription?.provider_subscription_id){
  await syncPayment({silent:true});
}
