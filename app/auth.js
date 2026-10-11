import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const notice=$('notice');

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

async function ensureRestaurant(){
  const pending=JSON.parse(localStorage.getItem('mktb_pending_restaurant')||'null');
  const {data:existing}=await sb.from('mktb_restaurants').select('id').limit(1);
  if(existing&&existing.length) return existing[0];
  if(!pending) return null;
  const {data,error}=await sb.rpc('mktb_create_restaurant',{p_name:pending.name,p_ifood_url:pending.ifood_url});
  if(error) throw error;
  localStorage.removeItem('mktb_pending_restaurant');
  return data;
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;btn.textContent='Entrando...';
  try{
    const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
    if(error) throw error;
    await ensureRestaurant();
    location.href='./dashboard.html';
  }catch(err){msg(err.message||'Não foi possível entrar.','error')}
  finally{btn.disabled=false;btn.textContent='Entrar no painel'}
});

$('signupForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;btn.textContent='Criando conta...';
  const pending={name:$('restaurantName').value.trim(),ifood_url:$('ifoodUrl').value.trim()};
  localStorage.setItem('mktb_pending_restaurant',JSON.stringify(pending));
  try{
    const {data,error}=await sb.auth.signUp({
      email:$('signupEmail').value.trim(),
      password:$('signupPassword').value,
      options:{data:{full_name:$('signupName').value.trim()}}
    });
    if(error) throw error;
    if(data.session){
      await ensureRestaurant();
      location.href='./dashboard.html';
    }else{
      msg('Conta criada. Confirme seu e-mail e depois entre no painel. O restaurante e o link serão criados automaticamente no primeiro acesso.');
      mode('login');
    }
  }catch(err){msg(err.message||'Não foi possível criar a conta.','error')}
  finally{btn.disabled=false;btn.textContent='Criar minha conta'}
});

const {data:{session}}=await sb.auth.getSession();
if(session){
  try{await ensureRestaurant()}catch{}
  location.href='./dashboard.html';
}
