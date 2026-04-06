import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgvaguwofeyscbwifyjq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndmFndXdvZmV5c2Nid2lmeWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjUxOTEsImV4cCI6MjA5MTAwMTE5MX0.nxJyVi8acRWHQBYT5dPPO1tNoGaD3PXr-6KbO0uYz_M';
const supabase = createClient(supabaseUrl, supabaseKey);

const colors = {
  primary: '#1d4ed8',
  bg: '#f3f4f6',
  cardBg: '#ffffff',
  text: '#0f172a',
  subtext: '#64748b',
  green: '#10b981',
  red: '#ef4444',
  greenBg: '#dcfce7',
  redBg: '#fee2e2',
  border: '#e2e8f0',
};

export default function App() {
  const [view, setView] = useState('diario'); 
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DE PERSONALIZACIÓN (Editables)
  const [nombreEmpresa, setNombreEmpresa] = useState(localStorage.getItem('empresa') || 'Librería del Sol');
  const [regimen, setRegimen] = useState(localStorage.getItem('regimen') || 'NRUS');
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  // Estados del formulario
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState('ingreso');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .order('fecha', { ascending: false });
    if (!error) setRegistros(data || []);
    setLoading(false);
  };

  const guardarRegistro = async (e) => {
    e.preventDefault();
    if (!monto || !descripcion) return;
    const { error } = await supabase.from('registros').insert([
      { negocio: nombreEmpresa, fecha, descripcion, monto: parseFloat(monto), tipo }
    ]);
    if (!error) { setMonto(''); setDescripcion(''); fetchRegistros(); }
  };

  const eliminarRegistro = async (id) => {
    if (window.confirm("¿Eliminar registro?")) {
      const { error } = await supabase.from('registros').delete().eq('id', id);
      if (!error) fetchRegistros();
    }
  };

  const guardarConfig = () => {
    localStorage.setItem('empresa', nombreEmpresa);
    localStorage.setItem('regimen', regimen);
    setIsEditingConfig(false);
  };

  const totales = registros.reduce((acc, reg) => {
    if (reg.tipo === 'ingreso') acc.ingresos += Number(reg.monto);
    if (reg.tipo === 'egreso') acc.egresos += Number(reg.monto);
    return acc;
  }, { ingresos: 0, egresos: 0 });

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: colors.text }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: colors.cardBg, minHeight: '100vh', position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.05)' }}>
        
        {/* HEADER DINÁMICO */}
        <div style={{ padding: '24px 20px', borderBottom: `1px solid ${colors.border}`, background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div onClick={() => setIsEditingConfig(true)} style={{ cursor: 'pointer', flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {nombreEmpresa} <span style={{ fontSize: '12px', color: colors.primary }}>✎</span>
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: colors.subtext }}>
                Sucursal <strong style={{ color: colors.primary }}>{regimen}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ backgroundColor: colors.primary, color: 'white', padding: '8px', borderRadius: '10px' }}>📊</div>
            </div>
          </div>
        </div>

        {/* MODAL DE CONFIGURACIÓN (Solo se ve al editar) */}
        {isEditingConfig && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.95)', zIndez: 200, padding: '40px 20px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Configuración del Negocio</h2>
            <label style={{ fontSize: '12px', color: colors.subtext }}>Nombre de la Empresa</label>
            <input value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '15px' }} />
            
            <label style={{ fontSize: '12px', color: colors.subtext }}>Régimen Tributario</label>
            <select value={regimen} onChange={e => setRegimen(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '25px' }}>
              <option value="NRUS">NRUS (Persona Natural)</option>
              <option value="MYPE">MYPE Tributario</option>
              <option value="Especial">Régimen Especial (RER)</option>
              <option value="General">Régimen General</option>
            </select>
            
            <button onClick={guardarConfig} style={{ width: '100%', padding: '15px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Guardar Cambios</button>
          </div>
        )}

        {/* NAVEGACIÓN */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
          <button onClick={() => setView('diario')} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: view === 'diario' ? `3px solid ${colors.primary}` : '0', fontWeight: 'bold', color: view === 'diario' ? colors.primary : colors.subtext }}>Diario</button>
          <button onClick={() => setView('historial')} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: view === 'historial' ? `3px solid ${colors.primary}` : '0', fontWeight: 'bold', color: view === 'historial' ? colors.primary : colors.subtext }}>Historial</button>
        </div>

        <div style={{ padding: '20px' }}>
          {view === 'diario' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tarjetas de Resumen */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, padding: '15px', borderRadius: '15px', background: colors.greenBg }}>
                  <p style={{ margin: 0, fontSize: '11px', color: colors.green, fontWeight: 'bold' }}>INGRESOS</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>S/ {totales.ingresos.toFixed(2)}</p>
                </div>
                <div style={{ flex: 1, padding: '15px', borderRadius: '15px', background: colors.redBg }}>
                  <p style={{ margin: 0, fontSize: '11px', color: colors.red, fontWeight: 'bold' }}>EGRESOS</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>S/ {totales.egresos.toFixed(2)}</p>
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={guardarRegistro} style={{ padding: '20px', borderRadius: '20px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button type="button" onClick={() => setTipo('ingreso')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: tipo === 'ingreso' ? colors.green : '#f1f5f9', color: tipo === 'ingreso' ? 'white' : colors.subtext, fontWeight: 'bold' }}>✓ Ingreso</button>
                  <button type="button" onClick={() => setTipo('egreso')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: tipo === 'egreso' ? colors.red : '#f1f5f9', color: tipo === 'egreso' ? 'white' : colors.subtext, fontWeight: 'bold' }}>✕ Egreso</button>
                </div>
                <input type="text" placeholder="Descripción (ej. Venta de cuadernos)" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${colors.border}` }} />
                <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${colors.border}` }} />
                <button type="submit" style={{ padding: '16px', background: colors.text, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '5px' }}>Registrar Movimiento</button>
              </form>
            </div>
          )}

          {view === 'historial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {registros.map(reg => (
                <div key={reg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{reg.descripcion}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: colors.subtext }}>{reg.fecha}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: '800', color: reg.tipo === 'ingreso' ? colors.green : colors.red }}>
                      {reg.tipo === 'ingreso' ? '+' : '-'} S/ {reg.monto.toFixed(2)}
                    </p>
                    <button onClick={() => eliminarRegistro(reg.id)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
