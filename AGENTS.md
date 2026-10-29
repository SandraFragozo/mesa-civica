# AGENTS.md — Contexto Maestro del Proyecto (Hackathon INE 2026 - Reto 3)

## 1. Objetivo del Proyecto
Este repositorio contiene el pipeline de datos y el prototipo visual interactivo para el concurso nacional **"Hackea la participación: Datos que construyen democracia"** del Instituto Nacional Electoral (INE / DECEYEC), específicamente para el **Reto 3: Comunicación y visualización con impacto público (Storytelling con datos)**, usando los Conteos Censales de Participación Ciudadana (CCPC) 2009–2024.

- **Público objetivo principal:** Jóvenes de 18 a 30 años y equipos de educación cívica de las 32 Juntas Locales Ejecutivas del INE.
- **Mensaje central:** Acompañar la participación ciudadana más allá del primer voto (18-19 años) y durante las elecciones intermedias, visibilizando el liderazgo de las mujeres (especialmente rurales) y las nuevas modalidades de inclusión 2024.
- **Modo de trabajo actual (Máquina secundaria - Solo Frontend/UI):** En este entorno nos enfocamos exclusivamente en el rediseño visual e interactivo dentro de `output/mapa_interactivo/`. **NO se deben volver a correr ni modificar los scripts de procesamiento de datos crudos (`01_auditoria_rapida.py`, `02_generar_cubos.py`, `03_hallazgos_storytelling.py`)** a menos que se solicite explícitamente, ya que las carpetas pesadas de CSVs crudos (`Datos/`) residen en la máquina principal.

---

## 2. Reglas de Rigor Metodológico (Obligatorias por Rúbrica del INE)
Para mantener el puntaje máximo en **Apego a la temática (35 pts)** y **Claridad y solidez (30 pts)**:
1. **Fórmulas exactas:** Siempre se suman conteos (`LN`, `SV`, `NV`, `NS`) antes de calcular porcentajes; nunca se promedian porcentajes.
   - `TASA_PARTICIPACION = (SV / LN) * 100`
   - `TASA_ABSTENCION = (NV / LN) * 100`
   - `TASA_NS = (NS / LN) * 100`
2. **Tratamiento de `NS` (No especificados):** `NS` NO se reclasifica ni se suma a la abstención (`NV`). Siempre debe explicarse que procede de cuadernillos de lista nominal no disponibles o sin marca, y que los datos excluyen casillas especiales y voto en el extranjero.
3. **Advertencia de Base Pequeña:** Cualquier subgrupo con `LN < 100` (ej. registros `No binario` en 2024) debe mostrar explícitamente sus conteos absolutos y la etiqueta `LN < 100: base pequeña`.
4. **Modalidades Especiales 2024 (`Prisión Preventiva` y `Voto Anticipado`):** Sus archivos originales carecen de denominador (`LN`) y de `EDAD`. Se presentan estrictamente como **conteos de registros** separados del universo ordinario, sin inventar tasas de participación.

---

## 3. Datos Reales Verificados (Para usar en UI, Cartas, Juegos y Fallbacks)
Si algún CSV de `output/` no está cargado en memoria en el navegador, la interfaz debe consumir los JSON/JS ya generados en `output/mapa_interactivo/` o usar estas cifras oficiales ya conciliadas (54,872,712 filas ordinarias procesadas):

### A. Resumen Nacional por Elección (2009–2024)
| AELEC | TIPO_ELECCION | LN | SV | NV | NS | Participación (%) | Abstención (%) | NS (%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2009 | Intermedia | 77,481,831 | 33,316,974 | 42,298,963 | 1,865,894 | 43.00% | 54.59% | 2.41% |
| 2012 | Presidencial | 76,490,962 | 47,383,154 | 28,939,159 | 168,649 | 61.95% | 37.83% | 0.22% |
| 2015 | Intermedia | 83,563,462 | 36,926,612 | 41,517,874 | 5,118,976 | 44.19% | 49.68% | 6.13% |
| 2018 | Presidencial | 89,123,997 | 51,784,399 | 31,249,856 | 6,089,742 | 58.10% | 35.06% | 6.83% |
| 2021 | Intermedia | 93,532,133 | 46,389,189 | 43,099,624 | 4,043,320 | 49.60% | 46.08% | 4.32% |
| 2024 | Presidencial | 98,330,348 | 54,899,228 | 37,105,466 | 6,325,654 | 55.83% | 37.74% | 6.43% |

### B. Los 4 Sectores / Hallazgos Principales
1. **Sector 1 — La Curva de la Edad (Caída después de los 18-19 años):**
   - En 2024: `18-19 años` = **53.06%**, cae en `20-24 años` a **45.20%** (**-7.86 pp**) y en `25-29 años` a **44.15%** (**-8.91 pp**).
   - En 2021: `18-19 años` = **49.36%**, `20-24` = **39.87%** (**-9.49 pp**), `25-29` = **37.91%** (**-11.46 pp**).
   - **Hallazgo constante:** En las 6 elecciones (2009–2024), el primer grupo de 30 años o más que recupera o supera la tasa de los 18-19 años es siempre el de **40-49 años**.
2. **Sector 2 — Brecha de Género y Territorio (2024):**
   - **Rural:** Mujeres **61.13%** (`SV=5,399,210 / LN=8,832,918`) vs. Hombres **49.97%** (`SV=4,188,986 / LN=8,383,603`) -> Brecha: **+11.16 pp**.
   - **Mixta:** Mujeres **58.83%** vs. Hombres **49.24%** -> Brecha: **+9.59 pp**.
   - **Urbana:** Mujeres **60.08%** vs. Hombres **51.90%** -> Brecha: **+8.18 pp**.
3. **Sector 3 — Elecciones Presidenciales vs. Intermedias (Acumulado 2009–2024):**
   - **Estados con mayor caída en intermedias:** 1) Ciudad de México (**+22.82 pp**: 67.40% pres. vs 44.57% inter.), 2) Quintana Roo (**+18.00 pp**: 55.02% vs 37.03%), 3) Tlaxcala (**+17.13 pp**: 63.66% vs 46.53%), 4) Aguascalientes (**+16.83 pp**), 5) Puebla (**+16.75 pp**).
   - **Grupos de edad con mayor caída en intermedias:** 1) `30-39 años` (**+13.64 pp**: 54.62% vs 40.97%), 2) `25-29 años` (**+13.52 pp**: 48.41% vs 34.89%), 3) `20-24 años` (**+13.00 pp**: 49.19% vs 36.19%).
4. **Sector 4 — Radiografía de Inclusión 2024:**
   - **Prisión Preventiva:** **26,563** registros nacionales (Top: Edomex 4,719; Jalisco 2,938; Nuevo León 1,875; CDMX 1,799; Puebla 1,560; Sonora 1,434; Veracruz 222).
   - **Voto Anticipado:** **3,449** registros nacionales (Top: CDMX 461; Veracruz 221; Jalisco 216; Edomex 196; Aguascalientes 169; Nuevo León 163).
   - **No binario (Universo ordinario 2024):** present en 18 estados con `LN = 105`, `SV = 79` (**75.24%**), `NV = 23` (**21.90%**), `NS = 3` (**2.86%**). Destacan CDMX (`LN=32, SV=21`, 65.62%) y Jalisco (`LN=25, SV=20`, 80.00%).

---

## 4. Concepto Visual de la Interfaz: "La Mesa de la Democracia"
La aplicación web en `output/mapa_interactivo/` debe abandonar la apariencia de formulario plano gubernamental y presentar una **mesa tradicional mexicana interactiva** dirigida a jóvenes de 18 a 30 años:

- **Fondo (`assets/fondo_mesa.png`):** Mesa metálica blanca con bordes oscuros y esquinas cromadas.
- **Centro — Mapa Escolar de Papelería (`assets/marco_mapa_escolar.png` + `Mapa MX Escala Grises.svg`):**
  - El mapa vectorial SVG (64 piezas agrupadas en las 32 entidades `EDOCVE` 1-32) se muestra al centro como un mapa escolar clásico de primaria con colores vivos multipaleta.
  - Al hacer clic en un estado o expandir el mapa, despliega las vistas por pestañas, filtros demográficos y gráficas con paletas de color vivas y diferenciadas por cada uno de los 4 sectores.
- **Esquina Inferior Derecha — Las 4 Cartas de Lotería (Giro 3D / Flip Cards):**
  1. `assets/carta_1_jovenes.png` (#18 EL PRIMER VOTO): Revela al reverso los datos del Sector 1 (Curva de edad 18-19 vs 20-29 y recuperación a los 40-49).
  2. `assets/carta_2_mujeres.png` (#61 LA MUJER RURAL): Revela el Sector 2 (Ventaja femenina rural +11.16 pp y urbana +8.18 pp).
  3. `assets/carta_3_intermedias.png` (#22 CADA SEIS AÑOS): Revela el Sector 3 (Caída en intermedias por estado y edad).
  4. `assets/carta_4_inclusion.png` (#24 NUEVAS VOCES): Revela el Sector 4 (Prisión preventiva, Voto anticipado y registros No binarios).
- **Esquina Inferior Izquierda — Materiales Escolares:**
  - `assets/obj_cuaderno_norma.png` (Cuaderno amarillo Norma): Abre el instructivo/guía del recorrido interactivo y créditos.
  - `assets/obj_atlas_mexico.png` (Libro Atlas de México SEP): Abre el explorador profundo a doble página con el **Buscador de Acercamiento Municipal**, tablas detalladas y la sección metodológica completa ("Cómo leer estos datos").
- **Derecha — Credencial para Votar (`assets/obj_ine.png`):**
  - Abre el **"Espejo Cívico Personalizado"**: el joven elige su Estado, Edad, Sexo y Tipo de Sección, ve cuánto vota su grupo en su estado y recibe información sobre por qué es vital tramitar y mantener vigente su INE para figurar en la Lista Nominal (`LN`).
- **Arriba Izquierda — Cartones de Lotería (`assets/obj_tablas_loteria.png` + `assets/frijolito.png`):**
  - Minijuego de **"Mitos vs. Realidades"** colocando frijolitos virtuales sobre afirmaciones electorales respaldadas por datos CCPC.
- **Centro Superior — Pirinola (`assets/obj_pirinola.png`):**
  - Gira con animación entre sus 6 caras (`Pon 1`, `Pon 2`, `Toma 1`, `Toma 2`, `Toma Todo`, `Todos Ponen`) disparando retos rápidos y simulaciones sobre abstención (`NV`) y participación (`SV`).
- **Centro Izquierda — Balero (`assets/obj_balero.png`):**
  - Minijuego de precisión de 1 clic conectado con la metáfora de la constancia electoral entre los 18 y los 40 años.
- **Arriba Derecha — Dados (`assets/obj_dados.png`):**
  - Tira al azar un Estado (`1-32`) + un Año (`2009-2024`) mostrando una cápsula de datos reales de esa entidad.
- **Respaldo de Imágenes (Fallbacks):** Si algún archivo `.png` dentro de `output/mapa_interactivo/assets/` aún no ha sido colocado, el código debe renderizar un SVG ilustrativo temporal con la estética exacta del objeto y permitir reemplazarlo transparentemente en cuanto el archivo `.png` exista en la carpeta.