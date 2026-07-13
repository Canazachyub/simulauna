/**
 * SimulaUNA - HISTORY
 * ============================================
 * getHistory (CORE.historial + legado de 'una') y el wrapper de la
 * acción legada y deprecada `saveScore` (solo sigue operativa para
 * universidad='una'; el flujo nuevo usa submitExam).
 */

/**
 * Historial combinado: CORE.historial filtrado por dni (+ universidad y
 * proceso opcionales) UNIDO al historial legado `historial_puntajes` de
 * 'una' (cuando el filtro de universidad lo permite). Cada entrada gana
 * `universidad` y `proceso`.
 */
function getHistoryV2(dni, universidadFilter, procesoFilter) {
  if (!dni) return { history: [], message: 'DNI requerido' };

  const dniStr = String(dni).trim();
  const universidadFilterNorm = universidadFilter ? String(universidadFilter).trim().toLowerCase() : '';
  const procesoFilterNorm = procesoFilter ? String(procesoFilter).trim().toUpperCase() : '';
  const combined = [];

  // CORE.historial
  try {
    if (CORE_SPREADSHEET_ID) {
      const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
      const sheet = ss.getSheetByName('historial');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          const headers = data[0].map(function (h) { return String(h).trim(); });
          const idx = {
            dni: headers.indexOf('dni'),
            universidad: headers.indexOf('universidad'),
            proceso: headers.indexOf('proceso'),
            fecha: headers.indexOf('fecha'),
            division: headers.indexOf('division'),
            puntaje: headers.indexOf('puntaje'),
            puntajeMax: headers.indexOf('puntaje_max'),
            correctas: headers.indexOf('correctas'),
            total: headers.indexOf('total'),
            porcentaje: headers.indexOf('porcentaje')
          };

          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (String(row[idx.dni] || '').trim() !== dniStr) continue;

            const rowUniversidad = String(row[idx.universidad] || '').trim().toLowerCase();
            if (universidadFilterNorm && rowUniversidad !== universidadFilterNorm) continue;

            const rowProceso = String(row[idx.proceso] || '').trim().toUpperCase();
            if (procesoFilterNorm && rowProceso !== procesoFilterNorm) continue;

            combined.push({
              fecha: row[idx.fecha],
              area: row[idx.division],
              puntaje: parseFloat(row[idx.puntaje]) || 0,
              puntajeMax: parseFloat(row[idx.puntajeMax]) || 0,
              correctas: parseInt(row[idx.correctas], 10) || 0,
              total: parseInt(row[idx.total], 10) || 0,
              porcentaje: parseFloat(row[idx.porcentaje]) || 0,
              universidad: rowUniversidad,
              proceso: rowProceso
            });
          }
        }
      }
    }
  } catch (err) {
    console.log('Error leyendo CORE.historial: ' + err);
  }

  // Legado historial_puntajes de 'una' (solo si el filtro lo permite)
  const incluyeUna = !universidadFilterNorm || universidadFilterNorm === 'una';
  const incluyeOrdinario = !procesoFilterNorm || procesoFilterNorm === 'ORDINARIO';
  if (incluyeUna && incluyeOrdinario) {
    try {
      const legacy = unaGetUserHistory(dni);
      (legacy.history || []).forEach(function (h) {
        combined.push({
          fecha: h.fecha,
          area: h.area,
          puntaje: h.puntaje,
          puntajeMax: h.puntajeMax,
          correctas: h.correctas,
          total: h.total,
          porcentaje: h.porcentaje,
          universidad: 'una',
          proceso: 'ORDINARIO'
        });
      });
    } catch (err) {
      console.log('Error leyendo historial legado: ' + err);
    }
  }

  combined.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });

  return {
    dni: dni,
    totalIntentos: combined.length,
    history: combined,
    mejorPuntaje: combined.length > 0 ? Math.max.apply(null, combined.map(function (h) { return h.puntaje; })) : 0,
    ultimoPuntaje: combined.length > 0 ? combined[0].puntaje : 0
  };
}

/**
 * `saveScore` (deprecada): sigue operativa SOLO para universidad='una'
 * (el flujo nuevo califica en servidor vía submitExam). Cuando se llama
 * sin `universidad` en la querystring, main.gs invoca unaSaveUserScore
 * directamente (byte-idéntico); este wrapper es para cuando la petición
 * v2 la invoca explícitamente con universidad=una.
 */
function saveScoreForTenant(tenant, dni, score, maxScore, area, correct, total) {
  if (tenant.codigo !== 'una') {
    throw new Error('"saveScore" es una acción legada deprecada, solo disponible para universidad=una. Usa submitExam.');
  }
  const result = unaSaveUserScore(dni, score, maxScore, area, correct, total);
  result.universidad = 'una';
  return result;
}
