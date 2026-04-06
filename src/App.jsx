import { useState, useEffect } from "react";

const SUPABASE_URL = "https://mgvaguwofeyscbwifyjq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndmFndXdvZmV5c2Nid2lmeWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjUxOTEsImV4cCI6MjA5MTAwMTE5MX0.nxJyVi8acRWHQBYT5dPPO1tNoGaD3PXr-6KbO0uYz_M";
const SECRET = "NOVRUCN";

const C = {
  bg: "#f4f6fb",
  white: "#ffffff",
  border: "#e8edf5",
  accent: "#2563eb",
  accentLight: "#eff6ff",
  accentBorder: "#bfdbfe",
  success: "#16a34a",
  successLight: "#f0fdf4",
  successBorder: "#bbf7d0",
  danger: "#dc2626",
  dangerLight: "#fff1f2",
  dangerBorder: "#fecdd3",
  text: "#0f172a",
  muted: "#64748b",
  dim: "#cbd5e1",
  overlay: "rgba(15,23,42,0.5)",
};

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
const todayStr = () => new Date().toISOString().split("T")[0];
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

async function dbGet(negocio, mes) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/registros?negocio=eq.${encodeURIComponent(negocio)}&fecha=gte.${mes}-01&fecha=lte.${mes}-31&order=fecha.asc,id.asc`, { headers });
  return res.ok ? res.json() : [];
}
async function dbInsert(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/registros`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(row) });
  if (!res.ok) return null;
  return (await res.json())[0];
}
async function dbDelete(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/registros?id=eq.${id}`, { method: "DELETE", headers });
}

function BarChart({ allItems, currentMonth }) {
  const daysInMonth = new Date(currentMonth.slice(0, 4), currentMonth.slice(5, 7), 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    const dateStr = `${currentMonth}-${d}`;
    const items = allItems.filter(r => r.fecha === dateStr);
    const ing = items.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
    const egr = items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
    return { day: i + 1, ing, egr, hasData: ing > 0 || egr > 0 };
  });

  const maxVal = Math.max(...days.map(d => Math.max(d.ing, d.egr)), 1);
  const today = new Date().getDate();

  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, minWidth: daysInMonth * 18, padding: "0 4px" }}>
        {days.map(d => (
          <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 14 }}>
            <div style={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end", height: 80 }}>
              <div style={{ flex: 1, background: d.ing > 0 ? C.success : C.dim, borderRadius: "3px 3px 0 0", height: `${(d.ing / maxVal) * 100}%`, minHeight: d.ing > 0 ? 3 : 0, transition: "height 0.3s" }} />
              <div style={{ flex: 1, background: d.egr > 0 ? C.danger : C.dim, borderRadius: "3px 3px 0 0", height: `${(d.egr / maxVal) * 100}%`, minHeight: d.egr > 0 ? 3 : 0, transition: "height 0.3s" }} />
            </div>
            <div style={{ fontSize: 8, color: d.day === today ? C.accent : C.muted, fontWeight: d.day === today ? 800 : 400 }}>{d.day}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.success }} /> Ingresos
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.danger }} /> Egresos
        </div>
      </div>
    </div>
  );
}

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

  const currentMonth = selectedDate.slice(0, 7);
  const mesLabel = new Date(currentMonth + "-02").toLocaleString("es-PE", { month: "long", year: "numeric" });

  useEffect(() => {
    async function load() {
      setLoadingData(true); setError("");
      try { const data = await dbGet(negocio, currentMonth); setAllItems(data || []); }
      catch { setError("Error al cargar datos."); }
      setLoadingData(false);
    }
    load();
  }, [currentMonth, negocio]);

  const dayItems = allItems.filter(r => r.fecha === selectedDate);
  const dayIngresos = dayItems.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
  const dayEgresos = dayItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const dayNet = dayIngresos - dayEgresos;
  const monthIngresos = allItems.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
  const monthEgresos = allItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const monthNet = monthIngresos - monthEgresos;
  const dateGroups = [...new Set(allItems.map(r => r.fecha))].sort((a, b) => b.localeCompare(a));

  async function addItem() {
    if (!desc.trim() || !monto || saving) return;
    setSaving(true); setError("");
    const row = { negocio, fecha: selectedDate, descripcion: desc.trim(), monto: Number(monto), tipo };
    const saved = await dbInsert(row);
    if (saved) { setAllItems(prev => [...prev, saved]); setDesc(""); setMonto(""); }
    else setError("No se pudo guardar. Intenta de nuevo.");
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
    const dateGroupsSorted = [...new Set(allItems.map(r => r.fecha))].sort((a, b) => b.localeCompare(a));
    const desglose = dateGroupsSorted.map(d => {
      const items = allItems.filter(r => r.fecha === d);
      const ing = items.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
      const egr = items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
      const lbl = new Date(d + "T12:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
      return `${lbl}: Ingresos S/${ing.toFixed(2)}, Egresos S/${egr.toFixed(2)}, Neto S/${(ing - egr).toFixed(2)}`;
    }).join("\n");
    const detalle = allItems.map(i => `• [${i.tipo.toUpperCase()}] ${i.descripcion}: S/${Number(i.monto).toFixed(2)}`).join("\n");
    const prompt = `Eres un asesor financiero experto en pequeñas empresas peruanas. Genera un informe de rentabilidad mensual claro y amigable. USA EMOJIS. Español peruano sencillo.

Secciones:
📋 RESUMEN DEL MES
💰 ANÁLISIS DE INGRESOS
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
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          model: "claude-sonnet-4-20250514", 
          max_tokens: 1000, 
          messages: [{ role: "user", content: prompt }] 
        }) 
      });
      const json = await res.json();
      setInforme(json.content?.map(b => b.text || "").join("") || "Error al generar.");
    } catch { setInforme("Error de conexión."); }
    setLoadingIA(false);
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
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: `linear-gradient(135deg, ${C.accent}, #1d4ed8)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>F</div>
          <div style={{ flex: 1 }}>
            {editingInfo ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "6px 10px", outline: "none", width: "100%" }} value={negocio} onChange={e => setNegocio(e.target.value)} placeholder="Negocio" />
                <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "6px 10px", outline: "none", width: "100%" }} value={dueno} onChange={e => setDueno(e.target.value)} placeholder="Dueño" />
                <button onClick={() => setEditingInfo(false)} style={{ background: C.accent, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, padding: "6px 12px", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>OK</button>
              </div>
            ) : (
              <div onClick={() => setEditingInfo(true)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", lineHeight: 1.1 }}>{negocio}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{dueno || "Toca para editar"} · {regimen}</div>
              </div>
            )}
          </div>
          <button onClick={() => setDrawerOpen(true)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: "pointer", fontSize: 18, padding: "8px 10px", display: "flex", alignItems: "center" }}>☰</button>
        </div>

        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", borderTop: `1px solid ${C.border}` }}>
          {[["daily", "📝", "Diario"], ["history", "📅", "Historial"]].map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "12px 8px", border: "none", background: "transparent", borderBottom: view === v ? `2px solid ${C.accent}` : "2px solid transparent", color: view === v ? C.accent : C.muted, fontWeight: view === v ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
        {error && <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.danger, marginBottom: 12 }}>⚠️ {error}</div>}

        {view === "daily" && (
          <div className="fade">
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Fecha de registro</div>
              <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, padding: "10px 13px", width: "100%", fontFamily: "'DM Sans',sans-serif" }} type="date" value={selectedDate} max={todayStr()} onChange={e => setSelectedDate(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[["Ingresos", dayIngresos, C.success, C.successLight, C.successBorder], ["Egresos", dayEgresos, C.danger, C.dangerLight, C.dangerBorder], ["Neto día", Math.abs(dayNet), dayNet >= 0 ? C.success : C.danger, dayNet >= 0 ? C.successLight : C.dangerLight, dayNet >= 0 ? C.successBorder : C.dangerBorder]].map(([lbl, val, color, bg, border]) => (
                <div key={lbl} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>{lbl}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color }}>{fmt(val)}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Nuevo movimiento</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setTipo("ingreso")} style={{ padding: "10px", border: `1px solid ${tipo === "ingreso" ? C.successBorder : C.border}`, borderRadius: 9, background: tipo === "ingreso" ? C.successLight : C.white, color: tipo === "ingreso" ? C.success : C.muted, fontWeight: tipo === "ingreso" ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✅ Ingreso</button>
                <button onClick={() => setTipo("egreso")} style={{ padding: "10px", border: `1px solid ${tipo === "egreso" ? C.dangerBorder : C.border}`, borderRadius: 9, background: tipo === "egreso" ? C.dangerLight : C.white, color: tipo === "egreso" ? C.danger : C.muted, fontWeight: tipo === "egreso" ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>❌ Egreso</button>
              </div>
              <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, padding: "10px 13px", width: "100%", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }} value={desc} onChange={e => setDesc(e.target.value)} placeholder={tipo === "ingreso" ? "Ej: Ventas del día, cuadernos..." : "Ej: Alquiler, luz, mercadería..."} onKeyDown={e => e.key === "Enter" && addItem()} />
              <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, padding: "10px 13px", width: "100%", marginBottom: 10, fontFamily: "'DM Sans',sans-serif" }} type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="Monto en S/" onKeyDown={e => e.key === "Enter" && addItem()} />
              <button onClick={addItem} disabled={!desc || !monto || saving} style={{ width: "100%", background: tipo === "ingreso" ? C.success : C.danger, border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px", cursor: (!desc || !monto || saving) ? "not-allowed" : "pointer", opacity: (!desc || !monto || saving) ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif" }}>
                {saving ? "⏳ Guardando..." : `+ Registrar ${tipo === "ingreso" ? "Ingreso" : "Egreso"}`}
              </button>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Movimientos del día</div>
              {loadingData ? <div style={{ textAlign: "center", color: C.muted, padding: "16px 0", fontSize: 13 }}>Cargando...</div>
                : dayItems.length === 0 ? <div style={{ textAlign: "center", color: C.dim, padding: "16px 0", fontSize: 13, fontStyle: "italic" }}>Sin registros para este día</div>
                  : dayItems.map((item, idx) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "9px 0", borderBottom: idx === dayItems.length - 1 ? "none" : `1px solid ${C.border}` }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.tipo === "ingreso" ? C.success : C.danger, marginRight: 10, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: C.text }}>{item.descripcion}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.tipo === "ingreso" ? C.success : C.danger, marginRight: 8 }}>{fmt(item.monto)}</span>
                      <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 17, padding: "0 4px" }}>×</button>
                    </div>
                  ))}
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>📈 Resumen {mesLabel}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Ingresos</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.success }}>{fmt(monthIngresos)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Egresos</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.danger }}>{fmt(monthEgresos)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Neto</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: monthNet >= 0 ? C.success : C.danger }}>{fmt(monthNet)}</div>
                </div>
              </div>
              <BarChart allItems={allItems} currentMonth={currentMonth} />
            </div>
          </div>
        )}

        {view === "history" && (
          <div className="fade">
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Mes</div>
              <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, padding: "10px 13px", width: "100%", fontFamily: "'DM Sans',sans-serif" }} type="month" value={currentMonth} onChange={e => setSelectedDate(e.target.value + "-01")} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[["Ingresos", monthIngresos, C.success, C.successLight, C.successBorder], ["Egresos", monthEgresos, C.danger, C.dangerLight, C.dangerBorder], [monthNet >= 0 ? "Ganancia" : "Pérdida", Math.abs(monthNet), monthNet >= 0 ? C.success : C.danger, monthNet >= 0 ? C.successLight : C.dangerLight, monthNet >= 0 ? C.successBorder : C.dangerBorder]].map(([lbl, val, color, bg, border]) => (
                <div key={lbl} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>{lbl}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color }}>{fmt(val)}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Gráfico del mes</div>
              <BarChart allItems={allItems} currentMonth={currentMonth} />
            </div>

            {loadingData ? <div style={{ textAlign: "center", color: C.muted, padding: "20px 0", fontSize: 13 }}>Cargando...</div>
              : dateGroups.length === 0 ? <div style={{ textAlign: "center", color: C.dim, padding: "20px 0", fontSize: 13, fontStyle: "italic" }}>No hay registros en este mes</div>
                : dateGroups.map(date => {
                  const items = allItems.filter(r => r.fecha === date);
                  const ing = items.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
                  const egr = items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
                  const net = ing - egr;
                  const lbl = new Date(date + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" });
                  return (
                    <div key={date} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                        <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{lbl}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: net >= 0 ? C.success : C.danger }}>{net >= 0 ? "+" : ""}{fmt(net)}</span>
                      </div>
                      <div style={{ padding: "6px 14px" }}>
                        {items.map((item, idx) => (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "7px 0", borderBottom: idx === items.length - 1 ? "none" : `1px solid ${C.border}` }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.tipo === "ingreso" ? C.success : C.danger, marginRight: 9, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 12, color: C.text }}>{item.descripcion}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: item.tipo === "ingreso" ? C.success : C.danger, marginRight: 8 }}>{fmt(item.monto)}</span>
                            <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}

        {view === "report" && (
          <div className="fade">
            <div style={{ background: C.accentLight, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>Resumen · {mesLabel}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: C.muted }}>Ingresos: <b style={{ color: C.success }}>{fmt(monthIngresos)}</b></span>
                <span style={{ color: C.muted }}>Egresos: <b style={{ color: C.danger }}>{fmt(monthEgresos)}</b></span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: monthNet >= 0 ? C.success : C.danger }}>
                {monthNet >= 0 ? "✅ Ganancia: " : "❌ Pérdida: "}{fmt(Math.abs(monthNet))}
              </div>
            </div>
            <button onClick={generarInforme} disabled={allItems.length === 0 || loadingIA} style={{ width: "100%", background: C.accent, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, padding: "14px", cursor: (allItems.length === 0 || loadingIA) ? "not-allowed" : "pointer", opacity: (allItems.length === 0 || loadingIA) ? 0.5 : 1, fontFamily: "'DM Sans',sans-serif", marginBottom: 8 }}>
              {loadingIA ? "⏳ Generando informe..." : "📄 Generar Informe Mensual"}
            </button>
            {loadingIA && <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 13, padding: "12px 0" }}><div style={{ width: 15, height: 15, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Procesando registros...</div>}
            {informe && !loadingIA && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8, marginTop: 4 }}>
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
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{negocio}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>FinanzasPyme</div>
            </div>
            {[["daily", "📝", "Registro Diario", "Ingresos y egresos del día"], ["history", "📅", "Historial", "Movimientos por mes"]].map(([v, icon, label, sub]) => (
              <div key={v} onClick={() => { setView(v); setDrawerOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: view === v ? C.accentLight : "transparent", borderLeft: view === v ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{label}</div><div style={{ fontSize: 11, color: C.muted }}>{sub}</div></div>
              </div>
            ))}
            <div onClick={handleInformeClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: view === "report" ? C.accentLight : "transparent", borderLeft: view === "report" ? `3px solid ${C.accent}` : "3px solid transparent", marginTop: "auto", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Informe Mensual</div><div style={{ fontSize: 11, color: C.muted }}>Análisis de rentabilidad</div></div>
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
            <input autoFocus style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 18, padding: "12px 14px", width: "100%", textAlign: "center", letterSpacing: "4px", fontFamily: "'DM Sans',sans-serif" }} type="password" value={passInput} onChange={e => setPassInput(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handlePassSubmit()} />
            {passError && <div style={{ fontSize: 12, color: C.danger, textAlign: "center", marginTop: 8 }}>{passError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <button onClick={() => setShowPassModal(false)} style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, fontSize: 14, fontWeight: 600, padding: "12px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handlePassSubmit} style={{ flex: 1, background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px", cursor: "pointer" }}>Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
