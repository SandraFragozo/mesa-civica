# Participar después del primer llamado: hallazgos para el Reto 3

## Mensaje central y público

Público propuesto: jóvenes de 18 a 29 años y equipos de educación cívica. Mensaje a contrastar con la evidencia: acompañar la participación más allá de los 18-19 años y durante las elecciones intermedias. Las cuatro secciones siguientes muestran resultados observados, denominadores y límites de interpretación.

## Cobertura y calidad de la información

| AELEC | TIPO_ELECCION | LN | SV | NV | NS | TASA_PARTICIPACION | TASA_ABSTENCION | TASA_NS | LIMITE_SV_MAS_NS_PCT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2009 | Intermedia | 77481831 | 33316974 | 42298963 | 1865894 | 43.00 | 54.59 | 2.41 | 45.41 |
| 2012 | Presidencial | 76490962 | 47383154 | 28939159 | 168649 | 61.95 | 37.83 | 0.22 | 62.17 |
| 2015 | Intermedia | 83563462 | 36926612 | 41517874 | 5118976 | 44.19 | 49.68 | 6.13 | 50.32 |
| 2018 | Presidencial | 89123997 | 51784399 | 31249856 | 6089742 | 58.10 | 35.06 | 6.83 | 64.94 |
| 2021 | Intermedia | 93532133 | 46389189 | 43099624 | 4043320 | 49.60 | 46.08 | 4.32 | 53.92 |
| 2024 | Presidencial | 98330348 | 54899228 | 37105466 | 6325654 | 55.83 | 37.74 | 6.43 | 62.26 |

SV son registros con marca de voto; NV, sin marca; NS, registros con información no especificada. Las tres tasas usan LN como denominador. NS no se reclasifica como abstención. El límite SV+NS es un máximo aritmético si todos los casos NS hubieran participado; no es una estimación ni un intervalo de confianza. Con LN=0, las tasas quedan vacías.

## 1. La curva de la edad

En 2024, la participación de 18-19 años fue 53.06%; en 20-24, 45.20%, y en 25-29, 44.15%. Las diferencias respecto a 18-19 fueron -7.86 y -8.91 puntos porcentuales. Recuperación al nivel de 18-19: 40-49.

| Elección | 18-19 (%) | 20-24 (%) | 25-29 (%) | Δ 20-24 vs 18-19 (pp) | Δ 25-29 vs 18-19 (pp) | Primer grupo ≥30 que alcanza 18-19 |
| --- | --- | --- | --- | --- | --- | --- |
| 2009 | 42.90 | 34.47 | 33.62 | -8.43 | -9.28 | 40-49 |
| 2012 | 61.90 | 53.68 | 52.29 | -8.22 | -9.60 | 40-49 |
| 2015 | 41.47 | 34.02 | 32.84 | -7.45 | -8.63 | 40-49 |
| 2018 | 56.44 | 49.20 | 49.24 | -7.24 | -7.20 | 40-49 |
| 2021 | 49.36 | 39.87 | 37.91 | -9.49 | -11.46 | 40-49 |
| 2024 | 53.06 | 45.20 | 44.15 | -7.86 | -8.91 | 40-49 |

La recuperación se define como el primer grupo de 30 años o más cuya tasa iguala o supera la de 18-19 en la misma elección. La etiqueta ‘primovotantes’ aproxima una edad; estos datos no acreditan que sea el primer voto de cada persona.

[Explorar curva de edad](graficas/01_curva_edad.html)

## 2. Brecha de género y territorio

La variable original es SEXO registrado en los cuadernillos. La categoría ‘No binario’ se conserva tal como está codificada y no permite inferir identidades no registradas.

| TIPOSEC | SEXO | LN | SV | NV | NS | TASA_PARTICIPACION | TASA_NS | BASE_PEQUENA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mixta | Hombres | 6174599 | 3040214 | 2733888 | 400497 | 49.24 | 6.49 | LN ≥ 100 |
| Mixta | Mujeres | 6647861 | 3910875 | 2311068 | 425918 | 58.83 | 6.41 | LN ≥ 100 |
| Mixta | No binario | 5 | 4 | 1 | 0 | 80.00 | 0.00 | LN < 100: base pequeña |
| Rural | Hombres | 8383603 | 4188986 | 3574057 | 620560 | 49.97 | 7.40 | LN ≥ 100 |
| Rural | Mujeres | 8832918 | 5399210 | 2787968 | 645740 | 61.13 | 7.31 | LN ≥ 100 |
| Rural | No binario | 1 | 1 | 0 | 0 | 100.00 | 0.00 | LN < 100: base pequeña |
| Urbana | Hombres | 32668229 | 16956132 | 13672966 | 2039131 | 51.90 | 6.24 | LN ≥ 100 |
| Urbana | Mujeres | 35623033 | 21403732 | 12025496 | 2193805 | 60.08 | 6.16 | LN ≥ 100 |
| Urbana | No binario | 99 | 74 | 22 | 3 | 74.75 | 3.03 | LN < 100: base pequeña |

| Tipo de sección | Mujeres − hombres (pp) |
| --- | --- |
| Mixta | 9.59 |
| Rural | 11.16 |
| Urbana | 8.18 |

[Explorar brecha por territorio](graficas/02_genero_territorio.html)

## 3. Elecciones intermedias y presidenciales

Las mayores brechas positivas indican dónde la participación intermedia fue menor que la presidencial en el conjunto del periodo. Si una brecha es negativa, la relación se invierte. Encabezan la diferencia Ciudad de México (+22.82 pp) y el grupo 30-39 (+13.64 pp).

Se suman los conteos de 2009, 2015 y 2021 para intermedias; y de 2012, 2018 y 2024 para presidenciales. La ponderación resulta de LN, sin promediar porcentajes ni redondear antes de calcular diferencias. Una persona puede aparecer en varias elecciones; LN acumulada representa registros persona-elección.

### Entidades con mayor diferencia presidencial − intermedia

| EDOCVE | EDONOM_OFICIAL | PARTICIPACION_PRESIDENCIAL | LN_PRESIDENCIAL | NS_PRESIDENCIAL | PARTICIPACION_INTERMEDIA | LN_INTERMEDIA | NS_INTERMEDIA | BRECHA_PP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | Ciudad de México | 67.40 | 22655828 | 384994 | 44.57 | 22459466 | 453580 | 22.82 |
| 23 | Quintana Roo | 55.02 | 3578941 | 84081 | 37.03 | 3173024 | 264555 | 18.00 |
| 29 | Tlaxcala | 63.66 | 2771341 | 114289 | 46.53 | 2601509 | 66500 | 17.13 |
| 1 | Aguascalientes | 57.60 | 2822422 | 43328 | 40.76 | 2658206 | 142165 | 16.83 |
| 21 | Puebla | 61.19 | 13342282 | 704963 | 44.44 | 12664744 | 236116 | 16.75 |

### Grupos de edad con mayor diferencia

| GRUPO_EDAD | PARTICIPACION_PRESIDENCIAL | LN_PRESIDENCIAL | NS_PRESIDENCIAL | PARTICIPACION_INTERMEDIA | LN_INTERMEDIA | NS_INTERMEDIA | BRECHA_PP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30-39 | 54.62 | 57738866 | 2663971 | 40.97 | 57581845 | 2485196 | 13.64 |
| 25-29 | 48.41 | 32085435 | 1519704 | 34.89 | 31967343 | 1397363 | 13.52 |
| 20-24 | 49.19 | 32371034 | 1538540 | 36.19 | 31910843 | 1419476 | 13.00 |
| 40-49 | 62.02 | 49158981 | 2339660 | 49.60 | 48053775 | 2088441 | 12.42 |
| 18-19 (Primovotantes) | 56.88 | 10112396 | 481356 | 44.69 | 9084196 | 405887 | 12.19 |
| 50-59 | 66.67 | 37632857 | 1837339 | 55.64 | 34792350 | 1498071 | 11.04 |
| 70+ | 61.62 | 20359226 | 993734 | 51.21 | 19060652 | 797711 | 10.41 |
| 60-69 | 70.24 | 24486512 | 1209741 | 60.23 | 22126422 | 936045 | 10.01 |

### Contraste nacional de elecciones consecutivas

| Intermedia | Presidencial posterior | Participación intermedia (%) | Participación presidencial (%) | Presidencial − intermedia (pp) |
| --- | --- | --- | --- | --- |
| 2009 | 2012 | 43.00 | 61.95 | 18.95 |
| 2015 | 2018 | 44.19 | 58.10 | 13.91 |
| 2021 | 2024 | 49.60 | 55.83 | 6.23 |

La comparación no estima un efecto causal del tipo de elección. Cambian los años, los electorados, el registro, el contexto y la distribución demográfica. Las tres parejas muestran si el patrón agregado oculta diferencias entre periodos.

[Explorar entidades](graficas/03_intermedias_estados.html) · [Explorar edades](graficas/04_intermedias_edades.html)

## 4. Radiografía de inclusión 2024

### Modalidades especiales

| MODALIDAD | REGISTROS |
| --- | --- |
| Prisión Preventiva | 26563 |
| Voto Anticipado | 3449 |

| MODALIDAD | EDOCVE | EDONOM_OFICIAL | REGISTROS |
| --- | --- | --- | --- |
| Prisión Preventiva | 1 | Aguascalientes | 214 |
| Prisión Preventiva | 2 | Baja California | 570 |
| Prisión Preventiva | 3 | Baja California Sur | 164 |
| Prisión Preventiva | 4 | Campeche | 67 |
| Prisión Preventiva | 5 | Coahuila | 192 |
| Prisión Preventiva | 6 | Colima | 134 |
| Prisión Preventiva | 7 | Chiapas | 938 |
| Prisión Preventiva | 8 | Chihuahua | 744 |
| Prisión Preventiva | 9 | Ciudad de México | 1799 |
| Prisión Preventiva | 10 | Durango | 1108 |
| Prisión Preventiva | 11 | Guanajuato | 248 |
| Prisión Preventiva | 12 | Guerrero | 373 |
| Prisión Preventiva | 13 | Hidalgo | 760 |
| Prisión Preventiva | 14 | Jalisco | 2938 |
| Prisión Preventiva | 15 | Estado de México | 4719 |
| Prisión Preventiva | 16 | Michoacán | 807 |
| Prisión Preventiva | 17 | Morelos | 653 |
| Prisión Preventiva | 18 | Nayarit | 759 |
| Prisión Preventiva | 19 | Nuevo León | 1875 |
| Prisión Preventiva | 20 | Oaxaca | 893 |
| Prisión Preventiva | 21 | Puebla | 1560 |
| Prisión Preventiva | 22 | Querétaro | 83 |
| Prisión Preventiva | 23 | Quintana Roo | 809 |
| Prisión Preventiva | 24 | San Luis Potosí | 687 |
| Prisión Preventiva | 25 | Sinaloa | 478 |
| Prisión Preventiva | 26 | Sonora | 1434 |
| Prisión Preventiva | 27 | Tabasco | 513 |
| Prisión Preventiva | 28 | Tamaulipas | 524 |
| Prisión Preventiva | 29 | Tlaxcala | 228 |
| Prisión Preventiva | 30 | Veracruz | 222 |
| Prisión Preventiva | 32 | Zacatecas | 70 |
| Voto Anticipado | 1 | Aguascalientes | 169 |
| Voto Anticipado | 2 | Baja California | 89 |
| Voto Anticipado | 3 | Baja California Sur | 26 |
| Voto Anticipado | 4 | Campeche | 14 |
| Voto Anticipado | 5 | Coahuila | 129 |
| Voto Anticipado | 6 | Colima | 33 |
| Voto Anticipado | 7 | Chiapas | 89 |
| Voto Anticipado | 8 | Chihuahua | 87 |
| Voto Anticipado | 9 | Ciudad de México | 461 |
| Voto Anticipado | 10 | Durango | 64 |
| Voto Anticipado | 11 | Guanajuato | 135 |
| Voto Anticipado | 12 | Guerrero | 148 |
| Voto Anticipado | 13 | Hidalgo | 55 |
| Voto Anticipado | 14 | Jalisco | 216 |
| Voto Anticipado | 15 | Estado de México | 196 |
| Voto Anticipado | 16 | Michoacán | 110 |
| Voto Anticipado | 17 | Morelos | 54 |
| Voto Anticipado | 18 | Nayarit | 46 |
| Voto Anticipado | 19 | Nuevo León | 163 |
| Voto Anticipado | 20 | Oaxaca | 132 |
| Voto Anticipado | 21 | Puebla | 86 |
| Voto Anticipado | 22 | Querétaro | 78 |
| Voto Anticipado | 23 | Quintana Roo | 30 |
| Voto Anticipado | 24 | San Luis Potosí | 69 |
| Voto Anticipado | 25 | Sinaloa | 90 |
| Voto Anticipado | 26 | Sonora | 153 |
| Voto Anticipado | 27 | Tabasco | 105 |
| Voto Anticipado | 28 | Tamaulipas | 32 |
| Voto Anticipado | 29 | Tlaxcala | 98 |
| Voto Anticipado | 30 | Veracruz | 221 |
| Voto Anticipado | 31 | Yucatán | 35 |
| Voto Anticipado | 32 | Zacatecas | 36 |

Los conteos describen filas de los archivos nacionales. Los archivos recibidos no contienen EDAD ni LN, SV, NV o NS: no permiten calcular participación o abstención. Estas filas se mantienen separadas del universo ordinario. En Prisión Preventiva, ESTADO se homologa a EDOCVE; DEF y DEL son identificadores, nunca magnitudes sumables.

### Registros no binarios: universo ordinario

El conteo ordinario reúne LN=105, SV=79, NV=23 y NS=3 para la categoría No binario en 18 entidades con registros. Estas bases pequeñas requieren acompañar cada porcentaje de sus conteos.

| EDOCVE | EDONOM_OFICIAL | LN | SV | NV | NS | TASA_PARTICIPACION | TASA_ABSTENCION | TASA_NS | BASE_PEQUENA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Aguascalientes | 3 | 3 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 2 | Baja California | 4 | 3 | 1 | 0 | 75.00 | 25.00 | 0.00 | LN < 100: base pequeña |
| 8 | Chihuahua | 7 | 6 | 1 | 0 | 85.71 | 14.29 | 0.00 | LN < 100: base pequeña |
| 9 | Ciudad de México | 32 | 21 | 11 | 0 | 65.62 | 34.38 | 0.00 | LN < 100: base pequeña |
| 11 | Guanajuato | 3 | 3 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 13 | Hidalgo | 1 | 1 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 14 | Jalisco | 25 | 20 | 3 | 2 | 80.00 | 12.00 | 8.00 | LN < 100: base pequeña |
| 15 | Estado de México | 4 | 4 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 18 | Nayarit | 3 | 3 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 19 | Nuevo León | 9 | 5 | 3 | 1 | 55.56 | 33.33 | 11.11 | LN < 100: base pequeña |
| 21 | Puebla | 1 | 0 | 1 | 0 | 0.00 | 100.00 | 0.00 | LN < 100: base pequeña |
| 22 | Querétaro | 2 | 1 | 1 | 0 | 50.00 | 50.00 | 0.00 | LN < 100: base pequeña |
| 23 | Quintana Roo | 1 | 0 | 1 | 0 | 0.00 | 100.00 | 0.00 | LN < 100: base pequeña |
| 26 | Sonora | 2 | 1 | 1 | 0 | 50.00 | 50.00 | 0.00 | LN < 100: base pequeña |
| 27 | Tabasco | 1 | 1 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 28 | Tamaulipas | 2 | 2 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 29 | Tlaxcala | 1 | 1 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |
| 30 | Veracruz | 4 | 4 | 0 | 0 | 100.00 | 0.00 | 0.00 | LN < 100: base pequeña |

La ausencia de una entidad o categoría no se convierte automáticamente en cero. ‘No binario’ en SEXO y voto mediante una modalidad especial son dimensiones distintas; no se consideran grupos excluyentes ni se suman entre sí.

[Explorar modalidades](graficas/05_inclusion_modalidades.html) · [Explorar registros no binarios](graficas/06_inclusion_no_binario.html)

## Uso público y difusión propuesta

Propuesta: convertir la curva de edad en un carrusel para jóvenes de 18-29 años, con una pregunta inicial, tres comparaciones y una invitación a consultar los datos. Difundir mediante redes institucionales, universidades y materiales de educación cívica. Las gráficas por entidad permiten adaptar conversaciones locales. Publicar siempre año, denominador y tratamiento de NS; evaluar comprensión mediante preguntas breves antes y después de mostrar la pieza. Estas acciones son propuestas a evaluar, sin evidencia causal de impacto en estos datos.

## Fuentes, método y reproducción

Fuente primaria: CSV y diccionarios de campos locales de INE/DECEyEC, CCPC 2009–2024. La convocatoria y la rúbrica adjuntas se utilizaron como contexto de claridad, pertinencia y reproducibilidad; no sustituyen la solicitud de generar estos scripts.

Se validan 32 archivos y 32 entidades distintas por elección, años, claves, conteos enteros no negativos y LN=SV+NV+NS en cada fila. Se procesan bloques de tamaño configurable y se comprueba la conservación de los cuatro conteos en los tres cubos, además de su coincidencia por año al crear este reporte. Los valores desconocidos de edad, sexo o tipo de sección se conservan como ‘No especificado’ para evitar pérdida de totales. Las edades fraccionarias o menores de 18 no se asignan a grupos válidos.

EDONOM_OFICIAL usa un catálogo único de las 32 claves INE y nombres de uso institucional. Las claves municipales son locales a cada entidad y se conservan con EDOCVE y año; no se suponen límites ni nombres municipales constantes entre elecciones. Los cambios de secciones o municipios impiden asumir paneles territoriales sin cartografía adicional.

Según el diccionario de campos recibido, los datos ordinarios proceden de cuadernillos de lista nominal: no incluyen participación en casillas especiales ni voto desde el extranjero. No deben equipararse automáticamente a los porcentajes obtenidos de cómputos distritales. Las diferencias por edad son cortes transversales, no trayectorias individuales.

Desde Proyecto INE, instalar requirements.txt y ejecutar, en orden: `python 01_auditoria_rapida.py`, `python 02_generar_cubos.py`, `python 03_hallazgos_storytelling.py`. Se pueden indicar `--datos` y `--output`; esta última ruta debe permanecer dentro del proyecto. El segundo script acepta `--chunksize`. Cada HTML comparte plotly.min.js en la misma carpeta para funcionar sin conexión; conservar juntos esos archivos al trasladarlos.

Referencias técnicas: [lectura por bloques de pandas](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html) y [exportación HTML de Plotly](https://plotly.com/python/interactive-html-export/).
