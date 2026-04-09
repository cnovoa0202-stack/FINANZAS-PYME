import { useState, useEffect } from "react";

const SUPABASE_URL = "https://mgvaguwofeyscbwifyjq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndmFndXdvZmV5c2Nid2lmeWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjUxOTEsImV4cCI6MjA5MTAwMTE5MX0.nxJyVi8acRWHQBYT5dPPO1tNoGaD3PXr-6KbO0uYz_M";
const SECRET = "NOVRUCN";

const C = {
  bg: "#f4f6fb", white: "#ffffff", border: "#e8edf5",
  accent: "#2563eb", accentLight: "#eff6ff", accentBorder: "#bfdbfe",
  success: "#16a34a", successLight: "#f0fdf4", successBorder: "#bbf7d0",
  yape: "#7c3aed", yapeLight: "#f5f3ff", yapeBorder: "#ddd6fe",
  danger: "#dc2626", dangerLight: "#fff1f2", dangerBorder: "#fecdd3",
  text: "#0f172a", muted: "#64748b", dim: "#cbd5e1", overlay: "rgba(15,23,42,0.5)",
};

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

async function dbGet(negocio, mes) {
  try {
    const [year, month] = mes.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const lastDate = `${mes}-${String(lastDay).padStart(2, "0")}`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/registros?select=*&negocio=eq.${encodeURIComponent(negocio)}&fecha=gte.${mes}-01&fecha=lte.${lastDate}&order=id.asc`,
      { headers }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function dbInsert(row) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    return res.ok || res.status === 201;
  } catch { return false; }
}

async function dbDelete(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/registros?id=eq.${id}`, { method: "DELETE", headers });
  } catch {}
}

function BarChart({ allItems, currentMonth }) {
  const [year, month] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    const dateStr = `${currentMonth}-${d}`;
    const items = allItems.filter(r => r.fecha === dateStr);
    const ing = items.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
    const egr = items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
    return { day: i + 1, ing, egr };
  });
  const maxVal = Math.max(...days.map(d => Math.max(d.ing, d.egr)), 1);
  const todayDay = new Date().getDate();
  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, minWidth: daysInMonth * 18, padding: "0 4px" }}>
        {days.map(d => (
          <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 14 }}>
            <div style={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end", height: 80 }}>
              <div style={{ flex: 1, background: d.ing > 0 ? C.success : C.dim, borderRadius: "3px 3px 0 0", height: `${(d.ing / maxVal) * 100}%`, minHeight: d.ing > 0 ? 3 : 0 }} />
              <div style={{ flex: 1, background: d.egr > 0 ? C.danger : C.dim, borderRadius: "3px 3px 0 0", height: `${(d.egr / maxVal) * 100}%`, minHeight: d.egr > 0 ? 3 : 0 }} />
            </div>
            <div style={{ fontSize: 8, color: d.day === todayDay ? C.accent : C.muted, fontWeight: d.day === todayDay ? 800 : 400 }}>{d.day}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.success }} /> Ingresos</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.danger }} /> Egresos</div>
      </div>
    </div>
  );
}

// Gastos fijos por defecto
const DEFAULT_FIXED = [
  { id: "alquiler", label: "Alquiler", monto: 500, icon: "🏠" },
  { id: "internet", label: "Internet", monto: 20, icon: "📶" },
];

export default function App() {
  const [view, setView] = useState("daily");
  const [negocio, setNegocio] = useState("Librería");
  const [dueno, setDueno] = useState("");
  const [regimen, setRegimen] = useState("NRUS");
  const [editingInfo, setEditingInfo] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [allItems, setAllItems] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [desc, setDesc] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState("ingreso");
  const [saving, setSaving] = useState(false);
  const [informe, setInforme] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  // Gastos fijos editables
  const [fixedExpenses, setFixedExpenses] = useState(DEFAULT_FIXED);
  const [editingFixed, setEditingFixed] = useState(null);

  const currentMonth = selectedDate.slice(0, 7);
  const mesLabel = new Date(currentMonth + "-02").toLocaleString("es-PE", { month: "long", year: "numeric" });

  async function loadData() {
    setLoadingData(true);
    const data = await dbGet(negocio, currentMonth);
    setAllItems(data || []);
    setLoadingData(false);
  }

  useEffect(() => { loadData(); }, [currentMonth, negocio]);

  const dayItems = allItems.filter(r => r.fecha === selectedDate);
  const dayIngresos = dayItems.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
  const dayEgresos = dayItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const dayNet = dayIngresos - dayEgresos;
  const monthIngresos = allItems.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
  const monthEgresos = allItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const monthNet = monthIngresos - monthEgresos;
  const dateGroups = [...new Set(allItems.map(r => r.fecha))].sort((a, b) => b.localeCompare(a));

  async function addItem() {
    if (!desc.trim() || !monto || saving) return;
    setSaving(true); setError("");
    const row = { negocio, fecha: selectedDate, descripcion: desc.trim(), monto: Number(monto), tipo };
    const ok = await dbInsert(row);
    if (ok) { setDesc(""); setMonto(""); await loadData(); }
    else setError("No se pudo guardar. Verifica tu conexión.");
    setSaving(false);
  }

  // Registrar gasto fijo con un toque
  async function addFixedExpense(fixed) {
    if (saving) return;
    setSaving(true); setError("");
    const row = { negocio, fecha: selectedDate, descripcion: fixed.label, monto: fixed.monto, tipo: "egreso" };
    const ok = await dbInsert(row);
    if (ok) await loadData();
    else setError("No se pudo guardar.");
    setSaving(false);
  }

  async function removeItem(id) {
    await dbDelete(id);
    setAllItems(prev => prev.filter(i => i.id !== id));
  }

  function handleInformeClick() {
    if (unlocked) { setView("report"); setDrawerOpen(false); }
    else { setShowPassModal(true); setPassInput(""); setPassError(""); }
  }

  function handlePassSubmit() {
    if (passInput === SECRET) { setUnlocked(true); setShowPassModal(false); setView("report"); setDrawerOpen(false); }
    else setPassError("Contraseña incorrecta.");
  }

  async function generarInforme() {
    if (allItems.length === 0 || loadingIA) return;
    setLoadingIA(true); setInforme("");
    const sortedDates = [...new Set(allItems.map(r => r.fecha))].sort((a, b) => b.localeCompare(a));
    const desglose = sortedDates.map(d => {
      const items = allItems.filter(r => r.fecha === d);
      const ing = items.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
      const egr = items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
      const lbl = new Date(d + "T12:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
      return `${lbl}: Ingresos S/${ing.toFixed(2)}, Egresos S/${egr.toFixed(2)}, Neto S/${(ing - egr).toFixed(2)}`;
    }).join("\n");
    const detalle = allItems.map(i => {
      const tipoLabel = i.tipo === "ingreso-yape" ? "INGRESO YAPE" : i.tipo.toUpperCase();
      return `• [${tipoLabel}] ${i.descripcion}: S/${Number(i.monto).toFixed(2)}`;
    }).join("\n");
    const prompt = `Eres un asesor financiero experto en pequeñas empresas peruanas. Genera un informe de rentabilidad mensual claro y amigable. USA EMOJIS. Español peruano sencillo.

Secciones:
📋 RESUMEN DEL MES
💰 ANÁLISIS DE INGRESOS (diferencia entre efectivo y Yape si aplica)
💸 ANÁLISIS DE EGRESOS
📊 RESULTADO FINAL
✅ 3 RECOMENDACIONES CONCRETAS
⚠️ ALERTA SUNAT (régimen ${regimen})

DATOS: Negocio: ${negocio} | Dueño: ${dueno || "No especificado"} | Mes: ${mesLabel} | Régimen: ${regimen}
POR DÍA:\n${desglose}
DETALLE:\n${detalle}
TOTALES: Ingresos S/${monthIngresos.toFixed(2)} | Egresos S/${monthEgresos.toFixed(2)} | Neto S/${monthNet.toFixed(2)} (${monthNet >= 0 ? "GANANCIA" : "PÉRDIDA"})`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const json = await res.json();
      setInforme(json.content?.map(b => b.text || "").join("") || "Error al generar.");
    } catch { setInforme("Error de conexión."); }
    setLoadingIA(false);
  }

  const inp = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, padding: "10px 13px", width: "100%", fontFamily: "'DM Sans',sans-serif", outline: "none" };
  const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 };
  const lbl = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8, display: "block" };
  const spinner = { width: 15, height: 15, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" };

  // Color por tipo de item
  function itemColor(tipo) {
    if (tipo === "ingreso") return C.success;
    if (tipo === "ingreso-yape") return C.yape;
    return C.danger;
  }
  function itemLabel(tipo) {
    if (tipo === "ingreso") return "Efectivo";
    if (tipo === "ingreso-yape") return "Yape";
    return "Egreso";
  }

  function SumBox({ label, value, color, bg, border }) {
    return (
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color }}>{fmt(value)}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #2563eb !important; outline: none; box-shadow: 0 0 0 3px #eff6ff; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade { animation: fadeIn 0.25s ease; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .slide { animation: slideIn 0.25s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .quick-btn:active { transform: scale(0.96); }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: `linear-gradient(135deg, ${C.accent}, #1d4ed8)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>F</div>
          <div style={{ flex: 1 }}>
            {editingInfo ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ ...inp, padding: "6px 10px", fontSize: 13 }} value={negocio} onChange={e => setNegocio(e.target.value)} placeholder="Negocio" />
                <input style={{ ...inp, padding: "6px 10px", fontSize: 13 }} value={dueno} onChange={e => setDueno(e.target.value)} placeholder="Dueño" />
                <button onClick={() => setEditingInfo(false)} style={{ background: C.accent, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, padding: "6px 12px", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>OK</button>
              </div>
            ) : (
              <div onClick={() => setEditingInfo(true)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>{negocio}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{dueno || "Toca para editar"} · {regimen}</div>
              </div>
            )}
          </div>
          <select style={{ ...inp, width: "auto", padding: "6px 9px", fontSize: 11, marginRight: 6 }} value={regimen} onChange={e => setRegimen(e.target.value)}>
            <option value="NRUS">NRUS</option><option value="RER">RER</option>
            <option value="RMT">RMT</option><option value="General">General</option>
            <option value="Informal">Informal</option>
          </select>
          <button onClick={() => setDrawerOpen(true)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: "pointer", fontSize: 18, padding: "8px 10px" }}>☰</button>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", borderTop: `1px solid ${C.border}` }}>
          {[["daily", "📝", "Diario"], ["history", "📅", "Historial"]].map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "12px 8px", border: "none", background: "transparent", borderBottom: view === v ? `2px solid ${C.accent}` : "2px solid transparent", color: view === v ? C.accent : C.muted, fontWeight: view === v ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
        {error && <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.danger, marginBottom: 12 }}>⚠️ {error}</div>}

        {/* DAILY */}
        {view === "daily" && (
          <div className="fade">
            <div style={card}>
              <span style={lbl}>Fecha de registro</span>
              <input style={inp} type="date" value={selectedDate} max={todayStr()} onChange={e => setSelectedDate(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <SumBox label="Ingresos" value={dayIngresos} color={C.success} bg={C.successLight} border={C.successBorder} />
              <SumBox label="Egresos" value={dayEgresos} color={C.danger} bg={C.dangerLight} border={C.dangerBorder} />
              <SumBox label="Neto día" value={Math.abs(dayNet)} color={dayNet >= 0 ? C.success : C.danger} bg={dayNet >= 0 ? C.successLight : C.dangerLight} border={dayNet >= 0 ? C.successBorder : C.dangerBorder} />
            </div>

            {/* FORM */}
            <div style={card}>
              <span style={{ ...lbl, marginBottom: 10 }}>Nuevo movimiento</span>

              {/* Tipo selector - 3 opciones */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setTipo("ingreso")} style={{ padding: "10px 6px", border: `1px solid ${tipo === "ingreso" ? C.successBorder : C.border}`, borderRadius: 9, background: tipo === "ingreso" ? C.successLight : C.white, color: tipo === "ingreso" ? C.success : C.muted, fontWeight: tipo === "ingreso" ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  💵 Efectivo
                </button>
                <button onClick={() => setTipo("ingreso-yape")} style={{ padding: "10px 6px", border: `1px solid ${tipo === "ingreso-yape" ? C.yapeBorder : C.border}`, borderRadius: 9, background: tipo === "ingreso-yape" ? C.yapeLight : C.white, color: tipo === "ingreso-yape" ? C.yape : C.muted, fontWeight: tipo === "ingreso-yape" ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  📱 Yape
                </button>
                <button onClick={() => setTipo("egreso")} style={{ padding: "10px 6px", border: `1px solid ${tipo === "egreso" ? C.dangerBorder : C.border}`, borderRadius: 9, background: tipo === "egreso" ? C.dangerLight : C.white, color: tipo === "egreso" ? C.danger : C.muted, fontWeight: tipo === "egreso" ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  ❌ Egreso
                </button>
              </div>

              {/* Gastos fijos rápidos - solo cuando es egreso */}
              {tipo === "egreso" && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>⚡ Gastos fijos</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {fixedExpenses.map(fx => (
                      <div key={fx.id} style={{ display: "flex", alignItems: "center", gap: 0, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 9, overflow: "hidden" }}>
                        <button
                          className="quick-btn"
                          onClick={() => { setDesc(fx.label); setMonto(String(fx.monto)); }}
                          style={{ padding: "8px 12px", background: "transparent", border: "none", color: C.danger, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 5 }}
                        >
                          {fx.icon} {fx.label} <span style={{ fontWeight: 800 }}>{fmt(fx.monto)}</span>
                        </button>
                        <button
                          onClick={() => setEditingFixed(fx.id === editingFixed ? null : fx.id)}
                          style={{ padding: "8px 8px", background: "transparent", border: "none", borderLeft: `1px solid ${C.dangerBorder}`, color: C.muted, cursor: "pointer", fontSize: 12 }}
                        >✏️</button>
                      </div>
                    ))}
                  </div>

                  {/* Editor de monto fijo */}
                  {editingFixed && (
                    <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
                        Editar monto: {fixedExpenses.find(f => f.id === editingFixed)?.label}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          style={{ ...inp, flex: 1 }}
                          type="number"
                          defaultValue={fixedExpenses.find(f => f.id === editingFixed)?.monto}
                          onChange={e => setFixedExpenses(prev => prev.map(f => f.id === editingFixed ? { ...f, monto: Number(e.target.value) } : f))}
                          placeholder="Nuevo monto"
                        />
                        <button onClick={() => setEditingFixed(null)} style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, padding: "10px 14px", cursor: "pointer", fontSize: 13 }}>OK</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input style={{ ...inp, marginBottom: 8 }} value={desc} onChange={e => setDesc(e.target.value)}
                placeholder={tipo === "egreso" ? "Ej: Mercadería, pasajes..." : tipo === "ingreso-yape" ? "Ej: Venta por Yape..." : "Ej: Ventas del día, cuadernos..."}
                onKeyDown={e => e.key === "Enter" && addItem()} />
              <input style={{ ...inp, marginBottom: 10 }} type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="Monto en S/" onKeyDown={e => e.key === "Enter" && addItem()} />

              <button onClick={addItem} disabled={!desc || !monto || saving} style={{ width: "100%", background: tipo === "egreso" ? C.danger : tipo === "ingreso-yape" ? C.yape : C.success, border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px", cursor: (!desc || !monto || saving) ? "not-allowed" : "pointer", opacity: (!desc || !monto || saving) ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif" }}>
                {saving ? "⏳ Guardando..." : tipo === "ingreso" ? "+ Registrar Efectivo" : tipo === "ingreso-yape" ? "+ Registrar Yape" : "+ Registrar Egreso"}
              </button>
            </div>

            {/* Items del día */}
            <div style={card}>
              <span style={lbl}>Movimientos del día</span>
              {loadingData ? <div style={{ textAlign: "center", color: C.muted, padding: "16px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div style={spinner} /> Cargando...</div>
                : dayItems.length === 0 ? <div style={{ textAlign: "center", color: C.dim, padding: "16px 0", fontSize: 13, fontStyle: "italic" }}>Sin registros para este día</div>
                  : dayItems.map((item, idx) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "9px 0", borderBottom: idx === dayItems.length - 1 ? "none" : `1px solid ${C.border}` }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: itemColor(item.tipo), marginRight: 10, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13 }}>{item.descripcion}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: itemColor(item.tipo), background: item.tipo === "ingreso" ? C.successLight : item.tipo === "ingreso-yape" ? C.yapeLight : C.dangerLight, padding: "2px 7px", borderRadius: 20, marginRight: 8 }}>{itemLabel(item.tipo)}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: itemColor(item.tipo), marginRight: 8 }}>{fmt(item.monto)}</span>
                      <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 17, padding: "0 4px" }}>×</button>
                    </div>
                  ))}
            </div>

            {/* Resumen mes + gráfico */}
            <div style={card}>
              <span style={lbl}>📈 Resumen {mesLabel}</span>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Ingresos</div><div style={{ fontSize: 16, fontWeight: 800, color: C.success }}>{fmt(monthIngresos)}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Egresos</div><div style={{ fontSize: 16, fontWeight: 800, color: C.danger }}>{fmt(monthEgresos)}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Neto</div><div style={{ fontSize: 16, fontWeight: 800, color: monthNet >= 0 ? C.success : C.danger }}>{fmt(monthNet)}</div></div>
              </div>
              <BarChart allItems={allItems} currentMonth={currentMonth} />
            </div>
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div className="fade">
            <div style={card}>
              <span style={lbl}>Mes</span>
              <input style={inp} type="month" value={currentMonth} onChange={e => setSelectedDate(e.target.value + "-01")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <SumBox label="Ingresos" value={monthIngresos} color={C.success} bg={C.successLight} border={C.successBorder} />
              <SumBox label="Egresos" value={monthEgresos} color={C.danger} bg={C.dangerLight} border={C.dangerBorder} />
              <SumBox label={monthNet >= 0 ? "Ganancia" : "Pérdida"} value={Math.abs(monthNet)} color={monthNet >= 0 ? C.success : C.danger} bg={monthNet >= 0 ? C.successLight : C.dangerLight} border={monthNet >= 0 ? C.successBorder : C.dangerBorder} />
            </div>
            <div style={card}>
              <span style={lbl}>Gráfico del mes</span>
              <BarChart allItems={allItems} currentMonth={currentMonth} />
            </div>
            {loadingData ? <div style={{ textAlign: "center", color: C.muted, padding: "20px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div style={spinner} /> Cargando...</div>
              : dateGroups.length === 0 ? <div style={{ textAlign: "center", color: C.dim, padding: "20px 0", fontSize: 13, fontStyle: "italic" }}>No hay registros en este mes</div>
                : dateGroups.map(date => {
                  const items = allItems.filter(r => r.fecha === date);
                  const ing = items.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
                  const egr = items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
                  const net = ing - egr;
                  const lbl2 = new Date(date + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" });
                  return (
                    <div key={date} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                        <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{lbl2}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: net >= 0 ? C.success : C.danger }}>{net >= 0 ? "+" : ""}{fmt(net)}</span>
                      </div>
                      <div style={{ padding: "6px 14px" }}>
                        {items.map((item, idx) => (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "7px 0", borderBottom: idx === items.length - 1 ? "none" : `1px solid ${C.border}` }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: itemColor(item.tipo), marginRight: 9, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 12 }}>{item.descripcion}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: itemColor(item.tipo), background: item.tipo === "ingreso" ? C.successLight : item.tipo === "ingreso-yape" ? C.yapeLight : C.dangerLight, padding: "2px 6px", borderRadius: 20, marginRight: 8 }}>{itemLabel(item.tipo)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: itemColor(item.tipo), marginRight: 8 }}>{fmt(item.monto)}</span>
                            <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}

        {/* REPORT */}
        {view === "report" && (
          <div className="fade">
            <div style={{ ...card, background: C.accentLight, border: `1px solid ${C.accentBorder}` }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>Resumen · {mesLabel}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: C.muted }}>Ingresos: <b style={{ color: C.success }}>{fmt(monthIngresos)}</b></span>
                <span style={{ color: C.muted }}>Egresos: <b style={{ color: C.danger }}>{fmt(monthEgresos)}</b></span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: monthNet >= 0 ? C.success : C.danger }}>
                {monthNet >= 0 ? "✅ Ganancia: " : "❌ Pérdida: "}{fmt(Math.abs(monthNet))}
              </div>
            </div>
            <button onClick={generarInforme} disabled={allItems.length === 0 || loadingIA} style={{ width: "100%", background: C.accent, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, padding: "14px", cursor: "pointer", opacity: (allItems.length === 0 || loadingIA) ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif", marginBottom: 8 }}>
              {loadingIA ? "⏳ Generando informe..." : "📄 Generar Informe Mensual"}
            </button>
            {informe && !loadingIA && (
              <div style={{ ...card, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>📊 {negocio} · {mesLabel}</div>
                {informe}
              </div>
            )}
            {!informe && !loadingIA && <div style={{ textAlign: "center", color: C.dim, padding: "20px 0", fontSize: 13, fontStyle: "italic" }}>{allItems.length === 0 ? "Primero registra movimientos diarios" : "Presiona el botón para generar el informe"}</div>}
          </div>
        )}
      </div>

      {/* DRAWER */}
      {drawerOpen && (
        <div style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setDrawerOpen(false)}>
          <div className="slide" style={{ width: 260, background: C.white, borderLeft: `1px solid ${C.border}`, height: "100%", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{negocio}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>FinanzasPyme</div>
            </div>
            {[["daily", "📝", "Registro Diario", "Ingresos y egresos del día"], ["history", "📅", "Historial", "Movimientos por mes"]].map(([v, icon, label, sub]) => (
              <div key={v} onClick={() => { setView(v); setDrawerOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: view === v ? C.accentLight : "transparent", borderLeft: view === v ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div><div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: C.muted }}>{sub}</div></div>
              </div>
            ))}
            <div onClick={handleInformeClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: view === "report" ? C.accentLight : "transparent", borderLeft: view === "report" ? `3px solid ${C.accent}` : "3px solid transparent", marginTop: "auto", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Informe Mensual</div><div style={{ fontSize: 11, color: C.muted }}>Análisis de rentabilidad</div></div>
              {!unlocked && <span style={{ fontSize: 14, color: C.muted }}>🔒</span>}
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPassModal && (
        <div style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 320 }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>Acceso restringido</div>
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 20 }}>Ingresa la contraseña de administrador</div>
            <input autoFocus style={{ ...inp, fontSize: 18, textAlign: "center", letterSpacing: "4px" }} type="password" value={passInput} onChange={e => setPassInput(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handlePassSubmit()} />
            {passError && <div style={{ fontSize: 12, color: C.danger, textAlign: "center", marginTop: 8 }}>{passError}</div>}
            <button onClick={handlePassSubmit} style={{ width: "100%", background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px", cursor: "pointer", marginTop: 12, fontFamily: "'DM Sans',sans-serif" }}>Ingresar</button>
            <button onClick={() => setShowPassModal(false)} style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, fontSize: 14, padding: "10px", cursor: "pointer", marginTop: 8, fontFamily: "'DM Sans',sans-serif" }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
