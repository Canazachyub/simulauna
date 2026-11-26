# Lote 2 (Kimi Deep Research, 2026-10-13): UNSA, UNSAAC, UNAJ, UNSCH

Fuentes:
- U0 UNSA Matriz de Evaluación 2026 (RCU-0116-2025): https://transparencia.unsa.edu.pe/bitstream/handle/123456789/1505/RCU-0116-2025.pdf
- U4 UNSA Reglamento vigente RCU-0085-2026: https://admision.unsa.edu.pe/wp-content/uploads/2026/03/RESOLUCION-DE-CONSEJO-UNIVERSITARIO-N%C2%B0-0085-2026.pdf
- U5 UNSA noticia oficial (duración 150 min): https://www.unsa.edu.pe/ordinario-ii-fase-17-277-postulantes-rendiran-el-examen-de-admision-a-la-unsa/
- U1 UNSAAC RCU CU-198-2022: https://transparencia.unsaac.edu.pe/links/disposiciones/documentos/resCU/CU198-2022%20APRUEBA%20REGLAMENTO%20DE%20ADMISIONUNSAAC.pdf
- U2 UNAJ Resolución CO-0115-2025: https://portal.unaj.edu.pe/sites/default/files/Res-Consejo-comision-2025/Resolucion_Consejo_CO-0115-2025.pdf
- U3 UNSCH Prospecto 2027-I: https://admision.unsch.edu.pe/documentos/pdf/prospecto.pdf

## config_escala
universidad|proceso|motor|escala|n_preg|duracion|minimo|notas
UNSA|Ordinario 2026|suma_ponderada|100 por área|80|150|mediana del programa (Art. 41)|Valor por pregunta según Matriz 2026. Penalidad incorrecta y valor del blanco: [FALTA]. Arquitectura/Artes: evaluación previa 50%. CEPRUNSA mismo esquema.
UNSAAC|Ordinario (reg. 2022 vigente)|otro|1000|80|150|450 (Art. 8)|Art. 72: correcta 5, BLANCO 1, incorrecta 0; final = bruto (máx 400) × 2.5. Sin ponderación por curso.
UNAJ|Ordinario 2025|suma_ponderada|3000|60|120|300 (Art. 74)|Correcta = 10 × ponderación (Art. 26); Art. 75: BLANCO 0.5, incorrecta 0. 2026: RCU-042-2026 aprobó nuevo reglamento sin tablas públicas (no se asume continuidad). Extraordinario: 30 ítems, escala 300, 60 min, mín 90.
UNSCH|Ordinario 2027-I|suma_ponderada|1000|120 (100+10+10)|[FALTA]|450|Art. 28: incorrecta no resta. Art. 29/Tabla 5: valor por pregunta = criterio 1-3; conocimientos 230 brutos × (900/230) = 900; cada test 50 (10 preg × 1 × 5). Mismo cuadernillo ordinario y exonerados.

## config_examen
### UNSA (U0) — puntos_correcta por curso (cada área = 100); incorrecta [FALTA]
Curso|Ingenierías n|pts|Biomédicas n|pts|Sociales n|pts
Razonamiento Lógico|4|1.124150|4|1.124150|4|1.124150
Razonamiento Matemático|5|1.100680|5|1.100680|5|1.100680
Razonamiento Verbal|4|1.124150|4|1.124150|4|1.124150
Comprensión Lectora|5|1.100680|5|1.100680|5|1.100680
Álgebra|4|1.658337|3|1.265447|3|0.824574
Aritmética|4|1.658267|3|1.265447|3|0.824135
Geometría|4|1.658787|3|1.265447|3|0.825012
Trigonometría|3|1.698477|3|1.203658|3|0.859614
Historia|4|1.289859|5|1.123540|8|1.774740
Geografía|4|1.210141|4|1.095575|5|1.760416
Química|6|1.425411|6|1.684740|3|1.109301
Biología|5|1.154749|9|1.945140|3|1.146903
Física|7|1.524827|5|1.477060|3|1.077129
Filosofía|3|0.798740|3|0.798740|3|0.887877
Psicología|4|0.801890|4|0.801890|5|0.934548
Educación Cívica|3|0.798740|3|0.798740|3|0.887877
Lenguaje|4|1.021414|4|1.021414|8|1.701541
Literatura|3|0.971448|3|0.971448|5|1.677534
Lengua Extranjera: Lectura|2|1.258700|2|1.258700|2|1.258700
Lengua Extranjera: Gramática|2|1.241300|2|1.241300|2|1.241300
(Nota Kimi: subtotales impresos de Matemática-Ingenierías suman 24.997 por redondeo a 6 decimales del propio documento.)

### UNSAAC (U1) — correcta 5, blanco 1, incorrecta 0, ×2.5
A Ingeniería y Ciencias Básicas: Aritmética 14, Álgebra 10, Geometría y Trigonometría 14, Competencia Comunicativa 14, Física 14, Química 14
B Ciencias de la Salud y de la Vida: Aritmética 14, Álgebra 10, Competencia Comunicativa 14, Biología 14, Física 14, Química 14
C Ciencias Empresariales: Aritmética 14, Álgebra 10, Competencia Comunicativa 14, Historia 12, Geografía 12, Economía 10, Educación Cívica 8
D Ciencias Sociales: Aritmética 14, Álgebra 10, Competencia Comunicativa 14, Historia 12, Geografía 12, Filosofía y Lógica 10, Educación Cívica 8

### UNAJ (U2) — puntos_correcta (=10×ponderación), blanco 0.5, incorrecta 0
Curso|Ingenierías n|pts|Sociales n|pts
Aritmética|3|54.177|3|42.140
Álgebra|5|54.177|3|40.454
Geometría|3|50.790|3|33.712
Trigonometría|3|50.790|3|30.340
Comunicación|2|40.632|6|53.938
Literatura|2|40.632|4|50.568
Personal Social|1|37.245|2|42.140
Formación Ciudadana y Cívica|1|37.245|2|44.499
Historia del Perú|2|44.694|4|53.938
Geografía|2|33.860|4|45.511
Psicología y Filosofía|1|33.860|2|50.568
Economía|4|42.326|4|53.938
Física|4|47.404|-|-
Química|4|47.404|-|-
Biología|3|44.694|-|-
Razonamiento Matemático|10|57.562|10|57.310
Razonamiento Verbal|10|57.562|10|57.310

### UNSCH (U3) — puntos brutos por pregunta (criterio 1-3), incorrecta 0; conocimientos ×(900/230); tests 10 preg ×1 ×5 = 50 c/u
Curso|n|I Ciencias|II Letras|III Biomédicas
Razonamiento Verbal|6|3|3|3
Lenguaje|6|2|3|2
Literatura|6|2|3|2
Razonamiento lógico matemático|6|3|2|2
Aritmética|6|3|1|2
Álgebra|4|3|2|2
Geometría|4|3|2|2
Trigonometría|4|2|1|1
Física|6|3|1|1
Química|6|2|2|2
Biología|6|1|2|3
Anatomía|6|1|1|3
Historia Universal|6|2|3|2
Historia del Perú|6|2|3|2
Geografía y Ambiente|6|2|3|3
Economía|6|2|3|3
Formación ciudadana y cívica|5|3|3|3
Actualidad regional, nacional e internacional|5|3|3|3
Test de aptitud vocacional (todas)|10|1
Test de actitud personal (todas)|10|1
