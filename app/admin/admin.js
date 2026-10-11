import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, LINK_BASE } from '../config.js?v=2';

const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rows=[],filter='all';

function notice(text,error=false){
  const n=$('adminNotice');
  n.textContent=text;n.classList.add('show');
  n.style.background=error?'#fff0f0':'#f7f4ea';
  n.style.color=error?'#9b3f3f':'#6f5b23';
}
async function isAdmin(){
  const {data,error}=await sb.rpc('mktb_is_platform_admin');
  return !error&&data===true;
}
async function showAdmin(){
  $('loginView').style.display='none';
  $('adminView').style.display='block';
  await loadOverview();
}
async function loadOverview(){
  const {data,error}=await sb.rpc('mktb_admin_overview');
  if(error){
    alert('Não foi possível carregar o painel administrativo.');
    return;
  }
  $('kpiLegacy').textContent=fmt(data?.totals?.legacy_clients);
  $('kpiSaas').textContent=fmt(data?.totals?.saas_clients);
  $('kpiActive').textContent=fmt(data?.totals?.active_subscriptions);
  $('kpiTrial').textContent=fmt(data?.totals?.trialing_subscriptions);
  rows=[...(data?.legacy||[]),...(data?.saas||[])];
  render();
}
function render(){
  const q=$('clientSearch').value.trim().toLowerCase();
  const list=rows.filter(x=>{
    if(filter!=='all'&&x.type!==filter)return false;
    if(!q)return true;
    return [x.name,x.slug,x.owner_email,x.subscription_status].some(v=>String(v||'').toLowerCase().includes(q));
  });
  const el=$('clientList');
  if(!list.length){el.innerHTML='<div class="admin-empty">Nenhum cliente encontrado.</div>';return}
  el.innerHTML=list.map(client=>client.type==='legacy'?legacyCard(client):saasCard(client)).join('');
  document.querySelectorAll('[data-copy]').forEach(btn=>btn.onclick=async()=>{
    await navigator.clipboard.writeText(btn.dataset.copy);
    const old=btn.textContent;btn.textContent='Copiado';setTimeout(()=>btn.textContent=old,1100);
  });
}
function legacyCard(c){
  return '<article class="client-card">'+
    '<div class="client-name"><div class="client-icon">'+esc(c.name.charAt(0))+'</div><div><b>'+esc(c.name)+'</b><span><span class="legacy-badge">Cliente atual</span></span></div></div>'+
    '<div class="client-stat"><small>Estrutura</small><b>Link legado preservado</b></div>'+
    '<div class="client-stat"><small>Status</small><b>Ativo</b></div>'+
    '<div class="client-stat"><small>Link</small><b style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.link_url)+'</b></div>'+
    '<div class="client-actions"><button class="btn ghost" data-copy="'+esc(c.link_url)+'">Copiar link</button><a class="primary" href="'+esc(c.dashboard_url)+'" target="_blank" rel="noopener">Performance</a><a href="'+esc(c.intelligence_url)+'" target="_blank" rel="noopener">Cardápio</a></div>'+
  '</article>';
}
function saasCard(c){
  const link=LINK_BASE+c.public_code;
  const rate=Number(c.loads_30d)>0?((Number(c.redirects_30d)/Number(c.loads_30d))*100).toFixed(1)+'%':'0%';
  const status={active:'Ativo',trialing:'Avaliação',past_due:'Pendente',canceled:'Cancelado',incomplete:'Incompleto'}[c.subscription_status]||'Sem plano';
  return '<article class="client-card">'+
    '<div class="client-name"><div class="client-icon">'+esc(c.name.charAt(0))+'</div><div><b>'+esc(c.name)+'</b><span>'+esc(c.owner_email||'')+' · <span class="saas-badge">SaaS</span></span></div></div>'+
    '<div class="client-stat"><small>Visitas 30d</small><b>'+fmt(c.loads_30d)+'</b></div>'+
    '<div class="client-stat"><small>Encaminhamento</small><b>'+rate+'</b></div>'+
    '<div class="client-stat"><small>Plano / Score</small><b>'+esc(status)+' · '+(c.latest_score==null?'--':esc(c.latest_score))+'</b></div>'+
    '<div class="client-actions"><button class="btn ghost" data-copy="'+esc(link)+'">Copiar link</button>'+(c.ifood_url?'<a href="'+esc(c.ifood_url)+'" target="_blank" rel="noopener">iFood</a>':'')+'</div>'+
  '</article>';
}

$('adminLoginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;btn.textContent='Entrando...';
  try{
    const {error}=await sb.auth.signInWithPassword({email:$('adminEmail').value.trim(),password:$('adminPassword').value});
    if(error)throw error;
    if(!(await isAdmin())){
      await sb.auth.signOut();
      throw new Error('Esta conta não possui acesso administrativo.');
    }
    await showAdmin();
  }catch(err){notice(err.message||'Não foi possível entrar.',true)}
  finally{btn.disabled=false;btn.textContent='Entrar no Admin'}
});

$('adminLogout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('clientSearch').addEventListener('input',render);
document.querySelectorAll('[data-filter]').forEach(btn=>btn.onclick=()=>{
  filter=btn.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===btn));
  render();
});

const {data:{session}}=await sb.auth.getSession();
if(session&&await isAdmin()) await showAdmin();
