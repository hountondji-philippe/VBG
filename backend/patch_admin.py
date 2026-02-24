import os

ADMIN_DIR = '/home/philippe/Desktop/solo/VBG_fixed/backend/frontend/admin'

# ============ CSS ============
css = r""":root {
  --or:   #E8621A;
  --or-d: #C44E0E;
  --dk:   #1C1C1C;
  --gy:   #5A5A5A;
  --gyl:  #9A9A9A;
  --bd:   #E4E4E4;
  --bg:   #F6F6F6;
  --wh:   #FFFFFF;
  --gr:   #16A34A;
  --rd:   #DC2626;
  --bl:   #2563EB;
  --am:   #D97706;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--dk); min-height: 100vh; }
a { color: inherit; text-decoration: none; }
button { cursor: pointer; font-family: inherit; border: none; background: none; }

/* LOGIN */
#login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dk);
}
.login-box {
  background: var(--wh);
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 370px;
  box-shadow: 0 24px 64px rgba(0,0,0,.35);
}
.login-logo { font-size: 1.7rem; font-weight: 700; color: var(--or); letter-spacing: 3px; margin-bottom: .3rem; }
.login-sub  { font-size: .8rem; color: var(--gyl); margin-bottom: 2rem; }
.field { margin-bottom: 1.1rem; }
.field label {
  display: block;
  font-size: .75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--gy);
  margin-bottom: .4rem;
}
.field input {
  width: 100%;
  border: 1.5px solid var(--bd);
  border-radius: 8px;
  padding: .7rem 1rem;
  font-size: .93rem;
  font-family: inherit;
  background: var(--bg);
  color: var(--dk);
  transition: border-color .15s;
}
.field input:focus { outline: none; border-color: var(--or); background: var(--wh); }
.login-btn {
  width: 100%;
  background: var(--or);
  color: var(--wh);
  border-radius: 8px;
  padding: .85rem;
  font-size: .93rem;
  font-weight: 600;
  margin-top: .5rem;
  transition: background .15s;
}
.login-btn:hover:not(:disabled) { background: var(--or-d); }
.login-btn:disabled { opacity: .6; cursor: not-allowed; }
.login-err {
  margin-top: .9rem;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: var(--rd);
  border-radius: 8px;
  padding: .7rem 1rem;
  font-size: .82rem;
  display: none;
}

/* LAYOUT */
#admin-screen { display: none; }

/* HAMBURGER */
.hamburger {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 200;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--dk);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px;
}
.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--wh);
  border-radius: 2px;
}

/* OVERLAY MOBILE */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  z-index: 150;
}
.sidebar-overlay.open { display: block; }

.sidebar {
  position: fixed;
  top: 0; left: 0;
  width: 210px;
  height: 100vh;
  background: var(--dk);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  z-index: 160;
  transition: transform .25s ease;
}
.sb-logo { font-size: 1.4rem; font-weight: 700; color: var(--or); letter-spacing: 3px; margin-bottom: .2rem; }
.sb-sub  { font-size: .68rem; color: rgba(255,255,255,.35); margin-bottom: 2rem; }
.sb-btn {
  display: flex;
  align-items: center;
  gap: .55rem;
  padding: .6rem .8rem;
  border-radius: 8px;
  font-size: .84rem;
  color: rgba(255,255,255,.55);
  transition: background .15s, color .15s;
  margin-bottom: .2rem;
  width: 100%;
  text-align: left;
}
.sb-btn:hover, .sb-btn.active { background: rgba(232,98,26,.2); color: var(--wh); }
.sb-logout {
  margin-top: auto;
  width: 100%;
  text-align: left;
  padding: .6rem .8rem;
  border-radius: 8px;
  font-size: .84rem;
  color: rgba(255,255,255,.35);
  transition: color .15s;
}
.sb-logout:hover { color: var(--rd); }

.main { margin-left: 210px; padding: 2rem; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.8rem; }
.topbar h1 { font-size: 1.25rem; font-weight: 600; }
.topbar small { font-size: .78rem; color: var(--gyl); }

/* STATS */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.8rem;
}
.stat-card { background: var(--wh); border-radius: 12px; padding: 1.2rem 1.4rem; border: 1.5px solid var(--bd); }
.stat-card .n { font-size: 2rem; font-weight: 700; line-height: 1; margin-bottom: .3rem; }
.stat-card .l { font-size: .72rem; text-transform: uppercase; letter-spacing: .5px; color: var(--gyl); }
.n-or { color: var(--or); }
.n-bl { color: var(--bl); }
.n-am { color: var(--am); }
.n-gr { color: var(--gr); }

/* VUES */
.view        { display: none; }
.view.active { display: block; }

/* FILTRES */
.filters { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.1rem; }
.f-btn {
  padding: .38rem .85rem;
  border-radius: 20px;
  font-size: .79rem;
  font-weight: 500;
  border: 1.5px solid var(--bd);
  background: var(--wh);
  color: var(--gy);
  transition: all .15s;
}
.f-btn:hover, .f-btn.active { background: var(--or); border-color: var(--or); color: var(--wh); }

/* CARD + TABLE */
.card { background: var(--wh); border-radius: 12px; border: 1.5px solid var(--bd); overflow: hidden; }
.card-title { padding: 1rem 1.1rem; font-weight: 600; font-size: .88rem; border-bottom: 1.5px solid var(--bd); }
table { width: 100%; border-collapse: collapse; }
thead th {
  padding: .75rem 1rem;
  text-align: left;
  font-size: .7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--gyl);
  border-bottom: 1.5px solid var(--bd);
  background: var(--bg);
}
tbody tr { border-bottom: 1px solid var(--bd); transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #FAFAFA; }
tbody td { padding: .85rem 1rem; font-size: .84rem; vertical-align: middle; }
.td-msg { max-width: 280px; }
.td-msg p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--gy); }

.badge { display: inline-block; padding: .22rem .65rem; border-radius: 20px; font-size: .7rem; font-weight: 600; white-space: nowrap; }
.b-nouveau  { background: #EFF6FF; color: var(--bl); }
.b-en_cours { background: #FFFBEB; color: var(--am); }
.b-traite   { background: #F0FDF4; color: var(--gr); }
.b-archive  { background: #F3F4F6; color: #6B7280; }

.btn-open {
  padding: .32rem .75rem;
  border-radius: 6px;
  font-size: .76rem;
  font-weight: 500;
  background: var(--or);
  color: var(--wh);
  transition: background .15s;
}
.btn-open:hover { background: var(--or-d); }

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .85rem 1rem;
  border-top: 1px solid var(--bd);
  font-size: .8rem;
  color: var(--gyl);
}
.pager-btns { display: flex; align-items: center; gap: .4rem; }
.p-btn {
  padding: .3rem .7rem;
  border-radius: 6px;
  font-size: .78rem;
  border: 1.5px solid var(--bd);
  background: var(--wh);
  color: var(--gy);
  transition: all .15s;
}
.p-btn:hover:not(:disabled) { background: var(--or); border-color: var(--or); color: var(--wh); }
.p-btn:disabled { opacity: .35; cursor: not-allowed; }

.placeholder { text-align: center; padding: 3.5rem 1rem; color: var(--gyl); }
.placeholder .ico { font-size: 2rem; margin-bottom: .7rem; }
.placeholder p { font-size: .88rem; }

/* MODAL */
.modal-bg {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(28,28,28,.55);
  z-index: 300;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  padding: 1rem;
}
.modal-bg.open { display: flex; }
.modal {
  background: var(--wh);
  border-radius: 14px;
  padding: 2rem;
  width: 100%;
  max-width: 540px;
  max-height: 88vh;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0,0,0,.22);
}
.modal-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.4rem; }
.modal-hdr h2 { font-size: .98rem; font-weight: 600; }
.modal-close { font-size: 1.3rem; color: var(--gyl); line-height: 1; }
.modal-close:hover { color: var(--dk); }
.dlabel { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--gyl); margin-bottom: .35rem; }
.dtext  { background: var(--bg); border-radius: 8px; padding: .85rem 1rem; font-size: .87rem; line-height: 1.75; color: var(--dk); margin-bottom: 1.2rem; white-space: pre-wrap; word-break: break-word; }
.ddate  { font-size: .85rem; color: var(--gy); margin-bottom: 1.1rem; }
.chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1.2rem; }
.chip  { background: #FEF0E8; color: var(--or-d); border-radius: 8px; padding: .3rem .75rem; font-size: .76rem; font-weight: 500; }
.form-row { display: flex; flex-direction: column; gap: .35rem; margin-bottom: .9rem; }
.form-row label { font-size: .73rem; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--gy); }
.form-row select, .form-row textarea {
  border: 1.5px solid var(--bd);
  border-radius: 8px;
  padding: .65rem .9rem;
  font-family: inherit;
  font-size: .87rem;
  background: var(--bg);
  color: var(--dk);
  transition: border-color .15s;
}
.form-row select:focus, .form-row textarea:focus { outline: none; border-color: var(--or); background: var(--wh); }
.form-row textarea { min-height: 75px; resize: vertical; }
.save-btn {
  background: var(--or);
  color: var(--wh);
  border-radius: 8px;
  padding: .7rem 1.5rem;
  font-size: .87rem;
  font-weight: 600;
  transition: background .15s;
}
.save-btn:hover { background: var(--or-d); }

/* TOAST */
#toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: .85rem 1.2rem;
  border-radius: 10px;
  font-size: .84rem;
  font-weight: 500;
  z-index: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,.14);
  display: none;
  align-items: center;
  gap: .55rem;
  max-width: 320px;
}
#toast.show { display: flex; }
#toast.ok   { background: #F0FDF4; color: var(--gr); border: 1px solid #BBF7D0; }
#toast.err  { background: #FEF2F2; color: var(--rd); border: 1px solid #FECACA; }

/* MEDIA VIEWER */
.media-item {
  background: var(--bg);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: .85rem;
  margin-bottom: .75rem;
}
.media-label {
  font-size: .78rem;
  font-weight: 600;
  color: var(--gyl);
  margin-bottom: .5rem;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.media-item img { max-width: 100%; max-height: 300px; border-radius: 8px; cursor: pointer; }
.media-item img:hover { opacity: .9; }
#m-chips { display: flex; flex-direction: column; gap: 0; }

/* MODAL ACTIONS */
.modal-actions { display: flex; gap: .75rem; margin-top: 1.25rem; flex-wrap: wrap; }
.modal-actions button { flex: 1; min-width: 120px; }
.delete-btn {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: .65rem 1.2rem;
  font-size: .92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}
.delete-btn:hover { background: #b91c1c; }
.delete-btn:disabled { background: #f87171; cursor: not-allowed; }

/* CONFIRMATION */
.confirm-box {
  display: none;
  background: #fff3f3;
  border: 1px solid #fca5a5;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-top: 1rem;
}
.confirm-box.visible { display: block; }
.confirm-box p { margin: 0 0 .85rem; font-size: .92rem; color: #7f1d1d; font-weight: 500; }
.confirm-actions { display: flex; gap: .6rem; }
.confirm-cancel {
  flex: 1; padding: .55rem 1rem;
  border: 1px solid #d1d5db; border-radius: 7px;
  background: #fff; cursor: pointer; font-size: .9rem; font-weight: 500;
}
.confirm-cancel:hover { background: #f3f4f6; }
.confirm-ok {
  flex: 1; padding: .55rem 1rem;
  border: none; border-radius: 7px;
  background: #dc2626; color: #fff;
  cursor: pointer; font-size: .9rem; font-weight: 600;
}
.confirm-ok:hover { background: #b91c1c; }

/* RESPONSIVE */
@media (max-width: 900px) {
  .stats   { grid-template-columns: repeat(2, 1fr); }
  .sidebar { width: 180px; }
  .main    { margin-left: 180px; }
}

@media (max-width: 640px) {
  .hamburger { display: flex; }
  .sidebar { transform: translateX(-100%); width: 240px; }
  .sidebar.open { transform: translateX(0); }
  .main { margin-left: 0; padding: 1rem; padding-top: 4rem; }
  .stats { grid-template-columns: repeat(2, 1fr); gap: .6rem; }
  .stat-card { padding: .9rem 1rem; }
  .stat-card .n { font-size: 1.5rem; }
  thead th:nth-child(3), tbody td:nth-child(3),
  thead th:nth-child(5), tbody td:nth-child(5) { display: none; }
  .td-msg { max-width: 140px; }
  .modal { padding: 1.2rem; }
  #toast { left: 1rem; right: 1rem; bottom: 1rem; max-width: none; }
}
"""

# ============ JS ============
js = r"""'use strict';

const API = '';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function mkBadge(s) {
  const labels = { nouveau: 'Nouveau', en_cours: 'En cours', traite: 'Traité', archive: 'Archivé' };
  return `<span class="badge b-${esc(s)}">${esc(labels[s] || s)}</span>`;
}

function toast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `show ${ok ? 'ok' : 'err'}`;
  setTimeout(() => { t.className = ''; }, 3200);
}

async function api(method, path, body) {
  const opt = { method, credentials: 'include', headers: {} };
  if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(API + path, opt);
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, data: d };
}

const $ = id => document.getElementById(id);

let page    = 1;
let statut  = '';
let modalId = null;

// Hamburger
const hamburger = $('hamburger-btn');
const sidebar   = $('sidebar');
const overlay   = $('sidebar-overlay');

function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('open'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
overlay.addEventListener('click', closeSidebar);

(async () => {
  const { data } = await api('GET', '/api/admin/me');
  if (data.admin) showAdmin();
})();

async function doLogin() {
  const u   = $('usr').value.trim();
  const p   = $('pwd').value;
  const err = $('login-err');
  err.style.display = 'none';
  if (!u || !p) { err.textContent = 'Remplissez tous les champs.'; err.style.display = 'block'; return; }
  const lb = $('login-btn');
  lb.disabled = true; lb.textContent = 'Connexion…';
  const { ok, data } = await api('POST', '/api/admin/login', { username: u, password: p });
  lb.disabled = false; lb.textContent = 'Se connecter';
  if (ok) { showAdmin(); } else { err.textContent = data.message || 'Identifiants incorrects.'; err.style.display = 'block'; }
}

function showAdmin() {
  $('login-screen').style.display = 'none';
  $('admin-screen').style.display = 'block';
  loadStats();
  loadRecent();
}

$('login-btn').addEventListener('click', doLogin);
$('pwd').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('logout-btn').addEventListener('click', async () => { await api('POST', '/api/admin/logout'); location.reload(); });

document.querySelectorAll('.sb-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.view === 'dashboard' ? 'view-dashboard' : 'view-temoignages').classList.add('active');
    if (btn.dataset.view === 'temoignages') loadList();
    closeSidebar();
  });
});

async function loadStats() {
  const { ok, data } = await api('GET', '/api/admin/stats');
  if (!ok) return;
  $('s-total').textContent   = data.total    ?? '—';
  $('s-nouveau').textContent = data.nouveaux ?? '—';
  $('s-encours').textContent = data.en_cours ?? '—';
  $('s-traite').textContent  = data.traites  ?? '—';
  $('refresh-time').textContent = 'Actualisé à ' + new Date().toLocaleTimeString('fr-FR');
}

async function loadRecent() {
  const el = $('recent-body');
  el.innerHTML = '<div class="placeholder"><p>Chargement…</p></div>';
  const { ok, data } = await api('GET', '/api/admin/temoignages?page=1');
  if (!ok) { el.innerHTML = '<div class="placeholder"><p>Erreur de chargement.</p></div>'; return; }
  el.innerHTML = renderTable(data.rows);
  bindOpenBtns(el);
}

async function loadList() {
  const el = $('list-body');
  el.innerHTML = '<div class="placeholder"><p>Chargement…</p></div>';
  const q = statut ? `&statut=${statut}` : '';
  const { ok, data } = await api('GET', `/api/admin/temoignages?page=${page}${q}`);
  if (!ok) { el.innerHTML = '<div class="placeholder"><p>Erreur.</p></div>'; return; }
  el.innerHTML = renderTable(data.rows) + renderPager(data);
  bindOpenBtns(el);
  bindPager(el, data);
}

function renderTable(rows) {
  if (!rows.length) return `<div class="placeholder"><div class="ico">💬</div><p>Aucun témoignage.</p></div>`;
  const lignes = rows.map(r => {
    const nb = (() => { try { return JSON.parse(r.fichiers_json || '[]').length; } catch { return 0; } })();
    return `<tr>
      <td>${esc(String(r.id))}</td>
      <td class="td-msg"><p>${esc(r.apercu || '(fichier seul)')}</p></td>
      <td>${nb ? nb + ' fichier' + (nb > 1 ? 's' : '') : '—'}</td>
      <td>${mkBadge(r.statut)}</td>
      <td style="white-space:nowrap;font-size:.8rem">${fmtDate(r.date_envoi)}</td>
      <td><button class="btn-open" data-id="${esc(String(r.id))}">Ouvrir</button></td>
    </tr>`;
  }).join('');
  return `<table><thead><tr><th>#</th><th>Message</th><th>Fichiers</th><th>Statut</th><th>Date</th><th></th></tr></thead><tbody>${lignes}</tbody></table>`;
}

function renderPager(d) {
  if (d.pages <= 1) return '';
  return `<div class="pager">
    <span>${d.total} témoignage${d.total > 1 ? 's' : ''}</span>
    <div class="pager-btns">
      <button class="p-btn" data-dir="-1" ${d.page <= 1 ? 'disabled' : ''}>‹ Préc.</button>
      <span style="font-size:.8rem;padding:0 .5rem">${d.page} / ${d.pages}</span>
      <button class="p-btn" data-dir="1" ${d.page >= d.pages ? 'disabled' : ''}>Suiv. ›</button>
    </div>
  </div>`;
}

function bindOpenBtns(el) {
  el.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)));
  });
}

function bindPager(el, d) {
  el.querySelectorAll('[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      page = Math.max(1, Math.min(d.pages, page + parseInt(btn.dataset.dir)));
      loadList();
    });
  });
}

$('filters').addEventListener('click', e => {
  const btn = e.target.closest('.f-btn');
  if (!btn) return;
  document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  statut = btn.dataset.statut;
  page = 1;
  loadList();
});

async function openModal(id) {
  modalId = id;
  $('m-id').textContent  = '#' + id;
  $('m-msg').textContent = 'Chargement…';
  $('modal-bg').classList.add('open');
  const { ok, data } = await api('GET', `/api/admin/temoignages/${id}`);
  if (!ok) { $('m-msg').textContent = 'Erreur de chargement.'; return; }
  $('m-date').textContent = '📅 ' + fmtDate(data.date_envoi);
  $('m-msg').textContent  = data.message || '(aucun texte)';
  $('m-statut').value     = data.statut  || 'nouveau';
  $('m-notes').value      = data.notes_admin || '';

  const fichiers = (() => { try { return JSON.parse(data.fichiers_json || '[]'); } catch { return []; } })();
  const fw = $('m-files-wrap');

  if (fichiers.length) {
    fw.style.display = '';
    $('m-chips').innerHTML = fichiers.map(f => {
      const url    = f.url || (f.nom ? `/uploads/${encodeURIComponent(f.nom)}` : '');
      const taille = f.taille ? Math.round(f.taille / 1024) + ' ko' : '';
      const type   = f.type || '';
      const nom    = f.nom || 'fichier';
      if (type.startsWith('image/')) {
        return `<div class="media-item">
          <div class="media-label">Image${taille ? ' — ' + taille : ''}</div>
          <img src="${esc(url)}" alt="Pièce jointe" onclick="window.open('${esc(url)}','_blank')">
        </div>`;
      } else if (type.startsWith('video/')) {
        return `<div class="media-item">
          <div class="media-label">Vidéo${taille ? ' — ' + taille : ''}</div>
          <video controls style="max-width:100%;max-height:300px;border-radius:8px;">
            <source src="${esc(url)}" type="${esc(type)}">
          </video>
        </div>`;
      } else if (type.startsWith('audio/')) {
        return `<div class="media-item">
          <div class="media-label">Audio${taille ? ' — ' + taille : ''}</div>
          <audio controls style="width:100%;margin-top:6px;">
            <source src="${esc(url)}" type="${esc(type)}">
          </audio>
        </div>`;
      } else {
        return `<span class="chip">${esc(nom)} — ${taille}</span>`;
      }
    }).join('');
  } else {
    fw.style.display = 'none';
  }
}

function closeModal() {
  $('modal-bg').classList.remove('open');
  $('confirm-box').classList.remove('visible');
  modalId = null;
}

$('modal-close').addEventListener('click', closeModal);
$('modal-bg').addEventListener('click', e => { if (e.target === $('modal-bg')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

$('m-save').addEventListener('click', async () => {
  if (!modalId) return;
  const { ok, data } = await api('PATCH', `/admin/temoignages/${modalId}`, {
    statut: $('m-statut').value,
    notes: $('m-notes').value.trim().slice(0, 2000)
  });
  if (ok) { toast('Mis à jour avec succès.'); closeModal(); loadStats(); loadList(); }
  else { toast(data.message || 'Erreur lors de la mise à jour.', false); }
});

$('m-delete').addEventListener('click', () => { if (!modalId) return; $('confirm-box').classList.add('visible'); });
$('confirm-cancel').addEventListener('click', () => { $('confirm-box').classList.remove('visible'); });

$('confirm-ok').addEventListener('click', async () => {
  $('confirm-box').classList.remove('visible');
  const btn = $('m-delete');
  btn.disabled = true; btn.textContent = 'Suppression…';
  const { ok, data } = await api('DELETE', `/api/admin/temoignages/${modalId}`);
  btn.disabled = false; btn.textContent = 'Supprimer';
  if (ok) { toast('Témoignage supprimé.'); closeModal(); loadStats(); loadList(); }
  else { toast(data.message || 'Erreur lors de la suppression.', false); }
});
"""

# Écrire les fichiers
with open(os.path.join(ADMIN_DIR, 'admin.css'), 'w') as f:
    f.write(css)
print("admin.css écrit")

with open(os.path.join(ADMIN_DIR, 'admin.js'), 'w') as f:
    f.write(js)
print("admin.js écrit")

print("TERMINÉ")
