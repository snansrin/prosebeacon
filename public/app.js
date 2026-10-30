/* ProseBeacon v0.3 — front end. No frameworks, no external resources. */
'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const state = {
  locale: 'tr',
  style: 'academic',
  text: '',
  revised: '',
  filename: '',
  health: null,
  analysis: null,
  proofread: null,
  diff: null,
  citations: null,
  scan: null,
  changes: [],
  view: 'side',
  onlyChanges: false,
  busy: false
};

const L = {
  tr: {
    loading: 'motor yükleniyor…', ready: 'yerel motor hazır', external: 'model bağlı',
    offline: 'çevrimdışı', chars: 'karakter', words: 'kelime', whole: 'belge tek parça',
    analyzing: 'analiz ediliyor', proofreading: 'yazım denetimi', transforming: 'üslup dönüşümü',
    diffing: 'karşılaştırma', citing: 'kaynakça', scanning: 'kaynak doğrulama', done: 'tamamlandı',
    noDoc: 'Önce bir belge yükleyin.', copied: 'Panoya kopyalandı.', selection: 'seçili bölüm'
  },
  en: {
    loading: 'loading engine…', ready: 'local engine ready', external: 'model connected',
    offline: 'offline', chars: 'characters', words: 'words', whole: 'whole document',
    analyzing: 'analyzing', proofreading: 'proofreading', transforming: 'transforming',
    diffing: 'comparing', citing: 'citations', scanning: 'verifying sources', done: 'done',
    noDoc: 'Load a document first.', copied: 'Copied to clipboard.', selection: 'selected passage'
  }
};
const t = key => (L[state.locale] || L.tr)[key] || key;

/* ------------------------------------------------------------------ utils */
function toast(message, kind = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  $('#toasts').append(node);
  setTimeout(() => node.remove(), kind === 'error' ? 7000 : 3800);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function api(path, body, extra = {}) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra.headers },
    body: JSON.stringify(body)
  });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error((payload && payload.error) || `İstek başarısız (${response.status})`);
  return payload;
}

/** POST that streams server-sent progress events; resolves with the result. */
async function sse(path, body, onProgress) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body)
  });
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/event-stream')) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error((payload && payload.error) || `İstek başarısız (${response.status})`);
    return payload;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  const handle = frame => {
    const name = /^event:\s*(\S+)/mu.exec(frame);
    const dataStart = frame.indexOf('data:');
    if (dataStart < 0) return;
    const raw = frame.slice(dataStart + 5).replace(/^\s/u, '');
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    if (name && name[1] === 'result') result = data;
    else if (onProgress) onProgress(data);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      handle(buffer.slice(0, index));
      buffer = buffer.slice(index + 2);
    }
  }
  if (buffer.trim()) handle(buffer);
  if (!result) throw new Error('Sunucu sonuç göndermedi.');
  return result;
}

const STAGES = {
  tr: { model: 'model çağrılıyor', transform: 'üslup dönüşümü', diff: 'karşılaştırma', citations: 'kaynakça', references: 'kaynak doğrulama', claims: 'atıf önerisi', done: 'tamamlandı' },
  en: { model: 'calling model', transform: 'style transform', diff: 'comparing', citations: 'citations', references: 'verifying references', claims: 'suggesting citations', done: 'done' }
};

function showProgress(stage, detail) {
  const box = $('#progress');
  box.hidden = false;
  const labels = STAGES[state.locale] || STAGES.tr;
  const label = labels[stage] || stage;
  let percent = { model: 12, transform: 45, diff: 72, citations: 86, references: 40, claims: 75, done: 100 }[stage] || 20;
  let text = label;
  if (detail && typeof detail === 'object') {
    if (typeof detail.done === 'number' && typeof detail.total === 'number' && detail.total) {
      percent = Math.round((detail.done / detail.total) * 100);
      text = `${label} · ${detail.done}/${detail.total}`;
    } else if (typeof detail.detail === 'string' && detail.detail) {
      text = `${label} · ${detail.detail}`;
    }
  } else if (typeof detail === 'string' && detail) text = `${label} · ${detail}`;
  $('#progressFill').style.width = `${Math.max(4, Math.min(100, percent))}%`;
  $('#progressText').textContent = text;
}
function hideProgress() { $('#progress').hidden = true; $('#progressFill').style.width = '100%'; }

/* ----------------------------------------------------------------- health */
async function loadHealth() {
  try {
    const response = await fetch('/api/health');
    const health = await response.json();
    state.health = health;
    const pill = $('#enginePill');
    pill.classList.toggle('ready', Boolean(health.ready));
    pill.classList.toggle('error', !health.ready);
    $('#engineText').textContent = health.external ? `${t('external')}: ${health.provider}/${health.model}` : t('ready');
    renderStyles(health.styles || []);
    renderAuthorities(health);
  } catch {
    $('#enginePill').classList.add('error');
    $('#engineText').textContent = t('offline');
  }
}

function renderStyles(styles) {
  const box = $('#styleButtons');
  box.textContent = '';
  for (const style of styles) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = style.label;
    button.title = style.description || style.id;
    button.dataset.style = style.id;
    button.classList.toggle('on', style.id === state.style);
    button.addEventListener('click', () => {
      state.style = style.id;
      $$('#styleButtons button').forEach(item => item.classList.toggle('on', item === button));
    });
    box.append(button);
  }
  if (!styles.some(style => style.id === state.style) && styles.length) {
    state.style = styles[0].id;
    box.querySelector('button')?.classList.add('on');
  }
}

function renderAuthorities(health) {
  const packs = health.languagePacks || [];
  const authorities = health.authorities || [];
  const rules = packs.reduce((total, pack) => total + (pack.rules || 0), 0);
  const patterns = packs.reduce((total, pack) => total + (pack.patterns || 0), 0);
  $('#authorities').textContent = `Dil paketleri: ${packs.map(pack => `${pack.locale.toUpperCase()} (${pack.rules} kural · ${pack.patterns} desen · ${pack.aiMarkers} YZ işareti)`).join(' · ')} — Toplam ${rules} kural. ` +
    `Dayanaklar: ${authorities.map(item => item.title).join(' · ')}`;
}

/* ------------------------------------------------------------ document in */
function setDocument(text, filename, meta = {}) {
  state.text = text;
  state.revised = '';
  state.filename = filename || 'yapıştırılan metin';
  state.diff = null;
  state.citations = null;
  state.scan = null;
  state.changes = [];
  $('#dzSub').textContent = `${state.filename} · ${text.length.toLocaleString('tr-TR')} ${t('chars')}`;
  const words = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  $('#docMeta').innerHTML = [
    `<span class="chip"><b>${text.length.toLocaleString('tr-TR')}</b> ${t('chars')}</span>`,
    `<span class="chip"><b>${words.toLocaleString('tr-TR')}</b> ${t('words')}</span>`,
    meta.pages ? `<span class="chip"><b>${meta.pages}</b> sayfa</span>` : '',
    `<span class="chip ok">✓ ${t('whole')}</span>`
  ].join('');
  ['#rewriteBtn', '#proofreadBtn', '#analyzeBtn', '#scanBtn'].forEach(selector => { $(selector).disabled = false; });
  $('#clearBtn').disabled = false;
  $('#diffCard').hidden = true;
  $('#tabsCard').hidden = true;
  runAnalyze().catch(() => {});
  runProofread().catch(() => {});
}

async function handleFile(file) {
  if (!file) return;
  showProgress('transform', { detail: file.name });
  try {
    const buffer = await file.arrayBuffer();
    const response = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
      body: buffer
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Belge okunamadı.');
    if (!payload.text) throw new Error('Belgede metin bulunamadı.');
    hideProgress();
    setDocument(payload.text, payload.filename || file.name, { pages: payload.pages });
    toast(`Belge yüklendi: ${payload.text.length.toLocaleString('tr-TR')} karakter, tek parça.`, 'ok');
  } catch (error) {
    hideProgress();
    toast(error.message, 'error');
  }
}

/* --------------------------------------------------------------- analysis */
async function runAnalyze() {
  if (!state.text) return toast(t('noDoc'), 'error');
  $('#analyzeBtn').disabled = true;
  try {
    showProgress('model', t('analyzing'));
    const analysis = await api('/api/analyze', { text: state.text, locale: state.locale });
    state.analysis = analysis;
    renderGauge(analysis);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    hideProgress();
    $('#analyzeBtn').disabled = false;
  }
}

function renderGauge(analysis) {
  const pct = Number(analysis.aiProbability || 0);
  const circumference = 2 * Math.PI * 52;
  const bar = $('#gaugeBar');
  bar.style.strokeDasharray = String(circumference);
  bar.style.strokeDashoffset = String(circumference * (1 - Math.max(0, Math.min(100, pct)) / 100));
  bar.style.stroke = pct < 20 ? 'var(--ins)' : pct < 50 ? 'var(--warn)' : 'var(--del)';
  $('#gaugePct').textContent = pct.toFixed(1);
  const band = $('#gaugeBand');
  band.textContent = analysis.aiProbabilityLabel || analysis.aiProbabilityBand || '';
  band.className = `band ${analysis.aiProbabilityBand || ''}`;
  const interval = analysis.aiProbabilityInterval;
  $('#gaugeInterval').textContent = interval ? `%${interval[0]} – %${interval[1]}` : '—';
  $('#gaugeConfidence').textContent = analysis.confidence != null ? `%${analysis.confidence}` : '—';
  const metrics = analysis.metrics || {};
  $('#gaugeReadability').textContent = metrics.readabilityScore != null
    ? `${metrics.readabilityScore} · ${metrics.readabilityLabel || ''}`
    : '—';
  $('#gaugeWords').textContent = `${(analysis.words || 0).toLocaleString('tr-TR')} / ${analysis.sentenceCount || 0}`;
  const factors = $('#gaugeFactors');
  factors.textContent = '';
  const list = (analysis.factors || []).slice().sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 7);
  const max = Math.max(1, ...list.map(factor => Math.abs(factor.weight)));
  for (const factor of list) {
    const row = document.createElement('div');
    row.className = 'factor';
    const positive = factor.weight >= 0;
    row.innerHTML = `<span>${escapeHtml(factor.label)}</span><em>${positive ? '+' : ''}${factor.weight}</em>`;
    const meter = document.createElement('div');
    meter.className = 'meter';
    const fill = document.createElement('i');
    fill.style.width = `${Math.round((Math.abs(factor.weight) / max) * 100)}%`;
    fill.style.background = positive ? 'var(--del)' : 'var(--ins)';
    meter.append(fill);
    row.append(meter);
    factors.append(row);
  }
  $('#gaugeLimitation').textContent = analysis.limitation || analysis.interpretation || '';
}

/* -------------------------------------------------------------- proofread */
async function runProofread() {
  if (!state.text) return toast(t('noDoc'), 'error');
  $('#proofreadBtn').disabled = true;
  try {
    showProgress('transform', t('proofreading'));
    const result = await api('/api/proofread', { text: state.text, locale: state.locale, autoFix: true });
    state.proofread = result;
    $('#tabsCard').hidden = false;
    renderIssues(result);
    if (result.changed && !state.revised) {
      // Show the corrected text immediately so the user always sees a result.
      state.revised = result.text;
      await renderComparison();
    }
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    hideProgress();
    $('#proofreadBtn').disabled = false;
  }
}

function renderIssues(result) {
  const issues = result.issues || [];
  $('#tabIssues').textContent = String(result.issueCount ?? issues.length);
  const box = $('#tab-issues');
  box.textContent = '';
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `<div class="row wrap">
      <span class="chip"><b>${result.issueCount ?? issues.length}</b> sorun</span>
      <span class="chip"><b>${result.correctedCount ?? 0}</b> otomatik düzeltildi</span>
      <span class="chip error"><b>${result.bySeverity?.error ?? 0}</b> hata</span>
      <span class="chip warn"><b>${result.bySeverity?.warning ?? 0}</b> uyarı</span>
    </div>
    <div class="row wrap">
      <button class="ghost" data-filter="all">Tümü</button>
      <button class="ghost" data-filter="error">Hatalar</button>
      <button class="ghost" data-filter="warning">Uyarılar</button>
      <button class="ghost" data-apply>Düzeltilmiş metni kullan</button>
    </div>`;
  box.append(toolbar);
  toolbar.querySelector('[data-apply]').addEventListener('click', () => {
    if (!result.text) return toast('Düzeltilmiş metin yok.', 'error');
    state.revised = result.text;
    renderComparison().then(() => toast('Yazım düzeltmeleri uygulandı.', 'ok'));
  });
  toolbar.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    toolbar.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('primary', item === button));
    list.children.length = 0;
    renderList(filter);
  }));
  const list = document.createElement('div');
  list.className = 'list';
  box.append(list);
  const renderList = filter => {
    const shown = issues.filter(issue => filter === 'all' || issue.severity === filter).slice(0, 400);
    for (const issue of shown) {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `<div class="item-head">
          <span class="badge ${issue.severity || 'info'}">${escapeHtml(issue.severity || 'info')}</span>
          <span class="badge">${escapeHtml(issue.category || '')}</span>
          <span class="badge">${escapeHtml(issue.ruleId || '')}</span>
          ${issue.authority ? `<span class="badge ok">${escapeHtml(issue.authority)}</span>` : ''}
          ${issue.fixable ? '<span class="badge ok">düzeltilebilir</span>' : ''}
        </div>
        <div class="item-msg">${escapeHtml(issue.message || issue.title || '')}</div>
        ${issue.excerpt ? `<div class="item-excerpt">${escapeHtml(issue.excerpt)}${issue.suggestion && issue.suggestion !== issue.excerpt ? ` <span class="fix">→ ${escapeHtml(issue.suggestion)}</span>` : ''}</div>` : ''}`;
      if (typeof issue.start === 'number') {
        const actions = document.createElement('div');
        actions.className = 'item-actions';
        const jump = document.createElement('button');
        jump.type = 'button';
        jump.textContent = 'Metinde göster';
        jump.addEventListener('click', () => jumpTo(issue.start));
        actions.append(jump);
        item.append(actions);
      }
      list.append(item);
    }
    if (!shown.length) list.innerHTML = '<div class="empty">Bu filtrede sorun yok.</div>';
  };
  renderList('all');
}

/* ---------------------------------------------------------------- rewrite */
async function runRewrite() {
  if (!state.text) return toast(t('noDoc'), 'error');
  if (state.busy) return;
  state.busy = true;
  $('#rewriteBtn').disabled = true;
  try {
    const result = await sse('/api/rewrite', {
      text: state.text,
      style: state.style,
      locale: state.locale,
      instruction: $('#instruction').value.trim(),
      glossary: $('#glossary').value.trim(),
      humanise: $('#humanise').checked
    }, progress => showProgress(progress.stage, progress.detail));
    state.revised = result.text;
    state.changes = result.changes || [];
    state.diff = result.diff || null;
    state.citations = result.citations || null;
    $('#tabsCard').hidden = false;
    await renderComparison();
    if (result.citations) renderCitations(result.citations);
    renderChanges(result.changes || []);
    if (result.notice) $('#diffNotice').textContent = result.notice;
    if (result.needsReview) toast('Bazı sayılar/terimler birebir korunamadı — işaretli bölümleri inceleyin.', 'error');
    else toast(`Yeniden yazıldı (${result.provider}) · ${state.changes.length} değişiklik.`, 'ok');
    // Re-measure the corrected text so the gauge reflects the new version.
    runAnalyze().catch(() => {});
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    state.busy = false;
    $('#rewriteBtn').disabled = false;
    hideProgress();
  }
}

async function renderComparison() {
  if (!state.revised) return;
  if (!state.diff) {
    showProgress('diff', t('diffing'));
    try {
      state.diff = await api('/api/compare', { text: state.text, revised: state.revised, locale: state.locale });
    } finally { hideProgress(); }
  }
  $('#diffCard').hidden = false;
  ['#copyBtn', '#exportDocx', '#exportMd', '#exportTxt'].forEach(selector => { $(selector).disabled = false; });
  const diff = state.diff;
  const stats = diff.similarity != null ? diff : {};
  $('#diffStats').innerHTML = [
    `<span class="chip"><b>${(diff.ops?.length || 0).toLocaleString('tr-TR')}</b> parça</span>`,
    `<span class="chip warn"><b>${stats.deletions ?? diff.ops?.filter(op => op.type === 'del').length ?? 0}</b> silinen</span>`,
    `<span class="chip ok"><b>${stats.insertions ?? diff.ops?.filter(op => op.type === 'ins').length ?? 0}</b> eklenen</span>`,
    `<span class="chip"><b>%${stats.similarity ?? '—'}</b> benzerlik</span>`,
    `<span class="chip">${(state.revised.length || 0).toLocaleString('tr-TR')} karakter</span>`
  ].join('');
  renderPanes(diff);
  renderInline(state.changes);
  $('#tabChanges').textContent = String(state.changes.length || (diff.ops || []).filter(op => op.type !== 'equal').length);
}

/** Build both panes plus the change-block index used for synced highlighting. */
function renderPanes(diff) {
  const ops = diff.ops || [];
  const left = $('#leftPane');
  const right = $('#rightPane');
  left.textContent = '';
  right.textContent = '';
  const leftFragment = document.createDocumentFragment();
  const rightFragment = document.createDocumentFragment();
  let block = -1;
  const CONTEXT = 90;
  ops.forEach((op, index) => {
    if (op.type === 'equal') {
      const value = op.left ?? op.right ?? '';
      const trimmed = state.onlyChanges && value.length > CONTEXT * 2
        ? `${value.slice(0, CONTEXT)} […] ${value.slice(-CONTEXT)}`
        : value;
      const leftSpan = document.createElement('span');
      leftSpan.className = 'eq';
      leftSpan.dataset.op = String(index);
      leftSpan.textContent = trimmed;
      const rightSpan = leftSpan.cloneNode(false);
      rightSpan.dataset.op = String(index);
      rightSpan.textContent = trimmed;
      if (state.onlyChanges && value.length > CONTEXT * 2) { leftSpan.classList.add('dim'); rightSpan.classList.add('dim'); }
      leftFragment.append(leftSpan);
      rightFragment.append(rightSpan);
      return;
    }
    if (index === 0 || ops[index - 1].type === 'equal') block += 1;
    if (op.type === 'del') {
      const node = document.createElement('del');
      node.className = 'mark';
      node.dataset.op = String(index);
      node.dataset.block = String(block);
      node.textContent = op.left || '';
      leftFragment.append(node);
    } else {
      const node = document.createElement('ins');
      node.className = 'mark';
      node.dataset.op = String(index);
      node.dataset.block = String(block);
      node.textContent = op.right || '';
      rightFragment.append(node);
    }
  });
  left.append(leftFragment);
  right.append(rightFragment);
  bindSync(left, right);
}

/** Clicking a change on either side highlights and scrolls its pair. */
function bindSync(left, right) {
  // The panes are persistent DOM nodes; bind exactly once per session.
  if (left.dataset.bound) return;
  left.dataset.bound = '1';
  const activate = event => {
    const target = event.target.closest('[data-block]');
    $$('.mark.active').forEach(node => node.classList.remove('active'));
    if (!target) return;
    const id = target.dataset.block;
    const nodes = $$(`[data-block="${id}"]`);
    nodes.forEach(node => node.classList.add('active'));
    const other = left.contains(target) ? right : left;
    const mirror = other.querySelector(`[data-block="${id}"]`);
    if (mirror) {
      mirror.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const index = Number(target.dataset.op);
      const op = (state.diff?.ops || [])[index];
      if (op) $('#selectionHint').textContent = `${t('selection')} #${Number(id) + 1} · ${op.type === 'del' ? 'silinen' : 'eklenen'}: “${(op.left || op.right || '').slice(0, 60)}”`;
    }
  };
  left.addEventListener('click', activate);
  right.addEventListener('click', activate);

  // Free-text selection also maps across: find the op under the anchor and
  // highlight the matching offsets on the other side.
  const syncSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) { hideSelectionPop(); return; }
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer.parentElement?.closest('[data-op]');
    const endNode = range.endContainer.parentElement?.closest('[data-op]');
    if (!startNode || !endNode) { hideSelectionPop(); return; }
    const from = Math.min(Number(startNode.dataset.op), Number(endNode.dataset.op));
    const to = Math.max(Number(startNode.dataset.op), Number(endNode.dataset.op));
    const inLeft = left.contains(startNode);
    const ops = state.diff?.ops || [];
    const pick = op => (inLeft ? [op.leftFrom, op.leftTo] : [op.rightFrom, op.rightTo]);
    let start = null;
    let end = null;
    for (let index = from; index <= to; index += 1) {
      const [a, b] = pick(ops[index] || {});
      if (a == null) continue;
      start = start == null ? a : Math.min(start, a);
      end = end == null ? b : Math.max(end, b);
    }
    const other = inLeft ? right : left;
    const key = inLeft ? 'rightFrom' : 'leftFrom';
    $$('.mark.mirror').forEach(node => node.classList.remove('mirror', 'active'));
    if (start == null) return;
    other.querySelectorAll('[data-op]').forEach(node => {
      const op = ops[Number(node.dataset.op)];
      if (!op) return;
      const value = op[key];
      if (value != null && value >= start - 1 && value <= end + 1) node.classList.add('active');
    });
    state.selection = { pane: inLeft ? 'left' : 'right', from: start, to: end };
    showSelectionPop(range);
  };
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const node = selection.getRangeAt(0).startContainer.parentElement;
    if (node && (left.contains(node) || right.contains(node))) syncSelection();
  });
}

function showSelectionPop(range) {
  const pop = $('#selectionPop');
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return;
  pop.hidden = false;
  pop.style.left = `${Math.min(window.innerWidth - 260, Math.max(8, rect.left + rect.width / 2 - 120))}px`;
  pop.style.top = `${Math.max(8, rect.top - 44 + window.scrollY)}px`;
  const label = state.selection && state.selection.to > state.selection.from
    ? `${state.selection.to - state.selection.from} karakter seçildi`
    : '';
  $('#popRewrite').textContent = label ? `${label} — seçili üslupla yeniden yaz` : 'Seçimi bu üslupla yeniden yaz';
}
function hideSelectionPop() { $('#selectionPop').hidden = true; }

/** Rewrite only the selected passage, then splice it back in. */
async function rewriteSelection() {
  hideSelectionPop();
  const selection = state.selection;
  if (!selection || !(selection.to > selection.from)) return toast('Önce bir bölüm seçin.', 'error');
  const source = selection.pane === 'left' ? state.text : state.revised;
  const piece = source.slice(selection.from, selection.to);
  if (piece.trim().length < 20) return toast('Seçim çok kısa (en az 20 karakter).', 'error');
  $('#rewriteBtn').disabled = true;
  try {
    showProgress('transform', `${t('selection')} · ${piece.length} karakter`);
    const result = await sse('/api/rewrite', {
      text: piece,
      style: state.style,
      locale: state.locale,
      instruction: $('#instruction').value.trim(),
      glossary: $('#glossary').value.trim(),
      humanise: $('#humanise').checked
    }, progress => showProgress(progress.stage, progress.detail));
    if (selection.pane === 'left') {
      state.text = source.slice(0, selection.from) + result.text + source.slice(selection.to);
      state.diff = null;
      await runRewrite();
    } else {
      state.revised = source.slice(0, selection.from) + result.text + source.slice(selection.to);
      state.diff = null;
      await renderComparison();
      toast('Seçili bölüm yeniden yazıldı.', 'ok');
    }
    state.selection = null;
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    $('#rewriteBtn').disabled = false;
    hideProgress();
  }
}

function jumpTo(offset) {
  const pane = $('#leftPane');
  const ops = state.diff?.ops || [];
  let best = null;
  for (const node of pane.querySelectorAll('[data-op]')) {
    const op = ops[Number(node.dataset.op)];
    if (!op || op.leftFrom == null) continue;
    if (op.leftFrom <= offset && op.leftTo >= offset) { best = node; break; }
    if (op.leftFrom > offset) break;
    best = node;
  }
  if (!best && state.text) {
    // No diff yet: fall back to a plain highlight of the original text.
    pane.textContent = '';
    const before = document.createTextNode(state.text.slice(0, offset));
    const mark = document.createElement('mark');
    mark.textContent = state.text.slice(offset, offset + 120);
    mark.style.background = 'rgba(79,140,255,.35)';
    pane.append(before, mark, document.createTextNode(state.text.slice(offset + 120)));
    best = mark;
  }
  best?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ------------------------------------------------------------- inline view */
function renderInline(changes) {
  const box = $('#inlineView');
  box.textContent = '';
  const list = (changes && changes.length ? changes : deriveChangesFromDiff()).slice(0, 600);
  if (!list.length) {
    box.innerHTML = '<div class="empty">Değişiklik yok — metin zaten kurallara uygun.</div>';
    return;
  }
  for (const [index, change] of list.entries()) {
    const pair = document.createElement('div');
    pair.className = 'pair';
    pair.innerHTML = `<div class="pair-head"><b>#${index + 1}</b><span>satır ${change.line ?? '—'}</span></div>
      <div class="pair-body">
        <div class="pair-line old"><span class="pair-tag">ORİJİNAL</span>${escapeHtml(change.before)}</div>
        <div class="pair-line new"><span class="pair-tag">DÜZELTİLMİŞ</span>${escapeHtml(change.after)}</div>
      </div>`;
    pair.querySelector('.pair-head').addEventListener('click', () => {
      if (typeof change.start === 'number') jumpTo(change.start);
    });
    box.append(pair);
  }
  if (list.length >= 600) {
    const more = document.createElement('div');
    more.className = 'empty';
    more.textContent = `İlk 600 değişiklik gösteriliyor (toplam ${changes.length}).`;
    box.append(more);
  }
}

function deriveChangesFromDiff() {
  const ops = state.diff?.ops || [];
  const out = [];
  let index = 0;
  while (index < ops.length) {
    if (ops[index].type === 'equal') { index += 1; continue; }
    let before = '';
    let after = '';
    let start = ops[index].leftFrom ?? ops[index - 1]?.leftTo ?? 0;
    while (index < ops.length && ops[index].type !== 'equal') {
      if (ops[index].type === 'del') before += ops[index].left || '';
      else after += ops[index].right || '';
      index += 1;
    }
    out.push({ line: null, start, before, after });
  }
  return out;
}

function renderChanges(changes) {
  const box = $('#tab-changes');
  box.textContent = '';
  const list = (changes && changes.length ? changes : deriveChangesFromDiff()).slice(0, 500);
  if (!list.length) { box.innerHTML = '<div class="empty">Kayıtlı değişiklik yok.</div>'; return; }
  const wrap = document.createElement('div');
  wrap.className = 'list';
  for (const change of list) {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `<div class="item-head"><span class="badge">satır ${change.line ?? '—'}</span></div>
      <div class="item-excerpt" style="color:#ffd6d7">${escapeHtml((change.before || '').slice(0, 400))}</div>
      <div class="item-excerpt" style="color:#c6f5de">${escapeHtml((change.after || '').slice(0, 400))}</div>`;
    if (typeof change.start === 'number') {
      const actions = document.createElement('div');
      actions.className = 'item-actions';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Metinde göster';
      button.addEventListener('click', () => jumpTo(change.start));
      actions.append(button);
      item.append(actions);
    }
    wrap.append(item);
  }
  box.append(wrap);
}

/* -------------------------------------------------------------- citations */
function renderCitations(table) {
  state.citations = table;
  $('#tabCitations').textContent = String(table.summary?.references ?? 0);
  const box = $('#tab-citations');
  box.textContent = '';
  const summary = table.summary || {};
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const styles = state.health?.citationStyles || ['apa7', 'apa7-tr', 'mla9', 'chicago', 'vancouver', 'numbered'];
  toolbar.innerHTML = `<div class="row wrap">
      <span class="chip"><b>${summary.references ?? 0}</b> kaynak</span>
      <span class="chip ok"><b>${summary.cited ?? 0}</b> atıf yapılmış</span>
      <span class="chip warn"><b>${summary.uncited ?? 0}</b> atıf yapılmamış</span>
      <span class="chip error"><b>${summary.unmatched ?? 0}</b> listede yok</span>
      <span class="chip"><b>${summary.withDoi ?? 0}</b> DOI'li</span>
    </div>
    <div class="row wrap">
      <select class="field" id="citationStyle">${styles.map(item => `<option value="${typeof item === 'string' ? item : item.id}" ${String(item.id || item) === (table.style || 'apa7') ? 'selected' : ''}>${typeof item === 'string' ? item : item.label || item.id}</option>`).join('')}</select>
      <button class="ghost" data-copy="text">Tabloyu kopyala</button>
      <button class="ghost" data-copy="markdown">Markdown kopyala</button>
      <button class="ghost" data-dl="csv">CSV indir</button>
      <button class="ghost" data-dl="bibtex">BibTeX indir</button>
    </div>`;
  box.append(toolbar);
  if (!table.bibliographyFound) {
    const notice = document.createElement('div');
    notice.className = 'notice warn';
    notice.textContent = 'Belgede kaynakça bölümü bulunamadı. Yine de metin içi atıflar tarandı.';
    box.append(notice);
  }
  toolbar.querySelector('#citationStyle').addEventListener('change', async event => {
    try {
      const next = await api('/api/citations', { text: state.revised || state.text, locale: state.locale, style: event.target.value });
      renderCitations(next);
    } catch (error) { toast(error.message, 'error'); }
  });
  toolbar.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const format = button.dataset.copy;
    try {
      const payload = format === 'markdown'
        ? await api('/api/citations', { text: state.revised || state.text, locale: state.locale, style: table.style, format: 'markdown' })
        : table.entries.map(entry => entry.formatted).join('\n\n');
      await navigator.clipboard.writeText(typeof payload === 'string' ? payload : String(payload));
      toast(t('copied'), 'ok');
    } catch (error) { toast(error.message, 'error'); }
  }));
  toolbar.querySelectorAll('[data-dl]').forEach(button => button.addEventListener('click', () => downloadCitations(button.dataset.dl, table.style)));

  if ((table.unmatched || []).length) {
    const warn = document.createElement('div');
    warn.className = 'notice warn';
    warn.innerHTML = `<strong>Kaynakçada bulunamayan atıflar (${table.unmatched.length}):</strong> ${table.unmatched.map(item => `${escapeHtml(item.family || '?')} ${item.year || ''}${item.count > 1 ? ` ×${item.count}` : ''}`).join(' · ')}<br><span class="hint">Bu atıflar metinde geçiyor ama kaynak listesinde karşılığı yok. Tez/rapor savunmasında en sık sorulan hatadır.</span>`;
    box.append(warn);
  }
  if ((table.uncited || []).length) {
    const info = document.createElement('div');
    info.className = 'notice';
    info.innerHTML = `<strong>Hiç atıf yapılmamış kaynaklar (${table.uncited.length}):</strong> ${table.uncited.map(item => `${escapeHtml(item.authors || '')} (${item.year || '?'})`).join(' · ')}`;
    box.append(info);
  }

  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  const rows = (table.entries || []).map(entry => `<tr>
      <td>${entry.id}</td>
      <td>${escapeHtml(entry.authors || '')}</td>
      <td>${entry.year || '—'}</td>
      <td>${escapeHtml(entry.title || '')}</td>
      <td class="mono">${escapeHtml(entry.source || '')}${entry.volume ? ` <b>${entry.volume}</b>${entry.issue ? `(${entry.issue})` : ''}${entry.pages ? `, ${entry.pages}` : ''}` : ''}</td>
      <td class="mono">${entry.doi ? `<a href="https://doi.org/${escapeHtml(entry.doi)}" target="_blank" rel="noreferrer">${escapeHtml(entry.doi)}</a>` : entry.url ? `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">bağlantı</a>` : '—'}</td>
      <td><span class="badge ${entry.status === 'ok' ? 'ok' : entry.status === 'uncited' ? 'warning' : 'info'}">${entry.status === 'ok' ? 'atıf var' : entry.status === 'uncited' ? 'atıf yok' : 'eksik'}</span></td>
      <td class="mono">${escapeHtml(entry.formatted || '')}</td>
    </tr>`).join('');
  scroll.innerHTML = `<table class="grid"><thead><tr><th>#</th><th>Yazar</th><th>Yıl</th><th>Başlık</th><th>Kaynak</th><th>DOI</th><th>Durum</th><th>Biçimlendirilmiş</th></tr></thead><tbody>${rows}</tbody></table>`;
  box.append(scroll);
  if (!(table.entries || []).length) box.append(Object.assign(document.createElement('div'), { className: 'empty', textContent: 'Kaynak bulunamadı.' }));
}

async function downloadCitations(format, style) {
  try {
    const response = await fetch('/api/citations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.revised || state.text, locale: state.locale, style, format })
    });
    if (!response.ok) throw new Error(`İndirme başarısız (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prosebeacon-kaynakca.${format === 'markdown' ? 'md' : format === 'bibtex' ? 'bib' : format}`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) { toast(error.message, 'error'); }
}

/* ----------------------------------------------------------- source scan */
async function runScan() {
  if (!state.text) return toast(t('noDoc'), 'error');
  $('#scanBtn').disabled = true;
  $('#tabsCard').hidden = false;
  switchTab('sources');
  try {
    const scan = await sse('/api/sources', {
      text: state.revised || state.text,
      locale: state.locale,
      style: state.citations?.style || 'apa7',
      maxReferences: 24,
      maxClaims: 8
    }, progress => showProgress(progress.stage, progress.detail));
    state.scan = scan;
    renderScan(scan);
    toast(scan.offline ? 'Kaynak doğrulama çevrimdışı tamamlandı.' : `Kaynaklar doğrulandı: ${scan.summary.verified} doğru, ${scan.summary.corrected} düzeltilmeli, ${scan.summary.notFound} bulunamadı.`, scan.offline ? 'info' : 'ok');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    $('#scanBtn').disabled = false;
    hideProgress();
  }
}

function renderScan(scan) {
  const box = $('#tab-sources');
  box.textContent = '';
  const summary = scan.summary || {};
  $('#tabSources').textContent = String(summary.checked || 0);
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `<div class="row wrap">
      <span class="chip"><b>${summary.checked || 0}</b> kontrol</span>
      <span class="chip ok"><b>${summary.verified || 0}</b> doğrulandı</span>
      <span class="chip warn"><b>${summary.corrected || 0}</b> düzeltilmeli</span>
      <span class="chip error"><b>${summary.notFound || 0}</b> bulunamadı</span>
      <span class="chip"><b>${summary.suggestions || 0}</b> atıf önerisi</span>
    </div>
    <div class="row"><button class="ghost" data-md>Raporu indir (.md)</button></div>`;
  box.append(toolbar);
  toolbar.querySelector('[data-md]').addEventListener('click', () => {
    const markdown = buildScanMarkdown(scan);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prosebeacon-kaynak-dogrulama.md';
    link.click();
    URL.revokeObjectURL(url);
  });
  if (scan.notice) {
    const notice = document.createElement('div');
    notice.className = `notice ${scan.offline ? 'warn' : ''}`;
    notice.textContent = scan.notice;
    box.append(notice);
  }
  const list = document.createElement('div');
  list.className = 'list';
  const statusLabel = { verified: 'doğrulandı', corrected: 'düzeltilmeli', 'not-found': 'bulunamadı', unchecked: 'kontrol edilmedi' };
  for (const reference of scan.references || []) {
    const verification = reference.verification || {};
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `<div class="item-head">
        <span class="badge ${verification.status === 'verified' ? 'ok' : verification.status === 'not-found' ? 'error' : 'warning'}">${statusLabel[verification.status] || verification.status}</span>
        <span class="badge">#${reference.id}</span>
        ${verification.similarity ? `<span class="badge">eşleşme %${Math.round(verification.similarity * 100)}</span>` : ''}
        ${verification.work?.provider ? `<span class="badge">${verification.work.provider}</span>` : ''}
      </div>
      <div class="item-msg">${escapeHtml(reference.authors || '')} (${reference.year || '?'}). ${escapeHtml(reference.title || '')}</div>
      ${verification.note ? `<div class="item-excerpt">${escapeHtml(verification.note)}</div>` : ''}
      ${verification.work?.title ? `<div class="item-excerpt">Kayıt: ${escapeHtml(verification.work.title)} (${verification.work.year || '?'}) ${verification.work.doi ? `· doi:${escapeHtml(verification.work.doi)}` : ''}</div>` : ''}`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    if (verification.work?.doi) {
      const link = document.createElement('button');
      link.type = 'button';
      link.textContent = 'DOI aç';
      link.addEventListener('click', () => window.open(`https://doi.org/${verification.work.doi}`, '_blank', 'noopener'));
      actions.append(link);
    }
    if (reference.doi) {
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'DOI kopyala';
      copy.addEventListener('click', async () => { await navigator.clipboard.writeText(reference.doi); toast(t('copied'), 'ok'); });
      actions.append(copy);
    }
    if (actions.children.length) item.append(actions);
    list.append(item);
  }
  box.append(list);
  const claims = (scan.claims || []).filter(claim => claim.suggestion);
  if (claims.length) {
    const head = document.createElement('h3');
    head.textContent = 'Atıfsız iddialar için öneriler';
    box.append(head);
    const claimList = document.createElement('div');
    claimList.className = 'list';
    for (const claim of claims) {
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `<div class="item-head"><span class="badge info">${claim.suggestion.origin === 'bibliography' ? 'kendi kaynakçanızdan' : claim.suggestion.provider}</span><span class="badge">eşleşme %${Math.round((claim.suggestion.similarity || 0) * 100)}</span></div>
        <div class="item-msg">“${escapeHtml(claim.text.slice(0, 260))}${claim.text.length > 260 ? '…' : ''}”</div>
        <div class="item-excerpt fix">${escapeHtml(claim.suggestion.citation || `${claim.suggestion.authors} (${claim.suggestion.year})`)}</div>`;
      const actions = document.createElement('div');
      actions.className = 'item-actions';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Atıfı kopyala';
      copy.addEventListener('click', async () => { await navigator.clipboard.writeText(claim.suggestion.citation || ''); toast(t('copied'), 'ok'); });
      actions.append(copy);
      if (claim.suggestion.doi) {
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = 'Kaynağı aç';
        open.addEventListener('click', () => window.open(`https://doi.org/${claim.suggestion.doi}`, '_blank', 'noopener'));
        actions.append(open);
      }
      item.append(actions);
      claimList.append(item);
    }
    box.append(claimList);
  }
}

function buildScanMarkdown(scan) {
  const lines = ['# ProseBeacon kaynak doğrulama', '', `Tarih: ${new Date().toLocaleString('tr-TR')}`, ''];
  lines.push(`- Kontrol: ${scan.summary.checked}`, `- Doğrulandı: ${scan.summary.verified}`, `- Düzeltilmeli: ${scan.summary.corrected}`, `- Bulunamadı: ${scan.summary.notFound}`, `- Öneri: ${scan.summary.suggestions}`, '');
  for (const reference of scan.references || []) {
    const verification = reference.verification || {};
    lines.push(`## [${reference.id}] ${reference.authors || ''} (${reference.year || '?'})`);
    lines.push(`- Durum: ${verification.status}${verification.similarity ? ` (eşleşme ${Math.round(verification.similarity * 100)}%)` : ''}`);
    if (reference.title) lines.push(`- Başlık: ${reference.title}`);
    if (verification.note) lines.push(`- Not: ${verification.note}`);
    if (verification.work?.doi) lines.push(`- Kayıt DOI: ${verification.work.doi}`);
    lines.push('');
  }
  for (const claim of (scan.claims || []).filter(item => item.suggestion)) {
    lines.push(`### Atıfsız iddia`);
    lines.push(`> ${claim.text}`);
    lines.push(`- Öneri: ${claim.suggestion.citation}`);
    lines.push('');
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------ tabs */
function switchTab(name) {
  $$('.tabs button').forEach(button => button.classList.toggle('on', button.dataset.tab === name));
  ['issues', 'citations', 'sources', 'changes'].forEach(key => { $(`#tab-${key}`).hidden = key !== name; });
}

/* ---------------------------------------------------------------- export */
async function exportDocument(format) {
  try {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.revised || state.text, format, locale: state.locale, title: state.filename })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Dışa aktarma başarısız (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const extension = format === 'docx' ? 'docx' : format === 'markdown' ? 'md' : 'txt';
    link.download = `prosebeacon-${(state.filename || 'belge').replace(/\.[^.]+$/u, '')}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Dosya indirildi.', 'ok');
  } catch (error) { toast(error.message, 'error'); }
}

/* ----------------------------------------------------------------- sample */
const SAMPLE = `Kent parkları, yoğun rekreasyonel kullanım altında dahi karbon depolama işlevini sürdüren kritik yeşil altyapı bileşenleridir. Günümüzün hızla gelişen dünyasında, kentsel yeşil alanların iklim değişikliğinin etkilerini azaltmada büyük önem taşımaktadır.
Çalışma alanında yapılan ölçümlerde, ağaç gövdelerinde ortalama 299,57 kg/ağaç karbon depolandığı belirlenmiştir. Buna karşılık, tek katmanlı çim alanlarında bu değer 1,2 kg/m² düzeyinde kalmıştır. Elde edilen bulgular, literatürde bildirilen değerlerle uyumludur.
Park içerisindeki yapay havuzlar ve su yüzeyleri 11.820 m² (%5,1) alan kaplarken, sert zemin oranı %19,2 (44.657 m²) olarak hesaplanmıştır. Bu alan, parkın toplam büyüklüğü olan 232.590 m²'nin önemli bir bölümünü oluşturmaktadır.
Sonuç olarak, kentsel yeşil alanların karbon yutak kapasitesinin artırılması için çok katmanlı bitkilendirme stratejileri önerilmektedir. Bu bağlamda, yerel geniş yapraklı türlerin kullanımı büyük önem arz etmektedir.`;

/* ------------------------------------------------------------------ init */
function bind() {
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', () => handleFile(fileInput.files?.[0]));
  ['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.remove('over'); }));
  dropzone.addEventListener('drop', event => handleFile(event.dataTransfer?.files?.[0]));
  document.addEventListener('dragover', event => event.preventDefault());
  document.addEventListener('drop', event => { event.preventDefault(); if (event.dataTransfer?.files?.length) handleFile(event.dataTransfer.files[0]); });

  $('#sampleBtn').addEventListener('click', () => setDocument(SAMPLE, 'ornek-metin.txt'));
  $('#pasteBtn').addEventListener('click', async () => {
    try {
      const pasted = await navigator.clipboard.readText();
      if (pasted && pasted.trim().length >= 20) setDocument(pasted, 'yapıştırılan-metin.txt');
      else toast('Panoda yeterli metin yok.', 'error');
    } catch { toast('Tarayıcı pano erişimine izin vermedi. Metni bir .txt dosyası olarak yükleyin.', 'error'); }
  });
  $('#clearBtn').addEventListener('click', () => {
    state.text = ''; state.revised = ''; state.diff = null; state.citations = null; state.scan = null; state.changes = [];
    $('#dzSub').textContent = 'Henüz belge yüklenmedi';
    $('#docMeta').textContent = '';
    $('#diffCard').hidden = true;
    $('#tabsCard').hidden = true;
    ['#rewriteBtn', '#proofreadBtn', '#analyzeBtn', '#scanBtn', '#copyBtn', '#exportDocx', '#exportMd', '#exportTxt'].forEach(selector => { $(selector).disabled = true; });
    $('#clearBtn').disabled = true;
    fileInput.value = '';
  });

  $('#rewriteBtn').addEventListener('click', runRewrite);
  $('#proofreadBtn').addEventListener('click', runProofread);
  $('#analyzeBtn').addEventListener('click', runAnalyze);
  $('#scanBtn').addEventListener('click', runScan);
  $('#popRewrite').addEventListener('click', rewriteSelection);
  $('#copyBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(state.revised || state.text); toast(t('copied'), 'ok'); }
    catch { toast('Kopyalama başarısız.', 'error'); }
  });
  $('#exportDocx').addEventListener('click', () => exportDocument('docx'));
  $('#exportMd').addEventListener('click', () => exportDocument('markdown'));
  $('#exportTxt').addEventListener('click', () => exportDocument('txt'));

  $$('.view-switch button').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view;
    $$('.view-switch button').forEach(item => item.classList.toggle('on', item === button));
    const side = state.view === 'side';
    $('#panes').hidden = !side;
    $('#inlineView').hidden = side;
  }));
  $('#onlyChanges').addEventListener('change', event => {
    state.onlyChanges = event.target.checked;
    if (state.diff) renderPanes(state.diff);
  });
  $$('.lang-switch button').forEach(button => button.addEventListener('click', () => {
    state.locale = button.dataset.locale;
    $$('.lang-switch button').forEach(item => item.classList.toggle('on', item === button));
    document.documentElement.lang = state.locale;
    if (state.health) renderStyles(state.health.styles || []);
  }));
  $$('.tabs button').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
}

bind();
loadHealth();
