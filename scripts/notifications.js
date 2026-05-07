// =============================================================================
// PUSH NOTIFICATIONS (PWA simulation)
// Real Notification API where allowed; otherwise falls back to in-app toasts.
// Mock pushes also append to the target case so the unread badge updates.
// =============================================================================

const PUSH_SAMPLES = [
  { case: '5678412', from: 'Aisha Khan', avatar: 'AK', text: 'Shade match looks good now.' },
  { case: '5678656', from: 'Dr. Patel',  avatar: 'RP', text: 'Quick update on the patient...' },
  { case: '5677321', from: 'Tom Wright', avatar: 'TW', text: 'Framework done.' }
];

const PUSH_MIN_DELAY_MS = 25000;
const PUSH_RANDOM_WINDOW_MS = 20000;

function enableNotifications() {
  if (STATE.notificationsEnabled) {
    disableNotifications();
    return;
  }
  if (!('Notification' in window)) {
    enableInDemoMode('Demo mode — simulated incoming alerts.');
    return;
  }
  Notification.requestPermission()
    .then(handlePermissionResult)
    .catch(() => enableInDemoMode('Demo mode — simulated incoming alerts.'));
}

function disableNotifications() {
  STATE.notificationsEnabled = false;
  document.getElementById('notifBtn').classList.remove('active');
  showToast('Notifications off', "You won't receive push alerts.", 'success');
}

function handlePermissionResult(perm) {
  if (perm === 'granted') {
    STATE.notificationsEnabled = true;
    document.getElementById('notifBtn').classList.add('active');
    showToast('Notifications enabled', "You'll get a push when teammates message you.", 'success');
    scheduleMockPush();
  } else if (perm === 'denied') {
    showToast('Permission denied', 'Allow notifications in your browser settings.', 'error');
  } else {
    enableInDemoMode('Browser blocked the prompt — running in demo mode.');
  }
}

function enableInDemoMode(body) {
  STATE.notificationsEnabled = true;
  document.getElementById('notifBtn').classList.add('active');
  showToast('Notifications enabled (demo)', body, 'success');
  scheduleMockPush();
}

function scheduleMockPush() {
  setTimeout(() => {
    if (!STATE.notificationsEnabled) return;
    const pick = PUSH_SAMPLES[Math.floor(Math.random() * PUSH_SAMPLES.length)];
    deliverMockPush(pick);
    scheduleMockPush();
  }, PUSH_MIN_DELAY_MS + Math.random() * PUSH_RANDOM_WINDOW_MS);
}

function deliverMockPush(pick) {
  const target = STATE.cases.find(c => c.id === pick.case);
  if (target && isMember(target)) {
    target.messages.push({
      type: 'msg',
      sender: pick.from,
      avatar: pick.avatar,
      text: pick.text,
      time: nowHHMM(),
      own: false
    });
    if (STATE.activeChat?.id !== target.id) {
      target.unread = (target.unread || 0) + 1;
    } else {
      renderMessages();
    }
    renderChats();
  }
  // Muted chats still update unread silently; they just don't surface a push.
  if (target?.muted) return;
  showToast(`#${pick.case} · ${pick.from}`, pick.text, 'success');
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(`#${pick.case} · ${pick.from}`, { body: pick.text }); } catch (_) {}
  }
}
