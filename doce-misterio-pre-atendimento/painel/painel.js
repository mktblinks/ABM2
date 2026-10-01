(() => {
  const config = window.DOCE_CONFIG || {};
  const periodSelect = document.getElementById('periodSelect');
  const refreshBtn = document.getElementById('refreshBtn');
  const status = document.getElementById('status');

  periodSelect.addEventListener('change', load);
  refreshBtn.addEventListener('click', load);
  load();

  async function load() {
    const base = String(config.supabaseUrl || '').replace(/\/$/, '');
    const key = String(config.supabaseAnonKey || '').trim();
    const days = Number(periodSelect.value || 30);

    if (!base || !key) {
      status.textContent = 'O painel ainda não está conectado ao banco de dados.';
      return;
    }

    status.textContent = 'Atualizando dados…';
    refreshBtn.disabled = true;

    try {
      const response = await fetch(`${base}/rest/v1/rpc/dm_dashboard_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({ days_back: days })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      render(data || {});
      status.textContent = `Atualizado agora · últimos ${days} dias`;
    } catch (error) {
      console.error(error);
      status.textContent = 'Não foi possível carregar o painel agora. Tente atualizar em alguns segundos.';
    } finally {
      refreshBtn.disabled = false;
    }
  }

  function render(data) {
    const s = data.summary || {};
    const views = Number(s.page_views || 0);
    const completes = Number(s.form_completes || 0);
    const wa = Number(s.whatsapp_clicks || 0);

    set('pageViews', views);
    set('formCompletes', completes);
    set('whatsappClicks', wa);
    set('hotLeads', Number(s.hot_leads || 0));
    set('formRate', `${pct(completes, views)} das visitas`);
    set('waRate', `${pct(wa, views)} das visitas`);

    set('funnelViews', views);
    set('funnelComplete', completes);
    set('funnelWa', wa);
    width('barViews', views ? 100 : 0);
    width('barComplete', ratio(completes, views));
    width('barWa', ratio(wa, views));

    renderRows('productRows', data.by_product || [], row => `
      <td>${esc(row.product)}</td>
      <td>${n(row.page_views)}</td>
      <td>${n(row.form_completes)}</td>
      <td>${n(row.whatsapp_clicks)}</td>
      <td>${n(row.hot_leads)}</td>`);

    renderRows('campaignRows', data.by_campaign || [], row => `
      <td>${esc(row.campaign)}</td>
      <td>${n(row.page_views)}</td>
      <td>${n(row.form_completes)}</td>
      <td>${n(row.whatsapp_clicks)}</td>
      <td>${n(row.hot_leads)}</td>`);

    renderRows('recentRows', data.recent || [], row => `
      <td>${formatDate(row.created_at)}</td>
      <td><span class="pill">${row.event_name === 'FormComplete' ? 'Formulário concluído' : 'WhatsApp'}</span></td>
      <td>${esc(row.product || 'Não identificado')}</td>
      <td>${esc(row.size || '—')}</td>
      <td>${esc(labelIntent(row.intent))}</td>
      <td>${esc(row.city || '—')}</td>`);
  }

  function renderRows(id, rows, template) {
    const tbody = document.getElementById(id);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Ainda não há dados neste período.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(row => `<tr>${template(row)}</tr>`).join('');
  }

  function labelIntent(value) {
    const map = { comprar: 'Comprar agora', opcoes: 'Ver opções', duvida: 'Tirar dúvida' };
    return map[value] || value || '—';
  }

  function set(id, value) { document.getElementById(id).textContent = value; }
  function width(id, value) { document.getElementById(id).style.width = `${Math.max(0, Math.min(100, value))}%`; }
  function n(value) { return Number(value || 0).toLocaleString('pt-BR'); }
  function ratio(value, total) { return total ? (Number(value || 0) / Number(total)) * 100 : 0; }
  function pct(value, total) { return `${ratio(value, total).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`; }
  function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
})();
