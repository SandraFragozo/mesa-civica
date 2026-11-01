# Instrucciones del proyecto para agentes

Este archivo guía a Codex, Antigravity y otros agentes que trabajen en `Proyecto INE/`. El objetivo es mantener el sitio web de «Hackea la participación» para el Reto 3 del INE con los Conteos Censales de Participación Ciudadana (CCPC) 2009–2024. El sitio sirve a jóvenes y equipos de educación cívica, con metodología desplegable. Abre `Proyecto INE/` como raíz del proyecto antes de editar o ejecutar comandos.

## Estructura vigente

| Ruta | Función |
| --- | --- |
| `index.html` | Entrada pública del sitio. Se genera; no se edita a mano. |
| `web/index.template.html`, `web/scene.css`, `web/scene.js` | Plantilla, escena de la mesa e interacciones de sus objetos. |
| `web/atlas.css`, `web/atlas.js`, `web/notebook.css`, `web/notebook.js`, `web/credential.css`, `web/credential.js` | Atlas, cuaderno con logros y credencial cívica ilustrativa. |
| `web/explorer.html`, `web/explorer.css`, `web/explorer.js` | Mapa estatal, filtros, historias y tabla comparativa. |
| `web/styles.css`, `web/data-engine.js`, `web/game-content.js` | Estilos base, cálculos compartidos y contenidos de los juegos. |
| `assets/imgs/` | Fondo, cartas de lotería y cubierta del cuaderno. |
| `assets/modelos-3d/{balero,dados,pirinola}/` | Scripts WebGL, modelos `.glb`, texturas y visores de prueba. El sitio carga los tres scripts de forma diferida. |
| `assets/mapas/` | Dos SVG de origen y `vinculacion_edocve.json`, que relaciona las piezas geográficas con las 32 entidades. |
| `analysis/01_auditoria_rapida.py` a `analysis/03_hallazgos_storytelling.py` | Procesamiento de CSV originales y análisis; requieren los datos crudos externos. |
| `analysis/04_construir_mapa.py` | Lee los cubos ya generados e inserta datos, SVG, CSS y JavaScript en `index.html`. |
| `output/` | Cuatro cubos y reportes derivados de los CCPC. Es fuente de datos para el generador, no raíz del sitio. |
| `scripts/build.mjs`, `public/`, `vercel.json` | Build estático y salida de publicación para Vercel. `public/` es generado y está ignorado en Git. |
| `tests/`, `analysis/tests/` | Pruebas de datos, navegador, juegos, diseño responsivo y despliegue. |

El navegador usa los datos incrustados en `index.html`: no requiere Python, CSV ni una API durante la visita. El build de Vercel ejecuta `npm run build` y publica `public/`; el mismo resultado funciona en un servidor estático tradicional. Mantén `index.html` como entrada pública y los scripts de análisis en `analysis/`.

## Flujo de trabajo

1. Para cambiar el sitio, edita los archivos fuente en `web/` o los recursos en `assets/`. Mantén las rutas locales relativas y el funcionamiento sin conexión.
2. Si cambias plantilla, estilos, lógica incrustada, SVG o datos de origen, regenera `index.html` desde la raíz con `python analysis/04_construir_mapa.py`. En Windows puedes usar `.venv\Scripts\python.exe` si ese entorno ya existe.
3. Ejecuta `npm run build` para verificar la salida estática. No edites `public/` a mano.
4. Ejecuta `npm test` y `python analysis/run_tests.py` según el alcance del cambio. Las pruebas de navegador de Python requieren Playwright y un navegador local.
5. Comprueba los cambios visuales con `npm run dev` en `http://127.0.0.1:4170/`; reinicia el servidor tras una iteración importante. Usa `npm run preview` para revisar `public/` después del build.

Los CSV crudos de `Datos/` no forman parte del sitio ni están garantizados en esta máquina. Ya se procesaron 54,872,712 filas ordinarias. No ejecutes ni modifiques `analysis/01_auditoria_rapida.py`, `analysis/02_generar_cubos.py` o `analysis/03_hallazgos_storytelling.py` sin una solicitud explícita. Los cuatro cubos existentes en `output/` permiten reconstruir el sitio con `analysis/04_construir_mapa.py`.

## Interfaz implementada

La escena es una mesa ilustrada que se acerca con el scroll hasta un límite. En ella están el mapa escolar, la credencial cívica de ejemplo, cuatro cartas sueltas, dos cartones de lotería, el cuaderno, el Atlas, el balero, la pirinola y los dados. Cada objeto se abre en un diálogo y vuelve a la mesa. Conserva el diseño, las animaciones, la proporción de los objetos y la separación entre ellos en móvil y escritorio salvo que la tarea pida cambiarlos.

El mapa ampliado presenta historias en pestañas a la izquierda, un mapa estatal y una tabla comparativa al centro, y filtros a la derecha. Los filtros permiten elegir rangos de grupos de edad y varios sexos, zonas y años. Ningún estado está seleccionado al abrir; el usuario puede elegir varios, seleccionar los 32 o restablecer el mapa. El mapa colorea la participación ordinaria según el perfil elegido. La tabla compara los estados y, cuando corresponde, desglosa los sexos y las zonas elegidos. El detalle municipal ya no se publica en esta vista; el cubo sigue disponible en `output/` para análisis futuros. Las 32 claves `EDOCVE` deben seguir mapeadas una a una; las 84 piezas SVG incluyen islas. El contorno seleccionado debe dibujarse completo sobre los estados vecinos.

La vinculación geográfica tiene pruebas y una huella del SVG de origen. Si una tarea requiere cambiar el mapa o `vinculacion_edocve.json`, verifica otra vez las 32 claves, las 84 piezas y el contorno antes de regenerar el sitio.

Las cartas abren cuatro historias con anverso y reverso. La lotería usa 18 cartas y tableros de 3 × 3 o 4 × 4, a solas o contra la máquina. El balero conserva ocho preguntas con animaciones de acierto y fallo. La pirinola tiene seis caras de dificultad, dos por nivel, y ocho preguntas por nivel distintas de las del balero. Los dos dados muestran MITO o VERDAD y presentan dos historias distintas en cada tirada. El cuaderno contiene guía, logros guardados solo en el navegador, metodología y equipo. El Atlas presenta siete capítulos con páginas que se pasan desde las esquinas y un selector de año dentro del título cuando hay datos comparables. La credencial cívica es una ilustración editable y descargable, marcada como ejemplo educativo; sus datos personales se procesan en el navegador y no se envían al sitio.

En `assets/imgs/loteria/` están las 18 cartas numeradas, sus vistas previas, el reverso y la imagen del frijol. Los `.glb` y las texturas de `assets/modelos-3d/` son recursos fuente; el build actual publica los tres scripts WebGL que usa el sitio.

## Rigor de los datos

- Suma `LN`, `SV`, `NV` y `NS` antes de calcular tasas. Participación = `SV / LN × 100`; abstención = `NV / LN × 100`; no especificado = `NS / LN × 100`. Nunca promedies porcentajes de grupos.
- Conserva `NS` separado de `NV`: no equivale a abstención. Si `LN = 0`, no muestres una tasa de cero como si hubiera observaciones.
- Si `LN < 100`, presenta los conteos absolutos y la advertencia `LN < 100: base pequeña`.
- Voto Anticipado y Prisión Preventiva de 2024 son conteos de registros separados del universo ordinario. Sus archivos no contienen denominador `LN` ni edad; no inventes tasas o grupos de edad.
- La categoría `No binario` está disponible en estos cubos para 2024. Su ausencia en 2009–2021 no significa una tasa de cero. Las seis elecciones son cortes transversales: sumar sus `LN` no cuenta personas únicas.
- El universo de los cuadernillos capturados excluye casillas especiales y voto desde el extranjero. Explica el alcance al presentar comparaciones.

### Cifras nacionales conciliadas

| Elección | Tipo | LN | SV | NV | NS | SV/LN | NV/LN | NS/LN |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2009 | Intermedia | 77,481,831 | 33,316,974 | 42,298,963 | 1,865,894 | 43.00% | 54.59% | 2.41% |
| 2012 | Presidencial | 76,490,962 | 47,383,154 | 28,939,159 | 168,649 | 61.95% | 37.83% | 0.22% |
| 2015 | Intermedia | 83,563,462 | 36,926,612 | 41,517,874 | 5,118,976 | 44.19% | 49.68% | 6.13% |
| 2018 | Presidencial | 89,123,997 | 51,784,399 | 31,249,856 | 6,089,742 | 58.10% | 35.06% | 6.83% |
| 2021 | Intermedia | 93,532,133 | 46,389,189 | 43,099,624 | 4,043,320 | 49.60% | 46.08% | 4.32% |
| 2024 | Presidencial | 98,330,348 | 54,899,228 | 37,105,466 | 6,325,654 | 55.83% | 37.74% | 6.43% |

Hallazgos de referencia para las historias, siempre sujetos al perfil activo y a los cubos:

- Edad: en 2024, 18–19 años registró 53.06%, 20–24 registró 45.20% y 25–29 registró 44.15%. En 2021 fueron 49.36%, 39.87% y 37.91%, respectivamente. En las seis elecciones, el primer grupo de 30 años o más que recupera la tasa de 18–19 es 40–49.
- Género y territorio en 2024: mujeres frente a hombres, rural 61.13% frente a 49.97% (+11.16 puntos), mixta 58.83% frente a 49.24% (+9.59), urbana 60.08% frente a 51.90% (+8.18). En rural, los conteos son mujeres `SV=5,399,210 / LN=8,832,918` y hombres `SV=4,188,986 / LN=8,383,603`.
- Elecciones: la brecha presidencial menos intermedia acumulada es mayor en Ciudad de México (+22.82 puntos), Quintana Roo (+18.00), Tlaxcala (+17.13), Aguascalientes (+16.83) y Puebla (+16.75). Por edad destacan 30–39 (+13.64), 25–29 (+13.52) y 20–24 (+13.00).
- Inclusión 2024: Prisión Preventiva tiene 26,563 registros y Voto Anticipado, 3,449. En el universo ordinario, `No binario` reúne `LN=105`, `SV=79`, `NV=23` y `NS=3`, distribuidos en 18 entidades. Muestra bases estatales pequeñas con sus conteos.

## Reglas de colaboración

- No añadas comentarios nuevos al código; conserva los comentarios existentes de otras personas.
- No cambies la apariencia, las animaciones ni la disposición fuera del alcance de la solicitud. Mantén carga diferida y pausa de los objetos 3D fuera de vista; libera recursos y listeners cuando se desmonten.
- Mantén el sitio portable y sin dependencias de ejecución de un proveedor de hosting. Verifica teclado, foco, texto alternativo, tamaño de medios y ausencia de desbordes en pantallas pequeñas.
- No crees reportes o instrucciones adicionales salvo que se pidan. Conserva dentro de `Proyecto INE/` los archivos del proyecto y elimina artefactos temporales prescindibles.
- Verifica las habilidades y los hooks del entorno al iniciar un proyecto o justo cuando necesites usarlos; evita repetir esa comprobación en cada solicitud y avisa si fallan.
- Deja los cambios de cada tarea en *staged* para revisión; nunca ejecutes `git commit`. Excluye del staging `.venv/`, `public/`, `.local/` y otros archivos locales ignorados. Propón un título y una descripción breve para el commit.
