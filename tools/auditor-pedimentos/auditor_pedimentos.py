#!/usr/bin/env python3
"""
Auditor de Pedimentos — motor de revisión preventiva asistida por IA
=====================================================================

Revisa un pedimento contra sus documentos soporte (factura/CFDI, packing list,
manifestación de valor, certificado de origen) y genera una lista de hallazgos
clasificados por severidad, lista para revisión profesional humana.

FLUJO
-----
  1. Extracción (Claude Haiku)  -> convierte PDFs/XML a datos estructurados
  2. Cruce (Claude Sonnet)      -> compara campos entre documentos, detecta
                                   inconsistencias y omisiones
  3. Reporte (Python)           -> genera Markdown con hallazgos por severidad
  4. REVISIÓN HUMANA            -> OBLIGATORIA. El script NO firma nada.

USO
---
  export ANTHROPIC_API_KEY="sk-ant-..."
  python auditor_pedimentos.py ./expedientes/PED-3001234 --cliente "ACME SA de CV"

  Estructura esperada de la carpeta del expediente:
    PED-3001234/
      pedimento.pdf
      factura.pdf          (o cfdi.xml)
      packing_list.pdf
      manifestacion.pdf    (opcional)
      certificado_origen.pdf (opcional)

DEPENDENCIAS
------------
  pip install anthropic

AVISO LEGAL
-----------
Esta herramienta es un APOYO a la revisión, no un sustituto del criterio
profesional. Los modelos de lenguaje pueden omitir o inventar datos. Todo
hallazgo debe ser verificado contra el documento fuente antes de comunicarse
a un cliente. No constituye asesoría fiscal ni aduanera.
"""

import argparse
import base64
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import anthropic
    from anthropic import Anthropic
except ImportError:
    sys.exit("Falta el paquete 'anthropic'. Ejecuta: pip install anthropic")


# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

MODELO_EXTRACCION = "claude-haiku-4-5"   # barato, alto volumen
MODELO_ANALISIS   = "claude-sonnet-5"    # razonamiento, cruce de datos

# La API rechaza peticiones mayores a 32 MB. El base64 infla ~4/3, así que el
# archivo original no debe pasar de ~24 MB.
LIMITE_ARCHIVO_BYTES = 24 * 1024 * 1024

SEVERIDADES = {
    "CRITICO": "Riesgo de multa, crédito fiscal o suspensión de padrón. Atender antes de despacho.",
    "ALTO":    "Inconsistencia documental que probablemente derive en rectificación.",
    "MEDIO":   "Discrepancia menor o dato faltante. Corregir para expediente.",
    "BAJO":    "Observación de forma. Sin impacto fiscal inmediato.",
}

# Documentos que el motor sabe leer. La clave es el prefijo del nombre de archivo.
TIPOS_DOCUMENTO = {
    "pedimento":            "Pedimento de importación/exportación",
    "factura":              "Factura comercial",
    "cfdi":                 "CFDI con complemento de comercio exterior",
    "packing":              "Packing list / lista de empaque",
    "manifestacion":        "Manifestación de valor",
    "certificado_origen":   "Certificado de origen",
    "carta_318":            "Carta 3.1.8 / declaración bajo protesta",
    "conocimiento":         "Conocimiento de embarque / guía",
}


# ---------------------------------------------------------------------------
# Estructuras de datos
# ---------------------------------------------------------------------------

@dataclass
class Hallazgo:
    severidad: str
    campo: str
    descripcion: str
    valor_pedimento: str = ""
    valor_soporte: str = ""
    fundamento: str = ""
    accion_sugerida: str = ""


@dataclass
class ResultadoAuditoria:
    expediente: str
    cliente: str
    fecha_revision: str
    documentos_analizados: list = field(default_factory=list)
    documentos_faltantes: list = field(default_factory=list)
    datos_extraidos: dict = field(default_factory=dict)
    hallazgos: list = field(default_factory=list)
    costo_estimado_usd: float = 0.0

    def por_severidad(self, sev: str) -> list:
        return [h for h in self.hallazgos if h.get("severidad") == sev]


# ---------------------------------------------------------------------------
# Utilidades de archivo
# ---------------------------------------------------------------------------

def clasificar_archivo(ruta: Path) -> str | None:
    """Identifica el tipo de documento por el nombre del archivo."""
    nombre = ruta.stem.lower()
    for clave in TIPOS_DOCUMENTO:
        if nombre.startswith(clave) or clave in nombre:
            return clave
    return None


def cargar_como_bloque(ruta: Path) -> dict[str, Any]:
    """Convierte un archivo en un bloque de contenido para la API."""
    ext = ruta.suffix.lower()

    if ext in (".pdf", ".png", ".jpg", ".jpeg"):
        tamano = ruta.stat().st_size
        if tamano > LIMITE_ARCHIVO_BYTES:
            raise ValueError(
                f"{ruta.name} ({tamano:,} bytes) supera el máximo de "
                f"{LIMITE_ARCHIVO_BYTES / 1_048_576:.0f} MB por archivo"
            )
        datos = base64.standard_b64encode(ruta.read_bytes()).decode("utf-8")

        if ext == ".pdf":
            return {
                "type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": datos},
            }

        media = "image/png" if ext == ".png" else "image/jpeg"
        return {
            "type": "image",
            "source": {"type": "base64", "media_type": media, "data": datos},
        }

    if ext in (".xml", ".txt"):
        return {"type": "text", "text": ruta.read_text(encoding="utf-8", errors="replace")}

    raise ValueError(f"Formato no soportado: {ruta.name}")


def texto_de(respuesta) -> str:
    """Concatena los bloques de texto de una respuesta de la API."""
    return "".join(b.text for b in respuesta.content if b.type == "text").strip()


def limpiar_json(texto: str) -> str:
    """Quita el cercado markdown que a veces envuelve la respuesta."""
    texto = texto.strip()
    if texto.startswith("```"):
        texto = texto.split("\n", 1)[-1] if "\n" in texto else texto
        texto = texto.removeprefix("json").lstrip()
    return texto.removesuffix("```").strip()


# ---------------------------------------------------------------------------
# Paso 1 — Extracción
# ---------------------------------------------------------------------------

PROMPT_EXTRACCION = """Eres un extractor de datos de documentos de comercio exterior mexicano.

Extrae del documento adjunto ({tipo_desc}) TODOS los campos que encuentres, en JSON.

Campos de interés (incluye solo los que existan en el documento):
- numero_pedimento, clave_pedimento, aduana_seccion, fecha_entrada, fecha_pago
- rfc_importador, razon_social_importador, rfc_proveedor, proveedor_extranjero
- patente_aduanal, agente_aduanal
- valor_aduana, valor_comercial, valor_dolares, valor_factura, moneda, tipo_cambio
- incrementables: fletes, seguros, embalajes, otros_incrementables
- contribuciones: dta, igi, iva, ieps, prv, cuotas_compensatorias
- partidas: lista de {{fraccion, nico, descripcion, cantidad_umc, umc, cantidad_uma, uma,
  valor_unitario, valor_mercancia, pais_origen, pais_vendedor, tasa_igi, tasa_iva}}
- peso_bruto, peso_neto, bultos, medio_transporte
- numero_factura, fecha_factura, incoterm, condiciones_pago
- certificados, permisos, regulaciones_no_arancelarias, identificadores
- uuid_cfdi, complemento_comercio_exterior

REGLAS ESTRICTAS:
1. Devuelve ÚNICAMENTE JSON válido. Sin markdown, sin ```, sin explicación.
2. Si un campo no aparece en el documento, OMÍTELO. No lo inventes ni pongas null.
3. Copia los valores EXACTAMENTE como aparecen, incluyendo ceros a la izquierda.
4. Los montos como número (sin comas ni símbolo de moneda).
5. Si un dato es ilegible, usa el valor "ILEGIBLE".
6. Agrega un campo "_confianza" de 0.0 a 1.0 sobre la calidad de la extracción."""


def extraer_documento(cliente: Anthropic, ruta: Path, tipo: str) -> dict:
    """Extrae datos estructurados de un documento individual."""
    tipo_desc = TIPOS_DOCUMENTO.get(tipo, tipo)
    print(f"  [extrayendo] {ruta.name} ({tipo_desc})")

    try:
        bloque = cargar_como_bloque(ruta)
    except (ValueError, OSError) as e:
        print(f"    ! {e}")
        return {"_archivo": ruta.name, "_error": str(e)}

    try:
        respuesta = cliente.messages.create(
            model=MODELO_EXTRACCION,
            max_tokens=8000,
            messages=[{
                "role": "user",
                "content": [
                    bloque,
                    {"type": "text", "text": PROMPT_EXTRACCION.format(tipo_desc=tipo_desc)},
                ],
            }],
        )
    except anthropic.APIStatusError as e:
        print(f"    ! Error de la API ({e.status_code}): {e.message}")
        return {"_archivo": ruta.name, "_error": f"api_{e.status_code}"}
    except anthropic.APIConnectionError as e:
        print(f"    ! Sin conexión con la API: {e}")
        return {"_archivo": ruta.name, "_error": "sin_conexion"}

    datos: dict[str, Any]
    if respuesta.stop_reason == "refusal":
        print("    ! El modelo declinó procesar el documento")
        datos = {"_error": "rechazado_por_el_modelo"}
    else:
        if respuesta.stop_reason == "max_tokens":
            print("    ! Respuesta truncada por límite de tokens; extracción parcial")
        try:
            datos = json.loads(limpiar_json(texto_de(respuesta)))
        except json.JSONDecodeError:
            print("    ! No se pudo interpretar la respuesta como JSON")
            datos = {"_error": "respuesta_no_json", "_crudo": texto_de(respuesta)[:500]}

    if not isinstance(datos, dict):
        datos = {"_error": "json_no_es_objeto", "_crudo": str(datos)[:500]}

    datos["_archivo"] = ruta.name
    datos["_uso"] = {
        "entrada": respuesta.usage.input_tokens,
        "salida": respuesta.usage.output_tokens,
    }
    return datos


# ---------------------------------------------------------------------------
# Paso 2 — Cruce y análisis
# ---------------------------------------------------------------------------

# El esquema obliga a la API a devolver exactamente esta forma; no hay que
# adivinar el formato ni reparar JSON malformado.
ESQUEMA_ANALISIS = {
    "type": "object",
    "properties": {
        "hallazgos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "severidad": {"type": "string", "enum": ["CRITICO", "ALTO", "MEDIO", "BAJO"]},
                    "campo": {"type": "string"},
                    "descripcion": {"type": "string"},
                    "valor_pedimento": {"type": "string"},
                    "valor_soporte": {"type": "string"},
                    "fundamento": {"type": "string"},
                    "accion_sugerida": {"type": "string"},
                },
                "required": [
                    "severidad", "campo", "descripcion", "valor_pedimento",
                    "valor_soporte", "fundamento", "accion_sugerida",
                ],
                "additionalProperties": False,
            },
        },
        "resumen": {"type": "string"},
        "nivel_riesgo_global": {"type": "string", "enum": ["ALTO", "MEDIO", "BAJO"]},
    },
    "required": ["hallazgos", "resumen", "nivel_riesgo_global"],
    "additionalProperties": False,
}

PROMPT_ANALISIS = """Eres un auditor preventivo de comercio exterior mexicano con experiencia
en glosa de pedimentos, clasificación arancelaria y cumplimiento IMMEX.

Se te entregan los datos extraídos de un expediente aduanero. Tu tarea es CRUZAR los
documentos entre sí y detectar inconsistencias, omisiones y riesgos.

REVISA ESPECÍFICAMENTE:

1. COHERENCIA DE VALOR
   - valor_comercial del pedimento vs. total de la factura vs. total del CFDI
   - Aplicación del tipo de cambio (DOF del día hábil anterior a la fecha de pago)
   - Incrementables: ¿se declararon fletes, seguros y embalajes? Si el incoterm es
     EXW/FOB y no hay flete declarado, es una omisión probable.
   - Suma de valores de partidas vs. valor total declarado

2. CLASIFICACIÓN ARANCELARIA
   - ¿La fracción declarada es congruente con la descripción de la mercancía?
   - ¿El NICO está presente y tiene 2 dígitos?
   - ¿La tasa de IGI aplicada corresponde a la fracción y al país de origen?
   - Señala fracciones que típicamente son objeto de revisión o reclasificación.

3. ORIGEN Y PREFERENCIAS
   - Si se aplicó trato preferencial (T-MEC u otro), ¿existe certificado de origen?
   - ¿Coincide el país de origen entre pedimento, factura y certificado?
   - ¿El certificado cubre las fracciones y el periodo declarado?

4. CANTIDADES Y PESOS
   - Cantidad UMC/UMA del pedimento vs. packing list vs. factura
   - Peso bruto vs. peso neto vs. bultos: ¿son internamente coherentes?

5. REGULACIONES NO ARANCELARIAS
   - ¿La fracción requiere permiso, NOM, aviso sanitario o certificado SENASICA?
   - ¿Está declarado el identificador correspondiente?

6. DATOS DEL CONTRIBUYENTE
   - RFC del importador: formato válido y consistente entre pedimento y CFDI
   - ¿El CFDI tiene complemento de comercio exterior cuando corresponde?
   - Coherencia de razón social entre documentos

7. DOCUMENTACIÓN FALTANTE
   - Señala cualquier documento soporte esperado que no fue proporcionado.

CÓMO LLENAR CADA HALLAZGO:
- severidad: CRITICO (multa, crédito fiscal o suspensión de padrón), ALTO
  (probable rectificación), MEDIO (dato faltante o discrepancia menor),
  BAJO (observación de forma).
- valor_pedimento / valor_soporte: el dato tal como aparece en cada documento.
  Si no aplica, deja la cadena vacía.
- fundamento: referencia legal (Ley Aduanera, RGCE, LIGIE) SOLO si estás seguro;
  si no, deja la cadena vacía.
- accion_sugerida: qué debe hacer el cliente.

REGLAS CRÍTICAS:
- NO inventes discrepancias. Si los datos coinciden, no generes hallazgo.
- Si un dato no fue extraído, NO asumas que está mal: genera un hallazgo de severidad
  BAJO indicando que no pudo verificarse.
- Sé específico con números. "El valor difiere" es inútil; "$12,450.00 vs $12,540.00
  (diferencia de $90.00, posible transposición de dígitos)" es útil.
- Prefiere señalar de más en severidad BAJO/MEDIO que omitir un riesgo real.

DATOS DEL EXPEDIENTE:
{datos}"""


def analizar_expediente(cliente: Anthropic, datos: dict) -> tuple[list, str, str, dict]:
    """Cruza los documentos y devuelve (hallazgos, resumen, nivel_riesgo, uso)."""
    print("  [analizando] cruzando documentos...")

    sin_uso = {"entrada": 0, "salida": 0}
    fallo = ([], "El análisis automático falló. Revisión manual requerida.", "ALTO", sin_uso)

    try:
        # Streaming porque max_tokens alto + razonamiento adaptativo pueden
        # exceder el tiempo de espera de una petición normal.
        with cliente.messages.stream(
            model=MODELO_ANALISIS,
            max_tokens=32000,
            thinking={"type": "adaptive"},
            output_config={
                "effort": "high",
                "format": {"type": "json_schema", "schema": ESQUEMA_ANALISIS},
            },
            messages=[{
                "role": "user",
                "content": PROMPT_ANALISIS.format(datos=json.dumps(datos, ensure_ascii=False, indent=2)),
            }],
        ) as stream:
            respuesta = stream.get_final_message()
    except anthropic.APIStatusError as e:
        print(f"    ! Error de la API ({e.status_code}): {e.message}")
        return fallo
    except anthropic.APIConnectionError as e:
        print(f"    ! Sin conexión con la API: {e}")
        return fallo

    uso = {
        "entrada": respuesta.usage.input_tokens,
        "salida": respuesta.usage.output_tokens,
    }

    if respuesta.stop_reason == "refusal":
        print("    ! El modelo declinó realizar el análisis")
        return ([], "El modelo declinó realizar el análisis. Revisión manual requerida.", "ALTO", uso)

    if respuesta.stop_reason == "max_tokens":
        print("    ! Análisis truncado por límite de tokens")
        return ([], "El análisis quedó truncado. Revisión manual requerida.", "ALTO", uso)

    try:
        resultado = json.loads(texto_de(respuesta))
    except json.JSONDecodeError:
        print("    ! El análisis no devolvió JSON válido")
        return fallo

    return (
        resultado.get("hallazgos", []),
        resultado.get("resumen", ""),
        resultado.get("nivel_riesgo_global", "MEDIO"),
        uso,
    )


# ---------------------------------------------------------------------------
# Paso 3 — Reporte
# ---------------------------------------------------------------------------

ORDEN_SEVERIDAD = ["CRITICO", "ALTO", "MEDIO", "BAJO"]
ICONO = {"CRITICO": "🔴", "ALTO": "🟠", "MEDIO": "🟡", "BAJO": "⚪"}


def generar_reporte(res: ResultadoAuditoria, resumen: str, nivel: str) -> str:
    """Construye el reporte en Markdown listo para revisión humana."""
    conteo = {s: len([h for h in res.hallazgos if h.get("severidad") == s])
              for s in ORDEN_SEVERIDAD}

    lineas = [
        f"# Reporte de Revisión Preventiva",
        "",
        f"**Cliente:** {res.cliente}  ",
        f"**Expediente:** {res.expediente}  ",
        f"**Fecha de revisión:** {res.fecha_revision}  ",
        f"**Nivel de riesgo global:** {nivel}",
        "",
        "> ⚠️ **BORRADOR — PENDIENTE DE REVISIÓN PROFESIONAL.**",
        "> Generado con apoyo de herramientas automatizadas. No entregar al cliente",
        "> sin verificar cada hallazgo contra el documento fuente.",
        "",
        "---",
        "",
        "## Resumen ejecutivo",
        "",
        resumen or "_Pendiente._",
        "",
        "### Hallazgos por severidad",
        "",
        "| Severidad | Cantidad | Significado |",
        "|---|---:|---|",
    ]

    for sev in ORDEN_SEVERIDAD:
        lineas.append(f"| {ICONO[sev]} {sev} | {conteo[sev]} | {SEVERIDADES[sev]} |")

    lineas += ["", "---", "", "## Documentos analizados", ""]
    for d in res.documentos_analizados:
        lineas.append(f"- ✅ {d}")
    if res.documentos_faltantes:
        lineas += ["", "**No proporcionados:**", ""]
        for d in res.documentos_faltantes:
            lineas.append(f"- ❌ {d}")

    lineas += ["", "---", "", "## Hallazgos detallados", ""]

    if not res.hallazgos:
        lineas.append("_No se detectaron inconsistencias en la revisión automatizada. "
                      "Esto no sustituye la revisión profesional._")
    else:
        for sev in ORDEN_SEVERIDAD:
            grupo = [h for h in res.hallazgos if h.get("severidad") == sev]
            if not grupo:
                continue
            lineas += [f"### {ICONO[sev]} {sev}", ""]
            for i, h in enumerate(grupo, 1):
                lineas += [
                    f"**{i}. {h.get('campo', 'Sin campo')}**",
                    "",
                    h.get("descripcion", ""),
                    "",
                ]
                if h.get("valor_pedimento") or h.get("valor_soporte"):
                    lineas += [
                        "| | Valor |",
                        "|---|---|",
                        f"| Pedimento | `{h.get('valor_pedimento') or '—'}` |",
                        f"| Soporte | `{h.get('valor_soporte') or '—'}` |",
                        "",
                    ]
                if h.get("fundamento"):
                    lineas += [f"*Fundamento:* {h['fundamento']}", ""]
                if h.get("accion_sugerida"):
                    lineas += [f"*Acción sugerida:* {h['accion_sugerida']}", ""]
                lineas.append("")

    lineas += [
        "---",
        "",
        "## Verificación profesional",
        "",
        "- [ ] Cada hallazgo verificado contra documento fuente",
        "- [ ] Fundamentos legales confirmados",
        "- [ ] Falsos positivos eliminados",
        "- [ ] Redacción revisada para el cliente",
        "",
        "**Revisado por:** ________________________  **Fecha:** ____________",
        "",
        "---",
        "",
        f"*Costo de procesamiento IA: ${res.costo_estimado_usd:.4f} USD*",
        "",
        "*Este documento es una revisión preventiva de carácter informativo. No constituye "
        "asesoría fiscal, legal ni aduanera, ni sustituye la responsabilidad del agente "
        "aduanal o del importador. La responsabilidad del emisor se limita al monto de los "
        "honorarios del periodo revisado.*",
    ]

    return "\n".join(lineas)


# ---------------------------------------------------------------------------
# Costos
# ---------------------------------------------------------------------------

# USD por millón de tokens, a precio de lista. Sonnet 5 tiene precio
# promocional más bajo hasta el 31/08/2026; usamos el de lista para no
# subestimar el costo.
PRECIOS = {
    MODELO_EXTRACCION: {"entrada": 1.00, "salida": 5.00},
    MODELO_ANALISIS:   {"entrada": 3.00, "salida": 15.00},
}


def calcular_costo(uso: list[tuple[str, int, int]]) -> float:
    total = 0.0
    for modelo, entrada, salida in uso:
        p = PRECIOS.get(modelo, {"entrada": 3.0, "salida": 15.0})
        total += (entrada / 1_000_000) * p["entrada"]
        total += (salida / 1_000_000) * p["salida"]
    return total


# ---------------------------------------------------------------------------
# Orquestación
# ---------------------------------------------------------------------------

def auditar(carpeta: Path, nombre_cliente: str) -> ResultadoAuditoria:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Falta la variable de entorno ANTHROPIC_API_KEY")

    cliente = Anthropic(api_key=api_key)

    res = ResultadoAuditoria(
        expediente=carpeta.name,
        cliente=nombre_cliente,
        fecha_revision=datetime.now().strftime("%d/%m/%Y"),
    )

    archivos = sorted(p for p in carpeta.iterdir() if p.is_file() and not p.name.startswith("."))
    if not archivos:
        sys.exit(f"No se encontraron archivos en {carpeta}")

    print(f"\nExpediente: {carpeta.name}")
    print(f"Cliente: {nombre_cliente}")
    print(f"Archivos: {len(archivos)}\n")

    uso_tokens = []
    encontrados = set()

    # Paso 1 — extracción
    for ruta in archivos:
        tipo = clasificar_archivo(ruta)
        if tipo is None:
            print(f"  [omitido] {ruta.name} (tipo no reconocido)")
            continue
        datos = extraer_documento(cliente, ruta, tipo)

        # Un expediente puede traer varias facturas o packing lists; no se
        # deben pisar entre sí o el cruce se haría contra un solo documento.
        clave = tipo
        n = 2
        while clave in res.datos_extraidos:
            clave = f"{tipo}_{n}"
            n += 1

        res.datos_extraidos[clave] = datos
        res.documentos_analizados.append(f"{TIPOS_DOCUMENTO[tipo]} — {ruta.name}")
        encontrados.add(tipo)
        if "_uso" in datos:
            uso_tokens.append((MODELO_EXTRACCION, datos["_uso"]["entrada"], datos["_uso"]["salida"]))

    # Documentos esperados que no llegaron
    esperados = ["pedimento", "factura", "packing"]
    for e in esperados:
        if e not in encontrados and not (e == "factura" and "cfdi" in encontrados):
            res.documentos_faltantes.append(TIPOS_DOCUMENTO[e])

    if "pedimento" not in encontrados:
        print("\n  ! ADVERTENCIA: no se identificó un pedimento en el expediente.")

    # Paso 2 — análisis
    hallazgos, resumen, nivel, uso_analisis = analizar_expediente(cliente, res.datos_extraidos)
    res.hallazgos = hallazgos
    uso_tokens.append((MODELO_ANALISIS, uso_analisis["entrada"], uso_analisis["salida"]))
    res.costo_estimado_usd = calcular_costo(uso_tokens)

    print(f"\n  Hallazgos: {len(hallazgos)}  |  Riesgo: {nivel}")
    print(f"  Costo IA: ${res.costo_estimado_usd:.4f} USD\n")

    # Paso 3 — reporte
    reporte = generar_reporte(res, resumen, nivel)
    salida = carpeta / f"REPORTE_{carpeta.name}_{datetime.now():%Y%m%d}.md"
    salida.write_text(reporte, encoding="utf-8")
    (carpeta / f"datos_{carpeta.name}.json").write_text(
        json.dumps(asdict(res), ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"  Reporte: {salida}")
    print("\n  >>> PENDIENTE: revisión profesional antes de entregar al cliente.\n")

    return res


def main():
    ap = argparse.ArgumentParser(description="Auditor preventivo de pedimentos")
    ap.add_argument("carpeta", type=Path, help="Carpeta del expediente")
    ap.add_argument("--cliente", default="Cliente", help="Razón social del cliente")
    args = ap.parse_args()

    if not args.carpeta.is_dir():
        sys.exit(f"No existe la carpeta: {args.carpeta}")

    auditar(args.carpeta, args.cliente)


if __name__ == "__main__":
    main()
