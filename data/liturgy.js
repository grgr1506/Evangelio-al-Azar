/* Calendario litúrgico romano (forma ordinaria) para cualquier fecha.
   Devuelve el nombre del día en español y la referencia del Evangelio de la misa.
   Criterios (como en Perú y gran parte de Latinoamérica): Epifanía y Ascensión se celebran en domingo. */
(() => {
  'use strict';
  const L = window.LECTIONARY;
  const DAY = 864e5;
  const mk = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const add = (d, n) => new Date(d.getTime() + n * DAY);
  const diff = (a, b) => Math.round((a - b) / DAY);
  const dow = (d) => d.getUTCDay();
  const same = (a, b) => a.getTime() === b.getTime();
  const sundayOf = (d) => add(d, -dow(d));
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV'];
  const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return mk(y, month, day);
  }
  function advent1(y) { const x = mk(y, 12, 25); return add(x, -(dow(x) || 7) - 21); }
  function epiphany(y) { const j2 = mk(y, 1, 2); return add(j2, (7 - dow(j2)) % 7); }
  function baptism(y) { const e = epiphany(y); return e.getUTCDate() >= 7 ? add(e, 1) : add(e, 7); }
  function holyFamily(y) { // Navidad del año y
    for (let d = 26; d <= 31; d++) if (dow(mk(y, 12, d)) === 0) return mk(y, 12, d);
    return mk(y, 12, 30);
  }

  const yearCache = {};
  function yearData(y) {
    if (yearCache[y]) return yearCache[y];
    const E = easter(y);
    const Y = {
      E, ash: add(E, -46), palm: add(E, -7), holyThu: add(E, -3), goodFri: add(E, -2), holySat: add(E, -1),
      asc: add(E, 42), pent: add(E, 49), trinity: add(E, 56), corpus: add(E, 63), sacredHeart: add(E, 68),
      adv1: advent1(y), epi: epiphany(y), bap: baptism(y), hf: holyFamily(y),
    };
    Y.king = add(Y.adv1, -7);
    // Fiestas fijas con traslados
    Y.fixed = [];
    for (const [m, d, name, rank, g] of L.fixed) {
      let date = mk(y, m, d);
      if (m === 3 && d === 19) { // San José
        if (date >= Y.palm && date <= E) date = add(Y.palm, -1);
        else if (dow(date) === 0) date = add(date, 1);
      }
      if (m === 3 && d === 25) { // Anunciación
        if (date >= Y.palm && date <= add(E, 7)) date = add(E, 8);
        else if (dow(date) === 0) date = add(date, 1);
      }
      if (m === 12 && d === 8 && dow(date) === 0) date = add(date, 1);
      if (m === 6 && d === 24 && same(date, Y.sacredHeart)) date = add(date, -1);
      Y.fixed.push({ date, name, rank, g });
    }
    yearCache[y] = Y;
    return Y;
  }

  const cycleOf = (litYearEnd) => ['C', 'A', 'B'][litYearEnd % 3];

  /** Información litúrgica de una fecha (Date local o 'YYYY-MM-DD'). */
  function dayInfo(input) {
    let d;
    if (typeof input === 'string') { const [y, m, dd] = input.split('-').map(Number); d = mk(y, m, dd); }
    else d = mk(input.getFullYear(), input.getMonth() + 1, input.getDate());
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate(), w = dow(d);
    const Y = yearData(y);
    const litEnd = d >= Y.adv1 ? y + 1 : y;
    const C = cycleOf(litEnd);
    let key, name, season, kind = 'weekday', gospelOverride = null;

    if (m === 12 && day >= 25) {
      season = 'navidad'; kind = 'special';
      if (day === 25) { key = 'CHRISTMAS'; name = 'Natividad del Señor'; }
      else if (same(d, Y.hf)) { key = 'HOLYFAM' + C; name = 'La Sagrada Familia de Jesús, María y José'; }
      else if (day <= 28) { key = null; } // San Esteban, San Juan, Santos Inocentes (fiestas fijas)
      else { key = 'DEC' + day; name = `Día ${ROMAN[day - 24]} de la Octava de Navidad`; }
    } else if (m === 1 && d <= Y.bap) {
      season = 'navidad'; kind = 'special';
      if (day === 1) { key = 'MARYMOTHER'; name = 'Santa María, Madre de Dios'; }
      else if (same(d, Y.epi)) { key = 'EPIPHANY'; name = 'Epifanía del Señor'; }
      else if (same(d, Y.bap)) { key = 'BAPT' + C; name = 'Bautismo del Señor'; }
      else if (d < Y.epi) { key = 'JAN' + day; name = `Feria del tiempo de Navidad (${day} de enero)`; kind = 'weekday'; }
      else { key = 'EPI' + w; name = `${DOW[w]} después de la Epifanía`; kind = 'weekday'; }
    } else if (d >= Y.adv1) {
      season = 'adviento';
      const n = Math.floor(diff(d, Y.adv1) / 7) + 1;
      if (w === 0) { key = `ADV${n}${C}`; name = `${ROMAN[n]} Domingo de Adviento`; kind = 'sunday-strong'; }
      else if (m === 12 && day >= 17) { key = 'DEC' + day; name = `Feria de Adviento (${day} de diciembre)`; }
      else { key = `ADVW${n}${w}`; name = `${DOW[w]} de la ${ROMAN[n]} semana de Adviento`; }
    } else if (d >= Y.ash && d < Y.E) {
      season = 'cuaresma';
      const lent1 = add(Y.ash, 4);
      if (same(d, Y.ash)) { key = 'ASH'; name = 'Miércoles de Ceniza'; kind = 'special'; }
      else if (d < lent1) { key = 'ASH' + w; name = `${DOW[w]} después de Ceniza`; }
      else if (same(d, Y.palm)) { key = 'PALM' + C; name = 'Domingo de Ramos en la Pasión del Señor'; kind = 'special'; }
      else if (d > Y.palm) {
        kind = 'special'; season = 'triduo';
        if (same(d, Y.holyThu)) { key = 'HOLYTHU'; name = 'Jueves Santo · Misa de la Cena del Señor'; }
        else if (same(d, Y.goodFri)) { key = 'GOODFRI'; name = 'Viernes Santo · Pasión del Señor'; }
        else if (same(d, Y.holySat)) { key = 'VIGIL' + C; name = 'Sábado Santo · Vigilia Pascual'; }
        else { key = 'HOLYW' + w; name = `${DOW[w]} Santo`; season = 'cuaresma'; }
      } else {
        const n = Math.floor(diff(d, lent1) / 7) + 1;
        if (w === 0) { key = `LENT${n}${C}`; name = `${ROMAN[n]} Domingo de Cuaresma`; kind = 'sunday-strong'; }
        else { key = `LENTW${n}${w}`; name = `${DOW[w]} de la ${ROMAN[n]} semana de Cuaresma`; }
      }
    } else if (d >= Y.E && d <= Y.pent) {
      season = 'pascua';
      const n = Math.floor(diff(d, Y.E) / 7) + 1;
      if (same(d, Y.E)) { key = 'EASTER'; name = 'Domingo de Pascua de la Resurrección del Señor'; kind = 'special'; }
      else if (same(d, Y.pent)) { key = 'PENT'; name = 'Domingo de Pentecostés'; kind = 'special'; }
      else if (same(d, Y.asc)) { key = 'ASC' + C; name = 'La Ascensión del Señor'; kind = 'special'; }
      else if (n === 1) { key = 'EASW1' + w; name = `${DOW[w]} de la Octava de Pascua`; kind = 'special'; }
      else if (w === 0) { key = `EAS${n}${C}`; name = n === 2 ? 'II Domingo de Pascua (de la Divina Misericordia)' : `${ROMAN[n]} Domingo de Pascua`; kind = 'sunday-strong'; }
      else { key = `EASW${n}${w}`; name = `${DOW[w]} de la ${ROMAN[n]} semana de Pascua`; }
    } else {
      season = 'ordinario';
      const part1 = d < Y.ash;
      const n = part1
        ? Math.floor(diff(sundayOf(d), sundayOf(Y.bap)) / 7) + 1
        : 34 - Math.floor(diff(Y.adv1, sundayOf(d)) / 7) + 1;
      if (same(d, Y.trinity)) { key = 'TRINITY' + C; name = 'La Santísima Trinidad'; kind = 'special'; }
      else if (same(d, Y.corpus)) { key = 'CORPUS' + C; name = 'El Cuerpo y la Sangre de Cristo'; kind = 'special'; }
      else if (same(d, Y.sacredHeart)) { key = 'SACREDHEART' + C; name = 'Sagrado Corazón de Jesús'; kind = 'special'; }
      else if (same(d, add(Y.sacredHeart, 1))) { key = null; name = 'Inmaculado Corazón de la Virgen María'; gospelOverride = 'Luke 2:41-51'; }
      else if (same(d, add(Y.pent, 1))) { key = null; name = 'Santa María, Madre de la Iglesia'; gospelOverride = 'John 19:25-34'; }
      else if (same(d, Y.king)) { key = 'ORD34' + C; name = 'Jesucristo, Rey del Universo'; kind = 'special'; }
      else if (w === 0) { key = `ORD${n}${C}`; name = `${ROMAN[n]} Domingo del Tiempo Ordinario`; kind = 'sunday'; }
      else { key = `ORDW${n}${w}`; name = `${DOW[w]} de la ${ROMAN[n]} semana del Tiempo Ordinario`; }
    }

    let gospel = gospelOverride || (key ? L.g[key] : null);
    // Alternativas del leccionario según el ciclo dominical
    if (key === 'EASW41' && C === 'A') gospel = 'John 10:11-18';
    if (key === 'LENTW51' && C === 'C') gospel = 'John 8:12-20';
    let feast = null;
    // Fiestas y solemnidades de fecha fija
    const fx = Y.fixed.find((f) => same(f.date, d));
    if (fx) {
      const wins =
        (m === 12 && day >= 26 && day <= 28 && !key) ||
        (fx.rank === 'S' && kind !== 'special' && kind !== 'sunday-strong') ||
        (fx.rank === 'L' && kind !== 'special' && kind !== 'sunday-strong') ||
        (fx.rank === 'F' && kind === 'weekday') ||
        (fx.rank === 'M' && kind === 'weekday' && season !== 'cuaresma' && !(season === 'adviento' && m === 12 && day >= 17));
      if (wins) {
        feast = fx.name;
        gospel = fx.g === 'TRANSFIG' ? L.transfig[C] : fx.g;
      }
    }
    const rankLabel = fx && feast ? { S: 'Solemnidad', F: 'Fiesta', L: 'Fiesta del Señor', M: 'Memoria' }[fx.rank] : null;
    return {
      date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      dateLabel: `${DOW[w].toLowerCase()} ${day} de ${MONTHS[m - 1]} de ${y}`,
      season, cycle: C, key,
      title: feast || name,
      rank: rankLabel,
      subtitle: feast ? name : null,
      gospel,
    };
  }

  /* ---------- Referencias bíblicas → versículos ---------- */
  const BOOK = { Matt: 'Mt', Mark: 'Mc', Luke: 'Lc', John: 'Jn' };
  const BOOK_ES = { Matt: 'Mateo', Mark: 'Marcos', Luke: 'Lucas', John: 'Juan' };
  function parseRef(ref) {
    const m = ref.match(/^(Matt|Mark|Luke|John)\s+(.+)$/);
    if (!m) return null;
    const segs = []; let ch = null;
    for (let part of m[2].split(/[,;]\s*/)) {
      part = part.replace(/[a-d](?=$|[-:])/g, '').trim();
      if (!part) continue;
      const [a, b] = part.split('-');
      let c1, v1;
      if (a.includes(':')) { [c1, v1] = a.split(':').map(Number); ch = c1; } else { c1 = ch; v1 = Number(a); }
      let c2 = c1, v2 = v1;
      if (b) { if (b.includes(':')) { [c2, v2] = b.split(':').map(Number); ch = c2; } else v2 = Number(b); }
      segs.push({ c1, v1, c2, v2 });
    }
    return { book: m[1], bk: BOOK[m[1]], name: BOOK_ES[m[1]], segs };
  }
  /** Versículos de un Evangelio a partir de la referencia, con la Biblia incluida en la app. */
  function versesFor(ref, bible) {
    const p = parseRef(ref); if (!p) return null;
    const G = bible[p.bk]; const out = [];
    const firstCh = p.segs[0].c1;
    let last = null;
    for (const s of p.segs) {
      for (let c = s.c1; c <= s.c2; c++) {
        const chap = G[c - 1]; if (!chap) continue;
        const from = c === s.c1 ? s.v1 : 1, to = c === s.c2 ? Math.min(s.v2, chap.length) : chap.length;
        for (let v = from; v <= to; v++) {
          const t = chap[v - 1]; if (!t) continue;
          const gap = last && !(last.c === c && last.v === v - 1) && !(last.c === c - 1 && v === 1);
          out.push({ n: c !== firstCh ? `${c},${v}` : String(v), t, gap: !!gap });
          last = { c, v };
        }
      }
    }
    return { verses: out, bk: p.bk, bookName: p.name, chapter: firstCh };
  }
  function refToSpanish(ref) {
    const p = parseRef(ref); if (!p) return ref;
    let out = ''; let prev = null;
    p.segs.forEach((s, i) => {
      const range = s.c2 !== s.c1 ? `${s.v1}–${s.c2}, ${s.v2}` : s.v2 !== s.v1 ? `${s.v1}-${s.v2}` : `${s.v1}`;
      if (s.c1 !== prev) out += (i ? '; ' : '') + `${s.c1}, ${range}`;
      else out += `. ${range}`;
      prev = s.c2;
    });
    return `${p.name} ${out}`;
  }

  window.Liturgy = { dayInfo, versesFor, parseRef, refToSpanish, easter };
})();
