import { useState, useEffect } from "react";
import { supabase, dniRucToAuthEmail } from "./supabaseClient";

const C = {
  bg: "#0b0b0f", white: "#18181f", border: "#2a2a33",
  accent: "#e4002b", accentLight: "#2a1015", accentBorder: "#5c1420",
  success: "#4ade80", successLight: "#132118", successBorder: "#1f4a30",
  yape: "#c4b5fd", yapeLight: "#211a35", yapeBorder: "#4c3d78",
  danger: "#f87171", dangerLight: "#2a1416", dangerBorder: "#5c2328",
  text: "#f4f4f6", muted: "#9a9aa5", dim: "#3d3d47", overlay: "rgba(0,0,0,0.75)",
  brand: "#e4002b",
};

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const inp = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, padding: "10px 13px", width: "100%", fontFamily: "'DM Sans',sans-serif", outline: "none" };
const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 };
const lbl = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8, display: "block" };
const spinner = { width: 15, height: 15, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" };

const wordmark = { fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 800 };

const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input, select { color-scheme: dark; }
  input:focus, select:focus { border-color: ${C.accent} !important; outline: none; box-shadow: 0 0 0 3px rgba(228,0,43,0.25); }
  input::placeholder { color: ${C.dim}; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .fade { animation: fadeIn 0.25s ease; }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .slide { animation: slideIn 0.25s ease; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .quick-btn:active { transform: scale(0.96); }
`;

function isValidDniRuc(v) {
  return /^\d{8}$|^\d{11}$/.test(v.trim());
}

async function dbGet(userId, mes) {
  const [year, month] = mes.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const lastDate = `${mes}-${String(lastDay).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("registros")
    .select("*")
    .eq("user_id", userId)
    .gte("fecha", `${mes}-01`)
    .lte("fecha", lastDate)
    .order("id", { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbInsert(row) {
  const { error } = await supabase.from("registros").insert(row);
  return !error;
}

async function dbDelete(id) {
  await supabase.from("registros").delete().eq("id", id);
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

function SumBox({ label, value, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color }}>{fmt(value)}</div>
    </div>
  );
}

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

function Icon({ name, size = 18, color = "currentColor", strokeWidth = 2, style }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", style };
  switch (name) {
    case "cash": return <svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></svg>;
    case "phone": return <svg {...p}><rect x="6" y="2" width="12" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>;
    case "arrow-down-circle": return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12l4 4 4-4" /></svg>;
    case "edit": return <svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
    case "pencil": return <svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case "bar-chart": return <svg {...p}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
    case "log-out": return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
    case "menu": return <svg {...p}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
    case "zap": return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case "plus": return <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "trending-up": return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
    case "alert-triangle": return <svg {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "check-circle": return <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
    case "eye": return <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "home": return <svg {...p}><path d="M3 9l9-7 9 7" /><path d="M9 22V12h6v10" /></svg>;
    case "wifi": return <svg {...p}><path d="M5 13a10 10 0 0 1 14 0" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>;
    default: return null;
  }
}

// Gastos fijos por defecto
const DEFAULT_FIXED = [
  { id: "alquiler", label: "Alquiler", monto: 500, icon: "home" },
  { id: "internet", label: "Internet", monto: 20, icon: "wifi" },
];

function AuthScreen({ onPreview }) {
  const [mode, setMode] = useState("login");
  const [dniRuc, setDniRuc] = useState("");
  const [password, setPassword] = useState("");
  const [negocio, setNegocio] = useState("");
  const [dueno, setDueno] = useState("");
  const [regimen, setRegimen] = useState("NRUS");
  const [emailContacto, setEmailContacto] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleLogoChange(e) {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit() {
    setError("");
    if (!isValidDniRuc(dniRuc)) {
      setError("Ingresa un DNI (8 dígitos) o RUC (11 dígitos) válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (mode === "signup" && !negocio.trim()) {
      setError("Ingresa el nombre de tu negocio.");
      return;
    }
    setLoading(true);
    const email = dniRucToAuthEmail(dniRuc);

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError("DNI/RUC o contraseña incorrectos.");
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(
          err.message.toLowerCase().includes("already") || err.message.toLowerCase().includes("exist")
            ? "Ese DNI/RUC ya está registrado."
            : "No se pudo registrar. Intenta de nuevo."
        );
      } else if (data.user) {
        const { error: perfilErr } = await supabase.from("perfiles").insert({
          id: data.user.id,
          dni_ruc: dniRuc.trim(),
          negocio: negocio.trim(),
          dueno: dueno.trim() || null,
          regimen,
          email_contacto: emailContacto.trim() || null,
        });
        if (perfilErr) {
          setError("Tu cuenta se creó, pero no se pudo guardar el perfil. Contáctanos.");
        } else if (logoFile) {
          const ext = logoFile.name.split(".").pop() || "png";
          const path = `${data.user.id}/logo.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("logos")
            .upload(path, logoFile, { upsert: true });
          if (!uploadErr) {
            const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
            await supabase.from("perfiles").update({ logo_url: pub.publicUrl }).eq("id", data.user.id);
          }
        }
      }
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ ...wordmark, fontSize: 34, color: C.brand, letterSpacing: "0.5px" }}>TUCHAMBA</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Control diario de ingresos y egresos</div>
        </div>

        <div style={{ display: "flex", marginBottom: 16, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
          <button onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: "9px", border: "none", borderRadius: 7, background: mode === "login" ? C.accent : "transparent", color: mode === "login" ? "#fff" : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Entrar</button>
          <button onClick={() => { setMode("signup"); setError(""); }} style={{ flex: 1, padding: "9px", border: "none", borderRadius: 7, background: mode === "signup" ? C.accent : "transparent", color: mode === "signup" ? "#fff" : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Registrarme</button>
        </div>

        <div style={card}>
          <span style={lbl}>DNI o RUC</span>
          <input style={{ ...inp, marginBottom: 12 }} value={dniRuc} onChange={e => setDniRuc(e.target.value.replace(/\D/g, ""))} placeholder="Ej: 45678912" maxLength={11} inputMode="numeric" />

          <span style={lbl}>Contraseña</span>
          <input style={{ ...inp, marginBottom: mode === "signup" ? 12 : 0 }} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && mode === "login" && submit()} />

          {mode === "signup" && (
            <>
              <span style={lbl}>Nombre del negocio</span>
              <input style={{ ...inp, marginBottom: 12 }} value={negocio} onChange={e => setNegocio(e.target.value)} placeholder="Ej: Librería El Estudiante" />

              <span style={lbl}>Dueño (opcional)</span>
              <input style={{ ...inp, marginBottom: 12 }} value={dueno} onChange={e => setDueno(e.target.value)} placeholder="Tu nombre" />

              <span style={lbl}>Régimen tributario</span>
              <select style={{ ...inp, marginBottom: 12 }} value={regimen} onChange={e => setRegimen(e.target.value)}>
                <option value="NRUS">NRUS</option><option value="RER">RER</option>
                <option value="RMT">RMT</option><option value="General">General</option>
                <option value="Informal">Informal</option>
              </select>

              <span style={lbl}>Email de contacto (opcional)</span>
              <input style={{ ...inp, marginBottom: 12 }} type="email" value={emailContacto} onChange={e => setEmailContacto(e.target.value)} placeholder="Para soporte, no para iniciar sesión" />

              <span style={lbl}>Logo del negocio (opcional)</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                {logoPreview && (
                  <img src={logoPreview} alt="Logo" style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: `1px solid ${C.border}` }} />
                )}
                <input style={{ ...inp, fontSize: 12, padding: "8px 10px" }} type="file" accept="image/*" onChange={handleLogoChange} />
              </div>
            </>
          )}

          {error && <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: C.danger, marginTop: 4, marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}><Icon name="alert-triangle" size={14} /> {error}</div>}

          <button onClick={submit} disabled={loading} style={{ width: "100%", background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 14, fontFamily: "'DM Sans',sans-serif" }}>
            {loading ? "Un momento..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </div>

        {import.meta.env.DEV && (
          <button onClick={onPreview} style={{ width: "100%", background: "transparent", border: "none", color: C.muted, fontSize: 12, padding: "14px 0 0", cursor: "pointer", textAlign: "center", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="eye" size={13} /> <span style={{ textDecoration: "underline" }}>Ver vista previa con datos de ejemplo (sin conexión)</span>
          </button>
        )}
      </div>
    </div>
  );
}

const PREVIEW_PERFIL = { negocio: "Bodega Don Chamba", dueno: "Juan Pérez", regimen: "NRUS" };

function buildPreviewItems() {
  const d = new Date();
  const dateOffset = (n) => {
    const x = new Date(d);
    x.setDate(x.getDate() - n);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  return [
    { id: "preview-1", fecha: dateOffset(0), descripcion: "Ventas del día, cuadernos", monto: 85, tipo: "ingreso" },
    { id: "preview-2", fecha: dateOffset(0), descripcion: "Venta por Yape", monto: 45, tipo: "ingreso-yape" },
    { id: "preview-3", fecha: dateOffset(0), descripcion: "Mercadería", monto: 60, tipo: "egreso" },
    { id: "preview-4", fecha: dateOffset(1), descripcion: "Ventas del día", monto: 120, tipo: "ingreso" },
    { id: "preview-5", fecha: dateOffset(1), descripcion: "Alquiler", monto: 150, tipo: "egreso" },
    { id: "preview-6", fecha: dateOffset(3), descripcion: "Venta por Yape", monto: 70, tipo: "ingreso-yape" },
    { id: "preview-7", fecha: dateOffset(3), descripcion: "Internet", monto: 20, tipo: "egreso" },
    { id: "preview-8", fecha: dateOffset(5), descripcion: "Ventas del día", monto: 95, tipo: "ingreso" },
  ];
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando sesión
  const [perfil, setPerfil] = useState(undefined); // undefined = cargando perfil
  const [previewMode, setPreviewMode] = useState(false);

  const [view, setView] = useState("daily");
  const [editingInfo, setEditingInfo] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [allItems, setAllItems] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [desc, setDesc] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState("ingreso");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [editingFixed, setEditingFixed] = useState(null);
  const [addingFixed, setAddingFixed] = useState(false);
  const [newFixedLabel, setNewFixedLabel] = useState("");
  const [newFixedMonto, setNewFixedMonto] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setPerfil(undefined); return; }
    let cancelled = false;
    supabase.from("perfiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
      if (!cancelled) setPerfil(data || { negocio: "Mi Negocio", dueno: "", regimen: "NRUS" });
    });
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (previewMode) {
      setFixedExpenses(DEFAULT_FIXED.map((f, i) => ({ ...f, id: `preview-fx-${i}` })));
      return;
    }
    if (!session) { setFixedExpenses([]); return; }
    let cancelled = false;
    supabase.from("gastos_fijos").select("*").eq("user_id", session.user.id).order("id", { ascending: true }).then(async ({ data }) => {
      if (cancelled) return;
      if (data && data.length > 0) { setFixedExpenses(data); return; }
      const seeds = DEFAULT_FIXED.map(f => ({ user_id: session.user.id, label: f.label, monto: f.monto, icon: f.icon }));
      const { data: inserted } = await supabase.from("gastos_fijos").insert(seeds).select();
      if (!cancelled) setFixedExpenses(inserted || []);
    });
    return () => { cancelled = true; };
  }, [session, previewMode]);

  const currentMonth = selectedDate.slice(0, 7);
  const mesLabel = new Date(currentMonth + "-02").toLocaleString("es-PE", { month: "long", year: "numeric" });

  async function loadData() {
    if (!session || previewMode) return;
    setLoadingData(true);
    const data = await dbGet(session.user.id, currentMonth);
    setAllItems(data || []);
    setLoadingData(false);
  }

  useEffect(() => { if (session && !previewMode) loadData(); }, [currentMonth, session, previewMode]);

  function startPreview() {
    setPerfil({ ...PREVIEW_PERFIL });
    setAllItems(buildPreviewItems());
    setPreviewMode(true);
  }

  const dayItems = allItems.filter(r => r.fecha === selectedDate);
  const dayIngresos = dayItems.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
  const dayEgresos = dayItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const dayNet = dayIngresos - dayEgresos;
  const monthIngresos = allItems.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
  const monthEgresos = allItems.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
  const monthNet = monthIngresos - monthEgresos;
  const dateGroups = [...new Set(allItems.map(r => r.fecha))].sort((a, b) => b.localeCompare(a));
  const pendingFixed = fixedExpenses.filter(fx => !allItems.some(r => r.tipo === "egreso" && r.descripcion === fx.label));

  async function addItem() {
    if (!desc.trim() || !monto || saving) return;
    if (previewMode) {
      setAllItems(prev => [...prev, { id: `preview-${Date.now()}`, fecha: selectedDate, descripcion: desc.trim(), monto: Number(monto), tipo }]);
      setDesc(""); setMonto("");
      return;
    }
    if (!session) return;
    setSaving(true); setError("");
    const row = { user_id: session.user.id, fecha: selectedDate, descripcion: desc.trim(), monto: Number(monto), tipo };
    const ok = await dbInsert(row);
    if (ok) { setDesc(""); setMonto(""); await loadData(); }
    else setError("No se pudo guardar. Verifica tu conexión.");
    setSaving(false);
  }

  async function addFixedExpense(fixed) {
    if (saving) return;
    if (previewMode) {
      setAllItems(prev => [...prev, { id: `preview-${Date.now()}`, fecha: selectedDate, descripcion: fixed.label, monto: fixed.monto, tipo: "egreso" }]);
      return;
    }
    if (!session) return;
    setSaving(true); setError("");
    const row = { user_id: session.user.id, fecha: selectedDate, descripcion: fixed.label, monto: fixed.monto, tipo: "egreso" };
    const ok = await dbInsert(row);
    if (ok) await loadData();
    else setError("No se pudo guardar.");
    setSaving(false);
  }

  async function addCustomFixed() {
    if (!newFixedLabel.trim() || !newFixedMonto) return;
    if (previewMode) {
      setFixedExpenses(prev => [...prev, { id: `preview-fx-${Date.now()}`, label: newFixedLabel.trim(), monto: Number(newFixedMonto), icon: "zap" }]);
    } else if (session) {
      const { data } = await supabase.from("gastos_fijos").insert({ user_id: session.user.id, label: newFixedLabel.trim(), monto: Number(newFixedMonto), icon: "zap" }).select().single();
      if (data) setFixedExpenses(prev => [...prev, data]);
    }
    setNewFixedLabel(""); setNewFixedMonto(""); setAddingFixed(false);
  }

  async function removeFixedExpense(id) {
    if (!previewMode) await supabase.from("gastos_fijos").delete().eq("id", id);
    setFixedExpenses(prev => prev.filter(f => f.id !== id));
    if (editingFixed === id) setEditingFixed(null);
  }

  async function commitFixedMonto(fx) {
    if (!previewMode) await supabase.from("gastos_fijos").update({ monto: fx.monto }).eq("id", fx.id);
  }

  async function removeItem(id) {
    if (!previewMode) await dbDelete(id);
    setAllItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleLogout() {
    if (!previewMode) await supabase.auth.signOut();
    setPreviewMode(false);
    setDrawerOpen(false);
    setView("daily");
    setAllItems([]);
    setAdminData(null);
    setEditingFixed(null);
    setAddingFixed(false);
  }

  async function commitPerfilEdits() {
    if (previewMode) { setEditingInfo(false); return; }
    if (!session || !perfil) { setEditingInfo(false); return; }
    await supabase.from("perfiles").update({ negocio: perfil.negocio, dueno: perfil.dueno }).eq("id", session.user.id);
    setEditingInfo(false);
  }

  async function updateLogo(file) {
    if (!file) return;
    if (previewMode) {
      setPerfil(prev => (prev ? { ...prev, logo_url: URL.createObjectURL(file) } : prev));
      return;
    }
    if (!session) return;
    setError("");
    const ext = file.name.split(".").pop() || "png";
    const path = `${session.user.id}/logo.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadErr) { setError("No se pudo subir el logo."); return; }
    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    const logoUrl = `${pub.publicUrl}?t=${Date.now()}`;
    await supabase.from("perfiles").update({ logo_url: logoUrl }).eq("id", session.user.id);
    setPerfil(prev => (prev ? { ...prev, logo_url: logoUrl } : prev));
  }

  async function handleRegimenChange(value) {
    setPerfil(prev => (prev ? { ...prev, regimen: value } : prev));
    if (session && !previewMode) await supabase.from("perfiles").update({ regimen: value }).eq("id", session.user.id);
  }

  const tipoTotales = {
    efectivo: allItems.filter(r => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0),
    yape: allItems.filter(r => r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0),
    egresos: monthEgresos,
  };

  async function loadAdminData() {
    if (!session || previewMode) return;
    setLoadingAdmin(true);
    const [year, month] = currentMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const lastDate = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;
    const [{ data: perfiles }, { data: registros }] = await Promise.all([
      supabase.from("perfiles").select("id, negocio, dueno, regimen"),
      supabase.from("registros").select("*").gte("fecha", `${currentMonth}-01`).lte("fecha", lastDate),
    ]);
    const porNegocio = (perfiles || []).map(p => {
      const items = (registros || []).filter(r => r.user_id === p.id);
      const ing = items.filter(r => r.tipo === "ingreso" || r.tipo === "ingreso-yape").reduce((s, r) => s + Number(r.monto), 0);
      const egr = items.filter(r => r.tipo === "egreso").reduce((s, r) => s + Number(r.monto), 0);
      return { ...p, ingresos: ing, egresos: egr, neto: ing - egr, movimientos: items.length };
    });
    setAdminData(porNegocio);
    setLoadingAdmin(false);
  }

  useEffect(() => { if (view === "admin" && perfil?.rol === "admin") loadAdminData(); }, [view, currentMonth]);

  if (!previewMode && session === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!session && !previewMode) return <AuthScreen onPreview={startPreview} />;

  if (!previewMode && perfil === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <style>{GLOBAL_STYLE}</style>

      {previewMode && (
        <div style={{ background: C.brand, color: "#fff", textAlign: "center", fontSize: 12, fontWeight: 700, padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="eye" size={13} /> VISTA PREVIA — datos de ejemplo, nada se guarda de verdad
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <label title="Cambiar logo" style={{ cursor: "pointer", flexShrink: 0, position: "relative" }}>
            <input type="file" accept="image/*" onChange={e => updateLogo(e.target.files?.[0])} style={{ display: "none" }} />
            {perfil.logo_url ? (
              <img src={perfil.logo_url} alt="Logo" style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover", border: `1px solid ${C.border}` }} />
            ) : (
              <div style={{ width: 42, height: 42, background: "#ffffff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: C.brand }}>T</div>
            )}
          </label>
          <div style={{ flex: 1 }}>
            {editingInfo ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ ...inp, padding: "6px 10px", fontSize: 13 }} value={perfil.negocio} onChange={e => setPerfil(prev => ({ ...prev, negocio: e.target.value }))} placeholder="Negocio" />
                <input style={{ ...inp, padding: "6px 10px", fontSize: 13 }} value={perfil.dueno || ""} onChange={e => setPerfil(prev => ({ ...prev, dueno: e.target.value }))} placeholder="Dueño" />
                <button onClick={commitPerfilEdits} style={{ background: C.accent, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, padding: "6px 12px", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>OK</button>
              </div>
            ) : (
              <div onClick={() => setEditingInfo(true)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>{perfil.negocio}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{perfil.dueno || "Toca para editar"} · {perfil.regimen}</div>
              </div>
            )}
          </div>
          <select style={{ ...inp, width: "auto", padding: "6px 9px", fontSize: 11, marginRight: 6 }} value={perfil.regimen} onChange={e => handleRegimenChange(e.target.value)}>
            <option value="NRUS">NRUS</option><option value="RER">RER</option>
            <option value="RMT">RMT</option><option value="General">General</option>
            <option value="Informal">Informal</option>
          </select>
          <button onClick={() => setDrawerOpen(true)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: "pointer", padding: "9px 10px", display: "flex" }}><Icon name="menu" size={17} /></button>
        </div>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", borderTop: `1px solid ${C.border}` }}>
          {[["daily", "edit", "Diario"], ["history", "calendar", "Historial"]].map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "12px 8px", border: "none", background: "transparent", borderBottom: view === v ? `2px solid ${C.accent}` : "2px solid transparent", color: view === v ? C.accent : C.muted, fontWeight: view === v ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name={icon} size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
        {error && <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.danger, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Icon name="alert-triangle" size={15} /> {error}</div>}

        {/* DAILY */}
        {view === "daily" && (
          <div className="fade">
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
              {getGreeting()}{perfil.dueno ? `, ${perfil.dueno.split(" ")[0]}` : ""} — así va tu negocio hoy.
            </div>
            {pendingFixed.length > 0 && (
              <div style={{ ...card, background: C.accentLight, border: `1px solid ${C.accentBorder}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <Icon name="alert-triangle" size={14} color={C.accent} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: "1px", textTransform: "uppercase" }}>Gastos fijos pendientes · {mesLabel}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {pendingFixed.map(fx => (
                    <button key={fx.id} className="quick-btn" disabled={saving} onClick={() => addFixedExpense(fx)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: C.white, border: `1px solid ${C.accentBorder}`, borderRadius: 9, color: C.text, fontWeight: 600, fontSize: 12, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      <Icon name={fx.icon} size={13} color={C.accent} /> {fx.label} <span style={{ fontWeight: 800 }}>{fmt(fx.monto)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <button onClick={() => setTipo("ingreso")} style={{ padding: "10px 6px", border: `1px solid ${tipo === "ingreso" ? C.successBorder : C.border}`, borderRadius: 9, background: tipo === "ingreso" ? C.successLight : C.white, color: tipo === "ingreso" ? C.success : C.muted, fontWeight: tipo === "ingreso" ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Icon name="cash" size={14} /> Efectivo
                </button>
                <button onClick={() => setTipo("ingreso-yape")} style={{ padding: "10px 6px", border: `1px solid ${tipo === "ingreso-yape" ? C.yapeBorder : C.border}`, borderRadius: 9, background: tipo === "ingreso-yape" ? C.yapeLight : C.white, color: tipo === "ingreso-yape" ? C.yape : C.muted, fontWeight: tipo === "ingreso-yape" ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Icon name="phone" size={14} /> Yape
                </button>
                <button onClick={() => setTipo("egreso")} style={{ padding: "10px 6px", border: `1px solid ${tipo === "egreso" ? C.dangerBorder : C.border}`, borderRadius: 9, background: tipo === "egreso" ? C.dangerLight : C.white, color: tipo === "egreso" ? C.danger : C.muted, fontWeight: tipo === "egreso" ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Icon name="arrow-down-circle" size={14} /> Egreso
                </button>
              </div>

              {tipo === "egreso" && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="zap" size={12} /> Gastos fijos</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {fixedExpenses.map(fx => (
                      <div key={fx.id} style={{ display: "flex", alignItems: "center", gap: 0, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 9, overflow: "hidden" }}>
                        <button
                          className="quick-btn"
                          onClick={() => { setDesc(fx.label); setMonto(String(fx.monto)); }}
                          style={{ padding: "8px 12px", background: "transparent", border: "none", color: C.danger, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 5 }}
                        >
                          <Icon name={fx.icon} size={13} /> {fx.label} <span style={{ fontWeight: 800 }}>{fmt(fx.monto)}</span>
                        </button>
                        <button
                          onClick={() => setEditingFixed(fx.id === editingFixed ? null : fx.id)}
                          style={{ padding: "8px 8px", background: "transparent", border: "none", borderLeft: `1px solid ${C.dangerBorder}`, color: C.muted, cursor: "pointer", display: "flex" }}
                        ><Icon name="pencil" size={12} /></button>
                        <button
                          onClick={() => removeFixedExpense(fx.id)}
                          style={{ padding: "8px 9px", background: "transparent", border: "none", borderLeft: `1px solid ${C.dangerBorder}`, color: C.muted, cursor: "pointer", fontSize: 15, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                    <button
                      onClick={() => setAddingFixed(v => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 9, color: C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                    ><Icon name="plus" size={13} /> Agregar</button>
                  </div>

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
                        <button onClick={() => { commitFixedMonto(fixedExpenses.find(f => f.id === editingFixed)); setEditingFixed(null); }} style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, padding: "10px 14px", cursor: "pointer", fontSize: 13 }}>OK</button>
                      </div>
                    </div>
                  )}

                  {addingFixed && (
                    <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Nuevo gasto fijo</div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input style={{ ...inp, flex: 2 }} value={newFixedLabel} onChange={e => setNewFixedLabel(e.target.value)} placeholder="Ej: Luz, agua..." />
                        <input style={{ ...inp, flex: 1 }} type="number" value={newFixedMonto} onChange={e => setNewFixedMonto(e.target.value)} placeholder="Monto" />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={addCustomFixed} disabled={!newFixedLabel.trim() || !newFixedMonto} style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, padding: "10px 14px", cursor: "pointer", fontSize: 13, opacity: (!newFixedLabel.trim() || !newFixedMonto) ? 0.5 : 1 }}>Guardar</button>
                        <button onClick={() => { setAddingFixed(false); setNewFixedLabel(""); setNewFixedMonto(""); }} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, fontWeight: 600, padding: "10px 14px", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
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
                {saving ? "Guardando..." : tipo === "ingreso" ? "+ Registrar Efectivo" : tipo === "ingreso-yape" ? "+ Registrar Yape" : "+ Registrar Egreso"}
              </button>
            </div>

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

            <div style={card}>
              <span style={{ ...lbl, display: "flex", alignItems: "center", gap: 6 }}><Icon name="trending-up" size={12} /> Resumen {mesLabel}</span>
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
              <div style={{ fontSize: 18, fontWeight: 800, color: monthNet >= 0 ? C.success : C.danger, display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name={monthNet >= 0 ? "check-circle" : "alert-triangle"} size={16} />
                {monthNet >= 0 ? "Ganancia: " : "Pérdida: "}{fmt(Math.abs(monthNet))}
              </div>
            </div>
            {allItems.length === 0 ? (
              <div style={{ textAlign: "center", color: C.dim, padding: "20px 0", fontSize: 13, fontStyle: "italic" }}>Primero registra movimientos diarios</div>
            ) : (
              <div style={card}>
                <span style={lbl}>Ingresos por tipo</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
                  <SumBox label="Efectivo" value={tipoTotales.efectivo} color={C.success} bg={C.successLight} border={C.successBorder} />
                  <SumBox label="Yape" value={tipoTotales.yape} color={C.yape} bg={C.yapeLight} border={C.yapeBorder} />
                  <SumBox label="Egresos" value={tipoTotales.egresos} color={C.danger} bg={C.dangerLight} border={C.dangerBorder} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIN */}
        {view === "admin" && perfil?.rol === "admin" && (
          <div className="fade">
            <div style={card}>
              <span style={lbl}>Todos los negocios · {mesLabel}</span>
              {loadingAdmin ? (
                <div style={{ textAlign: "center", color: C.muted, padding: "16px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><div style={spinner} /> Cargando...</div>
              ) : !adminData || adminData.length === 0 ? (
                <div style={{ textAlign: "center", color: C.dim, padding: "16px 0", fontSize: 13, fontStyle: "italic" }}>No hay negocios registrados</div>
              ) : (
                adminData.map(b => (
                  <div key={b.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{b.negocio}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{b.dueno || "—"} · {b.regimen} · {b.movimientos} mov.</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: b.neto >= 0 ? C.success : C.danger }}>{fmt(b.neto)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* DRAWER */}
      {drawerOpen && (
        <div style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setDrawerOpen(false)}>
          <div className="slide" style={{ width: 260, background: C.white, borderLeft: `1px solid ${C.border}`, height: "100%", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              {perfil.logo_url && (
                <img src={perfil.logo_url} alt="Logo" style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover", border: `1px solid ${C.border}` }} />
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{perfil.negocio}</div>
                <div style={{ ...wordmark, fontSize: 11, color: C.brand, letterSpacing: "0.5px", textTransform: "uppercase", marginTop: 2 }}>TUCHAMBA</div>
              </div>
            </div>
            {[["daily", "edit", "Registro Diario", "Ingresos y egresos del día"], ["history", "calendar", "Historial", "Movimientos por mes"]].map(([v, icon, label, sub]) => (
              <div key={v} onClick={() => { setView(v); setDrawerOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: view === v ? C.accentLight : "transparent", borderLeft: view === v ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                <Icon name={icon} size={17} color={view === v ? C.accent : C.muted} />
                <div><div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: C.muted }}>{sub}</div></div>
              </div>
            ))}
            <div onClick={() => { setView("report"); setDrawerOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: view === "report" ? C.accentLight : "transparent", borderLeft: view === "report" ? `3px solid ${C.accent}` : "3px solid transparent" }}>
              <Icon name="bar-chart" size={17} color={view === "report" ? C.accent : C.muted} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Resumen Mensual</div><div style={{ fontSize: 11, color: C.muted }}>Ingresos y egresos del mes</div></div>
            </div>
            {perfil?.rol === "admin" && (
              <div onClick={() => { setView("admin"); setDrawerOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: view === "admin" ? C.accentLight : "transparent", borderLeft: view === "admin" ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                <Icon name="settings" size={17} color={view === "admin" ? C.accent : C.muted} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Panel Admin</div><div style={{ fontSize: 11, color: C.muted }}>Todos los negocios</div></div>
              </div>
            )}
            <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", marginTop: "auto", borderTop: `1px solid ${C.border}`, color: C.danger }}>
              <Icon name="log-out" size={17} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Cerrar sesión</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
