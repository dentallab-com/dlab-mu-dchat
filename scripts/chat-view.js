// =============================================================================
// CHAT VIEW — open chat, header status pill/picker, message rendering
// =============================================================================

// ---------- Open / activate chat ----------

function openChat(id) {
  const c = STATE.cases.find(c => c.id === id);
  if (!c) return;

  if (STATE.activeChat?.id !== id) {
    resetComposerOnChatSwitch();
  }
  STATE.activeChat = c;
  c.unread = 0;

  showChatView();
  setChatHeader(c);
  renderHeaderStatus();
  renderMessages();
  renderInfoPanel();
  renderChats();

  document.getElementById('app').classList.add('chat-open');
}

function resetComposerOnChatSwitch() {
  PENDING_FILES = [];
  REPLY_TO = null;
  renderFilePreview();
  renderReplyPreview();
  toggleSendBtn();
}

function showChatView() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('chatView').style.display = 'flex';
}

function setChatHeader(c) {
  document.getElementById('chatHeaderAvatar').textContent = c.id.slice(-2);
  document.getElementById('chatHeaderAvatar').style.background = getColorForId(c.id);
  document.getElementById('chatHeaderId').textContent = '#' + c.id + (c.title ? ' · ' + c.title : '');
  document.getElementById('chatHeaderMeta').textContent =
    `${c.members.length} members · ${c.doctor || 'No doctor assigned'}`;
}

// ---------- Header status pill / admin picker ----------

function renderHeaderStatus() {
  const c = STATE.activeChat;
  const wrap = document.getElementById('chatHeaderStatus');
  if (!c) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = STATE.currentUser.isAdmin
    ? statusButton(c.status) + statusPickerHtml(c.status)
    : statusPill(c.status);
}

function statusPickerHtml(currentKey) {
  return `
    <div class="status-picker" id="statusPicker">
      <div class="status-picker-label">Set Case Status</div>
      ${STATUS_ORDER.map(key => {
        const meta = STATUS_META[key];
        const cls = key === currentKey ? 'current' : '';
        return `<button class="${cls}" onclick="changeStatus('${key}')">
          <span class="dot" style="background:${meta.dot};"></span>${meta.label}
        </button>`;
      }).join('')}
    </div>
  `;
}

function toggleStatusPicker() {
  document.getElementById('statusPicker')?.classList.toggle('show');
}

function changeStatus(key) {
  const c = STATE.activeChat;
  if (!c || !STATE.currentUser.isAdmin) return;
  if (c.status === key) {
    document.getElementById('statusPicker')?.classList.remove('show');
    return;
  }
  c.status = key;
  c.messages.push({
    type: 'system',
    text: `${STATE.currentUser.name} set status to ${STATUS_META[key].label}`
  });
  document.getElementById('statusPicker')?.classList.remove('show');
  renderHeaderStatus();
  renderMessages();
  renderChats();
  renderInfoPanel();
  showToast('Status updated', `Case #${c.id} is now "${STATUS_META[key].label}".`, 'success');
}

// Close status picker when clicking anywhere outside it.
document.addEventListener('click', (e) => {
  const picker = document.getElementById('statusPicker');
  if (picker && picker.classList.contains('show') && !e.target.closest('.chat-header-status')) {
    picker.classList.remove('show');
  }
});

// ---------- Messages ----------

function renderMessages() {
  const wrap = document.getElementById('messages');
  const msgs = STATE.activeChat.messages;
  wrap.innerHTML = `
    <div class="day-divider"><span>Today</span></div>
    ${msgs.map((m, i) => renderMsg(m, i)).join('')}
  `;
  setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 50);
}

function renderMsg(m, idx) {
  if (m.type === 'system') {
    return `<div class="system-msg">${escapeHtml(m.text)}</div>`;
  }
  return `
    <div class="msg ${m.own ? 'own' : ''}" data-idx="${idx}">
      <div class="avatar sm" style="background:${m.own ? '#DF2926' : '#444444'}">${escapeHtml(m.avatar)}</div>
      <div class="msg-bubble-wrap">
        ${renderMsgMeta(m)}
        ${renderMsgBubble(m)}
        ${renderMsgActions(idx)}
      </div>
    </div>
  `;
}

function renderMsgMeta(m) {
  return `
    <div class="msg-meta">
      <b>${m.own ? 'You' : escapeHtml(m.sender)}</b>
      <span>${escapeHtml(m.time)}</span>
    </div>
  `;
}

function renderMsgBubble(m) {
  return `
    <div class="msg-bubble">
      ${renderMsgQuote(m.replyTo)}
      ${formatMsgText(m.text)}
      ${renderMsgFiles(m)}
    </div>
  `;
}

function renderMsgQuote(replyTo) {
  if (!replyTo) return '';
  const text = replyTo.text
    ? formatMsgText(replyTo.text)
    : (replyTo.fileLabel ? '📎 ' + escapeHtml(replyTo.fileLabel) : '');
  return `
    <div class="msg-quote" onclick="event.stopPropagation(); scrollToMsg(${replyTo.idx})">
      <div class="msg-quote-sender">${escapeHtml(replyTo.sender)}</div>
      <div class="msg-quote-text">${text}</div>
    </div>
  `;
}

function renderMsgFiles(m) {
  const files = m.files || (m.file ? [m.file] : []);
  return files.map(f => `
    <div class="msg-file">
      <div class="msg-file-icon">${fileIcon(f.icon)}</div>
      <div class="msg-file-info">
        <div class="msg-file-name">${escapeHtml(f.name)}</div>
        <div class="msg-file-size">${escapeHtml(f.size)}</div>
      </div>
    </div>
  `).join('');
}

function renderMsgActions(idx) {
  return `
    <div class="msg-actions">
      <button class="msg-action-btn" onclick="event.stopPropagation(); replyToMsg(${idx})" title="Reply">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v3"/>
        </svg>
      </button>
    </div>
  `;
}

function scrollToMsg(idx) {
  const el = document.querySelector(`.msg[data-idx="${idx}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 1400);
}
