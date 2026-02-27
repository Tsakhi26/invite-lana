/* =============================================
   INVITATION — app.js
   États : idle → playing → ended
   ============================================= */

// ── Éléments DOM ────────────────────────────
const sceneEnvelope  = document.getElementById('scene-envelope');
const sceneVideo     = document.getElementById('scene-video');
const btnOpen        = document.getElementById('btn-open');
const video          = document.getElementById('invite-video');
const rsvpOverlay    = document.getElementById('rsvp-overlay');
const btnRsvpYes     = document.getElementById('btn-rsvp-yes');
const btnRsvpNo      = document.getElementById('btn-rsvp-no');
const modalBackdrop  = document.getElementById('modal-backdrop');
const modalClose     = document.getElementById('modal-close');
const modalTitle     = document.getElementById('modal-title');
const modalSubtitle  = document.querySelector('.modal-subtitle');
const rsvpForm       = document.getElementById('rsvp-form');
const inputName      = document.getElementById('input-name');
const inputGuests    = document.getElementById('input-guests');
const groupGuests    = document.getElementById('group-guests');
const inputMessage   = document.getElementById('input-message');
const errorName      = document.getElementById('error-name');
const errorGuests    = document.getElementById('error-guests');
const modalSuccess   = document.getElementById('modal-success');

// ── État actuel ──────────────────────────────
let state = 'idle'; // 'idle' | 'playing' | 'ended'
let rsvpMode = 'present'; // 'present' | 'absent'

// ─────────────────────────────────────────────
//  ÉTAPE 1 : Clic sur l'enveloppe → lance la vidéo
// ─────────────────────────────────────────────
btnOpen.addEventListener('click', () => {
  if (state !== 'idle') return;
  state = 'playing';

  sceneEnvelope.style.display = 'none';

  sceneVideo.style.display    = 'flex';
  sceneVideo.style.visibility = 'visible';
  sceneVideo.style.opacity    = '1';

  const playPromise = video.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => { /* Lecture OK */ })
      .catch((err) => {
        console.warn('Autoplay bloqué :', err);
        showPlayFallback();
      });
  }
});

// ─────────────────────────────────────────────
//  ÉTAPE 2 : Boutons RSVP après 12 secondes
// ─────────────────────────────────────────────
let rsvpTimer = null;

video.addEventListener('play', () => {
  if (rsvpTimer) return;
  rsvpTimer = setTimeout(() => {
    if (state === 'playing' || state === 'ended') {
      showRsvp();
    }
  }, 12000);
});

video.addEventListener('ended', () => {
  state = 'ended';
  video.pause();
  if (rsvpTimer) {
    clearTimeout(rsvpTimer);
    rsvpTimer = null;
  }
  showRsvp();
});

function showRsvp() {
  const btnDownload = document.getElementById('btn-download');
  if (btnDownload) btnDownload.classList.remove('hidden');

  rsvpOverlay.classList.remove('hidden');
  rsvpOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rsvpOverlay.classList.add('visible');
    });
  });
}

function showPlayFallback() {
  const btn = document.createElement('button');
  btn.id        = 'play-fallback';
  btn.innerHTML = '▶';
  btn.style.cssText = `
    position:absolute; inset:0; margin:auto;
    width:80px; height:80px; border-radius:50%;
    background:rgba(255,255,255,0.2); border:3px solid #fff;
    color:#fff; font-size:28px; cursor:pointer; z-index:20;
    backdrop-filter:blur(6px); transition:transform .2s,background .2s;
  `;
  btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.35)');
  btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.2)');
  btn.addEventListener('click', () => {
    btn.remove();
    video.play().catch(console.warn);
  });
  sceneVideo.appendChild(btn);
}

// ─────────────────────────────────────────────
//  BOUTON TÉLÉCHARGER
// ─────────────────────────────────────────────
document.getElementById('btn-download').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href     = '/img/FairePartLana.pdf';
  a.download = 'FairePartLana.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// ─────────────────────────────────────────────
//  ÉTAPE 3 : Boutons RSVP — Présent / Absent
// ─────────────────────────────────────────────
btnRsvpYes.addEventListener('click', () => openModal('present'));
btnRsvpNo.addEventListener('click', () => openModal('absent'));

// ─────────────────────────────────────────────
//  MODAL : ouverture / fermeture
// ─────────────────────────────────────────────
function openModal(mode) {
  rsvpMode = mode;
  resetForm();

  if (mode === 'present') {
    modalTitle.textContent = 'Confirmer ma présence';
    modalSubtitle.textContent = 'Remplissez les champs ci-dessous pour valider votre venue.';
    groupGuests.style.display = '';
    inputGuests.required = true;
  } else {
    modalTitle.textContent = 'Signaler mon absence';
    modalSubtitle.textContent = 'Dommage ! Laissez-nous votre nom pour que nous sachions.';
    groupGuests.style.display = 'none';
    inputGuests.required = false;
  }

  modalBackdrop.classList.remove('hidden');
  setTimeout(() => inputName.focus(), 50);
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

modalClose.addEventListener('click', closeModal);

modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ─────────────────────────────────────────────
//  FORMULAIRE RSVP : validation & sauvegarde
// ─────────────────────────────────────────────
rsvpForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const guest = {
    id:        Date.now(),
    fullName:  inputName.value.trim(),
    guests:    rsvpMode === 'present' ? parseInt(inputGuests.value, 10) : 0,
    status:    rsvpMode,
    message:   inputMessage.value.trim() || '',
    createdAt: new Date().toISOString(),
  };

  saveGuest(guest);
  showSuccess();
});

function validateForm() {
  let valid = true;

  if (inputName.value.trim().length < 2) {
    errorName.textContent = 'Veuillez entrer votre nom et prénom.';
    inputName.classList.add('invalid');
    valid = false;
  } else {
    errorName.textContent = '';
    inputName.classList.remove('invalid');
  }

  if (rsvpMode === 'present') {
    const n = parseInt(inputGuests.value, 10);
    if (!inputGuests.value || isNaN(n) || n < 1 || n > 20) {
      errorGuests.textContent = 'Entrez un nombre entre 1 et 20.';
      inputGuests.classList.add('invalid');
      valid = false;
    } else {
      errorGuests.textContent = '';
      inputGuests.classList.remove('invalid');
    }
  }

  return valid;
}

// ─────────────────────────────────────────────
//  STOCKAGE localStorage
// ─────────────────────────────────────────────
const STORAGE_KEY = 'invitation_guests';

function saveGuest(guest) {
  const list = getGuests();
  list.push(guest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getGuests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
//  SUCCÈS
// ─────────────────────────────────────────────
function showSuccess() {
  rsvpForm.classList.add('hidden');
  modalSuccess.classList.remove('hidden');

  if (rsvpMode === 'present') {
    launchConfetti();
    playConfettiSound();
  }

  setTimeout(() => {
    closeModal();
    if (rsvpMode === 'present') {
      btnRsvpYes.textContent = 'Présence confirmée !';
      btnRsvpYes.disabled = true;
    } else {
      btnRsvpNo.textContent = 'Absence notée';
      btnRsvpNo.disabled = true;
    }
  }, 3000);
}

function resetForm() {
  rsvpForm.classList.remove('hidden');
  modalSuccess.classList.add('hidden');
  rsvpForm.reset();
  errorName.textContent   = '';
  errorGuests.textContent = '';
  inputName.classList.remove('invalid');
  inputGuests.classList.remove('invalid');
}

// ─────────────────────────────────────────────
//  CONFETTI ANIMATION
// ─────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#ff7a20', '#e8620a', '#ffd700', '#ff4081', '#7c4dff', '#00e676', '#ff6d00', '#2979ff', '#f50057', '#ffea00'];
  const confettiCount = 150;
  const pieces = [];

  for (let i = 0; i < confettiCount; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 180; // ~3 seconds at 60fps

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fade out in the last 60 frames
    const fadeStart = maxFrames - 60;

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // gravity
      p.rot += p.rotSpeed;

      if (frame > fadeStart) {
        p.opacity = Math.max(0, 1 - (frame - fadeStart) / 60);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

// ─────────────────────────────────────────────
//  CONFETTI SOUND (petit son de fête)
// ─────────────────────────────────────────────
function playConfettiSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Quick burst of celebration notes
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + i * 0.08);
      osc.stop(audioCtx.currentTime + i * 0.08 + 0.4);
    });
  } catch {
    // Audio not supported — silently ignore
  }
}
