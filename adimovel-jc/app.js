(() => {
  const DEFAULTS = {
    name: "Imóvel selecionado",
    code: "",
    value: 0,
    minEntry: 0,
    minIncome: 0,
    maxMonths: 6,
    website: "https://adimoveljc.com.br/",
    whatsapp: "5527981667186"
  };

  const qs = new URLSearchParams(location.search);

  function decodePayload(value) {
    if (!value) return {};
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
      const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (_) {
      return {};
    }
  }

  const raw = decodePayload(qs.get("d"));
  const config = {
    name: raw.n || DEFAULTS.name,
    code: raw.c || DEFAULTS.code,
    value: Number(raw.v || DEFAULTS.value),
    minEntry: Number(raw.e || DEFAULTS.minEntry),
    minIncome: Number(raw.r || DEFAULTS.minIncome),
    maxMonths: Number(raw.t || DEFAULTS.maxMonths),
    website: raw.s || DEFAULTS.website,
    whatsapp: String(raw.w || DEFAULTS.whatsapp).replace(/\D/g, "")
  };

  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];

  const form = $("#leadForm");
  const resultState = $("#resultState");
  const nextBtn = $("#nextBtn");
  const submitBtn = $("#submitBtn");
  const error = $("#formError");

  const state = {
    step: 1,
    payment: "",
    entry: 0,
    income: 0,
    months: 0,
    name: "",
    phone: ""
  };

  $("#propertyName").textContent = config.name;
  $("#propertyCode").textContent = config.code ? `Cód. ${config.code}` : "Atendimento Adimóvel";
  $("#propertyPrice").textContent = config.value ? money.format(config.value) : "Valor sob consulta";
  document.title = `${config.name} | Adimóvel Jardim Camburi`;

  function onlyDigits(value) { return String(value || "").replace(/\D/g, ""); }
  function readMoney(input) { return Number(onlyDigits(input.value) || 0); }
  function setMoney(input, value) {
    const digits = String(Math.max(0, Math.round(Number(value) || 0)));
    input.value = digits === "0" ? "" : new Intl.NumberFormat("pt-BR").format(Number(digits));
  }
  function bindMoneyInput(input) {
    input.addEventListener("input", () => {
      const digits = onlyDigits(input.value);
      input.value = digits ? new Intl.NumberFormat("pt-BR").format(Number(digits)) : "";
    });
  }
  bindMoneyInput($("#entryValue"));
  bindMoneyInput($("#incomeValue"));

  function formatPhoneInput(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  }
  $("#leadPhone").addEventListener("input", e => { e.target.value = formatPhoneInput(e.target.value); });

  function renderQuickEntries() {
    const wrap = $("#entryQuickValues");
    wrap.innerHTML = "";
    if (!config.value) return;
    [10, 20, 30, 50].forEach(percent => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${percent}% · ${money.format(config.value * percent / 100)}`;
      btn.addEventListener("click", () => setMoney($("#entryValue"), config.value * percent / 100));
      wrap.appendChild(btn);
    });
  }
  renderQuickEntries();

  $("#paymentOptions").addEventListener("click", e => {
    const btn = e.target.closest("[data-value]");
    if (!btn) return;
    state.payment = btn.dataset.value;
    $$("#paymentOptions .option-card").forEach(el => el.classList.toggle("is-selected", el === btn));
    hideError();
  });

  $("#timelineOptions").addEventListener("click", e => {
    const btn = e.target.closest("[data-value]");
    if (!btn) return;
    state.months = Number(btn.dataset.value);
    $$("#timelineOptions .choice-chip").forEach(el => el.classList.toggle("is-selected", el === btn));
    hideError();
  });

  function paymentLabel(value) {
    return ({
      financiamento: "Financiamento",
      avista: "À vista",
      consorcio: "Carta contemplada",
      permuta: "Imóvel na negociação"
    })[value] || value;
  }

  function timelineLabel(value) {
    if (value <= 1) return "Agora / até 30 dias";
    if (value <= 3) return "Em até 3 meses";
    if (value <= 6) return "Em até 6 meses";
    if (value <= 12) return "De 6 a 12 meses";
    return "Ainda pesquisando";
  }

  function configureStepTwo() {
    const financing = state.payment === "financiamento";
    $("#financingFields").hidden = !financing;
    $("#alternativeFields").hidden = financing;

    if (!financing) {
      const copy = {
        avista: ["Compra à vista", "Ótimo. Vamos entender em quanto tempo você pretende concluir a compra."],
        consorcio: ["Carta contemplada", "Perfeito. A equipe poderá conferir as condições da carta e do imóvel com você."],
        permuta: ["Imóvel na negociação", "Perfeito. A equipe poderá avaliar a composição do seu imóvel na negociação."]
      }[state.payment] || ["Perfeito.", "Vamos seguir para o próximo passo."];
      $("#alternativeTitle").textContent = copy[0];
      $("#alternativeCopy").textContent = copy[1];
    }
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }
  function hideError() { error.hidden = true; }

  function validateStep() {
    hideError();
    if (state.step === 1 && !state.payment) {
      showError("Selecione como você pretende realizar a compra.");
      return false;
    }
    if (state.step === 2 && state.payment === "financiamento") {
      const entry = readMoney($("#entryValue"));
      const income = readMoney($("#incomeValue"));
      if (!entry) { showError("Informe o valor aproximado disponível para entrada."); return false; }
      if (!income) { showError("Informe a renda familiar mensal aproximada."); return false; }
      state.entry = entry;
      state.income = income;
    }
    if (state.step === 3 && !state.months) {
      showError("Selecione quando você pretende comprar.");
      return false;
    }
    return true;
  }

  function renderStep() {
    $$(".step").forEach(el => el.classList.toggle("is-active", Number(el.dataset.step) === state.step));
    $("#stepCounter").textContent = `${state.step} de 4`;
    $("#progressBar").style.width = `${state.step * 25}%`;
    nextBtn.hidden = state.step === 4;
    submitBtn.hidden = state.step !== 4;
    if (state.step === 2) configureStepTwo();
    hideError();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  nextBtn.addEventListener("click", () => {
    if (!validateStep()) return;
    state.step += 1;
    renderStep();
  });

  function isQualified() {
    const timingOk = state.months <= config.maxMonths;
    if (!timingOk) return false;

    if (state.payment === "financiamento") {
      const entryOk = config.minEntry <= 0 || state.entry >= config.minEntry;
      const incomeOk = config.minIncome <= 0 || state.income >= config.minIncome;
      return entryOk && incomeOk;
    }

    return ["avista", "consorcio", "permuta"].includes(state.payment);
  }

  function trackingSummary() {
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
    return keys
      .map(k => [k, qs.get(k)])
      .filter(([,v]) => v)
      .map(([k,v]) => `${k}: ${v}`)
      .join("\n");
  }

  function buildWhatsappUrl() {
    const lines = [
      "Olá! Preenchi o pré-atendimento da Adimóvel e gostaria de falar sobre este imóvel:",
      "",
      `Imóvel: ${config.name}`,
      config.code ? `Código: ${config.code}` : "",
      config.value ? `Valor anunciado: ${money.format(config.value)}` : "",
      "",
      `Nome: ${state.name}`,
      `WhatsApp: ${state.phone}`,
      `Forma de compra: ${paymentLabel(state.payment)}`,
      state.payment === "financiamento" ? `Entrada disponível: ${money.format(state.entry)}` : "",
      state.payment === "financiamento" ? `Renda familiar aproximada: ${money.format(state.income)}/mês` : "",
      `Previsão de compra: ${timelineLabel(state.months)}`,
      "",
      trackingSummary() ? `Origem da campanha:\n${trackingSummary()}` : ""
    ].filter(Boolean);

    return `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    hideError();

    state.name = $("#leadName").value.trim();
    state.phone = $("#leadPhone").value.trim();
    const phoneDigits = onlyDigits(state.phone);

    if (state.name.length < 2) { showError("Informe seu nome."); return; }
    if (phoneDigits.length < 10) { showError("Informe um WhatsApp válido com DDD."); return; }

    const qualified = isQualified();
    form.hidden = true;
    $(".form-top").hidden = true;
    $(".progress-track").hidden = true;
    resultState.hidden = false;

    const title = $("#resultTitle");
    const copy = $("#resultCopy");
    const btn = $("#resultButton");

    if (qualified) {
      const destination = buildWhatsappUrl();
      title.textContent = "Seu atendimento está pronto.";
      copy.textContent = "Vamos abrir o WhatsApp com as informações que você acabou de preencher, para a equipe continuar seu atendimento sem você precisar repetir tudo.";
      btn.textContent = "Continuar no WhatsApp";
      btn.href = destination;
      setTimeout(() => { location.href = destination; }, 1300);
    } else {
      const destination = config.website;
      title.textContent = "Vamos ampliar as opções para você.";
      copy.textContent = "Pelo momento de compra e pela composição informada, vale conhecer outros imóveis que podem combinar melhor com o que você procura agora.";
      btn.textContent = "Ver outros imóveis";
      btn.href = destination;
      setTimeout(() => { location.href = destination; }, 2200);
    }
  });

  renderStep();
})();
