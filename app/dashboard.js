import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, LINK_BASE } from './config.js';

const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const money=n=>n==null?'--':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const {data:{session}}=await sb.auth.getSession();
if(!session){location.href='./';throw new Error('not_authenticated')}
$('sideEmail').textContent=session.user.email||'';

let restaurant=null,subscription=null,settings=null,audit=null,publicLink='';

async function ensureRestaurant(){
  const {data,error}=await sb.from('mktb_restaurants').select('*').order('created_at',{ascending:true}).limit(1);
  if(error) throw error;
  if(data&&data.length){restaurant=data[0];return}
  const pending=JSON.parse(localStorage.getItem('mktb_pending_restaurant')||'null');
  if(pending){
    const {data:r,error:e}=await sb.rpc('mktb_create_restaurant',{p_name:pending.name,p_ifood_url:pending.ifood_url});
    if(e) throw e;
    restaurant=r;localStorage.removeItem('mktb_pending_restaurant');return;
  }
  location.href='./';
}
await ensureRestaurant();

publicLink=LINK_BASE+restaurant.public_code;
$('restaurantName').textContent=restaurant.name;
$('sideRestaurant').textContent=restaurant.name;
$('avatar').textContent=(restaurant.name||'M').trim().charAt(0).toUpperCase();
$('mainLink').textContent=publicLink;
$('overviewLink').textContent=publicLink;
$('ifoodUrlInput').value=restaurant.ifood_url||'';

async function loadSubscription(){
  const {data}=await sb.from('mktb_subscriptions').select('*').eq('restaurant_id',restaurant.id).maybeSingle();
  subscription=data||null;
  const labels={trialing:'Avaliação',active:'Ativo',past_due:'Pagamento pendente',canceled:'Cancelado',incomplete:'Incompleto'};
  const label=labels[subscription?.status]||'Avaliação';
  $('subscriptionBadge').textContent='Plano '+label;
  $('planStatus').textContent=label;
}
async function loadSettings(){
  const {data}=await sb.from('mktb_restaurant_settings').select('*').eq('restaurant_id',restaurant.id).maybeSingle();
  settings=data||{};
  $('pixelInput').value=settings.meta_pixel_id||'';
  $('pixelStatus').textContent=settings.meta_pixel_id?'Conectado':'Não configurado';
}
async function loadMetrics(){
  const from=new Date(Date.now()-30*86400000).toISOString();
  const {data,error}=await sb.rpc('mktb_dashboard_summary',{p_restaurant_id:restaurant.id,p_from:from,p_to:new Date().toISOString()});
  if(error) return;
  $('mLoads').textContent=fmt(data.loads);
  $('mRedirects').textContent=fmt(data.redirects);
  $('mRate').textContent=Number(data.rate||0).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
  $('mCampaigns').textContent=fmt(data.campaigns);
  renderBreakdown('sourcesTable',data.sources||[],'source');
  renderBreakdown('devicesTable',data.devices||[],'device');
}
function renderBreakdown(id,rows,key){
  const el=$(id);
  if(!rows.length){el.innerHTML='<div class="empty">Ainda não há dados suficientes.</div>';return}
  const total=rows.reduce((s,x)=>s+Number(x.count||0),0);
  el.innerHTML='<div class="tr head"><span>Origem</span><span>Volume</span><span>Participação</span></div>'+
    rows.map(x=>'<div class="tr"><span>'+esc(x[key]||'Outros')+'</span><span>'+fmt(x.count)+'</span><span>'+(total?((Number(x.count)/total)*100).toFixed(1):'0')+'%</span></div>').join('');
}
async function loadAudit(){
  const {data}=await sb.from('mktb_saas_menu_audits').select('*').eq('restaurant_id',restaurant.id).order('captured_at',{ascending:false}).limit(1).maybeSingle();
  audit=data||null;
  if(!audit){
    $('heroScore').textContent='--';
    $('menuScore').textContent='--';
    $('nextAction').textContent='A primeira análise do cardápio ainda não foi gerada.';
    $('scoreGrid').innerHTML='<div class="empty" style="grid-column:1/-1">Aguardando a primeira análise do cardápio.</div>';
    $('findingsBox').innerHTML='<div class="empty">Quando a análise estiver pronta, os erros e as correções aparecem aqui.</div>';
    return;
  }
  const vals=[audit.score_photos,audit.score_structure,audit.score_price,audit.score_descriptions,audit.score_upsell,audit.score_availability].filter(v=>v!=null);
  const score=audit.score_total??(vals.length?Math.round(vals.reduce((a,b)=>a+Number(b),0)/vals.length):null);
  $('heroScore').textContent=score==null?'--':score;
  $('menuScore').textContent=score==null?'--':score;
  const findings=audit.findings||[];
  $('nextAction').textContent=findings[0]?.how_to_fix||findings[0]?.detail||'Acompanhe as recomendações da análise.';
  const scores=[['Fotos',audit.score_photos],['Estrutura',audit.score_structure],['Preço',audit.score_price],['Descrições',audit.score_descriptions],['Upsell',audit.score_upsell],['Disponibilidade',audit.score_availability]];
  $('scoreGrid').innerHTML=scores.map(([name,value])=>'<div class="scoreitem"><span>'+name+'</span><b>'+(value==null?'--':value)+'</b></div>').join('');
  $('findingsBox').innerHTML=findings.length?findings.slice(0,8).map(f=>'<div style="border:1px solid #ece7dc;border-radius:15px;padding:16px;margin-top:10px"><div style="display:flex;justify-content:space-between;gap:12px"><b>'+esc(f.title)+'</b><span class="pill">'+esc(f.priority||'média')+'</span></div><p style="margin:8px 0 0;color:#777;font-size:12px;line-height:1.5">'+esc(f.detail||'')+'</p>'+(f.how_to_fix?'<div style="margin-top:11px;background:#f7f4ea;border-radius:11px;padding:12px;font-size:12px"><b>O que fazer:</b> '+esc(f.how_to_fix)+'</div>':'')+'</div>').join(''):'<div class="empty">Nenhum problema importante registrado.</div>';
}

document.querySelectorAll('.nav button[data-section]').forEach(btn=>btn.onclick=()=>openSection(btn.dataset.section));
document.querySelectorAll('[data-section-go]').forEach(btn=>btn.onclick=()=>openSection(btn.dataset.sectionGo));
function openSection(id){
  document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===id));
  document.querySelectorAll('.nav button[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===id));
  scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-copy-link]').forEach(btn=>btn.onclick=async()=>{
  await navigator.clipboard.writeText(publicLink);
  const old=btn.textContent;btn.textContent='Copiado';setTimeout(()=>btn.textContent=old,1300);
});

$('saveIfoodUrl').onclick=async()=>{
  const url=$('ifoodUrlInput').value.trim();
  if(!/^https:\/\/(www\.)?ifood\.com\.br\//i.test(url)){alert('Cole uma URL válida do iFood.');return}
  const merchant=(url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)||[])[0]||null;
  const {error}=await sb.from('mktb_restaurants').update({ifood_url:url,merchant_id:merchant,updated_at:new Date().toISOString(),onboarding_completed:true}).eq('id',restaurant.id);
  if(error){alert('Não foi possível salvar.');return}
  restaurant.ifood_url=url;restaurant.merchant_id=merchant;alert('URL do iFood atualizada.');
};

$('savePixel').onclick=async()=>{
  const v=$('pixelInput').value.trim();
  if(v&&!/^\d{5,30}$/.test(v)){alert('Digite apenas o ID numérico do Pixel.');return}
  const {error}=await sb.from('mktb_restaurant_settings').update({meta_pixel_id:v||null,updated_at:new Date().toISOString()}).eq('restaurant_id',restaurant.id);
  if(error){alert('Não foi possível salvar o Pixel.');return}
  $('pixelStatus').textContent=v?'Conectado':'Não configurado';
  alert('Pixel atualizado.');
};

$('subscribeBtn').onclick=()=>{
  alert('A área de checkout já está preparada no painel. Falta apenas conectar a conta de cobrança e definir o valor do plano.');
};
$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.href='./'};

await Promise.all([loadSubscription(),loadSettings(),loadMetrics(),loadAudit()]);
