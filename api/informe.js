export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !anthropicKey) {
    res.status(500).json({ error: "Servidor mal configurado (faltan variables de entorno)" });
    return;
  }

  // Verificamos el token contra Supabase Auth antes de gastar la API key de Anthropic.
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    res.status(401).json({ error: "Sesión inválida" });
    return;
  }

  const { negocio, dueno, mesLabel, regimen, desglose, detalle, totales } = req.body || {};
  if (!negocio || !mesLabel || !totales) {
    res.status(400).json({ error: "Datos incompletos" });
    return;
  }

  const prompt = `Le vas a explicar a un emprendedor peruano cómo le fue este mes en su negocio. NO es experto en finanzas, contabilidad ni temas legales/tributarios — es alguien que solo quiere saber, en criollo, si le fue bien o mal y qué hacer al respecto. Escribile como le hablarías a un amigo que tiene su negocio, no como un informe corporativo.

Reglas de tono:
- Nada de tecnicismos contables (evita "rentabilidad", "flujo de caja", "margen operativo", etc.). Si necesitás nombrar algo así, explicalo con una frase simple al lado.
- Nada de títulos en mayúsculas tipo reporte, ni de emoji en cada línea — máximo 1 emoji por sección, y solo si realmente suma.
- Frases cortas, directas, español peruano sencillo. Que se sienta escrito por una persona, no por una plantilla.

Estructura (sin encabezados formales, como un mensaje corrido con párrafos cortos):

1. Arrancá con un veredicto directo en la primera línea: ¿le fue bien, regular o mal este mes? Una frase clara, sin rodeos.
2. Explicá por qué en 2-3 frases: de dónde vino la plata y en qué se fue, sin jerga.
3. Un dato o patrón que notes en sus movimientos (ej: la mayoría de sus ventas fueron por Yape, gastó fuerte en un día puntual, etc.) — algo que a él probablemente no se le había ocurrido mirar.
4. Para cerrar, 2-3 consejos prácticos para el próximo mes. Si los datos lo ameritan (por ejemplo, mucho movimiento por Yape/Plin, montos altos, o un régimen que podría estarse quedando corto), agregá una advertencia simple sobre algo legal/tributario que le convenga saber — por ejemplo, que SUNAT puede fijarse en negocios que reciben bastante dinero por Yape o Plin sin estar formalizados, y que si ese es su caso le conviene hablar con un contador o evaluar formalizarse. No inventes montos ni límites legales exactos que no tengas certeza de que sean correctos — hablá en términos generales y siempre sugerí confirmar con un contador antes de actuar.

Cerrá con una línea aclarando que esto es una guía simple para orientarlo, no un informe contable ni asesoría legal formal.

DATOS DEL NEGOCIO:
Negocio: ${negocio} | Dueño: ${dueno || "No especificado"} | Mes: ${mesLabel} | Régimen tributario: ${regimen}

MOVIMIENTOS POR DÍA:
${desglose}

DETALLE DE MOVIMIENTOS:
${detalle}

TOTALES DEL MES: Ingresos S/${totales.ingresos} | Egresos S/${totales.egresos} | Resultado S/${totales.neto} (${totales.neto >= 0 ? "a favor" : "en contra"})`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const json = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(502).json({ error: json?.error?.message || "Error al generar el informe" });
      return;
    }
    const informe = json.content?.map((b) => b.text || "").join("") || "";
    res.status(200).json({ informe });
  } catch {
    res.status(502).json({ error: "Error de conexión con el servicio de IA" });
  }
}
