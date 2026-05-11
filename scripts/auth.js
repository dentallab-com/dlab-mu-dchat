// =============================================================================
// AUTH (login + OTP + logout)
// Demo OTP is hardcoded to 123456. State changes happen via finalizeLogin.
// =============================================================================

const DEMO_OTP = '123456';
let PENDING_LOGIN_EMAIL = null;

// ---------- Login flow ----------

function loginAs(email) {
  document.getElementById('emailInput').value = email;
  sendOtp();
}

function sendOtp() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  if (!email) {
    showToast('Please enter your email', 'error');
    return;
  }
  if (!isLoginAllowed(email)) {
    showToast('Email not whitelisted', 'Only @dentallab.com or whitelisted external emails can sign in. Contact your admin.', 'error');
    return;
  }

  PENDING_LOGIN_EMAIL = email;
  showOtpStep(email);
  showToast('OTP sent', `Use code ${DEMO_OTP} for the demo.`, 'success');
}

function isLoginAllowed(email) {
  const isInternal = email.endsWith('@dentallab.com');
  const isWhitelisted = STATE.whitelist.some(w => w.email === email);
  return isInternal || isWhitelisted;
}

function showOtpStep(email) {
  document.getElementById('emailEcho').textContent = email;
  document.getElementById('loginStep1').style.display = 'none';
  document.getElementById('loginStep2').style.display = 'block';
  setTimeout(() => {
    document.querySelector('.otp-input[data-otp="0"]').focus();
  }, 100);
}

function resendOtp() {
  showToast('OTP resent', `Use code ${DEMO_OTP} for the demo.`, 'success');
}

function verifyOtp() {
  const otp = Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');
  if (otp !== DEMO_OTP) {
    showToast('Invalid code', `Try ${DEMO_OTP} for the demo.`, 'error');
    return;
  }
  finalizeLogin();
}

// ---------- Login finalization (split into single-purpose helpers) ----------

function finalizeLogin(opts) {
  const animate = !opts || opts.animate !== false;
  const email = PENDING_LOGIN_EMAIL || 'faisal.ahmed@dentallab.com';

  setCurrentUserFromEmail(email);
  updateUserChip(STATE.currentUser);
  applyAdminVisibility(STATE.currentUser.isAdmin);
  persistSession(email);
  revealApp(animate);

  PENDING_LOGIN_EMAIL = null;
}

function setCurrentUserFromEmail(email) {
  const profile = DEMO_USERS[email];
  if (profile) {
    STATE.currentUser = { ...profile };
    return;
  }
  // External whitelisted user — synth a profile
  STATE.currentUser = {
    name: emailToDisplayName(email),
    email,
    role: 'External',
    department: '—',
    isAdmin: false,
    avatar: emailToInitials(email)
  };
}

function updateUserChip(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;
  // innerHTML (not textContent) so the presence dot can sit on the avatar.
  document.getElementById('userAvatar').innerHTML = escapeHtml(user.avatar) + presenceDot(user.email);
  document.getElementById('userBadge').style.display = user.isAdmin ? 'inline-block' : 'none';
}

function applyAdminVisibility(isAdmin) {
  document.getElementById('newCaseBtn').style.display   = isAdmin ? 'flex' : 'none';
  document.getElementById('whitelistBtn').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('requestsBtn').style.display  = isAdmin ? 'flex' : 'none';
  document.getElementById('discoverTab').style.display  = isAdmin ? '' : 'none';
  if (!isAdmin) STATE.view = 'joined';
  updateRequestsBadge();
}

function persistSession(email) {
  try { localStorage.setItem('dchat:user', email); } catch (_) {}
}

function revealApp(animate) {
  const showApp = () => {
    document.getElementById('app').style.display = 'grid';
    STATE.view = 'joined';
    resetChatScroll();
    document.querySelectorAll('.view-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === 'joined');
    });
    STATE.activeChat = null;
    document.getElementById('chatView').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('app').classList.remove('with-info', 'chat-open');
    renderChats();
    setTimeout(showLoginNotifications, 600);
  };

  if (animate) {
    document.getElementById('loginScreen').classList.add('hidden');
    setTimeout(showApp, 400);
  } else {
    document.getElementById('loginScreen').style.display = 'none';
    showApp();
  }
}

// Surfaces pending items as toasts right after login so the user lands with
// a sense of what's waiting on them. Two streams:
//   - admin: pending join requests across all cases
//   - everyone: @mentions + replies on their messages, in chats with unread > 0
function showLoginNotifications() {
  const me = STATE.currentUser;
  if (!me) return;

  if (me.isAdmin) {
    const pending = (typeof getAllPendingRequests === 'function') ? getAllPendingRequests() : [];
    if (pending.length) {
      showToast(
        `${pending.length} pending join request${pending.length === 1 ? '' : 's'}`,
        'Open the request center in the sidebar to approve or reject.',
        'success'
      );
    }
  }

  const summary = collectMentionSummary(me);
  if (summary.mentions > 0 || summary.replies > 0) {
    const parts = [];
    if (summary.mentions) parts.push(`${summary.mentions} new @mention${summary.mentions === 1 ? '' : 's'}`);
    if (summary.replies)  parts.push(`${summary.replies} repl${summary.replies === 1 ? 'y' : 'ies'} on your messages`);
    showToast(
      'You have unread activity',
      parts.join(' · ') + '.',
      'success'
    );
  }
}

// Walks the unread tail of each joined case and counts @mentions of the
// current user and replies to messages they sent. Only the last `unread`
// messages of each case are considered "new", matching the unread badge.
function collectMentionSummary(me) {
  const tag = '@' + me.name;
  let mentions = 0, replies = 0;
  STATE.cases.forEach(c => {
    if (!c.members.some(m => m.email === me.email)) return;
    const unread = c.unread || 0;
    if (unread <= 0) return;
    const tail = c.messages.filter(m => m.type === 'msg').slice(-unread);
    tail.forEach(m => {
      if (typeof m.text === 'string' && m.text.includes(tag)) mentions++;
      if (m.replyTo && m.replyTo.sender === me.name)          replies++;
    });
  });
  return { mentions, replies };
}

// ---------- Logout ----------

function logout() {
  try { localStorage.removeItem('dchat:user'); } catch (_) {}

  // Wipe in-memory session before showing the login screen so the next
  // login (same or different user) starts from a pristine state.
  resetSessionState();
  resetSessionDom();
}

// Resets every piece of in-memory state owned by the app: STATE itself,
// the seeded cases / whitelist, and the per-feature transient variables
// (composer files, reply target, mention popup, modal autocomplete).
function resetSessionState() {
  // STATE — back to defaults. freshCases() rebuilds from the pristine
  // MOCK_CASES seed, which clears any per-session archive / pin / mute /
  // unread / status changes the user made during the session.
  STATE.currentUser         = { ...INITIAL_CURRENT_USER };
  STATE.cases               = freshCases();
  STATE.whitelist           = JSON.parse(JSON.stringify(INITIAL_WHITELIST));
  STATE.activeChat          = null;
  STATE.pendingEmails       = [];
  STATE.theme               = 'light';
  STATE.view                = 'joined';
  STATE.statusFilter        = 'all';
  STATE.visibleChats        = STATE.chatBatchSize;
  STATE.notificationsEnabled = false;

  // Per-feature transient state (defined as `let` in their owning files).
  PENDING_FILES        = [];
  REPLY_TO             = null;
  INVITE_EMAILS        = [];
  AC_ACTIVE_INDEX      = -1;
  PENDING_LOGIN_EMAIL  = null;
  hideMentionAutocomplete();
}

// Restores the DOM bits that don't get rewritten by the next render cycle:
// input fields, theme attribute, open modals, and the login screen itself.
function resetSessionDom() {
  // Login screen back to step 1
  document.getElementById('app').style.display = 'none';
  const login = document.getElementById('loginScreen');
  login.style.display = '';
  login.classList.remove('hidden');
  document.getElementById('loginStep1').style.display = 'block';
  document.getElementById('loginStep2').style.display = 'none';
  document.querySelectorAll('.otp-input').forEach(i => i.value = '');

  // Inputs the browser would otherwise persist
  document.getElementById('composerInput').value = '';
  document.getElementById('searchInput').value   = '';

  // Theme back to light
  document.documentElement.removeAttribute('data-theme');
  document.getElementById('themeIcon').innerHTML =
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';

  // UI bits that aren't touched by render
  document.getElementById('notifBtn').classList.remove('active');
  document.getElementById('replyPreviewWrap').innerHTML = '';
  document.getElementById('filePreviewWrap').innerHTML  = '';
  document.getElementById('toastContainer').innerHTML   = '';
  document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
}

// ---------- OTP input behavior (auto-advance, backspace, paste) ----------

(function setupOtpInputs() {
  document.querySelectorAll('.otp-input').forEach((input, i, arr) => {
    input.addEventListener('input', e => {
      if (e.target.value.length === 1 && i < arr.length - 1) {
        arr[i + 1].focus();
      }
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) {
        arr[i - 1].focus();
      }
    });
    input.addEventListener('paste', e => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      paste.split('').forEach((char, idx) => {
        if (arr[idx]) arr[idx].value = char;
      });
      const focusIdx = Math.min(paste.length, arr.length - 1);
      if (arr[focusIdx]) arr[focusIdx].focus();
    });
  });
})();
