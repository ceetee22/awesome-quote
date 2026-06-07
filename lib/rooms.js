export const ROOM_COLOURS = {
  green:  '#22A67A',
  purple: '#7B5CC3',
  blue:   '#3B82D6',
  amber:  '#E8940D',
  grey:   '#8CA3A0',
}

export const ROOM_TINTS = {
  green:  { bg: '#E6F7F0', border: '#C5E8D5' },
  purple: { bg: '#F0EBF8', border: '#D4C8E8' },
  blue:   { bg: '#E8F1FB', border: '#B5D4F4' },
  amber:  { bg: '#FEF7E6', border: '#F5E2B0' },
  grey:   { bg: '#F6F8F7', border: '#E4EAE8' },
}

const CATEGORY_MAP = {
  lounge: 'green', 'living room': 'green', 'sitting room': 'green',
  'dining room': 'green', office: 'green', reception: 'green',
  'meeting room': 'green', showroom: 'green', study: 'green',

  bedroom: 'purple', 'master bed': 'purple', 'master bedroom': 'purple',
  ensuite: 'purple', nursery: 'purple', 'guest bedroom': 'purple',

  kitchen: 'blue', bathroom: 'blue', laundry: 'blue',

  hallway: 'amber', garage: 'amber', deck: 'amber', stairs: 'amber',
  storeroom: 'amber', warehouse: 'amber', workshop: 'amber',
  'staff room': 'amber', entrance: 'amber', porch: 'amber', balcony: 'amber',
}

export function getRoomColourCategory(roomName) {
  if (!roomName) return 'grey'
  const base = roomName.toLowerCase().trim().replace(/\s+\d+$/, '')
  return CATEGORY_MAP[base] || 'grey'
}

export function getRoomColour(roomName) {
  return ROOM_COLOURS[getRoomColourCategory(roomName)]
}

export function getRoomTint(roomName) {
  return ROOM_TINTS[getRoomColourCategory(roomName)]
}
