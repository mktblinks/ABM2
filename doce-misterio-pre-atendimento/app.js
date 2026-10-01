(() => {
  const config = window.DOCE_CONFIG || {};
  const params = new URLSearchParams(window.location.search);

  const data = {
    size: "",
    intent: "",
    delivery: "",
    city: "",
    product: readParam("produto", "product", "item", "anuncio"),
    campaign: readParam("campanha", "campaign", "utm_campaign"),
    adset: readParam("conjunto", "adset"),
    creative: readParam("criativo", "creative", "utm_content"),
    source: readParam("utm_source", "source"),
    medium: readParam("utm_medium"),
    term: readParam("utm_term"),
    fbclid: readParam("fbclid")
  };

  let step = 1;
  const totalSteps = 4;

  const leadForm = document.getElementById("leadForm");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const submitBtn = document.getElementById("submitBtn");
  const formError = document.getElementById("formError");
  const otherCityWrap = document.getElementById("otherCityWrap");
  const otherCity = document.getElementById("otherCity");

  document.querySelectorAll("[data-brand]").forEach(el => el.textContent = config.brandName || "Doce Mistério");

  if (data.product) {
    document.getElementById("productContext").hidden = false;
    document.getElementById("productName").textContent = data.product;
  }

  renderOptions("sizeOptions", config.sizes || [], "size", true);
  renderOptions("intentOptions", config.intents || [], "intent");
  renderOptions("deliveryOptions", config.delivery || [], "delivery");
  renderOptions("cityOptions", config.storeCities || [], "city", true);

  initMetaPixel();
  track("PageView", { product: data.product || "universal" });

  nextBtn.addEventListener("click", () => {
    if (!validateStep()) return;
    track("FormStepComplete", { step });
    step += 1;
    updateStep();
  });

  backBtn.addEventListener("click", () => {
    if (step <= 1) return;
    step -= 1;
    updateStep();
  });

  otherCity.addEventListener("input", () => {
    if (data.city === "Outra cidade") clearError();
  });

  leadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateStep()) return;

    const city = data.city === "Outra cidade" ? otherCity.value.trim() : data.city;
    const whatsapp = normalizePhone(config.whatsappNumber || "");

    if (!/^\d{12,13}$/.test(whatsapp) || whatsapp.includes("NUMERO")) {
      showError("Configure o número do WhatsApp em config.js antes de publicar.");
      return;
    }

    const classification = classifyLead();
    const message = buildMessage({ ...data, city, classification });
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

    track("FormComplete", { classification, product: data.product || "universal" });
    track("WhatsAppClick", { classification, product: data.product || "universal" });

    setTimeout(() => {
      window.location.href = url;
    }, 120);
  });

  function readParam(...names) {
    for (const name of names) {
      const value = params.get(name);
      if (value && value.trim()) return value.trim();
    }
    return "";
  }

  function renderOptions(targetId, options, key, compact = false) {
    const target = document.getElementById(targetId);
    options.forEach(option => {
      const normalized = typeof option === "string" ? { value: option, label: option } : option;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `option${compact ? " compact" : ""}`;
      button.textContent = normalized.label;
      button.dataset.value = normalized.value;
      button.addEventListener("click", () => selectOption(target, button, key, normalized.value));
      target.appendChild(button);
    });
  }

  function selectOption(target, button, key, value) {
    target.querySelectorAll(".option").forEach(el => el.classList.remove("is-selected"));
    button.classList.add("is-selected");
    data[key] = value;
    clearError();

    if (key === "city") {
      otherCityWrap.hidden = value !== "Outra cidade";
      if (value !== "Outra cidade") otherCity.value = "";
    }
  }

  function validateStep() {
    const rules = {
      1: [data.size, "Escolha seu tamanho para continuar."],
      2: [data.intent, "Diga o que você quer fazer agora."],
      3: [data.delivery, "Escolha como prefere receber."],
      4: [data.city, "Escolha sua cidade para continuar."]
    };

    const [value, message] = rules[step];
    if (!value) {
      showError(message);
      return false;
    }

    if (step === 4 && data.city === "Outra cidade" && !otherCity.value.trim()) {
      showError("Digite sua cidade para continuar.");
      otherCity.focus();
      return false;
    }

    clearError();
    return true;
  }

  function updateStep() {
    document.querySelectorAll(".step").forEach(el => {
      el.classList.toggle("is-active", Number(el.dataset.step) === step);
    });

    const percent = Math.round((step / totalSteps) * 100);
    document.getElementById("stepLabel").textContent = `${step} de ${totalSteps}`;
    document.getElementById("progressPercent").textContent = `${percent}%`;
    document.getElementById("progressBar").style.width = `${percent}%`;

    backBtn.hidden = step === 1;
    nextBtn.hidden = step === totalSteps;
    submitBtn.hidden = step !== totalSteps;
    clearError();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function classifyLead() {
    if (data.intent === "comprar" && data.size && data.size !== "Não sei" && data.city) return "LEAD QUENTE";
    if (data.intent === "comprar" || data.intent === "opcoes") return "LEAD MORNO";
    return "ATENDIMENTO / DÚVIDA";
  }

  function labelFrom(collection, value) {
    const found = (collection || []).find(item => (typeof item === "string" ? item : item.value) === value);
    return typeof found === "string" ? found : found?.label || value;
  }

  function buildMessage(payload) {
    const product = payload.product || "Atendimento geral";
    const intent = labelFrom(config.intents, payload.intent);
    const delivery = labelFrom(config.delivery, payload.delivery);

    const visible = [
      `*${config.brandName || "DOCE MISTÉRIO"} | ${payload.classification}*`,
      "",
      `Produto/anúncio: ${product}`,
      `Tamanho: ${payload.size}`,
      `Intenção: ${intent}`,
      `Recebimento: ${delivery}`,
      `Cidade: ${payload.city}`
    ];

    const tracking = [];
    if (payload.campaign) tracking.push(`Campanha: ${payload.campaign}`);
    if (payload.adset) tracking.push(`Conjunto: ${payload.adset}`);
    if (payload.creative) tracking.push(`Criativo: ${payload.creative}`);
    if (payload.source) tracking.push(`Origem: ${payload.source}`);
    if (payload.term) tracking.push(`Termo: ${payload.term}`);

    if (tracking.length) visible.push("", "_Origem do anúncio_", ...tracking);
    visible.push("", "Pode me atender?");

    return visible.join("\n");
  }

  function normalizePhone(phone) {
    return String(phone).replace(/\D/g, "");
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function clearError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  function initMetaPixel() {
    const id = String(config.metaPixelId || "").trim();
    if (!/^\d+$/.test(id)) return;

    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', id);
  }

  function track(eventName, details = {}) {
    const payload = {
      ...details,
      campaign: data.campaign || undefined,
      creative: data.creative || undefined,
      source: data.source || undefined
    };

    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", eventName, payload);
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...payload });
  }
})();
