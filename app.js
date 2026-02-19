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
const rsvpForm       = document.getElementById('rsvp-form');
const inputName      = document.getElementById('input-name');
const inputGuests    = document.getElementById('input-guests');
const errorName      = document.getElementById('error-name');
const errorGuests    = document.getElementById('error-guests');
const modalSuccess   = document.getElementById('modal-success');

// ── État actuel ──────────────────────────────
let state = 'idle'; // 'idle' | 'playing' | 'ended'

// ─────────────────────────────────────────────
//  ÉTAPE 1 : Clic sur l'enveloppe → lance la vidéo
// ─────────────────────────────────────────────
btnOpen.addEventListener('click', () => {
  if (state !== 'idle') return;
  state = 'playing';

  // Disparition instantanée de l'enveloppe — pas de fondu
  sceneEnvelope.style.display = 'none';

  // Affiche immédiatement la scène vidéo
  sceneVideo.style.display    = 'flex';
  sceneVideo.style.visibility = 'visible';
  sceneVideo.style.opacity    = '1';

  // Lance la vidéo immédiatement (vrai clic → autoplay autorisé)
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

// Déclenché au lancement de la vidéo — affiche les boutons à 12s
video.addEventListener('play', () => {
  if (rsvpTimer) return; // évite les doublons
  rsvpTimer = setTimeout(() => {
    if (state === 'playing' || state === 'ended') {
      showRsvp();
    }
  }, 12000);
});

// Fallback : si la vidéo se termine avant 12s, on affiche quand même
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
  // Bouton télécharger — haut gauche
  const btnDownload = document.getElementById('btn-download');
  if (btnDownload) btnDownload.classList.remove('hidden');

  // Bouton Je participe — bas centré
  rsvpOverlay.classList.remove('hidden');
  rsvpOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rsvpOverlay.classList.add('visible');
    });
  });
}

// Fallback si autoplay bloqué : affiche un bouton play par-dessus la vidéo
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
//  BOUTON TÉLÉCHARGER — même domaine, lien direct
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
//  ÉTAPE 3 : Boutons RSVP
// ─────────────────────────────────────────────
btnRsvpYes.addEventListener('click', () => openModal());

// Bouton "Je ne peux pas" supprimé

// ─────────────────────────────────────────────
//  MODAL : ouverture / fermeture
// ─────────────────────────────────────────────
function openModal() {
  resetForm();
  modalBackdrop.classList.remove('hidden');
  // Focus sur le premier champ (accessibilité)
  setTimeout(() => inputName.focus(), 50);
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

modalClose.addEventListener('click', closeModal);

// Clic en dehors du modal → ferme
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

// Touche Escape → ferme
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
    guests:    parseInt(inputGuests.value, 10),
    createdAt: new Date().toISOString(),
  };

  saveGuest(guest);
  showSuccess();
});

function validateForm() {
  let valid = true;

  // Nom
  if (inputName.value.trim().length < 2) {
    errorName.textContent = 'Veuillez entrer votre nom et prénom.';
    inputName.classList.add('invalid');
    valid = false;
  } else {
    errorName.textContent = '';
    inputName.classList.remove('invalid');
  }

  // Nombre de personnes
  const n = parseInt(inputGuests.value, 10);
  if (!inputGuests.value || isNaN(n) || n < 1 || n > 20) {
    errorGuests.textContent = 'Entrez un nombre entre 1 et 20.';
    inputGuests.classList.add('invalid');
    valid = false;
  } else {
    errorGuests.textContent = '';
    inputGuests.classList.remove('invalid');
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

  // Ferme le modal automatiquement après 3 s
  setTimeout(() => {
    closeModal();
    // Met à jour le bouton
    btnRsvpYes.textContent = '✅ Présence confirmée !';
    btnRsvpYes.disabled = true;
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
