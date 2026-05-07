// =============================================================================
// SIDEBAR — chat list, search, pagination, view tabs, join requests
// =============================================================================

// ---------- Chat list rendering ----------

function renderChats() {
  const search = document.getElementById('searchInput').value.trim();
  const isAdmin = STATE.currentUser.isAdmin;
  const view = isAdmin ? STATE.view : 'joined';

  const joinedCases = sortJoined(STATE.cases.filter(isMember));
  const discoverCases = STATE.cases.filter(c => !isMember(c));

  document.getElementById('joinedCount').textContent = joinedCases.length;
  document.getElementById('discoverCount').textContent = discoverCases.length;

  const viewPool = view === 'joined' ? joinedCases : discoverCases;
  renderStatusFilter(viewPool);

  const statusFiltered = STATE.statusFilter && STATE.statusFilter !== 'all'
    ? viewPool.filter(c => c.status === STATE.statusFilter)
    : viewPool;
  const pool = filterPool(statusFiltered, search, isAdmin);
  renderChatListBody(pool, view, search, isAdmin);
  renderPaginationFooter(pool.length);

  document.getElementById('whitelistBtn').style.display = isAdmin ? 'flex' : 'none';
}

// ---------- Status filter pills ----------

function renderStatusFilter(viewPool) {
  const wrap = document.getElementById('statusFilter');
  if (!wrap) return;
  const counts = { all: viewPool.length };
  STATUS_ORDER.forEach(k => { counts[k] = viewPool.filter(c => c.status === k).length; });

  const allActive = STATE.statusFilter === 'all' ? 'active' : '';
  const allPill = `<button class="status-filter-pill ${allActive}" onclick="setStatusFilter('all')">All · ${counts.all}</button>`;

  const statusPills = STATUS_ORDER.map(k => {
    const meta = STATUS_META[k];
    const active = STATE.statusFilter === k;
    const activeStyle = active
      ? `background:${meta.bg}; color:${meta.color}; border-color:${meta.dot};`
      : '';
    return `<button class="status-filter-pill ${active ? 'active' : ''}" style="${activeStyle}" onclick="setStatusFilter('${k}')" title="${meta.label}">
      <span class="dot" style="background:${meta.dot};"></span>${meta.short} · ${counts[k]}
    </button>`;
  }).join('');

  wrap.innerHTML = allPill + statusPills;
}

function setStatusFilter(key) {
  STATE.statusFilter = key;
  STATE.currentPage = 1;
  renderChats();
}

// Pinned cases float to the top; relative order within each group is preserved.
function sortJoined(cases) {
  return cases.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
}

function filterPool(pool, search, isAdmin) {
  if (!search) return pool;
  if (isAdmin) {
    return pool.filter(c => c.id.includes(search) || (c.title || '').toLowerCase().includes(search.toLowerCase()));
  }
  return pool.filter(c => c.id === search);
}

function renderChatListBody(pool, view, search, isAdmin) {
  const list = document.getElementById('chatList');
  const total = pool.length;

  if (total === 0) {
    list.innerHTML = emptyChatListHtml(view, search, isAdmin);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / STATE.casesPerPage));
  if (STATE.currentPage > totalPages) STATE.currentPage = totalPages;
  const start = (STATE.currentPage - 1) * STATE.casesPerPage;
  const paginated = pool.slice(start, start + STATE.casesPerPage);

  list.innerHTML = paginated
    .map(c => view === 'discover' ? renderDiscoverItem(c) : renderJoinedItem(c))
    .join('');
}

function emptyChatListHtml(view, search, isAdmin) {
  let body;
  if (search) {
    body = `No cases found for "${search}".`;
  } else if (view === 'joined') {
    body = isAdmin
      ? `You haven't joined any cases yet.<br><br>Switch to <b>Discover</b> to find cases.`
      : `You haven't joined any cases yet.`;
  } else {
    body = 'No more cases to discover.';
  }
  const cta = isAdmin && view === 'joined'
    ? '<br><br><button onclick="openNewCaseModal()" style="color:var(--red); font-weight:600;">+ Create new case</button>'
    : '';
  return `
    <div style="padding:32px 16px; text-align:center; color:var(--text-mute); font-size:13px;">
      ${body}${cta}
    </div>
  `;
}

function renderPaginationFooter(total) {
  const totalPages = Math.max(1, Math.ceil(total / STATE.casesPerPage));
  const start = (STATE.currentPage - 1) * STATE.casesPerPage;
  document.getElementById('pageInfo').textContent =
    `${total === 0 ? 0 : start + 1}–${Math.min(start + STATE.casesPerPage, total)} of ${total}`;
  document.getElementById('prevPage').disabled = STATE.currentPage <= 1;
  document.getElementById('nextPage').disabled = STATE.currentPage >= totalPages;
}

// ---------- Item renderers ----------

function previewLine(lastMsg) {
  if (!lastMsg) return 'No messages yet';
  const files = lastMsg.files || (lastMsg.file ? [lastMsg.file] : []);
  if (files.length) {
    return '📎 ' + (files.length > 1 ? `${files.length} files` : files[0].name);
  }
  return lastMsg.text;
}

function renderJoinedItem(c) {
  const lastMsg = [...c.messages].reverse().find(m => m.type === 'msg');
  const preview = previewLine(lastMsg);
  const time = lastMsg ? lastMsg.time : c.createdAt;
  const active = STATE.activeChat?.id === c.id ? 'active' : '';
  const unread = c.unread || 0;
  const unreadBadge = unread > 0
    ? `<span class="chat-item-unread${c.muted ? ' muted' : ''}">${unread > 99 ? '99+' : unread}</span>`
    : '';

  return `
    <div class="chat-item ${active}${c.pinned ? ' pinned' : ''}" onclick="openChat('${c.id}')">
      <div class="avatar" style="background:${getColorForId(c.id)}">${c.id.slice(-2)}</div>
      <div class="chat-item-content">
        <div class="chat-item-top">
          <span class="chat-item-id">#${c.id}${c.pinned ? pinIconSvg() : ''}</span>
          <span class="chat-item-time">${c.muted ? muteIconSvg() : ''}${time}</span>
        </div>
        <div class="chat-item-title">${c.title || '—'}</div>
        <div class="chat-item-bottom">
          <span class="chat-item-preview">${preview}</span>
          <div class="chat-item-meta-right">
            ${statusPill(c.status, { sm: true })}
            ${unreadBadge}
          </div>
        </div>
      </div>
    </div>
  `;
}

function pinIconSvg() {
  return `<svg class="chat-item-pin" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"><path d="M14 4l6 6-3 1-1 5-3-3-5 5v-2l3-3-3-3 5-1 1-3 0-2z"/></svg>`;
}

function muteIconSvg() {
  return `<svg class="chat-item-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0M18.63 13A17 17 0 0 1 18 8M6.26 6.26A6 6 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.33-5M1 1l22 22"/></svg>`;
}

function renderDiscoverItem(c) {
  const requested = hasPendingRequest(c);
  const isAdmin = STATE.currentUser.isAdmin;
  const subtitle = `${c.doctor || 'No doctor assigned'}${c.patient ? ' · ' + c.patient : ''}`;
  const action = isAdmin
    ? `<button class="discover-action" onclick="event.stopPropagation(); directJoin('${c.id}')">Join</button>`
    : `<button class="discover-action ${requested ? 'requested' : ''}"
              onclick="event.stopPropagation(); requestJoin('${c.id}')"
              ${requested ? 'disabled' : ''}>
        ${requested ? 'Requested' : 'Request to Join'}
      </button>`;

  return `
    <div class="chat-item" ${isAdmin ? `onclick="directJoin('${c.id}')" style="cursor:pointer;"` : ''}>
      <div class="avatar" style="background:${getColorForId(c.id)}">${c.id.slice(-2)}</div>
      <div class="chat-item-content">
        <div class="chat-item-top">
          <span class="chat-item-id">#${c.id}</span>
          <span class="chat-item-time">${c.members.length} member${c.members.length === 1 ? '' : 's'}</span>
        </div>
        <div class="chat-item-title">${c.title || '—'}</div>
        <div class="chat-item-preview">${subtitle}</div>
      </div>
      ${action}
    </div>
  `;
}

// ---------- Pagination + view tabs ----------

function switchView(v) {
  STATE.view = v;
  STATE.statusFilter = 'all';
  STATE.currentPage = 1;
  document.querySelectorAll('.view-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === v);
  });
  renderChats();
}

function changePage(delta) {
  STATE.currentPage += delta;
  renderChats();
}

// ---------- Join / request flow ----------

function directJoin(id) {
  const c = STATE.cases.find(c => c.id === id);
  if (!c) return;
  const u = STATE.currentUser;
  if (c.members.some(m => m.email === u.email)) { openChat(id); return; }
  c.members.push({
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    isAdmin: u.isAdmin,
    isExternal: false
  });
  c.joinRequests = (c.joinRequests || []).filter(r => r.email !== u.email);
  c.messages.push({ type: 'system', text: u.name + ' joined the case' });
  showToast('Joined', `You joined #${c.id}.`, 'success');
  openChat(id);
}

function requestJoin(id) {
  const c = STATE.cases.find(c => c.id === id);
  if (!c) return;
  if (!c.joinRequests) c.joinRequests = [];
  if (c.joinRequests.some(r => r.email === STATE.currentUser.email)) {
    showToast('Already requested', 'Your request is pending admin approval.', 'error');
    return;
  }
  c.joinRequests.push({
    email: STATE.currentUser.email,
    name: STATE.currentUser.name,
    avatar: STATE.currentUser.avatar,
    requestedAt: 'Just now'
  });
  showToast('Request sent', `Admin will review your request to join #${id}.`, 'success');
  renderChats();
}

function approveRequest(caseId, email) {
  const c = STATE.cases.find(c => c.id === caseId);
  if (!c) return;
  const req = c.joinRequests?.find(r => r.email === email);
  if (!req) return;
  c.members.push({
    name: req.name,
    email: req.email,
    role: isExternalEmail(email) ? 'External' : 'Member',
    avatar: req.avatar,
    isAdmin: false,
    isExternal: isExternalEmail(email)
  });
  c.joinRequests = c.joinRequests.filter(r => r.email !== email);
  c.messages.push({ type: 'system', text: STATE.currentUser.name + ' approved ' + req.name + ' to join' });
  showToast('Approved', `${req.name} added to #${c.id}.`, 'success');
  renderInfoPanel();
  renderMessages();
  renderChats();
  document.getElementById('chatHeaderMeta').textContent = `${c.members.length} members · ${c.doctor || 'No doctor assigned'}`;
}

function rejectRequest(caseId, email) {
  const c = STATE.cases.find(c => c.id === caseId);
  if (!c) return;
  c.joinRequests = (c.joinRequests || []).filter(r => r.email !== email);
  showToast('Rejected', 'Join request rejected.', 'success');
  renderInfoPanel();
  renderChats();
}
