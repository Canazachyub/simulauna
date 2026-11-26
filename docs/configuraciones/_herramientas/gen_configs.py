# Genera config_examen.csv y config_escala.csv por universidad (datos de Kimi Deep Research,
# fuentes oficiales). Las celdas sin fuente oficial ([FALTA]) quedan en 0 y se listan en _meta.json.
import csv, os, sys, json
OUT = sys.argv[1]
U = {}


def uni(cod, motor, escala, npreg, dur, minimo, fuente, factor='', notas='', faltas=()):
    U[cod] = dict(motor=motor, escala=escala, npreg=npreg, dur=dur, minimo=minimo, fuente=fuente,
                  factor=factor, notas=notas, faltas=list(faltas), filas=[])


def add(cod, division, cursos, pc, pi=0, pb=0, factor=''):
    for c in cursos:
        nombre, n = c[0], c[1]
        pcc = c[2] if len(c) > 2 else pc
        pii = c[3] if len(c) > 3 else pi
        U[cod]['filas'].append((division, nombre, n, pcc, pii, pb, factor))


# ---------------- UNMSM ----------------
uni('unmsm', 'decimas', 2000, 100, 180, 'No existe (orden de mérito)',
    'https://cdn.www.gob.pe/uploads/document/file/5781116/1889987-r-r-n-009458-2023-reglamento-de-admision-2026-i-unmsm.pdf ; distribución: https://cdn.www.gob.pe/uploads/document/file/7469691/6358821-reglamento-admision-2025-ii-con-correc-ogal-com-asesor-07-01-25-f-f.pdf',
    notas='Correcta 20, incorrecta -1.125, blanco 0 (Art. 28). Sección Actitudinal sin negativo. Distribución por curso del Anexo 5 Reg. 2025-II (el PDF 2026-I salió con celdas vacías).')
cursos = ['Sección Actitudinal', 'Habilidad Verbal', 'Habilidad Lógico-Matemática', 'Aritmética', 'Geometría', 'Álgebra',
          'Trigonometría', 'Lenguaje', 'Literatura', 'Psicología', 'Educación Cívica', 'Historia del Perú',
          'Historia Universal', 'Geografía', 'Economía', 'Filosofía', 'Física', 'Química', 'Biología']
tabla = {
    'A - Ciencias de la Salud': [10, 10, 10, 4, 3, 3, 2, 7, 4, 6, 4, 3, 2, 4, 4, 4, 5, 7, 8],
    'B - Ciencias Básicas': [10, 10, 10, 4, 4, 4, 3, 6, 4, 4, 4, 2, 2, 4, 4, 4, 7, 7, 7],
    'C - Ingeniería': [10, 10, 10, 4, 4, 4, 3, 7, 4, 4, 4, 3, 2, 4, 4, 4, 7, 6, 6],
    'D - Ciencias Económicas y de la Gestión': [10, 10, 10, 4, 4, 4, 2, 8, 4, 6, 4, 3, 3, 4, 8, 4, 4, 4, 4],
    'E - Humanidades y Ciencias Jurídicas y Sociales': [10, 10, 10, 2, 2, 2, 2, 8, 6, 6, 4, 5, 5, 5, 5, 6, 4, 4, 4],
}
for div, ns in tabla.items():
    filas = [(c, n) if c != 'Sección Actitudinal' else (c, n, 20, 0) for c, n in zip(cursos, ns)]
    add('unmsm', div, filas, 20, -1.125)

# ---------------- UNI ----------------
uni('uni', 'decimas', 1800, 180, '', 'Relativo: >= 50% del puntaje del 1er puesto de la especialidad (Art. 22)',
    'https://cdnuni.uni.edu.pe/dn/laravel/storage/app/archivos_dn/R.R.%20N%C2%B01993-2025-UNI-DN.pdf',
    notas='3 pruebas en 3 días: P1 Aptitud Académica y Humanidades (600), P2 Matemática (600), P3 Física y Química (600). Arquitectura rinde P4 (no incluida).',
    faltas=['Penalidad por incorrecta: no publicada en fuente oficial (Art. 52 la remite a la carátula). Fuente no oficial: -1/5 del valor (P1 -1.2; P2 y P3 -3). Se dejó en 0.',
            'Duración por prueba: no publicada en fuente oficial (no oficial: 180 min por prueba).'])
add('uni', 'Única (todas las especialidades)', [
    ('P1 Razonamiento Lógico-Matemático', 30, 6), ('P1 Razonamiento Verbal', 30, 6), ('P1 Razonamiento Lógico-Algorítmico', 4, 6),
    ('P1 Humanidades', 30, 6), ('P1 Actualidad', 6, 6),
    ('P2 Aritmética', 8, 15), ('P2 Álgebra', 8, 15), ('P2 Geometría', 8, 15), ('P2 Trigonometría', 8, 15),
    ('P2 Nociones de Cálculo Diferencial', 8, 15), ('P3 Física', 20, 15), ('P3 Química', 20, 15)], 0, 0)

# ---------------- UNFV ----------------
uni('unfv', 'decimas', 500, 50, 90, '70 puntos (RR 3210-2024-CU-UNFV)',
    'https://www.unfv.edu.pe/oca/images/pregrado/2026/ProspectoAdmision2026a.pdf',
    notas='Correcta 10, incorrecta -0.25219265, blanco 0 (Anexo 9). Áreas D y E comparten examen.')
cur = ['Habilidad Verbal', 'Habilidad Lógico-Matemática', 'Aritmética', 'Geometría', 'Álgebra', 'Trigonometría', 'Física',
       'Química', 'Biología', 'Lenguaje', 'Literatura', 'Psicología', 'Educación Cívica', 'Historia del Perú y Universal',
       'Geografía', 'Economía', 'Filosofía']
for div, ns in {
    'A - Ciencias Económicas, Financieras y Empresariales': [7, 7, 2, 2, 2, 1, 2, 2, 2, 4, 2, 3, 2, 3, 2, 5, 2],
    'B - Humanidades, Ciencias Jurídicas y Sociales': [7, 7, 1, 1, 1, 0, 2, 1, 2, 4, 4, 3, 2, 4, 4, 3, 4],
    'C - Ingenierías y Arquitectura': [7, 7, 3, 3, 3, 2, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2],
    'D y E - Ciencias de la Salud, Formales y Naturales': [7, 7, 2, 2, 1, 1, 3, 3, 5, 3, 2, 3, 2, 3, 2, 2, 2]}.items():
    add('unfv', div, [(c, n) for c, n in zip(cur, ns) if n > 0], 10, -0.25219265)

# ---------------- UNALM ----------------
uni('unalm', 'decimas', 100, 100, 180, 'No existe (orden de mérito)',
    'https://cdn2.lamolina.edu.pe/lamolina-admision/website/2024/REGLAMENTO_DE_ADMISION_NOVIEMBRE_2023.pdf',
    notas='Correcta 1, incorrecta -0.17, blanco 0 (Art. 51). Examen único. Bonificaciones por ley (20%/5%) no modeladas.')
add('unalm', 'Única', [('Razonamiento Matemático', 25), ('Razonamiento Verbal', 25), ('Aritmética', 5), ('Álgebra', 5),
                       ('Geometría', 4), ('Trigonometría', 4), ('Biología', 6), ('Química', 6), ('Física', 6),
                       ('Economía', 4), ('Historia del Perú y del Mundo', 5), ('Geografía', 5)], 1, -0.17)

# ---------------- UNSA ----------------
uni('unsa', 'suma_ponderada', 100, 80, 150, 'Mediana del programa de estudios (Art. 41, RCU-0085-2026)',
    'https://transparencia.unsa.edu.pe/bitstream/handle/123456789/1505/RCU-0116-2025.pdf ; reglamento: https://admision.unsa.edu.pe/wp-content/uploads/2026/03/RESOLUCION-DE-CONSEJO-UNIVERSITARIO-N%C2%B0-0085-2026.pdf',
    notas='Valor por pregunta según Matriz de Evaluación 2026; cada área suma 100. Arquitectura/Artes: evaluación previa 50% (no modelada).',
    faltas=['Penalidad por incorrecta y valor del blanco: no publicados en fuente oficial. Se dejaron en 0.'])
cu = ['Razonamiento Lógico', 'Razonamiento Matemático', 'Razonamiento Verbal', 'Comprensión Lectora', 'Álgebra', 'Aritmética',
      'Geometría', 'Trigonometría', 'Historia', 'Geografía', 'Química', 'Biología', 'Física', 'Filosofía', 'Psicología',
      'Educación Cívica', 'Lenguaje', 'Literatura', 'Lengua Extranjera: Lectura', 'Lengua Extranjera: Gramática']
ing = [(4, 1.124150), (5, 1.100680), (4, 1.124150), (5, 1.100680), (4, 1.658337), (4, 1.658267), (4, 1.658787), (3, 1.698477),
       (4, 1.289859), (4, 1.210141), (6, 1.425411), (5, 1.154749), (7, 1.524827), (3, 0.798740), (4, 0.801890), (3, 0.798740),
       (4, 1.021414), (3, 0.971448), (2, 1.258700), (2, 1.241300)]
bio = [(4, 1.124150), (5, 1.100680), (4, 1.124150), (5, 1.100680), (3, 1.265447), (3, 1.265447), (3, 1.265447), (3, 1.203658),
       (5, 1.123540), (4, 1.095575), (6, 1.684740), (9, 1.945140), (5, 1.477060), (3, 0.798740), (4, 0.801890), (3, 0.798740),
       (4, 1.021414), (3, 0.971448), (2, 1.258700), (2, 1.241300)]
soc = [(4, 1.124150), (5, 1.100680), (4, 1.124150), (5, 1.100680), (3, 0.824574), (3, 0.824135), (3, 0.825012), (3, 0.859614),
       (8, 1.774740), (5, 1.760416), (3, 1.109301), (3, 1.146903), (3, 1.077129), (3, 0.887877), (5, 0.934548), (3, 0.887877),
       (8, 1.701541), (5, 1.677534), (2, 1.258700), (2, 1.241300)]
for div, d in [('Ingenierías', ing), ('Biomédicas', bio), ('Sociales', soc)]:
    add('unsa', div, [(c, n, p) for c, (n, p) in zip(cu, d)], 0)

# ---------------- UNSAAC ----------------
uni('unsaac', 'otro', 1000, 80, 150, '450 (Art. 8)',
    'https://transparencia.unsaac.edu.pe/links/disposiciones/documentos/resCU/CU198-2022%20APRUEBA%20REGLAMENTO%20DE%20ADMISIONUNSAAC.pdf',
    factor=2.5, notas='Art. 72: correcta 5, en blanco 1, incorrecta 0; puntaje final = bruto (máx 400) × 2.5. Reglamento 2022 vigente.')
base = [('Aritmética', 14), ('Álgebra', 10), ('Competencia Comunicativa', 14)]
for div, extra in [('A - Ingeniería y Ciencias Básicas', [('Geometría y Trigonometría', 14), ('Física', 14), ('Química', 14)]),
                   ('B - Ciencias de la Salud y de la Vida', [('Biología', 14), ('Física', 14), ('Química', 14)]),
                   ('C - Ciencias Empresariales', [('Historia', 12), ('Geografía', 12), ('Economía', 10), ('Educación Cívica', 8)]),
                   ('D - Ciencias Sociales', [('Historia', 12), ('Geografía', 12), ('Filosofía y Lógica', 10), ('Educación Cívica', 8)])]:
    add('unsaac', div, base + extra, 5, 0, 1)

# ---------------- UNAJ ----------------
uni('unaj', 'suma_ponderada', 3000, 60, 120, '300 (Art. 74)',
    'https://portal.unaj.edu.pe/sites/default/files/Res-Consejo-comision-2025/Resolucion_Consejo_CO-0115-2025.pdf',
    notas='Correcta = 10 × ponderación (Art. 26); en blanco 0.5, incorrecta 0 (Art. 75). Mismo esquema que la UNA.',
    faltas=['Reglamento 2026 (RCU-042-2026-CU-UNAJ) aprobado sin tablas públicas: se usan los valores 2025.'])
add('unaj', 'Ingenierías', [('Aritmética', 3, 54.177), ('Álgebra', 5, 54.177), ('Geometría', 3, 50.790), ('Trigonometría', 3, 50.790),
                            ('Comunicación', 2, 40.632), ('Literatura', 2, 40.632), ('Personal Social', 1, 37.245),
                            ('Formación Ciudadana y Cívica', 1, 37.245), ('Historia del Perú', 2, 44.694), ('Geografía', 2, 33.860),
                            ('Psicología y Filosofía', 1, 33.860), ('Economía', 4, 42.326), ('Física', 4, 47.404), ('Química', 4, 47.404),
                            ('Biología', 3, 44.694), ('Razonamiento Matemático', 10, 57.562), ('Razonamiento Verbal', 10, 57.562)], 0, 0, 0.5)
add('unaj', 'Sociales', [('Aritmética', 3, 42.140), ('Álgebra', 3, 40.454), ('Geometría', 3, 33.712), ('Trigonometría', 3, 30.340),
                         ('Comunicación', 6, 53.938), ('Literatura', 4, 50.568), ('Personal Social', 2, 42.140),
                         ('Formación Ciudadana y Cívica', 2, 44.499), ('Historia del Perú', 4, 53.938), ('Geografía', 4, 45.511),
                         ('Psicología y Filosofía', 2, 50.568), ('Economía', 4, 53.938), ('Razonamiento Matemático', 10, 57.310),
                         ('Razonamiento Verbal', 10, 57.310)], 0, 0, 0.5)

# ---------------- UNSCH ----------------
uni('unsch', 'suma_ponderada', 1000, 120, '', '450',
    'https://admision.unsch.edu.pe/documentos/pdf/prospecto.pdf',
    notas='Art. 28: incorrecta no resta. Art. 29/Tabla 5: valor = criterio 1-3; conocimientos 230 brutos × 900/230 = 900; cada test 10 × 1 × 5 = 50.',
    faltas=['Duración del examen: no publicada en el prospecto.'])
cs = ['Razonamiento Verbal', 'Lenguaje', 'Literatura', 'Razonamiento Lógico Matemático', 'Aritmética', 'Álgebra', 'Geometría',
      'Trigonometría', 'Física', 'Química', 'Biología', 'Anatomía', 'Historia Universal', 'Historia del Perú', 'Geografía y Ambiente',
      'Economía', 'Formación Ciudadana y Cívica', 'Actualidad Regional, Nacional e Internacional']
ns = [6, 6, 6, 6, 6, 4, 4, 4, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5]
crit = {'I - Ciencias': [3, 2, 2, 3, 3, 3, 3, 2, 3, 2, 1, 1, 2, 2, 2, 2, 3, 3],
        'II - Letras': [3, 3, 3, 2, 1, 2, 2, 1, 1, 2, 2, 1, 3, 3, 3, 3, 3, 3],
        'III - Biomédicas': [3, 2, 2, 2, 2, 2, 2, 1, 1, 2, 3, 3, 2, 2, 3, 3, 3, 3]}
F = round(900 / 230, 10)
for div, cr in crit.items():
    U['unsch']['filas'] += [(div, c, n, p, 0, 0, F) for c, n, p in zip(cs, ns, cr)]
    U['unsch']['filas'] += [(div, 'Test de Aptitud Vocacional', 10, 1, 0, 0, 5), (div, 'Test de Actitud Personal', 10, 1, 0, 0, 5)]

# ---------------- salida ----------------
for cod, u in U.items():
    d = os.path.join(OUT, cod)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'config_examen.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['proceso', 'division', 'division_tipo', 'curso', 'n_preguntas', 'puntos_correcta', 'puntos_incorrecta',
                    'puntos_blanco', 'factor_escala', 'peso', 'orden'])
        orden = {}
        for div, c, n, pc, pi, pb, fac in u['filas']:
            orden[div] = orden.get(div, 0) + 1
            w.writerow(['ORDINARIO', div, 'area', c, n, pc, pi, pb, fac, '', orden[div]])
    e = u['escala']
    with open(os.path.join(d, 'config_escala.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['proceso', 'motor', 'escala_total', 'umbral_excelente', 'umbral_bueno', 'umbral_regular', 'duracion_min',
                    'n_preguntas_total', 'factor_escala', 'minimo_aprobatorio', 'fuente', 'notas'])
        w.writerow(['ORDINARIO', u['motor'], e, round(e * 0.8, 2), round(e * 0.6, 2), round(e * 0.4, 2), u['dur'], u['npreg'],
                    u['factor'], u['minimo'], u['fuente'], u['notas']])
    print(cod, len(u['filas']), 'filas')
# Se FUSIONA con el _meta.json existente: conserva las universidades generadas por otras
# herramientas (gen_puntajes.mjs, lote 3).
meta_path = os.path.join(OUT, '_meta.json')
meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
meta.update({k: dict(faltas=v['faltas'], fuente=v['fuente'], notas=v['notas']) for k, v in U.items()})
json.dump(meta, open(meta_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
