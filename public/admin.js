const API_BASE = "http://localhost:4000";
const fmt = (n) => new Intl.NumberFormat("ko-KR").format(n) + "원";

async function loadOrders() {
  const el = document.querySelector("#list");
  el.innerHTML = "불러오는 중...";

  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const data = await res.json();
    if (!data.ok) throw new Error("불러오기 실패");

    el.innerHTML = data.orders.map(o => `
      <div class="cartItem" style="margin-bottom:10px;">
        <div>
          <div class="title">주문 #${o.id} <span style="color:#a9a9b6;font-weight:600;">(${o.status})</span></div>
          <div class="sub">${new Date(o.createdAt).toLocaleString()} · 총액 ${fmt(o.total)}</div>
          <div style="margin-top:8px; color:#a9a9b6; font-size:12px; line-height:1.6;">
            ${o.items.map(it => `• ${it.id} × ${it.qty}`).join("<br/>")}
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <button class="btn" data-s="COOKING" data-id="${o.id}">조리중</button>
          <button class="btn primary" data-s="DONE" data-id="${o.id}">완료</button>
          <button class="btn ghost" data-s="CANCEL" data-id="${o.id}">취소</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll("[data-s]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const status = btn.dataset.s;
        await fetch(`${API_BASE}/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        loadOrders();
      };
    });

  } catch (e) {
    el.innerHTML = "에러: " + e.message;
  }
}

document.querySelector("#btnRefresh").onclick = loadOrders;
loadOrders();
const API_BASE = "https://kiosk-api-x9te.onrender.com";

const $ = (s) => document.querySelector(s);
const fmt = (n) => new Intl.NumberFormat("ko-KR").format(n) + "원";

let timer = null;
let lastOrders = [];

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status} / ${txt}`);
  }
  return res.json();
}

// ✅ 서버가 이 형태로 내려준다고 가정(권장):
// GET /api/orders  -> [{orderId, status, total, createdAt, items:[{id,qty}]} ...]
// 만약 서버 응답이 다르면 여기에서 매핑만 바꾸면 됨.
async function loadOrders() {
  $("#stat").textContent = "불러오는 중...";
  try {
    const data = await api("/api/orders");
    lastOrders = Array.isArray(data) ? data : (data.orders || []);
    $("#stat").textContent = `총 ${lastOrders.length}건`;
    render();
  } catch (e) {
    $("#stat").textContent = "불러오기 실패";
    $("#tbody").innerHTML = `<tr><td colspan="6" class="muted">에러: ${e.message}</td></tr>`;
  }
}

function matchFilter(o) {
  const q = ($("#q").value || "").trim();
  const st = $("#statusFilter").value;

  if (q && String(o.orderId) !== q) return false;
  if (st !== "ALL" && o.status !== st) return false;
  return true;
}

function itemText(order) {
  // items가 없으면 표시가 어려워서 안전 처리
  const items = order.items || [];
  if (!items.length) return `<span class="muted">items 없음</span>`;
  return items.map(it => `${it.id}×${it.qty}`).join(", ");
}

function render() {
  const rows = lastOrders
    .filter(matchFilter)
    // 최신이 위로 오게 (createdAt 기준). 없으면 orderId desc
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "") || (b.orderId - a.orderId))
    .map((o) => {
      const created = o.createdAt ? new Date(o.createdAt).toLocaleString("ko-KR") : "-";
      return `
        <tr>
          <td class="mono">${o.orderId ?? "-"}</td>
          <td><span class="pill ${o.status}">${o.status}</span></td>
          <td class="mono">${itemText(o)}</td>
          <td>${fmt(o.total ?? 0)}</td>
          <td class="mono">${created}</td>
          <td>
            <button class="btn" data-act="PREPARING" data-id="${o.orderId}">PREPARING</button>
            <button class="btn primary" data-act="DONE" data-id="${o.orderId}">DONE</button>
            <button class="btn danger" data-act="CANCELLED" data-id="${o.orderId}">CANCEL</button>
          </td>
        </tr>
      `;
    })
    .join("");

  $("#tbody").innerHTML = rows || `<tr><td colspan="6" class="muted">표시할 주문이 없습니다.</td></tr>`;

  // 액션 바인딩
  $("#tbody").querySelectorAll("button[data-id]").forEach((btn) => {
    btn.onclick = () => updateStatus(btn.dataset.id, btn.dataset.act);
  });
}

// ✅ 상태 변경 (서버에 라우트가 있어야 함)
// PATCH /api/orders/:id  body: { status: "DONE" }
async function updateStatus(orderId, status) {
  if (!orderId) return;
  const ok = confirm(`주문 #${orderId} 상태를 ${status}로 바꿀까요?`);
  if (!ok) return;

  try {
    await api(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadOrders();
  } catch (e) {
    alert("상태 변경 실패: " + e.message);
  }
}

function setAutoRefresh(ms) {
  if (timer) clearInterval(timer);
  timer = null;
  if (ms > 0) timer = setInterval(loadOrders, ms);
}

$("#btnRefresh").onclick = loadOrders;
$("#q").oninput = render;
$("#statusFilter").onchange = render;

$("#refreshSel").onchange = () => {
  const ms = Number($("#refreshSel").value);
  setAutoRefresh(ms);
};

// 시작
loadOrders();
setAutoRefresh(Number($("#refreshSel").value));
