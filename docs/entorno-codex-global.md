# Reproducir el entorno global de Codex en otra computadora

Este documento es para mi Codex de la laptop. Describe la configuración global observada en la computadora de origen el 30 de octubre de 2026. Su propósito es instalar las skills faltantes y aplicar las preferencias y reglas globales sin modificar la lógica ni los datos de este proyecto. Lee este archivo completo antes de actuar. Conserva las configuraciones que ya existan en la laptop y fusiona los cambios; no sobrescribas archivos globales sin comparar su contenido.

El repositorio solo contiene este inventario. No incluye las 74 skills ni los scripts de hooks. Las 65 skills con origen registrado pueden instalarse desde GitHub; las otras 9 y el script de notificaciones requieren una copia de la computadora de origen o una fuente verificada. No inventes su contenido ni declares la migración completa si faltan.

## Preparar la laptop

1. Abre este repositorio con Codex y pide: «Lee `docs/entorno-codex-global.md` y reproduce en esta laptop únicamente las configuraciones globales que falten. Compara antes de editar, verifica el resultado y no hagas commit».
2. Comprueba que Codex reconoce `~/.codex/` y que puede leer `~/.agents/skills/` o `~/.codex/skills/` como ubicación global de skills. Usa la ubicación que reconozca la instalación de la laptop.
3. Instala las skills faltantes del inventario siguiente. No reinstales las que ya funcionen.
4. Fusiona las reglas globales y las preferencias portables de esta página. Adapta las rutas de hooks a la laptop.
5. Reinicia Codex y verifica que puede descubrir una skill de diseño, una de documentación y los hooks activados. Informa qué quedó pendiente.

## Skills instaladas en la computadora de origen

Hay **74 skills de usuario** bajo `~/.agents/skills/`. Las skills de sistema que entrega Codex, como `imagegen`, `openai-docs`, `skill-creator` y `skill-installer`, pertenecen a la instalación de la aplicación y no se copian desde este repositorio. Las skills de plugins también dependen de la aplicación y sus conexiones.

### 65 skills con origen registrado

El registro `~/.agents/.skill-lock.json` identifica para estas skills el repositorio público `https://github.com/wondelai/skills.git`. En la laptop, usa la skill de sistema `skill-installer` con `--repo wondelai/skills` y la ruta de cada carpeta listada. El instalador de Codex admite `--dest` para instalar en la ubicación global que reconozca la laptop. Verifica las rutas en el repositorio remoto antes de instalar y omite las skills ya presentes. No copies el archivo de bloqueo de esta computadora como sustituto de la instalación.

- `37signals-way`
- `architecture-optimization`
- `blue-ocean-strategy`
- `clean-architecture`
- `clean-code`
- `cold-start-problem`
- `contagious`
- `continuous-discovery`
- `conversion-optimization`
- `create-app`
- `create-business`
- `create-website`
- `cro-methodology`
- `crossing-the-chasm`
- `ddia-systems`
- `design-code-architecture`
- `design-everyday-things`
- `design-sprint`
- `domain-driven-design`
- `drive-motivation`
- `good-strategy-bad-strategy`
- `grow-app`
- `grow-business`
- `grow-website`
- `high-output-management`
- `high-perf-browser`
- `hooked-ux`
- `hundred-million-offers`
- `improve-app`
- `improve-business`
- `improve-code-quality`
- `improve-retention`
- `improve-website`
- `influence-psychology`
- `inspired-product`
- `ios-hig-design`
- `jobs-to-be-done`
- `lean-analytics`
- `lean-startup`
- `lean-ux`
- `made-to-stick`
- `microinteractions`
- `mom-test`
- `monetizing-innovation`
- `negotiation`
- `obviously-awesome`
- `one-page-marketing`
- `pragmatic-programmer`
- `predictable-revenue`
- `refactoring-patterns`
- `refactoring-ui`
- `release-it`
- `remove-technical-debt`
- `scorecard-marketing`
- `software-design-philosophy`
- `steve-jobs-design-review`
- `storybrand-messaging`
- `system-design`
- `team-topologies`
- `technical-documentation`
- `top-design`
- `traction-eos`
- `ux-heuristics`
- `web-typography`
- `working-with-legacy-code`

### 9 skills sin origen registrado

Estas carpetas tienen `SKILL.md` local, pero no figuran en el archivo de bloqueo. Para reproducirlas fielmente, copia **la carpeta completa** desde `~/.agents/skills/` de la computadora de origen a la ubicación global de skills de la laptop. Conserva `scripts/`, `references/`, `assets/` y demás recursos. Si no puedes acceder a la computadora de origen, localiza una fuente verificable antes de instalar. `impeccable` incluye el ejecutable usado por dos hooks.

- `apple-design`
- `design-craft`
- `emil-design-eng`
- `frontend-design`
- `impeccable`
- `modelar-3d`
- `reverse-engineer-anything`
- `taste-skill`
- `ui-ux-pro-max`

## Preferencias globales portables

La configuración observada está en `~/.codex/config.toml`. Antes de añadir estas claves, comprueba cuáles existen en la laptop y respeta sus valores si la persona los ha personalizado allí. El modelo puede depender de disponibilidad de cuenta y versión de Codex.

```toml
model = "gpt-6.1-sol"
model_reasoning_effort = "medium"
service_tier = "default"

[desktop]
followUpQueueMode = "steer"
conversationDetailMode = "STEPS_PROSE"
sansFontSize = 14
codeFontSize = 13
ambient-suggestions-enabled = true
```

La computadora de origen tiene activos los plugins integrados `codex-app-tools`, `browser`, `unified-computer-use`, `code-review`, `visualize`, `documents`, `pdf`, `spreadsheets`, `presentations` y `template-creator`. Comprueba su disponibilidad y actívalos en la laptop mediante Codex si están instalados. No copies las rutas internas de marketplaces, MCP ni los identificadores de apps: pertenecen a esa instalación. Tampoco copies la lista de proyectos confiables; marca como confiable este clon solo después de revisar su ubicación y contenido en la laptop.

## Reglas globales de trabajo

Estas reglas proceden de `~/.codex/AGENTS.md` en la computadora de origen. En la laptop, fusiónalas con ese archivo global sin borrar reglas preexistentes. El archivo `AGENTS.md` de la raíz de este repositorio tiene instrucciones **del proyecto INE** y debe conservarse separado. Las instrucciones explícitas de la sesión tienen prioridad.

1. Verificación de Skills y Hooks:
- Verifica el correcto funcionamiento de skills y hooks únicamente al inicio de un proyecto o en el momento exacto en que se requiera utilizar una habilidad. No repitas esta comprobación en cada solicitud y notifica de inmediato si algo no responde.

2. Control de Versiones (Git):
- Prepara los cambios en staged, excluyendo aquellos archivos que deben permenecer exclusivamente en entorno local.
- Nunca ejecutes git commit; Deja los cambios listos en staged para mi revisión previa.
- Proporciona un texto breve con un título y una descripción clara para el commit. De preferencia indicando los cambios trabajados.

3. Código y Comentarios:
- No añadas comentarios nuevos al código bajo ninguna circunstancia.
- Respeta y conserva intactos todos los comentarios existentes dejados por el usuario (prohibido eliminarlos).

4. Gestión. Limpieza y Organización de Archivos:
- Elimina archivos basura o prescindibles. (como .DS_Store o archivos obsoletos).
- No generes archivos de texto con explicaciones de uso o reportes de análisis a menos que se solicite explícitamente.
- Organiza y reubica automáticamente los archivos que se coloquen en la carpeta principal hacia su estructura ópima correspondiente según el contexto del proyecto.

5. Visualización Web:
- En proyectos web, al finalizar cada proceso o iteración importante, utiliza el servidor [https://127.0.0.1:4170/](https://127.0.0.1:4170/) (o equivalente) para visualizar y comprobar los cambios en local.

6. Rendimiento Web (WPO), Multimedia/3D, SEO y Portabilidad:
- Inmutabilidad de diseño: Al refactorizar u optimizar código, respeta estrictamente el diseño visual, estilos, animaciones y layout existentes; Jamás modifiques la apariencia estética a menos que se solicite explícitamente.
- Optimización multimedia y 3D: Al implementar o editar componentes con vídeos, imágenes o modelos 3D (WebGL / Three.js), aplica por defecto carga diferida (lazy loading / dynamic imports), pausa de renderizado o reproducción cuando el elemento sale del viewport (IntersectionObserver) y liberación estricta de memoria (dispose de geometrías, materiales, texturas y listeners) al desmontar componentes.
- Core Web Vitals y código limpio: Previene el Cumulative Layout Shift (CLS) definiendo siempre dimensiones o aspect-ratio en contenedores multimedia, minimiza el JavaScript en el hilo principal dividiendo el bundle por rutas/componentes y evita re-renderizados innecesarios.
- SEO técnico y semántica: En cada nueva vista o sección creada, utiliza HTML 5 semántico riguroso, jerarquía lógica de encabezados (H1-H6), atributos descriptivos en multimedia y metadatos/rutas parametrizadas mediante variables de entorno.
- Agnosticismo de Hosting: Escribe código portable y estándar que funcione tanto en entornos de previsualización (Vercel) como en servidores de producción tradicionales (Neubox/Hostinger con Apache/Nginx), evitando atar la lógica del proyecto a APIs propietarias de una sola nube.

7. Creación de Nuevas Interfaces UX/UI, Dirección de Arte y Animaciones (Creación desde cero o rediseño explícito):
- Alcance y respeto al Punto 6: Estas reglas se aplican exclusivamente al diseñar vistas/componentes nuevos desde cero o cuando el usuario solicite explícitamente un rediseño estético. En tareas de refactorización u optimización WPO, prevalece estrictamente la "Inmutabilidad de diseño" del Punto 6.
- Orquestación de Skills de Diseño: Al crear interfaces nuevas, combina el criterio de nuestras skills instaladas en `~/.agents/skills` (`taste-skill`, `frontend-design`, `emil-design-eng`, `apple-design`, `refactoring-ui`, `web-typography` y `ux-heuristics`).
- Flujo Pre-Código: Antes de programar una vista nueva, define internamente la dirección estética (ej. Editorial Minimalista, Brutalismo Técnico, Industrial Oscuro, Neo-Suizo) y una paleta de 4 a 6 tokens de color con propósito claro.
- Reglas Estrictas Anti-Slop (Prohibiciones en diseños nuevos):
  * Tipografía: Prohibido usar Inter, Roboto, Open Sans o Arial como fuente Display/Titulares. Combina fuentes con personalidad (Serif editorial, Grotesque o Display) con Sans legibles para UI (ej. Geist, Plus Jakarta Sans, Satoshi) y Monospace para datos numéricos/técnicos.
  * Color y Superficies: Prohibidos los degradados morados/azules genéricos sobre fondos blancos o negros puros (#000000 / #FFFFFF). Usa blancos con matiz cálido/hueso (#FAF9F6, #F4F4F0) o negros carbón/azulado (#090A0F, #0C0C0E), bordes sutiles de 1px con opacidad (border-white/[0.08] o border-black/[0.06]), luz interior cenital (inner glow) y sombras en capas.
  * Layouts: Prohibido repetir el patrón cliché de "Hero centrado + 3 tarjetas idénticas en fila". Prioriza Bento Grids asimétricos, layouts divididos (split-screen) o composiciones editoriales con al menos 25-30% de espacio negativo intencional.
  * Copywriting: Prohibidas frases robóticas genéricas ("Potencia tu flujo de trabajo", "Lleva tu negocio al siguiente nivel"). Usa verbos directos y voz activa.
- Tipografía Óptica: En titulares (H1-H3) aplica tracking negativo (-0.02em a -0.04em), line-height compacto (1.05 a 1.15) y `text-wrap: balance`. En párrafos limita el ancho a 60ch-70ch con `text-wrap: pretty`. En tablas, precios y métricas aplica siempre `tabular-nums`.
- Ingeniería de Animaciones y Micro-interacciones:
  * Anima exclusivamente `transform` y `opacity` (respetando Core Web Vitals y CLS del Punto 6).
  * Prohibido iniciar modales, popovers o tarjetas desde `scale(0)`; inicia siempre desde `scale(0.95)` o `scale(0.96)` con `opacity: 0`.
  * Prohibido usar curvas `linear` o `ease-in` en entradas; utiliza curvas de desaceleración reales (`cubic-bezier(0.22, 1, 0.36, 1)` o `cubic-bezier(0.16, 1, 0.3, 1)`) o física de resortes equilibrada (`stiffness: 300-400`, `damping: 25-35`).
  * Tiempos: 100ms-150ms para micro-interacciones (hover/active con `active:scale-[0.98]`), 150ms-200ms para popovers/dropdowns, y 200ms-300ms para modales/drawers. Respeta siempre `prefers-reduced-motion: reduce`.
- Estados Completos: Todo componente interactivo nuevo debe contemplar estados `hover`, `focus-visible`, `active`, `disabled` y *skeletons* con la geometría exacta del contenido.

## Hooks y notificaciones

La computadora de origen tiene `~/.codex/hooks.json` con estos eventos:

| Evento | Filtro | Acción | Límite |
| --- | --- | --- | --- |
| `PermissionRequest` | Todos | Ejecuta `~/.codex/bin/codex_beeps.py permission` con Python 3. | 3 s |
| `PostToolUse` | `Edit|Write|apply_patch` | Ejecuta `~/.agents/skills/impeccable/scripts/impeccable hook` si existe. | 5 s |
| `Stop` | Todos | Ejecuta el mismo hook de `impeccable` si existe. | 30 s |

Para activarlos en la laptop:

1. Comprueba que `impeccable` está instalado y que su lanzador funciona. Copia `~/.codex/bin/codex_beeps.py` desde la computadora de origen si quieres conservar el sonido de permisos; el script no está en este repositorio.
2. Compara el `hooks.json` de ambas computadoras. Añade solo los eventos faltantes y sustituye las rutas absolutas por las rutas reales de la laptop. Si la laptop usa Windows, usa `impeccable.cmd` para los hooks de diseño.
3. Revisa el contenido de cada comando antes de conceder confianza o habilitarlo. Los hashes de confianza almacenados en `config.toml` son locales y no se transfieren.
4. Prueba una edición pequeña y una finalización de turno. Si un hook falla, desactiva únicamente ese hook y comunica el error.

## Verificar la migración

Comprueba que cada carpeta instalada contiene `SKILL.md` y los recursos que referencia. Confirma que las reglas globales se leen en un proyecto nuevo, que las reglas del INE siguen limitadas a este repositorio y que los hooks se ejecutan sin errores. El resultado esperado es **74 skills de usuario**, además de las skills de sistema y plugins disponibles en la laptop. Informa cualquier skill o configuración que no pudiste transferir.
