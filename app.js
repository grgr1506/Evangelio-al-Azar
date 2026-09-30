/* Evangelio al azar — Lectio Divina */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    n.append(...kids.filter((k) => k !== null && k !== undefined && k !== false));
    return n;
  };
  const icon = (id) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#' + id); s.append(u); return s;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  };
  let toastTimer;
  function toast(msg, ms = 3000) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

  /* ---------- Constantes ---------- */
  const COLORS = ['honey', 'clay', 'sage', 'lavender', 'sand', 'mist'];
  const COLOR_NAMES = { honey: 'miel', clay: 'arcilla', sage: 'salvia', lavender: 'lavanda', sand: 'arena', mist: 'niebla' };
  const MARKER = { honey: '#E9C878', clay: '#DEA998', sage: '#B2C698', lavender: '#C8BCDE', sand: '#ECC8A0', mist: '#BED0C8' };
  const NOTE_INK = { honey: '#86661B', clay: '#94503C', sage: '#52663D', lavender: '#5C4F86', sand: '#8F5E37', mist: '#4A675E' };
  const OLD_COLORS = { gold: 'honey', rose: 'clay', sky: 'mist', sage: 'sage', lilac: 'lavender', peach: 'sand' };
  const ART = window.ART || [];
  const artById = (id) => ART.find((a) => a.id === id) || ART[0];
  const artSrc = (a) => `assets/art/${a.id}.jpg`;
  const artCredit = (a) => `${a.artist}, ${a.title}${a.year ? ` (${a.year})` : ''}`;
  const Lit = window.Liturgy;
  // Dentro de una página publicada en claude.ai no se pueden incrustar reproductores ni consultar otras webs
  const IN_ARTIFACT = !!(window.claude && typeof window.claude.use === 'function');
  function askConfirm(message, okLabel = 'Continuar') {
    return new Promise((resolve) => {
      const dlg = $('#confirmDlg');
      $('#confirmMsg').textContent = message; $('#confirmOk').textContent = okLabel;
      const done = (v) => { dlg.close(); resolve(v); };
      $('#confirmOk').onclick = () => done(true);
      $('#confirmCancel').onclick = () => done(false);
      dlg.oncancel = (e) => { e.preventDefault(); done(false); };
      dlg.showModal();
    });
  }
  const TRANS = { bll: 'Biblia libre Latinoamericana', lpd: 'Libro del Pueblo de Dios' };

  const GUIDE = [
    { n: 'I', name: 'Prepárate', latin: 'Statio', q: 'Ponte en presencia de Dios',
      tips: ['Busca un lugar tranquilo y respira despacio.', 'Si te ayuda, pon música de canto gregoriano.'],
      prayer: 'Ven, Espíritu Santo, llena los corazones de tus fieles y enciende en ellos el fuego de tu amor. Envía tu Espíritu, Señor, y renovarás la faz de la tierra. Amén.' },
    { n: 'II', name: 'Lee', latin: 'Lectio', q: '¿Qué dice el texto?',
      tips: ['Lee despacio, dos o tres veces. Si puedes, en voz alta.', 'Fíjate en personajes, lugares, gestos y verbos.', 'Selecciona en el texto lo que te llame la atención y márcalo con un color.'] },
    { n: 'III', name: 'Medita', latin: 'Meditatio', q: '¿Qué me dice Dios a mí?',
      tips: ['Rumia la palabra que más te tocó.', '¿Con qué personaje te identificas? ¿Qué relación tiene con tu vida hoy?'] },
    { n: 'IV', name: 'Ora', latin: 'Oratio', q: '¿Qué le digo yo a Dios?',
      tips: ['Responde con lo que brotó al meditar: gratitud, alabanza, perdón o petición.', 'Háblale como a un amigo.'] },
    { n: 'V', name: 'Contempla', latin: 'Contemplatio', q: 'Descansa en Dios',
      tips: ['Quédate en silencio. No hace falta decir nada.', 'Si te distraes, vuelve repitiendo tu palabra.'], timer: true },
    { n: 'VI', name: 'Actúa', latin: 'Actio', q: '¿A qué me compromete?',
      tips: ['Elige un gesto concreto, pequeño y posible para hoy.'] },
  ];

  const PLAYLISTS = [
    { name: 'The Sound of Gregorian Chant', url: 'https://open.spotify.com/playlist/4FVeqntRIKNOhiVVAx0EZM' },
    { name: 'This Is Gregorian Chants', url: 'https://open.spotify.com/playlist/37i9dQZF1DZ06evO46Bpg5' },
    { name: 'Best Gregorian Chants', url: 'https://open.spotify.com/playlist/6CHZYelNYLUAWyKjOJZvnq' },
    { name: 'Himnos para el silencio', url: 'https://open.spotify.com/playlist/6ENpYVmaiAF540AaIDwpHZ' },
    { name: 'Gregorian Chant Music', url: 'https://open.spotify.com/playlist/3KHF0cMBoV1TQTgKFrLJto' },
  ];

  const state = { session: null, pending: null, activeId: null, lastColor: store.get('evr.color', 'honey'), timer: { total: 300, left: 300, running: false, handle: null } };

  /* ---------- Texto y posiciones ---------- */
  function prefixes(verses) {
    const p = []; let acc = 0;
    verses.forEach((v) => { p.push(acc); acc += v.t.length + 1; });
    p.push(acc);
    return p;
  }
  const fullText = (s) => s.verses.map((v) => v.t).join('\n');
  function verseOf(pos, pre) { let i = 0; while (i < pre.length - 2 && pre[i + 1] <= pos) i++; return i; }
  const hlText = (s, h) => fullText(s).slice(h.s, h.e).replace(/\n/g, ' ');

  /* ---------- Sesiones ---------- */
  function randomArt(except) { const pool = ART.filter((a) => a.id !== except); return (pick(pool) || ART[0] || {}).id; }

  // Título del pasaje: el de la perícopa que más se superpone con la lectura
  function titleFor(ref) {
    const p = Lit.parseRef(ref); if (!p) return null;
    const first = p.segs[0], last = p.segs[p.segs.length - 1];
    const a = first.c1 * 1000 + first.v1, b = last.c2 * 1000 + last.v2;
    let best = null, bestScore = 0;
    for (const [bk, c1, v1, c2, v2, t] of window.TITLES || []) {
      if (bk !== p.bk) continue;
      const x = c1 * 1000 + v1, y = c2 * 1000 + v2;
      const ov = Math.min(b, y) - Math.max(a, x) + 1;
      if (ov <= 0) continue;
      const score = ov / (Math.max(b, y) - Math.min(a, x) + 1);
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  function sessionForDate(iso) {
    const info = Lit.dayInfo(iso);
    const v = Lit.versesFor(info.gospel, window.GOSPELS);
    return {
      v: 2, id: uid(), created: Date.now(), updated: Date.now(),
      date: info.date, dateLabel: info.dateLabel, season: info.season, cycle: info.cycle,
      dayName: info.title,
      gospelRef: info.gospel, refLong: Lit.refToSpanish(info.gospel),
      title: titleFor(info.gospel) || Lit.refToSpanish(info.gospel),
      book: v.bookName, chapter: v.chapter, verses: v.verses, numbered: true,
      translation: TRANS.bll, trans: 'bll', base: null, custom: null,
      hls: [], doc: '', saint: pick(window.SAINT_QUOTES),
      art: randomArt(state.session && state.session.art),
      comment: null, saintsOfDay: null,
    };
  }

  // Lectios guardadas con la versión anterior de la app
  function migrate(s) {
    if (!s || s.v === 2) return s;
    s.v = 2;
    s.hls = (s.hls || []).map((h) => ({ ...h, c: OLD_COLORS[h.c] || h.c }));
    if (!s.doc) {
      const n = s.notes || {};
      const parts = [];
      if (s.word) parts.push(`<blockquote>${escapeHtml(s.word)}</blockquote>`);
      [['meditatio', 'Meditatio'], ['oratio', 'Oratio'], ['contemplatio', 'Contemplatio'], ['actio', 'Actio'], ['lectio', 'Lectio']].forEach(([k, t]) => {
        if (n[k] && n[k].trim()) parts.push(`<h3>${t}</h3><p>${escapeHtml(n[k].trim()).replace(/\n/g, '<br>')}</p>`);
      });
      s.doc = parts.join('');
    }
    s.dateLabel = s.dateLabel || s.kicker || '';
    s.art = s.art || randomArt();
    s.trans = s.trans || 'bll';
    return s;
  }

  const docText = (html) => {
    const d = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    return (d.body.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const hasContent = (s) => s.hls.length > 0 || !!docText(s.doc);
  const loadSessions = () => store.get('evr.sessions', {});
  function saveNow() {
    const s = state.session; if (!s) return;
    s.updated = Date.now();
    store.set('evr.current', s);
    const all = loadSessions();
    if (hasContent(s)) all[s.id] = s; else delete all[s.id];
    Object.keys(all).sort((a, b) => all[b].updated - all[a].updated).slice(200).forEach((id) => delete all[id]);
    store.set('evr.sessions', all);
    $('#savedNote').textContent = hasContent(s) ? 'Guardado en tu diario.' : '';
  }
  const persist = debounce(saveNow, 400);

  /* ---------- Cargar un día ---------- */
  function randomDate() {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const span = 365 * 3;
    let d;
    do { d = new Date(today); d.setDate(today.getDate() + Math.floor(Math.random() * (2 * span + 1)) - span); }
    while (state.session && isoDate(d) === state.session.date);
    return isoDate(d);
  }
  function loadDate(iso) {
    const s = sessionForDate(iso);
    setSession(s);
    fetchCommentary(s);
    if (store.get('evr.trans', 'bll') === 'lpd') applyLpd(s, true);
  }

  /* ---------- Traducción: Libro del Pueblo de Dios (evangeliodeldia.org, ±30 días) ---------- */
  const daysFromToday = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5); };
  const BOOK_AB = { Matt: 'Mt', Mark: 'Mc', Luke: 'Lc', John: 'Jn' };
  async function applyLpd(s, quiet) {
    if (!s.date || Math.abs(daysFromToday(s.date)) > 29) {
      if (!quiet) toast('El Libro del Pueblo de Dios solo está disponible para días hasta 30 días antes o después de hoy.', 4500);
      renderHead(); return false;
    }
    const date = s.date.replace(/-/g, '');
    try {
      const [reading, st] = await Promise.all([evFetch(date, { type: 'reading', content: 'GSP' }), evFetch(date, { type: 'reading_st', content: 'GSP' })]);
      const ref = htmlToText(st).trim();
      const mine = (s.gospelRef || '').match(/^(\w+) (\d+):/);
      const theirs = ref.match(/^(Mt|Mc|Lc|Jn)\s+(\d+),/);
      if (!mine || !theirs || BOOK_AB[mine[1]] !== theirs[1] || mine[2] !== theirs[2]) {
        if (!quiet) toast('Para este día evangeliodeldia.org trae otra lectura; sigo con la Biblia libre Latinoamericana.', 4500);
        renderHead(); return false;
      }
      let lines = htmlToText(reading).split('\n').map((l) => l.trim());
      const cut = lines.findIndex((l) => /^Extraído de la Biblia/i.test(l));
      if (cut >= 0) lines = lines.slice(0, cut);
      lines = lines.filter(Boolean).map((l) => l.replace(/\s+/g, ' '));
      if (!lines.length || state.session !== s) return false;
      s.base = { verses: s.verses, numbered: s.numbered };
      s.verses = lines.map((t, i) => ({ n: String(i + 1), t })); s.numbered = false;
      s.translation = TRANS.lpd; s.trans = 'lpd'; s.hls = [];
      render(); persist();
      return true;
    } catch {
      if (!quiet) toast('No se pudo conectar con evangeliodeldia.org.');
      renderHead(); return false;
    }
  }
  function applyBll(s) {
    if (s.base) { s.verses = s.base.verses; s.numbered = s.base.numbered; s.base = null; }
    s.translation = TRANS.bll; s.trans = 'bll'; s.hls = [];
    render(); persist();
  }
  function initTranslation() {
    if (IN_ARTIFACT) { $('#transPick option[value="lpd"]').remove(); store.set('evr.trans', 'bll'); }
    $('#transPick').addEventListener('change', async (e) => {
      const s = state.session; const want = e.target.value;
      if (s.hls.length && !(await askConfirm('Al cambiar de traducción se quitarán tus subrayados.', 'Cambiar'))) { e.target.value = s.trans || 'bll'; return; }
      store.set('evr.trans', want);
      if (want === 'lpd') await applyLpd(s, false); else applyBll(s);
    });
  }
  function setSession(s) {
    s = migrate(s);
    // Lectios guardadas cuando el título era el nombre litúrgico del día
    if (s.gospelRef && !s.dayName) { s.dayName = s.title; s.title = titleFor(s.gospelRef) || s.refLong; }
    state.session = s;
    state.pending = null; state.activeId = null;
    hideToolbar(); hideNote();
    render();
    store.set('evr.current', state.session);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Comentario (evangeliodeldia.org, solo ±30 días) ---------- */
  const EV = 'https://feed.evangelizo.org/v2/reader.php';
  async function evFetch(date, params) {
    const q = new URLSearchParams({ date, lang: 'SP', ...params });
    const r = await fetch(`${EV}?${q}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    if (/wrong param/i.test(txt)) throw new Error('fecha fuera de rango');
    return txt;
  }
  function htmlToText(html) {
    const d = new DOMParser().parseFromString(`<div>${html.replace(/<br\s*\/?>/gi, '\n')}</div>`, 'text/html');
    return (d.body.textContent || '').replace(/ /g, ' ');
  }
  async function fetchCommentary(s) {
    if (s.comment || IN_ARTIFACT) return;
    const [y, m, d] = s.date.split('-').map(Number);
    const days = Math.round((new Date(y, m - 1, d) - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5);
    if (Math.abs(days) > 29) return;
    const date = s.date.replace(/-/g, '');
    try {
      const [cm, ca, ct, cs, saints] = await Promise.all([
        evFetch(date, { type: 'comment' }), evFetch(date, { type: 'comment_a' }),
        evFetch(date, { type: 'comment_t' }), evFetch(date, { type: 'comment_s' }),
        evFetch(date, { type: 'saint' }).catch(() => ''),
      ]);
      const text = htmlToText(cm).replace(/evangeliodeldia\.org\s*$/i, '').trim();
      if (!text) return;
      s.comment = { text, author: htmlToText(ca).trim(), title: htmlToText(ct).trim(), source: htmlToText(cs).trim() };
      const dd = new DOMParser().parseFromString(saints, 'text/html');
      s.saintsOfDay = $$('a', dd).map((a) => a.textContent.trim()).filter(Boolean);
      if (state.session === s) { renderComment(); persist(); }
    } catch { /* sin conexión: no pasa nada */ }
  }

  /* ---------- Render ---------- */
  function render() {
    renderHead();
    renderText();
    renderFootnotes();
    renderEditor();
    renderSaint();
    renderComment();
    $('#savedNote').textContent = hasContent(state.session) ? 'Guardado en tu diario.' : '';
  }

  function renderHead() {
    const s = state.session;
    $('#kicker').textContent = s.refLong || ' ';
    $('#title').textContent = s.title;
    $('#bookName').textContent = s.book ? `san ${s.book}` : '';
    $('#translation').textContent = s.custom ? `Texto: ${s.translation} (pegado por ti)` : '';
    $('#transWrap').hidden = !!s.custom;
    $('#transPick').value = s.trans || 'bll';
    if (s.date) $('#datePick').value = s.date;
    document.title = `${s.refLong} · Evangelio al azar`;
    const a = artById(s.art);
    const img = $('#artImg');
    if (a && img.dataset.id !== a.id) { img.src = artSrc(a); img.dataset.id = a.id; img.alt = artCredit(a); }
    $('#artCaption').textContent = a ? artCredit(a) : '';
  }

  function segmentsFor(text, start, hls) {
    const end = start + text.length;
    const hs = hls.filter((h) => h.s < end && h.e > start).sort((a, b) => a.s - b.s);
    const out = []; let cur = start;
    for (const h of hs) {
      const a = Math.max(h.s, start), b = Math.min(h.e, end);
      if (a > cur) out.push({ text: text.slice(cur - start, a - start) });
      if (b > a) out.push({ text: text.slice(a - start, b - start), h, last: h.e <= end });
      cur = Math.max(cur, b);
    }
    if (cur < end) out.push({ text: text.slice(cur - start) });
    return out;
  }
  function noteNumbers(s) {
    const map = {}; let n = 0;
    [...s.hls].sort((a, b) => a.s - b.s).forEach((h) => { if (h.note && h.note.trim()) map[h.id] = ++n; });
    return map;
  }

  function renderText() {
    const s = state.session;
    const box = $('#text');
    box.className = 'gospel ' + (s.numbered ? 'is-flow' : 'is-blocks');
    const pre = prefixes(s.verses);
    const nums = noteNumbers(s);
    const frag = document.createDocumentFragment();
    s.verses.forEach((v, i) => {
      if (s.numbered && v.gap) frag.append(el('span', { class: 'gap', 'aria-hidden': 'true' }, ' […] '));
      const wrap = el(s.numbered ? 'span' : 'p', { class: 'verse', dataset: { vi: i } });
      if (s.numbered) wrap.append(el('sup', { class: 'vn', 'aria-hidden': 'true' }, v.n));
      const vt = el('span', { class: 'vt', dataset: { vi: i } });
      for (const sg of segmentsFor(v.t, pre[i], s.hls)) {
        if (!sg.h) { vt.append(sg.text); continue; }
        const m = el('mark', { class: `hl hl-${sg.h.c}`, dataset: { id: sg.h.id } }, sg.text);
        if (sg.h.id === state.activeId) m.classList.add('active');
        if (sg.last && nums[sg.h.id]) { m.classList.add('note-end'); m.dataset.n = nums[sg.h.id]; }
        vt.append(m);
      }
      wrap.append(vt);
      frag.append(wrap);
      if (s.numbered) frag.append(' ');
    });
    box.replaceChildren(frag);
  }
  const renderTextSoon = debounce(() => renderText(), 250);

  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  function renderFootnotes() {
    const s = state.session;
    const hs = [...s.hls].sort((a, b) => a.s - b.s);
    $('#footnotes').hidden = hs.length === 0;
    $('#fnList').replaceChildren(...hs.map((h, i) => {
      const ta = el('textarea', { class: 'fn-note', rows: 1, placeholder: 'escribe una nota…', 'aria-label': `Nota para «${hlText(s, h)}»` });
      ta.value = h.note || '';
      ta.addEventListener('input', () => { h.note = ta.value; autoGrow(ta); persist(); renderTextSoon(); });
      requestAnimationFrame(() => autoGrow(ta));
      return el('li', { class: 'fn' },
        el('span', { class: 'fn-n' }, String(i + 1)),
        el('div', {}, el('span', { class: 'fn-q' }, el('i', { style: `background:${MARKER[h.c]}` }), `«${hlText(s, h)}»`), ta),
        el('button', { class: 'fn-del', title: 'Quitar subrayado', 'aria-label': 'Quitar subrayado', onclick: () => removeHighlight(h.id) }, icon('i-x')));
    }));
  }

  function renderSaint() {
    const s = state.session;
    $('#saintText').textContent = `«${s.saint[0]}»`;
    $('#saintAuthor').textContent = s.saint[1];
    $('#saintSource').textContent = s.saint[2] ? `, ${s.saint[2]}` : '';
  }
  function renderComment() {
    const s = state.session; const c = s.comment;
    $('#commentBox').hidden = !c;
    if (!c) return;
    $('#commentTitle').textContent = c.title || 'Comentario del día';
    $('#commentAuthor').textContent = [c.author, c.source].filter(Boolean).join(' · ');
    const box = $('#commentText'); box.classList.remove('open');
    box.replaceChildren(...c.text.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => el('p', {}, p)));
    $('#btnCommentMore').textContent = 'Leer completo';
    const sd = s.saintsOfDay || [];
    $('#saintsDay').hidden = !sd.length;
    $('#saintsDay').textContent = sd.length ? `Santos del día: ${sd.slice(0, 6).join(' · ')}` : '';
  }

  /* ---------- Editor libre (mis notas) ---------- */
  const editor = $('#editor');
  function cleanHtml(html) {
    const d = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    d.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((n) => n.remove());
    d.querySelectorAll('*').forEach((n) => [...n.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || (a.name === 'href' && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    }));
    return d.body.firstChild.innerHTML;
  }
  function renderEditor() { editor.innerHTML = cleanHtml(state.session.doc); }
  function saveEditor() {
    let html = editor.innerHTML;
    if (!docText(html) && !/<(li|blockquote|h3)/i.test(html)) { html = ''; if (editor.innerHTML) editor.innerHTML = ''; }
    state.session.doc = html;
    persist();
  }
  function caretToEnd() {
    editor.focus();
    const r = document.createRange(); r.selectNodeContents(editor); r.collapse(false);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  function selectionInEditor() {
    const sel = window.getSelection();
    return sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer);
  }
  function appendToEditor(html) {
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    if (editor.lastChild && editor.lastChild.nodeName === 'P' && !editor.lastChild.textContent.trim()) editor.lastChild.remove();
    editor.append(...tmp.childNodes);
    const p = document.createElement('p'); p.append(document.createElement('br')); editor.append(p);
    editor.focus();
    const r = document.createRange(); r.setStart(p, 0); r.collapse(true);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    saveEditor();
  }
  function currentBlock() {
    const sel = window.getSelection(); if (!sel.rangeCount) return null;
    let n = sel.getRangeAt(0).startContainer;
    while (n && n !== editor) { if (n.nodeType === 1 && /^(H3|BLOCKQUOTE|P|DIV|LI)$/.test(n.nodeName)) return n; n = n.parentNode; }
    return null;
  }
  function fmt(cmd) {
    if (!selectionInEditor()) caretToEnd();
    try { document.execCommand('styleWithCSS', false, false); } catch { /* */ }
    if (cmd === 'heading' || cmd === 'quote') {
      const tag = cmd === 'heading' ? 'H3' : 'BLOCKQUOTE';
      const b = currentBlock();
      document.execCommand('formatBlock', false, b && b.nodeName === tag ? 'P' : tag);
    } else if (cmd.startsWith('mark:')) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('hiliteColor', false, hexA(MARKER[cmd.slice(5)], 0.75));
      document.execCommand('styleWithCSS', false, false);
    } else document.execCommand(cmd, false, null);
    saveEditor();
  }
  function initEditor() {
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* */ }
    editor.addEventListener('input', saveEditor);
    editor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    $('#fmtMarks').replaceChildren(...COLORS.map((c) => el('button', {
      class: 'rb-mark', style: `background:${MARKER[c]}`, 'data-cmd': `mark:${c}`,
      title: `Resaltar en ${COLOR_NAMES[c]}`, 'aria-label': `Resaltar en ${COLOR_NAMES[c]}`,
    })));
    $('#fmtBar').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    $('#fmtBar').addEventListener('click', (e) => { const b = e.target.closest('button[data-cmd]'); if (b) fmt(b.dataset.cmd); });
  }

  /* ---------- Subrayado del Evangelio ---------- */
  function rangeToAbs(range) {
    const s = state.session; const pre = prefixes(s.verses); const vts = $$('#text .vt');
    let start = null, end = null;
    for (const vt of vts) {
      const r = document.createRange(); r.selectNodeContents(vt);
      const cmp = r.comparePoint(range.startContainer, range.startOffset);
      if (cmp <= 0) {
        const vi = +vt.dataset.vi;
        if (cmp < 0) start = pre[vi];
        else { const rr = document.createRange(); rr.setStart(vt, 0); rr.setEnd(range.startContainer, range.startOffset); start = pre[vi] + rr.toString().length; }
        break;
      }
    }
    for (let k = vts.length - 1; k >= 0; k--) {
      const vt = vts[k]; const r = document.createRange(); r.selectNodeContents(vt);
      const cmp = r.comparePoint(range.endContainer, range.endOffset);
      if (cmp >= 0) {
        const vi = +vt.dataset.vi;
        if (cmp > 0) end = pre[vi] + s.verses[vi].t.length;
        else { const rr = document.createRange(); rr.setStart(vt, 0); rr.setEnd(range.endContainer, range.endOffset); end = pre[vi] + rr.toString().length; }
        break;
      }
    }
    if (start == null || end == null || end <= start) return null;
    const ft = fullText(s);
    while (start < end && /\s/.test(ft[start])) start++;
    while (end > start && /\s/.test(ft[end - 1])) end--;
    return end > start ? { s: start, e: end } : null;
  }
  function carve(s, e) {
    const out = []; const orphan = [];
    for (const h of state.session.hls) {
      if (h.e <= s || h.s >= e) { out.push(h); continue; }
      const left = h.s < s ? { ...h, e: s } : null;
      const right = h.e > e ? { ...h, id: left ? uid() : h.id, s: e, note: left ? '' : h.note } : null;
      if (left) out.push(left);
      if (right) out.push(right);
      if (!left && !right && h.note && h.note.trim()) orphan.push(h.note);
    }
    state.session.hls = out;
    return orphan;
  }
  function addHighlight(s, e, c) {
    const orphan = carve(s, e);
    const h = { id: uid(), s, e, c, note: orphan.join(' / ') };
    state.session.hls.push(h);
    afterHlChange();
    return h;
  }
  function removeHighlight(id) {
    state.session.hls = state.session.hls.filter((h) => h.id !== id);
    if (state.activeId === id) state.activeId = null;
    hideToolbar(); hideNote(); afterHlChange();
  }
  function afterHlChange() { persist(); renderText(); renderFootnotes(); }

  const toolbar = $('#hlToolbar');
  function showToolbar(rect, mode) {
    toolbar.dataset.mode = mode;
    const active = mode === 'edit' ? state.session.hls.find((h) => h.id === state.activeId) : null;
    $$('.swatch', toolbar).forEach((b) => b.setAttribute('aria-pressed', String(active ? active.c === b.dataset.c : false)));
    toolbar.hidden = false;
    const half = toolbar.offsetWidth / 2 + 10;
    const x = clamp(rect.left + rect.width / 2, half, window.innerWidth - half);
    const below = rect.top < 130;
    toolbar.classList.toggle('below', below);
    toolbar.style.left = x + 'px';
    toolbar.style.top = (below ? rect.bottom + 10 : rect.top - 10) + 'px';
  }
  function hideToolbar() { toolbar.hidden = true; }
  function applyColor(c) {
    state.lastColor = c; store.set('evr.color', c);
    if (toolbar.dataset.mode === 'edit' && state.activeId) {
      const h = state.session.hls.find((x) => x.id === state.activeId);
      if (h) { h.c = c; afterHlChange(); }
      hideToolbar(); return;
    }
    if (!state.pending) return;
    addHighlight(state.pending.s, state.pending.e, c);
    state.pending = null; window.getSelection().removeAllRanges(); hideToolbar();
  }
  function currentHl() {
    if (toolbar.dataset.mode === 'edit') return state.session.hls.find((x) => x.id === state.activeId);
    if (state.pending) { const h = addHighlight(state.pending.s, state.pending.e, state.lastColor); state.pending = null; window.getSelection().removeAllRanges(); return h; }
    return null;
  }
  function verseRef(pos) {
    const s = state.session;
    if (!s.numbered || s.custom || !s.book) return s.refLong;
    const v = s.verses[verseOf(pos, prefixes(s.verses))];
    return v.n.includes(',') ? `${s.book} ${v.n}` : `${s.book} ${s.chapter}, ${v.n}`;
  }
  function onCopyToNotes() {
    const h = currentHl(); if (!h) return;
    hideToolbar();
    appendToEditor(`<blockquote>«${escapeHtml(hlText(state.session, h))}» <span>(${escapeHtml(verseRef(h.s))})</span></blockquote>`);
  }
  function onErase() {
    if (toolbar.dataset.mode === 'edit' && state.activeId) { removeHighlight(state.activeId); return; }
    if (state.pending) { carve(state.pending.s, state.pending.e); state.pending = null; window.getSelection().removeAllRanges(); hideToolbar(); afterHlChange(); }
  }

  const notePop = $('#notePop');
  function openNote(id) {
    const s = state.session; const h = s.hls.find((x) => x.id === id); if (!h) return;
    state.activeId = id; renderText();
    const mark = $(`#text mark[data-id="${id}"]`);
    const rect = mark ? mark.getBoundingClientRect() : { left: window.innerWidth / 2, top: 200, bottom: 200, width: 0 };
    $('#noteQuote').textContent = `«${hlText(s, h)}»`;
    const ta = $('#noteInput'); ta.value = h.note || '';
    notePop.hidden = false;
    const w = notePop.offsetWidth, hgt = notePop.offsetHeight;
    notePop.style.left = clamp(rect.left + rect.width / 2 - w / 2, 16, window.innerWidth - w - 16) + 'px';
    let top = rect.bottom + 10; if (top + hgt > window.innerHeight - 16) top = Math.max(16, rect.top - hgt - 10);
    notePop.style.top = top + 'px';
    notePop.dataset.id = id;
    ta.focus();
  }
  function hideNote() {
    if (notePop.hidden) return;
    notePop.hidden = true; state.activeId = null;
    renderText(); renderFootnotes();
  }

  function initHighlighting() {
    $('#swatches').replaceChildren(...COLORS.map((c) => el('button', {
      class: `swatch s-${c}`, dataset: { c }, title: `Marcar en ${COLOR_NAMES[c]}`, 'aria-label': `Marcar en ${COLOR_NAMES[c]}`,
      onmousedown: (e) => e.preventDefault(), onclick: () => applyColor(c),
    })));
    const text = $('#text');
    const onSelect = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) return;
      const r = sel.getRangeAt(0);
      if (!text.contains(r.commonAncestorContainer)) return;
      const pos = rangeToAbs(r); if (!pos) return;
      state.pending = pos; state.activeId = null;
      showToolbar(r.getClientRects()[0] || r.getBoundingClientRect(), 'new');
    };
    text.addEventListener('mouseup', () => setTimeout(onSelect, 0));
    text.addEventListener('keyup', (e) => { if (e.shiftKey) onSelect(); });
    document.addEventListener('selectionchange', debounce(() => {
      const sel = window.getSelection();
      if (sel.rangeCount && !sel.isCollapsed && text.contains(sel.getRangeAt(0).commonAncestorContainer)) onSelect();
    }, 350));
    text.addEventListener('click', (e) => {
      const sel = window.getSelection(); if (sel && !sel.isCollapsed) return;
      const m = e.target.closest('mark.hl'); if (!m) return;
      state.activeId = m.dataset.id; state.pending = null;
      $$('#text mark.active').forEach((x) => x.classList.remove('active'));
      $$(`#text mark[data-id="${m.dataset.id}"]`).forEach((x) => x.classList.add('active'));
      showToolbar(m.getBoundingClientRect(), 'edit');
    });
    toolbar.addEventListener('mousedown', (e) => e.preventDefault());
    $('#tbNote').addEventListener('click', () => { const h = currentHl(); if (h) { hideToolbar(); openNote(h.id); } });
    $('#tbCopy').addEventListener('click', onCopyToNotes);
    $('#tbErase').addEventListener('click', onErase);
    $('#noteInput').addEventListener('input', (e) => {
      const h = state.session.hls.find((x) => x.id === notePop.dataset.id);
      if (h) { h.note = e.target.value; persist(); }
    });
    $('#noteDone').addEventListener('click', hideNote);
    document.addEventListener('mousedown', (e) => {
      if (!toolbar.hidden && !toolbar.contains(e.target) && !e.target.closest('mark.hl')) {
        hideToolbar();
        if (state.activeId && notePop.hidden) { state.activeId = null; $$('#text mark.active').forEach((x) => x.classList.remove('active')); }
      }
      if (!notePop.hidden && !notePop.contains(e.target)) hideNote();
    });
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      if (!toolbar.hidden && Math.abs(window.scrollY - lastY) > 60) hideToolbar();
      if (toolbar.hidden) lastY = window.scrollY;
    }, { passive: true });
  }

  /* ---------- Texto propio (p. ej. Biblia de Jerusalén) ---------- */
  function parseCustom(text) {
    text = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
    const re = /(?:^|\s)(\d{1,3})\s+(?=[^\d\s])/g;
    const marks = []; let m;
    while ((m = re.exec(text))) marks.push({ n: m[1], at: m.index + m[0].length, start: m.index });
    if (marks.length >= 2) {
      const verses = marks.map((mk, i) => ({ n: mk.n, t: text.slice(mk.at, i + 1 < marks.length ? marks[i + 1].start : undefined).replace(/\s+/g, ' ').trim() })).filter((v) => v.t);
      const intro = text.slice(0, marks[0].start).trim();
      if (intro) verses[0].t = intro + ' ' + verses[0].t;
      return { verses, numbered: true };
    }
    return { verses: text.split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t, i) => ({ n: String(i + 1), t })), numbered: false };
  }
  function initPaste() {
    const dlg = $('#pasteDlg');
    $('#btnPaste').addEventListener('click', () => {
      const s = state.session;
      $('#pasteRef').textContent = s.refLong;
      $('#pasteText').value = s.custom ? s.verses.map((v) => (s.numbered ? `${v.n} ${v.t}` : v.t)).join(s.numbered ? ' ' : '\n') : '';
      $('#pasteName').value = s.custom ? s.translation : 'Biblia de Jerusalén';
      $('#pasteReset').hidden = !s.custom;
      dlg.showModal();
    });
    $('#pasteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const s = state.session; const text = $('#pasteText').value;
      if (!text.trim()) { toast('Pega el texto del Evangelio.'); return; }
      if (s.hls.length && !(await askConfirm('Al cambiar el texto se quitarán tus subrayados.', 'Usar este texto'))) return;
      const p = parseCustom(text);
      if (!s.custom) s.custom = { verses: s.verses, numbered: s.numbered, translation: s.translation, trans: s.trans };
      s.verses = p.verses; s.numbered = p.numbered; s.hls = [];
      s.translation = $('#pasteName').value.trim() || 'Mi Biblia';
      dlg.close(); render(); persist();
    });
    $('#pasteReset').addEventListener('click', async () => {
      const s = state.session; if (!s.custom) return;
      if (s.hls.length && !(await askConfirm('Se quitarán tus subrayados.', 'Volver al original'))) return;
      Object.assign(s, { verses: s.custom.verses, numbered: s.custom.numbered, translation: s.custom.translation, trans: s.custom.trans || 'bll', custom: null, hls: [] });
      dlg.close(); render(); persist();
    });
  }

  /* ---------- Guía de Lectio y música (paneles) ---------- */
  const fmtTime = (sec) => `${Math.floor(sec / 60)}:${pad2(sec % 60)}`;
  function guideInsert(g) {
    closeDrawers();
    appendToEditor(`<h3>${g.latin} <em>— ${escapeHtml(g.q)}</em></h3>`);
  }
  function renderGuide() {
    $('#guideList').replaceChildren(...GUIDE.map((g) => {
      const actions = el('div', { class: 'g-actions' },
        el('button', { class: 'textlink', type: 'button', onclick: () => guideInsert(g) }, 'Escribir sobre esto en mis notas'));
      if (g.timer) actions.append(timerEl());
      return el('li', {},
        el('div', { class: 'g-top' }, el('span', { class: 'g-num' }, g.n), el('h3', { class: 'g-name' }, g.name), el('span', { class: 'g-latin' }, g.latin)),
        el('p', { class: 'g-q' }, g.q),
        el('ul', { class: 'g-tips' }, ...g.tips.map((t) => el('li', {}, t))),
        g.prayer ? el('p', { class: 'g-prayer' }, g.prayer) : null,
        actions);
    }));
  }
  function timerEl() {
    const t = state.timer;
    const time = el('span', { class: 't', id: 'timerTime' }, fmtTime(t.left));
    const play = el('button', { type: 'button', id: 'timerPlay', 'aria-label': 'Iniciar silencio', onclick: toggleTimer }, icon(t.running ? 'i-pause' : 'i-play'));
    const presets = [3, 5, 10].map((m) => el('button', {
      type: 'button', 'aria-pressed': String(t.total === m * 60), title: `${m} minutos`,
      onclick: (e) => { stopTimer(); t.total = t.left = m * 60; $('#timerTime').textContent = fmtTime(t.left); $$('.timer [aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); },
    }, `${m}′`));
    return el('span', { class: 'timer' }, play, time, ...presets);
  }
  function toggleTimer() {
    const t = state.timer;
    if (t.running) { stopTimer(); return; }
    if (t.left <= 0) t.left = t.total;
    t.running = true; bell(0.25);
    t.handle = setInterval(() => {
      t.left--;
      const tt = $('#timerTime'); if (tt) tt.textContent = fmtTime(Math.max(0, t.left));
      if (t.left <= 0) { stopTimer(); t.left = t.total; bell(0.6); toast('Tiempo de silencio cumplido.'); const tt2 = $('#timerTime'); if (tt2) tt2.textContent = fmtTime(t.left); }
    }, 1000);
    updateTimerBtn();
  }
  function stopTimer() { const t = state.timer; clearInterval(t.handle); t.running = false; updateTimerBtn(); }
  function updateTimerBtn() { const b = $('#timerPlay'); if (b) b.replaceChildren(icon(state.timer.running ? 'i-pause' : 'i-play')); }
  let audioCtx;
  function bell(vol = 0.5) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [[220, 1], [440, .5], [660, .28], [1050, .16], [1480, .08]].forEach(([f, g]) => {
        const o = audioCtx.createOscillator(); const gn = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        gn.gain.setValueAtTime(0.0001, now);
        gn.gain.exponentialRampToValueAtTime(vol * g * 0.4, now + 0.02);
        gn.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
        o.connect(gn).connect(audioCtx.destination); o.start(now); o.stop(now + 5.6);
      });
    } catch { /* sin audio */ }
  }

  const music = $('#music'), guide = $('#guide'), scrim = $('#scrim');
  function openDrawer(which) {
    closeDrawers(true);
    if (which === 'guide') { guide.hidden = false; $('#btnGuide').setAttribute('aria-expanded', 'true'); }
    else {
      music.classList.remove('is-hidden'); $('#btnMusic').setAttribute('aria-expanded', 'true');
      if (!IN_ARTIFACT && !$('#musicFrame iframe')) setMusic(store.get('evr.music', PLAYLISTS[0].url));
    }
    scrim.hidden = false;
  }
  function closeDrawers(silent) {
    guide.hidden = true; music.classList.add('is-hidden'); scrim.hidden = true;
    $('#btnGuide').setAttribute('aria-expanded', 'false'); $('#btnMusic').setAttribute('aria-expanded', 'false');
    void silent;
  }
  function embedUrl(url) {
    try {
      const u = new URL(url.trim());
      if (/spotify\.com$/.test(u.hostname)) {
        const m = u.pathname.match(/(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/);
        if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
      }
      if (/youtu\.?be/.test(u.hostname)) {
        const list = u.searchParams.get('list');
        const v = u.searchParams.get('v') || (u.hostname === 'youtu.be' ? u.pathname.slice(1) : null);
        if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`;
        if (v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
      }
    } catch { /* URL inválida */ }
    return null;
  }
  function setMusic(url) {
    const src = embedUrl(url);
    if (!src) { toast('Ese enlace no parece de Spotify o YouTube.'); return false; }
    store.set('evr.music', url);
    $('#musicFrame').replaceChildren(el('iframe', { src, title: 'Reproductor de música', loading: 'lazy', allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' }));
    $$('#musicList button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.url === url)));
    $('#btnMusic .dot').hidden = false;
    return true;
  }
  function initDrawers() {
    music.hidden = false; music.classList.add('is-hidden');
    renderGuide();
    if (IN_ARTIFACT) {
      $('#musicList').replaceChildren(...PLAYLISTS.map((p) => el('a', { class: 'music-link', href: p.url, target: '_blank', rel: 'noopener' }, p.name, ' ↗')));
      $('#musicForm').hidden = true;
      $('#musicNote').textContent = 'Se abre en Spotify. Deja la música sonando y vuelve aquí para orar.';
    } else {
      $('#musicList').replaceChildren(...PLAYLISTS.map((p) => el('button', { type: 'button', dataset: { url: p.url }, onclick: () => setMusic(p.url) }, p.name)));
    }
    $('#btnGuide').addEventListener('click', () => (guide.hidden ? openDrawer('guide') : closeDrawers()));
    $('#btnGuide2').addEventListener('click', () => openDrawer('guide'));
    $('#btnMusic').addEventListener('click', () => (music.classList.contains('is-hidden') ? openDrawer('music') : closeDrawers()));
    $$('[data-close-drawer]').forEach((b) => b.addEventListener('click', () => closeDrawers()));
    scrim.addEventListener('click', () => closeDrawers());
    $('#musicForm').addEventListener('submit', (e) => { e.preventDefault(); if (setMusic($('#musicUrl').value)) $('#musicUrl').value = ''; });
  }

  /* ---------- Diario ---------- */
  function openJournal() {
    const items = Object.values(loadSessions()).map(migrate).sort((a, b) => b.updated - a.updated);
    $('#journalEmpty').hidden = items.length > 0;
    $('#journalList').replaceChildren(...items.map((s) => {
      const bits = [new Date(s.updated).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }), `${s.hls.length} subrayado${s.hls.length === 1 ? '' : 's'}`];
      const t = docText(s.doc); if (t) bits.push(`«${t.slice(0, 60)}${t.length > 60 ? '…' : ''}»`);
      return el('li', { class: 'journal-item' + (state.session && s.id === state.session.id ? ' current' : '') },
        el('button', { class: 'journal-open', onclick: () => { setSession(s); $('#journal').close(); } },
          el('strong', {}, s.title === s.refLong ? s.title : `${s.title} · ${s.refLong}`), el('span', {}, bits.filter(Boolean).join(' · '))),
        el('button', {
          class: 'icon-btn', title: 'Borrar del diario', 'aria-label': 'Borrar del diario',
          onclick: async () => {
            if (!(await askConfirm('¿Borrar esta lectio de tu diario? No se puede deshacer.', 'Borrar'))) return;
            const a = loadSessions(); delete a[s.id]; store.set('evr.sessions', a); openJournal();
          },
        }, icon('i-x')));
    }));
    if (!$('#journal').open) $('#journal').showModal();
  }

  /* =========================================================
     Imágenes descargables
     ========================================================= */
  const PAPER = {
    papel: { bg: '#FBF8F2', ink: '#2C2825', muted: '#8A7F74', accent: '#7A5C4B', alpha: 0.72 },
    pergamino: { bg: '#F1E8D8', ink: '#2E2720', muted: '#86745E', accent: '#7A5C4B', alpha: 0.68, grain: true },
  };
  const exportOpts = Object.assign({ kind: 'study', size: 'full', theme: 'papel', font: 'hand', name: '', notes: true, refl: true, nums: true, estyle: 'clara', esize: 'story' }, store.get('evr.export3', {}));
  const exportTmp = { phrase: null, custom: '', art: null, upload: null };
  const saveExportOpts = () => store.set('evr.export3', exportOpts);
  const SEGS = { exSize: 'size', exTheme: 'theme', exFont: 'font', exEStyle: 'estyle', exESize: 'esize' };

  function syncExportUi() {
    for (const [id, key] of Object.entries(SEGS)) $$(`#${id} button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === exportOpts[key])));
    $$('#exKind button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v === exportOpts.kind)));
    $$('.ex-group').forEach((g) => { g.hidden = g.dataset.kind !== exportOpts.kind; });
    $('#exNameWrap').hidden = exportOpts.kind === 'md';
    $('.export-preview').hidden = exportOpts.kind === 'md';
    $('#exHelp').textContent = {
      study: 'El Evangelio con tus colores, tus notas al margen unidas con flechas y lo que escribiste. «Página completa» se alarga para que quepa todo.',
      estampa: 'Una frase sobre una pintura, como una estampita, para guardar o compartir.',
      md: '',
    }[exportOpts.kind];
    $('#exShare').hidden = IN_ARTIFACT || exportOpts.kind === 'md' || !(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
  }
  function phraseOptions() {
    const s = state.session; const opts = [];
    [...s.hls].sort((a, b) => a.s - b.s).forEach((h) => { const t = hlText(s, h); opts.push({ v: 'hl:' + h.id, label: `«${t.length > 60 ? t.slice(0, 58) + '…' : t}»` }); });
    opts.push({ v: 'saint', label: `${s.saint[1]}: «${s.saint[0].length > 48 ? s.saint[0].slice(0, 46) + '…' : s.saint[0]}»` });
    opts.push({ v: 'custom', label: 'Escribir mi propia frase…' });
    return opts;
  }
  function currentPhrase() {
    const s = state.session; const v = exportTmp.phrase;
    if (v && v.startsWith('hl:')) { const h = s.hls.find((x) => x.id === v.slice(3)); if (h) return { text: hlText(s, h), by: verseRef(h.s), quote: true }; }
    if (v === 'custom') return { text: exportTmp.custom.trim() || 'Escribe tu frase', by: s.refLong, quote: false };
    return { text: s.saint[0], by: s.saint[1], quote: true };
  }
  function openExport() {
    const s = state.session;
    const opt = (v, i) => el('option', { value: i }, s.numbered ? `Versículo ${v.n}` : `Párrafo ${i + 1}`);
    $('#exFrom').replaceChildren(...s.verses.map(opt)); $('#exTo').replaceChildren(...s.verses.map(opt));
    $('#exFrom').value = 0; $('#exTo').value = s.verses.length - 1;
    $('#exName').value = exportOpts.name;
    $('#exNotes').checked = exportOpts.notes; $('#exRefl').checked = exportOpts.refl; $('#exNums').checked = exportOpts.nums;
    $('#exNums').closest('label').hidden = !s.numbered;
    const po = phraseOptions();
    $('#exPhrase').replaceChildren(...po.map((o) => el('option', { value: o.v }, o.label)));
    exportTmp.phrase = po[0].v; $('#exPhrase').value = exportTmp.phrase;
    $('#exCustomWrap').hidden = exportTmp.phrase !== 'custom';
    exportTmp.art = s.art; exportTmp.upload = null;
    renderArtGrid(); syncExportUi();
    $('#exportDlg').showModal();
    redrawCard();
  }
  function renderArtGrid() {
    const sel = exportTmp.upload ? 'upload' : exportTmp.art;
    const list = [...ART].sort((a, b) => (b.id === state.session.art) - (a.id === state.session.art));
    $('#exArt').replaceChildren(...list.map((a) => el('button', {
      type: 'button', title: artCredit(a), 'aria-label': artCredit(a), 'aria-pressed': String(sel === a.id),
      onclick: () => { exportTmp.art = a.id; exportTmp.upload = null; renderArtGrid(); redrawCard(); },
    }, el('img', { src: artSrc(a), alt: '', loading: 'lazy' }))));
  }
  const redrawCard = debounce(async () => { if (exportOpts.kind === 'md') return; try { await drawCard($('#cardCanvas')); } catch (e) { console.warn(e); } }, 60);

  async function fontsReady() {
    if (!document.fonts) return;
    try {
      await Promise.all(['600 40px "Caveat"', '700 40px "Caveat"', '400 40px "Kalam"', '600 40px "Cormorant Garamond"',
        'italic 500 40px "Cormorant Garamond"', '400 20px "EB Garamond"', '500 20px "EB Garamond"', 'italic 400 20px "EB Garamond"'].map((f) => document.fonts.load(f)));
    } catch { /* respaldo */ }
  }
  const imgCache = {};
  function loadImage(src) {
    if (!imgCache[src]) imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    return imgCache[src];
  }
  function wrapLines(ctx, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean); const lines = []; let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width <= maxW || !line) line = test; else { lines.push(line); line = w; } }
    if (line) lines.push(line);
    return lines;
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const setSpacing = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };
  function grain(ctx, W, H, color, n) {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(${color},${rnd() * 0.07})`; ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5); }
  }
  function crossMark(ctx, x, y, size, color) {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, size * 0.1); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x, y - size / 2); ctx.lineTo(x, y + size / 2);
    ctx.moveTo(x - size * 0.3, y - size * 0.15); ctx.lineTo(x + size * 0.3, y - size * 0.15); ctx.stroke();
  }
  function ornament(ctx, cx, y, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx - 22, y); ctx.moveTo(cx + 22, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
    crossMark(ctx, cx, y, 24, color);
  }

  // Bloques de "mis notas" para la imagen y el .md
  function docBlocks(html) {
    const d = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    const out = [];
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push({ type: 'p', text: t }); continue; }
        if (n.nodeType !== 1) continue;
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        if (/^H[1-6]$/.test(n.nodeName)) { if (t) out.push({ type: 'h', text: t }); }
        else if (n.nodeName === 'BLOCKQUOTE') { if (t) out.push({ type: 'q', text: t }); }
        else if (n.nodeName === 'UL' || n.nodeName === 'OL') { n.querySelectorAll(':scope > li').forEach((li) => { const lt = li.textContent.replace(/\s+/g, ' ').trim(); if (lt) out.push({ type: 'li', text: lt }); }); }
        else if (n.nodeName === 'P' || n.nodeName === 'DIV') { if ([...n.children].some((c) => /^(P|DIV|UL|OL|H3|BLOCKQUOTE)$/.test(c.nodeName))) walk(n); else if (t) out.push({ type: 'p', text: t }); }
        else if (t) out.push({ type: 'p', text: t });
      }
    };
    walk(d.body.firstChild);
    return out;
  }

  /* ----- Página de estudio ----- */
  function buildWords(s, a, b, nums) {
    const pre = prefixes(s.verses); const ft = fullText(s);
    const lo = pre[a], hi = pre[b] + s.verses[b].t.length;
    const hls = s.hls.filter((h) => h.e > lo && h.s < hi).map((h) => ({ ...h, s: Math.max(h.s, lo), e: Math.min(h.e, hi) }));
    const words = [];
    for (let i = a; i <= b; i++) {
      if (i > a && s.verses[i].gap) words.push({ num: '[…]', gap: true });
      if (nums) words.push({ num: s.verses[i].n });
      const base = pre[i]; const t = s.verses[i].t; const re = /\S+/g; let m;
      while ((m = re.exec(t))) {
        const ws = base + m.index, we = ws + m[0].length;
        const cuts = new Set([ws, we]);
        hls.forEach((h) => { if (h.s > ws && h.s < we) cuts.add(h.s); if (h.e > ws && h.e < we) cuts.add(h.e); });
        const pts = [...cuts].sort((x, y) => x - y); const pieces = [];
        for (let k = 0; k < pts.length - 1; k++) pieces.push({ text: ft.slice(pts[k], pts[k + 1]), h: hls.find((x) => x.s <= pts[k] && x.e > pts[k]) || null });
        words.push({ pieces });
      }
    }
    return { words, hls };
  }
  function layoutWords(ctx, words, fs, colW, font) {
    const f = font(fs); const nf = `600 ${Math.round(fs * 0.42)}px "EB Garamond", serif`;
    ctx.font = f; const sp = ctx.measureText(' ').width;
    const lines = [[]]; let x = 0;
    for (const w of words) {
      let width; const pieces = [];
      if (w.num) { ctx.font = w.gap ? f : nf; width = ctx.measureText(w.num).width + fs * 0.12; ctx.font = f; }
      else { width = 0; for (const p of w.pieces) { const pw = ctx.measureText(p.text).width; pieces.push({ ...p, dx: width, w: pw }); width += pw; } }
      if (x > 0 && x + sp + width > colW) { lines.push([]); x = 0; }
      const gx = x > 0 ? sp : 0;
      lines[lines.length - 1].push({ ...w, x: x + gx, width, pieces });
      x += gx + width;
    }
    return lines;
  }
  function textBlock(ctx, opts) {
    if (!opts.notes.length) return layoutBlock(ctx, opts, 'none');
    const one = layoutBlock(ctx, opts, 'one');
    return one.fits ? one : layoutBlock(ctx, opts, 'two');
  }
  function layoutBlock(ctx, { words, notes, fs, font, LH, W, P, th }, mode) {
    const M = mode === 'none' ? 0 : Math.round(W * 0.19);
    const G = mode === 'none' ? 0 : 40;
    const textX = P + M + G;
    const colW = mode === 'two' ? W - 2 * textX : W - textX - P;
    const lines = layoutWords(ctx, words, fs, colW, font);
    const lineH = fs * LH; const textH = lines.length * lineH;
    const baseline = (li) => li * lineH + fs * 1.05;
    const hlTop = (li) => baseline(li) - fs * 0.86;
    const hlBot = (li) => baseline(li) + fs * 0.26;
    const gapMid = (lineH - fs * 1.12) / 2;
    const runs = [];
    lines.forEach((line, li) => {
      let run = null;
      for (const item of line) {
        if (item.num) { run = null; continue; }
        item.pieces.forEach((p, k) => {
          const x0 = textX + item.x + p.dx, x1 = x0 + p.w;
          if (p.h && run && run.id === p.h.id && (k > 0 || run.endsWord)) run.x1 = x1;
          else if (p.h) { run = { id: p.h.id, c: p.h.c, li, x0, x1 }; runs.push(run); }
          else run = null;
          if (run) run.endsWord = k === item.pieces.length - 1;
        });
      }
    });
    const nfs = clamp(Math.round(fs * 0.74), 22, 40); const nlh = nfs * 1.04;
    ctx.font = `600 ${nfs}px Caveat, cursive`;
    const center = textX + colW / 2;
    const placed = notes.map((h) => {
      const r = runs.find((x) => x.id === h.id); if (!r) return null;
      const ls = wrapLines(ctx, h.note.trim().replace(/\s+/g, ' '), M);
      return { h, r, lines: ls, height: ls.length * nlh, side: mode === 'two' && (r.x0 + r.x1) / 2 >= center ? 'R' : 'L' };
    }).filter(Boolean);
    const colHeight = (side) => placed.filter((p) => p.side === side).reduce((acc, p) => acc + p.height + 16, 0);
    for (let guard = 0; mode === 'two' && guard < 30; guard++) {
      const l = colHeight('L'), r = colHeight('R');
      if (Math.max(l, r) <= textH) break;
      const over = l > r ? 'L' : 'R';
      const cand = placed.filter((p) => p.side === over).sort((x, y) => Math.abs((x.r.x0 + x.r.x1) / 2 - center) - Math.abs((y.r.x0 + y.r.x1) / 2 - center))[0];
      if (!cand || colHeight(over) - cand.height - 16 < colHeight(over === 'L' ? 'R' : 'L')) break;
      cand.side = over === 'L' ? 'R' : 'L';
    }
    const laneUse = {};
    placed.forEach((p) => {
      const key = `${p.side}${p.r.li}`; const n = laneUse[key] = (laneUse[key] || 0) + 1;
      p.below = n % 2 === 0;
      p.laneY = p.below ? hlBot(p.r.li) + gapMid : hlTop(p.r.li) - gapMid;
    });
    const height = Math.max(textH, colHeight('L'), colHeight('R'));
    for (const side of ['L', 'R']) {
      const col = placed.filter((p) => p.side === side).sort((x, y) => x.laneY - y.laneY);
      col.forEach((p, i) => { const desired = p.laneY - nlh * 0.55; const prev = i ? col[i - 1].y + col[i - 1].height + 16 : -gapMid; p.y = Math.max(desired, prev); });
      for (let i = col.length - 1; i >= 0; i--) { const limit = i === col.length - 1 ? height + gapMid : col[i + 1].y - 16; col[i].y = Math.min(col[i].y, limit - col[i].height); }
    }
    function draw(c, top) {
      for (const r of runs) {
        c.fillStyle = hexA(MARKER[r.c] || MARKER.honey, th.alpha); const pad = fs * 0.1;
        roundRect(c, r.x0 - pad, top + hlTop(r.li), r.x1 - r.x0 + pad * 2, hlBot(r.li) - hlTop(r.li), fs * 0.12); c.fill();
      }
      lines.forEach((line, li) => {
        const y = top + baseline(li);
        for (const item of line) {
          if (item.num) {
            c.textAlign = 'left';
            if (item.gap) { c.font = font(fs); c.fillStyle = th.muted; c.fillText(item.num, textX + item.x, y); }
            else { c.font = `600 ${Math.round(fs * 0.42)}px "EB Garamond", serif`; c.fillStyle = th.accent; c.fillText(item.num, textX + item.x, y - fs * 0.5); }
            continue;
          }
          c.font = font(fs); c.fillStyle = th.ink; c.textAlign = 'left';
          for (const p of item.pieces) c.fillText(p.text, textX + item.x + p.dx, y);
        }
      });
      for (const p of placed) {
        const color = NOTE_INK[p.r.c] || NOTE_INK.honey; const L = p.side === 'L';
        c.font = `600 ${nfs}px Caveat, cursive`; c.fillStyle = color; c.textAlign = L ? 'right' : 'left';
        const lx = L ? P + M : W - P - M;
        p.lines.forEach((ln, i) => c.fillText(ln, lx, top + p.y + nfs * 0.78 + i * nlh));
        const sx = L ? P + M + 8 : W - P - M - 8; const sy = top + p.y + nlh * 0.5;
        const edge = L ? textX - 6 : textX + colW + 6; const span = p.r.x1 - p.r.x0;
        const tx = L ? p.r.x0 + Math.min(fs * 0.5, span / 2) : p.r.x1 - Math.min(fs * 0.5, span / 2);
        const ty = top + (p.below ? hlBot(p.r.li) + 3 : hlTop(p.r.li) - 3); const ly = top + p.laneY;
        c.strokeStyle = color; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(sx, sy); const mid = (sx + edge) / 2;
        c.bezierCurveTo(mid, sy, mid, ly, edge, ly);
        const rad = Math.min(12, Math.abs(ty - ly) - 1, Math.abs(tx - edge));
        if (rad > 2) { const dir = L ? 1 : -1; const vdir = ty > ly ? 1 : -1; c.lineTo(tx - dir * rad, ly); c.quadraticCurveTo(tx, ly, tx, ly + vdir * rad); } else c.lineTo(tx, ly);
        c.lineTo(tx, ty); c.stroke();
        const vd = ty > ly ? 1 : -1; const ah = 8;
        c.fillStyle = color; c.beginPath(); c.moveTo(tx, ty + vd); c.lineTo(tx - ah * 0.7, ty - vd * ah); c.lineTo(tx + ah * 0.7, ty - vd * ah); c.closePath(); c.fill();
        c.beginPath(); c.arc(sx, sy, 3, 0, Math.PI * 2); c.fill();
      }
    }
    return { height, draw, fits: colHeight('L') <= textH + lineH };
  }

  function planStudy(ctx, o, a, b, fs, W, P) {
    const s = state.session; const th = PAPER[o.theme] || PAPER.papel;
    const base = o.font === 'hand' ? 40 : 42;
    const k = clamp(fs / base, 0.62, 1);
    const font = o.font === 'hand' ? (f) => `400 ${f}px Kalam, cursive` : (f) => `400 ${f}px "EB Garamond", Georgia, serif`;
    const LH = o.font === 'hand' ? 1.68 : 1.6;
    const ops = []; let y = P;
    const small = Math.round(20 * k);
    ops.push((c, y0) => {
      c.textAlign = 'left'; c.fillStyle = th.accent; setSpacing(c, `${Math.round(3 * k)}px`);
      c.font = `500 ${small}px "EB Garamond", serif`; c.fillText('LECTIO DIVINA', P, y0 + P + 14 * k);
      setSpacing(c, '0px'); c.textAlign = 'right'; c.fillStyle = th.muted;
      c.font = `italic 400 ${small}px "EB Garamond", serif`; c.fillText(new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }), W - P, y0 + P + 14 * k);
    });
    y += 64 * k;
    const tfs = Math.round(58 * k);
    ctx.font = `600 ${tfs}px "Cormorant Garamond", serif`;
    const tLines = wrapLines(ctx, s.title, W - 2 * P - 60);
    const titleTop = y; y += tLines.length * tfs * 1.06;
    const refLabel = s.numbered && !s.custom && s.book && !s.verses[a].n.includes(',') && !s.verses[b].n.includes(',') && !s.verses.slice(a + 1, b + 1).some((v) => v.gap)
      ? `${s.book} ${s.chapter}, ${a === b ? s.verses[a].n : `${s.verses[a].n}-${s.verses[b].n}`}` : s.refLong;
    const rfs = Math.round(30 * k);
    const refY = y + rfs * 1.05; y += rfs * 1.5;
    const ornY = y + 16 * k; y += 60 * k;
    ops.push((c, y0) => {
      c.textAlign = 'center'; c.fillStyle = th.ink; c.font = `600 ${tfs}px "Cormorant Garamond", serif`;
      tLines.forEach((ln, i) => c.fillText(ln, W / 2, y0 + titleTop + tfs * 0.9 + i * tfs * 1.06));
      c.fillStyle = th.muted; c.font = `italic 400 ${rfs}px "EB Garamond", serif`;
      c.fillText(`${refLabel}  ·  ${s.translation}`, W / 2, y0 + refY);
      ornament(c, W / 2, y0 + ornY, 260 * k, th.accent);
    });
    const { words, hls } = buildWords(s, a, b, o.nums && s.numbered);
    const notes = o.notes ? hls.filter((h) => h.note && h.note.trim()) : [];
    const tb = textBlock(ctx, { words, notes, fs, font, LH, W, P, th });
    const textTop = y; y += tb.height;
    ops.push((c, y0) => tb.draw(c, y0 + textTop));

    const blocks = o.refl ? docBlocks(s.doc) : [];
    if (blocks.length) {
      y += 40 * k; const rOrn = y; y += 44 * k;
      ops.push((c, y0) => ornament(c, W / 2, y0 + rOrn, 260 * k, th.accent));
      const bfs = Math.round(36 * k), hfs = Math.round(19 * k);
      for (const bl of blocks) {
        if (bl.type === 'h') {
          y += 12 * k; const hy = y + hfs; y += hfs + 12 * k;
          ops.push((c, y0) => { c.textAlign = 'left'; c.fillStyle = th.accent; setSpacing(c, `${Math.round(2 * k)}px`); c.font = `500 ${hfs}px "EB Garamond", serif`; c.fillText(bl.text.toUpperCase(), P, y0 + hy); setSpacing(c, '0px'); });
          continue;
        }
        const indent = bl.type === 'li' ? 34 * k : bl.type === 'q' ? 26 * k : 0;
        const ff = bl.type === 'q' ? `italic 400 ${Math.round(bfs * 0.86)}px "EB Garamond", serif` : `600 ${bfs}px Caveat, cursive`;
        const lh = (bl.type === 'q' ? bfs * 0.86 : bfs) * 1.12;
        ctx.font = ff;
        const ls = wrapLines(ctx, bl.text, W - 2 * P - indent);
        const top = y; y += ls.length * lh + 10 * k;
        ops.push((c, y0) => {
          c.textAlign = 'left'; c.fillStyle = bl.type === 'q' ? th.muted : th.ink; c.font = ff;
          ls.forEach((ln, i) => c.fillText(ln, P + indent, y0 + top + lh * 0.8 + i * lh));
          if (bl.type === 'li') { c.fillStyle = th.accent; c.beginPath(); c.arc(P + 12 * k, y0 + top + lh * 0.5, 4 * k, 0, Math.PI * 2); c.fill(); }
          if (bl.type === 'q') { c.fillStyle = hexA(th.accent, 0.5); c.fillRect(P + 4 * k, y0 + top + 6, 2, ls.length * lh - 6); }
        });
      }
    }
    y += 50 * k; const footY = y; y += 30 * k + P * 0.8;
    ops.push((c, y0) => {
      c.strokeStyle = hexA(th.muted, 0.35); c.lineWidth = 1;
      c.beginPath(); c.moveTo(P, y0 + footY - 30 * k); c.lineTo(W - P, y0 + footY - 30 * k); c.stroke();
      c.textAlign = 'left'; c.fillStyle = th.muted; c.font = `italic 400 ${Math.round(18 * k)}px "EB Garamond", serif`;
      c.fillText('Evangelio al azar · © Gonzalo Galindo Ramos', P, y0 + footY + 4);
      if (o.name.trim()) { c.textAlign = 'right'; c.fillStyle = th.ink; c.font = `600 ${Math.round(44 * k)}px Caveat, cursive`; c.fillText(o.name.trim(), W - P, y0 + footY + 10); }
    });
    return { height: y, draw: (c, y0) => ops.forEach((fn) => fn(c, y0)) };
  }
  async function drawStudy(cv) {
    const o = exportOpts;
    let a = +$('#exFrom').value, b = +$('#exTo').value;
    if (b < a) { b = a; $('#exTo').value = b; }
    const W = 1080, P = 84;
    const fixedH = o.size === 'post' ? 1350 : o.size === 'story' ? 1920 : null;
    const ctx = cv.getContext('2d');
    let fs = o.font === 'hand' ? 40 : 42; let plan = planStudy(ctx, o, a, b, fs, W, P);
    if (fixedH) while (plan.height > fixedH && fs > 14) { fs -= 2; plan = planStudy(ctx, o, a, b, fs, W, P); }
    const H = fixedH || Math.max(1350, Math.ceil(plan.height));
    cv.width = W; cv.height = H;
    const th = PAPER[o.theme] || PAPER.papel;
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    if (th.grain) {
      const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
      g.addColorStop(0, 'rgba(255,248,230,0)'); g.addColorStop(1, 'rgba(110,85,50,0.14)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, '110,85,50', Math.round(W * H / 500));
    }
    ctx.textBaseline = 'alphabetic';
    plan.draw(ctx, fixedH ? Math.max(0, (H - plan.height) / 2) : 0);
  }

  /* ----- Estampa ----- */
  function coverDraw(ctx, img, x, y, w, h) {
    const r = Math.max(w / img.width, h / img.height); const iw = img.width * r, ih = img.height * r;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2.6, iw, ih);
  }
  function fitText(ctx, text, maxW, maxH, fontFn, maxFs, minFs, lh) {
    for (let fs = maxFs; fs >= minFs; fs -= 2) {
      ctx.font = fontFn(fs); const lines = wrapLines(ctx, text, maxW);
      if (lines.length * fs * lh <= maxH && Math.max(...lines.map((l) => ctx.measureText(l).width)) <= maxW) return { fs, lines };
    }
    ctx.font = fontFn(minFs); return { fs: minFs, lines: wrapLines(ctx, text, maxW) };
  }
  async function drawEstampa(cv) {
    const o = exportOpts;
    const W = 1080, H = o.esize === 'post' ? 1350 : 1920;
    const ctx = cv.getContext('2d');
    const art = artById(exportTmp.art);
    const img = await loadImage(exportTmp.upload || artSrc(art));
    cv.width = W; cv.height = H;
    const credit = exportTmp.upload ? '' : artCredit(art);
    const ph = currentPhrase(); const text = ph.quote ? `«${ph.text}»` : ph.text;
    const serif = (w, st = '') => (fs) => `${st}${w} ${fs}px "Cormorant Garamond", Georgia, serif`;
    ctx.textBaseline = 'alphabetic';
    if (o.estyle === 'oscura') {
      ctx.fillStyle = '#1e1813'; ctx.fillRect(0, 0, W, H);
      coverDraw(ctx, img, 0, 0, W, H);
      ctx.fillStyle = 'rgba(28,20,14,.16)'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
      g.addColorStop(0, 'rgba(24,18,12,0)'); g.addColorStop(0.55, 'rgba(24,18,12,.7)'); g.addColorStop(1, 'rgba(24,18,12,.93)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, '255,240,210', Math.round(W * H / 700));
      const P = 90; const bottom = H - P - 110;
      const { fs, lines } = fitText(ctx, text, W - 2 * P, H * 0.36, serif(600), 118, 44, 1.1);
      ctx.font = serif(600)(fs); ctx.fillStyle = '#EFE0BE'; ctx.textAlign = 'left';
      const top = bottom - lines.length * fs * 1.1;
      lines.forEach((ln, i) => ctx.fillText(ln, P, top + fs * 0.9 + i * fs * 1.1));
      ctx.font = serif(500, 'italic ')(40); ctx.fillStyle = '#E2D4B8'; ctx.fillText(`— ${ph.by}`, P, bottom + 64);
      ctx.font = 'italic 400 19px "EB Garamond", serif'; ctx.fillStyle = 'rgba(240,228,205,.6)';
      if (credit) ctx.fillText(credit, P, H - 56);
      if (o.name.trim()) { ctx.textAlign = 'right'; ctx.font = '600 40px Caveat, cursive'; ctx.fillStyle = 'rgba(240,228,205,.85)'; ctx.fillText(o.name.trim(), W - P, H - 50); }
      return;
    }
    const bg = '#F8F3EA', ink = '#2C2825', accent = '#7A5C4B', gold = '#B09A6C';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, '110,85,50', Math.round(W * H / 600));
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.strokeRect(38, 38, W - 76, H - 76);
    ctx.lineWidth = 1; ctx.strokeRect(50, 50, W - 100, H - 100);
    const ax = 150, aw = W - 300, ay = 130, ah = o.esize === 'post' ? 700 : 1090, r = aw / 2;
    const archPath = (pad = 0) => { ctx.beginPath(); ctx.moveTo(ax - pad, ay + ah + pad); ctx.lineTo(ax - pad, ay + r); ctx.arc(ax + r, ay + r, r + pad, Math.PI, 0); ctx.lineTo(ax + aw + pad, ay + ah + pad); ctx.closePath(); };
    ctx.save(); ctx.shadowColor = 'rgba(70,52,36,.26)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; archPath(); ctx.fillStyle = '#3a3029'; ctx.fill(); ctx.restore();
    ctx.save(); archPath(); ctx.clip(); coverDraw(ctx, img, ax, ay, aw, ah); ctx.restore();
    archPath(); ctx.strokeStyle = '#FCF9F3'; ctx.lineWidth = 14; ctx.stroke();
    archPath(16); ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.stroke();
    const tTop = ay + ah + 74, tBottom = H - (credit ? 170 : 130) - (o.name.trim() ? 50 : 0);
    crossMark(ctx, W / 2, tTop, 30, accent);
    const box = tBottom - tTop - 50;
    const { fs, lines } = fitText(ctx, text, W - 260, box - 70, serif(600), 90, 34, 1.12);
    ctx.font = serif(600)(fs); ctx.fillStyle = ink; ctx.textAlign = 'center';
    const blockH = lines.length * fs * 1.12; const top = tTop + 36 + Math.max(0, (box - 70 - blockH) / 2);
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, top + fs * 0.9 + i * fs * 1.12));
    ctx.font = serif(500, 'italic ')(38); ctx.fillStyle = accent; ctx.fillText(`— ${ph.by}`, W / 2, top + blockH + 56);
    if (o.name.trim()) { ctx.font = '600 40px Caveat, cursive'; ctx.fillStyle = ink; ctx.fillText(o.name.trim(), W / 2, H - 138); }
    ctx.font = 'italic 400 18px "EB Garamond", serif'; ctx.fillStyle = '#8A7F74';
    if (credit) ctx.fillText(credit, W / 2, H - 88);
  }
  async function drawCard(cv) { await fontsReady(); if (exportOpts.kind === 'estampa') await drawEstampa(cv); else await drawStudy(cv); }

  function fileBase(kind) { return slug(`${kind}-${state.session.refLong}-${state.session.date || ''}`); }
  async function downloadBlob(blob, name) {
    if (IN_ARTIFACT) {
      const downloads = await window.claude.use('downloads');
      if (!downloads) throw new Error('unavailable');
      await downloads.save({ filename: name, data: blob });
      return;
    }
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function cardBlob() {
    const cv = $('#cardCanvas'); await drawCard(cv);
    return new Promise((res, rej) => { try { cv.toBlob((b) => (b ? res(b) : rej(new Error('vacío'))), 'image/png'); } catch (e) { rej(e); } });
  }
  function exportError(e) {
    console.warn(e);
    toast(location.protocol === 'file:' ? 'Para descargar imágenes abre la app con «Abrir Evangelio.bat».' : 'No se pudo guardar el archivo. Inténtalo de nuevo.', 5000);
  }
  function markdown() {
    const s = state.session;
    const lines = [`# ${s.title}`, '', `${s.refLong} (${s.translation})`, ''];
    lines.push(s.numbered ? s.verses.map((v) => `${v.gap ? '[…] ' : ''}**${v.n}** ${v.t}`).join(' ') : s.verses.map((v) => v.t).join('\n\n'), '');
    const hs = [...s.hls].sort((a, b) => a.s - b.s);
    if (hs.length) { lines.push('## Subrayados y notas al margen', ''); hs.forEach((h, i) => lines.push(`${i + 1}. «${hlText(s, h)}»${h.note && h.note.trim() ? ` — ${h.note.trim()}` : ''}`)); lines.push(''); }
    const blocks = docBlocks(s.doc);
    if (blocks.length) {
      lines.push('## Mis notas', '');
      blocks.forEach((b) => lines.push(b.type === 'h' ? `### ${b.text}` : b.type === 'li' ? `- ${b.text}` : b.type === 'q' ? `> ${b.text}` : b.text, ''));
    }
    lines.push('---', `> «${s.saint[0]}» — ${s.saint[1]}${s.saint[2] ? `, ${s.saint[2]}` : ''}`, '', '_Evangelio al azar · © Gonzalo Galindo Ramos_', '');
    return lines.join('\n');
  }

  function initExport() {
    $('#exKind').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; exportOpts.kind = b.dataset.v; saveExportOpts(); syncExportUi(); redrawCard(); });
    for (const [id, key] of Object.entries(SEGS)) {
      $(`#${id}`).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; exportOpts[key] = b.dataset.v; saveExportOpts(); syncExportUi(); redrawCard(); });
    }
    ['exFrom', 'exTo'].forEach((id) => $('#' + id).addEventListener('change', redrawCard));
    [['exNotes', 'notes'], ['exRefl', 'refl'], ['exNums', 'nums']].forEach(([id, key]) => $('#' + id).addEventListener('change', (e) => { exportOpts[key] = e.target.checked; saveExportOpts(); redrawCard(); }));
    $('#exName').addEventListener('input', (e) => { exportOpts.name = e.target.value; saveExportOpts(); redrawCard(); });
    $('#exPhrase').addEventListener('change', (e) => {
      exportTmp.phrase = e.target.value; $('#exCustomWrap').hidden = exportTmp.phrase !== 'custom';
      if (exportTmp.phrase === 'custom') $('#exCustom').focus();
      redrawCard();
    });
    $('#exCustom').addEventListener('input', (e) => { exportTmp.custom = e.target.value; redrawCard(); });
    $('#exUpload').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const rd = new FileReader(); rd.onload = () => { exportTmp.upload = rd.result; renderArtGrid(); redrawCard(); }; rd.readAsDataURL(f);
      e.target.value = '';
    });
    $('#exDownload').addEventListener('click', async () => {
      try {
        if (exportOpts.kind === 'md') await downloadBlob(new Blob([markdown()], { type: 'text/markdown' }), fileBase('lectio') + '.md');
        else await downloadBlob(await cardBlob(), fileBase(exportOpts.kind === 'estampa' ? 'estampa' : 'lectio') + '.png');
        toast(exportOpts.kind === 'md' ? 'Archivo guardado.' : 'Imagen guardada.');
      } catch (e) {
        if (e && e.code === 'declined') return;
        exportError(e);
      }
    });
    $('#exShare').addEventListener('click', async () => {
      try { const file = new File([await cardBlob()], fileBase('lectio') + '.png', { type: 'image/png' }); await navigator.share({ files: [file], title: state.session.refLong }); }
      catch (e) { if (e && e.name !== 'AbortError') exportError(e); }
    });
  }

  /* ---------- Arranque ---------- */
  function init() {
    $('#btnRandom').addEventListener('click', () => loadDate(randomDate()));
    $('#btnToday').addEventListener('click', () => loadDate(isoDate(new Date())));
    $('#datePick').addEventListener('change', (e) => { if (e.target.value && e.target.value >= '1970-01-01' && e.target.value <= '2100-12-31') loadDate(e.target.value); });
    $('#btnSaint').addEventListener('click', () => {
      const s = state.session; let q;
      do { q = pick(window.SAINT_QUOTES); } while (q[0] === s.saint[0] && window.SAINT_QUOTES.length > 1);
      s.saint = q; persist(); renderSaint();
    });
    $('#btnCommentMore').addEventListener('click', (e) => { const open = $('#commentText').classList.toggle('open'); e.currentTarget.textContent = open ? 'Mostrar menos' : 'Leer completo'; });
    $('#btnJournal').addEventListener('click', openJournal);
    $('#btnExport').addEventListener('click', openExport);
    $$('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    $$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { hideToolbar(); hideNote(); closeDrawers(); }
      const ae = document.activeElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.isContentEditable;
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'r' || e.key === 'R') && !document.querySelector('dialog[open]')) loadDate(randomDate());
    });
    window.addEventListener('beforeunload', saveNow);

    initEditor(); initHighlighting(); initDrawers(); initPaste(); initTranslation(); initExport();

    const cur = store.get('evr.current', null);
    if (cur && cur.v === 2 && cur.verses && cur.verses.length) { setSession(cur); fetchCommentary(cur); }
    else loadDate(randomDate());
  }
  init();
})();
