/* =============================================
   ADMIN DASHBOARD — admin.js
   ============================================= */

const STORAGE_KEY = 'invitation_guests';

// ── Éléments DOM ────────────────────────────
const statResponses   = document.getElementById('stat-responses');
const statPresent     = document.getElementById('stat-present');
const statAbsent      = document.getElementById('stat-absent');
const statTotal       = document.getElementById('stat-total');
const statLast        = document.getElementById('stat-last');
const searchInput     = document.getElementById('search-input');
const resultCount     = document.getElementById('result-count');
const guestsBody      = document.getElementById('guests-body');
const emptyState      = document.getElementById('empty-state');
const noResults       = document.getElementById('no-results');
const btnExport       = document.getElementById('btn-export');

// Modal edit
const modalEditBackdrop = document.getElementById('modal-edit-backdrop');
const modalEditClose    = document.getElementById('modal-edit-close');
const editCancel        = document.getElementById('edit-cancel');
const editForm          = document.getElementById('edit-form');
const editId            = document.getElementById('edit-id');
const editName          = document.getElementById('edit-name');
const editGuests        = document.getElementById('edit-guests');
const editMessage       = document.getElementById('edit-message');
const editErrorName     = document.getElementById('edit-error-name');
const editErrorGuests   = document.getElementById('edit-error-guests');

// Modal delete
const modalDeleteBackdrop = document.getElementById('modal-delete-backdrop');
const deleteNamePreview   = document.getElementById('delete-name-preview');
const deleteCancel        = document.getElementById('delete-cancel');
const deleteConfirm       = document.getElementById('delete-confirm');

// ─────────────────────────────────────────────
//  STOCKAGE
// ─────────────────────────────────────────────
function getGuests() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveGuests(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─────────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────────
function updateStats(list) {
  const totalPersonnes = list.reduce((sum, g) => sum + (g.guests || 0), 0);
  const presentCount = list.filter(g => g.status !== 'absent').length;
  const absentCount = list.filter(g => g.status === 'absent').length;
  statResponses.textContent = list.length;
  statPresent.textContent   = presentCount;
  statAbsent.textContent    = absentCount;
  statTotal.textContent     = totalPersonnes;

  if (list.length > 0) {
    const last = list[list.length - 1];
    const d = new Date(last.createdAt);
    statLast.textContent = d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  } else {
    statLast.textContent = '—';
  }
}

// ─────────────────────────────────────────────
//  FORMATAGE DATE
// ─────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ─────────────────────────────────────────────
//  RENDU DU TABLEAU
// ─────────────────────────────────────────────
function renderTable(list) {
  const all = getGuests();
  updateStats(all);

  guestsBody.innerHTML = '';
  emptyState.classList.add('hidden');
  noResults.classList.add('hidden');

  if (all.length === 0) {
    emptyState.classList.remove('hidden');
    resultCount.textContent = '';
    return;
  }

  if (list.length === 0) {
    noResults.classList.remove('hidden');
    resultCount.textContent = '0 résultat';
    return;
  }

  resultCount.textContent = list.length === all.length
    ? `${list.length} participant${list.length > 1 ? 's' : ''}`
    : `${list.length} résultat${list.length > 1 ? 's' : ''}`;

  list.forEach((guest, index) => {
    const globalIndex = all.findIndex(g => g.id === guest.id);
    const isPresent = guest.status !== 'absent';
    const statusBadge = isPresent
      ? '<span class="badge-present">Présent</span>'
      : '<span class="badge-absent">Absent</span>';
    const guestsBadge = isPresent
      ? `<span class="badge-guests">👤 ${guest.guests || 0}</span>`
      : '<span class="badge-guests badge-guests-na">—</span>';
    const messageText = guest.message
      ? `<span class="td-message-text">${escapeHtml(guest.message)}</span>`
      : '<span class="td-message-empty">—</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-num">${globalIndex + 1}</td>
      <td class="td-name">${escapeHtml(guest.fullName)}</td>
      <td>${statusBadge}</td>
      <td>${guestsBadge}</td>
      <td class="td-message">${messageText}</td>
      <td class="td-date">${formatDate(guest.createdAt)}</td>
      <td>
        <div class="td-actions">
          <button class="btn-edit" data-id="${guest.id}">
            ✏️ Modifier
          </button>
          <button class="btn-delete" data-id="${guest.id}" data-name="${escapeHtml(guest.fullName)}">
            🗑️ Supprimer
          </button>
        </div>
      </td>
    `;
    guestsBody.appendChild(tr);
  });

  guestsBody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id));
  });

  guestsBody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openDelete(btn.dataset.id, btn.dataset.name));
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────
//  RECHERCHE
// ─────────────────────────────────────────────
function filterGuests(query) {
  const all = getGuests();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(g => g.fullName.toLowerCase().includes(q));
}

searchInput.addEventListener('input', () => {
  renderTable(filterGuests(searchInput.value));
});

// ─────────────────────────────────────────────
//  MODAL MODIFIER
// ─────────────────────────────────────────────
function openEdit(id) {
  const guest = getGuests().find(g => String(g.id) === String(id));
  if (!guest) return;

  editId.value       = guest.id;
  editName.value     = guest.fullName;
  editGuests.value   = guest.guests || 0;
  editMessage.value  = guest.message || '';
  editErrorName.textContent   = '';
  editErrorGuests.textContent = '';
  editName.classList.remove('invalid');
  editGuests.classList.remove('invalid');

  modalEditBackdrop.classList.remove('hidden');
  setTimeout(() => editName.focus(), 50);
}

function closeEdit() {
  modalEditBackdrop.classList.add('hidden');
}

modalEditClose.addEventListener('click', closeEdit);
editCancel.addEventListener('click', closeEdit);
modalEditBackdrop.addEventListener('click', e => { if (e.target === modalEditBackdrop) closeEdit(); });

editForm.addEventListener('submit', e => {
  e.preventDefault();
  let valid = true;

  if (editName.value.trim().length < 2) {
    editErrorName.textContent = 'Nom trop court.';
    editName.classList.add('invalid');
    valid = false;
  } else {
    editErrorName.textContent = '';
    editName.classList.remove('invalid');
  }

  const n = parseInt(editGuests.value, 10);
  if (!editGuests.value || isNaN(n) || n < 0 || n > 20) {
    editErrorGuests.textContent = 'Nombre entre 0 et 20.';
    editGuests.classList.add('invalid');
    valid = false;
  } else {
    editErrorGuests.textContent = '';
    editGuests.classList.remove('invalid');
  }

  if (!valid) return;

  const list = getGuests().map(g => {
    if (String(g.id) === String(editId.value)) {
      return { ...g, fullName: editName.value.trim(), guests: n, message: editMessage.value.trim() };
    }
    return g;
  });

  saveGuests(list);
  closeEdit();
  renderTable(filterGuests(searchInput.value));
});

// ─────────────────────────────────────────────
//  MODAL SUPPRIMER
// ─────────────────────────────────────────────
let pendingDeleteId = null;

function openDelete(id, name) {
  pendingDeleteId = id;
  deleteNamePreview.textContent = name;
  modalDeleteBackdrop.classList.remove('hidden');
}

function closeDelete() {
  modalDeleteBackdrop.classList.add('hidden');
  pendingDeleteId = null;
}

deleteCancel.addEventListener('click', closeDelete);
modalDeleteBackdrop.addEventListener('click', e => { if (e.target === modalDeleteBackdrop) closeDelete(); });

deleteConfirm.addEventListener('click', () => {
  if (!pendingDeleteId) return;
  const list = getGuests().filter(g => String(g.id) !== String(pendingDeleteId));
  saveGuests(list);
  closeDelete();
  renderTable(filterGuests(searchInput.value));
});

// ─────────────────────────────────────────────
//  EXPORT CSV
// ─────────────────────────────────────────────
btnExport.addEventListener('click', () => {
  const list = getGuests();
  if (list.length === 0) {
    alert('Aucun participant à exporter.');
    return;
  }

  const headers = ['Nom & Prénom', 'Statut', 'Nombre de personnes', 'Message', 'Date de réponse'];
  const rows = list.map(g => [
    `"${g.fullName.replace(/"/g, '""')}"`,
    g.status === 'absent' ? 'Absent' : 'Présent',
    g.guests || 0,
    `"${(g.message || '').replace(/"/g, '""')}"`,
    `"${formatDate(g.createdAt)}"`
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `invites_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
renderTable(getGuests());

window.addEventListener('focus', () => {
  renderTable(filterGuests(searchInput.value));
});
