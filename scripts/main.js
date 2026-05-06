// =============================================================================
// BOOT
// Restores a saved session if present; otherwise just renders the chat list
// (the login screen has already been revealed by the inline script in index.html).
// =============================================================================

(function restoreSession() {
  let saved = null;
  try { saved = localStorage.getItem('dchat:user'); } catch (_) {}
  if (saved) {
    PENDING_LOGIN_EMAIL = saved;
    finalizeLogin({ animate: false });
  } else {
    renderChats();
  }
})();
