# Auditor de Pedimentos

Motor de revisión preventiva asistida por IA. Lee un expediente aduanero
(pedimento + documentos soporte), cruza los datos entre documentos y genera un
borrador de reporte en Markdown con los hallazgos clasificados por severidad.

**El reporte es un borrador. No se entrega a un cliente sin revisión profesional
de cada hallazgo contra el documento fuente.**

## Instalación

```bash
cd tools/auditor-pedimentos
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Uso

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
python auditor_pedimentos.py ./expedientes/PED-3001234 --cliente "ACME SA de CV"
```

La carpeta del expediente se arma por nombre de archivo. El nombre se normaliza
(sin acentos, sin guiones ni espacios) antes de clasificar, así que
`carta 3.1.8.pdf`, `Carta-3.1.8.pdf` y `carta_318.pdf` se reconocen igual:

```
PED-3001234/
  pedimento.pdf
  factura.pdf              (o cfdi.xml)
  packing_list.pdf
  manifestacion.pdf        (opcional)
  certificado_origen.pdf   (opcional)
  carta_318.pdf            (opcional)
  conocimiento.pdf         (opcional)
```

Formatos aceptados: PDF, PNG, JPG, XML y TXT. Los archivos con un nombre que no
corresponda a ningún tipo conocido se omiten y se avisa en consola. Si el
expediente trae varias facturas o packing lists, todas se procesan (`factura`,
`factura_2`, …).

## Salidas

Ambas se escriben dentro de la carpeta del expediente:

- `REPORTE_<expediente>_<AAAAMMDD>.md` — el borrador para revisión, con la
  tabla de severidades, los hallazgos detallados y la lista de verificación
  que firma quien revisa. Los documentos que no se pudieron leer se listan
  aparte, con ⚠️: no cuentan como analizados, porque el cruce no los vio.
- `datos_<expediente>.json` — los datos crudos extraídos de cada documento y
  los hallazgos, para trazabilidad.

## Cómo funciona

| Paso | Modelo | Qué hace |
|---|---|---|
| 1. Extracción | Claude Haiku 4.5 | Convierte cada documento a JSON estructurado. Un documento por llamada. |
| 2. Cruce | Claude Sonnet 5 | Compara los campos entre documentos y emite los hallazgos. Razonamiento adaptativo con esfuerzo `high` y salida forzada por esquema JSON. |
| 3. Reporte | Python | Arma el Markdown. Sin IA. |

El costo de la corrida se calcula a partir del consumo real de tokens de ambos
pasos y se imprime al final, además de quedar al pie del reporte. Sonnet 5
cotiza a precio promocional hasta el 31/08/2026; la tabla lo aplica sola
mientras esté vigente y vuelve al de lista después.

## Límites conocidos

- Un archivo no puede pasar de ~24 MB (la petición a la API tope en 32 MB y el
  base64 infla el tamaño ~4/3). Los archivos más grandes se reportan como error
  de ese documento y la corrida continúa.
- Los PDF escaneados dependen de la calidad de la imagen; el extractor marca
  `ILEGIBLE` cuando no puede leer un dato y reporta un `_confianza` por
  documento.
- El paso de cruce razona sobre lo que el paso de extracción logró leer: un
  dato que no se extrajo se reporta como "no pudo verificarse", no como
  correcto.
- Los fundamentos legales que emite el modelo se verifican a mano. El prompt
  pide omitirlos cuando no hay certeza, pero eso no los vuelve confiables.

## Aviso legal

Herramienta de apoyo a la revisión, no sustituto del criterio profesional. Los
modelos de lenguaje pueden omitir o inventar datos. No constituye asesoría
fiscal ni aduanera, ni sustituye la responsabilidad del agente aduanal o del
importador.
