const API_BASE = "https://kiosk-api-x9te.onrender.com";

let MENU = []; // ✅ const → let

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat("ko-KR").format(n) + "원";

const CART_KEY = "kiosk_cart_v1";

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); }
  catch { return {}; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartCount(cart) {
  return Object.values(cart).reduce((sum, n) => sum + n, 0);
}
function totalPrice(cart) {
  let sum = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const p = MENU.find((m) => m.id === id);
    if (p) sum += p.price * qty;
  }
  return sum;
}

function addToCart(id) {
  const cart = loadCart();
  cart[id] = (cart[id] || 0) + 1;
  saveCart(cart);
  render();
}
function setQty(id, qty) {
  const cart = loadCart();
  const n = Math.max(0, qty);
  if (n === 0) delete cart[id];
  else cart[id] = n;
  saveCart(cart);
  render();
}

function renderMenu() {
  const grid = $("#menuGrid");
  grid.innerHTML = MENU.map((m) => `
    <div class="card">
      <div class="name">${m.name}</div>
      <div class="desc">${m.desc ?? ""}</div>  <!-- ✅ 서버 메뉴엔 desc가 없어서 undefined 뜸 -->
      <div class="meta">
        <strong>${fmt(m.price)}</strong>
        <button class="btn" data-add="${m.id}">담기</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.onclick = () => addToCart(btn.dataset.add);
  });
}

function renderCart() {
  const cart = loadCart();
  const list = $("#cartList");

  const items = Object.entries(cart).map(([id, qty]) => {
    const p = MENU.find((m) => m.id === id);
    if (!p) return "";
    const line = p.price * qty;

    return `
      <div class="cartItem">
        <div>
          <div class="title">${p.name}</div>
          <div class="sub">${fmt(p.price)} × ${qty} = <strong>${fmt(line)}</strong></div>
        </div>
        <div class="qty">
          <button data-minus="${id}">−</button>
          <div class="n">${qty}</div>
          <button data-plus="${id}">+</button>
        </div>
      </div>
    `;
  }).filter(Boolean).join("");

  list.innerHTML = items || `<div class="muted" style="color:#a9a9b6;">장바구니가 비었어요.</div>`;

  list.querySelectorAll("[data-minus]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.minus;
      const cart = loadCart();
      setQty(id, (cart[id] || 0) - 1);
    };
  });
  list.querySelectorAll("[data-plus]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.plus;
      const cart = loadCart();
      setQty(id, (cart[id] || 0) + 1);
    };
  });

  $("#cartCount").textContent = cartCount(cart);
  $("#totalPrice").textContent = fmt(totalPrice(cart));
}

// ✅ doPay “하나짜리”로
async function doPay() {
  const cart = loadCart();
  const count = cartCount(cart);
  if (count === 0) return alert("장바구니가 비어 있어요!");

  const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  const sum = totalPrice(cart);

  let result;
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, total: sum }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} / ${txt}`);
    }

    result = await res.json();
    if (!result.ok) throw new Error(result.message || "주문 실패");
  } catch (e) {
    return alert("서버 주문 저장 실패: " + e.message);
  }

  const orderNo = String(result.orderId);

  const lines = items.map(({ id, qty }) => {
    const p = MENU.find((m) => m.id === id);
    if (!p) return "";
    return `${p.name} × ${qty}  (${fmt(p.price * qty)})`;
  }).filter(Boolean);

  const receipt = $("#receipt");
  receipt.hidden = false;
  receipt.innerHTML = `
    <div style="font-weight:900; font-size:18px;">주문 완료 ✅</div>
    <div class="muted" style="margin-top:6px;">주문번호: <strong>${orderNo}</strong></div>
    <div style="margin-top:10px; line-height:1.6;">
      ${lines.map((s) => `<div>• ${s}</div>`).join("")}
    </div>
    <div style="margin-top:10px; border-top:1px solid #2a2a35; padding-top:10px;">
      <div class="row"><span>결제금액</span><strong>${fmt(sum)}</strong></div>
      <div class="muted" style="margin-top:6px;">※ 서버에 주문이 저장되었습니다.</div>
    </div>
  `;

  localStorage.removeItem(CART_KEY);
  render();
}

function clearAll() {
  localStorage.removeItem(CART_KEY);
  $("#receipt").hidden = true;
  $("#receipt").innerHTML = "";
  render();
}

function render() {
  renderCart();
}

async function initMenu() {
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    MENU = await res.json();
    renderMenu();
    render();
    console.log("menu data =", MENU);
  } catch (e) {
    alert("메뉴 불러오기 실패");
    console.error("메뉴 불러오기 실패:", e);
  }
}

// SW 등록은 그대로 OK
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (e) {
    console.log("SW 등록 실패:", e);
  }
}

$("#btnPay").onclick = doPay;
$("#btnClear").onclick = clearAll;

initMenu();
registerSW();
