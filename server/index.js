const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database("kiosk.db");

// 테이블 생성
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL,
  total INTEGER NOT NULL,
  itemsJson TEXT NOT NULL
);
`);

// (선택) 메뉴를 서버에서 내려주고 싶으면 사용
const MENU = [
  { id: "ice1", name: "아메리카노", price: 2500 },
  { id: "ice2", name: "카페라떼", price: 3500 },
  { id: "ice3", name: "바닐라라떼", price: 3800 },
  { id: "ice4", name: "레몬에이드", price: 4200 },
  { id: "ice5", name: "아이스티", price: 3000 },
  { id: "ice6", name: "치즈케이크", price: 5200 }
];

// 헬스체크
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/menu", (req, res) => res.json(MENU));

// 주문 생성(키오스크 -> 서버)
app.post("/api/orders", (req, res) => {
  const { items, total } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: "items가 비어있습니다." });
  }
  if (typeof total !== "number" || total <= 0) {
    return res.status(400).json({ ok: false, message: "total이 올바르지 않습니다." });
  }

  const createdAt = new Date().toISOString();
  const status = "NEW";
  const itemsJson = JSON.stringify(items);

  const stmt = db.prepare(
    `INSERT INTO orders (createdAt, status, total, itemsJson) VALUES (?, ?, ?, ?)`
  );
  const info = stmt.run(createdAt, status, total, itemsJson);

  res.json({
    ok: true,
    orderId: info.lastInsertRowid,     // 주문번호로 써도 됨
    createdAt,
    status,
    total
  });
});

// 주문 목록(관리자)
app.get("/api/orders", (req, res) => {
  const rows = db.prepare(`SELECT * FROM orders ORDER BY id DESC`).all();
  const data = rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    status: r.status,
    total: r.total,
    items: JSON.parse(r.itemsJson)
  }));
  res.json({ ok: true, orders: data });
});

// 주문 상태 변경(관리자)
app.patch("/api/orders/:id", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowed = ["NEW", "COOKING", "DONE", "CANCEL"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, message: "status가 올바르지 않습니다." });
  }

  const info = db.prepare(`UPDATE orders SET status=? WHERE id=?`).run(status, id);
  res.json({ ok: true, changed: info.changes });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("API listening on", PORT));

app.get("/", (req, res) => {
  res.send("kiosk api running");
});
