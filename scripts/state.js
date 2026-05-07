// =============================================================================
// STATE & MOCK DATA
// Single source of truth for the demo. All other modules read/write through STATE.
// =============================================================================

const STATE = {
  currentUser: {
    name: 'Faisal Ahmed',
    email: 'faisal.ahmed@dentallab.com',
    role: 'Lab Manager',
    department: 'Production',
    isAdmin: true,
    avatar: 'FA',
    color: '#DF2926'
  },
  cases: [],
  activeChat: null,
  pendingEmails: [],
  theme: 'light',
  view: 'joined',           // 'joined' | 'discover'
  currentPage: 1,
  casesPerPage: 10,
  whitelist: [
    { email: 'r.patel@brightsmile.com', addedBy: 'Faisal Ahmed', addedAt: 'Apr 28' },
    { email: 'h.brennan@familycare.com', addedBy: 'Faisal Ahmed', addedAt: 'Apr 22' }
  ],
  notificationsEnabled: false
};

const DEMO_USERS = {
  'faisal.ahmed@dentallab.com': {
    name: 'Faisal Ahmed',
    email: 'faisal.ahmed@dentallab.com',
    role: 'Lab Manager',
    department: 'Production',
    isAdmin: true,
    avatar: 'FA'
  },
  'rifat@dentallab.com': {
    name: 'Rifat',
    email: 'rifat@dentallab.com',
    role: 'Technician',
    department: 'Production',
    isAdmin: false,
    avatar: 'RI'
  }
};

const MOCK_CASES = [
  {
    id: '5678656',
    title: 'Crown — Upper Molar',
    patient: 'John Doe',
    doctor: 'Dr. Patel',
    createdAt: 'Apr 28',
    members: [
      { name: 'Faisal Ahmed', email: 'faisal.ahmed@dentallab.com', role: 'Lab Manager', avatar: 'FA', isAdmin: true, isExternal: false },
      { name: 'Rifat', email: 'rifat@dentallab.com', role: 'Technician', avatar: 'RI', isAdmin: false, isExternal: false },
      { name: 'Dr. Patel', email: 'r.patel@brightsmile.com', role: 'Dentist (External)', avatar: 'RP', isAdmin: false, isExternal: true }
    ],
    messages: [
      { type: 'system', text: 'Faisal Ahmed created this case' },
      { type: 'msg', sender: 'Rifat', avatar: 'RI', text: 'Got the impression scan today. Looks clean, no remakes needed.', time: '09:14', own: false },
      { type: 'msg', sender: 'Rifat', avatar: 'RI', text: 'Starting on the model now.', time: '09:15', own: false },
      { type: 'msg', sender: 'Faisal Ahmed', avatar: 'FA', text: 'Good. Dr. Patel is hoping for delivery by Friday — can we make that?', time: '09:18', own: true },
      { type: 'msg', sender: 'Rifat', avatar: 'RI', text: 'Yes, should be no problem. Will have it ready Thursday EOD for QC.', time: '09:21', own: false },
      { type: 'msg', sender: 'Dr. Patel', avatar: 'RP', text: 'Thanks team. Patient is flying out Saturday so this timing is critical.', time: '11:42', own: false },
      { type: 'system', text: 'Dr. Patel shared a file' },
      { type: 'msg', sender: 'Dr. Patel', avatar: 'RP', text: 'Here are the bite registration photos from the appointment.', time: '11:43', own: false, file: { name: 'bite_registration.pdf', size: '2.4 MB', icon: 'pdf' } },
      { type: 'msg', sender: 'Faisal Ahmed', avatar: 'FA', text: 'Got it — forwarding to Rifat.', time: '11:50', own: true }
    ]
  },
  {
    id: '5678412',
    title: 'Bridge — Anterior',
    patient: 'Jane Smith',
    doctor: 'Dr. Hassan',
    createdAt: 'Apr 27',
    members: [
      { name: 'Faisal Ahmed', email: 'faisal.ahmed@dentallab.com', role: 'Lab Manager', avatar: 'FA', isAdmin: true, isExternal: false },
      { name: 'Aisha Khan', email: 'aisha.khan@dentallab.com', role: 'Technician', avatar: 'AK', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Faisal Ahmed created this case' },
      { type: 'msg', sender: 'Aisha Khan', avatar: 'AK', text: 'Shade match looks tricky on this one. Patient has very translucent enamel.', time: 'Yesterday', own: false },
      { type: 'msg', sender: 'Faisal Ahmed', avatar: 'FA', text: "Let's do A1 with B1 incisal layering. Check the photos again.", time: 'Yesterday', own: true }
    ]
  },
  {
    id: '5678123',
    title: 'Implant Abutment',
    patient: 'Robert Lee',
    doctor: 'Dr. Hassan',
    createdAt: 'Apr 25',
    members: [
      { name: 'Faisal Ahmed', email: 'faisal.ahmed@dentallab.com', role: 'Lab Manager', avatar: 'FA', isAdmin: true, isExternal: false },
      { name: 'Rifat', email: 'rifat@dentallab.com', role: 'Technician', avatar: 'RI', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Faisal Ahmed created this case' },
      { type: 'msg', sender: 'Rifat', avatar: 'RI', text: 'Abutment milled. Sending photos.', time: 'Apr 25', own: false, file: { name: 'abutment_photo.jpg', size: '4.1 MB', icon: 'image' } },
      { type: 'msg', sender: 'Faisal Ahmed', avatar: 'FA', text: 'Looks good. Approved for shipping.', time: 'Apr 25', own: true }
    ]
  },
  {
    id: '5677998',
    title: 'Denture Repair',
    patient: 'Maria Garcia',
    doctor: 'Dr. Brennan',
    createdAt: 'Apr 22',
    members: [
      { name: 'Faisal Ahmed', email: 'faisal.ahmed@dentallab.com', role: 'Lab Manager', avatar: 'FA', isAdmin: true, isExternal: false }
    ],
    joinRequests: [
      { name: 'Tom Wright', email: 'tom.wright@dentallab.com', avatar: 'TW', requestedAt: '2h ago' }
    ],
    messages: [
      { type: 'system', text: 'Faisal Ahmed created this case' },
      { type: 'msg', sender: 'Faisal Ahmed', avatar: 'FA', text: 'Repair complete. Ready for pickup.', time: 'Apr 22', own: true }
    ]
  },
  {
    id: '5677845',
    title: 'Veneer Set — Anterior 6',
    patient: 'Emily Brooks',
    doctor: 'Dr. Patel',
    createdAt: 'Apr 20',
    members: [
      { name: 'Faisal Ahmed', email: 'faisal.ahmed@dentallab.com', role: 'Lab Manager', avatar: 'FA', isAdmin: true, isExternal: false },
      { name: 'Aisha Khan', email: 'aisha.khan@dentallab.com', role: 'Technician', avatar: 'AK', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Faisal Ahmed created this case' },
      { type: 'msg', sender: 'Aisha Khan', avatar: 'AK', text: 'Wax-up done. Sending photos for approval.', time: 'Apr 20', own: false }
    ]
  },
  {
    id: '5677654',
    title: 'Night Guard',
    patient: 'David Wong',
    doctor: 'Dr. Hassan',
    createdAt: 'Apr 18',
    members: [
      { name: 'Rifat', email: 'rifat@dentallab.com', role: 'Technician', avatar: 'RI', isAdmin: false, isExternal: false },
      { name: 'Dr. Hassan', email: 's.hassan@brightsmile.com', role: 'Dentist (External)', avatar: 'SH', isAdmin: false, isExternal: true }
    ],
    messages: [
      { type: 'system', text: 'Rifat created this case' },
      { type: 'msg', sender: 'Rifat', avatar: 'RI', text: 'Impression looks good. Starting fabrication.', time: 'Apr 18', own: false }
    ]
  },
  {
    id: '5677432',
    title: 'Inlay — Lower Right',
    patient: 'Anna Park',
    doctor: 'Dr. Brennan',
    createdAt: 'Apr 17',
    members: [
      { name: 'Aisha Khan', email: 'aisha.khan@dentallab.com', role: 'Technician', avatar: 'AK', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Aisha Khan created this case' }
    ]
  },
  {
    id: '5677321',
    title: 'Full Arch Implant',
    patient: 'Robert Lee',
    doctor: 'Dr. Patel',
    createdAt: 'Apr 15',
    members: [
      { name: 'Rifat', email: 'rifat@dentallab.com', role: 'Technician', avatar: 'RI', isAdmin: false, isExternal: false },
      { name: 'Tom Wright', email: 'tom.wright@dentallab.com', role: 'Technician', avatar: 'TW', isAdmin: false, isExternal: false }
    ],
    joinRequests: [
      { name: 'Aisha Khan', email: 'aisha.khan@dentallab.com', avatar: 'AK', requestedAt: '1d ago' }
    ],
    messages: [
      { type: 'system', text: 'Rifat created this case' },
      { type: 'msg', sender: 'Tom Wright', avatar: 'TW', text: 'Working on the framework today.', time: 'Apr 15', own: false }
    ]
  },
  {
    id: '5677210',
    title: 'Crown — Lower Bicuspid',
    patient: 'Linda Cho',
    doctor: 'Dr. Hassan',
    createdAt: 'Apr 14',
    members: [
      { name: 'Aisha Khan', email: 'aisha.khan@dentallab.com', role: 'Technician', avatar: 'AK', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Aisha Khan created this case' }
    ]
  },
  {
    id: '5677088',
    title: 'Partial Denture',
    patient: 'Henry Adams',
    doctor: 'Dr. Brennan',
    createdAt: 'Apr 12',
    members: [
      { name: 'Tom Wright', email: 'tom.wright@dentallab.com', role: 'Technician', avatar: 'TW', isAdmin: false, isExternal: false },
      { name: 'Rifat', email: 'rifat@dentallab.com', role: 'Technician', avatar: 'RI', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Tom Wright created this case' }
    ]
  },
  {
    id: '5676912',
    title: 'Bridge — Posterior 3-unit',
    patient: 'Grace Liu',
    doctor: 'Dr. Patel',
    createdAt: 'Apr 10',
    members: [
      { name: 'Aisha Khan', email: 'aisha.khan@dentallab.com', role: 'Technician', avatar: 'AK', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Aisha Khan created this case' }
    ]
  },
  {
    id: '5676755',
    title: 'Diagnostic Wax-up',
    patient: 'Marcus Webb',
    doctor: 'Dr. Hassan',
    createdAt: 'Apr 8',
    members: [
      { name: 'Faisal Ahmed', email: 'faisal.ahmed@dentallab.com', role: 'Lab Manager', avatar: 'FA', isAdmin: true, isExternal: false },
      { name: 'Tom Wright', email: 'tom.wright@dentallab.com', role: 'Technician', avatar: 'TW', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Faisal Ahmed created this case' },
      { type: 'msg', sender: 'Tom Wright', avatar: 'TW', text: 'Wax-up sent for approval.', time: 'Apr 8', own: false }
    ]
  },
  {
    id: '5676623',
    title: 'Implant Crown',
    patient: 'Olivia Reed',
    doctor: 'Dr. Patel',
    createdAt: 'Apr 5',
    members: [
      { name: 'Rifat', email: 'rifat@dentallab.com', role: 'Technician', avatar: 'RI', isAdmin: false, isExternal: false }
    ],
    messages: [
      { type: 'system', text: 'Rifat created this case' }
    ]
  }
];

STATE.cases = MOCK_CASES;

// ===================================================================
// CASE STATUS CONFIG
// ===================================================================
const STATUS_META = {
  impression: { label: 'Impression Received', dot: '#3B82F6', color: '#1D4ED8', bg: 'rgba(59,130,246,0.14)' },
  production: { label: 'In Production',       dot: '#DF2926', color: '#A2171B', bg: 'rgba(223,41,38,0.14)' },
  approval:   { label: 'Awaiting Approval',   dot: '#F59E0B', color: '#B45309', bg: 'rgba(245,158,11,0.18)' },
  shipped:    { label: 'Shipped',             dot: '#2D6A4F', color: '#2D6A4F', bg: 'rgba(45,106,79,0.16)' },
  completed:  { label: 'Completed',           dot: '#888888', color: '#555555', bg: 'rgba(120,120,120,0.16)' }
};
const STATUS_ORDER = ['impression', 'production', 'approval', 'shipped', 'completed'];

const STATUS_DEFAULTS = {
  '5678656': 'production',
  '5678412': 'approval',
  '5678123': 'shipped',
  '5677998': 'completed',
  '5677845': 'approval',
  '5677654': 'production',
  '5677432': 'impression',
  '5677321': 'production',
  '5677210': 'impression',
  '5677088': 'impression',
  '5676912': 'impression',
  '5676755': 'approval',
  '5676623': 'production'
};
const UNREAD_SEED = { '5678412': 2, '5677321': 1, '5677845': 3 };
const PIN_SEED    = { '5678656': true, '5678412': true };
const MUTE_SEED   = { '5677654': true };

// Apply default status + unread + pin/mute to seeded cases
STATE.cases.forEach(c => {
  if (!c.status)               c.status = STATUS_DEFAULTS[c.id] || 'production';
  if (c.unread === undefined)  c.unread = UNREAD_SEED[c.id] || 0;
  if (c.pinned === undefined)  c.pinned = !!PIN_SEED[c.id];
  if (c.muted  === undefined)  c.muted  = !!MUTE_SEED[c.id];
});

// ===================================================================
// STATUS RENDER HELPERS
// ===================================================================
function statusMetaFor(key) {
  return STATUS_META[key] || STATUS_META.production;
}

function statusPill(statusKey, opts = {}) {
  const meta = statusMetaFor(statusKey);
  const cls = opts.sm ? 'status-pill sm' : 'status-pill';
  return `<span class="${cls}" style="background:${meta.bg}; color:${meta.color};">
    <span class="dot" style="background:${meta.dot};"></span>${meta.label}
  </span>`;
}

function statusButton(statusKey) {
  const meta = statusMetaFor(statusKey);
  return `<button class="status-pill" onclick="event.stopPropagation(); toggleStatusPicker();" style="background:${meta.bg}; color:${meta.color};">
    <span class="dot" style="background:${meta.dot};"></span>${meta.label}
  </button>`;
}
