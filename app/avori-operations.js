/* AVORI Operations - client-side action tracking and transparent reporting.
   Progress is stored on this device only; it never changes billing, campaigns, orders or production records. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const clean=s=>String(s||'').trim();
const safeCsv=v=>{let t=clean(v);if(/^[=+@\-\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
let lastSignature='',actions=[];
const accountKey=()=>['avori_ops_v1',clean($('sideEmail')?.textContent),clean($('sideRestaurant')?.textContent)].join(':');
function save(){try{localStorage.setItem(accountKey(),JSON.stringify(actions))}catch(e){console.warn('AVORI: progresso local indisponível',e)}}
function stored(){try{return JSON.parse(localStorage.getItem(accountKey())||'[]')}catch{return []}}
function sync(){
 const board=$('actionRoadmap');if(!board)return;
 const steps=[...board.querySelectorAll('.road-step')];const signature=steps.map(x=>clean(x.querySelector('b')?.textContent)+'|'+clean(x.querySelector('p')?.textContent)).join(';;');
 if(signature===lastSignature)return;lastSignature=signature;
 const existing=stored();actions=steps.map((el,i)=>{let title=clean(el.querySelector('b')?.textContent);let code=title+'|'+clean(el.querySelector('p')?.textContent);const prior=existing.find(x=>x.code===code);return {code,title,done:!!prior?.done}});
 steps.forEach((el,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='avori-action-toggle';btn.setAttribute('aria-pressed',String(actions[i].done));btn.textContent=actions[i].done?'✓ Concluído':'Marcar como concluído';btn.onclick=()=>{actions[i].done=!actions[i].done;btn.textContent=actions[i].done?'✓ Concluído':'Marcar como concluído';btn.setAttribute('aria-pressed',String(actions[i].done));el.classList.toggle('avori-action-done',actions[i].done);save();count()};el.classList.toggle('avori-action-done',actions[i].done);el.append(btn)});
 count();
}
function count(){const el=$('actionProgress');if(el)el.textContent=actions.filter(a=>a.done).length+'/'+actions.length}
const field=id=>clean($(id)?.textContent);
function exportReport(){
 const rows=[['AVORI | Relatorio de acompanhamento'],['Gerado em',new Date().toLocaleString('pt-BR')],['Restaurante',field('sideRestaurant')],['Aviso','Encaminhamentos ao iFood nao representam pedidos ou faturamento confirmados.'],[],['Indicador','Valor','Fonte'],['Visitas ao link',field('mLoads'),'Rastreamento AVORI'],['Encaminhamentos ao iFood',field('mRedirects'),'Rastreamento AVORI'],['Taxa de encaminhamento',field('mRate'),'Rastreamento AVORI'],['Campanhas identificadas',field('mCampaigns'),'UTM e rastreamento AVORI'],['Score do cardapio',field('menuScore'),'Ultima analise disponivel'],[],['Plano de acao','Situacao']];
 actions.forEach(a=>rows.push([a.title,a.done?'Concluida':'Pendente']));
 rows.push([],['Integracao oficial iFood','Aguardando homologacao e autorizacao da loja']);
 const text='\uFEFF'+rows.map(row=>row.map(safeCsv).join(';')).join('\r\n');
 const blob=new Blob([text],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='avori-relatorio-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
window.addEventListener('DOMContentLoaded',()=>{
 $('exportAvoriReport')?.addEventListener('click',exportReport);
 const board=$('actionRoadmap');if(board){const observer=new MutationObserver(sync);observer.observe(board,{childList:true});sync()}
});
})();
