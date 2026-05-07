// =============================================================================
// SIDEBAR — chat list, search, pagination, view tabs, join requests
// =============================================================================

// ---------- Chat list rendering ----------

function renderChats() {
  const search = document.getElementById('searchInput').value.trim();
  const isAdmin = STATE.currentUser.isAdmin;
  const view = isAdmin ? STATE.view : 'joined';

  const allJoined      = sortJoined(STATE.cases.filter(isMember));
  const joinedActive   = allJoined.filter(c => !c.archived);
  const joinedArchived = allJoined.filter(c =>  c.archived);
  const discoverCases  = STATE.cases.filter(c => !isMember(c));

  // Joined tab count reflects active (non-archived) chats only.
  document.getElementById('joinedCount').textContent = joinedActive.length;
  document.getElementById('discoverCount').textContent = discoverCases.length;

  let viewPool;
  if (view === 'joined')        viewPool = joinedActive;
  else if (view === 'archived') viewPool = joinedArchived;
  else                          viewPool = discoverCases;

  renderChatToolbar(viewPool, view, joinedArchived.length);

  const statusFiltered = STATE.statusFilter && STATE.statusFilter !== 'all'
    ? viewPool.filter(c => c.status === STATE.statusFilter)
    : viewPool;
  const pool = filterPool(statusFiltered, search);
  renderChatListBody(pool, view, search, isAdmin);
  renderPaginationFooter(pool.length);

  document.getElementById('whitelistBtn').style.display = isAdmin ? 'flex' : 'none';
}

// ---------- Compact chat toolbar (status dropdown + archive icon) ----------

function renderChatToolbar(viewPool, view, archivedCount) {
  const wrap = document.getElementById('chatToolbar');
  if (!wrap) return;

  if (view === 'archived') {
    wrap.innerHTML = renderArchivedToolbar(archivedCount);
    return;
  }

  const counts = { all: viewPool.length };
  STATUS_ORDER.forEach(k => { counts[k] = viewPool.filter(c => c.status === k).length; });

  const filterTrigger = renderStatusFilterTrigger(counts);
  const filterMenu    = renderStatusFilterMenu(counts);
  const archiveBtn    = (view === 'joined' && archivedCount > 0)
    ? renderArchiveIconBtn(archivedCount)
    : '';

  wrap.innerHTML = `
    <div class="toolbar-filter-wrap">
      ${filterTrigger}
      ${filterMenu}
    </div>
    ${archiveBtn}
  `;
}

function renderStatusFilterTrigger(counts) {
  const key = STATE.statusFilter || 'all';
  if (key === 'all') {
    return `<button class="toolbar-filter-btn" onclick="event.stopPropagation(); toggleFilterMenu();">
      All · ${counts.all} <span class="caret">▾</span>
    </button>`;
  }
  const meta = STATUS_META[key];
  return `<button class="toolbar-filter-btn active" onclick="event.stopPropagation(); toggleFilterMenu();"
                  style="background:${meta.bg}; color:${meta.color};" title="${meta.label}">
    <span class="dot" style="background:${meta.dot};"></span>${meta.short} · ${counts[key]} <span class="caret">▾</span>
  </button>`;
}

function renderStatusFilterMenu(counts) {
  const items = [
    { key: 'all', label: 'All', dot: null, count: counts.all },
    ...STATUS_ORDER.map(k => ({
      key: k, label: STATUS_META[k].short, dot: STATUS_META[k].dot, count: counts[k]
    }))
  ];
  return `
    <div class="toolbar-filter-menu" id="toolbarFilterMenu">
      ${items.map(it => {
        const isActive = (STATE.statusFilter || 'all') === it.key;
        const dotHtml = it.dot ? `<span class="dot" style="background:${it.dot};"></span>` : '<span class="dot dot-empty"></span>';
        return `<button class="${isActive ? 'current' : ''}" onclick="setStatusFilter('${it.key}')">
          ${dotHtml}<span class="label">${it.label}</span><span class="count">${it.count}</span>
        </button>`;
      }).join('')}
    </div>
  `;
}

function renderArchiveIconBtn(count) {
  return `
    <button class="toolbar-archive-btn" onclick="switchView('archived')" title="View archived chats (${count})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
      </svg>
      <span class="toolbar-archive-badge">${count}</span>
    </button>
  `;
}

function renderArchivedToolbar(count) {
  return `
    <button class="toolbar-back-btn" onclick="switchView('joined')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back to Joined
    </button>
    <div class="toolbar-archived-label">Archived · ${count}</div>
  `;
}

function setStatusFilter(key) {
  STATE.statusFilter = key;
  STATE.currentPage = 1;
  hideFilterMenu();
  renderChats();
}

function toggleFilterMenu() {
  document.getElementById('toolbarFilterMenu')?.classList.toggle('show');
}

function hideFilterMenu() {
  document.getElementById('toolbarFilterMenu')?.classList.remove('show');
}

// Click anywhere outside the dropdown closes it.
document.addEventListener('click', (e) => {
  const menu = document.getElementById('toolbarFilterMenu');
  if (menu && menu.classList.contains('show') && !e.target.closest('.toolbar-filter-wrap')) {
    menu.classList.remove('show');
  }
});

// Pinned cases float to the top; relative order within each group is preserved.
function sortJoined(cases) {
  return cases.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
}

// Partial match on case ID + title for both admins and non-admins. Privacy
// for non-admins is preserved by the fact that the Discover tab is hidden
// from them — non-joined cases only surface via the "Cases you can request
// to join" section in renderChatListBody, which requires an exact case-ID
// match (so users can't browse other people's cases by partial text).
function filterPool(pool, search) {
  if (!search) return pool;
  const q = search.toLowerCase();
  return pool.filter(c =>
    c.id.includes(search) ||
    (c.title || '').toLowerCase().includes(q)
  );
}

function renderChatListBody(pool, view, search, isAdmin) {
  const list = document.getElementById('chatList');

  // Non-admins can't browse the Discover tab. When they search by an exact
  // case ID, surface that non-joined case under a "Request to join" section
  // so they can request access without needing browse permission.
  const joinableMatches = (!isAdmin && view === 'joined' && search)
    ? findJoinableByExactId(search)
    : [];

  // Empty: no joined matches AND nothing joinable.
  if (pool.length === 0 && joinableMatches.length === 0) {
    list.innerHTML = emptyChatListHtml(view, search, isAdmin);
    return;
  }

  let body = '';

  if (pool.length > 0) {
    const totalPages = Math.max(1, Math.ceil(pool.length / STATE.casesPerPage));
    if (STATE.currentPage > totalPages) STATE.currentPage = totalPages;
    const start = (STATE.currentPage - 1) * STATE.casesPerPage;
    const paginated = pool.slice(start, start + STATE.casesPerPage);
    body = paginated
      .map(c => view === 'discover' ? renderDiscoverItem(c) : renderJoinedItem(c))
      .join('');
  }

  if (joinableMatches.length > 0) {
    body += `
      <div class="search-section-header">Cases you can request to join</div>
      ${joinableMatches.map(c => renderDiscoverItem(c)).join('')}
    `;
  }

  list.innerHTML = body;
}

function findJoinableByExactId(search) {
  return STATE.cases.filter(c =>
    !isMember(c) && !c.archived && c.id === search
  );
}

function emptyChatListHtml(view, search, isAdmin) {
  let body;
  if (search) {
    body = `No cases found for "${search}".`;
  } else if (view === 'archived') {
    body = 'No archived chats.';
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

  // Hide the pagination row entirely when there's only one page —
  // a "1–6 of 6" with no next page is pure noise.
  const wrap = document.getElementById('chatPagination');
  if (totalPages <= 1) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'flex';

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
  // Show doctor + patient (case-level info). Member count is intentionally
  // dropped — it only exposed group identity without helping the user decide.
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
          <span class="chat-item-time">${c.createdAt}</span>
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
