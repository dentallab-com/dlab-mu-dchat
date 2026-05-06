// =============================================================================
// INFO PANEL — case details, members (kick), file gallery, join requests, admin
// renderInfoPanel composes single-purpose section renderers.
// =============================================================================

function toggleInfoPanel() {
  document.getElementById('app').classList.toggle('with-info');
}

function renderInfoPanel() {
  const c = STATE.activeChat;
  if (!c) return;
  const isAdmin = STATE.currentUser.isAdmin;
  const me = STATE.currentUser.email;

  document.getElementById('infoBody').innerHTML = `
    ${renderInfoHero(c)}
    ${renderInfoCaseDetails(c)}
    ${renderInfoMembers(c, isAdmin, me)}
    ${renderInfoFileGallery(c)}
    ${renderInfoJoinRequests(c, isAdmin)}
    ${renderInfoAdminActions(isAdmin)}
  `;
}

// ---------- Section renderers ----------

function renderInfoHero(c) {
  return `
    <div class="info-hero">
      <div class="avatar lg" style="background:${getColorForId(c.id)}">${c.id.slice(-2)}</div>
      <h4>#${c.id}</h4>
      <p>${escapeHtml(c.title || 'No title')}</p>
      <div style="margin-top:12px;">${statusPill(c.status)}</div>
    </div>
  `;
}

function renderInfoCaseDetails(c) {
  return `
    <div class="info-section">
      <h5>Case Details</h5>
      <div class="info-row"><span>Case ID</span><span>#${c.id}</span></div>
      <div class="info-row"><span>Title</span><span>${escapeHtml(c.title || '—')}</span></div>
      <div class="info-row"><span>Patient</span><span>${escapeHtml(c.patient || '—')}</span></div>
      <div class="info-row"><span>Doctor</span><span>${escapeHtml(c.doctor || '—')}</span></div>
      <div class="info-row"><span>Status</span><span>${STATUS_META[c.status]?.label || c.status}</span></div>
      <div class="info-row"><span>Created</span><span>${escapeHtml(c.createdAt)}</span></div>
    </div>
  `;
}

function renderInfoMembers(c, isAdmin, me) {
  return `
    <div class="info-section">
      <h5>Members (${c.members.length})</h5>
      ${c.members.map(m => renderMemberRow(m, c, isAdmin, me)).join('')}
    </div>
  `;
}

function renderMemberRow(m, c, isAdmin, me) {
  const canKick = isAdmin && m.email !== me && !m.isAdmin;
  return `
    <div class="member">
      <div class="avatar sm" style="background:${m.isAdmin ? '#DF2926' : '#444444'}">${escapeHtml(m.avatar)}</div>
      <div class="member-info">
        <div class="member-name">
          ${escapeHtml(m.name)}
          ${m.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
          ${m.isExternal ? '<span class="admin-badge" style="background:#666;">Ext</span>' : ''}
        </div>
        <div class="member-role">${escapeHtml(m.role)}</div>
      </div>
      ${canKick ? renderKickButton(m.email) : ''}
    </div>
  `;
}

function renderKickButton(email) {
  return `
    <button class="member-remove" onclick="kickMember('${email}')" title="Remove from case">
      <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  `;
}

function collectFiles(c) {
  const out = [];
  c.messages.forEach((m, idx) => {
    if (m.type !== 'msg') return;
    const files = m.files || (m.file ? [m.file] : []);
    files.forEach(f => out.push({
      ...f,
      sender: m.own ? 'You' : m.sender,
      time: m.time,
      msgIdx: idx
    }));
  });
  return out;
}

function renderInfoFileGallery(c) {
  const files = collectFiles(c);
  const body = files.length === 0
    ? '<div class="gallery-empty">No files shared in this case yet.</div>'
    : `<div class="file-gallery">
        ${files.slice().reverse().map(renderGalleryTile).join('')}
      </div>`;
  return `
    <div class="info-section">
      <h5>Shared Files (${files.length})</h5>
      ${body}
    </div>
  `;
}

function renderGalleryTile(f) {
  const tooltip = `${escapeHtml(f.name)} · ${escapeHtml(f.sender)} · ${escapeHtml(f.time)}`;
  return `
    <div class="gallery-tile" onclick="scrollToMsg(${f.msgIdx})" title="${tooltip}">
      <div class="gallery-tile-icon">${fileIcon(f.icon)}</div>
      <div class="gallery-tile-name">${escapeHtml(f.name)}</div>
    </div>
  `;
}

function renderInfoJoinRequests(c, isAdmin) {
  if (!isAdmin || !c.joinRequests?.length) return '';
  return `
    <div class="info-section">
      <h5>Pending Join Requests (${c.joinRequests.length})</h5>
      ${c.joinRequests.map(r => renderJoinRequestRow(c, r)).join('')}
    </div>
  `;
}

function renderJoinRequestRow(c, r) {
  return `
    <div class="request-row">
      <div class="avatar sm" style="background:#444;">${escapeHtml(r.avatar)}</div>
      <div class="req-info">
        <div class="req-name">${escapeHtml(r.name)}</div>
        <div class="req-email">${escapeHtml(r.email)} · ${escapeHtml(r.requestedAt)}</div>
      </div>
      <div class="req-actions">
        <button class="req-btn approve" onclick="approveRequest('${c.id}', '${r.email}')">Approve</button>
        <button class="req-btn reject" onclick="rejectRequest('${c.id}', '${r.email}')">Reject</button>
      </div>
    </div>
  `;
}

function renderInfoAdminActions(isAdmin) {
  if (!isAdmin) return '';
  return `
    <div class="info-section">
      <h5>Admin Actions</h5>
      <button class="btn btn-secondary" style="margin-top:0;" onclick="openInviteModal()">Invite Members</button>
      <button class="btn btn-secondary" onclick="openEditModal()">Edit Case Details</button>
      <div class="danger-zone">
        <div class="danger-zone-label">Danger Zone</div>
        <button class="danger-link" onclick="mockDelete()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
          Delete this case
        </button>
      </div>
    </div>
  `;
}

// ---------- Kick / remove member ----------

function kickMember(email) {
  if (!STATE.currentUser.isAdmin) return;
  const c = STATE.activeChat;
  if (!c) return;
  const m = c.members.find(mem => mem.email === email);
  if (!m) return;
  if (m.isAdmin) {
    showToast('Cannot remove admin', 'Admins cannot be removed from the case.', 'error');
    return;
  }
  if (!confirm(`Remove ${m.name} from #${c.id}? They will lose access to this case.`)) return;

  c.members = c.members.filter(mem => mem.email !== email);
  c.messages.push({
    type: 'system',
    text: `${STATE.currentUser.name} removed ${m.name} from the case`
  });
  showToast('Member removed', `${m.name} no longer has access to #${c.id}.`, 'success');

  document.getElementById('chatHeaderMeta').textContent =
    `${c.members.length} members · ${c.doctor || 'No doctor assigned'}`;

  renderInfoPanel();
  renderMessages();
  renderChats();
}
