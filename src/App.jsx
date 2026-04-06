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
    return { day: i + 1, ing, egr };
  });

  const maxVal = Math.max(...days.map(d => Math.max(d.ing, d.egr)), 1);
  const today = new Date().getDate();

  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, minWidth: daysInMonth * 18, padding: "0 4px" }}>
        {days.map(d => (
          <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 14 }}>
            <div style={{ width: "100%", display: "flex", gap: 1, alignItems: "flex-end", height: 80 }}>
              <div style={{ flex: 1, background: d.ing > 0 ? C.success : C.dim, borderRadius: "3px 3px 0 0", height: `${(d.ing / maxVal) * 100}%`, minHeight: d.ing > 0 ? 3 : 0 }} />
              <div style={{ flex: 1, background: d.egr > 0 ? C.danger : C.dim, borderRadius: "3px 3px 0 0", height: `${(d.egr / maxVal) * 100}%`, minHeight: d.egr > 0 ? 3 : 0 }} />
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
  const [negocio, setNegocio] = useState(localStorage.getItem("negocio") || "Librería");
  const [dueno, setDueno] = useState(localStorage.getItem("dueno") || "Propietario");
  const [regimen, setRegimen] = useState(localStorage.getItem("regimen") || "NRUS");
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
      setLoadingData(true);
      const data = await dbGet(negocio, currentMonth);
      setAllItems(data || []);
      setLoadingData(false);
    }
    load();
  }, [currentMonth, negocio]);

  const saveConfig = () => {
    localStorage.setItem("negocio", negocio);
    localStorage.setItem("dueno", dueno);
    localStorage.setItem("regimen", regimen);
    setEditingInfo(false);
  };

  const dayItems = allItems.filter(r => r.fecha === selectedDate);
  const dayIngresos = dayItems.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
  const dayEgresos = dayItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const monthIngresos = allItems.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
  const monthEgresos = allItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const monthNet = monthIngresos - monthEgresos;

  async function addItem() {
    if (!desc.trim() || !monto || saving) return;
    setSaving(true);
    const row = { negocio, fecha: selectedDate, descripcion: desc.trim(), monto: Number(monto), tipo };
    const saved = await dbInsert(row);
    if (saved) { setAllItems(prev => [...prev, saved]); setDesc(""); setMonto(""); }
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

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: C.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>F</div>
          <div style={{ flex: 1 }}>
            {editingInfo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <input style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 12 }} value={negocio} onChange={e => setNegocio(e.target.value)} placeholder="Empresa" />
                <div style={{ display: "flex", gap: 4 }}>
                  <input style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 12 }} value={dueno} onChange={e => setDueno(e.target.value)} placeholder="Dueño" />
                  <select style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} value={regimen} onChange={e => setRegimen(e.target.value)}>
                    <option value="NRUS">NRUS</option>
                    <option value="MYPE">MYPE</option>
                    <option value="RER">RER</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                  <button onClick={saveConfig} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10 }}>OK</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingInfo(true)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{negocio} <span style={{ fontSize: 10, color: C.accent }}>✎</span></div>
                <div style={{ fontSize: 11, color: C.muted }}>{dueno} · {regimen}</div>
              </div>
            )}
          </div>
          <button onClick={() => setDrawerOpen(true)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>☰</button>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setView("daily")} style={{ flex: 1, padding: "12px", background: "none", border: "none", borderBottom: view === "daily" ? `2px solid ${C.accent}` : "none", color: view === "daily" ? C.accent : C.muted, fontWeight: "bold" }}>📝 Diario</button>
          <button onClick={() => setView("history")} style={{ flex: 1, padding: "12px", background: "none", border: "none", borderBottom: view === "history" ? `2px solid ${C.accent}` : "none", color: view === "history" ? C.accent : C.muted, fontWeight: "bold" }}>📅 Historial</button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px" }}>
        {view === "daily" && (
          <div>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 12 }} />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: C.successLight, padding: 12, borderRadius: 12, textAlign: "center", border: `1px solid ${C.successBorder}` }}>
                <div style={{ fontSize: 10, color: C.success, fontWeight: "bold" }}>INGRESOS</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(dayIngresos)}</div>
              </div>
              <div style={{ background: C.dangerLight, padding: 12, borderRadius: 12, textAlign: "center", border: `1px solid ${C.dangerBorder}` }}>
                <div style={{ fontSize: 10, color: C.danger, fontWeight: "bold" }}>EGRESOS</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(dayEgresos)}</div>
              </div>
            </div>

            <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setTipo("ingreso")} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: tipo === "ingreso" ? C.success : C.bg, color: tipo === "ingreso" ? "#fff" : C.muted, fontWeight: "bold" }}>Ingreso</button>
                <button onClick={() => setTipo("egreso")} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: tipo === "egreso" ? C.danger : C.bg, color: tipo === "egreso" ? "#fff" : C.muted, fontWeight: "bold" }}>Egreso</button>
              </div>
              <input style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 8 }} placeholder="Descripción" value={desc} onChange={e => setDesc(e.target.value)} />
              <input type="number" style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 12 }} placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} />
              <button onClick={addItem} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.text, color: "#fff", fontWeight: "bold" }}>Registrar Movimiento</button>
            </div>

            <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: C.muted, marginBottom: 10 }}>MOVIMIENTOS DEL DÍA</div>
              {dayItems.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13 }}>{item.descripcion}</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontWeight: "bold", color: item.tipo === "ingreso" ? C.success : C.danger }}>{fmt(item.monto)}</span>
                    <button onClick={() => removeItem(item.id)} style={{ border: "none", background: "none", color: "#ccc" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "history" && (
          <div>
             <div style={{ background: "#fff", padding: 16, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10 }}>Resumen de {mesLabel}</div>
                <BarChart allItems={allItems} currentMonth={currentMonth} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 15 }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 10 }}>Ingresos</div><div style={{ fontWeight: "bold", color: C.success }}>{fmt(monthIngresos)}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 10 }}>Egresos</div><div style={{ fontWeight: "bold", color: C.danger }}>{fmt(monthEgresos)}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 10 }}>Neto</div><div style={{ fontWeight: "bold", color: monthNet >= 0 ? C.success : C.danger }}>{fmt(monthNet)}</div></div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* MODAL CONTRASEÑA */}
      {showPassModal && (
        <div style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "100%", maxWidth: 300, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🔒</div>
            <div style={{ fontWeight: "bold", marginBottom: 5 }}>Área Restringida</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 15 }}>Ingresa la clave para ver informes</div>
            <input type="password" style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, textAlign: "center" }} value={passInput} onChange={e => setPassInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePassSubmit()} />
            {passError && <div style={{ color: C.danger, fontSize: 11, marginTop: 5 }}>{passError}</div>}
            <button onClick={handlePassSubmit} style={{ width: "100%", padding: 12, background: C.accent, color: "#fff", border: "none", borderRadius: 10, marginTop: 10, fontWeight: "bold" }}>Entrar</button>
            <button onClick={() => setShowPassModal(false)} style={{ background: "none", border: "none", color: C.muted, marginTop: 10, fontSize: 12 }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* DRAWER (Menú Lateral) */}
      {drawerOpen && (
        <div style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 100 }} onClick={() => setDrawerOpen(false)}>
          <div style={{ width: 260, background: "#fff", height: "100%", marginLeft: "auto", padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Menú</div>
            <div onClick={() => { setView("daily"); setDrawerOpen(false); }} style={{ padding: "15px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>📝 Registro Diario</div>
            <div onClick={() => { setView("history"); setDrawerOpen(false); }} style={{ padding: "15px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>📅 Historial Mensual</div>
            <div onClick={handleInformeClick} style={{ padding: "15px 0", cursor: "pointer", color: C.accent, fontWeight: "bold" }}>📊 Informe de Rentabilidad {!unlocked && "🔒"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
