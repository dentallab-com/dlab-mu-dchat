// =============================================================================
// REQUESTS CENTER — global admin view of pending join requests across all cases
// Pairs the existing per-case approve/reject UI in the info panel with a
// sidebar badge + modal so admins can act without opening each case.
// =============================================================================

function getAllPendingRequests() {
  const out = [];
  STATE.cases.forEach(c => {
    (c.joinRequests || []).forEach(r => {
      out.push({ caseId: c.id, caseTitle: c.title || '', request: r });
    });
  });
  return out;
}

function updateRequestsBadge() {
  const btn   = document.getElementById('requestsBtn');
  const badge = document.getElementById('requestsBadge');
  if (!btn || !badge) return;

  if (!STATE.currentUser.isAdmin) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'flex';

  const count = getAllPendingRequests().length;
  if (count === 0) {
    badge.hidden = true;
    badge.textContent = '0';
  } else {
    badge.hidden = false;
    badge.textContent = count > 99 ? '99+' : String(count);
  }
}

function openRequestsModal() {
  if (!STATE.currentUser.isAdmin) return;
  renderRequestsModalBody();
  document.getElementById('requestsModal').classList.add('show');
}

function renderRequestsModalBody() {
  const body  = document.getElementById('requestsModalBody');
  const count = document.getElementById('requestsModalCount');
  const all   = getAllPendingRequests();

  count.textContent = all.length ? `(${all.length})` : '';

  if (!all.length) {
    body.innerHTML = `
      <div style="padding:24px 8px; text-align:center; color:var(--text-mute); font-size:13px;">
        <div style="font-size:32px; margin-bottom:8px;">✓</div>
        No pending join requests.
      </div>`;
    return;
  }

  // Group by case so an admin can scan by chat.
  const byCase = {};
  all.forEach(({ caseId, caseTitle, request }) => {
    if (!byCase[caseId]) byCase[caseId] = { caseId, caseTitle, requests: [] };
    byCase[caseId].requests.push(request);
  });

  body.innerHTML = Object.values(byCase).map(group => `
    <div class="request-group">
      <div class="request-group-header">
        <span class="request-group-id">#${group.caseId}</span>
        ${group.caseTitle ? `<span class="request-group-title">· ${escapeHtml(group.caseTitle)}</span>` : ''}
      </div>
      ${group.requests.map(r => requestRowHtml(group.caseId, r)).join('')}
    </div>
  `).join('');
}

function requestRowHtml(caseId, r) {
  return `
    <div class="request-row">
      <div class="avatar sm" style="background:#444;">${escapeHtml(r.avatar)}</div>
      <div class="req-info">
        <div class="req-name">${escapeHtml(r.name)}</div>
        <div class="req-email">${escapeHtml(r.email)} · ${escapeHtml(r.requestedAt)}</div>
      </div>
      <div class="req-actions">
        <button class="req-btn approve" onclick="approveRequestFromModal('${caseId}', '${r.email}')">Approve</button>
        <button class="req-btn reject"  onclick="rejectRequestFromModal('${caseId}', '${r.email}')">Reject</button>
      </div>
    </div>
  `;
}

// Wrappers around the existing approve/reject functions so the modal refreshes
// itself in place after each click. Keeps the user inside the modal as long as
// there are still requests to act on.
function approveRequestFromModal(caseId, email) {
  approveRequest(caseId, email);
  renderRequestsModalBody();
}
function rejectRequestFromModal(caseId, email) {
  rejectRequest(caseId, email);
  renderRequestsModalBody();
}
