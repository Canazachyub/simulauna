# Lote 1 (Kimi Deep Research, 2026-10-12): UNMSM, UNI, UNFV, UNALM

Fuentes:
- U0 UNMSM Reglamento 2025-II (Anexo 5, distribución por curso): https://cdn.www.gob.pe/uploads/document/file/7469691/6358821-reglamento-admision-2025-ii-con-correc-ogal-com-asesor-07-01-25-f-f.pdf
- U4 UNMSM Reglamento 2026-I (R.R. 009458-2025): https://cdn.www.gob.pe/uploads/document/file/5781116/1889987-r-r-n-009458-2023-reglamento-de-admision-2026-i-unmsm.pdf
- U1 UNI R.R. 1993-2025-UNI: https://cdnuni.uni.edu.pe/dn/laravel/storage/app/archivos_dn/R.R.%20N%C2%B01993-2025-UNI-DN.pdf
- U2 UNFV Prospecto 2026: https://www.unfv.edu.pe/oca/images/pregrado/2026/ProspectoAdmision2026a.pdf
- U3 UNALM Reglamento nov-2023: https://cdn2.lamolina.edu.pe/lamolina-admision/website/2024/REGLAMENTO_DE_ADMISION_NOVIEMBRE_2023.pdf

## config_escala
universidad|proceso|motor|escala_total|n_preguntas_total|duracion_min|minimo|fuente|notas
UNMSM|Examen general 2026-I|decimas|2000|100|180|No existe (orden de mérito)|U4|Correcta 20.00; incorrecta -1.125; blanco 0 (Art. 28). Sección actitudinal (10) vale hasta 20.00 sin negativo. Estructura por curso del Anexo 5 Reg. 2025-II (el PDF 2026-I salió con celdas vacías). CEPRE no rinde este examen.
UNI|Concurso ordinario (RR 1993-2025-UNI)|decimas|1800|180|[FALTA]|Relativo: >= 50% del puntaje del 1er puesto de la especialidad (Art. 22)|U1|3 pruebas en 3 días: P1 Aptitud+Humanidades (100 preg, 600), P2 Matemática (40, 600), P3 Física y Química (40, 600). Arquitectura P4 (600, máx 2400). Penalidad/blanco/duración [FALTA] oficial (Art. 52 remite a carátula; secundaria no oficial: -1/5 del valor, blanco 0, 180 min/prueba). CEPREUNI distinto (máx 2700).
UNFV|Examen Ordinario 2026|decimas|500|50|90|70 puntos (RR 3210-2024-CU-UNFV)|U2|Correcta 10; blanco 0; incorrecta -0.25219265 (Anexo 9). 5 áreas, 4 versiones (D y E comparten). Educación Física 70/30 con aptitud. Extraordinario/CEPREVI distinto.
UNALM|Concurso ordinario (reg. nov-2023)|decimas|100|100|180|No existe (orden de mérito)|U3|Correcta 1; incorrecta -0.17; blanco 0 (Art. 51). Examen único (Art. 6). Ponderación por bloque (Art. 52): RV 25%, RM 25%, Mat 18%, CCNN 18%, CCSS 14%. Bonificaciones 20%/5% por ley. CEPRE ingresa por examen directo.

## config_examen (curso|n_preguntas|pts_correcta|pts_incorrecta)
### UNMSM (U0) — todas: correcta 20.00, incorrecta -1.125; Sección Actitudinal: hasta 20.00, sin negativo
Curso|A Salud|B Básicas|C Ingeniería|D Económicas y Gestión|E Humanidades y Jurídicas
Sección Actitudinal|10|10|10|10|10
Habilidad Verbal|10|10|10|10|10
Habilidad Lógico-Matemática|10|10|10|10|10
Aritmética|4|4|4|4|2
Geometría|3|4|4|4|2
Álgebra|3|4|4|4|2
Trigonometría|2|3|3|2|2
Lenguaje|7|6|7|8|8
Literatura|4|4|4|4|6
Psicología|6|4|4|6|6
Educación Cívica|4|4|4|4|4
Historia del Perú|3|2|3|3|5
Historia Universal|2|2|2|3|5
Geografía|4|4|4|4|5
Economía|4|4|4|8|5
Filosofía|4|4|4|4|6
Física|5|7|7|4|4
Química|7|7|6|4|4
Biología|8|7|6|4|4

### UNI (U1) — división única (todas las especialidades); incorrecta [FALTA]
P1 Razonamiento lógico-matemático|30|6.00
P1 Razonamiento verbal|30|6.00
P1 Razonamiento lógico-algorítmico|4|6.00
P1 Humanidades|30|6.00
P1 Actualidad|6|6.00
P2 Aritmética|8|15.00
P2 Álgebra|8|15.00
P2 Geometría|8|15.00
P2 Trigonometría|8|15.00
P2 Nociones de cálculo diferencial|8|15.00
P3 Física|20|15.00
P3 Química|20|15.00

### UNFV (U2) — correcta 10, incorrecta -0.25219265
Curso|A Económicas|B Humanidades/Jurídicas|C Ingenierías/Arquitectura|D+E Salud/Formales/Naturales
Habilidad Verbal|7|7|7|7
Habilidad Lógico-Matemática|7|7|7|7
Aritmética|2|1|3|2
Geometría|2|1|3|2
Álgebra|2|1|3|1
Trigonometría|1|0|2|1
Física|2|2|3|3
Química|2|1|3|3
Biología|2|2|3|5
Lenguaje|4|4|2|3
Literatura|2|4|2|2
Psicología|3|3|2|3
Educación Cívica|2|2|2|2
Historia del Perú y Universal|3|4|2|3
Geografía|2|4|2|2
Economía|5|3|2|2
Filosofía|2|4|2|2

### UNALM (U3) — división única; correcta 1, incorrecta -0.17
Razonamiento matemático|25
Razonamiento verbal|25
Aritmética|5
Álgebra|5
Geometría|4
Trigonometría|4
Biología|6
Química|6
Física|6
Economía|4
Historia del Perú y del mundo|5
Geografía|5
