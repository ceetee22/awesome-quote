// Fills the database with realistic planner test data.
// Every seeded row is tagged in the notes field so it can be wiped cleanly.
// Requires supabase/10_geo_and_rebook.sql to have been applied first.
//
// Usage:
//   node scripts/seed-planner.js          — insert seed data
//   node scripts/seed-planner.js --wipe   — delete all seed data

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_TAG = 'SEED:planner'

// ─── Env ──────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date()
  d.setHours(12, 0, 0, 0) // noon to avoid DST edge-cases
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d, n) {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Cascade helper ───────────────────────────────────────────────────────────
// Inlined from lib/cascade.js — same logic, flat travel placeholder.

function computeStarts(jobs, { dayStartMin = 480, bufferMin = 10 } = {}) {
  const starts = []
  let cursor = dayStartMin
  for (let i = 0; i < jobs.length; i++) {
    const start = i === 0 ? dayStartMin : cursor + bufferMin
    starts.push(start)
    cursor = start + jobs[i].durationMin
  }
  return starts
}

// ─── Seed data ────────────────────────────────────────────────────────────────

function buildData() {
  const monday = getMonday(new Date())

  // Week-grid dates (Mon=+0, Tue=+1, Thu=+3, next Mon=+7, next Wed=+9, next Fri=+11)
  const tuesdayStr   = toDateStr(addDays(monday, 1))
  const thursdayStr  = toDateStr(addDays(monday, 3))
  const nxtMondayStr = toDateStr(addDays(monday, 7))
  const nxtWedStr    = toDateStr(addDays(monday, 9))
  const nxtFridayStr = toDateStr(addDays(monday, 11))

  // Tuesday cascade: 3 jobs, durations 1.5 hr / 1 hr / 1 hr
  const [tsA, tsB, tsC] = computeStarts([
    { durationMin: 90 },
    { durationMin: 60 },
    { durationMin: 60 },
  ])

  // ── Jobs ───────────────────────────────────────────────────────────────────

  const jobs = [

    // ─── Backlog: aged (18–21 days) ─────────────────────────────────────────

    {
      id: 'seed-j01',
      customer_name: 'Derek Walsh',
      customer_address: '14 Tiriwa Drive, Henderson',
      customer_phone: '021 456 7890',
      customer_lat: -36.8750, customer_lng: 174.6265,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(19),
      callout_fee: 50, hourly_rate: 95, labour_hours: 1.5,
      estimated_duration: 1.5,
      notes: `Sliding door has jumped off the bottom track and won't slide. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j02',
      customer_name: 'Urbex Property Management',
      customer_address: '4 Pompalier Terrace, Te Atatū',
      customer_phone: '09 888 1234',
      customer_lat: -36.8698, customer_lng: 174.6613,
      source: 'property_manager',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(21),
      callout_fee: 75, hourly_rate: 95, labour_hours: 1.5,
      estimated_duration: 2,
      notes: `Bifold door: lock not engaging and bottom hinge cracked — two items. [${SEED_TAG}]`,
    },

    // ─── Backlog: mid-aged (10–14 days) ─────────────────────────────────────

    {
      id: 'seed-j03',
      customer_name: 'Sandra Kirwan',
      customer_address: '38 Blockhouse Bay Road, New Lynn',
      customer_phone: '021 987 6543',
      customer_lat: -36.9016, customer_lng: 174.6843,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(14),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Aluminium window stay snapped off. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j04',
      customer_name: 'Mark Dalton',
      customer_address: '7 Glengarry Road, Glen Eden',
      customer_phone: '021 333 4455',
      customer_lat: -36.9063, customer_lng: 174.6325,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(12),
      callout_fee: 50, hourly_rate: 95, labour_hours: 1,
      estimated_duration: 1.5,
      notes: `Hinged door dropped on the hinge side, won't close flush. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j05',
      customer_name: 'West Auckland Property Management',
      customer_address: '22 Huia Road, Titirangi',
      customer_phone: '09 777 5566',
      customer_lat: -36.9303, customer_lng: 174.6457,
      source: 'property_manager',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(10),
      callout_fee: 75, hourly_rate: 95, labour_hours: 1,
      estimated_duration: 1.5,
      notes: `Timber window stuck shut (swollen) and weatherseal perished along the sill — two items. [${SEED_TAG}]`,
    },

    // ─── Backlog: recent (2–7 days) ──────────────────────────────────────────

    {
      id: 'seed-j06',
      customer_name: 'Michelle Cooper',
      customer_address: '5 Victor Street, Avondale',
      customer_phone: '021 111 2233',
      customer_lat: -36.8900, customer_lng: 174.7000,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(7),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Sliding door leaking air around the frame, weatherseal has come away. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j07',
      customer_name: 'Jason Hemi',
      customer_address: '91 Don Buck Road, Massey',
      customer_phone: '021 555 0011',
      customer_lat: -36.8636, customer_lng: 174.6135,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(5),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Sliding door very stiff, rollers worn flat — needs new roller pair. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j08',
      customer_name: 'Diane Sione',
      customer_address: '3 Crows Road, Ranui',
      customer_phone: '021 222 3344',
      customer_lat: -36.8752, customer_lng: 174.6096,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(4),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Hinged door latch not catching the striker, door swings open. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j09',
      customer_name: 'Paul Sutton',
      customer_address: '15 Sunline Avenue, Swanson',
      customer_phone: '021 666 7788',
      customer_lat: -36.8779, customer_lng: 174.5758,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(3),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Bifold panels dragging on the floor, guide track bent out of line. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j10',
      customer_name: 'Steph Fong',
      customer_address: '6 Kelston Drive, Kelston',
      customer_phone: '021 444 8899',
      customer_lat: -36.8915, customer_lng: 174.6572,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(2),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Sliding door stiff over summer, rollers need replacing. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j11',
      customer_name: 'Signature Renovations',
      customer_address: '82 Rathgar Road, Henderson',
      customer_phone: '09 838 1122',
      customer_lat: -36.8750, customer_lng: 174.6265,
      source: 'builder',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(2),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 0.5,
      notes: `Sliding door handle cracked during fit-out, needs like-for-like replacement. [${SEED_TAG}]`,
    },

    // ─── Backlog: very recent (yesterday / today) ────────────────────────────

    {
      id: 'seed-j12',
      customer_name: 'Anne Tuilagi',
      customer_address: '11 Armour Bay Road, Green Bay',
      customer_phone: '021 123 9876',
      customer_lat: -36.9254, customer_lng: 174.6912,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(1),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Aluminium window stay broken, window won't stay open. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j13',
      customer_name: 'Lisa Park',
      customer_address: '48 Richardson Road, Mt Roskill',
      customer_phone: '021 777 4321',
      customer_lat: -36.9109, customer_lng: 174.7290,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(0),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Sliding door leaking rain underneath, old weatherseal needs replacing. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j14',
      customer_name: 'Oakdale Property Group',
      customer_address: '3 Buchanan Street, Pt Chevalier',
      customer_phone: '09 845 3311',
      customer_lat: -36.8786, customer_lng: 174.7197,
      source: 'property_manager',
      status: 'accepted',
      schedule_state: 'unassigned',
      accepted_at: daysAgo(0),
      callout_fee: 75, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Timber window painted shut by previous tenant, won't open at all. [${SEED_TAG}]`,
    },

    // ─── Needs rebooking ─────────────────────────────────────────────────────

    {
      id: 'seed-j15',
      customer_name: 'Craig Webb',
      customer_address: '34 Wingate Street, Kelston',
      customer_phone: '021 345 6780',
      customer_lat: -36.8915, customer_lng: 174.6572,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'needs_rebooking',
      accepted_at: daysAgo(25),
      bumped_from_date: toDateStr(addDays(new Date(), -5)),
      callout_fee: 50, hourly_rate: 95, labour_hours: 1,
      estimated_duration: 1.5,
      notes: `Hinged door dropped badly, not closing. Rescheduled from last week — customer was away. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j16',
      customer_name: 'Tracy Morgan',
      customer_address: '19 View Road, Blockhouse Bay',
      customer_phone: '021 987 0011',
      customer_lat: -36.9063, customer_lng: 174.7113,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'needs_rebooking',
      accepted_at: daysAgo(18),
      bumped_from_date: toDateStr(addDays(new Date(), -2)),
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      estimated_duration: 1,
      notes: `Aluminium window lock seized, won't open. Rescheduled — part not in stock at time of booking. [${SEED_TAG}]`,
    },

    // ─── Week grid: Tuesday (3 jobs) ─────────────────────────────────────────

    {
      id: 'seed-j17',
      customer_name: 'Rob Tanner',
      customer_address: '67 Lincoln Road, Henderson',
      customer_phone: '021 112 3344',
      customer_lat: -36.8750, customer_lng: 174.6265,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'assigned',
      accepted_at: daysAgo(8),
      scheduled_date: tuesdayStr,
      slot: 'morning',
      estimated_duration: 1.5,
      sequence_index: 0,
      start_minute: tsA,
      callout_fee: 50, hourly_rate: 95, labour_hours: 1.5,
      notes: `Sliding door off track — front. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j18',
      customer_name: 'Viv Hayward',
      customer_address: '12 Sabulite Road, Avondale',
      customer_phone: '021 223 4455',
      customer_lat: -36.8900, customer_lng: 174.7000,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'assigned',
      accepted_at: daysAgo(6),
      scheduled_date: tuesdayStr,
      slot: 'morning',
      estimated_duration: 1,
      sequence_index: 1,
      start_minute: tsB,
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      notes: `Aluminium window stay broken. [${SEED_TAG}]`,
    },
    {
      id: 'seed-j19',
      customer_name: 'Tony Leausa',
      customer_address: '3 Glengarry Road, Glen Eden',
      customer_phone: '021 334 5566',
      customer_lat: -36.9063, customer_lng: 174.6325,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'assigned',
      accepted_at: daysAgo(4),
      scheduled_date: tuesdayStr,
      slot: 'morning',
      estimated_duration: 1,
      sequence_index: 2,
      start_minute: tsC,
      callout_fee: 50, hourly_rate: 95, labour_hours: 1,
      notes: `Hinged door won't close on the latch. [${SEED_TAG}]`,
    },

    // ─── Week grid: Thursday (1 job) ─────────────────────────────────────────

    {
      id: 'seed-j20',
      customer_name: 'Kate Perkins',
      customer_address: '54 Veronica Street, New Lynn',
      customer_phone: '021 445 6677',
      customer_lat: -36.9016, customer_lng: 174.6843,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'assigned',
      accepted_at: daysAgo(9),
      scheduled_date: thursdayStr,
      slot: 'morning',
      estimated_duration: 1,
      sequence_index: 0,
      start_minute: 480,
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      notes: `Aluminium window latch not catching. [${SEED_TAG}]`,
    },

    // ─── Week grid: next Monday (1 job, afternoon) ───────────────────────────

    {
      id: 'seed-j21',
      customer_name: 'Ben Tait',
      customer_address: '8 Sunline Avenue, Ranui',
      customer_phone: '021 556 7788',
      customer_lat: -36.8752, customer_lng: 174.6096,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'assigned',
      accepted_at: daysAgo(7),
      scheduled_date: nxtMondayStr,
      slot: 'afternoon',
      estimated_duration: 1,
      sequence_index: 0,
      start_minute: 780, // 1:00 pm
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      notes: `Sliding door rollers worn, stiff to open. [${SEED_TAG}]`,
    },

    // ─── Week grid: next Wednesday (1 job) ───────────────────────────────────

    {
      id: 'seed-j22',
      customer_name: 'Sue Rawiri',
      customer_address: '31 Don Buck Road, Massey',
      customer_phone: '021 667 8899',
      customer_lat: -36.8636, customer_lng: 174.6135,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'assigned',
      accepted_at: daysAgo(5),
      scheduled_date: nxtWedStr,
      slot: 'morning',
      estimated_duration: 1,
      sequence_index: 0,
      start_minute: 480,
      callout_fee: 50, hourly_rate: 95, labour_hours: 0.5,
      notes: `Bifold door panels misaligned, catching at the top. [${SEED_TAG}]`,
    },

    // ─── Week grid: next Friday (1 job) ──────────────────────────────────────

    {
      id: 'seed-j23',
      customer_name: 'Glen Makoare',
      customer_address: '19 Titirangi Road, Titirangi',
      customer_phone: '021 778 9900',
      customer_lat: -36.9303, customer_lng: 174.6457,
      source: 'direct',
      status: 'accepted',
      schedule_state: 'assigned',
      accepted_at: daysAgo(3),
      scheduled_date: nxtFridayStr,
      slot: 'morning',
      estimated_duration: 1.5,
      sequence_index: 0,
      start_minute: 480,
      callout_fee: 50, hourly_rate: 95, labour_hours: 1,
      notes: `Timber window swollen, can't open for ventilation. [${SEED_TAG}]`,
    },
  ]

  // ── Job items ──────────────────────────────────────────────────────────────
  // Only backlog and rebook jobs need items for the value/summary display.

  const items = [
    // seed-j01: sliding door, off track
    { id: 'seed-i01a', job_id: 'seed-j01', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'sliding_door', joinery_type_label: 'Sliding door',
      fault: 'misaligned', fault_label: 'Off track or jumping',
      description: 'Sliding door off track', labour_hours: 1.5 },

    // seed-j02: bifold, 2 items
    { id: 'seed-i02a', job_id: 'seed-j02', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'bifold_door', joinery_type_label: 'Bifold door',
      fault: 'wont_lock', fault_label: 'Lock fault',
      description: 'Bifold door lock not engaging', labour_hours: 1 },
    { id: 'seed-i02b', job_id: 'seed-j02', type: 'diagnosed', sort_order: 1, hourly_rate: 95,
      joinery_type: 'bifold_door', joinery_type_label: 'Bifold door',
      fault: 'broken_hardware', fault_label: 'Broken hinge',
      description: 'Cracked bottom hinge', labour_hours: 0.5 },

    // seed-j03: aluminium window stay
    { id: 'seed-i03a', job_id: 'seed-j03', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'window_ali', joinery_type_label: 'Window (aluminium)',
      fault: 'broken_hardware', fault_label: 'Broken stay',
      description: 'Friction stay snapped off', labour_hours: 0.5 },

    // seed-j04: hinged door won't close
    { id: 'seed-i04a', job_id: 'seed-j04', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'hinged_door', joinery_type_label: 'Hinged door',
      fault: 'misaligned', fault_label: "Won't close properly",
      description: 'Door dropped on hinge side', labour_hours: 1 },

    // seed-j05: timber window, 2 items
    { id: 'seed-i05a', job_id: 'seed-j05', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'window_timber', joinery_type_label: 'Window (timber)',
      fault: 'stiff', fault_label: "Won't open or close",
      description: 'Timber window swollen shut', labour_hours: 0.5 },
    { id: 'seed-i05b', job_id: 'seed-j05', type: 'diagnosed', sort_order: 1, hourly_rate: 95,
      joinery_type: 'window_timber', joinery_type_label: 'Window (timber)',
      fault: 'drafty', fault_label: 'Drafty or leaking',
      description: 'Perished sill weatherseal', labour_hours: 0.5 },

    // seed-j06: sliding door weatherseal
    { id: 'seed-i06a', job_id: 'seed-j06', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'sliding_door', joinery_type_label: 'Sliding door',
      fault: 'drafty', fault_label: 'Drafty or leaking',
      description: 'Weatherseal detached', labour_hours: 0.5 },

    // seed-j07: sliding door stiff
    { id: 'seed-i07a', job_id: 'seed-j07', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'sliding_door', joinery_type_label: 'Sliding door',
      fault: 'stiff', fault_label: 'Stiff or hard to slide',
      description: 'Worn rollers', labour_hours: 0.5 },

    // seed-j08: hinged door latch
    { id: 'seed-i08a', job_id: 'seed-j08', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'hinged_door', joinery_type_label: 'Hinged door',
      fault: 'wont_lock', fault_label: 'Lock or latch fault',
      description: 'Latch not catching striker', labour_hours: 0.5 },

    // seed-j09: bifold misaligned
    { id: 'seed-i09a', job_id: 'seed-j09', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'bifold_door', joinery_type_label: 'Bifold door',
      fault: 'misaligned', fault_label: 'Misaligned panels',
      description: 'Guide track bent', labour_hours: 0.5 },

    // seed-j10: sliding door stiff
    { id: 'seed-i10a', job_id: 'seed-j10', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'sliding_door', joinery_type_label: 'Sliding door',
      fault: 'stiff', fault_label: 'Stiff or hard to slide',
      description: 'Rollers need replacing', labour_hours: 0.5 },

    // seed-j11: sliding door handle
    { id: 'seed-i11a', job_id: 'seed-j11', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'sliding_door', joinery_type_label: 'Sliding door',
      fault: 'broken_hardware', fault_label: 'Broken handle',
      description: 'Handle cracked during fit-out', labour_hours: 0.5 },

    // seed-j12: aluminium window stay
    { id: 'seed-i12a', job_id: 'seed-j12', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'window_ali', joinery_type_label: 'Window (aluminium)',
      fault: 'broken_hardware', fault_label: 'Broken stay',
      description: 'Window stay broken', labour_hours: 0.5 },

    // seed-j13: sliding door seal
    { id: 'seed-i13a', job_id: 'seed-j13', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'sliding_door', joinery_type_label: 'Sliding door',
      fault: 'drafty', fault_label: 'Drafty or leaking',
      description: 'Weatherseal perished under door', labour_hours: 0.5 },

    // seed-j14: timber window stuck
    { id: 'seed-i14a', job_id: 'seed-j14', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'window_timber', joinery_type_label: 'Window (timber)',
      fault: 'stiff', fault_label: "Won't open or close",
      description: 'Window painted shut', labour_hours: 0.5 },

    // seed-j15: rebook — hinged door
    { id: 'seed-i15a', job_id: 'seed-j15', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'hinged_door', joinery_type_label: 'Hinged door',
      fault: 'stiff', fault_label: 'Stiff or sagging',
      description: 'Door dropped badly on hinge side', labour_hours: 1 },

    // seed-j16: rebook — aluminium window lock
    { id: 'seed-i16a', job_id: 'seed-j16', type: 'diagnosed', sort_order: 0, hourly_rate: 95,
      joinery_type: 'window_ali', joinery_type_label: 'Window (aluminium)',
      fault: 'wont_lock', fault_label: 'Lock fault',
      description: 'Window lock seized', labour_hours: 0.5 },
  ]

  // ── Job item parts ─────────────────────────────────────────────────────────

  const parts = [
    // j01: rollers
    { job_item_id: 'seed-i01a', name: 'Sliding door roller pair', sku: 'DR-220',
      sell_price: 23.40, cost_price: 18.00, qty: 2, unit: 'pair', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-DR220' },

    // j02a: bifold lock
    { job_item_id: 'seed-i02a', name: 'Bifold door lock set', sku: 'BL-220',
      sell_price: 49.40, cost_price: 38.00, qty: 1, unit: 'set', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-BL220' },
    // j02b: bifold hinge
    { job_item_id: 'seed-i02b', name: 'Bifold door hinge pair', sku: 'BH-400',
      sell_price: 41.60, cost_price: 32.00, qty: 1, unit: 'pair', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-BH400' },

    // j03: window stay 400mm
    { job_item_id: 'seed-i03a', name: 'Friction stay 400mm', sku: 'ST-400',
      sell_price: 36.40, cost_price: 28.00, qty: 1, unit: 'each', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-ST400' },

    // j04: latch + striker
    { job_item_id: 'seed-i04a', name: 'Door latch and striker plate', sku: 'HL-310',
      sell_price: 31.20, cost_price: 24.00, qty: 1, unit: 'set', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-HL310' },

    // j05a: window stay 300mm
    { job_item_id: 'seed-i05a', name: 'Friction stay 300mm', sku: 'ST-300',
      sell_price: 28.60, cost_price: 22.00, qty: 1, unit: 'each', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-ST300' },
    // j05b: weatherseal strip
    { job_item_id: 'seed-i05b', name: 'Window weatherseal strip', sku: 'WS-305',
      sell_price: 12.35, cost_price: 9.50, qty: 3, unit: 'metre', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-WS305' },

    // j06: sliding door weatherseal
    { job_item_id: 'seed-i06a', name: 'Sliding door weatherseal', sku: 'WS-200',
      sell_price: 15.60, cost_price: 12.00, qty: 2, unit: 'metre', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-WS200' },

    // j07: rollers
    { job_item_id: 'seed-i07a', name: 'Sliding door roller pair', sku: 'DR-220',
      sell_price: 23.40, cost_price: 18.00, qty: 2, unit: 'pair', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-DR220' },

    // j08: latch
    { job_item_id: 'seed-i08a', name: 'Door latch and striker plate', sku: 'HL-310',
      sell_price: 31.20, cost_price: 24.00, qty: 1, unit: 'set', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-HL310' },

    // j09: guide track
    { job_item_id: 'seed-i09a', name: 'Bifold door guide track', sku: 'BG-120',
      sell_price: 36.40, cost_price: 28.00, qty: 1, unit: 'each', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-BG120' },

    // j10: rollers
    { job_item_id: 'seed-i10a', name: 'Sliding door roller pair', sku: 'DR-220',
      sell_price: 23.40, cost_price: 18.00, qty: 2, unit: 'pair', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-DR220' },

    // j11: handle
    { job_item_id: 'seed-i11a', name: 'Sliding door handle set', sku: 'SH-300',
      sell_price: 45.50, cost_price: 35.00, qty: 1, unit: 'set', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-SH300' },

    // j12: stay 400mm
    { job_item_id: 'seed-i12a', name: 'Friction stay 400mm', sku: 'ST-400',
      sell_price: 36.40, cost_price: 28.00, qty: 1, unit: 'each', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-ST400' },

    // j13: sliding door seal
    { job_item_id: 'seed-i13a', name: 'Sliding door weatherseal', sku: 'WS-200',
      sell_price: 15.60, cost_price: 12.00, qty: 2, unit: 'metre', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-WS200' },

    // j14: stay 300mm
    { job_item_id: 'seed-i14a', name: 'Friction stay 300mm', sku: 'ST-300',
      sell_price: 28.60, cost_price: 22.00, qty: 1, unit: 'each', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-ST300' },

    // j15: hinge pair
    { job_item_id: 'seed-i15a', name: 'Hinged door hinge pair', sku: 'HH-500',
      sell_price: 23.40, cost_price: 18.00, qty: 2, unit: 'pair', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-HH500' },

    // j16: window latch
    { job_item_id: 'seed-i16a', name: 'Aluminium window latch', sku: 'WL-210',
      sell_price: 21.45, cost_price: 16.50, qty: 1, unit: 'each', supplier: 'Joinery Hardware NZ', supplier_code: 'JHN-WL210' },
  ]

  return { jobs, items, parts }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const wipe = process.argv.includes('--wipe')

  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  // ── Wipe ──────────────────────────────────────────────────────────────────

  if (wipe) {
    console.log(`Deleting all rows tagged [${SEED_TAG}] from jobs (cascades to items and parts)...`)
    const { error, count } = await supabase
      .from('jobs')
      .delete({ count: 'exact' })
      .like('notes', `%${SEED_TAG}%`)
    if (error) {
      console.error('Wipe failed:', error.message)
      process.exit(1)
    }
    console.log(`Done. ${count ?? '?'} job(s) deleted.`)
    return
  }

  // ── Check for existing seed ───────────────────────────────────────────────

  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .like('notes', `%${SEED_TAG}%`)
    .limit(1)

  if (existing && existing.length > 0) {
    console.error(
      `Seed data already exists. Run with --wipe first:\n  node scripts/seed-planner.js --wipe`
    )
    process.exit(1)
  }

  // ── Build data ────────────────────────────────────────────────────────────

  const { jobs, items, parts } = buildData()

  // ── Insert jobs ───────────────────────────────────────────────────────────

  console.log(`Inserting ${jobs.length} jobs...`)
  const { error: jobErr } = await supabase.from('jobs').insert(jobs)
  if (jobErr) {
    if (jobErr.message.includes('column') && jobErr.message.includes('does not exist')) {
      console.error(
        `\nColumn missing — run supabase/10_geo_and_rebook.sql in the Supabase SQL editor first:\n  ${jobErr.message}`
      )
    } else {
      console.error('Failed to insert jobs:', jobErr.message)
    }
    process.exit(1)
  }

  // ── Insert job items ──────────────────────────────────────────────────────

  console.log(`Inserting ${items.length} job items...`)
  const { error: itemErr } = await supabase.from('job_items').insert(items)
  if (itemErr) {
    console.error('Failed to insert job items:', itemErr.message)
    // Attempt rollback
    await supabase.from('jobs').delete().like('notes', `%${SEED_TAG}%`)
    process.exit(1)
  }

  // ── Insert job item parts ─────────────────────────────────────────────────

  console.log(`Inserting ${parts.length} job item parts...`)
  const { error: partErr } = await supabase.from('job_item_parts').insert(parts)
  if (partErr) {
    console.error('Failed to insert job item parts:', partErr.message)
    await supabase.from('jobs').delete().like('notes', `%${SEED_TAG}%`)
    process.exit(1)
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const { jobs: allJobs } = buildData()
  const backlog = allJobs.filter((j) => j.schedule_state === 'unassigned').length
  const rebook  = allJobs.filter((j) => j.schedule_state === 'needs_rebooking').length
  const grid    = allJobs.filter((j) => j.schedule_state === 'assigned').length

  console.log(`\nSeed complete.`)
  console.log(`  ${backlog} backlog jobs (unassigned)`)
  console.log(`  ${rebook} rebook jobs (needs_rebooking)`)
  console.log(`  ${grid} week-grid jobs (assigned)`)
  console.log(`\nTo wipe: node scripts/seed-planner.js --wipe`)
}

main()
