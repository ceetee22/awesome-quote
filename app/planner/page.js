'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { computeDay, fmt } from '@/lib/cascade'
import {
  getPlannerBacklog,
  getPlannerWeekJobs,
  getPlannerMonthCounts,
  dbAssignJob,
  dbUnassignJob,
  dbBatchUpdateSchedule,
} from '@/lib/db'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency } from '@/lib/pricing'
import { DURATION_PRESETS } from '@/lib/constants'

// ─── Date helpers ──────────────────────────────────────────────────────────────

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

function formatDayHeader(d) {
  return d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatWeekRange(monday) {
  const sun = addDays(monday, 6)
  const a = monday.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  const b = sun.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${a} to ${b}`
}

function daysAgo(isoDate) {
  if (!isoDate) return 0
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000)
}

function getArea(address) {
  if (!address) return ''
  const parts = address.split(',')
  return parts[parts.length - 1].trim()
}

// ─── Directional grouping ──────────────────────────────────────────────────────

const COMPASS = ['North', 'North-east', 'East', 'South-east', 'South', 'South-west', 'West', 'North-west']

function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLng = toRad(lng2 - lng1)
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const y = Math.sin(dLng) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function compassLabel(bearing) {
  return COMPASS[Math.round(bearing / 45) % 8]
}

// ─── Cascade helper ────────────────────────────────────────────────────────────

function recomputeDayJobs(jobs, ps) {
  if (!jobs.length) return []
  const input = jobs.map((job) => ({
    id: job.id,
    durationMin: (job.estimated_duration || 1) * 60,
    bufferMin: ps.default_buffer_minutes ?? 10,
    travelMinFromPrev: 0, // TODO(Phase 2): use travel_cache / Distance Matrix
  }))
  const { legs, longDay, finish } = computeDay(input, {
    dayStartMin: ps.day_start_minute ?? 480,
    dayEndTargetMin: ps.day_end_target_minute ?? null,
    defaultBufferMin: ps.default_buffer_minutes ?? 10,
  })
  return {
    jobs: jobs.map((job, i) => ({ ...job, sequence_index: i, start_minute: legs[i].startMin })),
    legs,
    longDay,
    finish,
  }
}

// ─── Value helper ──────────────────────────────────────────────────────────────

function calcJobValue(job) {
  const parts = (job.job_items || []).flatMap((i) => i.job_item_parts || [])
  const partsTotal = parts.reduce((s, p) => s + (Number(p.sell_price) || 0) * (Number(p.qty) || 1), 0)
  const labour = (Number(job.labour_hours) || 0) * (Number(job.hourly_rate) || 85)
  const sub = partsTotal + labour + (Number(job.callout_fee) || 0)
  return sub * 1.15
}

function jobSummary(job) {
  const items = job.job_items || []
  if (!items.length) return 'No items'
  const labels = items.map((it) =>
    it.type === 'diagnosed'
      ? (it.joinery_type_label || it.fault_label || 'Diagnosed item')
      : (it.description || 'Custom item')
  )
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]}, ${labels[1]} +${labels.length - 2} more`
}

// ─── Draggable card ────────────────────────────────────────────────────────────

function DraggableCard({ id, data, children, className = '' }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={className}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.35 : 1,
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  )
}

// ─── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({ id, children, className = '' }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-colors duration-100 ${isOver ? 'bg-[#E6F7F0]' : ''}`}
    >
      {children}
    </div>
  )
}

// ─── Backlog card ──────────────────────────────────────────────────────────────

function BacklogCard({ job, ghost = false }) {
  const area = getArea(job.customer_address)
  const age = daysAgo(job.accepted_at || job.created_at)
  const isRebook = job.schedule_state === 'needs_rebooking'
  const value = calcJobValue(job)
  const summary = jobSummary(job)

  const card = (
    <div
      className={`bg-white border rounded-xl p-3 select-none ${
        ghost ? 'shadow-xl border-aq-green' : 'border-[#E4EAE8] hover:border-[#22A67A]'
      } transition-colors`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[13px] font-medium text-[#1F2D37] leading-snug">{job.customer_name}</p>
        <span
          className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
            isRebook
              ? 'bg-amber-100 text-amber-700'
              : 'bg-[#E6F7F0] text-[#22A67A]'
          }`}
        >
          {isRebook ? 'Rebook' : 'Accepted'}
        </span>
      </div>
      {area ? (
        <span className="inline-block text-[11px] bg-[#F6F8F7] border border-[#E4EAE8] rounded px-1.5 py-0.5 text-[#4A5B68] mb-1">
          {area}
        </span>
      ) : null}
      <p className="text-[12px] text-[#4A5B68] leading-snug mb-1 line-clamp-2">{summary}</p>
      <p className={`text-[11px] mb-1 ${age > 10 ? 'text-amber-600' : 'text-[#8CA3A0]'}`}>
        Accepted {age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}
      </p>
      <p className="text-[12px] font-medium text-[#1F2D37]">{formatCurrency(value)}</p>
    </div>
  )

  if (ghost) return card
  return (
    <DraggableCard
      id={`backlog::${job.id}`}
      data={{ job, source: 'backlog' }}
    >
      {card}
    </DraggableCard>
  )
}

// ─── Day job card ──────────────────────────────────────────────────────────────

function DayJobCard({ job, date, ghost = false }) {
  const dur = job.estimated_duration || 1
  const durLabel = dur === 0.5 ? '30m' : dur === 1 ? '1hr' : dur === 1.5 ? '1.5hr' : `${dur}hr`
  const slotLabel = job.slot === 'afternoon' ? 'Afternoon' : 'Morning'

  const card = (
    <div
      className={`bg-white border rounded-lg p-2.5 select-none ${
        ghost ? 'shadow-xl border-aq-green' : 'border-[#E4EAE8] hover:border-[#22A67A]'
      } transition-colors`}
    >
      <p className="text-[12px] font-medium text-[#1F2D37] leading-snug mb-0.5 truncate">
        {job.customer_name}
      </p>
      {job.start_minute != null ? (
        <p className="text-[11px] text-[#22A67A]">{fmt(job.start_minute)} · {durLabel}</p>
      ) : (
        <p className="text-[11px] text-[#8CA3A0]">{slotLabel} · {durLabel}</p>
      )}
    </div>
  )

  if (ghost) return card
  return (
    <DraggableCard
      id={`day::${date}::${job.id}`}
      data={{ job, source: 'day', date }}
    >
      {card}
    </DraggableCard>
  )
}

// ─── Drop modal ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1,   label: '1 hr' },
  { value: 1.5, label: '1.5 hr' },
  { value: 2,   label: '2 hr+' },
]

function DropModal({ job, date, dayJobs, plannerSettings, onConfirm, onCancel }) {
  const [duration, setDuration] = useState(1)
  const [slot, setSlot] = useState('morning')

  const dateLabel = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  // Compute preview start time using cascade
  const previewStart = (() => {
    const existingInput = (dayJobs || []).map((j) => ({
      id: j.id,
      durationMin: (j.estimated_duration || 1) * 60,
      bufferMin: plannerSettings.default_buffer_minutes ?? 10,
      travelMinFromPrev: 0, // TODO(Phase 2): Distance Matrix
    }))
    const newEntry = {
      id: '__preview__',
      durationMin: duration * 60,
      bufferMin: plannerSettings.default_buffer_minutes ?? 10,
      travelMinFromPrev: 0,
      startOverrideMin: slot === 'afternoon' ? 780 : undefined,
    }
    const input = [...existingInput, newEntry]
    try {
      const { legs } = computeDay(input, {
        dayStartMin: plannerSettings.day_start_minute ?? 480,
        dayEndTargetMin: plannerSettings.day_end_target_minute ?? null,
        defaultBufferMin: plannerSettings.default_buffer_minutes ?? 10,
      })
      return legs[legs.length - 1]?.start || ''
    } catch {
      return ''
    }
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(31,45,55,0.5)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <p className="text-[15px] font-medium text-[#1F2D37] mb-1">
          Schedule {job.customer_name}
        </p>
        <p className="text-[13px] text-[#4A5B68] mb-5">{dateLabel}</p>

        <p className="text-[12px] font-medium text-[#4A5B68] mb-2">Duration</p>
        <div className="flex gap-2 mb-5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDuration(opt.value)}
              className={`flex-1 min-h-[44px] text-[13px] font-medium rounded-lg border transition-colors duration-150 ${
                duration === opt.value
                  ? 'border-[#22A67A] bg-[#E6F7F0] text-[#22A67A]'
                  : 'border-[#E4EAE8] text-[#4A5B68] bg-white hover:bg-[#F6F8F7]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-[12px] font-medium text-[#4A5B68] mb-2">Slot</p>
        <div className="flex gap-2 mb-5">
          {[{ value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' }].map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSlot(s.value)}
              className={`flex-1 min-h-[44px] text-[13px] font-medium rounded-lg border transition-colors duration-150 ${
                slot === s.value
                  ? 'border-[#22A67A] bg-[#E6F7F0] text-[#22A67A]'
                  : 'border-[#E4EAE8] text-[#4A5B68] bg-white hover:bg-[#F6F8F7]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {previewStart && (
          <p className="text-[12px] text-[#4A5B68] mb-5">
            Estimated start: <span className="font-medium text-[#1F2D37]">{previewStart}</span>
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm({ duration, slot })}
            className="w-full min-h-[48px] bg-[#22A67A] text-white font-medium rounded-xl hover:bg-[#1D8F68] transition-colors duration-150"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] bg-white text-[#4A5B68] font-medium rounded-xl border border-[#E4EAE8] hover:bg-[#F6F8F7] transition-colors duration-150"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Month heatmap ─────────────────────────────────────────────────────────────

const HEAT_CLASSES = [
  'bg-white',
  'bg-[#C5E8D5]',
  'bg-[#22A67A]/40',
  'bg-[#22A67A]/70',
]

function MonthHeatmap({ year, month, counts }) {
  const monthName = new Date(year, month, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })

  // Build full grid of days (Mon–Sat, weeks)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const gridStart = getMonday(firstDay)
  const gridEnd = addDays(getMonday(lastDay), 6)

  const cells = []
  let cur = new Date(gridStart)
  while (cur <= gridEnd) {
    cells.push(new Date(cur))
    cur = addDays(cur, 1)
  }

  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Group into weeks
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="p-6">
      <p className="text-[14px] font-medium text-[#1F2D37] mb-4">{monthName}</p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-[11px] text-[#8CA3A0] font-medium py-1">{h}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((d) => {
            const ds = toDateStr(d)
            const count = counts[ds] || 0
            const heatIdx = Math.min(count, 3)
            const isCurrentMonth = d.getMonth() === month
            return (
              <div
                key={ds}
                className={`rounded-lg p-2 text-center ${HEAT_CLASSES[heatIdx]} ${
                  !isCurrentMonth ? 'opacity-30' : ''
                }`}
              >
                <p className="text-[12px] font-medium text-[#1F2D37]">{d.getDate()}</p>
                {count > 0 && (
                  <p className="text-[10px] text-[#22A67A] font-medium">{count}</p>
                )}
              </div>
            )
          })}
        </div>
      ))}
      <p className="text-[11px] text-[#8CA3A0] mt-4">Read-only view. Switch to week to drag and schedule jobs.</p>
    </div>
  )
}

// ─── Planner page ──────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { settings } = useSettings()
  const plannerSettings = {
    day_start_minute:      settings?.day_start_minute      ?? 480,
    day_end_target_minute: settings?.day_end_target_minute ?? null,
    default_buffer_minutes:settings?.default_buffer_minutes ?? 10,
  }

  const [windowWidth, setWindowWidth] = useState(null)
  useEffect(() => {
    setWindowWidth(window.innerWidth)
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [backlog, setBacklog]       = useState([])
  const [weekDays, setWeekDays]     = useState({}) // { dateStr: job[] }
  const [weekStart, setWeekStart]   = useState(() => getMonday(new Date()))
  const [view, setView]             = useState('week') // 'week' | 'month'
  const [backlogSort, setBacklogSort] = useState('oldest') // 'oldest' | 'area'
  const [loading, setLoading]       = useState(true)
  const [monthCounts, setMonthCounts] = useState({})

  // DnD state
  const [activeItem, setActiveItem] = useState(null) // { job, source, date }
  const [pendingDrop, setPendingDrop] = useState(null) // { job, date }
  const [dropModalOpen, setDropModalOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadWeek = useCallback(async (monday) => {
    setLoading(true)
    const start = toDateStr(monday)
    const end   = toDateStr(addDays(monday, 6))
    const [bl, wj] = await Promise.all([
      getPlannerBacklog(),
      getPlannerWeekJobs(start, end),
    ])
    setBacklog(bl)
    const map = {}
    wj.forEach((job) => {
      const d = job.scheduled_date
      if (!map[d]) map[d] = []
      map[d].push(job)
    })
    setWeekDays(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadWeek(weekStart) }, [weekStart, loadWeek])

  useEffect(() => {
    if (view !== 'month') return
    const y = weekStart.getFullYear()
    const m = weekStart.getMonth()
    const start = toDateStr(new Date(y, m, 1))
    const end   = toDateStr(new Date(y, m + 1, 0))
    getPlannerMonthCounts(start, end).then(setMonthCounts)
  }, [view, weekStart])

  // ── Sorted backlog ─────────────────────────────────────────────────────────

  // Always FIFO — directional grouping re-sorts inside backlogDisplay
  const sortedBacklog = [...backlog].sort((a, b) =>
    new Date(a.accepted_at || a.created_at).getTime() - new Date(b.accepted_at || b.created_at).getTime()
  )

  // Flat list of headings + job items used by the grouped render path
  const backlogDisplay = (() => {
    if (backlogSort !== 'area') return sortedBacklog.map((j) => ({ type: 'job', job: j }))

    const homeLat = settings?.home_base_lat
    const homeLng = settings?.home_base_lng

    if (homeLat != null && homeLng != null) {
      // Directional grouping: compass bearing from home base → job
      const tagged = sortedBacklog.map((job) => ({
        job,
        dir: job.customer_lat != null && job.customer_lng != null
          ? compassLabel(getBearing(homeLat, homeLng, job.customer_lat, job.customer_lng))
          : 'Unknown area',
      }))
      // Sort by compass order (clockwise N→NE→…), FIFO within each direction
      tagged.sort((a, b) => {
        const ai = a.dir === 'Unknown area' ? 99 : COMPASS.indexOf(a.dir)
        const bi = b.dir === 'Unknown area' ? 99 : COMPASS.indexOf(b.dir)
        if (ai !== bi) return ai - bi
        return new Date(a.job.accepted_at || a.job.created_at).getTime() - new Date(b.job.accepted_at || b.job.created_at).getTime()
      })
      const items = []
      let lastDir = null
      for (const { job, dir } of tagged) {
        if (dir !== lastDir) {
          items.push({ type: 'heading', area: dir })
          lastDir = dir
        }
        items.push({ type: 'job', job })
      }
      return items
    }

    // Fallback: suburb grouping when home base coordinates are not set
    const items = [{ type: 'notice', text: 'Set home base coordinates in Settings to enable direction grouping.' }]
    let lastArea = null
    for (const job of sortedBacklog) {
      const area = getArea(job.customer_address) || 'Unknown area'
      if (area !== lastArea) {
        items.push({ type: 'heading', area })
        lastArea = area
      }
      items.push({ type: 'job', job })
    }
    return items
  })()

  // ── Week columns ───────────────────────────────────────────────────────────

  const weekColumns = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const ds = toDateStr(d)
    const jobs = weekDays[ds] || []
    const { longDay, finish } = jobs.length
      ? recomputeDayJobs(jobs, plannerSettings)
      : { longDay: false, finish: '' }
    return { date: d, dateStr: ds, jobs, longDay, finish }
  })

  // ── DnD handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }) {
    setActiveItem(active.data.current)
  }

  function handleDragEnd({ active, over }) {
    setActiveItem(null)
    if (!over) return

    const { job, source, date: fromDate } = active.data.current
    const toId = over.id

    if (source === 'backlog') {
      if (toId === 'backlog') return
      const toDate = toId.replace('day::', '')
      setPendingDrop({ job, date: toDate })
      setDropModalOpen(true)
    } else {
      // source === 'day'
      if (toId === 'backlog') {
        commitUnassign(job, fromDate)
      } else {
        const toDate = toId.replace('day::', '')
        if (fromDate !== toDate) commitMoveDay(job, fromDate, toDate)
      }
    }
  }

  // ── Commit operations ──────────────────────────────────────────────────────

  async function commitAssign(job, date, { duration, slot }) {
    const existing = weekDays[date] || []
    const newJob = {
      ...job,
      schedule_state: 'assigned',
      scheduled_date: date,
      slot,
      estimated_duration: duration,
    }
    const allJobs = [...existing, newJob]
    const { jobs: recomputed } = recomputeDayJobs(allJobs, plannerSettings)

    // Optimistic update
    setWeekDays((prev) => ({ ...prev, [date]: recomputed }))
    setBacklog((prev) => prev.filter((j) => j.id !== job.id))

    // Persist — roll back to DB state if the write fails
    const assigned = recomputed[recomputed.length - 1]
    const err = await dbAssignJob(job.id, {
      scheduled_date: date,
      slot,
      estimated_duration: duration,
      sequence_index: assigned.sequence_index,
      start_minute: assigned.start_minute,
    })
    if (err) { loadWeek(weekStart); return }

    // Cascade start_minutes for existing jobs on that day
    const existingUpdates = recomputed.slice(0, -1).map((j) => ({
      id: j.id,
      sequence_index: j.sequence_index,
      start_minute: j.start_minute,
    }))
    if (existingUpdates.length) await dbBatchUpdateSchedule(existingUpdates)
  }

  async function commitUnassign(job, fromDate) {
    const remaining = (weekDays[fromDate] || []).filter((j) => j.id !== job.id)
    const { jobs: recomputed } = remaining.length
      ? recomputeDayJobs(remaining, plannerSettings)
      : { jobs: [] }

    const unassigned = {
      ...job,
      schedule_state: 'unassigned',
      scheduled_date: null,
      slot: null,
      sequence_index: null,
      start_minute: null,
    }

    setWeekDays((prev) => ({ ...prev, [fromDate]: recomputed }))
    setBacklog((prev) => {
      const next = [...prev, unassigned]
      return next.sort((a, b) =>
        new Date(a.accepted_at || a.created_at).getTime() -
        new Date(b.accepted_at || b.created_at).getTime()
      )
    })

    const err = await dbUnassignJob(job.id)
    if (err) { loadWeek(weekStart); return }
    if (recomputed.length) await dbBatchUpdateSchedule(recomputed.map((j) => ({
      id: j.id,
      sequence_index: j.sequence_index,
      start_minute: j.start_minute,
    })))
  }

  async function commitMoveDay(job, fromDate, toDate) {
    const fromJobs = (weekDays[fromDate] || []).filter((j) => j.id !== job.id)
    const toJobs   = [...(weekDays[toDate]   || []), { ...job, scheduled_date: toDate }]

    const { jobs: fromRecomputed } = fromJobs.length
      ? recomputeDayJobs(fromJobs, plannerSettings)
      : { jobs: [] }
    const { jobs: toRecomputed } = recomputeDayJobs(toJobs, plannerSettings)

    setWeekDays((prev) => ({
      ...prev,
      [fromDate]: fromRecomputed,
      [toDate]:   toRecomputed,
    }))

    const moved = toRecomputed.find((j) => j.id === job.id)
    const err = await dbAssignJob(job.id, {
      scheduled_date: toDate,
      slot: job.slot,
      estimated_duration: job.estimated_duration,
      sequence_index: moved?.sequence_index ?? toRecomputed.length - 1,
      start_minute: moved?.start_minute ?? null,
    })
    if (err) { loadWeek(weekStart); return }

    const fromUpdates = fromRecomputed.map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute }))
    const toUpdates   = toRecomputed.filter((j) => j.id !== job.id).map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute }))
    const allUpdates  = [...fromUpdates, ...toUpdates]
    if (allUpdates.length) await dbBatchUpdateSchedule(allUpdates)
  }

  // ── Screen gate ────────────────────────────────────────────────────────────

  if (windowWidth !== null && windowWidth < 1024) {
    return (
      <div className="min-h-dvh bg-[#F6F8F7] flex items-center justify-center px-6">
        <p className="text-[16px] text-[#4A5B68] text-center">
          Open the planner on a computer to plan your week.
        </p>
      </div>
    )
  }

  if (windowWidth === null) {
    // Avoid flash before window width is known
    return <div className="min-h-dvh bg-[#F6F8F7]" />
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-[#F6F8F7] overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-4 px-5 py-3 bg-white border-b border-[#E4EAE8] shrink-0">
          <h1 className="text-[16px] font-medium text-[#1F2D37]">Week planner</h1>
          <div className="flex items-center gap-2 ml-2">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="min-h-[36px] px-3 text-[13px] font-medium text-[#4A5B68] border border-[#E4EAE8] rounded-lg bg-white hover:bg-[#F6F8F7] transition-colors"
            >
              Prev
            </button>
            <span className="text-[13px] text-[#4A5B68] min-w-[180px] text-center">
              {formatWeekRange(weekStart)}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="min-h-[36px] px-3 text-[13px] font-medium text-[#4A5B68] border border-[#E4EAE8] rounded-lg bg-white hover:bg-[#F6F8F7] transition-colors"
            >
              Next
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="min-h-[36px] px-3 text-[13px] text-[#22A67A] font-medium hover:underline"
          >
            Today
          </button>
          <div className="ml-auto flex rounded-lg border border-[#E4EAE8] overflow-hidden">
            {['week', 'month'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  view === v
                    ? 'bg-[#22A67A] text-white'
                    : 'bg-white text-[#4A5B68] hover:bg-[#F6F8F7]'
                }`}
              >
                {v === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Main pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Backlog column */}
          <DroppableColumn
            id="backlog"
            className="w-[240px] shrink-0 flex flex-col border-r border-[#E4EAE8] bg-white"
          >
            <div className="px-3 py-2.5 border-b border-[#E4EAE8]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-medium text-[#1F2D37]">
                  Backlog{backlog.length > 0 ? ` (${backlog.length})` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {[
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'area', label: 'By area' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setBacklogSort(s.value)}
                    className={`flex-1 text-[11px] font-medium py-1 px-1 rounded border transition-colors duration-150 ${
                      backlogSort === s.value
                        ? 'border-[#22A67A] bg-[#E6F7F0] text-[#22A67A]'
                        : 'border-[#E4EAE8] text-[#4A5B68] bg-white hover:bg-[#F6F8F7]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {loading ? (
                <p className="text-[12px] text-[#8CA3A0] text-center py-4">Loading...</p>
              ) : sortedBacklog.length === 0 ? (
                <p className="text-[12px] text-[#8CA3A0] text-center py-4">No jobs to schedule.</p>
              ) : (
                backlogDisplay.map((item, i) =>
                  item.type === 'notice' ? (
                    <p key="notice" className="text-[10px] text-[#8CA3A0] italic px-1 pb-1 leading-snug">
                      {item.text}
                    </p>
                  ) : item.type === 'heading' ? (
                    <p
                      key={`h:${item.area}`}
                      className="text-[10px] font-semibold text-[#8CA3A0] tracking-widest px-1 pt-2 pb-0.5"
                      style={{ marginTop: i === 0 ? 0 : undefined }}
                    >
                      {item.area}
                    </p>
                  ) : (
                    <BacklogCard key={item.job.id} job={item.job} />
                  )
                )
              )}
            </div>
          </DroppableColumn>

          {/* Grid pane */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {view === 'month' ? (
              <div className="flex-1 overflow-y-auto">
                <MonthHeatmap
                  year={weekStart.getFullYear()}
                  month={weekStart.getMonth()}
                  counts={monthCounts}
                />
              </div>
            ) : (
              // Week grid
              <div className="flex flex-1 overflow-hidden">
                {weekColumns.map(({ date, dateStr, jobs, longDay, finish }) => (
                  <DroppableColumn
                    key={dateStr}
                    id={`day::${dateStr}`}
                    className="flex-1 flex flex-col border-r border-[#E4EAE8] last:border-r-0 min-w-0"
                  >
                    {/* Day header */}
                    <div className="px-2 py-2 border-b border-[#E4EAE8] bg-white shrink-0">
                      <p className="text-[12px] font-medium text-[#1F2D37] truncate">
                        {formatDayHeader(date)}
                      </p>
                      {finish && (
                        <p className={`text-[11px] ${longDay ? 'text-amber-500' : 'text-[#8CA3A0]'}`}>
                          Finish {finish}
                        </p>
                      )}
                    </div>

                    {/* Job cards */}
                    <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1.5">
                      {jobs.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-[11px] text-[#8CA3A0] text-center px-2">
                            Drop a job here
                          </p>
                        </div>
                      ) : (
                        jobs.map((job) => (
                          <DayJobCard key={job.id} job={job} date={dateStr} />
                        ))
                      )}
                    </div>
                  </DroppableColumn>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeItem?.source === 'backlog' && (
          <div className="w-[220px]">
            <BacklogCard job={activeItem.job} ghost />
          </div>
        )}
        {activeItem?.source === 'day' && (
          <div className="w-[160px]">
            <DayJobCard job={activeItem.job} date={activeItem.date} ghost />
          </div>
        )}
      </DragOverlay>

      {/* Drop modal */}
      {dropModalOpen && pendingDrop && (
        <DropModal
          job={pendingDrop.job}
          date={pendingDrop.date}
          dayJobs={weekDays[pendingDrop.date] || []}
          plannerSettings={plannerSettings}
          onConfirm={({ duration, slot }) => {
            commitAssign(pendingDrop.job, pendingDrop.date, { duration, slot })
            setDropModalOpen(false)
            setPendingDrop(null)
          }}
          onCancel={() => {
            setDropModalOpen(false)
            setPendingDrop(null)
          }}
        />
      )}
    </DndContext>
  )
}
