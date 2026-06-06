// Job statuses
export const JOB_STATUS = {
  DRAFT: 'draft',
  QUOTED: 'quoted',
  AWAITING: 'awaiting',
  ACCEPTED: 'accepted',
  SCHEDULED: 'scheduled',
  ORDERED: 'ordered',
  COMPLETED: 'completed',
  INVOICED: 'invoiced',
}

// Job source types
export const JOB_SOURCE = {
  DIRECT: 'direct',
  PROPERTY_MANAGER: 'property_manager',
  BUILDER: 'builder',
}

export const JOB_SOURCE_LABELS = {
  direct: 'Direct',
  property_manager: 'Property manager',
  builder: 'Builder',
}

// Item types
export const ITEM_TYPE = {
  DIAGNOSED: 'diagnosed',
  CUSTOM: 'custom',
}

// Joinery types (fits values)
export const JOINERY_TYPE = {
  SLIDING_DOOR: 'sliding_door',
  BIFOLD_DOOR: 'bifold_door',
  HINGED_DOOR: 'hinged_door',
  WINDOW_ALI: 'window_ali',
  WINDOW_TIMBER: 'window_timber',
}

export const JOINERY_TYPE_LABELS = {
  sliding_door: 'Sliding door',
  bifold_door: 'Bifold door',
  hinged_door: 'Hinged door',
  window_ali: 'Window (aluminium)',
  window_timber: 'Window (timber)',
}

// Fault options per joinery type (diagnosis matrix from 02-ux-spec.md)
export const FAULT_OPTIONS = {
  sliding_door: [
    { value: 'stiff', label: 'Stiff or hard to slide' },
    { value: 'wont_lock', label: "Won't lock or latch" },
    { value: 'misaligned', label: 'Off track or jumping' },
    { value: 'broken_hardware', label: 'Broken handle' },
    { value: 'drafty', label: 'Drafty or leaking' },
    { value: 'other', label: 'Other' },
  ],
  bifold_door: [
    { value: 'stiff', label: 'Stiff or dragging' },
    { value: 'misaligned', label: 'Misaligned panels' },
    { value: 'broken_hardware', label: 'Broken hinge' },
    { value: 'stiff', label: "Won't fold or unfold" },
    { value: 'wont_lock', label: 'Lock fault' },
    { value: 'other', label: 'Other' },
  ],
  hinged_door: [
    { value: 'stiff', label: 'Stiff or sagging' },
    { value: 'misaligned', label: "Won't close properly" },
    { value: 'broken_hardware', label: 'Broken hinge' },
    { value: 'wont_lock', label: 'Lock or latch fault' },
    { value: 'drafty', label: 'Drafty or leaking' },
    { value: 'other', label: 'Other' },
  ],
  window_ali: [
    { value: 'stiff', label: "Won't open or close" },
    { value: 'broken_hardware', label: 'Broken stay' },
    { value: 'broken_hardware', label: 'Broken handle' },
    { value: 'wont_lock', label: 'Lock fault' },
    { value: 'drafty', label: 'Drafty or leaking' },
    { value: 'other', label: 'Other' },
  ],
  window_timber: [
    { value: 'stiff', label: "Won't open or close" },
    { value: 'broken_hardware', label: 'Broken stay' },
    { value: 'broken_hardware', label: 'Broken handle' },
    { value: 'wont_lock', label: 'Lock fault' },
    { value: 'stiff', label: 'Swollen or stuck' },
    { value: 'other', label: 'Other' },
  ],
}

// Parts categories
export const PART_CATEGORY = {
  ROLLERS: 'rollers',
  STAYS: 'stays',
  HINGES: 'hinges',
  LOCKS: 'locks',
  HANDLES: 'handles',
  SEALS: 'seals',
  OTHER: 'other',
}

export const PART_CATEGORY_LABELS = {
  rollers: 'Rollers',
  stays: 'Stays',
  hinges: 'Hinges',
  locks: 'Locks',
  handles: 'Handles',
  seals: 'Seals',
  other: 'Other',
}

// fits values (from data model)
export const FITS_VALUES = [
  'sliding_door',
  'bifold_door',
  'hinged_door',
  'window_ali',
  'window_timber',
]

// fixes values (from data model)
export const FIXES_VALUES = [
  'stiff',
  'wont_lock',
  'broken_hardware',
  'misaligned',
  'drafty',
]

export const FIXES_LABELS = {
  stiff: 'Stiff or hard to move',
  wont_lock: "Won't lock or latch",
  broken_hardware: 'Broken hardware',
  misaligned: 'Misaligned',
  drafty: 'Drafty or leaking',
}

// Default callout zones (from 02-ux-spec.md and 03-data-model.md)
export const DEFAULT_CALLOUT_ZONES = [
  { id: 'local', name: 'Local', min_km: 0, max_km: 15, fee: 50 },
  { id: 'mid', name: 'Mid-range', min_km: 15, max_km: 30, fee: 75 },
  { id: 'far', name: 'Far', min_km: 30, max_km: null, fee: 100 },
]

// Duration presets
export const DURATION_PRESETS = [
  { value: 0.5, label: '30m' },
  { value: 1, label: '1hr' },
  { value: 1.5, label: '1.5hr' },
  { value: 2, label: '2hr+' },
]

// Default settings
export const DEFAULT_SETTINGS = {
  hourly_labour_rate: 95,
  default_markup_pct: 30,
  gst_rate: 15,
  day_start_minute: 480,
  day_end_target_minute: null,
  default_buffer_minutes: 10,
}

// Planner schedule states
export const SCHEDULE_STATE = {
  UNASSIGNED:      'unassigned',
  ASSIGNED:        'assigned',
  NEEDS_REBOOKING: 'needs_rebooking',
}

// Planner slot labels
export const SLOT = {
  MORNING:   'morning',
  AFTERNOON: 'afternoon',
}

// Photo types
export const PHOTO_TYPE = {
  BEFORE: 'before',
  AFTER: 'after',
  OTHER: 'other',
}
