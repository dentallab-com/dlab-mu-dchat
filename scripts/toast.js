// =============================================================================
// TOAST + THEME + GENERIC MODAL CLOSE
// Small UI primitives used across the app.
// =============================================================================

const TOAST_DURATION_MS = 3500;

function toastIconHtml(type) {
  if (type === 'success') {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>';
  }
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
}

function showToast(title, body, type = 'success') {
  if (typeof body !== 'string') { type = body || 'success'; body = ''; }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <div class="toast-icon">${toastIconHtml(type)}</div>
    <div class="toast-text">
      ${body ? '<b>' + title + '</b>' + body : title}
    </div>
  `;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 250);
  }, TOAST_DURATION_MS);
}

function toggleTheme() {
  STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', STATE.theme);
  document.getElementById('themeIcon').innerHTML = STATE.theme === 'dark'
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}
