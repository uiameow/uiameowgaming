const API_BASE_URL = (window.API_BASE_URL || "").replace(/\/+$/, "");


const statusBox = document.getElementById("status");
const gamesBox = document.getElementById("games");
const packagesBox = document.getElementById("packages");
const fieldsBox = document.getElementById("fields");

let selectedGame = null;
let selectedPackage = null;

document.getElementById("backToGames").addEventListener("click", () => {
  selectedGame = null;
  selectedPackage = null;
  setHeadBannerVisible(true);
  document.getElementById("packagesSection").classList.add("hidden");
  document.getElementById("playerOrderSection").classList.add("hidden");
  document.getElementById("fieldsSection").classList.add("hidden");
  document.getElementById("orderSection").classList.add("hidden");
  document.getElementById("gamesSection").classList.remove("hidden");
});

function money(value) {
  return Number(value).toLocaleString("en-US") + " Ks";
}

async function loadGames() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games`);
    if (!response.ok) throw new Error("Game API failed");

    const games = await response.json();
    gamesBox.replaceChildren();

    if (!games.length) {
      statusBox.textContent = "လက်ရှိ ဖွင့်ထားတဲ့ Game မရှိသေးပါ။";
      return;
    }

    games.forEach(game => {
      const button = document.createElement("button");
      button.className = "card";
      button.type = "button";

      const image = document.createElement("img");
      image.className = "game-image";
      image.src = API_BASE_URL ? `${API_BASE_URL}/static/games/${game.id}.jpg` : `/static/games/${game.id}.jpg`;
      image.alt = game.name;
      image.loading = "lazy";
      image.onerror = function() {
        if (API_BASE_URL && !this.dataset.triedLocal) {
          this.dataset.triedLocal = "1";
          this.src = `/static/games/${game.id}.jpg`;
        } else {
          this.style.display = "none";
        }
      };
      button.appendChild(image);

      const name = document.createElement("strong");
      const nameText = document.createElement("span");
      nameText.className = "game-name-text";
      nameText.textContent = game.name;
      name.appendChild(nameText);
      button.appendChild(name);

      const detail = document.createElement("small");
      detail.textContent = "Package ကြည့်ရန် →";
      button.appendChild(detail);

      button.addEventListener("click", () => selectGame(game, button));
      gamesBox.appendChild(button);

      requestAnimationFrame(() => {
        const available = name.clientWidth;
        const fullWidth = nameText.scrollWidth;
        if (fullWidth > available + 2) {
          nameText.classList.add("is-long");
          nameText.style.setProperty(
            "--marquee-distance",
            `${-(fullWidth - available)}px`
          );
        }
      });
    });

    statusBox.textContent = "";
    document.getElementById("gamesSection").classList.remove("hidden");
  } catch (error) {
    console.error("loadGames() failed:", error);
    statusBox.textContent =
      "API Error: " + (error?.name || "Unknown") + ": " +
      (error?.message || String(error));
  }
}

async function selectGame(game, button) {
  setHeadBannerVisible(false);
  selectedGame = game;
  selectedPackage = null;

  document.querySelectorAll("#games .card").forEach(card => {
    card.classList.remove("selected");
  });
  button.classList.add("selected");

  document.getElementById("gamesSection").classList.add("hidden");
  document.getElementById("packagesSection").classList.remove("hidden");
  document.getElementById("playerOrderSection").classList.add("hidden");
  document.getElementById("fieldsSection").classList.add("hidden");
  document.getElementById("orderSection").classList.add("hidden");
  setLoading(packagesBox, "Package များ ရယူနေပါတယ်");

  try {
    const response = await fetch(`${API_BASE_URL}/api/games/${game.id}/packages`);
    if (!response.ok) throw new Error("Package API failed");
    const packages = await response.json();

    packagesBox.replaceChildren();

    if (!packages.length) {
      packagesBox.textContent = "ဒီ Game အတွက် Package မရှိသေးပါ။";
      return;
    }

    packages.forEach(item => {
      const label = document.createElement("label");
      label.className = "package";

      const left = document.createElement("span");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "package";
      radio.value = item.id;
      radio.addEventListener("change", () => {
        selectedPackage = item;
        document.getElementById("packagesSection").classList.add("hidden");
        document.getElementById("playerOrderSection").classList.remove("hidden");
        document.getElementById("fieldsSection").classList.remove("hidden");
        document.getElementById("orderSection").classList.remove("hidden");
        loadFields(game.id);
      });

      left.className = "package-name";
      left.appendChild(radio);
      left.appendChild(document.createTextNode(item.name));

      const right = document.createElement("span");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "8px";

      const price = document.createElement("span");
      price.className = "price";
      price.textContent = money(item.price);

      const arrow = document.createElement("span");
      arrow.className = "package-arrow";
      arrow.textContent = "›";

      right.appendChild(price);
      right.appendChild(arrow);
      label.appendChild(left);
      label.appendChild(right);
      packagesBox.appendChild(label);
    });
  } catch (error) {
    packagesBox.textContent = "Package စာရင်း ရယူမရပါ။";
  }
}

async function loadFields(gameId) {
  const section = document.getElementById("fieldsSection");
  document.getElementById("playerOrderSection").classList.remove("hidden");
  section.classList.remove("hidden");
  fieldsBox.replaceChildren();

  try {
    const response = await fetch(`${API_BASE_URL}/api/games/${gameId}/fields`);
    if (!response.ok) throw new Error("Fields API failed");
    const fields = await response.json();

    document.getElementById("orderSection").classList.remove("hidden");
    document.getElementById("paymentPanel").classList.add("hidden");
    document.getElementById("orderStatus").textContent = "";
    const orderButton = document.getElementById("orderButton");
    orderButton.classList.remove("hidden");
    orderButton.disabled = false;
    orderButton.textContent = "Order တင်မယ်";
    document.getElementById("receiptFile").disabled = false;
    activeOrderId = null;

    fields.forEach(field => {
      const label = document.createElement("label");
      label.className = "field";
      label.textContent = field.field_label +
        (field.required ? " *" : "");

      let input;
      if (field.input_type === "dropdown") {
        const values = field.options || [];

        // Keep a real select for the existing order submission code.
        input = document.createElement("select");
        input.name = field.field_name;
        input.dataset.required = field.required ? "1" : "0";
        input.className = "server-native-select";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = field.field_label + " ရွေးပါ";
        placeholder.disabled = true;
        placeholder.selected = true;
        input.appendChild(placeholder);

        values.forEach(value => {
          const opt = document.createElement("option");
          opt.value = value;
          opt.textContent = value;
          input.appendChild(opt);
        });
        input.disabled = values.length === 0;

        const wrap = document.createElement("div");
        wrap.className = "glass-server-slots";

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "glass-server-trigger";
        trigger.setAttribute("aria-expanded", "false");

        const valueText = document.createElement("span");
        valueText.className = "glass-server-current";
        valueText.textContent = values.length
          ? field.field_label + " ရွေးပါ"
          : "Admin က Option မထည့်ရသေးပါ";

        const arrow = document.createElement("span");
        arrow.className = "glass-server-arrow";
        arrow.textContent = "⌄";
        trigger.append(valueText, arrow);
        trigger.disabled = values.length === 0;
        wrap.appendChild(trigger);

        const menu = document.createElement("div");
        menu.className = "glass-server-menu";

        values.forEach(value => {
          const slot = document.createElement("button");
          slot.type = "button";
          slot.className = "glass-server-slot";
          slot.textContent = value;
          slot.setAttribute("role", "option");

          slot.addEventListener("click", () => {
            input.value = value;
            input.dispatchEvent(new Event("change", {bubbles: true}));
            valueText.textContent = value;

            menu.querySelectorAll(".glass-server-slot").forEach(el => {
              el.classList.toggle("is-selected", el === slot);
              el.setAttribute("aria-selected", el === slot ? "true" : "false");
            });

            wrap.classList.remove("is-open");
            trigger.setAttribute("aria-expanded", "false");
          });
          menu.appendChild(slot);
        });

        wrap.appendChild(menu);

        trigger.addEventListener("click", () => {
          const opening = !wrap.classList.contains("is-open");

          document.querySelectorAll(".glass-server-slots.is-open").forEach(el => {
            el.classList.remove("is-open");
            const btn = el.querySelector(".glass-server-trigger");
            if (btn) btn.setAttribute("aria-expanded", "false");
          });

          if (opening) {
            wrap.classList.add("is-open");
            trigger.setAttribute("aria-expanded", "true");
          }
        });

        label.appendChild(wrap);
        label.appendChild(input);
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.name = field.field_name;
        input.autocomplete = "off";
        input.dataset.required = field.required ? "1" : "0";
        input.placeholder = field.field_label;
        label.appendChild(input);
      }
      fieldsBox.appendChild(label);
    });

    const info = document.createElement("p");
    info.className = "notice";
    info.textContent = "Player အချက်အလက်တွေ မှန်ကန်ကြောင်း စစ်ဆေးပြီး Order တင်ပါ။";
    fieldsBox.appendChild(info);
  } catch (error) {
    fieldsBox.textContent = "Player Fields ရယူမရပါ။";
  }
}



/* LOADING_DOTS_GLASS_V1 */
function setLoading(element, message) {
  if (!element) return;

  const wrapper = document.createElement("span");
  wrapper.className = "loading-dots-message";

  const text = document.createElement("span");
  text.textContent = message;

  const dots = document.createElement("span");
  dots.className = "loading-dots";
  dots.setAttribute("aria-label", "Loading");

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "loading-dot";
    dot.style.animationDelay = (i * 0.16) + "s";
    dots.appendChild(dot);
  }

  wrapper.append(text, dots);
  element.replaceChildren(wrapper);
}

let activeOrderId = null;


/* PREMIUM_PAYMENT_STICKERS_V1 */
function renderPremiumPaymentInfo(element, rawText) {
  if (!element) return;
  element.replaceChildren();

  const phoneMatch = String(rawText || '').match(/09\d{7,9}/);
  const phone = phoneMatch ? phoneMatch[0] : '09788956720';
  const brands = [
    {name: 'KBZPay', src: '/static/payment-logos/kbzpay.png'},
    {name: 'AYA Pay', src: '/static/payment-logos/ayaplus.png'},
    {name: 'WavePay', src: '/static/payment-logos/wavepay.png'}
  ];

  async function copyPhone(button) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(phone);
      } else {
        const temp = document.createElement('textarea');
        temp.value = phone;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        const copied = document.execCommand('copy');
        temp.remove();
        if (!copied) throw new Error('copy failed');
      }
      button.textContent = 'ကူးပြီး ✓';
    } catch (_) {
      button.textContent = 'မကူးနိုင်ပါ';
    }
  }

  brands.forEach(brand => {
    const row = document.createElement('div');
    row.className = 'premium-payment-row premium-payment-brand-row';

    const icon = document.createElement('span');
    icon.className = 'premium-payment-icon premium-payment-brand-icon';

    const img = document.createElement('img');
    img.src = brand.src;
    img.alt = brand.name + ' logo';
    img.width = 42;
    img.height = 42;
    icon.appendChild(img);

    const number = document.createElement('span');
    number.className = 'premium-payment-text premium-payment-number';
    number.textContent = phone;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'premium-copy-phone';
    button.textContent = 'Copy';
    button.addEventListener('click', () => copyPhone(button));

    row.append(icon, number, button);
    element.appendChild(row);
  });

  const extraLines = String(rawText || '').split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line &&
      !/^#{1,6}\s*/.test(line) &&
      !/ငွေပေးချေမှု|payment/i.test(line) &&
      !/KBZ\s*Pay|K\s*Pay|KPay|Wave\s*Pay|WaveMoney|WavePay|AYA\s*Pay|AYA\s*Plus/i.test(line) &&
      !/09788956720/.test(line));

  if (extraLines.length) {
    const details = document.createElement('div');
    details.className = 'premium-payment-extra';
    extraLines.forEach(line => {
      const detail = document.createElement('div');
      detail.className = 'premium-payment-text';
      detail.textContent = line.replace(/^[📱👨🏻‍💻💰💳🧾\s]+/u, '');
      details.appendChild(detail);
    });
    element.appendChild(details);
  }
}
async function submitMiniOrder() {
  const tg = window.Telegram && Telegram.WebApp;
  const status = document.getElementById("orderStatus");

  if (!tg || !tg.initData) {
    status.textContent = "Telegram ထဲက Mini App ကို ပြန်ဖွင့်ပါ။";
    return;
  }
  if (!selectedGame || !selectedPackage) {
    status.textContent = "Game နဲ့ Package ကို အရင်ရွေးပါ။";
    return;
  }

  const fields = {};
  fieldsBox.querySelectorAll("input, select").forEach(input => {
    fields[input.name] = input.value.trim();
  });

  const button = document.getElementById("orderButton");
  button.disabled = true;
  setLoading(status, "Order တင်နေပါတယ်");

  try {
    const response = await fetch(`${API_BASE_URL}/api/order`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        init_data: tg.initData,
        game_id: selectedGame.id,
        package_id: selectedPackage.id,
        fields
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Order မအောင်မြင်ပါ။");

    activeOrderId = result.order_id;
    renderPremiumPaymentInfo(document.getElementById("paymentInfo"), result.payment_information);
    document.getElementById("orderInfo").textContent =
      "Order: " + result.order_code + "\n" +
      result.game + " / " + result.package + "\n" +
      money(result.price);
    document.getElementById("paymentPanel").classList.remove("hidden");
    status.textContent = "✅ Order တင်ပြီးပါပြီ။ အောက်မှာ ငွေလွှဲပြီး ပြေစာပုံ ပို့ပေးပါ။";
    button.classList.add("hidden");
  } catch (error) {
    status.textContent = error.message;
  } finally {
    if (!activeOrderId) {
      button.disabled = false;
    }
  }
}

let receiptPreviewUrl = null;

/* PREMIUM_RECEIPT_RESELECT_V1 */
/* PREMIUM_RECEIPT_SMOOTH_V5 */
function previewMiniReceipt() {
  const input = document.getElementById("receiptFile");
  const name = document.getElementById("receiptFileName");
  const picker = document.querySelector(".premium-receipt-picker");
  const preview = document.getElementById("receiptPreview");
  const image = document.getElementById("receiptPreviewImage");
  const fileLabel = document.getElementById("receiptPreviewFileLabel");
  const file = input.files && input.files[0];

  if (receiptPreviewUrl) {
    URL.revokeObjectURL(receiptPreviewUrl);
    receiptPreviewUrl = null;
  }

  image.removeAttribute("src");
  image.style.display = "none";
  fileLabel.style.display = "none";
  fileLabel.textContent = "";

  if (!file) {
    name.classList.remove("receipt-file-name-hidden-v5");
    name.textContent = "ပုံ သို့မဟုတ် PDF ဖိုင်ကို ရွေးပါ";
    if (picker) showReceiptPickerAnimated(picker);
    preview.classList.add("hidden");
    preview.style.display = "none";
    return;
  }

  preview.classList.remove("hidden");
  name.classList.add("receipt-file-name-hidden-v5");
  name.textContent = "ရွေးထားသောဖိုင်: " + file.name;

  if (picker) hideReceiptPickerAnimated(picker);

  preview.style.display = "block";
  preview.setAttribute("role", "button");
  preview.setAttribute("tabindex", "0");
  preview.setAttribute("aria-label", "ဖိုင်ပြန်ရွေးရန်: " + file.name);
  preview.title = "ဒီနေရာကိုနှိပ်ပြီး ဖိုင်ပြန်ရွေးနိုင်ပါတယ်";

  if (file.type.startsWith("image/")) {
    receiptPreviewUrl = URL.createObjectURL(file);
    image.src = receiptPreviewUrl;
    image.style.display = "block";
  } else {
    fileLabel.textContent = "📄 " + file.name + " — ပြန်ရွေးရန် နှိပ်ပါ";
    fileLabel.style.display = "block";
  }

  preview.animate(
    [
      { opacity: 0 },
      { opacity: 1 }
    ],
    { duration: 220, easing: "ease-out" }
  );
}

function hideReceiptPickerAnimated(picker) {
  if (picker._receiptMotion) {
    picker._receiptMotion.cancel();
    picker._receiptMotion = null;
  }

  picker.classList.remove("receipt-picker-hidden");
  picker.style.setProperty("display", "flex", "important");
  picker.style.removeProperty("height");
  picker.style.removeProperty("min-height");
  picker.style.removeProperty("max-height");
  picker.style.removeProperty("overflow");

  const motion = picker.animate(
    [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(-5px) scale(.985)" }
    ],
    { duration: 180, easing: "ease-out", fill: "forwards" }
  );

  picker._receiptMotion = motion;
  motion.onfinish = () => {
    if (picker._receiptMotion !== motion) return;
    picker.classList.add("receipt-picker-hidden");
    picker.style.setProperty("display", "none", "important");
    motion.cancel();
    picker._receiptMotion = null;
  };
}

function showReceiptPickerAnimated(picker) {
  if (picker._receiptMotion) {
    picker._receiptMotion.cancel();
    picker._receiptMotion = null;
  }

  picker.classList.remove("receipt-picker-hidden");
  picker.style.setProperty("display", "flex", "important");
  picker.style.removeProperty("height");
  picker.style.removeProperty("min-height");
  picker.style.removeProperty("max-height");
  picker.style.removeProperty("overflow");
  picker.style.removeProperty("opacity");
  picker.style.removeProperty("transform");

  const motion = picker.animate(
    [
      { opacity: 0, transform: "translateY(-5px) scale(.985)" },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ],
    { duration: 180, easing: "ease-out", fill: "forwards" }
  );

  picker._receiptMotion = motion;
  motion.onfinish = () => {
    if (picker._receiptMotion !== motion) return;
    motion.cancel();
    picker.style.removeProperty("opacity");
    picker.style.removeProperty("transform");
    picker._receiptMotion = null;
  };
}

function openReceiptFilePicker() {
  const input = document.getElementById("receiptFile");
  if (input) input.click();
}



async function uploadMiniReceipt() {
  const tg = window.Telegram && Telegram.WebApp;
  const fileInput = document.getElementById("receiptFile");
  const status = document.getElementById("orderStatus");
  const file = fileInput.files[0];

  if (!tg || !tg.initData || !activeOrderId) {
    status.textContent = "Order အချက်အလက် မရှိပါ။";
    return;
  }
  if (!file) {
    status.textContent = "Receipt ဖိုင်ရွေးပေးပါ။";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    status.textContent = "ဖိုင်အရွယ်အစား 8MB အောက်ဖြစ်ရပါမယ်။";
    return;
  }

  const form = new FormData();
  form.append("init_data", tg.initData);
  form.append("order_id", activeOrderId);
  form.append("receipt", file);
  setLoading(status, "Receipt ပို့နေပါတယ်");

  try {
    const response = await fetch(`${API_BASE_URL}/api/receipt`, {
      method: "POST",
      body: form
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Receipt ပို့မရပါ။");
    }

    status.textContent = result.message;
    fileInput.disabled = true;
    document.getElementById("status").textContent = result.message;

    document.getElementById("backToGames").click();
    const historyContent = document.getElementById("historyContent");
    historyContent.classList.add("hidden");
  } catch (error) {
    status.textContent = error.message || "Receipt ပို့မရပါ။";
  }
}

let historyVisibleCount = 5;
let historyFilter = "all";

function setHistoryFilter(filter, button) {
  historyFilter = filter;
  historyVisibleCount = 5;

  document.querySelectorAll("#historyFilterTabs button").forEach(function(tab) {
    tab.classList.remove("active");
    tab.setAttribute("aria-pressed", "false");
    tab.style.background = "";
    tab.style.borderColor = "";
    tab.style.color = "";
  });

  if (button) {
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
  }

  loadOrderHistory();
}

async function loadOrderHistory() {
  const statusBox = document.getElementById("historyStatus");
  const historyBox = document.getElementById("orderHistory");
  const refreshButton = document.getElementById("historyRefresh");
  const tg = window.Telegram && window.Telegram.WebApp;

  if (!tg || !tg.initData) {
    statusBox.textContent = "Telegram ထဲက Mini App ကို ဖွင့်ပြီးမှ Order History ကြည့်နိုင်ပါတယ်။";
    return;
  }

  setLoading(statusBox, "Order History ရယူနေပါတယ်");
  refreshButton.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({init_data: tg.initData})
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Order History ရယူမရပါ။");
    }

    const allOrders = Array.isArray(result.orders) ? result.orders : [];
    const terminalStatuses = ["completed", "rejected", "cancelled", "failed"];
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const orders = allOrders.filter(function(order) {
      const status = String(order.status || "").toLowerCase();

      if (terminalStatuses.includes(status) && order.created_at) {
        const created = Date.parse(String(order.created_at).replace(" ", "T"));
        if (Number.isFinite(created) && now - created > thirtyDays) {
          return false;
        }
      }

      if (historyFilter === "ongoing") {
        return ["pending_payment", "payment_checking", "payment_confirmed", "paid", "processing"].includes(status);
      }
      if (historyFilter === "success") {
        return status === "completed";
      }
      if (historyFilter === "failed") {
        return ["rejected", "cancelled", "failed"].includes(status);
      }
      return true;
    });

    orders.sort(function(a, b) {
      const dateA = Date.parse(String(a.created_at || "").replace(" ", "T")) || 0;
      const dateB = Date.parse(String(b.created_at || "").replace(" ", "T")) || 0;
      return dateB - dateA;
    });

    historyBox.replaceChildren();

    if (orders.length === 0) {
      statusBox.textContent = "ပြသရန် Order မရှိသေးပါ။";
      return;
    }

    const visibleOrders = orders.slice(0, historyVisibleCount);
    statusBox.textContent = "Order စုစုပေါင်း " + orders.length +
      " ခု၊ ယခုပြထားသည် " + visibleOrders.length + " ခု";

    const statusNames = {
      pending_payment: "💳 ငွေပေးချေရန်",
      payment_checking: "🔎 ငွေပေးချေမှု စစ်ဆေးနေသည်",
      payment_confirmed: "💰 ငွေလက်ခံပြီး",
      paid: "💰 ငွေလက်ခံပြီး",
      processing: "⚙️ လုပ်ဆောင်နေသည်",
      completed: "✅ ပြီးဆုံးပါပြီ",
      rejected: "❌ ပယ်ချထားသည်",
      cancelled: "❌ ပယ်ဖျက်ထားသည်",
      failed: "❌ မအောင်မြင်ပါ"
    };

    visibleOrders.forEach(function(order) {
      const card = document.createElement("div");
      const orderStatus = String(order.status || "").toLowerCase();
      const isPending = ["pending_payment", "payment_checking", "payment_confirmed", "paid", "processing"].includes(orderStatus);
      card.style.cssText = isPending
        ? "margin:12px 0;padding:14px;background:#3b2f12;border:2px solid #f59e0b;border-radius:12px;overflow-wrap:anywhere;"
        : "margin:12px 0;padding:14px;background:#1f2937;border:1px solid #374151;border-radius:12px;overflow-wrap:anywhere;";
      const details = [
        ["Order Number", order.order_code],
        ["Game", order.game],
        ["Package", order.package],
        ["Status", statusNames[String(order.status || "").toLowerCase()] || order.status || "—"]
      ];

      details.forEach(function(item) {
        const line = document.createElement("p");
        line.style.margin = "7px 0";
        line.textContent = item[0] + ": " + (item[1] == null ? "—" : String(item[1]));
        card.appendChild(line);
      });
      historyBox.appendChild(card);
    });

    if (orders.length > historyVisibleCount) {
      const moreButton = document.createElement("button");
      moreButton.type = "button";
      moreButton.textContent = "⬇️ နောက်ထပ်ကြည့်ရန် (" + (orders.length - historyVisibleCount) + " ခုကျန်)";
      moreButton.className = "history-more-button";
      moreButton.onclick = function() {
        historyVisibleCount += 5;
        loadOrderHistory();
      };
      historyBox.appendChild(moreButton);
    }
  } catch (error) {
    statusBox.textContent = error.message || "Order History ရယူရာတွင် ပြဿနာရှိပါတယ်။";
  } finally {
    refreshButton.disabled = false;
  }
}

if (window.Telegram && Telegram.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
}


function setHeadBannerVisible(visible) {
  const wrapper = document.getElementById("uiameowHeaderCollapse");
  if (!wrapper) return;

  wrapper.classList.toggle("is-collapsed", !visible);
  document.body.classList.toggle("header-collapsed", !visible);
}

function showPage(page) {
  document.querySelectorAll("#bottomNav button").forEach((button, index) => {
    const isActive = ["home", "orders", "support"][index] === page;
    button.classList.toggle("active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  setHeadBannerVisible(page === "home");
  const homeSections = [
    "status", "gamesSection", "packagesSection",
    "playerOrderSection", "fieldsSection", "orderSection"
  ];

  homeSections.forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });

  document.getElementById("historySection").classList.add("hidden");
  document.getElementById("supportSection").classList.add("hidden");

  if (page === "home") {
    document.getElementById("status").classList.remove("hidden");
    document.getElementById("gamesSection").classList.remove("hidden");
  } else if (page === "orders") {
    document.getElementById("historySection").classList.remove("hidden");

    const content = document.getElementById("historyContent");
    const wasHidden = content.classList.contains("hidden");

    content.classList.remove("hidden");

    if (wasHidden) {
      loadOrderHistory();
    }
  } else if (page === "support") {
    document.getElementById("supportSection").classList.remove("hidden");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function navHome() {
  selectedGame = null;
  selectedPackage = null;
  showPage("home");
}

function navOrders() {
  showPage("orders");
}

function navSupport() {
  showPage("support");
}

loadGames();
setInterval(function() {
  const historyContent = document.getElementById("historyContent");
  if (!historyContent.classList.contains("hidden")) {
    loadOrderHistory();
  }
}, 30000);

