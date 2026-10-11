// AVORI public demonstration: illustrative data only. No Supabase credentials or production writes.
if(sessionStorage.getItem('avori_demo')!=='1')location.replace('./');
const $=id=>document.getElementById(id);
const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const put=(id,t)=>{let el=$(id);if(el)el.textContent=t};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scores=[['Fotos',72,'camera'],['Estrutura',80,'layout-grid'],['Preço',68,'badge-dollar-sign'],['Descrições',82,'file-text'],['Upsell',60,'trending-up'],['Disponibilidade',92,'package-check'],['Competitividade',75,'trophy']];
const findings=[
{title:'Fotos de baixa qualidade',priority:'Alta',desc:'3 itens principais precisam de imagens melhores.',impact:'Pode reduzir o interesse pelo produto.',fix:'Usar fotos profissionais e aproximadas.'},
{title:'Preços acima da média',priority:'Alta',desc:'5 itens estão mais caros que a média da região.',impact:'Pode diminuir a conversão.',fix:'Revisar preços e comparar ofertas.'},
{title:'Descrições pouco persuasivas',priority:'Média',desc:'7 itens têm descrições genéricas ou incompletas.',impact:'Pode dificultar a decisão.',fix:'Destacar ingredientes e diferenciais.'},
{title:'Poucas opções de upsell',priority:'Média',desc:'Apenas 2 itens oferecem adicionais ou combos.',impact:'Oportunidade de aumentar o ticket médio.',fix:'Criar combos e adicionais relevantes.'}
];
const products=[
{name:'Burger Clássico',price:32.9,category:'Mais vendido',image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=220&q=75',tips:['Foto de boa qualidade','Descrição clara','Preço competitivo']},
{name:'Cheddar Bacon',price:36.9,category:'Oportunidade',image:'https://images.unsplash.com/photo-1553979459-d2229ba7433a?auto=format&fit=crop&w=220&q=75',tips:['Preço acima da média','Melhorar descrição','Criar opção de combo']},
{name:'Batata Frita',price:18.9,category:'Atenção',image:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=220&q=75',tips:['Melhorar foto','Adicionar tamanho','Criar adicional']},
{name:'Brownie com Sorvete',price:24.9,category:'Oportunidade',image:'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=220&q=75',tips:['Boa foto','Descrição atrativa','Criar combo com bebida']}
];
const store='Burger House (Demonstração)';
put('sideRestaurant',store);put('sideEmail','demo@avori.com.br');put('restaurantName',store);put('avatar','B');
for(const id of ['overviewPlan'])put(id,'AVORI DEMO');
for(const id of ['subscriptionBadge','planStatus'])put(id,'Demonstração');
for(const [id,value] of Object.entries({mLoads:'3.501',mRedirects:'3.287',mRate:'93,9%',mCampaigns:'6',overviewHeroRate:'93,9%',pLoads:'3.501',pRedirects:'3.287',pRate:'93,9%',pCampaignTraffic:'2.411',bestTimeHero:'19h às 22h',bestTimeLabel:'19h às 22h',bestTimeDescription:'Período ilustrativo de maior procura.',menuHeroScore:'78/100',menuScore:'78',menuScoreTitle:'Bom potencial!',menuScoreText:'Seu cardápio tem uma boa estrutura, mas ainda existem oportunidades importantes para melhorar.',overviewLink:'avori.app/loja/burger-house-demo',mainLink:'avori.app/loja/burger-house-demo',pixelStatus:'Demo configurado'}))put(id,value);
$('menuScoreRing')?.style.setProperty('--score','78');
const scoreWrap=$('menuScoreOverview');
scores.forEach(([name,score,icon])=>{let item=document.createElement('div');item.className='score-mini';item.innerHTML='<div class="score-mini-head"><span data-lucide="'+icon+'"></span>'+esc(name)+'</div><b>'+score+'<span>/100</span></b><div class="score-bar"><i style="width:'+score+'%"></i></div><p>'+(score>=85?'Ótimo desempenho neste critério.':score>=70?'Boa base, com espaço para refinar.':'Oportunidade identificada para melhoria.')+'</p>';scoreWrap?.append(item)});
$('findingsBox').innerHTML=findings.map(f=>'<article class="issue-card"><span class="issue-priority '+(f.priority==='Alta'?'alta':'media')+'">'+f.priority.toUpperCase()+' PRIORIDADE</span><h4>'+esc(f.title)+'</h4><p>'+esc(f.desc)+'</p><div class="issue-split"><div><small>Impacto</small><p>'+esc(f.impact)+'</p></div><div><small>O que fazer</small><p>'+esc(f.fix)+'</p></div></div></article>').join('');
$('productsGrid').innerHTML=products.map(p=>'<article class="product-card"><div class="product-photo"><img src="'+p.image+'" loading="lazy" alt="'+esc(p.name)+'"></div><div class="product-body"><h4>'+esc(p.name)+'</h4><div class="product-price">'+money(p.price)+'</div>'+p.tips.map((v,i)=>'<div class="product-check '+(i===0?'ok':'warn')+'">● '+esc(v)+'</div>').join('')+'</div></article>').join('');
$('actionRoadmap').innerHTML=[...findings,{title:'Acompanhar resultados',fix:'Medir o impacto das melhorias.'}].map((f,i)=>'<div class="road-step"><span class="n">'+(i+1)+'</span><b>'+esc(f.title)+'</b><p>'+esc(f.fix)+'</p></div>').join('');
const competitors=[['Burger House (Você)',24,28.9,78],['Grill Masters',28,26.5,82],['Burgueria da Esquina',32,24.9,85],['Noise Burger',20,30.9,74],['King Burgers',26,27.5,80]];
$('competitorPreview').className='';$('competitorPreview').innerHTML='<table class="campaign-table"><thead><tr><th>Restaurante</th><th>Itens</th><th>Preço médio</th><th>Score</th></tr></thead><tbody>'+competitors.map(x=>'<tr><td>'+esc(x[0])+'</td><td>'+x[1]+'</td><td>'+money(x[2])+'</td><td><span style="display:inline-block;width:40px;height:6px;border-radius:5px;background:linear-gradient(90deg,#cda153 '+x[3]+'%,#eee '+x[3]+'%)"></span> '+x[3]+'</td></tr>').join('')+'</tbody></table>';
const sources=[['Instagram',48],['Meta Ads',29],['Google',14],['Direto',9]];
const devices=[['Android',61],['iPhone / iOS',31],['Desktop',8]];
function bars(rows){return '<div style="display:grid;gap:13px;padding:7px 2px">'+rows.map(x=>'<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><b>'+x[0]+'</b><span>'+x[1]+'%</span></div><div style="height:8px;background:#eeece9;border-radius:12px"><div style="height:100%;width:'+x[1]+'%;border-radius:12px;background:linear-gradient(90deg,#ac7930,#e4c17b)"></div></div></div>').join('')+'</div>'}
for(const id of ['overviewSources','performanceSources','audienceSources'])$(id).innerHTML=bars(sources);
for(const id of ['overviewDevices','performanceDevices','audienceDevices'])$(id).innerHTML=bars(devices);
const campaigns=[['Meta | Burger da Semana',1568,1494],['Instagram | Combo',843,798],['Google | Marca',430,402]];
const campaignTable='<table class="campaign-table"><thead><tr><th>Campanha</th><th>Visitas</th><th>Cliques</th><th>Taxa</th></tr></thead><tbody>'+campaigns.map(c=>'<tr><td>'+esc(c[0])+'</td><td>'+c[1].toLocaleString('pt-BR')+'</td><td>'+c[2].toLocaleString('pt-BR')+'</td><td>'+((c[2]/c[1])*100).toFixed(1).replace('.',',')+'%</td></tr>').join('')+'</tbody></table>';
for(const id of ['campaignPerformance','campaignsFull'])$(id).innerHTML=campaignTable;
const reco='<div class="reco-list">'+findings.slice(0,3).map(x=>'<div class="reco"><div class="reco-icon"><span data-lucide="lightbulb"></span></div><div><b>'+esc(x.title)+'</b><p>'+esc(x.fix)+'</p></div></div>').join('')+'</div>';
for(const id of ['overviewRecommendations','performanceRecommendations'])$(id).innerHTML=reco;
const vals=[17,24,20,29,35,31,43,39,53,48,57,50,63,58,65,73,68,78,75,82,79,88,84,93,89,96,99,105,101,111];
const points=vals.map((n,i)=>(30+i*22)+' '+(205-n*1.35)).join(' L ');
$('trafficChart').innerHTML='<svg viewBox="0 0 700 235" width="100%" role="img" aria-label="Gráfico de visitas fictícias"><defs><linearGradient id="demoGold" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ddba73" stop-opacity=".35"/><stop offset="1" stop-color="#ddba73" stop-opacity="0"/></linearGradient></defs><path d="M'+points+' L 668 218 L 30 218 Z" fill="url(#demoGold)"/><path d="M'+points+'" fill="none" stroke="#c39843" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
$('heatmap').innerHTML=Array.from({length:63},(_,i)=>'<span style="display:block;aspect-ratio:1;background:rgba(177,126,44,'+(.12+((i*17)%11)/12)+');border-radius:4px"></span>').join('');
$('heatmap').style.cssText='display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:5px';
const names={overview:'Visão Geral',performance:'Desempenho',menu:'Análise do Cardápio',campaigns:'Campanhas',link:'Link da Loja',audience:'Audiência',competitors:'Concorrentes',reports:'Relatórios',settings:'Configurações',plan:'Plano AVORI'};
function openSection(id){if(!names[id])return;document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.nav button[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===id));put('currentPageTitle',names[id]);history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>openSection(b.dataset.section)));
document.querySelectorAll('[data-section-go]').forEach(b=>b.addEventListener('click',()=>openSection(b.dataset.sectionGo)));
document.querySelectorAll('[data-scroll-to]').forEach(b=>b.onclick=()=>$(b.dataset.scrollTo)?.scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('[data-copy-link]').forEach(b=>b.onclick=()=>{navigator.clipboard?.writeText('https://example.com/demo-link');b.textContent='Link ilustrativo'});
document.querySelectorAll('[data-plan-choice]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-plan-choice]').forEach(x=>x.classList.toggle('active',x===b));const annual=b.dataset.planChoice==='annual';put('planPrice',annual?'R$ 139,90/mês':'R$ 149,90/mês');put('planBillingHint',annual?'R$ 1.678,80 cobrados por ano':'Cobrança mensal')});
const demoOnly=()=>alert('Esta função está desativada na demonstração. Nenhuma alteração foi enviada a contas reais.');
for(const id of ['saveIfoodUrl','saveSettingsIfoodUrl','savePixel','subscribeBtn'])if($(id))$(id).onclick=demoOnly;
$('logoutBtn').onclick=()=>{sessionStorage.removeItem('avori_demo');location.replace('./')};
put('ifoodUrlInput','https://www.ifood.com.br/ (exemplo)');put('settingsIfoodUrlInput','https://www.ifood.com.br/ (exemplo)');
if($('pixelInput'))$('pixelInput').value='123456789000000';
openSection(names[location.hash.slice(1)]?location.hash.slice(1):'menu');
window.lucide?.createIcons();
