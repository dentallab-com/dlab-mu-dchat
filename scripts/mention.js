// =============================================================================
// @MENTION AUTOCOMPLETE
// Watches the composer textarea for "@…" tokens and pops a member picker.
// Uses a capture-phase keydown handler so Arrow/Enter/Tab/Escape don't leak
// into the composer's bubble-phase Enter-to-send listener.
// =============================================================================

let MENTION_OPEN = false;
let MENTION_INDEX = 0;
let MENTION_QUERY = '';
let MENTION_START = -1;

// ---------- Detection ----------

function handleComposerInput() {
  const input = document.getElementById('composerInput');
  const pos = input.selectionStart;
  const upToCursor = input.value.slice(0, pos);
  const atIdx = upToCursor.lastIndexOf('@');

  // No '@' before cursor → no mention.
  if (atIdx < 0) { hideMentionAutocomplete(); return; }
  // '@' must be at start, or follow whitespace, to count as a mention trigger.
  if (atIdx > 0 && !/\s/.test(upToCursor[atIdx - 1])) { hideMentionAutocomplete(); return; }
  // Whitespace after '@' ends the mention scope.
  const after = upToCursor.slice(atIdx + 1);
  if (/\s/.test(after)) { hideMentionAutocomplete(); return; }

  MENTION_START = atIdx;
  MENTION_QUERY = after;
  showMentionAutocomplete();
}

function getMentionCandidates() {
  const c = STATE.activeChat;
  if (!c) return [];
  const me = STATE.currentUser.email;
  const q = MENTION_QUERY.toLowerCase();
  return c.members
    .filter(m => m.email !== me)
    .filter(m => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
}

// ---------- Render ----------

function showMentionAutocomplete() {
  const list = document.getElementById('mentionAutocomplete');
  const items = getMentionCandidates();

  if (!items.length) {
    list.innerHTML = `<div class="mention-empty">No matching members</div>`;
    list.classList.add('show');
    positionMentionList();
    MENTION_OPEN = true;
    return;
  }

  if (MENTION_INDEX >= items.length) MENTION_INDEX = 0;
  list.innerHTML = `
    <div class="mention-header">Mention a member</div>
    ${items.map((m, i) => mentionItemHtml(m, i)).join('')}
  `;
  list.classList.add('show');
  positionMentionList();
  MENTION_OPEN = true;
}

function mentionItemHtml(m, i) {
  return `
    <div class="mention-item ${i === MENTION_INDEX ? 'active' : ''}"
         data-name="${escapeHtml(m.name)}"
         onmousedown="event.preventDefault(); pickMention(${i});">
      <div class="avatar sm" style="background:${m.isAdmin ? '#DF2926' : '#444444'}">${escapeHtml(m.avatar)}</div>
      <div class="mention-item-info">
        <div class="mention-item-name">${escapeHtml(m.name)}</div>
        <div class="mention-item-role">${escapeHtml(m.role)}</div>
      </div>
    </div>
  `;
}

function positionMentionList() {
  const list = document.getElementById('mentionAutocomplete');
  const input = document.getElementById('composerInput');
  const r = input.getBoundingClientRect();
  list.style.left = r.left + 'px';
  list.style.top = (r.top - list.offsetHeight - 8) + 'px';
}

function hideMentionAutocomplete() {
  const list = document.getElementById('mentionAutocomplete');
  list.classList.remove('show');
  MENTION_OPEN = false;
  MENTION_INDEX = 0;
  MENTION_START = -1;
  MENTION_QUERY = '';
}

// ---------- Navigation + selection ----------

function moveMention(delta) {
  const items = getMentionCandidates();
  if (!items.length) return;
  MENTION_INDEX = (MENTION_INDEX + delta + items.length) % items.length;
  showMentionAutocomplete();
}

function pickMention(index) {
  const items = getMentionCandidates();
  if (typeof index === 'number') MENTION_INDEX = index;
  const pick = items[MENTION_INDEX];
  if (!pick) return;

  const input = document.getElementById('composerInput');
  const pos = input.selectionStart;
  const before = input.value.slice(0, MENTION_START);
  const after = input.value.slice(pos);
  const insert = '@' + pick.name + ' ';
  input.value = before + insert + after;

  const newPos = (before + insert).length;
  input.setSelectionRange(newPos, newPos);
  hideMentionAutocomplete();
  autoResize(input);
  toggleSendBtn();
  input.focus();
}

// ---------- Keyboard navigation (capture phase, so we can intercept Enter) ----------

document.getElementById('composerInput').addEventListener('keydown', e => {
  if (!MENTION_OPEN) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); moveMention(1); return; }
  if (e.key === 'ArrowUp')   { e.preventDefault(); e.stopImmediatePropagation(); moveMention(-1); return; }
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    e.stopImmediatePropagation();
    pickMention();
    return;
  }
  if (e.key === 'Escape') { e.stopImmediatePropagation(); hideMentionAutocomplete(); }
}, true);

// Hide on blur (delayed so onmousedown can register).
document.getElementById('composerInput').addEventListener('blur', () => {
  setTimeout(hideMentionAutocomplete, 120);
});

// Keep the floating list anchored to the composer.
window.addEventListener('resize', () => { if (MENTION_OPEN) positionMentionList(); });
window.addEventListener('scroll', () => { if (MENTION_OPEN) positionMentionList(); }, true);
