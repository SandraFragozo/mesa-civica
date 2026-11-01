# Hackea la participación: la mesa cívica

Una mesa de objetos para explorar cómo ha cambiado la participación electoral en las **32 entidades de México**. Este proyecto del equipo **Camaradas de la Nación** participa en el Reto 3, *Storytelling y visualización con impacto público*, del hackathon **Hackea la Participación** del INE. Usa los Conteos Censales de Participación Ciudadana (CCPC) de las elecciones federales de **2009, 2012, 2015, 2018, 2021 y 2024**.

Está pensado para quien siente curiosidad por los datos, aunque nunca haya abierto una base electoral: puedes tocar el mapa, comparar estados y descubrir historias mediante juegos y objetos familiares.

## Recorre la mesa

Desliza la página para acercarte. En computadora, mueve el cursor hacia los bordes para recorrer la mesa ampliada. Toca un objeto para abrirlo y usa la cruz para volver.

| Objeto | ¿Qué puedes hacer? |
| --- | --- |
| **Mapa de México** | Elegir edades, sexos, zonas y años; tocar uno o varios estados; comparar sus resultados en una tabla. |
| **Atlas democrático** | Pasar las páginas desde sus esquinas y ver los hallazgos con mapas y gráficas. En las páginas comparables puedes cambiar el año desde el título. |
| **Cartas y lotería cívica** | Descubrir 18 cartas y leer sus historias al darles la vuelta. Jugar con un tablero de 3 × 3 o 4 × 4, a solas o contra la máquina, y marcar coincidencias con frijoles. |
| **Pirinola y balero** | Responder preguntas sobre participación y ver el resultado de cada intento. |
| **Dados** | Lanzar dos dados para descubrir un mito o una verdad en cada uno. |
| **Cuaderno** | Consultar la guía, el significado de los términos, la metodología, los logros y la información del equipo. |
| **Credencial cívica** | Crear y descargar una ilustración educativa con tus datos. Se procesa en tu navegador; **no es una identificación oficial**. |

## Las historias que cuentan los datos

El mapa organiza la exploración en cuatro ejes:

1. **Participación:** qué parte de la lista nominal tiene marca de que sí votó y cómo cambia entre estados.
2. **Edad:** cómo varía la participación desde los 18–19 años hasta los grupos de mayor edad, incluida la caída observada en los veinte.
3. **Elecciones:** cómo se comparan las elecciones presidenciales con las intermedias. Son cortes de años distintos, no el seguimiento de las mismas personas.
4. **Inclusión y territorio:** qué muestran los datos por sexo y zona urbana, mixta o rural, y qué registros especiales existen en 2024.

Los filtros modifican el mapa, la tabla y los textos de contexto. Puedes seleccionar varios estados para compararlos o restablecer la selección. Un color más intenso indica mayor participación **dentro del perfil elegido**.

## Cómo leer las cifras

Los porcentajes salen de conteos, no de promediar porcentajes de estados o grupos. Primero se suman los registros del perfil seleccionado y luego se calcula la tasa:

**Participación = registros con marca de que sí votó ÷ registros en la lista nominal × 100.**

En los archivos, `LN` es la lista nominal capturada; `SV`, la marca de que sí votó; `NV`, la marca de que no votó; y `NS`, la participación no especificada. **`NS` se mantiene separado de `NV`**: no se considera abstención. Cuando un grupo tiene menos de 100 registros en `LN`, su porcentaje requiere cautela.

Los archivos de **Voto Anticipado** y **Prisión Preventiva** de 2024 se muestran como conteos separados de la elección ordinaria. No tienen una lista nominal comparable para calcular aquí una tasa de participación. La categoría **No binario** aparece en estos cubos ordinarios de 2024; que no aparezca en años anteriores no significa que su participación haya sido cero. El universo ordinario capturado excluye las casillas especiales y el voto desde el extranjero.

Fuente: Instituto Nacional Electoral, Conteos Censales de Participación Ciudadana 2009–2024. El proyecto es una interpretación educativa de esos datos; no es un sitio oficial del INE.

## Abre el proyecto en tu computadora

Necesitas **Node.js** para usar el servidor de desarrollo. Desde la carpeta `Proyecto INE`:

```bash
npm run dev
```

Abre <http://127.0.0.1:4170/>. El sitio también se puede abrir directamente desde [`index.html`](index.html) sin conexión: sus datos y recursos de visualización se incluyen localmente.

Para preparar la versión estática y revisarla:

```bash
npm run build
npm run preview
```

La salida queda en `public/`. El proyecto usa esa carpeta para Vercel y también puede servirse desde un alojamiento estático convencional. **Python no se ejecuta cuando alguien visita el sitio.**

## Datos, código y pruebas

| Carpeta o archivo | Contenido |
| --- | --- |
| [`web/`](web/) | Plantilla HTML, estilos, interacciones y contenido de los juegos. |
| [`assets/`](assets/) | Ilustraciones, cartas, modelos 3D y SVG del mapa. |
| [`output/`](output/) | Cubos agregados, resumen de modalidades especiales, hallazgos y gráficas. |
| [`analysis/`](analysis/) | Auditoría, procesamiento de CSV, análisis y generador del HTML. |
| [`tests/`](tests/) y [`analysis/tests/`](analysis/tests/) | Pruebas del sitio, los juegos, la geometría del mapa y los cálculos. |
| [`index.html`](index.html) | Entrada pública generada; no se edita a mano. |

Si cambias los cubos, el SVG o los archivos de `web/`, vuelve a generar el HTML con Python. Los cuatro cubos de `output/` ya están en el repositorio; los CSV originales de las elecciones no son necesarios para este paso:

```bash
python -m pip install -r analysis/requirements.txt
python analysis/04_construir_mapa.py
npm run build
npm test
```

Los scripts `analysis/01_…` a `analysis/03_…` documentan el procesamiento desde los CSV originales. Las pruebas de navegador de `analysis/tests/` requieren Playwright y un navegador local.

## Equipo

**Camaradas de la Democracia:** Sandra Erika Sánchez Fragozo y Saraí Sánchez Fragozo.
