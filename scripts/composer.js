// =============================================================================
// COMPOSER — text input, file attachments, drag&drop, reply state, send
// =============================================================================

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_FILE_RE = /\.(pdf|jpg|jpeg|png|gif|webp|heic|svg|mp4|mov|webm|m4v)$/i;

let PENDING_FILES = [];
let REPLY_TO = null;

// ---------- Send button + textarea state ----------

function toggleSendBtn() {
  const v = document.getElementById('composerInput').value.trim();
  document.getElementById('sendBtn').disabled = !v && PENDING_FILES.length === 0;
}

// ---------- Reply state ----------

function replyToMsg(idx) {
  if (!STATE.activeChat) return;
  const m = STATE.activeChat.messages[idx];
  if (!m || m.type !== 'msg') return;

  const files = m.files || (m.file ? [m.file] : []);
  const fileLabel = files.length
    ? (files.length > 1 ? `${files.length} files` : files[0].name)
    : null;

  REPLY_TO = {
    idx,
    sender: m.own ? 'You' : m.sender,
    text: m.text || '',
    fileLabel
  };
  renderReplyPreview();
  toggleSendBtn();
  document.getElementById('composerInput').focus();
}

function cancelReply() {
  REPLY_TO = null;
  renderReplyPreview();
  toggleSendBtn();
}

function renderReplyPreview() {
  const wrap = document.getElementById('replyPreviewWrap');
  if (!REPLY_TO) { wrap.innerHTML = ''; return; }
  const previewText = REPLY_TO.text
    ? REPLY_TO.text
    : (REPLY_TO.fileLabel ? '📎 ' + REPLY_TO.fileLabel : '');
  wrap.innerHTML = `
    <div class="reply-preview">
      <div class="reply-preview-info">
        <div class="reply-preview-label">Replying to ${escapeHtml(REPLY_TO.sender)}</div>
        <div class="reply-preview-text">${escapeHtml(previewText)}</div>
      </div>
      <button class="reply-preview-cancel" onclick="cancelReply()" title="Cancel reply">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
}

// ---------- File attachments ----------

function isValidUpload(file) {
  if (file.size > MAX_FILE_BYTES) {
    showToast('File too large', `${file.name} is ${fmtFileSize(file.size)}. Max allowed is 25MB.`, 'error');
    return false;
  }
  if (!ALLOWED_FILE_RE.test(file.name)) {
    showToast('Type not allowed', `${file.name} — only PDF, images, and videos are accepted.`, 'error');
    return false;
  }
  return true;
}

function queueFile(file) {
  PENDING_FILES.push({
    name: file.name,
    size: fmtFileSize(file.size),
    icon: fileTypeFromName(file.name)
  });
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    if (isValidUpload(f)) queueFile(f);
  }
  renderFilePreview();
  toggleSendBtn();
  e.target.value = '';
}

function renderFilePreview() {
  const wrap = document.getElementById('filePreviewWrap');
  if (PENDING_FILES.length === 0) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = PENDING_FILES.map((f, i) => `
    <div class="file-preview">
      <div class="file-preview-icon">${fileIcon(f.icon)}</div>
      <div class="file-preview-info">
        <div class="file-preview-name">${escapeHtml(f.name)}</div>
        <div class="file-preview-size">${escapeHtml(f.size)} · ready to send</div>
      </div>
      <button class="file-preview-remove" onclick="cancelFile(${i})" title="Remove">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function cancelFile(index) {
  if (typeof index === 'number') {
    PENDING_FILES.splice(index, 1);
  } else {
    PENDING_FILES = [];
  }
  renderFilePreview();
  toggleSendBtn();
}

// ---------- Send ----------

function sendMessage() {
  const input = document.getElementById('composerInput');
  const text = input.value.trim();
  if ((!text && PENDING_FILES.length === 0) || !STATE.activeChat) return;

  STATE.activeChat.messages.push({
    type: 'msg',
    sender: STATE.currentUser.name,
    avatar: STATE.currentUser.avatar,
    text,
    time: nowHHMM(),
    own: true,
    files: PENDING_FILES.length ? PENDING_FILES.slice() : undefined,
    replyTo: REPLY_TO ? { ...REPLY_TO } : undefined
  });

  resetComposerAfterSend(input);
  renderMessages();
  renderChats();
  renderInfoPanel();
  scheduleMockReply();
}

function resetComposerAfterSend(input) {
  PENDING_FILES = [];
  REPLY_TO = null;
  renderFilePreview();
  renderReplyPreview();
  input.value = '';
  autoResize(input);
  toggleSendBtn();
  hideMentionAutocomplete();
}

function scheduleMockReply() {
  if (Math.random() > 0.4) {
    setTimeout(mockReply, 1500 + Math.random() * 1500);
  }
}

function mockReply() {
  if (!STATE.activeChat) return;
  const others = STATE.activeChat.members.filter(m => m.email !== STATE.currentUser.email);
  if (others.length === 0) return;
  const replier = others[Math.floor(Math.random() * others.length)];
  const replies = ['Got it 👍', 'Sounds good.', 'Thanks!', 'On it.', 'Will check and confirm.', 'Understood.', 'Perfect, thanks for the update.'];
  const text = replies[Math.floor(Math.random() * replies.length)];

  STATE.activeChat.messages.push({
    type: 'msg',
    sender: replier.name,
    avatar: replier.avatar,
    text,
    time: nowHHMM(),
    own: false
  });
  renderMessages();
  renderChats();
}

// Enter sends (unless mention popup is open — see mention.js capture handler).
document.getElementById('composerInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ---------- Drag & Drop on the chat view ----------

(function setupDragDrop() {
  const view = document.getElementById('chatView');
  const zone = document.getElementById('dropZone');
  if (!view || !zone) return;
  let depth = 0;

  const isFileDrag = (e) =>
    !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

  view.addEventListener('dragenter', (e) => {
    if (!STATE.activeChat || !isFileDrag(e)) return;
    e.preventDefault();
    depth++;
    zone.classList.add('active');
  });

  view.addEventListener('dragover', (e) => {
    if (!STATE.activeChat || !isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  view.addEventListener('dragleave', () => {
    depth--;
    if (depth <= 0) {
      depth = 0;
      zone.classList.remove('active');
    }
  });

  view.addEventListener('drop', (e) => {
    if (!STATE.activeChat) return;
    e.preventDefault();
    depth = 0;
    zone.classList.remove('active');
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    for (const f of files) {
      if (isValidUpload(f)) queueFile(f);
    }
    renderFilePreview();
    toggleSendBtn();
  });
})();
