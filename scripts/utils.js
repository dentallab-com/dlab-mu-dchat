// =============================================================================
// PURE UTILITIES
// Helpers that don't touch the DOM. Cheap, reusable.
// =============================================================================

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileTypeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg','jpeg','png','gif','webp','heic','svg'].includes(ext)) return 'image';
  if (['mp4','mov','webm','m4v','avi'].includes(ext)) return 'video';
  return 'file';
}

function fileIcon(type) {
  if (type === 'pdf') {
    return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>';
  }
  if (type === 'image') {
    return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
  }
  return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>';
}

function getColorForId(id) {
  const colors = ['#DF2926', '#1C1C1C', '#444444', '#A2171B', '#666666'];
  return colors[parseInt(id.slice(-1)) % colors.length];
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function isMember(c) {
  return c.members.some(m => m.email === STATE.currentUser.email);
}

function hasPendingRequest(c) {
  return c.joinRequests?.some(r => r.email === STATE.currentUser.email);
}

function nowHHMM() {
  const now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

function emailToInitials(email) {
  return email.split('@')[0]
    .split(/[._-]/)
    .map(p => p[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || '??';
}

function emailToDisplayName(email) {
  return email.split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function isExternalEmail(email) {
  return !email.endsWith('@dentallab.com');
}

// Wrap @MemberName tokens with a styled mention span. Names are matched
// against the active chat's members; longer names are tested first so
// "Dr. Patel" wins over "Patel".
function formatMsgText(text) {
  if (!text) return '';
  const safe = escapeHtml(text);
  const members = STATE.activeChat?.members || [];
  const names = members.map(m => m.name).sort((a, b) => b.length - a.length);
  if (!names.length) return safe;
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp('@(' + escaped.join('|') + ')', 'g');
  return safe.replace(pattern, '<span class="mention">@$1</span>');
}
