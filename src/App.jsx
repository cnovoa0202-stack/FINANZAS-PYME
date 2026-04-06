import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// CONFIGURACIÓN DE TU BASE DE DATOS (CON TU CLAVE REAL)
const supabaseUrl = 'https://mgvaguwofeyscbwifyjq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndmFndXdvZmV5c2Nid2lmeWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjUxOTEsImV4cCI6MjA5MTAwMTE5MX0.nxJyVi8acRWHQBYT5dPPO1tNoGaD3PXr-6KbO0uYz_M';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [view, setView] = useState('diario'); 
  const [menuOpen, setMenuOpen] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del formulario
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState('ingreso');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // 1. CARGAR DATOS DESDE SUPABASE AL INICIAR
  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (error) {
      console.error('Error cargando datos:', error);
    } else {
      setRegistros(data || []);
    }
    setLoading(false);
  };

  // 2. GUARDAR REGISTRO EN LA NUBE
  const guardarRegistro = async (e) => {
    e.preventDefault();
    if (!monto || !descripcion || !fecha) return;

    const nuevoRegistro = { 
      negocio: 'Librería', 
      fecha, 
      descripcion, 
      monto: parseFloat(monto), 
      tipo 
    };

    const { error } = await supabase.from('registros').insert([nuevoRegistro]);
    
    if (!error) {
      setMonto(''); setDescripcion('');
      fetchRegistros(); // Recarga la lista automáticamente
    } else {
      alert('Error al conectar con la base de datos. Revisa tu conexión.');
    }
  };

  // 3. ELIMINAR REGISTRO
  const eliminarRegistro = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro?")) {
      const { error } = await supabase.from('registros').delete().eq('id', id);
      if (!error) fetchRegistros();
    }
  };

  // ACCESO AL INFORME (CON TU CONTRASEÑA: NOVRUCN)
  const intentarVerInforme = () => {
    setMenuOpen(false);
    const pass = window.prompt("Contraseña de administrador:");
    if (pass === "NOVRUCN") setView('informe');
    else if (pass !== null) alert("Acceso denegado.");
  };

  // CÁLCULOS PARA EL RESUMEN VISUAL
  const totales = registros.reduce((acc, reg) => {
    if (reg.tipo === 'ingreso') acc.ingresos += Number(reg.monto);
    if (reg.tipo === 'egreso') acc.egresos += Number(reg.monto);
    return acc;
  }, { ingresos: 0, egresos: 0 });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>
        
        {/* HEADER DESTACADO */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '26px', color: '#0f172a', fontWeight: '900', letterSpacing: '-1px' }}>
            LIBRERÍA
          </h1>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '10px', fontSize: '20px', cursor: 'pointer' }}>
            ☰
          </button>
        </div>

        {/* MENÚ FLOTANTE */}
        {menuOpen && (
          <div style={{ position: 'absolute', top: '80px', right: '20px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', zIndex: 100 }}>
            <button onClick={() => { setView('diario'); setMenuOpen(false); }} style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'none', border: 'none', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}>📝 Registro Diario</button>
            <button onClick={() => { setView('historial'); setMenuOpen(false); }} style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'none', border: 'none', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}>📅 Historial de Datos</button>
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #f1f5f9' }}/>
            <button onClick={intentarVerInforme} style={{ display: 'block', width: '100%', padding: '12px 20px', background: 'none', border: 'none', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>🔒 Informe Mensual</button>
          </div>
        )}

        <div style={{ padding: '20px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>Conectando con la nube...</p>
          ) : (
            <>
              {/* VISTA: REGISTRO DIARIO */}
              {view === 'diario' && (
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#334155', marginBottom: '20px' }}>Nuevo Registro</h2>
                  <form onSubmit={guardarRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => setTipo('ingreso')} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: tipo === 'ingreso' ? '#dcfce7' : '#f1f5f9', color: tipo === 'ingreso' ? '#166534' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>Ingreso</button>
                      <button type="button" onClick={() => setTipo('egreso')} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: tipo === 'egreso' ? '#fee2e2' : '#f1f5f9', color: tipo === 'egreso' ? '#991b1b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>Egreso</button>
                    </div>
                    <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px' }}/>
                    <input type="number" placeholder="Monto S/" value={monto} onChange={e => setMonto(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px' }}/>
                    <input type="text" placeholder="¿En qué consistió el gasto o venta?" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px' }}/>
                    <button type="submit" style={{ marginTop: '10px', padding: '18px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>Guardar Registro</button>
                  </form>
                </div>
              )}

              {/* VISTA: HISTORIAL CON RESUMEN */}
              {view === 'historial' && (
                <div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                    <div style={{ flex: 1, padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '14px', border: '1px solid #dcfce7' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: '#166534', textTransform: 'uppercase' }}>Ingresos</p>
                      <p style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#166534' }}>S/ {totales.ingresos.toFixed(2)}</p>
                    </div>
                    <div style={{ flex: 1, padding: '15px', backgroundColor: '#fef2f2', borderRadius: '14px', border: '1px solid #fee2e2' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: '#991b1b', textTransform: 'uppercase' }}>Egresos</p>
                      <p style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#991b1b' }}>S/ {totales.egresos.toFixed(2)}</p>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '16px', color: '#475569', marginBottom: '15px', fontWeight: '600' }}>Movimientos Guardados</h3>
                  {registros.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No hay registros guardados aún.</p>
                  ) : (
                    registros.map(reg => (
                      <div key={reg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>{reg.descripcion}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{reg.fecha}</p>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: '15px' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', color: reg.tipo === 'ingreso' ? '#15803d' : '#b91c1c' }}>
                            {reg.tipo === 'ingreso' ? '+' : '-'} S/ {reg.monto.toFixed(2)}
                          </p>
                        </div>
                        <button onClick={() => eliminarRegistro(reg.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VISTA: INFORME PRIVADO */}
              {view === 'informe' && (
                <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '2px solid #e2e8f0' }}>
                  <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '800' }}>📊 Reporte para el Asesor</h2>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Análisis interno de rentabilidad de la Librería.</p>
                  
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <p style={{ margin: '0 0 10px 0' }}>Ganancia Neta Actual:</p>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: (totales.ingresos - totales.egresos) >= 0 ? '#166534' : '#991b1b' }}>
                      S/ {(totales.ingresos - totales.egresos).toFixed(2)}
                    </p>
                    <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', backgroundColor: (totales.ingresos - totales.egresos) >= 0 ? '#f0fdf4' : '#fef2f2', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>
                      {(totales.ingresos - totales.egresos) >= 0 ? 'EL NEGOCIO ES RENTABLE ✅' : 'EL NEGOCIO TIENE PÉRDIDAS ⚠️'}
                    </div>
                  </div>
                  
                  <button onClick={() => setView('diario')} style={{ marginTop: '20px', width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Informe</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
