// =============================================================================
// MODALS — new case / edit case / invite members / whitelist / delete
// Includes shared email autocomplete used by the new-case + invite modals.
// =============================================================================

let INVITE_EMAILS = [];
let AC_ACTIVE_INDEX = -1;

// ---------- Edit case ----------

function openEditModal() {
  if (!STATE.currentUser.isAdmin) {
    showToast('Admins only', 'Only admins can edit case details.', 'error');
    return;
  }
  const c = STATE.activeChat;
  if (!c) return;
  document.getElementById('editCaseId').value = '#' + c.id;
  document.getElementById('editCaseTitle').value = c.title || '';
  document.getElementById('editCasePatient').value = c.patient || '';
  document.getElementById('editCaseDoctor').value = c.doctor || '';
  document.getElementById('editCaseModal').classList.add('show');
}

function saveEdit() {
  const c = STATE.activeChat;
  if (!c) return;
  const newTitle   = document.getElementById('editCaseTitle').value.trim();
  const newPatient = document.getElementById('editCasePatient').value.trim();
  const newDoctor  = document.getElementById('editCaseDoctor').value.trim();

  const changed = newTitle !== (c.title || '') ||
                  newPatient !== (c.patient || '') ||
                  newDoctor !== (c.doctor || '');

  c.title = newTitle;
  c.patient = newPatient;
  c.doctor = newDoctor;

  if (changed) {
    c.messages.push({ type: 'system', text: STATE.currentUser.name + ' updated the case details' });
  }

  closeModal('editCaseModal');
  showToast('Case updated', 'Case details have been saved.', 'success');

  document.getElementById('chatHeaderId').textContent = '#' + c.id + (c.title ? ' · ' + c.title : '');
  document.getElementById('chatHeaderMeta').textContent =
    `${c.members.length} members · ${c.doctor || 'No doctor assigned'}`;

  renderInfoPanel();
  renderMessages();
  renderChats();
}

// ---------- Invite members ----------

function openInviteModal() {
  if (!STATE.currentUser.isAdmin) {
    showToast('Admins only', 'Only admins can invite members.', 'error');
    return;
  }
  const c = STATE.activeChat;
  if (!c) return;
  INVITE_EMAILS = [];
  document.getElementById('inviteEmailInputField').value = '';
  document.getElementById('inviteCaseLabel').textContent = '#' + c.id + (c.title ? ' · ' + c.title : '');
  renderInviteEmailTags();
  renderInvitePreview();
  document.getElementById('inviteMembersModal').classList.add('show');
  setTimeout(() => document.getElementById('inviteEmailInputField').focus(), 100);
}

function handleInviteEmailInput(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    moveAutocomplete('invite', e.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (e.key === 'Escape') { hideAutocomplete('invite'); return; }
  if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
    e.preventDefault();
    if (acceptAutocompleteIfActive('invite')) return;
    tryAddInviteEmail(e.target);
  } else if (e.key === 'Backspace' && !e.target.value && INVITE_EMAILS.length) {
    INVITE_EMAILS.pop();
    renderInviteEmailTags();
    renderInvitePreview();
  } else {
    setTimeout(() => showAutocomplete('invite', e.target.value), 0);
  }
}

function tryAddInviteEmail(target) {
  const v = target.value.trim().replace(/,$/, '').toLowerCase();
  if (!v) return;
  if (!/\S+@\S+\.\S+/.test(v)) {
    showToast('Invalid email', `"${v}" is not a valid email address.`, 'error');
    return;
  }
  if (INVITE_EMAILS.includes(v)) {
    showToast('Already added', `${v} is already in the invite list.`, 'error');
    return;
  }
  if (STATE.activeChat?.members.some(m => m.email.toLowerCase() === v)) {
    showToast('Already a member', `${v} is already part of this case.`, 'error');
    return;
  }
  INVITE_EMAILS.push(v);
  target.value = '';
  renderInviteEmailTags();
  renderInvitePreview();
  hideAutocomplete('invite');
}

function removeInviteEmail(email) {
  INVITE_EMAILS = INVITE_EMAILS.filter(e => e !== email);
  renderInviteEmailTags();
  renderInvitePreview();
}

function renderInviteEmailTags() {
  const wrap = document.getElementById('inviteEmailTagInput');
  wrap.querySelectorAll('.email-tag').forEach(t => t.remove());
  INVITE_EMAILS.forEach(email => {
    const tag = document.createElement('span');
    tag.className = 'email-tag';
    const ext = isExternalEmail(email);
    tag.innerHTML = `${email}${ext ? ' <span style="opacity:.6; font-size:9px;">EXT</span>' : ''} <button onclick="removeInviteEmail('${email}')">×</button>`;
    wrap.insertBefore(tag, document.getElementById('inviteEmailInputField'));
  });
}

function renderInvitePreview() {
  const box = document.getElementById('invitePreview');
  if (!INVITE_EMAILS.length) { box.innerHTML = ''; return; }

  const existing    = INVITE_EMAILS.filter(e => isExistingUser(e));
  const newInternal = INVITE_EMAILS.filter(e => !isExistingUser(e) && !isExternalEmail(e));
  const newExternal = INVITE_EMAILS.filter(e => !isExistingUser(e) && isExternalEmail(e));

  const row = (label, count, hint) => count
    ? `<div style="display:flex; justify-content:space-between; padding:6px 0; font-size:12px; border-bottom:1px dashed var(--border);">
         <span style="color:var(--text-soft);">${label}</span>
         <span style="font-weight:600;">${count} <span style="color:var(--text-mute); font-weight:400; font-size:11px;">· ${hint}</span></span>
       </div>` : '';

  box.innerHTML = `
    <div style="background:var(--surface-2); border-radius:10px; padding:12px 14px;">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-mute); margin-bottom:8px;">Invitation Summary</div>
      ${row('Existing users', existing.length, 'notified')}
      ${row('New @dentallab.com users', newInternal.length, 'register & join')}
      ${row('External users', newExternal.length, 'auto-whitelist & invite')}
    </div>
  `;
}

function submitInvite() {
  if (!INVITE_EMAILS.length) {
    showToast('No emails added', 'Add at least one email to send invites.', 'error');
    return;
  }
  const c = STATE.activeChat;
  if (!c) return;

  INVITE_EMAILS.forEach(email => addInviteToCase(c, email));

  const total = INVITE_EMAILS.length;
  const externalNew = INVITE_EMAILS.filter(e => !isExistingUser(e) && isExternalEmail(e)).length;
  let msg = `${total} member${total > 1 ? 's' : ''} added to #${c.id}.`;
  if (externalNew) msg += ` ${externalNew} external email${externalNew > 1 ? 's' : ''} auto-whitelisted.`;

  INVITE_EMAILS = [];
  closeModal('inviteMembersModal');
  showToast('Invites sent', msg, 'success');

  document.getElementById('chatHeaderMeta').textContent =
    `${c.members.length} members · ${c.doctor || 'No doctor assigned'}`;
  renderInfoPanel();
  renderMessages();
}

function addInviteToCase(c, email) {
  const ext = isExternalEmail(email);
  const exists = isExistingUser(email);
  const role = exists
    ? (ext ? 'External' : 'Member')
    : (ext ? 'External (invited)' : 'Member (invited)');
  c.members.push({
    name: emailToDisplayName(email),
    email,
    role,
    avatar: emailToInitials(email),
    isAdmin: false,
    isExternal: ext
  });
  c.messages.push({
    type: 'system',
    text: STATE.currentUser.name + (exists ? ' added ' : ' invited ') + email
  });
}

// ---------- Delete case ----------

function mockDelete() {
  if (!confirm('Permanently delete this entire chat group? This action cannot be undone.')) return;
  STATE.cases = STATE.cases.filter(c => c.id !== STATE.activeChat.id);
  STATE.activeChat = null;
  document.getElementById('chatView').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('app').classList.remove('with-info');
  renderChats();
  showToast('Group deleted', 'The case group has been permanently removed.', 'success');
}

// ---------- New case ----------

function openNewCaseModal() {
  if (!STATE.currentUser.isAdmin) {
    showToast('Admins only', 'Only admins can create new cases.', 'error');
    return;
  }
  STATE.pendingEmails = [];
  ['newCaseId', 'newCaseTitle', 'newCasePatient', 'newCaseDoctor']
    .forEach(id => { document.getElementById(id).value = ''; });
  renderEmailTags();
  document.getElementById('newCaseModal').classList.add('show');
}

function handleEmailInput(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    moveAutocomplete('newCase', e.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (e.key === 'Escape') { hideAutocomplete('newCase'); return; }
  if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
    e.preventDefault();
    if (acceptAutocompleteIfActive('newCase')) return;
    const v = e.target.value.trim().replace(/,$/, '').toLowerCase();
    if (v && /\S+@\S+\.\S+/.test(v) && !STATE.pendingEmails.includes(v)) {
      STATE.pendingEmails.push(v);
      e.target.value = '';
      renderEmailTags();
      hideAutocomplete('newCase');
    }
  } else if (e.key === 'Backspace' && !e.target.value && STATE.pendingEmails.length) {
    STATE.pendingEmails.pop();
    renderEmailTags();
  } else {
    setTimeout(() => showAutocomplete('newCase', e.target.value), 0);
  }
}

function removeEmail(email) {
  STATE.pendingEmails = STATE.pendingEmails.filter(e => e !== email);
  renderEmailTags();
}

function renderEmailTags() {
  const wrap = document.getElementById('emailTagInput');
  wrap.querySelectorAll('.email-tag').forEach(t => t.remove());
  STATE.pendingEmails.forEach(email => {
    const tag = document.createElement('span');
    tag.className = 'email-tag';
    const ext = isExternalEmail(email);
    tag.innerHTML = `${email}${ext ? ' <span style="opacity:.6; font-size:9px;">EXT</span>' : ''} <button onclick="removeEmail('${email}')">×</button>`;
    wrap.insertBefore(tag, document.getElementById('emailInputField'));
  });
}

function createCase() {
  const id = document.getElementById('newCaseId').value.trim();
  if (!id) { showToast('Case ID required', 'Please enter a Case ID.', 'error'); return; }
  if (STATE.cases.find(c => c.id === id)) {
    showToast('Case exists', `Case #${id} already exists. Opening it.`, 'error');
    closeModal('newCaseModal');
    openChat(id);
    return;
  }

  STATE.cases.unshift(buildNewCase(id));
  closeModal('newCaseModal');
  showToast('Case created', buildCreatedToastBody(id), 'success');
  renderChats();
  openChat(id);
}

function buildNewCase(id) {
  const u = STATE.currentUser;
  return {
    id,
    title:    document.getElementById('newCaseTitle').value.trim() || '',
    patient:  document.getElementById('newCasePatient').value.trim() || '',
    doctor:   document.getElementById('newCaseDoctor').value.trim() || '',
    createdAt: 'Just now',
    status:   'impression',
    unread:   0,
    members: [
      { name: u.name, email: u.email, role: u.role, avatar: u.avatar, isAdmin: true, isExternal: false },
      ...STATE.pendingEmails.map(email => ({
        name: emailToDisplayName(email),
        email,
        role: isExternalEmail(email) ? 'External (invited)' : 'Member (invited)',
        avatar: emailToInitials(email),
        isAdmin: false,
        isExternal: isExternalEmail(email)
      }))
    ],
    messages: [
      { type: 'system', text: u.name + ' created this case' }
    ]
  };
}

function buildCreatedToastBody(id) {
  let msg = `Case #${id} created.`;
  if (!STATE.pendingEmails.length) return msg;
  const externalCount = STATE.pendingEmails.filter(isExternalEmail).length;
  msg += ` ${STATE.pendingEmails.length} invitation${STATE.pendingEmails.length > 1 ? 's' : ''} sent.`;
  if (externalCount) {
    msg += ` ${externalCount} external email${externalCount > 1 ? 's' : ''} auto-whitelisted.`;
  }
  return msg;
}

// ---------- Email autocomplete (shared by new-case + invite) ----------

function isExistingUser(email) {
  return STATE.cases.some(c =>
    c.members.some(m => m.email.toLowerCase() === email.toLowerCase())
  );
}

function getKnownUsers() {
  const map = new Map();
  STATE.cases.forEach(c => {
    c.members.forEach(m => {
      const key = m.email.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: m.name, email: m.email, role: m.role, avatar: m.avatar, isExternal: m.isExternal
        });
      }
    });
  });
  return Array.from(map.values());
}

function showAutocomplete(target, query) {
  const wrapEl = target === 'invite'
    ? document.getElementById('inviteEmailTagInput')
    : document.getElementById('emailTagInput');

  const q = (query || '').toLowerCase().trim();
  const existing = target === 'invite'
    ? (STATE.activeChat?.members || []).map(m => m.email.toLowerCase())
    : [];
  const pending = target === 'invite' ? INVITE_EMAILS : STATE.pendingEmails;

  const matches = getKnownUsers()
    .filter(u => !existing.includes(u.email.toLowerCase()))
    .filter(u => !pending.includes(u.email.toLowerCase()))
    .filter(u => q && (u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)))
    .slice(0, 6);

  if (!matches.length) { hideAutocomplete(target); return; }

  let listEl = document.getElementById('acList_' + target);
  if (!listEl) {
    listEl = document.createElement('div');
    listEl.className = 'autocomplete-list';
    listEl.id = 'acList_' + target;
    wrapEl.parentElement.style.position = 'relative';
    wrapEl.parentElement.appendChild(listEl);
  }
  AC_ACTIVE_INDEX = -1;
  listEl.innerHTML = matches.map((u, i) => `
    <div class="autocomplete-item" data-idx="${i}" data-email="${u.email}"
         onmousedown="event.preventDefault(); pickAutocomplete('${target}', '${u.email}')">
      <div class="avatar sm" style="background:${u.isExternal ? '#666' : '#444'};">${u.avatar}</div>
      <div class="autocomplete-info">
        <div class="autocomplete-name">${u.name}</div>
        <div class="autocomplete-email">${u.email}</div>
      </div>
      <span class="autocomplete-tag ${u.isExternal ? 'external' : 'existing'}">${u.isExternal ? 'External' : 'Existing'}</span>
    </div>
  `).join('');
  listEl.style.display = 'block';
}

function hideAutocomplete(target) {
  const listEl = document.getElementById('acList_' + target);
  if (listEl) listEl.style.display = 'none';
  AC_ACTIVE_INDEX = -1;
}

function moveAutocomplete(target, delta) {
  const list = document.getElementById('acList_' + target);
  if (!list || list.style.display === 'none') return;
  const items = list.children;
  if (!items.length) return;
  AC_ACTIVE_INDEX = (AC_ACTIVE_INDEX + delta + items.length) % items.length;
  Array.from(items).forEach((el, i) => el.classList.toggle('active', i === AC_ACTIVE_INDEX));
}

function acceptAutocompleteIfActive(target) {
  const list = document.getElementById('acList_' + target);
  if (!list || list.style.display === 'none' || AC_ACTIVE_INDEX < 0) return false;
  const item = list.children[AC_ACTIVE_INDEX];
  if (!item) return false;
  pickAutocomplete(target, item.dataset.email);
  return true;
}

function pickAutocomplete(target, email) {
  const lower = email.toLowerCase();
  if (target === 'invite') {
    const inputEl = document.getElementById('inviteEmailInputField');
    if (STATE.activeChat?.members.some(m => m.email.toLowerCase() === lower)) {
      showToast('Already a member', `${email} is already part of this case.`, 'error');
      return;
    }
    if (!INVITE_EMAILS.includes(lower)) INVITE_EMAILS.push(lower);
    inputEl.value = '';
    renderInviteEmailTags();
    renderInvitePreview();
    inputEl.focus();
  } else {
    const inputEl = document.getElementById('emailInputField');
    if (!STATE.pendingEmails.includes(lower)) STATE.pendingEmails.push(lower);
    inputEl.value = '';
    renderEmailTags();
    inputEl.focus();
  }
  hideAutocomplete(target);
}

// ---------- Whitelist management ----------

function openWhitelistModal() {
  if (!STATE.currentUser.isAdmin) {
    showToast('Admins only', 'Only admins can manage the whitelist.', 'error');
    return;
  }
  renderWhitelist();
  document.getElementById('whitelistAddInput').value = '';
  document.getElementById('whitelistModal').classList.add('show');
}

function renderWhitelist() {
  const list = document.getElementById('whitelistList');
  document.getElementById('whitelistCount').textContent = STATE.whitelist.length;
  if (!STATE.whitelist.length) {
    list.innerHTML = `<div style="font-size:13px; color:var(--text-mute); padding:12px 0; text-align:center;">No external emails whitelisted yet.</div>`;
    return;
  }
  list.innerHTML = STATE.whitelist.map(w => `
    <div class="whitelist-row">
      <div class="avatar sm" style="background:#666;">${w.email.slice(0,2).toUpperCase()}</div>
      <div class="whitelist-info">
        <div class="whitelist-email">${w.email}</div>
        <div class="whitelist-meta">Added by ${w.addedBy} · ${w.addedAt}</div>
      </div>
      <button class="whitelist-remove" onclick="removeFromWhitelist('${w.email}')" title="Remove">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function addToWhitelist() {
  const input = document.getElementById('whitelistAddInput');
  const email = input.value.trim().toLowerCase();
  if (!email) return;
  if (!/\S+@\S+\.\S+/.test(email)) {
    showToast('Invalid email', `"${email}" is not a valid email.`, 'error');
    return;
  }
  if (!isExternalEmail(email)) {
    showToast('Internal domain', "@dentallab.com emails are auto-allowed and don't need whitelisting.", 'error');
    return;
  }
  if (STATE.whitelist.some(w => w.email === email)) {
    showToast('Already whitelisted', `${email} is already on the list.`, 'error');
    return;
  }
  STATE.whitelist.push({
    email,
    addedBy: STATE.currentUser.name,
    addedAt: 'Just now'
  });
  input.value = '';
  renderWhitelist();
  showToast('Whitelisted', `Login/register email sent to ${email}.`, 'success');
}

function removeFromWhitelist(email) {
  if (!confirm(`Remove ${email} from the whitelist? They will lose access.`)) return;
  STATE.whitelist = STATE.whitelist.filter(w => w.email !== email);
  renderWhitelist();
  showToast('Removed', `${email} removed from whitelist.`, 'success');
}
