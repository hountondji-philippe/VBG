'use strict';

const navbar      = document.getElementById('navbar');
const hamburger   = document.getElementById('hamburger');
const navMenu     = document.getElementById('navbar-nav');
const overlay     = document.getElementById('overlay');
const navLinks    = document.querySelectorAll('.nav-link');
const sections    = document.querySelectorAll('section[id]');
const form        = document.getElementById('temoignage-form');
const msgArea     = document.getElementById('msg');
const charCount   = document.getElementById('char-count');
const submitBtn   = document.getElementById('submit-btn');
const btnText     = document.getElementById('btn-text');
const btnLoader   = document.getElementById('btn-loader');
const previewArea = document.getElementById('preview-area');

let attachedFiles = [];

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

function openMenu() {
  navMenu.classList.add('open');
  hamburger.classList.add('open');
  overlay.classList.add('active');
  document.body.classList.add('no-scroll');
}

function closeMenu() {
  navMenu.classList.remove('open');
  hamburger.classList.remove('open');
  overlay.classList.remove('active');
  document.body.classList.remove('no-scroll');
}

hamburger.addEventListener('click', () => {
  navMenu.classList.contains('open') ? closeMenu() : openMenu();
});

overlay.addEventListener('click', closeMenu);

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeMenu();
  });
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeMenu();
});

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

sections.forEach(s => navObserver.observe(s));

if (msgArea) {
  msgArea.addEventListener('input', () => {
    const count = msgArea.value.length;
    charCount.textContent = `${count} / 5000 caractères`;
    charCount.style.color = count >= 4500 ? '#991b1b' : count >= 3500 ? '#854d0e' : '';
  });
}

function initFileInput(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('change', () => {
    Array.from(input.files).forEach(file => {
      if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) return;
      if (file.size > 50 * 1024 * 1024) {
        showToast(`⚠️ "${file.name}" dépasse 50 Mo.`, 'warning');
        return;
      }
      attachedFiles.push(file);
      renderPreview(file);
    });
    input.value = '';
  });
}

function renderPreview(file) {
  const icon = file.type.startsWith('image/') ? '🖼️'
             : file.type.startsWith('audio/') ? '🎵'
             : file.type.startsWith('video/') ? '🎬' : '📎';

  const name = file.name.length > 28 ? file.name.slice(0, 26) + '…' : file.name;

  const item = document.createElement('div');
  item.className = 'preview-item';
  item.innerHTML = `<span>${icon}</span><span>${name}</span><button type="button">✕</button>`;

  item.querySelector('button').addEventListener('click', () => {
    attachedFiles = attachedFiles.filter(f => !(f.name === file.name && f.size === file.size));
    item.remove();
  });

  previewArea.appendChild(item);
}

initFileInput('photo-input');
initFileInput('audio-input');
initFileInput('video-input');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = (msgArea.value || '').trim();

    if (!message && attachedFiles.length === 0) {
      showToast('⚠️ Veuillez saisir un message ou joindre un fichier.', 'warning');
      return;
    }

    if (message.length > 5000) {
      showToast('⚠️ Votre message dépasse 5000 caractères.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', message);
      attachedFiles.forEach(file => formData.append('fichiers', file));

      const response = await fetch('/api/temoignage', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        showToast('✅ Votre témoignage a été envoyé anonymement. Merci pour votre courage. Vous n\'êtes pas seul(e).', 'success');
        resetForm();
      } else {
        showToast(`❌ ${result.message || 'Une erreur est survenue. Veuillez réessayer.'}`, 'error');
      }
    } catch {
      showToast('❌ Impossible de contacter le serveur. Vérifiez votre connexion.', 'error');
    } finally {
      setLoading(false);
    }
  });
}

function setLoading(state) {
  submitBtn.disabled = state;
  btnText.hidden     = state;
  btnLoader.hidden   = !state;
}

function resetForm() {
  msgArea.value         = '';
  charCount.textContent = '0 / 5000 caractères';
  charCount.style.color = '';
  attachedFiles         = [];
  previewArea.innerHTML = '';
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('vbg-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id        = 'vbg-toast';
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span>${message}</span><button class="toast-close">✕</button>`;

  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 6000);
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = window.scrollY + target.getBoundingClientRect().top - navbar.offsetHeight - 10;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});