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
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("daily");
  
  // PERSISTENCIA: Inicializamos con lo que haya en localStorage o valores por defecto
  const [negocio, setNegocio] = useState(() => localStorage.getItem("pyme_negocio") || "Librería");
  const [dueno, setDueno] = useState(() => localStorage.getItem("pyme_dueno") || "");
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("pyme_unlocked") === "true");

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

  const currentMonth = selectedDate.slice(0, 7);
  const mesLabel = new Date(currentMonth + "-02").toLocaleString("es-PE", { month: "long", year: "numeric" });

  // PERSISTENCIA: Guardar cambios cuando cambien estas variables
  useEffect(() => { localStorage.setItem("pyme_negocio", negocio); }, [negocio]);
  useEffect(() => { localStorage.setItem("pyme_dueno", dueno); }, [dueno]);
  useEffect(() => { localStorage.setItem("pyme_unlocked", unlocked); }, [unlocked]);

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
    const prompt = `Eres un asesor financiero experto en pequeñas empresas peruanas. Genera un informe de rentabilidad mensual claro y amigable. USA EMOJIS. Español peruano sencillo. Secciones: 📋 RESUMEN DEL MES, 💰 ANÁLISIS DE INGRESOS, 💸 ANÁLISIS DE EGRESOS, 📊 RESULTADO FINAL, ✅ 3 RECOMENDACIONES CONCRETAS, ⚠️ ALERTA SUNAT (régimen ${regimen}). DATOS: Negocio: ${negocio} | Dueño: ${dueno || "No especificado"} | Mes: ${mesLabel} | Régimen: ${regimen} | TOTALES: Ingresos S/${monthIngresos.toFixed(2)} | Egresos S/${monthEgresos.toFixed(2)} | Neto S/${monthNet.toFixed(2)}`;
    
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
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
        input:focus { border-color: #2563eb !important; outline: none; box-shadow: 0 0 0 3px #eff6ff; }
        .fade { animation: fadeIn 0.25s ease; }
        .slide { animation: slideIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: `linear-gradient(135deg, ${C.accent}, #1d4ed8)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>F</div>
          <div style={{ flex: 1 }}>
            {editingInfo ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, padding: "6px 10px", width: "100%" }} value={negocio} onChange={e => setNegocio(e.target.value)} />
                <button onClick={() => setEditingInfo(false)} style={{ background: C.accent, border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", fontWeight: 700 }}>OK</button>
              </div>
            ) : (
              <div onClick={() => setEditingInfo(true)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{negocio}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{dueno || "Editar dueño"} · {regimen}</div>
              </div>
            )}
          </div>
          <button onClick={() => setDrawerOpen(true)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>☰</button>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", borderTop: `1px solid ${C.border}` }}>
          {[["daily", "📝", "Diario"], ["history", "📅", "Historial"]].map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "12px 8px", border: "none", background: "transparent", borderBottom: view === v ? `2px solid ${C.accent}` : "2px solid transparent", color: view === v ? C.accent : C.muted, fontWeight: view === v ? 700 : 500, cursor: "pointer" }}>{icon} {label}</button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
        {error && <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 10, padding: 10, color: C.danger, marginBottom: 12 }}>⚠️ {error}</div>}

        {view === "daily" && (
          <div className="fade">
            <input style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px", width: "100%", marginBottom: 12 }} type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ background: C.successLight, border: `1px solid ${C.successBorder}`, borderRadius: 12, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.success, fontWeight: 700 }}>INGRESOS</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.success }}>{fmt(dayIngresos)}</div>
              </div>
              <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 12, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.danger, fontWeight: 700 }}>EGRESOS</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.danger }}>{fmt(dayEgresos)}</div>
              </div>
              <div style={{ background: dayNet >= 0 ? C.successLight : C.dangerLight, border: `1px solid ${dayNet >= 0 ? C.successBorder : C.dangerBorder}`, borderRadius: 12, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: dayNet >= 0 ? C.success : C.danger, fontWeight: 700 }}>NETO DÍA</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: dayNet >= 0 ? C.success : C.danger }}>{fmt(dayNet)}</div>
              </div>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setTipo("ingreso")} style={{ padding: 10, borderRadius: 9, border: `1px solid ${tipo === "ingreso" ? C.successBorder : C.border}`, background: tipo === "ingreso" ? C.successLight : C.white, color: tipo === "ingreso" ? C.success : C.muted, fontWeight: 700 }}>✅ Ingreso</button>
                <button onClick={() => setTipo("egreso")} style={{ padding: 10, borderRadius: 9, border: `1px solid ${tipo === "egreso" ? C.dangerBorder : C.border}`, background: tipo === "egreso" ? C.dangerLight : C.white, color: tipo === "egreso" ? C.danger : C.muted, fontWeight: 700 }}>❌ Egreso</button>
              </div>
              <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: 10, width: "100%", marginBottom: 8 }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción..." />
              <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: 10, width: "100%", marginBottom: 10 }} type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="Monto S/" />
              <button onClick={addItem} style={{ width: "100%", background: tipo === "ingreso" ? C.success : C.danger, color: "#fff", padding: 12, borderRadius: 9, border: "none", fontWeight: 700 }}>{saving ? "..." : "+ Registrar"}</button>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
              {dayItems.map(item => (
                <div key={item.id} style={{ display: "flex", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{item.descripcion}</span>
                  <span style={{ fontWeight: 700, color: item.tipo === "ingreso" ? C.success : C.danger }}>{fmt(item.monto)}</span>
                  <button onClick={() => removeItem(item.id)} style={{ marginLeft: 10, color: C.dim, border: "none", background: "none" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mantenemos REPORT y HISTORY con la lógica original... */}
        {view === "report" && (
           <div className="fade">
             <button onClick={generarInforme} style={{ width: "100%", background: C.accent, color: "#fff", padding: 14, borderRadius: 12, border: "none", fontWeight: 800 }}>
               {loadingIA ? "Generando..." : "📄 Generar Informe Mensual"}
             </button>
             {informe && <div style={{ background: C.white, padding: 20, borderRadius: 14, marginTop: 12, whiteSpace: "pre-wrap" }}>{informe}</div>}
           </div>
        )}
      </div>

      {/* DRAWER & MODAL - Persistentes */}
      {drawerOpen && (
        <div style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 100 }} onClick={() => setDrawerOpen(false)}>
          <div className="slide" style={{ width: 260, background: "#fff", height: "100%", marginLeft: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, fontWeight: 800 }}>Menu</div>
            <div onClick={() => {setView("daily"); setDrawerOpen(false)}} style={{ padding: 15, cursor: "pointer" }}>📝 Registro Diario</div>
            <div onClick={() => {setView("history"); setDrawerOpen(false)}} style={{ padding: 15, cursor: "pointer" }}>📅 Historial</div>
            <div onClick={handleInformeClick} style={{ padding: 15, cursor: "pointer", borderTop: `1px solid ${C.border}` }}>📊 Informe {unlocked ? "" : "🔒"}</div>
          </div>
        </div>
      )}

      {showPassModal && (
        <div style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: 300 }}>
            <div style={{ textAlign: "center", marginBottom: 15 }}>🔒 Acceso Restringido</div>
            <input type="password" style={{ width: "100%", padding: 10, textAlign: "center" }} value={passInput} onChange={e => setPassInput(e.target.value)} />
            <button onClick={handlePassSubmit} style={{ width: "100%", background: C.accent, color: "#fff", padding: 10, marginTop: 10, borderRadius: 8, border: "none" }}>Entrar</button>
            <button onClick={() => setShowPassModal(false)} style={{ width: "100%", background: "none", padding: 5, color: C.muted, border: "none" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
