# Configuraciones por universidad

Todo lo que necesita cada universidad para funcionar en SimulaUNA, listo para pegar en su
spreadsheet. Los datos vienen de **fuentes oficiales** (reglamentos, prospectos y cuadros de
vacantes de admisión 2026), investigados en octubre de 2026 con Kimi Deep Research y Codex con
búsqueda web. Cada fila lleva la URL de su fuente.

```
docs/configuraciones/
├── <uni>/
│   ├── config_examen.csv     puntaje: cursos, preguntas y puntos por área
│   ├── config_escala.csv     puntaje: motor, escala, duración, mínimo
│   └── config_carreras.csv   carreras del desplegable del registro, por área
├── _fuentes/                 informes completos de la investigación (con citas)
├── _herramientas/            generadores y validador (ver "Cómo regenerar")
├── _meta.json                datos de puntaje que la universidad NO publica
└── _carreras_resumen.json    conteo de carreras por universidad y área
```

**Validar todo** (usa el validador real del backend, sin Google Sheets):

```bash
node docs/configuraciones/_herramientas/validar.mjs
```

## 1. Puntajes (`config_examen` + `config_escala`)

Cada área suma exactamente su escala oficial y su número de preguntas.

| Universidad | Motor | Escala | Preguntas | Correcta | Incorrecta | Blanco | Mínimo |
|---|---|---|---|---|---|---|---|
| UNMSM | decimas | 2000 | 100 (5 áreas) | 20 | -1.125 | 0 | No hay |
| UNI | decimas | 1800 | 180 (3 pruebas) | 6 / 15 | **[FALTA] → 0** | 0 | 50 % del 1er puesto |
| UNFV | decimas | 500 | 50 (4 versiones) | 10 | -0.25219265 | 0 | 70 |
| UNALM | decimas | 100 | 100 | 1 | -0.17 | 0 | No hay |
| UNSA | suma_ponderada | 100 | 80 (3 áreas) | 0.80–1.95 | **[FALTA] → 0** | **[FALTA] → 0** | Mediana del programa |
| UNSAAC | otro (× 2.5) | 1000 | 80 (4 áreas) | 5 | 0 | **+1** | 450 |
| UNAJ | suma_ponderada | 3000 | 60 (2 áreas) | 10 × ponderación | 0 | **+0.5** | 300 |
| UNSCH | suma_ponderada (× 900/230) | 1000 | 120 (100 + 2 tests) | 1–3 | 0 | 0 | 450 |
| UNT | decimas | 407.9 | 100 (4 áreas) | 4.079 | -1.021 | 0 | **[FALTA]** sin cifra fija |
| UNC | decimas | 600 | 90 (4 módulos) | 8 aptitud / 6 conocimientos | -0.51 | 0 | 100 |
| UNP | decimas | 400 | 100 (3 áreas) | 4 | -0.25 | **-0.10** | No hay |
| UNCP | suma_ponderada (× 18.75) | 1500 | 80 (5 áreas) | ponderación 0.6–1.5 | 0 | 0 | No hay |

UNA no está en esta tabla: usa sus hojas legadas `Configuración_Ingenierías / _Sociales /
_Biomédicas` (escala 3000, 60 preguntas).

### Datos que la universidad no publica (decisión del dueño)

Están en 0 hasta que haya fuente oficial. Ver `_meta.json`.

- **UNI**: penalidad por incorrecta y duración por prueba (fuente no oficial: -1/5 del valor y 180 min).
- **UNSA**: penalidad por incorrecta y valor del blanco.
- **UNAJ**: el reglamento 2026 se aprobó sin tablas públicas; se usan los valores 2025.
- **UNSCH**: duración del examen.
- **UNT**: mínimo aprobatorio sin cifra fija; tres bloques de cursos (Historia/Geografía/Economía,
  Literatura/Análisis del Discurso/Comunicología, Biología/Química/Física) se publican sin reparto
  por asignatura y quedan como un curso agrupado cada uno.
- **UNP**: duración del examen (se usa 180 min). Ojo: **el blanco resta 0.10** (Art. 65).
- **UNCP**: el factor 18.75 (= 1500 / 80) es un cálculo: el prospecto da la escala 0–1500 y el
  Anexo 7 suma 80 puntos ponderados por área, pero no escribe el factor.

## 2. Carreras del registro (`config_carreras`)

El paso 2 del registro ("Tu meta") muestra un **desplegable de carreras** filtrado por el área
elegida, igual que el de UNA. Al final siempre está **"Mi carrera no está en la lista"**, que
abre un campo de texto: nadie queda trabado si falta una carrera.

| Universidad | Carreras | Por área |
|---|---|---|
| UNA | 51 | Ingenierías 23 · Sociales 20 · Biomédicas 8 |
| UNMSM | 88 | A Salud 17 · B Básicas 10 · C Ingeniería 26 · D Económicas 14 · E Humanidades 21 |
| UNI | 34 | Única 34 |
| UNFV | 60 | A 7 · B 21 · C 16 · D y E 16 |
| UNALM | 12 | Única 12 |
| UNSA | 59 | Biomédicas 6 · Ingenierías 21 · Sociales 32 |
| UNSAAC | 48 | A 16 · B 13 · C 4 · D 15 |
| UNAJ | 10 | Ingenierías 7 · Sociales 3 |
| UNSCH | 36 | I Ciencias 15 · II Letras 13 · III Biomédicas 8 |
| UNT | 45 | Área A 7 · B 19 · C 16 · D 3 |
| UNC | 34 | Módulo A 11 · B 7 · C 8 · D 8 |
| UNP | 36 | Ciencias 21 · Ciencias de la Salud 5 · Letras 10 |
| UNCP | 39 | Área I 2 · II 10 · III 5 · IV 12 · V 10 |
| **Total** | **552** | |

Columnas: `division | carrera | sede | activo | orden | fuente`.

- **`division`** debe ser **el mismo nombre de área** que en `config_examen` (en UNA: Ingenierías,
  Sociales, Biomédicas). El sistema lo compara sin tildes ni mayúsculas. Una fila con un área que
  no existe se salta y queda anotada en `_validacion_config`.
- **`sede`** vacío = sede central. Si se llena, el desplegable muestra "Enfermería (Chilca)". Las
  carreras de filiales con vacantes propias aparecen como filas separadas.
- **`activo`** = `NO` esconde la carrera sin borrarla (por ejemplo, si un año no abre vacantes).
- **`orden`** vacío = orden alfabético.
- **`fuente`** es informativa; el backend la ignora.

**Nunca afecta el puntaje.** Una hoja de carreras mal escrita solo hace que esa fila (o la lista
entera) no aparezca; el examen y la calificación siguen igual. Sin hoja, el registro pide la
carrera como texto libre, como antes.

Notas de la investigación (detalle en `_fuentes/`):

- **UNMSM**: Psicología y Enfermería aparecen dos veces (Lima y sede Chilca) porque tienen
  vacantes propias. Programas sin postulación propia ("Tecnología Médica", "Educación") no se
  listan como fila; sí sus especialidades.
- **UNFV**: las áreas D y E son distintas en el prospecto pero rinden el mismo examen; van juntas
  en "D y E".
- **UNA**: agrega a la lista que ya tenía el código las filiales (Azángaro, Chucuito-Juli),
  Ingeniería de Inteligencia Artificial y Ciencia de Datos, Sociología y Educación Secundaria:
  Ciencias Sociales.
- **UNSCH**: cuadro 2026-II; no incluye carreras nuevas del proceso 2027-I.
- **UNSAAC**: Educación Inicial (Canas) y Primaria (Espinar) confirmadas con los resultados del
  Ordinario de Filiales 2026-I.

## 3. Cómo cargarlas en Google Sheets

**Piloto ordinario (recomendado):** la función `cargarPilotoOrdinario` de Apps Script carga las 12
universidades de una vez (crea los spreadsheets, las hojas, los bancos vacíos y el registro; las
nuevas quedan ocultas) y `revisarPilotoOrdinario` dice cuáles ya se pueden publicar. Pasos en
`google-apps-script/DEPLOY_FASE1.md`, sección 8.7. Los datos van incrustados en
`google-apps-script/piloto_datos.gs` (UNMSM se registra con el código `sanmarcos`, el que usa la web).

**A mano, una universidad suelta:**

1. En el spreadsheet de la universidad crea (o abre) las hojas `config_examen`, `config_escala` y
   `config_carreras`.
2. *Archivo → Importar → Subir* el CSV → **"Reemplazar la hoja actual"**.
3. En el editor de Apps Script ejecuta **`validarConfiguraciones`** y revisa la hoja
   `_validacion_config` del CORE (verde = OK, amarillo = aviso, rojo = error con la celda exacta).
4. Ejecuta **`instalarValidacionDeDatos`** una vez: las celdas dejan de aceptar valores inválidos y
   la columna `division` de `config_carreras` queda como lista desplegable con las áreas reales.

Detalle completo del despliegue: `google-apps-script/DEPLOY_FASE1.md` (secciones 8 y 8.6).

## 4. Cómo regenerar

```bash
# Puntajes lotes 1 y 2: datos transcritos de _fuentes/puntajes_lote1/2_*.md
python docs/configuraciones/_herramientas/gen_configs.py docs/configuraciones

# Puntajes lote 3 (UNT, UNC, UNP, UNCP): lee los bloques ```csv del informe
node docs/configuraciones/_herramientas/gen_puntajes.mjs . docs/configuraciones/_fuentes/puntajes_lote3_*.md

# Carreras: lee los bloques ```csv de _fuentes/carreras_*.md y valida cada una
node docs/configuraciones/_herramientas/gen_carreras.mjs . docs/configuraciones/_fuentes/carreras_lote*.md

# Validar todo
node docs/configuraciones/_herramientas/validar.mjs

# Pasar los CSV al archivo de Apps Script del piloto (luego copiarlo al editor)
node docs/configuraciones/_herramientas/gen_piloto_gs.mjs
```

Para corregir una carrera puntual no hace falta regenerar: edita el CSV (o directamente la hoja
`config_carreras` en Sheets) y vuelve a validar.
