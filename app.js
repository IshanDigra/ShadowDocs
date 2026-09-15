/* TicketDeck - read-only viewer. Edit .md files in your IDE; the tab picks up changes. */
(() => {
'use strict';

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const el = (tag, cls, txt, ...kids) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    n.append(...kids);
    return n;
};
const esc = s => String(s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const slugify = s => String(s).toLowerCase().replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_-]+/g, '-').slice(0, 60) || 'section';
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function ago(ms) {
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60)      return 'just now';
    if (s < 3600)    return `${Math.floor(s / 60)}m ago`;
    if (s < 86400)   return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function toast(msg, tone = '') {
    const t = el('div', `toast ${tone}`.trim(), msg);
    if (tone) t.dataset.tone = tone;
    $('#toasts').append(t);
    setTimeout(() => t.remove(), 2200);
}

// ------------------------------------------------------------------ prefs / state
const LS_KEY = 'ticketdeck.v2';
const UI = Object.assign({ theme: 'auto', star: [], last: null, fold: {} },
    (() => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } })());
const persist = debounce(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(UI)); } catch {}
}, 200);

const S = { notes: [], byId: new Map(), activeId: null, doc: null, offline: false };

// ------------------------------------------------------------------ markdown -> sections
function fenceMask(lines) {
    const mask = new Array(lines.length).fill(false);
    let open = null;
    for (let i = 0; i < lines.length; i++) {
        const m = /^( {0,3})(`{3,}|~{3,})/.exec(lines[i]);
        if (open) { mask[i] = true; if (m && m[2][0] === open) open = null; }
        else if (m) { open = m[2][0]; mask[i] = true; }
    }
    return mask;
}

function splitFront(raw) {
    const text = String(raw || '').replace(/\r\n?/g, '\n');
    if (!text.startsWith('---\n')) return { meta: {}, body: text };
    const lines = text.split('\n');
    const end = lines.findIndex((l, i) => i > 0 && /^---\s*$/.test(l));
    if (end < 0) return { meta: {}, body: text };
    const meta = {};
    for (const line of lines.slice(1, end)) {
        const m = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
        if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return { meta, body: lines.slice(end + 1).join('\n') };
}

function buildDoc(body) {
    const lines = body.split('\n'), mask = fenceMask(lines);
    const heads = [];
    for (let i = 0; i < lines.length; i++) {
        if (mask[i]) continue;
        const m = /^##\s+(.+?)\s*#*\s*$/.exec(lines[i]);
        if (m) heads.push({ line: i, title: m[1].trim() });
    }
    const sections = [];
    const firstH = heads[0]?.line ?? lines.length;
    if (lines.slice(0, firstH).join('\n').trim())
        sections.push({ label: 'Overview', from: 0, to: firstH, intro: true });
    heads.forEach((h, i) => sections.push({
        label: h.title, from: h.line, to: heads[i + 1]?.line ?? lines.length
    }));
    const used = new Set();
    for (const s of sections) {
        let base = slugify(s.label), id = base, n = 2;
        while (used.has(id)) id = `${base}-${n++}`;
        used.add(id); s.slug = id;
        const raw = lines.slice(s.from, s.to);
        if (s.intro) {
            const h1 = raw.findIndex(l => /^#\s+\S/.test(l));
            if (h1 >= 0) raw.splice(h1, 1);
        } else raw[0] = '';
        s.md = raw.join('\n').trim();
    }
    return sections;
}

const firstH1 = body => (/^#\s+(.+?)\s*#*\s*$/m.exec(body) || [])[1]?.trim() || null;

const mdToHtml = src => {
    const renderer = new marked.Renderer();
    renderer.image = ({ href, title, text }) => {
        const url = (href && !href.startsWith('http') && !href.startsWith('data:') && !href.startsWith('/')) ? 'notes/' + href : href;
        return `<img src="${url}" alt="${text || ''}" title="${title || ''}">`;
    };
    return DOMPurify.sanitize(marked.parse(String(src || ''), { gfm: true, renderer }),
        { ADD_ATTR: ['target', 'rel', 'align', 'colspan', 'rowspan', 'start', 'checked', 'disabled'] });
};

// ------------------------------------------------------------------ mermaid
let mermaidPromise = null, mermaidSeq = 0;
async function mermaidInit() {
    const mermaid = await (mermaidPromise ??= window.__loadMermaid());
    const light = document.documentElement.dataset.theme === 'light';
    const p = light
        ? { ink: '#0f172a', dim: '#4b5563', accent: '#2f55d4', accentSoft: '#e7edff',
            surface: '#f2f4f8', border: '#d7dde6', bg: '#ffffff' }
        : { ink: '#e6ebf5', dim: '#a8b3c7', accent: '#7c9cff', accentSoft: '#1f2a44',
            surface: '#1c212a', border: '#2a3140', bg: '#161a21' };
    mermaid.initialize({
        startOnLoad: false, securityLevel: 'loose', suppressErrorRendering: true,
        theme: 'base', fontFamily: getComputedStyle(document.body).fontFamily, fontSize: 13,
        themeVariables: {
            background: p.bg, primaryColor: p.accentSoft, primaryTextColor: p.ink, primaryBorderColor: p.accent,
            lineColor: p.dim, textColor: p.ink, mainBkg: p.accentSoft, nodeBorder: p.accent,
            clusterBkg: p.surface, clusterBorder: p.border, edgeLabelBackground: p.bg,
            noteBkgColor: p.surface, noteBorderColor: p.border, noteTextColor: p.ink,
            actorBkg: p.accentSoft, actorBorder: p.accent, actorTextColor: p.ink,
            signalColor: p.dim, signalTextColor: p.ink,
        },
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis',
                     nodeSpacing: 26, rankSpacing: 32, padding: 6 },
        sequence:  { useMaxWidth: true, wrap: true, boxMargin: 6, messageMargin: 24, actorMargin: 40 },
    });
    return mermaid;
}

async function drawMermaid(box) {
    if (box.dataset.done) return;
    box.dataset.done = '1';
    try {
        const mermaid = await mermaidInit();
        const { svg } = await mermaid.render(`mmd-${++mermaidSeq}`, box.dataset.src);
        box.innerHTML = svg;
        box.classList.remove('pending');
    } catch (err) {
        box.className = 'mermaid-err';
        box.textContent = `Diagram error: ${err.message || err}`;
    }
}

const drawVisibleMermaid = () => $$('.mermaid-box').forEach(b => {
    if (!b.dataset.done && !b.closest('.sec[data-open=false]')) drawMermaid(b);
});

async function restyleMermaid() {
    if (!mermaidPromise) return;
    await mermaidInit();
    $$('.mermaid-box').forEach(b => { delete b.dataset.done; b.classList.add('pending'); b.textContent = 'rendering...'; });
    drawVisibleMermaid();
}

// ------------------------------------------------------------------ enhancement
function enhance(scope) {
    $$('pre > code.language-mermaid, pre > code.language-Mermaid', scope).forEach(code => {
        const box = el('div', 'mermaid-box pending', 'rendering...');
        box.dataset.src = code.textContent;
        code.parentElement.replaceWith(box);
    });
    $$('pre > code', scope).forEach(code => {
        const lang = ([...code.classList].find(c => c.startsWith('language-')) || '').slice(9);
        try {
            code.innerHTML = (lang && hljs.getLanguage(lang))
                ? hljs.highlight(code.textContent, { language: lang }).value
                : hljs.highlightAuto(code.textContent).value;
            code.classList.add('hljs');
        } catch {}
    });
    $$('a[href^="http"]', scope).forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
    $$('input[type=checkbox]', scope).forEach(b => {
        b.disabled = true;
        b.closest('li')?.classList.toggle('done', b.checked);
    });
}

// ------------------------------------------------------------------ note model
function hydrate(raw) {
    const { meta, body } = splitFront(raw.content);
    return Object.assign({}, raw, {
        body,
        title: (meta.title || firstH1(body) || raw.id).trim(),
        ticket: String(meta.ticket || raw.id).trim(),
    });
}

const active = () => S.byId.get(S.activeId) || null;
const sortNotes = list => list.sort((a, b) => {
    const sa = UI.star.includes(a.id) ? 0 : 1, sb = UI.star.includes(b.id) ? 0 : 1;
    return (sa - sb) || a.ticket.localeCompare(b.ticket, undefined, { numeric: true });
});

// ------------------------------------------------------------------ rendering
const renderAll = () => { renderRail(); renderHead(); renderDoc(); };

function renderRail() {
    const rail = $('#rail');
    rail.innerHTML = '';
    S.notes.forEach(n => {
        const b = el('button', 'tk');
        b.setAttribute('aria-selected', String(n.id === S.activeId));
        b.title = `${n.ticket} - ${n.title}`;
        if (UI.star.includes(n.id)) b.append(el('span', 'star', '★'));
        b.append(el('span', null, n.ticket));
        b.onclick = () => setActive(n.id);
        rail.append(b);
    });
    $('.tk[aria-selected=true]', rail)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

function renderHead() {
    const n = active();
    $('#nh-title').textContent = n ? n.title : 'No notes yet';
}

function renderChips() {
    const chips = $('#chips');
    chips.innerHTML = '';
    const secs = S.doc || [];
    chips.hidden = secs.length < 2;
    if (chips.hidden) return;
    secs.forEach(s => {
        const c = el('button', 'chip', s.label);
        c.onclick = () => gotoSection(s.slug);
        chips.append(c);
    });
}

const isOpen = (id, slug) => UI.fold[id]?.[slug] ?? true;
const setOpen = (id, slug, open) => { (UI.fold[id] ||= {})[slug] = open; persist(); };

function renderDoc() {
    const doc = $('#doc');
    doc.innerHTML = '';
    const note = active();
    if (!note) {
        doc.innerHTML = S.offline
            ? `<div class="empty"><strong>Server unreachable.</strong><br>Start it with <code>python server.py</code></div>`
            : `<div class="empty"><strong>No notes yet.</strong><br>Drop .md files in the notes folder.</div>`;
        S.doc = null; renderChips(); return;
    }
    S.doc = buildDoc(note.body);
    const inner = el('div', 'doc-inner');
    S.doc.forEach(sec => inner.append(sectionCard(note, sec)));
    if (!S.doc.length) inner.append(el('div', 'empty', 'This file is empty.'));
    doc.append(inner);
    enhance(inner);
    drawVisibleMermaid();
    renderChips();
}

function sectionCard(note, sec) {
    const open = isOpen(note.id, sec.slug);
    const wrap = el('section', 'sec');
    wrap.dataset.slug = sec.slug; wrap.dataset.open = String(open);
    wrap.id = `sec-${sec.slug}`;
    const head = el('button', 'sec-h', null,
        el('span', 'sec-fold', ''), el('span', 'sec-t', sec.label));
    head.setAttribute('aria-expanded', String(open));
    head.onclick = () => toggleSection(wrap);
    const md = el('div', 'md'); md.innerHTML = mdToHtml(sec.md);
    wrap.append(head, el('div', 'sec-b', null, md));
    return wrap;
}

function toggleSection(wrap, force) {
    const open = force ?? wrap.dataset.open !== 'true';
    wrap.dataset.open = String(open);
    $('.sec-h', wrap).setAttribute('aria-expanded', String(open));
    setOpen(S.activeId, wrap.dataset.slug, open);
    if (open) $$('.mermaid-box', wrap).forEach(b => { if (!b.dataset.done) drawMermaid(b); });
}

function foldAll() {
    const secs = $$('#doc .sec');
    if (!secs.length) return;
    const anyOpen = secs.some(s => s.dataset.open === 'true');
    secs.forEach(s => toggleSection(s, !anyOpen));
    if (!anyOpen) drawVisibleMermaid();
    $('#doc').scrollTo({ top: 0, behavior: 'smooth' });
}

function gotoSection(slug) {
    const sec = $(`#doc .sec[data-slug="${CSS.escape(slug)}"]`);
    if (!sec) return;
    if (sec.dataset.open !== 'true') toggleSection(sec, true);
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setActive(id) {
    S.activeId = id; UI.last = id; persist();
    renderAll();
}

// ------------------------------------------------------------------ sheets
function closeSheet() {
    const sheet = $('#sheet');
    sheet.hidden = true; sheet.classList.remove('full'); sheet.innerHTML = '';
    $('#scrim').hidden = true;
}

function openSheet(title, build, { full = false } = {}) {
    closeSheet();
    const sheet = $('#sheet');
    sheet.hidden = false;
    sheet.classList.toggle('full', full);
    $('#scrim').hidden = false;
    const head = el('div', 'sh-head', null,
        el('div', 'sh-title', title), el('span', 'grow'));
    const body = el('div', 'sh-body');
    const footerBtn = el('button', 'sh-footer-btn', 'Close');
    footerBtn.onclick = closeSheet;
    const footer = el('div', 'sh-footer', null, footerBtn);
    sheet.append(el('div', 'sh-grip'), head, body, footer);
    build(body, head);
}

// switcher
function sheetSwitcher() {
    openSheet('Tickets', body => {
        if (!S.notes.length) return body.append(el('div', 'empty', 'Nothing here yet.'));
        S.notes.forEach(n => {
            const starred = UI.star.includes(n.id);
            const star = el('button', 'row-act', starred ? '*' : '☆');
            star.title = starred ? 'Unstar' : 'Star';
            star.onclick = ev => {
                ev.stopPropagation();
                UI.star = starred ? UI.star.filter(x => x !== n.id) : [n.id, ...UI.star];
                persist();
                S.notes = sortNotes([...S.byId.values()]);
                renderRail();
                closeSheet(); sheetSwitcher();
            };
            const main = el('button', 'row-main', null,
                el('div', 'row-t', n.title),
                el('div', 'row-s', `${n.ticket} · ${ago(n.mtime)}`));
            main.onclick = () => { closeSheet(); setActive(n.id); };
            const r = el('div', 'row', null, main, star);
            r.setAttribute('aria-selected', String(n.id === S.activeId));
            body.append(r);
        });
    });
}

// outline
function sheetOutline() {
    if (!S.doc?.length) return toast('Nothing to outline');
    openSheet('Outline', body => {
        S.doc.forEach(sec => {
            const b = el('button', 'row', null,
                el('div', 'row-main', null, el('div', 'row-t', sec.label)));
            b.onclick = () => { closeSheet(); gotoSection(sec.slug); };
            body.append(b);
        });
    });
}

// search
function searchAll(query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const out = [];
    for (const note of S.notes) {
        const secs = buildDoc(note.body);
        const hay = `${note.title} ${note.ticket}`.toLowerCase();
        const titleHit = terms.every(t => hay.includes(t));
        const hits = [];
        for (const sec of secs) {
            const md = sec.md.toLowerCase();
            if (!terms.every(t => md.includes(t))) continue;
            const line = sec.md.split('\n').find(l => l.trim() && terms.every(t => l.toLowerCase().includes(t)));
            hits.push({ section: sec, text: (line || sec.label).replace(/^#{1,6}\s*/, '').slice(0, 240) });
            if (hits.length >= 6) break;
        }
        if (hits.length || titleHit) out.push({ note, hits, score: (titleHit ? 1000 : 0) + hits.length });
    }
    return out.sort((a, b) => b.score - a.score);
}

const highlight = (text, terms) => terms.filter(Boolean).reduce(
    (h, t) => h.replace(new RegExp(`(${reEsc(t)})`, 'gi'), '<mark>$1</mark>'), esc(text));

function sheetSearch() {
    openSheet('Search', (body, head) => {
        const input = el('input', 'sr-input');
        input.type = 'search'; input.placeholder = 'Search all tickets...';

        const clearBtn = el('button', 'sr-clear', '×');
        clearBtn.type = 'button';
        clearBtn.onclick = () => { input.value = ''; clearBtn.style.display = 'none'; input.focus(); run(); };
        clearBtn.style.display = 'none';

        const wrap = el('div', 'sr-wrap', null, input, clearBtn);
        $('.sh-title', head).replaceWith(wrap);
        const results = el('div');
        body.append(results);
        const run = () => {
            const q = input.value.trim();
            const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
            results.innerHTML = '';
            if (!q) return;
            const groups = searchAll(q);
            if (!groups.length) return results.append(el('div', 'empty', `No match for "${q}"`));
            for (const g of groups) {
                results.append(el('div', 'sr-group-h', `${g.note.ticket} · ${g.note.title}`));
                if (!g.hits.length) {
                    const b = el('button', 'sr-hit', null, el('div', 'sr-hit-h', 'Title match'));
                    b.onclick = () => { closeSheet(); setActive(g.note.id); };
                    results.append(b);
                }
                g.hits.forEach(hit => {
                    const x = el('div', 'sr-hit-x'); x.innerHTML = highlight(hit.text, terms);
                    const b = el('button', 'sr-hit', null, el('div', 'sr-hit-h', hit.section.label), x);
                    b.onclick = () => {
                        closeSheet();
                        const go = () => gotoSection(hit.section.slug);
                        if (g.note.id !== S.activeId) { setActive(g.note.id); requestAnimationFrame(go); } else go();
                    };
                    results.append(b);
                });
            }
        };
        const debouncedRun = debounce(run, 100);
        input.addEventListener('input', (e) => {
            clearBtn.style.display = e.target.value ? 'grid' : 'none';
            debouncedRun();
        });
        input.focus();
    }, { full: true });
}

// ------------------------------------------------------------------ lightbox
function openLightbox(src) {
    const box = $('#lightbox');
    const wrap = $('#lb-wrap');
    box.hidden = false;
    wrap.innerHTML = '';
    wrap.classList.remove('zoomed');
    $('#lb-zoom-i').textContent = '＋';
    const clone = src.cloneNode(true);
    clone.style.maxWidth = '';
    clone.style.maxHeight = '';
    clone.style.width = '';
    clone.style.height = '';
    wrap.append(clone);
}
const closeLightbox = () => {
    $('#lightbox').hidden = true;
    $('#lb-wrap').innerHTML = '';
};
const toggleZoom = () => {
    const wrap = $('#lb-wrap');
    wrap.classList.toggle('zoomed');
    $('#lb-zoom-i').textContent = wrap.classList.contains('zoomed') ? '−' : '＋';
};

// ------------------------------------------------------------------ appearance
function applyTheme() {
    const t = UI.theme;
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('#hljs-dark').media = dark ? 'all' : 'not all';
    $('#hljs-light').media = dark ? 'not all' : 'all';
    $('#btn-theme').textContent = dark ? '☀' : '☾';
    restyleMermaid();
}

function toggleTheme() {
    UI.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    persist(); applyTheme();
}

// ------------------------------------------------------------------ events
document.addEventListener('click', ev => {
    const img = ev.target.closest('#doc .md img');
    if (img) { ev.preventDefault(); openLightbox(img); }
    const diagram = ev.target.closest('.mermaid-box[data-done="1"]');
    if (diagram) { const svg = $('svg', diagram); if (svg) openLightbox(svg); }
});

$('#lb-close').onclick = closeLightbox;
$('#lb-zoom').onclick = toggleZoom;
$('#lb-wrap').onclick = (ev) => {
    if (ev.target === $('#lb-wrap')) closeLightbox();
};

let lastTap = 0;
$('#lb-wrap').addEventListener('touchstart', (ev) => {
    const now = Date.now();
    if (now - lastTap < 300) {
        ev.preventDefault();
        toggleZoom();
    }
    lastTap = now;
}, { passive: false });

$('#scrim').onclick = closeSheet;
$('#btn-switch').onclick = sheetSwitcher;
$('#fab-switch').onclick = sheetSwitcher;
$('#btn-theme').onclick = toggleTheme;
$('#dock').addEventListener('click', ev => {
    const b = ev.target.closest('.dk'); if (!b) return;
    ({ search: sheetSearch, outline: sheetOutline, fold: foldAll })[b.dataset.act]();
});

document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
        if (!$('#lightbox').hidden) { ev.preventDefault(); closeLightbox(); }
        else if (!$('#sheet').hidden) { ev.preventDefault(); closeSheet(); }
    }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (UI.theme === 'auto') applyTheme();
});

// ------------------------------------------------------------------ load
async function reload() {
    try {
        const response = await fetch('notes.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const res = await response.json();
        S.offline = false;
        const notes = sortNotes(res.notes.map(hydrate));
        S.notes = notes; S.byId = new Map(notes.map(n => [n.id, n]));
        if (!S.byId.has(S.activeId)) S.activeId = (UI.last && S.byId.has(UI.last)) ? UI.last : notes[0]?.id || null;
        renderAll();
    } catch {
        S.offline = true;
        renderDoc();
    }
}

async function poll() {
    if (document.hidden || !$('#sheet').hidden) return;
    try {
        const response = await fetch('notes.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const res = await response.json();
        const sameSet = res.notes.length === S.notes.length && res.notes.every(n => S.byId.has(n.id));
        if (!sameSet) { await reload(); toast('Notes folder changed'); return; }
        const changed = res.notes.filter(r => S.byId.get(r.id).mtime !== r.mtime).map(r => r.id);
        if (!changed.length) return;
        for (const raw of res.notes) if (changed.includes(raw.id)) S.byId.set(raw.id, hydrate(raw));
        S.notes = sortNotes([...S.byId.values()]);
        if (changed.includes(S.activeId)) renderDoc();
        renderRail();
        toast(`Updated: ${changed.join(', ')}`);
    } catch {}
}

applyTheme();
reload().then(() => setInterval(poll, 4000));

})();