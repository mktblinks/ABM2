import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, LINK_BASE } from './config.js?v=2';

const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
const pct=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const money=n=>n==null?'--':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLORS=['#b77d16','#e0af4e','#111214','#df2b74','#24aa68','#5c7ce5','#c8cbd1','#e4934d'];

const {data:{session}}=await sb.auth.getSession();
if(!session){location.href='./';throw new Error('not_authenticated')}

let restaurant=null,subscription=null,settings=null,audit=null,plans={},selectedPlan='monthly',publicLink='';
let summary={loads:0,redirects:0,rate:0,campaigns:0,sources:[],devices:[]};
let events=[];

async function ensureRestaurant(){
  const {data,error}=await sb.from('mktb_restaurants').select('*').order('created_at',{ascending:true}).limit(1);
  if(error) throw error;
  if(data&&data.length){restaurant=data[0];return true}

  const pending=JSON.parse(localStorage.getItem('mktb_pending_restaurant')||'null');
  if(pending){
    const {data:r,error:e}=await sb.rpc('mktb_create_restaurant',{p_name:pending.name,p_ifood_url:pending.ifood_url});
    if(e) throw e;
    restaurant=r;
    localStorage.removeItem('mktb_pending_restaurant');
    return true;
  }

  try{
    const {data:isAdmin}=await sb.rpc('mktb_is_platform_admin');
    if(isAdmin===true){
      location.replace('./admin/');
      return false;
    }
  }catch{}

  await sb.auth.signOut();
  location.replace('./?error=no_restaurant');
  return false;
}
if(!(await ensureRestaurant())) throw new Error('routing');

async function enforcePaidAccess(){
  const {data:sub}=await sb.from('mktb_subscriptions').select('*').eq('restaurant_id',restaurant.id).maybeSingle();
  let current=sub||null;

  if(current?.provider_subscription_id){
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
      if(r.ok){
        const j=await r.json();
        current=j.subscription||current;
      }
    }catch{}
  }

  subscription=current;
  if(current?.status!=='active'){
    location.replace('./payment.html');
    return false;
  }
  return true;
}
if(!(await enforcePaidAccess())) throw new Error('payment_required');

publicLink=LINK_BASE+restaurant.public_code;
$('sideEmail').textContent=session.user.email||'';
$('sideRestaurant').textContent=restaurant.name;
$('restaurantName').textContent=restaurant.name;
$('avatar').textContent=(restaurant.name||'M').trim().charAt(0).toUpperCase();
$('mainLink').textContent=publicLink;
$('overviewLink').textContent=publicLink;
$('ifoodUrlInput').value=restaurant.ifood_url||'';
$('settingsIfoodUrlInput').value=restaurant.ifood_url||'';

async function loadPlan(){
  const {data}=await sb.from('mktb_plans').select('*').in('code',['monthly','annual']).eq('active',true);
  plans=Object.fromEntries((data||[]).map(x=>[x.code,x]));
  updateSelectedPlanUI();
}
function updateSelectedPlanUI(){
  document.querySelectorAll('[data-plan-choice]').forEach(btn=>btn.classList.toggle('active',btn.dataset.planChoice===selectedPlan));
  if(selectedPlan==='annual'){
    $('planPrice').textContent='R$ 139,90/mês';
    $('planBillingHint').textContent='R$ 1.678,80 cobrados por ano';
  }else{
    $('planPrice').textContent='R$ 149,90/mês';
    $('planBillingHint').textContent='Cobrança mensal';
  }
}
async function loadSubscription(){
  const {data}=await sb.from('mktb_subscriptions').select('*').eq('restaurant_id',restaurant.id).maybeSingle();
  subscription=data||null;
  const labels={trialing:'Avaliação',active:'Ativo',past_due:'Pagamento pendente',canceled:'Cancelado',incomplete:'Incompleto'};
  const label=labels[subscription?.status]||'Avaliação';
  $('subscriptionBadge').textContent=label;
  $('planStatus').textContent=label;
  $('overviewPlan').textContent='AVORI';
  if(subscription?.plan_code==='annual')selectedPlan='annual';
  if(subscription?.plan_code==='monthly')selectedPlan='monthly';
  updateSelectedPlanUI();
}
async function loadSettings(){
  const {data}=await sb.from('mktb_restaurant_settings').select('*').eq('restaurant_id',restaurant.id).maybeSingle();
  settings=data||{};
  $('pixelInput').value=settings.meta_pixel_id||'';
  $('pixelStatus').textContent=settings.meta_pixel_id?'Conectado':'Não configurado';
}
async function loadMetrics(){
  const from=new Date(Date.now()-30*86400000).toISOString();
  const to=new Date().toISOString();
  const [{data:s,error},{data:e}]=await Promise.all([
    sb.rpc('mktb_dashboard_summary',{p_restaurant_id:restaurant.id,p_from:from,p_to:to}),
    sb.from('mktb_tracking_events').select('event_type,source,device,campaign,occurred_at').eq('restaurant_id',restaurant.id).gte('occurred_at',from).lte('occurred_at',to).order('occurred_at',{ascending:true}).limit(10000)
  ]);
  if(!error&&s) summary=s;
  events=e||[];
  renderMetrics();
  renderPerformance();
}
function renderMetrics(){
  $('mLoads').textContent=fmt(summary.loads);
  $('mRedirects').textContent=fmt(summary.redirects);
  $('mRate').textContent=pct(summary.rate);
  $('mCampaigns').textContent=fmt(summary.campaigns);
  $('overviewHeroRate').textContent=pct(summary.rate);

  $('pLoads').textContent=fmt(summary.loads);
  $('pRedirects').textContent=fmt(summary.redirects);
  $('pRate').textContent=pct(summary.rate);
  $('pCampaignTraffic').textContent=fmt(events.filter(x=>x.event_type==='campaign').length);

  renderDonut('overviewSources',summary.sources||[],'source','visitas');
  renderDonut('performanceSources',summary.sources||[],'source','visitas');
  renderDonut('audienceSources',summary.sources||[],'source','visitas');
  renderDonut('overviewDevices',summary.devices||[],'device','visitas');
  renderDonut('performanceDevices',summary.devices||[],'device','visitas');
  renderDonut('audienceDevices',summary.devices||[],'device','visitas');

  renderCampaignTable('campaignPerformance');
  renderCampaignTable('campaignsFull');
}
function renderDonut(id,rows,key,label){
  const el=$(id);if(!el)return;
  const data=(rows||[]).slice(0,6);
  if(!data.length){el.innerHTML='<div class="feature-empty"><b>Ainda sem dados suficientes</b><p>As informações aparecem aqui conforme o link começar a receber acessos.</p></div>';return}
  const total=data.reduce((s,x)=>s+Number(x.count||0),0)||1;
  let acc=0,segments=[];
  data.forEach((x,i)=>{const v=Number(x.count||0)/total*100;segments.push(COLORS[i%COLORS.length]+' '+acc+'% '+(acc+v)+'%');acc+=v});
  el.innerHTML='<div class="donut-layout"><div class="donut" style="background:conic-gradient('+segments.join(',')+')"><div class="donut-center"><div><b>'+fmt(total)+'</b><span>'+esc(label)+'</span></div></div></div><div class="legend">'+data.map((x,i)=>'<div class="legend-row"><span class="legend-dot" style="background:'+COLORS[i%COLORS.length]+'"></span><b>'+esc(pretty(x[key]))+'</b><span>'+((Number(x.count||0)/total)*100).toFixed(1).replace('.',',')+'% · '+fmt(x.count)+'</span></div>').join('')+'</div></div>';
}
function pretty(v){
  const map={direct:'Direto',meta:'Meta',instagram:'Instagram',facebook:'Facebook',google:'Google',tiktok:'TikTok',ios:'iPhone / iOS',android:'Android',desktop:'Desktop',unknown:'Outros'};
  return map[String(v||'').toLowerCase()]||String(v||'Outros');
}
function campaignRows(){
  const map=new Map();
  for(const e of events){
    if(!e.campaign)continue;
    const k=e.campaign;
    if(!map.has(k))map.set(k,{campaign:k,loads:0,redirects:0});
    const x=map.get(k);
    if(e.event_type==='load')x.loads++;
    if(e.event_type==='redirect')x.redirects++;
  }
  return [...map.values()].sort((a,b)=>b.loads-a.loads);
}
function renderCampaignTable(id){
  const el=$(id);if(!el)return;
  const rows=campaignRows();
  if(!rows.length){el.innerHTML='<div class="feature-empty"><b>Nenhuma campanha identificada</b><p>Use parâmetros UTM nos anúncios para que a AVORI organize o desempenho por campanha.</p></div>';return}
  el.innerHTML='<table class="campaign-table"><thead><tr><th>Campanha</th><th>Visitas</th><th>Cliques</th><th>Taxa</th></tr></thead><tbody>'+rows.slice(0,8).map(x=>'<tr><td><b>'+esc(x.campaign)+'</b></td><td>'+fmt(x.loads)+'</td><td>'+fmt(x.redirects)+'</td><td>'+pct(x.loads?x.redirects/x.loads*100:0)+'</td></tr>').join('')+'</tbody></table>';
}
function localDateParts(date){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const o={};parts.forEach(p=>o[p.type]=p.value);
  return o;
}
function dailySeries(){
  const days=[];
  for(let i=29;i>=0;i--){
    const d=new Date(Date.now()-i*86400000),p=localDateParts(d);
    days.push({key:p.year+'-'+p.month+'-'+p.day,label:p.day+'/'+p.month,loads:0,redirects:0});
  }
  const map=new Map(days.map(x=>[x.key,x]));
  for(const e of events){
    const p=localDateParts(new Date(e.occurred_at)),x=map.get(p.year+'-'+p.month+'-'+p.day);
    if(!x)continue;
    if(e.event_type==='load')x.loads++;
    if(e.event_type==='redirect')x.redirects++;
  }
  return days;
}
function renderPerformance(){
  renderTrafficChart();
  renderHeatmap();
}
function linePath(values,w,h,pad){
  const max=Math.max(1,...values);
  return values.map((v,i)=>{
    const x=pad+(i/(Math.max(1,values.length-1)))*(w-pad*2);
    const y=h-pad-(v/max)*(h-pad*2);
    return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);
  }).join(' ');
}
function renderTrafficChart(){
  const el=$('trafficChart');if(!el)return;
  const d=dailySeries();
  const has=d.some(x=>x.loads||x.redirects);
  if(!has){el.innerHTML='<div class="empty-chart">O gráfico aparecerá conforme o link receber visitas.</div>';return}
  const w=760,h=235,pad=26;
  const a=d.map(x=>x.loads),b=d.map(x=>x.redirects);
  const pathA=linePath(a,w,h,pad),pathB=linePath(b,w,h,pad);
  const area=pathA+' L '+(w-pad)+' '+(h-pad)+' L '+pad+' '+(h-pad)+' Z';
  const labels=d.filter((_,i)=>i%5===0||i===29).map((x,i)=>({x:pad+((d.indexOf(x))/(d.length-1))*(w-pad*2),label:x.label}));
  el.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><defs><linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d1a04a" stop-opacity=".25"/><stop offset="100%" stop-color="#d1a04a" stop-opacity=".02"/></linearGradient></defs><g class="chart-grid">'+[1,2,3,4].map(i=>'<line x1="'+pad+'" x2="'+(w-pad)+'" y1="'+(pad+i*(h-pad*2)/5)+'" y2="'+(pad+i*(h-pad*2)/5)+'"/>').join('')+'</g><path class="area-a" d="'+area+'"/><path class="line-a" d="'+pathA+'"/><path class="line-b" d="'+pathB+'"/>'+labels.map(x=>'<text class="chart-axis" x="'+x.x+'" y="'+(h-6)+'" text-anchor="middle">'+x.label+'</text>').join('')+'</svg>';
}
function renderHeatmap(){
  const heat=$('heatmap');if(!heat)return;
  const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const labels=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const buckets=[0,3,6,9,12,15,18,21];
  const counts=Array.from({length:7},()=>Array(8).fill(0));
  for(const e of events.filter(x=>x.event_type==='redirect')){
    const p=localDateParts(new Date(e.occurred_at));
    const wi=weekdays.indexOf(p.weekday),hour=Number(p.hour),bi=Math.min(7,Math.floor(hour/3));
    if(wi>=0)counts[wi][bi]++;
  }
  const max=Math.max(1,...counts.flat());
  let html='<span></span>'+buckets.map(x=>'<span class="heat-label">'+String(x).padStart(2,'0')+'h</span>').join('');
  counts.forEach((row,ri)=>{
    html+='<span class="heat-label">'+labels[ri]+'</span>';
    row.forEach(v=>{const alpha=.08+.84*(v/max);html+='<span class="heat-cell" style="background:rgba(174,113,12,'+alpha.toFixed(2)+')"></span>'});
  });
  heat.innerHTML=html;
  let best={v:0,ri:0,bi:0};
  counts.forEach((row,ri)=>row.forEach((v,bi)=>{if(v>best.v)best={v,ri,bi}}));
  if(best.v){
    const start=buckets[best.bi],end=(start+3)%24;
    const label=String(start).padStart(2,'0')+'h às '+String(end).padStart(2,'0')+'h';
    $('bestTimeLabel').textContent=label;$('bestTimeHero').textContent=label;
    $('bestTimeDescription').textContent='É a janela com maior volume de encaminhamentos para o iFood nos últimos 30 dias.';
  }else{
    $('bestTimeLabel').textContent='--';$('bestTimeHero').textContent='--';
  }
}
async function loadAudit(){
  const {data}=await sb.from('mktb_saas_menu_audits').select('*').eq('restaurant_id',restaurant.id).order('captured_at',{ascending:false}).limit(1).maybeSingle();
  audit=data||null;
  renderAudit();
}
function auditScore(){
  if(!audit)return null;
  const vals=[audit.score_photos,audit.score_structure,audit.score_price,audit.score_descriptions,audit.score_upsell,audit.score_availability].filter(v=>v!=null&&Number.isFinite(Number(v)));
  return audit.score_total??(vals.length?Math.round(vals.reduce((a,b)=>a+Number(b),0)/vals.length):null);
}
function renderAudit(){
  const score=auditScore();
  $('menuScore').textContent=score==null?'--':score;
  $('menuHeroScore').textContent=score==null?'--':score+'/100';
  $('menuScoreRing').style.setProperty('--score',score||0);

  const title=score==null?'Aguardando análise':score>=85?'Cardápio muito forte':score>=70?'Bom potencial':score>=55?'Há oportunidades claras':'Prioridade de melhoria';
  $('menuScoreTitle').textContent=title;
  $('menuScoreText').textContent=audit?.stats?.summary||'Assim que a primeira análise estiver disponível, o diagnóstico completo aparece aqui.';

  renderScoreCards();
  renderFindings();
  renderProducts();
  renderRoadmap();
  renderRecommendations();
}
function renderScoreCards(){
  const wrap=$('menuScoreOverview');
  wrap.querySelectorAll('.score-mini').forEach(x=>x.remove());
  if(!audit)return;
  const scores=[
    ['Fotos',audit.score_photos,'camera'],
    ['Estrutura',audit.score_structure,'layout-grid'],
    ['Preço',audit.score_price,'badge-dollar-sign'],
    ['Descrições',audit.score_descriptions,'file-text'],
    ['Upsell',audit.score_upsell,'trending-up'],
    ['Disponibilidade',audit.score_availability,'package-check']
  ];
  scores.forEach(([name,value,icon])=>{
    const div=document.createElement('div');div.className='score-mini';
    div.innerHTML='<div class="score-mini-head"><span data-lucide="'+icon+'"></span>'+name+'</div><b>'+(value==null?'--':value)+'<span>/100</span></b><div class="score-bar"><i style="width:'+(value||0)+'%"></i></div><p>'+scoreCopy(name,value)+'</p>';
    wrap.appendChild(div);
  });
  window.lucide?.createIcons();
}
function scoreCopy(name,value){
  if(value==null)return 'Sem dados suficientes nesta análise.';
  if(value>=85)return 'Ótimo desempenho neste critério.';
  if(value>=70)return 'Boa base, com espaço para refinar.';
  if(value>=55)return 'Há pontos importantes para melhorar.';
  return 'Este critério merece atenção prioritária.';
}
function renderFindings(){
  const el=$('findingsBox');if(!el)return;
  const fs=audit?.findings||[];
  if(!fs.length){el.innerHTML='<div class="feature-empty" style="grid-column:1/-1"><b>Nenhum problema importante registrado</b><p>Quando a análise detectar pontos de melhoria eles aparecem aqui.</p></div>';return}
  el.innerHTML=fs.slice(0,8).map(f=>'<article class="issue-card"><span class="issue-priority '+esc(f.priority||'media')+'">'+esc((f.priority||'media').toUpperCase())+' PRIORIDADE</span><h4>'+esc(f.title||'Ponto de melhoria')+'</h4><p>'+esc(f.detail||'')+'</p><div class="issue-split"><div><small>Impacto</small><p>'+esc(f.impact||'Pode dificultar a escolha ou reduzir a percepção de valor.')+'</p></div><div><small>O que fazer</small><p>'+esc(f.how_to_fix||'Revise este ponto e deixe a oferta mais clara e atraente.')+'</p></div></div></article>').join('');
}
function renderProducts(){
  const el=$('productsGrid');if(!el)return;
  const items=audit?.menu_items||[];
  if(!items.length){el.innerHTML='<div class="feature-empty" style="grid-column:1/-1"><b>Nenhum produto disponível nesta análise</b><p>Os produtos aparecem aqui quando forem capturados no cardápio.</p></div>';return}
  el.innerHTML=items.slice(0,8).map(x=>{
    const photo=x.image_url?'<img src="'+esc(x.image_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'Sem foto';
    const descOk=!!(x.description&&x.description.length>=25),photoOk=!!(x.photo_observed||x.image_url);
    return '<article class="product-card"><div class="product-photo">'+photo+'</div><div class="product-body"><h4>'+esc(x.name)+'</h4><div class="product-price">'+money(x.price)+'</div><div class="product-check '+(photoOk?'ok':'warn')+'">● '+(photoOk?'Foto identificada':'Foto não observada')+'</div><div class="product-check '+(descOk?'ok':'warn')+'">● '+(descOk?'Descrição consistente':'Descrição para revisar')+'</div>'+(x.category?'<div class="product-check">● '+esc(x.category)+'</div>':'')+'</div></article>';
  }).join('');
}
function renderRoadmap(){
  const el=$('actionRoadmap');if(!el)return;
  const fs=(audit?.findings||[]).filter(x=>x.how_to_fix).slice(0,5);
  if(!fs.length){el.innerHTML='<div class="feature-empty" style="grid-column:1/-1"><b>Plano de ação aguardando análise</b><p>As prioridades serão ordenadas automaticamente quando houver um relatório.</p></div>';return}
  el.innerHTML=fs.map((f,i)=>'<div class="road-step"><span class="n">'+(i+1)+'</span><b>'+esc(f.title||'Melhoria')+'</b><p>'+esc(f.how_to_fix)+'</p></div>').join('');
}
function recommendations(){
  const out=[];
  const fs=audit?.findings||[];
  fs.slice(0,2).forEach(f=>out.push({icon:'lightbulb',title:f.title||'Melhore o cardápio',text:f.how_to_fix||f.detail||''}));
  if(events.filter(x=>x.event_type==='campaign').length===0)out.push({icon:'send',title:'Padronize suas campanhas com UTM',text:'Use parâmetros UTM para saber exatamente quais anúncios trazem tráfego ao iFood.'});
  if(Number(summary.loads||0)>0&&Number(summary.rate||0)<80)out.push({icon:'mouse-pointer-click',title:'Revise o caminho até o iFood',text:'A taxa de encaminhamento pode melhorar. Verifique campanhas, promessa e experiência do clique.'});
  if(!out.length)out.push({icon:'chart-no-axes-combined',title:'Continue acompanhando os dados',text:'O Dashboard vai priorizar novas recomendações conforme o volume aumentar.'});
  return out.slice(0,4);
}
function renderRecommendations(){
  const list=recommendations();
  for(const id of ['overviewRecommendations','performanceRecommendations']){
    const el=$(id);if(!el)continue;
    el.innerHTML=list.map(r=>'<div class="reco"><div class="reco-icon"><span data-lucide="'+r.icon+'"></span></div><div><b>'+esc(r.title)+'</b><p>'+esc(r.text)+'</p></div><span data-lucide="chevron-right"></span></div>').join('');
  }
  window.lucide?.createIcons();
}

document.querySelectorAll('.nav button[data-section]').forEach(btn=>btn.onclick=()=>openSection(btn.dataset.section));
document.querySelectorAll('[data-section-go]').forEach(btn=>btn.onclick=()=>openSection(btn.dataset.sectionGo));
function openSection(id){
  document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===id));
  document.querySelectorAll('.nav button[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===id));
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-copy-link]').forEach(btn=>btn.onclick=async()=>{
  await navigator.clipboard.writeText(publicLink);
  const old=btn.textContent;btn.textContent='Copiado';setTimeout(()=>btn.textContent=old,1200);
});

async function saveIfood(url){
  if(!/^https:\/\/(www\.)?ifood\.com\.br\//i.test(url)){alert('Cole uma URL válida do iFood.');return false}
  const merchant=(url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)||[])[0]||null;
  const {error}=await sb.from('mktb_restaurants').update({ifood_url:url,merchant_id:merchant,updated_at:new Date().toISOString(),onboarding_completed:true}).eq('id',restaurant.id);
  if(error){alert('Não foi possível salvar.');return false}
  restaurant.ifood_url=url;restaurant.merchant_id=merchant;
  $('ifoodUrlInput').value=url;$('settingsIfoodUrlInput').value=url;
  alert('URL do iFood atualizada.');
  return true;
}
$('saveIfoodUrl').onclick=()=>saveIfood($('ifoodUrlInput').value.trim());
$('saveSettingsIfoodUrl').onclick=()=>saveIfood($('settingsIfoodUrlInput').value.trim());

$('savePixel').onclick=async()=>{
  const v=$('pixelInput').value.trim();
  if(v&&!/^\d{5,30}$/.test(v)){alert('Digite apenas o ID numérico do Pixel.');return}
  const {error}=await sb.from('mktb_restaurant_settings').update({meta_pixel_id:v||null,updated_at:new Date().toISOString()}).eq('restaurant_id',restaurant.id);
  if(error){alert('Não foi possível salvar o Pixel.');return}
  $('pixelStatus').textContent=v?'Conectado':'Não configurado';
  alert('Pixel atualizado.');
};

document.querySelectorAll('[data-plan-choice]').forEach(btn=>btn.onclick=()=>{
  selectedPlan=btn.dataset.planChoice;
  updateSelectedPlanUI();
});

$('subscribeBtn').onclick=async()=>{
  const btn=$('subscribeBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='Abrindo checkout...';
  try{
    const {data:{session}}=await sb.auth.getSession();
    const r=await fetch(SUPABASE_URL+'/functions/v1/mktb-billing-checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_KEY},
      body:JSON.stringify({restaurant_id:restaurant.id,plan_code:selectedPlan})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok){
      if(j.error==='plan_price_not_set'){alert('O valor do plano ainda não foi definido.');return}
      if(j.error==='billing_not_configured'){alert('A conta de cobrança ainda não foi conectada.');return}
      if(j.error==='invalid_plan'){alert('Selecione um plano válido.');return}
      throw new Error(j.detail||j.error||'Falha no checkout');
    }
    location.href=j.checkout_url;
  }catch(e){alert(e.message||'Não foi possível abrir o checkout.')}
  finally{btn.disabled=false;btn.textContent=old}
};

$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.href='./'};

await Promise.all([loadPlan(),loadSubscription(),loadSettings(),loadMetrics(),loadAudit()]);
renderRecommendations();
window.lucide?.createIcons();
