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
