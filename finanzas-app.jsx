import { useState, useEffect } from "react";

const SUPABASE_URL = "https://mgvaguwofeyscbwifyjq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndmFndXdvZmV5c2Nid2lmeWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjUxOTEsImV4cCI6MjA5MTAwMTE5MX0.nxJyVi8acRWHQBYT5dPPO1tNoGaD3PXr-6KbO0uYz_M";

const C = {
  bg:"#0a0c14",card:"#12151f",card2:"#1a1d2e",border:"#232636",
  accent:"#00e5a0",accentDim:"#00e5a015",accentBorder:"#00e5a035",
  danger:"#ff4d6d",dangerDim:"#ff4d6d15",dangerBorder:"#ff4d6d35",
  warn:"#ffd166",warnDim:"#ffd16615",
  text:"#e8eaf0",muted:"#7b7f9a",dim:"#3a3d52",
};

const fmt=(n)=>`S/ ${Number(n||0).toLocaleString("es-PE",{minimumFractionDigits:2})}`;
const todayStr=()=>new Date().toISOString().split("T")[0];

const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"};

async function dbGet(negocio,mes){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/registros?negocio=eq.${encodeURIComponent(negocio)}&fecha=gte.${mes}-01&fecha=lte.${mes}-31&order=fecha.desc,id.desc`,{headers});
  return res.ok?res.json():[];
}
async function dbInsert(row){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/registros`,{method:"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify(row)});
  if(!res.ok){const e=await res.text();console.error("Insert error:",e);return null;}
  return(await res.json())[0];
}
async function dbDelete(id){
  await fetch(`${SUPABASE_URL}/rest/v1/registros?id=eq.${id}`,{method:"DELETE",headers});
}

export default function App(){
  const [view,setView]=useState("daily");
  const [negocio,setNegocio]=useState("Librería");
  const [dueno,setDueno]=useState("");
  const [regimen,setRegimen]=useState("NRUS");
  const [editingInfo,setEditingInfo]=useState(false);
  const [selectedDate,setSelectedDate]=useState(todayStr());
  const [allItems,setAllItems]=useState([]);
  const [loadingData,setLoadingData]=useState(false);
  const [desc,setDesc]=useState("");
  const [monto,setMonto]=useState("");
  const [tipo,setTipo]=useState("ingreso");
  const [saving,setSaving]=useState(false);
  const [informe,setInforme]=useState("");
  const [loadingIA,setLoadingIA]=useState(false);
  const [error,setError]=useState("");

  const currentMonth=selectedDate.slice(0,7);
  const mesLabel=new Date(currentMonth+"-02").toLocaleString("es-PE",{month:"long",year:"numeric"});

  useEffect(()=>{
    async function load(){
      setLoadingData(true);setError("");
      try{const data=await dbGet(negocio,currentMonth);setAllItems(data||[]);}
      catch(e){setError("Error al cargar datos. Verifica tu conexión.");}
      setLoadingData(false);
    }
    load();
  },[currentMonth,negocio]);

  const dayItems=allItems.filter(r=>r.fecha===selectedDate);
  const dayIngresos=dayItems.filter(r=>r.tipo==="ingreso").reduce((s,r)=>s+Number(r.monto),0);
  const dayEgresos=dayItems.filter(r=>r.tipo==="egreso").reduce((s,r)=>s+Number(r.monto),0);
  const dayNet=dayIngresos-dayEgresos;
  const monthIngresos=allItems.filter(r=>r.tipo==="ingreso").reduce((s,r)=>s+Number(r.monto),0);
  const monthEgresos=allItems.filter(r=>r.tipo==="egreso").reduce((s,r)=>s+Number(r.monto),0);
  const monthNet=monthIngresos-monthEgresos;
  const dateGroups=[...new Set(allItems.map(r=>r.fecha))].sort((a,b)=>b.localeCompare(a));

  async function addItem(){
    if(!desc.trim()||!monto||saving)return;
    setSaving(true);setError("");
    const row={negocio,fecha:selectedDate,descripcion:desc.trim(),monto:Number(monto),tipo};
    const saved=await dbInsert(row);
    if(saved){setAllItems(prev=>[saved,...prev]);setDesc("");setMonto("");}
    else setError("No se pudo guardar. Intenta de nuevo.");
    setSaving(false);
  }

  async function removeItem(id){
    await dbDelete(id);
    setAllItems(prev=>prev.filter(i=>i.id!==id));
  }

  async function generarInforme(){
    if(allItems.length===0||loadingIA)return;
    setLoadingIA(true);setInforme("");
    const desglose=dateGroups.map(d=>{
      const items=allItems.filter(r=>r.fecha===d);
      const ing=items.filter(r=>r.tipo==="ingreso").reduce((s,r)=>s+Number(r.monto),0);
      const egr=items.filter(r=>r.tipo==="egreso").reduce((s,r)=>s+Number(r.monto),0);
      const lbl=new Date(d+"T12:00:00").toLocaleDateString("es-PE",{weekday:"short",day:"numeric",month:"short"});
      return `${lbl}: Ingresos S/${ing.toFixed(2)}, Egresos S/${egr.toFixed(2)}, Neto S/${(ing-egr).toFixed(2)}`;
    }).join("\n");
    const detalle=allItems.map(i=>`• [${i.tipo.toUpperCase()}] ${i.descripcion}: S/${Number(i.monto).toFixed(2)}`).join("\n");
    const prompt=`Eres un asesor financiero experto en pequeñas empresas peruanas. Genera un informe de rentabilidad mensual claro y amigable. USA EMOJIS. Español peruano sencillo.

Secciones:
📋 RESUMEN DEL MES
💰 ANÁLISIS DE INGRESOS  
💸 ANÁLISIS DE EGRESOS
📊 RESULTADO FINAL
✅ 3 RECOMENDACIONES CONCRETAS
⚠️ ALERTA SUNAT (régimen ${regimen})

DATOS: Negocio: ${negocio} | Dueño: ${dueno||"No especificado"} | Mes: ${mesLabel} | Régimen: ${regimen}
POR DÍA:\n${desglose}
DETALLE:\n${detalle}
TOTALES: Ingresos S/${monthIngresos.toFixed(2)} | Egresos S/${monthEgresos.toFixed(2)} | Neto S/${monthNet.toFixed(2)} (${monthNet>=0?"GANANCIA":"PÉRDIDA"})`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const json=await res.json();
      setInforme(json.content?.map(b=>b.text||"").join("")||"Error al generar.");
    }catch{setInforme("Error de conexión.");}
    setLoadingIA(false);
  }

  const s={
    app:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans',sans-serif"},
    header:{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:50},
    logo:{width:34,height:34,background:`linear-gradient(135deg,${C.accent},#00b8d4)`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#0a0c14",flexShrink:0},
    nav:{display:"flex",gap:3,background:C.card2,borderRadius:12,padding:4,margin:"14px 18px 0"},
    navBtn:(a)=>({flex:1,padding:"9px 6px",borderRadius:9,border:"none",background:a?C.accent:"transparent",color:a?"#0a0c14":C.muted,fontWeight:a?700:500,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}),
    body:{padding:"14px 18px 80px"},
    lbl:{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"1px",textTransform:"uppercase",marginBottom:7,display:"block",marginTop:14},
    card:{background:C.card,border:`1px solid ${C.border}`,borderRadius:13,padding:15,marginBottom:12},
    inp:{background:C.bg,border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:14,padding:"10px 13px",outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"},
    tog:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12},
    togBtn:(a,t)=>({padding:"10px",border:`1px solid ${a?(t==="ingreso"?C.accentBorder:C.dangerBorder):C.border}`,borderRadius:9,background:a?(t==="ingreso"?C.accentDim:C.dangerDim):"transparent",color:a?(t==="ingreso"?C.accent:C.danger):C.muted,fontWeight:a?700:500,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}),
    addBtn:(dis)=>({width:"100%",background:tipo==="ingreso"?C.accent:C.danger,border:"none",borderRadius:9,color:"#0a0c14",fontSize:14,fontWeight:700,padding:"12px",cursor:dis?"not-allowed":"pointer",marginTop:4,opacity:dis?0.5:1,fontFamily:"'DM Sans',sans-serif"}),
    sumRow:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14},
    sumBox:(c)=>({background:c==="g"?C.accentDim:c==="r"?C.dangerDim:C.warnDim,border:`1px solid ${c==="g"?C.accentBorder:c==="r"?C.dangerBorder:"#ffd16635"}`,borderRadius:11,padding:"11px 8px",textAlign:"center"}),
    sumVal:(c)=>({fontSize:15,fontWeight:800,color:c==="g"?C.accent:c==="r"?C.danger:C.warn}),
    sumLbl:{fontSize:10,color:C.muted,fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:3},
    itemRow:{display:"flex",alignItems:"center",padding:"9px 0"},
    dot:(t)=>({width:7,height:7,borderRadius:"50%",background:t==="ingreso"?C.accent:C.danger,flexShrink:0,marginRight:9}),
    rmBtn:{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:17,padding:"0 6px",borderRadius:6},
    genBtn:(dis)=>({width:"100%",background:`linear-gradient(135deg,${C.accent},#00b8d4)`,border:"none",borderRadius:11,color:"#0a0c14",fontSize:15,fontWeight:800,padding:"14px",cursor:dis?"not-allowed":"pointer",opacity:dis?0.5:1,fontFamily:"'DM Sans',sans-serif"}),
    reportBox:{background:C.card,border:`1px solid ${C.accentBorder}`,borderRadius:13,padding:20,whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.8,marginTop:14,boxShadow:`0 0 30px ${C.accentDim}`},
    empty:{textAlign:"center",color:C.dim,fontSize:13,padding:"22px 0",fontStyle:"italic"},
    spinner:{width:15,height:15,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"},
    acumCard:{background:C.accentDim,border:`1px solid ${C.accentBorder}`,borderRadius:12,padding:"12px 14px",marginTop:4},
    errBox:{background:"#ff4d6d15",border:"1px solid #ff4d6d35",borderRadius:9,padding:"10px 14px",fontSize:13,color:C.danger,marginBottom:10},
  };

  return(
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus,select:focus{border-color:#00e5a0!important;outline:none}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeIn 0.3s ease}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={s.header}>
        <div style={s.logo}>F</div>
        <div style={{flex:1}}>
          {editingInfo?(
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <input style={{...s.inp,padding:"6px 10px",fontSize:12}} value={negocio} onChange={e=>setNegocio(e.target.value)} placeholder="Negocio"/>
              <input style={{...s.inp,padding:"6px 10px",fontSize:12}} value={dueno} onChange={e=>setDueno(e.target.value)} placeholder="Dueño"/>
              <button onClick={()=>setEditingInfo(false)} style={{background:C.accent,border:"none",borderRadius:7,color:"#0a0c14",fontWeight:700,padding:"6px 11px",cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>OK</button>
            </div>
          ):(
            <div onClick={()=>setEditingInfo(true)} style={{cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:700}}>{negocio}</div>
              <div style={{fontSize:11,color:C.muted}}>{dueno||"Toca para editar"} · {regimen}</div>
            </div>
          )}
        </div>
        <select style={{...s.inp,width:"auto",padding:"6px 9px",fontSize:11}} value={regimen} onChange={e=>setRegimen(e.target.value)}>
          <option value="NRUS">NRUS</option><option value="RER">RER</option>
          <option value="RMT">RMT</option><option value="General">General</option>
          <option value="Informal">Informal</option>
        </select>
      </div>

      <div style={s.nav}>
        <button style={s.navBtn(view==="daily")} onClick={()=>setView("daily")}>📝 Diario</button>
        <button style={s.navBtn(view==="history")} onClick={()=>setView("history")}>📅 Historial</button>
        <button style={s.navBtn(view==="report")} onClick={()=>setView("report")}>📊 Informe IA</button>
      </div>

      <div style={s.body}>
        {error&&<div style={s.errBox}>⚠️ {error}</div>}

        {view==="daily"&&(
          <div className="fade">
            <span style={s.lbl}>Fecha de registro</span>
            <input style={s.inp} type="date" value={selectedDate} max={todayStr()} onChange={e=>setSelectedDate(e.target.value)}/>
            <div style={{...s.sumRow,marginTop:14}}>
              <div style={s.sumBox("g")}><div style={s.sumLbl}>Ingresos</div><div style={s.sumVal("g")}>{fmt(dayIngresos)}</div></div>
              <div style={s.sumBox("r")}><div style={s.sumLbl}>Egresos</div><div style={s.sumVal("r")}>{fmt(dayEgresos)}</div></div>
              <div style={s.sumBox(dayNet>=0?"g":"r")}><div style={s.sumLbl}>Neto día</div><div style={s.sumVal(dayNet>=0?"g":"r")}>{fmt(Math.abs(dayNet))}</div></div>
            </div>
            <div style={s.card}>
              <span style={{...s.lbl,marginTop:0}}>Tipo de movimiento</span>
              <div style={s.tog}>
                <button style={s.togBtn(tipo==="ingreso","ingreso")} onClick={()=>setTipo("ingreso")}>✅ Ingreso</button>
                <button style={s.togBtn(tipo==="egreso","egreso")} onClick={()=>setTipo("egreso")}>❌ Egreso</button>
              </div>
              <span style={{...s.lbl,marginTop:0}}>Descripción</span>
              <input style={{...s.inp,marginBottom:10}} value={desc} onChange={e=>setDesc(e.target.value)} placeholder={tipo==="ingreso"?"Ej: Ventas del día, cuadernos...":"Ej: Alquiler, luz, mercadería..."} onKeyDown={e=>e.key==="Enter"&&addItem()}/>
              <span style={{...s.lbl,marginTop:0}}>Monto (S/)</span>
              <input style={{...s.inp,marginBottom:10}} type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00" onKeyDown={e=>e.key==="Enter"&&addItem()}/>
              <button style={s.addBtn(!desc||!monto||saving)} onClick={addItem} disabled={!desc||!monto||saving}>
                {saving?"⏳ Guardando...":"+ Registrar "+(tipo==="ingreso"?"Ingreso":"Egreso")}
              </button>
            </div>
            <span style={s.lbl}>Movimientos del día</span>
            <div style={s.card}>
              {loadingData?(
                <div style={{...s.empty,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div style={s.spinner}/> Cargando...</div>
              ):dayItems.length===0?(
                <div style={s.empty}>Sin registros para este día</div>
              ):dayItems.map((item,idx)=>(
                <div key={item.id} style={{...s.itemRow,borderBottom:idx===dayItems.length-1?"none":`1px solid ${C.border}`}}>
                  <div style={s.dot(item.tipo)}/><span style={{flex:1,fontSize:13}}>{item.descripcion}</span>
                  <span style={{fontSize:13,fontWeight:700,color:item.tipo==="ingreso"?C.accent:C.danger,marginRight:8}}>{fmt(item.monto)}</span>
                  <button style={s.rmBtn} onClick={()=>removeItem(item.id)}>×</button>
                </div>
              ))}
            </div>
            <div style={s.acumCard}>
              <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>📈 Acumulado {mesLabel}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,flexWrap:"wrap",gap:6}}>
                <span style={{color:C.muted}}>Ingresos: <b style={{color:C.accent}}>{fmt(monthIngresos)}</b></span>
                <span style={{color:C.muted}}>Egresos: <b style={{color:C.danger}}>{fmt(monthEgresos)}</b></span>
                <span style={{color:C.muted}}>Neto: <b style={{color:monthNet>=0?C.accent:C.danger}}>{fmt(monthNet)}</b></span>
              </div>
            </div>
          </div>
        )}

        {view==="history"&&(
          <div className="fade">
            <span style={s.lbl}>Mes a revisar</span>
            <input style={s.inp} type="month" value={currentMonth} onChange={e=>setSelectedDate(e.target.value+"-01")}/>
            <div style={{...s.sumRow,marginTop:14}}>
              <div style={s.sumBox("g")}><div style={s.sumLbl}>Ingresos</div><div style={s.sumVal("g")}>{fmt(monthIngresos)}</div></div>
              <div style={s.sumBox("r")}><div style={s.sumLbl}>Egresos</div><div style={s.sumVal("r")}>{fmt(monthEgresos)}</div></div>
              <div style={s.sumBox(monthNet>=0?"g":"r")}><div style={s.sumLbl}>{monthNet>=0?"Ganancia":"Pérdida"}</div><div style={s.sumVal(monthNet>=0?"g":"r")}>{fmt(Math.abs(monthNet))}</div></div>
            </div>
            {loadingData?(
              <div style={{...s.empty,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div style={s.spinner}/> Cargando...</div>
            ):dateGroups.length===0?(
              <div style={s.empty}>No hay registros en este mes</div>
            ):dateGroups.map(date=>{
              const items=allItems.filter(r=>r.fecha===date);
              const ing=items.filter(r=>r.tipo==="ingreso").reduce((s,r)=>s+Number(r.monto),0);
              const egr=items.filter(r=>r.tipo==="egreso").reduce((s,r)=>s+Number(r.monto),0);
              const net=ing-egr;
              const lbl=new Date(date+"T12:00:00").toLocaleDateString("es-PE",{weekday:"short",day:"numeric",month:"short"});
              return(
                <div key={date} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:13,fontWeight:700}}>{lbl}</span>
                    <span style={{fontSize:13,fontWeight:700,color:net>=0?C.accent:C.danger}}>{net>=0?"+":""}{fmt(net)}</span>
                  </div>
                  <div style={{padding:"6px 14px"}}>
                    {items.map((item,idx)=>(
                      <div key={item.id} style={{...s.itemRow,borderBottom:idx===items.length-1?"none":`1px solid ${C.border}`,padding:"7px 0"}}>
                        <div style={s.dot(item.tipo)}/><span style={{flex:1,fontSize:12}}>{item.descripcion}</span>
                        <span style={{fontSize:12,fontWeight:700,color:item.tipo==="ingreso"?C.accent:C.danger,marginRight:8}}>{fmt(item.monto)}</span>
                        <button style={s.rmBtn} onClick={()=>removeItem(item.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view==="report"&&(
          <div className="fade">
            <div style={{...s.acumCard,marginBottom:14}}>
              <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:8,letterSpacing:"1px",textTransform:"uppercase"}}>Resumen · {mesLabel}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6,flexWrap:"wrap",gap:6}}>
                <span style={{color:C.muted}}>Ingresos: <b style={{color:C.accent}}>{fmt(monthIngresos)}</b></span>
                <span style={{color:C.muted}}>Egresos: <b style={{color:C.danger}}>{fmt(monthEgresos)}</b></span>
              </div>
              <div style={{fontSize:16,fontWeight:800,color:monthNet>=0?C.accent:C.danger}}>
                {monthNet>=0?"✅ Ganancia: ":"❌ Pérdida: "}{fmt(Math.abs(monthNet))}
              </div>
            </div>
            <button style={s.genBtn(allItems.length===0||loadingIA)} onClick={generarInforme} disabled={allItems.length===0||loadingIA}>
              {loadingIA?"⏳ Analizando tu negocio...":"✨ Generar Informe Mensual con IA"}
            </button>
            {loadingIA&&(
              <div style={{display:"flex",alignItems:"center",gap:10,color:C.muted,fontSize:13,padding:"18px 0"}}>
                <div style={s.spinner}/> Claude está analizando todos tus registros...
              </div>
            )}
            {informe&&!loadingIA&&(
              <div style={s.reportBox}>
                <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:12}}>📊 {negocio} · {mesLabel}</div>
                {informe}
              </div>
            )}
            {!informe&&!loadingIA&&(
              <div style={s.empty}>{allItems.length===0?"Primero registra movimientos diarios para generar el informe":"Presiona el botón para analizar este mes con IA"}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
