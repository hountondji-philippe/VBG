'use strict';

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

// Hamburger menu
const hamburger = $('hamburger-btn');
const sidebar   = $('sidebar');
const overlay   = $('sidebar-overlay');

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

hamburger.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

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

  if (!u || !p) {
    err.textContent   = 'Remplissez tous les champs.';
    err.style.display = 'block';
    return;
  }

  const lb = $('login-btn');
  lb.disabled    = true;
  lb.textContent = 'Connexion…';

  const { ok, data } = await api('POST', '/api/admin/login', { username: u, password: p });

  lb.disabled    = false;
  lb.textContent = 'Se connecter';

  if (ok) {
    showAdmin();
  } else {
    err.textContent   = data.message || 'Identifiants incorrects.';
    err.style.display = 'block';
  }
}

function showAdmin() {
  $('login-screen').style.display = 'none';
  $('admin-screen').style.display = 'block';
  loadStats();
  loadRecent();
}

$('login-btn').addEventListener('click', doLogin);
$('pwd').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

$('logout-btn').addEventListener('click', async () => {
  await api('POST', '/api/admin/logout');
  location.reload();
});

document.querySelectorAll('.sb-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    const viewId = btn.dataset.view === 'dashboard' ? 'view-dashboard' : 'view-temoignages';
    $(viewId).classList.add('active');
    if (btn.dataset.view === 'temoignages') loadList();
    closeSidebar();
  });
});

async function loadStats() {
  const { ok, data } = await api('GET', '/api/admin/stats');
  if (!ok) return;
  $('s-total').textContent    = data.total    ?? '—';
  $('s-nouveau').textContent  = data.nouveaux ?? '—';
  $('s-encours').textContent  = data.en_cours ?? '—';
  $('s-traite').textContent   = data.traites  ?? '—';
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
  if (!rows.length) {
    return `<div class="placeholder"><div class="ico">💬</div><p>Aucun témoignage.</p></div>`;
  }

  const lignes = rows.map(r => {
    const nb = (() => { try { return JSON.parse(r.fichiers_json || '[]').length; } catch { return 0; } })();
    return `
      <tr>
        <td>${esc(String(r.id))}</td>
        <td class="td-msg"><p>${esc(r.apercu || '(fichier seul)')}</p></td>
        <td>${nb ? nb + ' fichier' + (nb > 1 ? 's' : '') : '—'}</td>
        <td>${mkBadge(r.statut)}</td>
        <td style="white-space:nowrap;font-size:.8rem">${fmtDate(r.date_envoi)}</td>
        <td><button class="btn-open" data-id="${esc(String(r.id))}">Ouvrir</button></td>
      </tr>`;
  }).join('');

  return `
    <table>
      <thead>
        <tr><th>#</th><th>Message</th><th>Fichiers</th><th>Statut</th><th>Date</th><th></th></tr>
      </thead>
      <tbody>${lignes}</tbody>
    </table>`;
}

function renderPager(d) {
  if (d.pages <= 1) return '';
  return `
    <div class="pager">
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
  page   = 1;
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
      // Supporte URL Cloudinary (f.url) et ancien chemin local (f.nom)
      const url    = f.url || (f.nom ? `/uploads/${encodeURIComponent(f.nom)}` : '');
      const taille = f.taille ? Math.round(f.taille / 1024) + ' ko' : '';
      const type   = f.type || '';
      const nom    = f.nom || 'fichier';
      let mediaHtml = '';

      if (type.startsWith('image/')) {
        mediaHtml = `
          <div class="media-item">
            <div class="media-label">Image${taille ? ' — ' + taille : ''}</div>
            <img src="${esc(url)}" alt="Pièce jointe" onclick="window.open('${esc(url)}','_blank')">
          </div>`;
      } else if (type.startsWith('video/')) {
        mediaHtml = `
          <div class="media-item">
            <div class="media-label">Vidéo${taille ? ' — ' + taille : ''}</div>
            <video controls style="max-width:100%;max-height:300px;border-radius:8px;">
              <source src="${esc(url)}" type="${esc(type)}">
              Votre navigateur ne supporte pas la vidéo.
            </video>
          </div>`;
      } else if (type.startsWith('audio/')) {
        mediaHtml = `
          <div class="media-item">
            <div class="media-label">Audio${taille ? ' — ' + taille : ''}</div>
            <audio controls style="width:100%;margin-top:6px;">
              <source src="${esc(url)}" type="${esc(type)}">
              Votre navigateur ne supporte pas l'audio.
            </audio>
          </div>`;
      } else {
        mediaHtml = `<span class="chip">${esc(nom)} — ${taille}</span>`;
      }
      return mediaHtml;
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

  const statutVal = $('m-statut').value;
  const notes     = $('m-notes').value.trim().slice(0, 2000);

  const { ok, data } = await api('PATCH', `/api/admin/temoignages/${modalId}`, {
    statut: statutVal,
    notes
  });

  if (ok) {
    toast('Mis à jour avec succès.');
    closeModal();
    loadStats();
    loadList();
  } else {
    toast(data.message || 'Erreur lors de la mise à jour.', false);
  }
});

$('m-delete').addEventListener('click', () => {
  if (!modalId) return;
  $('confirm-box').classList.add('visible');
});

$('confirm-cancel').addEventListener('click', () => {
  $('confirm-box').classList.remove('visible');
});

$('confirm-ok').addEventListener('click', async () => {
  $('confirm-box').classList.remove('visible');

  const btn = $('m-delete');
  btn.disabled    = true;
  btn.textContent = 'Suppression…';

  const { ok, data } = await api('DELETE', `/api/admin/temoignages/${modalId}`);

  btn.disabled    = false;
  btn.textContent = 'Supprimer';

  if (ok) {
    toast('Témoignage supprimé.');
    closeModal();
    loadStats();
    loadList();
  } else {
    toast(data.message || 'Erreur lors de la suppression.', false);
  }
});
