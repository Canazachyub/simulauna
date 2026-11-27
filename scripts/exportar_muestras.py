# -*- coding: utf-8 -*-
"""Exporta una MUESTRA pública del banco para las páginas SEO estáticas.

Lee los IMPORTAR_<U>.xlsx que genera F:\\PERU SINAPSIS\\BANCO_APP\\banco_app.py y escribe
src/seo/muestras/<u>.json con:
  - estadísticas completas (preguntas por curso, por tema, por examen y por año), y
  - unas pocas preguntas de muestra por curso y por año (≈4 % del banco), elegidas de forma
    determinista (hash) entre las más limpias: con justificación, cinco alternativas y sin
    referencias a figuras que no tengan imagen.

El resto del banco sigue siendo solo para alumnos con acceso. Correr tras cada importación:
    py -3 scripts/exportar_muestras.py
"""
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

BANCO = Path(r"F:\PERU SINAPSIS\BANCO_APP")
SALIDA = Path(__file__).resolve().parent.parent / "src" / "seo" / "muestras"

UNIVERSIDADES = {
    "una": {"archivo": "IMPORTAR_UNA.xlsx", "por_curso": 8, "por_anio": 6},
    "unsa": {"archivo": "IMPORTAR_UNSA.xlsx", "por_curso": 6, "por_anio": 8},
}

FIGURA_SIN_IMAGEN = re.compile(r"\b(figura|gr[aá]fic|diagrama|imagen|cuadro adjunto|mostrad)", re.I)


def slug(texto):
    t = texto.lower()
    for a, b in zip("áéíóúüñ", "aeiouun"):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def anio_de(examen):
    m = re.search(r"(19|20)\d{2}", examen or "")
    return m.group(0) if m else None


def limpia(fila):
    texto, *_ = fila
    opciones = fila[2:7]
    if not texto or any(o is None or str(o).strip() == "" for o in opciones):
        return False
    try:
        correcta = int(fila[7])
    except (TypeError, ValueError):
        return False
    if not 1 <= correcta <= 5:
        return False
    just = str(fila[10] or "")
    if len(just) < 25:
        return False
    if not fila[9] and FIGURA_SIN_IMAGEN.search(str(texto)):
        return False
    if len(str(texto)) > 900:
        return False
    return True


def orden(fila):
    return hashlib.sha1((str(fila[0]) + str(fila[15])).encode("utf-8")).hexdigest()


def pregunta(fila):
    return {
        "texto": str(fila[0]),
        "opciones": [str(o) for o in fila[2:7]],
        "correcta": int(fila[7]) - 1,
        "imagen": fila[9] or None,
        "justificacion": str(fila[10]),
        "curso": fila[12],
        "tema": fila[13] or None,
        "subtema": fila[14] or None,
        "examen": fila[15] or None,
    }


def exportar(codigo, cfg):
    wb = openpyxl.load_workbook(BANCO / cfg["archivo"], read_only=True)
    filas = []
    for hoja in wb.sheetnames:
        if not hoja.startswith("Banco_"):
            continue
        for f in wb[hoja].iter_rows(min_row=2, values_only=True):
            if f and f[0] and f[12]:
                filas.append(f)

    cursos = defaultdict(list)
    for f in filas:
        cursos[f[12]].append(f)

    usadas = set()
    datos_cursos = []
    for curso in sorted(cursos, key=lambda c: -len(cursos[c])):
        lista = cursos[curso]
        temas = Counter(f[13] for f in lista if f[13])
        examenes = Counter(f[15] for f in lista if f[15])
        candidatas = sorted((f for f in lista if limpia(f)), key=orden)
        # Variedad: primero una por tema, luego el resto.
        elegidas, temas_vistos = [], set()
        for f in candidatas:
            if f[13] not in temas_vistos:
                elegidas.append(f)
                temas_vistos.add(f[13])
            if len(elegidas) >= cfg["por_curso"]:
                break
        for f in candidatas:
            if len(elegidas) >= cfg["por_curso"]:
                break
            if f not in elegidas:
                elegidas.append(f)
        usadas.update(id(f) for f in elegidas)
        datos_cursos.append({
            "curso": curso,
            "slug": slug(curso),
            "total": len(lista),
            "temas": [{"tema": t, "total": n} for t, n in temas.most_common()],
            "examenes": len(examenes),
            "muestras": [pregunta(f) for f in elegidas],
        })

    anios = defaultdict(list)
    for f in filas:
        a = anio_de(f[15])
        if a:
            anios[a].append(f)
    datos_anios = []
    for anio in sorted(anios, reverse=True):
        lista = anios[anio]
        examenes = Counter(f[15] for f in lista)
        candidatas = sorted((f for f in lista if limpia(f) and id(f) not in usadas), key=orden)
        elegidas, cursos_vistos = [], set()
        for f in candidatas:
            if f[12] not in cursos_vistos:
                elegidas.append(f)
                cursos_vistos.add(f[12])
            if len(elegidas) >= cfg["por_anio"]:
                break
        datos_anios.append({
            "anio": anio,
            "total": len(lista),
            "examenes": [{"examen": e, "total": n} for e, n in sorted(examenes.items())],
            "cursos": [{"curso": c, "total": n} for c, n in Counter(f[12] for f in lista).most_common()],
            "muestras": [pregunta(f) for f in elegidas],
        })

    salida = {
        "universidad": codigo,
        "total": len(filas),
        "conImagen": sum(1 for f in filas if f[9]),
        "examenes": len({f[15] for f in filas if f[15]}),
        "anioMin": min(anios) if anios else None,
        "anioMax": max(anios) if anios else None,
        "cursos": datos_cursos,
        "anios": datos_anios,
    }
    SALIDA.mkdir(parents=True, exist_ok=True)
    (SALIDA / f"{codigo}.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    n = sum(len(c["muestras"]) for c in datos_cursos) + sum(len(a["muestras"]) for a in datos_anios)
    print(f"{codigo}: {len(filas)} preguntas, {len(datos_cursos)} cursos, {len(datos_anios)} años, {n} de muestra")


if __name__ == "__main__":
    for codigo, cfg in UNIVERSIDADES.items():
        if len(sys.argv) > 1 and codigo not in sys.argv[1:]:
            continue
        exportar(codigo, cfg)
