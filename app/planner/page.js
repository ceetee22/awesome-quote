'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { IconSun, IconCloudRain, IconCloud, IconWind } from '@tabler/icons-react'
import { computeDay, fmt } from '@/lib/cascade'
import { coordKey, buildDayPairs, fetchTravelTimes } from '@/lib/travel'
import { WEATHER_STYLES, isBadWeather, classifyJob, fetchWeather } from '@/lib/weather'
import {
  getPlannerBacklog,
  getPlannerWeekJobs,
  getPlannerMonthCounts,
  dbAssignJob,
  dbUnassignJob,
  dbBatchUpdateSchedule,
  dbPinJobTime,
} from '@/lib/db'
import { useSettings } from '@/lib/settings-context'
import { formatCurrency } from '@/lib/pricing'

// ─── Grid constants ────────────────────────────────────────────────────────────

const PX_PER_MIN = 80 / 60
const MIN_BLOCK_PX = 80
const HOUR_LBL_W = 44

// ─── Weather chip config ───────────────────────────────────────────────────────

const WEATHER_CHIP = {
  sun:   { bg: '#FEF7E6', text: '#854F0B', iconColor: '#E8940D', label: 'sunny',  Icon: IconSun       },
  rain:  { bg: '#E8F1FB', text: '#185FA5', iconColor: '#3B82D6', label: 'rain',   Icon: IconCloudRain },
  cloud: { bg: '#F1EFE8', text: '#4A5B68', iconColor: '#8CA3A0', label: 'cloudy', Icon: IconCloud     },
  windy: { bg: '#EEF1F0', text: '#4A5B68', iconColor: '#4A5B68', label: 'windy',  Icon: IconWind      },
}

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

function formatDayLabel(d) {
  return d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatWeekRange(start) {
  const end = addDays(start, 6)
  const a = start.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  const b = end.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${a} to ${b}`
}

function formatDayFull(d) {
  return d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtHour(min) {
  const h24 = Math.floor(min / 60)
  const ampm = h24 < 12 ? 'am' : 'pm'
  const h = h24 % 12 || 12
  return `${h}${ampm}`
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

function recomputeDayJobs(jobs, ps, travelMap = {}, homeLat = null, homeLng = null) {
  if (!jobs.length) {
    return { jobs: [], legs: [], longDay: false, finish: '', finishMin: null, leaveHome: '', leaveHomeMin: null, totalDriveMin: 0 }
  }
  const input = jobs.map((job, i) => {
    let travelMin = 0
    if (i === 0 && homeLat != null && homeLng != null && job.customer_lat != null && job.customer_lng != null) {
      const ok = coordKey(homeLat, homeLng)
      const dk = coordKey(job.customer_lat, job.customer_lng)
      travelMin = travelMap[`${ok}|${dk}`] ?? 0
    } else if (i > 0) {
      const prev = jobs[i - 1]
      if (prev.customer_lat != null && prev.customer_lng != null && job.customer_lat != null && job.customer_lng != null) {
        const ok = coordKey(prev.customer_lat, prev.customer_lng)
        const dk = coordKey(job.customer_lat, job.customer_lng)
        travelMin = travelMap[`${ok}|${dk}`] ?? 0
      }
    }
    return {
      id: job.id,
      durationMin: (job.estimated_duration || 1) * 60,
      bufferMin: ps.default_buffer_minutes ?? 10,
      travelMinFromPrev: travelMin,
      startOverrideMin: job.start_overridden === true ? job.start_minute : undefined,
    }
  })
  const result = computeDay(input, {
    dayStartMin: ps.day_start_minute ?? 480,
    dayEndTargetMin: ps.day_end_target_minute ?? null,
    defaultBufferMin: ps.default_buffer_minutes ?? 10,
  })
  return {
    jobs: jobs.map((job, i) => ({ ...job, sequence_index: i, start_minute: result.legs[i].startMin })),
    legs: result.legs,
    longDay: result.longDay,
    finish: result.finish,
    finishMin: result.finishMin,
    leaveHome: result.leaveHome,
    leaveHomeMin: result.leaveHomeMin,
    totalDriveMin: result.totalDriveMin,
  }
}

// ─── Value + summary helpers ───────────────────────────────────────────────────

function calcJobValue(job) {
  const parts = (job.job_items || []).flatMap((i) => i.job_item_parts || [])
  const partsTotal = parts.reduce((s, p) => s + (Number(p.sell_price) || 0) * (Number(p.qty) || 1), 0)
  const labour = (Number(job.labour_hours) || 0) * (Number(job.hourly_rate) || 85)
  const sub = partsTotal + labour + (Number(job.callout_fee) || 0)
  return sub * 1.15
}

function jobSummary(job) {
  const items = job.job_items || []
  if (!items.length) return ''
  const labels = items.map((it) =>
    it.type === 'diagnosed'
      ? (it.joinery_type_label || it.fault_label || 'Diagnosed item')
      : (it.description || 'Custom item')
  )
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]}, ${labels[1]} +${labels.length - 2} more`
}

function durLabel(dur) {
  return dur === 0.5 ? '30 min' : dur === 1 ? '1 hr' : dur === 1.5 ? '1.5 hr' : `${dur} hr`
}

// ─── Pill button (shared toggle style) ────────────────────────────────────────

function PillBtn({ active, onClick, children, small = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? '#22A67A' : '#FFFFFF',
        color: active ? '#FFFFFF' : '#4A5B68',
        border: `1px solid ${active ? '#22A67A' : '#E4EAE8'}`,
        borderRadius: 8,
        padding: small ? '6px 12px' : '5px 14px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {children}
    </button>
  )
}

// ─── BacklogCard ───────────────────────────────────────────────────────────────

function BacklogCardContent({ job, ghost = false }) {
  const area = getArea(job.customer_address)
  const age = daysAgo(job.accepted_at || job.created_at)
  const isRebook = job.schedule_state === 'needs_rebooking'
  const value = calcJobValue(job)
  const summary = jobSummary(job)
  return (
    <div style={{
      backgroundColor: ghost ? '#FFFFFF' : '#F4FBF8',
      borderTop: '1px solid #E4EAE8',
      borderRight: '1px solid #E4EAE8',
      borderBottom: '1px solid #E4EAE8',
      borderLeft: ghost ? '4px solid #22A67A' : isRebook ? '4px solid #E8940D' : '1px solid #E4EAE8',
      borderRadius: 8,
      padding: '12px 14px',
      boxShadow: ghost ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1F2D37', lineHeight: 1.3, margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.customer_name}
        </p>
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#FFFFFF', backgroundColor: isRebook ? '#E8940D' : '#22A67A', borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap' }}>
          {isRebook ? 'Rebook' : 'Accepted'}
        </span>
      </div>
      {area ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400, color: '#8CA3A0', backgroundColor: '#F6F8F7', borderRadius: 4, padding: '2px 7px', marginBottom: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#C5C9C7', flexShrink: 0 }} />
          {area}
        </span>
      ) : null}
      {summary ? (
        <p style={{ fontSize: 13, color: '#4A5B68', margin: '6px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {summary}
        </p>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
        <p style={{ fontSize: 13, color: age > 10 ? '#E8940D' : '#8CA3A0', margin: 0 }}>
          {age === 0 ? 'Accepted today' : `${age} day${age === 1 ? '' : 's'} ago`}
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#22A67A', margin: 0 }}>{formatCurrency(value)}</p>
      </div>
    </div>
  )
}

function BacklogCard({ job }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `backlog::${job.id}`,
    data: { job, source: 'backlog' },
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.35 : 1,
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <BacklogCardContent job={job} />
    </div>
  )
}

// ─── TimeBlock ─────────────────────────────────────────────────────────────────

function TimeBlock({ job, dateStr, gridStartMin, leftPad, onJobClick, isDay }) {
  const startMin = job.start_minute ?? gridStartMin
  const durationMin = (job.estimated_duration || 1) * 60
  const topPx = (startMin - gridStartMin) * PX_PER_MIN
  const heightPx = Math.max(durationMin * PX_PER_MIN, MIN_BLOCK_PX)
  const summary = jobSummary(job)
  const dl = durLabel(job.estimated_duration || 1)
  const isRebook = job.schedule_state === 'needs_rebooking'
  const suburb = isDay ? getArea(job.customer_address) : null

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `time::${dateStr}::${job.id}`,
    data: { job, source: 'time-block', date: dateStr, originalStartMin: startMin },
  })

  const downPos = useRef(null)

  function handlePointerDown(e) {
    downPos.current = { x: e.clientX, y: e.clientY }
    listeners.onPointerDown?.(e)
  }

  function handleClick(e) {
    if (!onJobClick || !downPos.current) return
    const dx = e.clientX - downPos.current.x
    const dy = e.clientY - downPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 6) return
    e.stopPropagation()
    onJobClick(job, { x: e.clientX, y: e.clientY })
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: topPx,
        height: heightPx,
        left: leftPad + 2,
        right: 2,
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.35 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        zIndex: isDragging ? 30 : 2,
        backgroundColor: '#E6F7F0',
        borderTop: '1px solid #C5E8D5',
        borderRight: '1px solid #C5E8D5',
        borderBottom: '1px solid #C5E8D5',
        borderLeft: `4px solid ${isRebook ? '#E8940D' : '#22A67A'}`,
        borderRadius: '2px 6px 6px 2px',
        padding: isDay ? '10px 12px' : '8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      {isDay ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#22A67A', lineHeight: 1 }}>
              {fmt(startMin)}
            </span>
            {' '}
            <span style={{ fontSize: 13, color: '#8CA3A0', lineHeight: 1 }}>{dl}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1F2D37', margin: '4px 0 0', lineHeight: 1.3, flexShrink: 0 }}>
            {job.customer_name}
          </p>
          {(summary || suburb) && (
            <p style={{ fontSize: 13, color: '#4A5B68', margin: '4px 0 0', lineHeight: 1.3, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {[summary, suburb].filter(Boolean).join(' · ')}
            </p>
          )}
          <span style={{ display: 'block', marginTop: 4, flexShrink: 0, fontSize: 10, fontWeight: 600, color: isRebook ? '#E8940D' : '#8CA3A0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isRebook ? 'REBOOK' : 'CONFIRMED'}
          </span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#22A67A', lineHeight: 1 }}>
              {fmt(startMin)}
            </span>
            <span style={{ fontSize: 10, color: '#8CA3A0', lineHeight: 1 }}>{dl}</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2D37', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.customer_name}
          </p>
          {summary && (
            <p style={{ fontSize: 11, color: '#4A5B68', margin: '3px 0 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {summary}
            </p>
          )}
          <span style={{ display: 'block', marginTop: 3, fontSize: 9, fontWeight: 600, color: isRebook ? '#E8940D' : '#8CA3A0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isRebook ? 'REBOOK' : 'CONFIRMED'}
          </span>
        </>
      )}
    </div>
  )
}

// ─── TimeGridColumnBody ────────────────────────────────────────────────────────

function TimeGridColumnBody({ dateStr, jobs, legs, leaveHome, leaveHomeMin, finishMin, finish, longDay, totalDriveMin, gridStartMin, gridEndMin, showHourLabels, topFlat, onJobClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day::${dateStr}` })
  const gridHeight = (gridEndMin - gridStartMin) * PX_PER_MIN
  const leftPad = showHourLabels ? HOUR_LBL_W : 0

  const hours = []
  for (let m = gridStartMin; m <= gridEndMin; m += 60) hours.push(m)

  if (jobs.length === 0) {
    return (
      <div
        ref={setNodeRef}
        style={{
          flex: 1, minWidth: 0, height: gridHeight, position: 'relative',
          backgroundColor: isOver ? '#E6F7F0' : 'transparent',
          borderLeft: `1.5px dashed ${isOver ? '#22A67A' : '#C5E8D5'}`,
          borderRight: `1.5px dashed ${isOver ? '#22A67A' : '#C5E8D5'}`,
          borderBottom: `1.5px dashed ${isOver ? '#22A67A' : '#C5E8D5'}`,
          borderTop: topFlat ? 'none' : `1.5px dashed ${isOver ? '#22A67A' : '#C5E8D5'}`,
          borderRadius: topFlat ? '0 0 10px 10px' : 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 13, color: '#8CA3A0', textAlign: 'center' }}>↓ Drop a job here</span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, minWidth: 0, height: gridHeight, position: 'relative',
        backgroundColor: '#FFFFFF',
        borderLeft: '0.5px solid #E4EAE8',
        borderRight: '0.5px solid #E4EAE8',
        borderBottom: '0.5px solid #E4EAE8',
        borderTop: topFlat ? 'none' : '0.5px solid #E4EAE8',
        borderRadius: topFlat ? '0 0 10px 10px' : 10,
        overflow: 'hidden',
      }}
    >
      {/* Hour lines */}
      {hours.map((m) => (
        <div
          key={m}
          style={{
            position: 'absolute',
            top: (m - gridStartMin) * PX_PER_MIN,
            left: leftPad,
            right: 0,
            borderTop: m === gridStartMin ? 'none' : '1px solid #E4EAE8',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Hour labels (day view only) */}
      {showHourLabels && hours.map((m) => (
        <div
          key={`lbl-${m}`}
          style={{
            position: 'absolute',
            top: (m - gridStartMin) * PX_PER_MIN - 8,
            left: 0,
            width: HOUR_LBL_W - 6,
            textAlign: 'right',
            fontSize: 11,
            color: '#8CA3A0',
            pointerEvents: 'none',
            lineHeight: 1,
          }}
        >
          {fmtHour(m)}
        </div>
      ))}

      {/* Leave home marker */}
      {leaveHomeMin != null && (legs?.[0]?.travelMin ?? 0) > 0 && (() => {
        const topPx = Math.max(4, (leaveHomeMin - gridStartMin) * PX_PER_MIN)
        return (
          <div
            style={{
              position: 'absolute',
              top: topPx - 14,
              left: leftPad + 4, right: 4,
              pointerEvents: 'none',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: showHourLabels ? 12 : 10, fontWeight: 500, color: '#22A67A', backgroundColor: '#F6F8F7', border: '1px solid #E4EAE8', borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>
              Leave home {leaveHome}{showHourLabels && (legs?.[0]?.travelMin ?? 0) > 0 ? ` · ${legs[0].travelMin} min to first job` : ''}
            </span>
          </div>
        )
      })()}

      {/* Travel gaps */}
      {jobs.map((job, idx) => {
        if (idx === 0) return null
        const leg = legs?.[idx]
        if (!leg || (leg.travelMin ?? 0) === 0) return null
        const prevJob = jobs[idx - 1]
        const prevEnd = (prevJob.start_minute ?? gridStartMin) + (prevJob.estimated_duration || 1) * 60
        const thisStart = job.start_minute ?? prevEnd
        const gapMin = thisStart - prevEnd
        if (gapMin <= 0) return null
        const gapTop = (prevEnd - gridStartMin) * PX_PER_MIN
        const gapH = Math.max(gapMin * PX_PER_MIN, 18)
        return (
          <div
            key={`gap-${job.id}`}
            style={{
              position: 'absolute',
              top: gapTop,
              left: leftPad + 4, right: 4,
              height: gapH,
              borderLeft: '2px dashed #C5E8D5',
              marginLeft: 12,
              padding: '8px 0',
              paddingLeft: 8,
              display: 'flex', alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <span style={{ fontSize: 10, color: '#8CA3A0', whiteSpace: 'nowrap' }}>
              {leg.travelMin} + {leg.bufferMin} min
            </span>
          </div>
        )
      })}

      {/* Job blocks */}
      {jobs.map((job) => (
        <TimeBlock
          key={job.id}
          job={job}
          dateStr={dateStr}
          gridStartMin={gridStartMin}
          leftPad={leftPad}
          onJobClick={onJobClick}
          isDay={showHourLabels}
        />
      ))}

      {/* Finish readout */}
      {finishMin != null && (
        <div
          style={{
            position: 'absolute',
            top: (finishMin - gridStartMin) * PX_PER_MIN + 4,
            left: leftPad + 2, right: 2,
            backgroundColor: '#F6F8F7',
            border: '1px solid #E4EAE8',
            borderRadius: 6,
            padding: '6px 10px',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 11, color: '#8CA3A0' }}>
            Done {finish}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── HourAxis (shared, week view only) ────────────────────────────────────────

function HourAxis({ gridStartMin, gridEndMin }) {
  const gridHeight = (gridEndMin - gridStartMin) * PX_PER_MIN
  const hours = []
  for (let m = gridStartMin; m <= gridEndMin; m += 60) hours.push(m)

  return (
    <div style={{ width: HOUR_LBL_W, flexShrink: 0, height: gridHeight, position: 'relative' }}>
      {hours.map((m) => (
        <div
          key={m}
          style={{
            position: 'absolute',
            top: (m - gridStartMin) * PX_PER_MIN - 8,
            right: 6,
            fontSize: 11,
            color: '#8CA3A0',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {fmtHour(m)}
        </div>
      ))}
    </div>
  )
}

// ─── DayHeader chip ────────────────────────────────────────────────────────────

function DayHeader({ date, dateStr, weather }) {
  const todayStr = toDateStr(new Date())
  const isToday = dateStr === todayStr
  const w = weather?.[dateStr]
  const chip = w ? WEATHER_CHIP[w.condition] : null
  return (
    <div style={{
      backgroundColor: isToday ? '#22A67A' : '#1F2D37',
      padding: '12px 14px',
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: isToday ? 'rgba(255,255,255,0.75)' : '#7A9490', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {date.toLocaleDateString('en-NZ', { weekday: 'short' })}
      </p>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', margin: '2px 0 0', lineHeight: 1 }}>
        {date.getDate()}
      </p>
      {chip && (
        <p style={{ margin: '5px 0 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, backgroundColor: chip.bg, color: chip.text, whiteSpace: 'nowrap' }}>
            <chip.Icon size={14} color={chip.iconColor} stroke={1.5} />
            {w.temp_c} {chip.label}
          </span>
        </p>
      )}
    </div>
  )
}

// ─── Drop modal ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1,   label: '1 hr'   },
  { value: 1.5, label: '1.5 hr' },
  { value: 2,   label: '2 hr+'  },
]

function DropModal({ job, date, dayJobs, plannerSettings, dayWeather, initialStartMin, onConfirm, onCancel }) {
  const [duration, setDuration] = useState(1)
  const [overrideMin, setOverrideMin] = useState(initialStartMin ?? null)
  const [slot, setSlot] = useState(
    initialStartMin != null ? (initialStartMin >= 13 * 60 ? 'afternoon' : 'morning') : 'morning'
  )
  const [showSlotPicker, setShowSlotPicker] = useState(false)

  const { exposed: autoExposed } = classifyJob(job)
  const [isExposed, setIsExposed] = useState(autoExposed)

  const dateLabel = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const dayName = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long' })
    : ''

  const previewStart = (() => {
    const existingInput = (dayJobs || []).map((j) => ({
      id: j.id,
      durationMin: (j.estimated_duration || 1) * 60,
      bufferMin: plannerSettings.default_buffer_minutes ?? 10,
      travelMinFromPrev: 0,
    }))
    const newEntry = {
      id: '__preview__',
      durationMin: duration * 60,
      bufferMin: plannerSettings.default_buffer_minutes ?? 10,
      travelMinFromPrev: 0,
      startOverrideMin: overrideMin ?? (slot === 'afternoon' ? 780 : undefined),
    }
    try {
      const { legs } = computeDay([...existingInput, newEntry], {
        dayStartMin: plannerSettings.day_start_minute ?? 480,
        dayEndTargetMin: plannerSettings.day_end_target_minute ?? null,
        defaultBufferMin: plannerSettings.default_buffer_minutes ?? 10,
      })
      return legs[legs.length - 1]?.start || ''
    } catch {
      return ''
    }
  })()

  const summary = jobSummary(job)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(31,45,55,0.5)' }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 18, width: '100%', maxWidth: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.22)' }}>
        <p style={{ fontSize: 18, fontWeight: 500, color: '#1F2D37', margin: '0 0 4px' }}>
          Set up this job
        </p>
        {summary && (
          <p style={{ fontSize: 13, color: '#4A5B68', margin: '0 0 12px', lineHeight: 1.4 }}>{summary}</p>
        )}

        {/* Day chip */}
        <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#F6F8F7', borderRadius: 8, padding: '4px 10px', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2D37' }}>{dateLabel}</span>
        </div>

        {/* Duration presets */}
        <p style={{ fontSize: 12, fontWeight: 500, color: '#4A5B68', margin: '0 0 8px' }}>Duration</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDuration(opt.value)}
              style={{
                flex: 1, minHeight: 44, fontSize: 13, fontWeight: 500, borderRadius: 8,
                border: `1px solid ${duration === opt.value ? '#22A67A' : '#E4EAE8'}`,
                backgroundColor: duration === opt.value ? '#22A67A' : '#FFF',
                color: duration === opt.value ? '#FFF' : '#4A5B68',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Start time preview */}
        {previewStart && (
          <div style={{ backgroundColor: '#E6F7F0', border: '1px solid #C5E8D5', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#22A67A', fontWeight: 500 }}>
                Starts around {previewStart}
              </span>
              <button
                type="button"
                onClick={() => setShowSlotPicker((v) => !v)}
                style={{ fontSize: 12, color: '#1D8F68', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}
              >
                Change start time
              </button>
            </div>
            {showSlotPicker && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {[{ value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' }].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setSlot(s.value)
                      setOverrideMin(s.value === 'afternoon' ? 13 * 60 : plannerSettings.day_start_minute ?? 480)
                    }}
                    style={{
                      flex: 1, minHeight: 36, fontSize: 13, fontWeight: 500, borderRadius: 8,
                      border: `1px solid ${slot === s.value ? '#22A67A' : '#E4EAE8'}`,
                      backgroundColor: slot === s.value ? '#22A67A' : '#FFF',
                      color: slot === s.value ? '#FFF' : '#4A5B68',
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weather hint */}
        {dayWeather && isBadWeather(dayWeather.condition) && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isExposed}
                onChange={(e) => setIsExposed(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: '#22A67A' }}
              />
              <span style={{ fontSize: 12, color: '#4A5B68', lineHeight: 1.4 }}>
                This job leaves a window or door open to the weather
              </span>
            </label>
            {isExposed && (
              <div style={{ marginTop: 8, backgroundColor: '#E8F1FB', border: '1px solid #B5D4F4', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontSize: 12, color: '#1E40AF', margin: 0, lineHeight: 1.4 }}>
                  {dayName} looks {dayWeather.condition === 'rain' ? 'wet' : 'windy'}. A {dayWeather.condition === 'rain' ? 'drier' : 'calmer'} day might work better for this one.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => onConfirm({ duration, slot, overrideMin })}
            style={{
              width: '100%', minHeight: 48, backgroundColor: '#22A67A', color: '#FFF',
              fontWeight: 500, fontSize: 15, borderRadius: 10, border: 'none', cursor: 'pointer',
            }}
          >
            Add to {dayName || 'day'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '100%', minHeight: 48, backgroundColor: '#FFF', color: '#4A5B68',
              fontWeight: 500, fontSize: 15, borderRadius: 10, border: '1px solid #E4EAE8', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Job detail panel ─────────────────────────────────────────────────────────

function JobDetailPanel({ job, pos, onClose }) {
  const value = calcJobValue(job)
  const items = job.job_items || []
  const panelW = 280

  const left = Math.min(pos.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 800) - panelW - 16)
  const top = Math.min(pos.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 320)

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          left: Math.max(8, left),
          top: Math.max(8, top),
          width: panelW,
          zIndex: 41,
          backgroundColor: '#FFF',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: '0.5px solid #E4EAE8',
          padding: '14px 16px',
        }}
      >
        {/* Name + close */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', margin: 0, lineHeight: 1.3, flex: 1, minWidth: 0 }}>
            {job.customer_name}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8CA3A0', fontSize: 20, lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Status badge */}
        <span style={{
          display: 'inline-flex', fontSize: 11, fontWeight: 500, color: '#FFF',
          backgroundColor: job.schedule_state === 'needs_rebooking' ? '#E8940D' : '#22A67A',
          borderRadius: 4, padding: '2px 7px', marginBottom: 10,
        }}>
          {job.schedule_state === 'needs_rebooking' ? 'Needs rebooking' : 'Scheduled'}
        </span>

        {/* Phone */}
        {job.customer_phone && (
          <div style={{ marginBottom: 6 }}>
            <a
              href={`tel:${job.customer_phone}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, color: '#1D6DBF', textDecoration: 'none' }}
            >
              {job.customer_phone}
            </a>
          </div>
        )}

        {/* Address */}
        {job.customer_address && (
          <div style={{ marginBottom: 10 }}>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(job.customer_address)}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, fontSize: 13, color: '#1D6DBF', textDecoration: 'none', lineHeight: 1.4 }}
            >
              {job.customer_address}
            </a>
          </div>
        )}

        {/* Items */}
        {items.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {items.map((item) => (
              <p key={item.id} style={{ fontSize: 12, color: '#4A5B68', margin: '0 0 3px', lineHeight: 1.4 }}>
                {item.type === 'diagnosed'
                  ? [item.joinery_type_label, item.fault_label].filter(Boolean).join(' — ')
                  : (item.description || 'Custom item')}
              </p>
            ))}
          </div>
        )}

        <div style={{ borderTop: '0.5px solid #E4EAE8', margin: '8px 0' }} />

        {/* Value */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#8CA3A0' }}>Est. value</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#22A67A' }}>{formatCurrency(value)}</span>
        </div>
      </div>
    </>
  )
}

// ─── Month heatmap ─────────────────────────────────────────────────────────────

function MonthHeatmap({ year, month, counts, weather = {} }) {
  const monthName = new Date(year, month, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
  const todayMs = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime() })()
  const forecastCutoffMs = todayMs + 7 * 86400000

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const gridStart = getMonday(firstDay)
  const gridEnd = addDays(getMonday(lastDay), 6)

  const cells = []
  let cur = new Date(gridStart)
  while (cur <= gridEnd) { cells.push(new Date(cur)); cur = addDays(cur, 1) }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  function heatBg(count) {
    if (count === 0) return '#FFFFFF'
    if (count === 1) return '#E6F7F0'
    if (count <= 3) return 'rgba(34,166,122,0.35)'
    return '#FEF7E6'
  }
  function heatBorder(count) {
    if (count === 0) return '#E4EAE8'
    if (count === 1) return '#C5E8D5'
    if (count <= 3) return '#22A67A55'
    return '#F5E2B0'
  }

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#1F2D37', margin: '0 0 16px' }}>{monthName}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((h) => (
          <div key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#8CA3A0', padding: '4px 0' }}>{h}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {week.map((d) => {
            const ds = toDateStr(d)
            const count = counts[ds] || 0
            const isCurrentMonth = d.getMonth() === month
            const dMs = d.getTime()
            const dayW = (dMs >= todayMs && dMs < forecastCutoffMs) ? weather[ds] : null
            return (
              <div
                key={ds}
                style={{
                  borderRadius: 8,
                  padding: '6px 4px',
                  textAlign: 'center',
                  backgroundColor: heatBg(count),
                  border: `1px solid ${heatBorder(count)}`,
                  opacity: isCurrentMonth ? 1 : 0.3,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 500, color: '#1F2D37', margin: 0 }}>{d.getDate()}</p>
                {count > 0 && (
                  <p style={{ fontSize: 10, fontWeight: 500, color: '#22A67A', margin: 0 }}>{count}</p>
                )}
                {dayW && WEATHER_CHIP[dayW.condition] && (() => {
                  const wc = WEATHER_CHIP[dayW.condition]
                  return (
                    <p style={{ margin: '3px 0 0', display: 'flex', justifyContent: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, fontWeight: 500, padding: '1px 4px', borderRadius: 3, backgroundColor: wc.bg, color: wc.text, whiteSpace: 'nowrap' }}>
                        <wc.Icon size={10} color={wc.iconColor} stroke={1.5} />
                        {dayW.temp_c}
                      </span>
                    </p>
                  )
                })()}
              </div>
            )
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Open', bg: '#FFFFFF', border: '#E4EAE8' },
          { label: 'Light', bg: '#E6F7F0', border: '#C5E8D5' },
          { label: 'Busy', bg: 'rgba(34,166,122,0.35)', border: '#22A67A55' },
          { label: 'Full', bg: '#FEF7E6', border: '#F5E2B0' },
        ].map((item) => (
          <span
            key={item.label}
            style={{
              fontSize: 11, color: '#4A5B68',
              backgroundColor: item.bg,
              border: `1px solid ${item.border}`,
              borderRadius: 6, padding: '3px 10px',
            }}
          >
            {item.label}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#8CA3A0', marginTop: 12 }}>
        Switch to week or day view to drag and schedule jobs.
      </p>
    </div>
  )
}

// ─── Planner page ──────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { settings } = useSettings()
  const plannerSettings = {
    day_start_minute:       settings?.day_start_minute       ?? 480,
    day_end_target_minute:  settings?.day_end_target_minute  ?? null,
    default_buffer_minutes: settings?.default_buffer_minutes ?? 10,
  }

  const [windowWidth, setWindowWidth] = useState(null)
  useEffect(() => {
    setWindowWidth(window.innerWidth)
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [backlog, setBacklog]           = useState([])
  const [weekDays, setWeekDays]         = useState({})
  const [weekStart, setWeekStart]       = useState(() => getMonday(new Date()))
  const [view, setView]                 = useState('week')
  const [backlogSort, setBacklogSort]   = useState('oldest')
  const [loading, setLoading]           = useState(true)
  const [monthCounts, setMonthCounts]   = useState({})
  const [dayTravelMaps, setDayTravelMaps] = useState({})
  const [weather, setWeather]           = useState({})
  const [activeItem, setActiveItem]     = useState(null)
  const [pendingDrop, setPendingDrop]   = useState(null)
  const [dropModalOpen, setDropModalOpen] = useState(false)
  const [selectedJob, setSelectedJob]   = useState(null)
  const [panelPos, setPanelPos]         = useState(null)

  const homeLat = settings?.home_base_lat ?? null
  const homeLng = settings?.home_base_lng ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadWeek = useCallback(async (start) => {
    setLoading(true)
    setDayTravelMaps({})
    const rangeEnd = view === 'day' ? start : addDays(start, 6)
    const [bl, wj] = await Promise.all([
      getPlannerBacklog(),
      getPlannerWeekJobs(toDateStr(start), toDateStr(rangeEnd)),
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
  }, [view])

  useEffect(() => { loadWeek(weekStart) }, [weekStart, loadWeek])

  useEffect(() => {
    if (homeLat == null || homeLng == null) return
    const datesWithJobs = Object.keys(weekDays).filter((d) => (weekDays[d] || []).length > 0)
    if (!datesWithJobs.length) return
    let cancelled = false
    ;(async () => {
      const allPairs = []
      const seen = new Set()
      for (const date of datesWithJobs) {
        for (const p of buildDayPairs(weekDays[date] || [], homeLat, homeLng)) {
          const k = `${p.olat},${p.olng}|${p.dlat},${p.dlng}`
          if (!seen.has(k)) { seen.add(k); allPairs.push(p) }
        }
      }
      if (!allPairs.length || cancelled) return
      const travelMap = await fetchTravelTimes(allPairs)
      if (cancelled) return
      setDayTravelMaps((prev) => {
        const next = { ...prev }
        for (const date of datesWithJobs) next[date] = { ...(prev[date] || {}), ...travelMap }
        return next
      })
    })()
    return () => { cancelled = true }
  }, [weekDays, homeLat, homeLng])

  useEffect(() => {
    const lat = settings?.home_base_lat
    const lng = settings?.home_base_lng
    if (lat == null || lng == null) return
    let cancelled = false
    fetchWeather(lat, lng).then((map) => { if (!cancelled) setWeather(map) })
    return () => { cancelled = true }
  }, [settings?.home_base_lat, settings?.home_base_lng])

  useEffect(() => {
    if (view !== 'month') return
    const y = weekStart.getFullYear()
    const m = weekStart.getMonth()
    getPlannerMonthCounts(
      toDateStr(new Date(y, m, 1)),
      toDateStr(new Date(y, m + 1, 0))
    ).then(setMonthCounts)
  }, [view, weekStart])

  // ── Computed: sorted backlog ───────────────────────────────────────────────

  const sortedBacklog = [...backlog].sort((a, b) =>
    new Date(a.accepted_at || a.created_at).getTime() - new Date(b.accepted_at || b.created_at).getTime()
  )

  const backlogDisplay = (() => {
    if (backlogSort !== 'area') return sortedBacklog.map((j) => ({ type: 'job', job: j }))
    if (homeLat != null && homeLng != null) {
      const tagged = sortedBacklog.map((job) => ({
        job,
        dir: job.customer_lat != null && job.customer_lng != null
          ? compassLabel(getBearing(homeLat, homeLng, job.customer_lat, job.customer_lng))
          : 'Unknown area',
      }))
      tagged.sort((a, b) => {
        const ai = a.dir === 'Unknown area' ? 99 : COMPASS.indexOf(a.dir)
        const bi = b.dir === 'Unknown area' ? 99 : COMPASS.indexOf(b.dir)
        if (ai !== bi) return ai - bi
        return new Date(a.job.accepted_at || a.job.created_at).getTime() - new Date(b.job.accepted_at || b.job.created_at).getTime()
      })
      const items = []
      let lastDir = null
      for (const { job, dir } of tagged) {
        if (dir !== lastDir) { items.push({ type: 'heading', area: dir }); lastDir = dir }
        items.push({ type: 'job', job })
      }
      return items
    }
    const items = [{ type: 'notice', text: 'Set home base in Settings to enable direction grouping.' }]
    let lastArea = null
    for (const job of sortedBacklog) {
      const area = getArea(job.customer_address) || 'Unknown area'
      if (area !== lastArea) { items.push({ type: 'heading', area }); lastArea = area }
      items.push({ type: 'job', job })
    }
    return items
  })()

  // ── Computed: week columns ─────────────────────────────────────────────────

  const weekColumns = Array.from({ length: view === 'day' ? 1 : 7 }, (_, i) => {
    const d   = addDays(weekStart, i)
    const ds  = toDateStr(d)
    const rawJobs   = weekDays[ds] || []
    const travelMap = dayTravelMaps[ds] || {}
    const result = rawJobs.length
      ? recomputeDayJobs(rawJobs, plannerSettings, travelMap, homeLat, homeLng)
      : { jobs: [], legs: [], longDay: false, finish: '', finishMin: null, leaveHome: '', leaveHomeMin: null, totalDriveMin: 0 }
    return { date: d, dateStr: ds, ...result }
  })

  const gridStartMin = plannerSettings.day_start_minute ?? 480
  const gridEndMin = (() => {
    let max = 18 * 60
    for (const col of weekColumns) {
      if (!col.finishMin) continue
      const extended = col.finishMin + 60
      if (extended > max) max = extended
    }
    return max
  })()

  // ── DnD handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }) {
    setActiveItem(active.data.current)
  }

  function handleDragEnd({ active, over, delta }) {
    setActiveItem(null)
    if (!active?.data?.current) return

    const { job, source, date: fromDate } = active.data.current

    if (source === 'backlog') {
      if (!over || over.id === 'backlog') return
      const toDate = over.id.replace('day::', '')
      let dropMin = null
      const translated = active.rect?.current?.translated
      if (translated && over.rect) {
        const dropY = translated.top - over.rect.top
        const raw = gridStartMin + dropY / PX_PER_MIN
        const snapped = Math.round(raw / 15) * 15
        dropMin = Math.max(gridStartMin, Math.min(snapped, 22 * 60))
      }
      setPendingDrop({ job, date: toDate, dropMin })
      setDropModalOpen(true)
      return
    }

    if (source === 'time-block') {
      if (!over || over.id === 'backlog') {
        commitUnassign(job, fromDate)
        return
      }
      const toDate = over.id.replace('day::', '')
      const originalStartMin = active.data.current.originalStartMin ?? plannerSettings.day_start_minute
      const rawNewStart = originalStartMin + delta.y / PX_PER_MIN
      const snappedStart = Math.round(rawNewStart / 15) * 15
      const clampedStart = Math.max(plannerSettings.day_start_minute ?? 480, snappedStart)
      const changed = toDate !== fromDate || clampedStart !== originalStartMin
      if (changed) commitTimePinJob(job, fromDate, toDate, clampedStart)
      return
    }

    // legacy day-card source (unassign back to backlog)
    if (!over) return
    if (over.id === 'backlog') commitUnassign(job, fromDate)
    else {
      const toDate = over.id.replace('day::', '')
      if (fromDate !== toDate) commitMoveDay(job, fromDate, toDate)
    }
  }

  // ── Commit operations ──────────────────────────────────────────────────────

  async function commitAssign(job, date, { duration, slot, overrideMin }) {
    const existing = weekDays[date] || []
    const newJob = {
      ...job,
      schedule_state: 'assigned', scheduled_date: date, slot, estimated_duration: duration,
      ...(overrideMin != null ? { start_minute: overrideMin, start_overridden: true } : {}),
    }
    const allJobs = [...existing, newJob]
    setWeekDays((prev) => ({ ...prev, [date]: allJobs }))
    setBacklog((prev) => prev.filter((j) => j.id !== job.id))
    const { jobs: recomputed } = recomputeDayJobs(allJobs, plannerSettings, dayTravelMaps[date] || {}, homeLat, homeLng)
    const assigned = recomputed[recomputed.length - 1]
    const err = await dbAssignJob(job.id, {
      scheduled_date: date, slot, estimated_duration: duration,
      sequence_index: assigned.sequence_index, start_minute: assigned.start_minute,
      start_overridden: overrideMin != null,
    })
    if (err) { loadWeek(weekStart); return }
    const otherUpdates = recomputed.slice(0, -1).map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute }))
    if (otherUpdates.length) await dbBatchUpdateSchedule(otherUpdates)
  }

  async function commitUnassign(job, fromDate) {
    const remaining = (weekDays[fromDate] || []).filter((j) => j.id !== job.id)
    const unassigned = { ...job, schedule_state: 'unassigned', scheduled_date: null, slot: null, sequence_index: null, start_minute: null }
    setWeekDays((prev) => ({ ...prev, [fromDate]: remaining }))
    setBacklog((prev) => [...prev, unassigned].sort((a, b) =>
      new Date(a.accepted_at || a.created_at).getTime() - new Date(b.accepted_at || b.created_at).getTime()
    ))
    const err = await dbUnassignJob(job.id)
    if (err) { loadWeek(weekStart); return }
    if (remaining.length) {
      const { jobs: recomputed } = recomputeDayJobs(remaining, plannerSettings, dayTravelMaps[fromDate] || {}, homeLat, homeLng)
      await dbBatchUpdateSchedule(recomputed.map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute })))
    }
  }

  async function commitMoveDay(job, fromDate, toDate) {
    const fromJobs = (weekDays[fromDate] || []).filter((j) => j.id !== job.id)
    const toJobs   = [...(weekDays[toDate] || []), { ...job, scheduled_date: toDate }]
    setWeekDays((prev) => ({ ...prev, [fromDate]: fromJobs, [toDate]: toJobs }))
    const { jobs: fromRecomputed } = fromJobs.length
      ? recomputeDayJobs(fromJobs, plannerSettings, dayTravelMaps[fromDate] || {}, homeLat, homeLng)
      : { jobs: [] }
    const { jobs: toRecomputed } = recomputeDayJobs(toJobs, plannerSettings, dayTravelMaps[toDate] || {}, homeLat, homeLng)
    const moved = toRecomputed.find((j) => j.id === job.id)
    const err = await dbAssignJob(job.id, {
      scheduled_date: toDate, slot: job.slot, estimated_duration: job.estimated_duration,
      sequence_index: moved?.sequence_index ?? toRecomputed.length - 1,
      start_minute: moved?.start_minute ?? null, start_overridden: false,
    })
    if (err) { loadWeek(weekStart); return }
    const allUpdates = [
      ...fromRecomputed.map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute })),
      ...toRecomputed.filter((j) => j.id !== job.id).map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute })),
    ]
    if (allUpdates.length) await dbBatchUpdateSchedule(allUpdates)
  }

  async function commitTimePinJob(job, fromDate, toDate, newStartMin) {
    if (fromDate === toDate) {
      const updatedJobs = (weekDays[fromDate] || []).map((j) =>
        j.id === job.id ? { ...j, start_minute: newStartMin, start_overridden: true } : j
      )
      setWeekDays((prev) => ({ ...prev, [fromDate]: updatedJobs }))
      const err = await dbPinJobTime(job.id, newStartMin)
      if (err) { loadWeek(weekStart); return }
      const { jobs: recomputed } = recomputeDayJobs(updatedJobs, plannerSettings, dayTravelMaps[fromDate] || {}, homeLat, homeLng)
      const otherUpdates = recomputed
        .filter((j) => j.id !== job.id)
        .map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute }))
      if (otherUpdates.length) await dbBatchUpdateSchedule(otherUpdates)
    } else {
      const fromJobs = (weekDays[fromDate] || []).filter((j) => j.id !== job.id)
      const movedJob = { ...job, scheduled_date: toDate, start_minute: newStartMin, start_overridden: true }
      const toJobs   = [...(weekDays[toDate] || []), movedJob]
      setWeekDays((prev) => ({ ...prev, [fromDate]: fromJobs, [toDate]: toJobs }))
      const err = await dbAssignJob(job.id, {
        scheduled_date: toDate, slot: job.slot, estimated_duration: job.estimated_duration,
        sequence_index: toJobs.length - 1, start_minute: newStartMin, start_overridden: true,
      })
      if (err) { loadWeek(weekStart); return }
      if (fromJobs.length) {
        const { jobs: fr } = recomputeDayJobs(fromJobs, plannerSettings, dayTravelMaps[fromDate] || {}, homeLat, homeLng)
        await dbBatchUpdateSchedule(fr.map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute })))
      }
      const { jobs: toRecomputed } = recomputeDayJobs(toJobs, plannerSettings, dayTravelMaps[toDate] || {}, homeLat, homeLng)
      const toOthers = toRecomputed.filter((j) => j.id !== job.id).map((j) => ({ id: j.id, sequence_index: j.sequence_index, start_minute: j.start_minute }))
      if (toOthers.length) await dbBatchUpdateSchedule(toOthers)
    }
  }

  // ── View toggle ────────────────────────────────────────────────────────────

  function switchView(newView) {
    if (newView === 'week' && view === 'day') setWeekStart(getMonday(weekStart))
    setView(newView)
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navPrev() {
    setWeekStart((w) => addDays(w, view === 'day' ? -1 : -7))
  }
  function navNext() {
    setWeekStart((w) => addDays(w, view === 'day' ? 1 : 7))
  }
  function navToday() {
    setWeekStart(view === 'day' ? new Date() : getMonday(new Date()))
  }

  // ── Screen gate ────────────────────────────────────────────────────────────

  if (windowWidth !== null && windowWidth < 1024) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F6F8F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontSize: 16, color: '#4A5B68', textAlign: 'center' }}>
          Open the planner on a computer to plan your week.
        </p>
      </div>
    )
  }
  if (windowWidth === null) return <div style={{ minHeight: '100dvh', background: '#F6F8F7' }} />

  // ── Render ─────────────────────────────────────────────────────────────────

  const navLabel = view === 'day' ? formatDayFull(weekStart) : formatWeekRange(weekStart)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F6F8F7', overflow: 'hidden' }}>

        {/* ── Header bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          backgroundColor: '#FFF', borderBottom: '1px solid #E4EAE8', flexShrink: 0,
        }}>
          {/* Brand — sits above the backlog column */}
          <div style={{ width: 257, flexShrink: 0, padding: '10px 16px 10px 20px', display: 'flex', alignItems: 'center' }}>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: '#22A67A', letterSpacing: '-0.3px' }}>Jotey</span>
              <span style={{ fontSize: 15, fontWeight: 400, color: '#4A5B68' }}>Planner</span>
            </h1>
          </div>

          {/* Nav controls — sits above the calendar grid */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px 10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={navPrev} style={{
                minHeight: 34, padding: '0 12px', fontSize: 13, fontWeight: 500,
                color: '#1F2D37', border: '1px solid #E4EAE8', borderRadius: 8,
                background: '#FFF', cursor: 'pointer',
              }}>
                Prev
              </button>
              <span style={{ fontSize: 13, color: '#4A5B68', minWidth: 200, textAlign: 'center' }}>
                {navLabel}
              </span>
              <button type="button" onClick={navNext} style={{
                minHeight: 34, padding: '0 12px', fontSize: 13, fontWeight: 500,
                color: '#1F2D37', border: '1px solid #E4EAE8', borderRadius: 8,
                background: '#FFF', cursor: 'pointer',
              }}>
                Next
              </button>
            </div>

            <button type="button" onClick={navToday} style={{
              minHeight: 34, padding: '0 10px', fontSize: 13, fontWeight: 500,
              color: '#22A67A', background: 'none', border: 'none', cursor: 'pointer',
            }}>
              Today
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {(['day', 'week', 'month']).map((v) => (
                <PillBtn key={v} active={view === v} onClick={() => switchView(v)}>
                  {v === 'day' ? 'Day' : v === 'week' ? 'Week' : 'Month'}
                </PillBtn>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main pane ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Backlog column */}
          <BacklogPanel
            backlog={backlog}
            backlogDisplay={backlogDisplay}
            backlogSort={backlogSort}
            setBacklogSort={setBacklogSort}
            loading={loading}
          />

          {/* Grid pane */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingLeft: 16 }}>
            {view === 'month' ? (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <MonthHeatmap
                  year={weekStart.getFullYear()}
                  month={weekStart.getMonth()}
                  counts={monthCounts}
                  weather={weather}
                />
              </div>
            ) : view === 'day' ? (
              <DayViewPane
                col={weekColumns[0]}
                gridStartMin={gridStartMin}
                gridEndMin={gridEndMin}
                weather={weather}
                onJobClick={(job, pos) => { setSelectedJob(job); setPanelPos(pos) }}
              />
            ) : (
              <WeekViewPane
                weekColumns={weekColumns}
                gridStartMin={gridStartMin}
                gridEndMin={gridEndMin}
                weather={weather}
                onJobClick={(job, pos) => { setSelectedJob(job); setPanelPos(pos) }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeItem?.source === 'backlog' && (
          <div style={{ width: 220 }}>
            <BacklogCardContent job={activeItem.job} ghost />
          </div>
        )}
        {activeItem?.source === 'time-block' && (() => {
          const job = activeItem.job
          const startMin = activeItem.originalStartMin ?? plannerSettings.day_start_minute
          const dl = durLabel(job.estimated_duration || 1)
          return (
            <div style={{
              width: 160, backgroundColor: '#FFF', border: '0.5px solid #22A67A',
              borderRadius: 10, padding: '5px 8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#22A67A', margin: 0 }}>{fmt(startMin)} · {dl}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2D37', margin: 0 }}>{job.customer_name}</p>
            </div>
          )
        })()}
      </DragOverlay>

      {/* Job detail panel */}
      {selectedJob && panelPos && (
        <JobDetailPanel
          job={selectedJob}
          pos={panelPos}
          onClose={() => { setSelectedJob(null); setPanelPos(null) }}
        />
      )}

      {/* Drop modal */}
      {dropModalOpen && pendingDrop && (
        <DropModal
          job={pendingDrop.job}
          date={pendingDrop.date}
          dayJobs={weekDays[pendingDrop.date] || []}
          plannerSettings={plannerSettings}
          dayWeather={weather[pendingDrop.date] || null}
          initialStartMin={pendingDrop.dropMin ?? null}
          onConfirm={({ duration, slot, overrideMin }) => {
            commitAssign(pendingDrop.job, pendingDrop.date, { duration, slot, overrideMin })
            setDropModalOpen(false)
            setPendingDrop(null)
          }}
          onCancel={() => { setDropModalOpen(false); setPendingDrop(null) }}
        />
      )}
    </DndContext>
  )
}

// ─── BacklogPanel ──────────────────────────────────────────────────────────────

function BacklogPanel({ backlog, backlogDisplay, backlogSort, setBacklogSort, loading }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog' })

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 256,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #E4EAE8',
        backgroundColor: isOver ? '#FEF7E6' : '#FFF',
        transition: 'background 0.1s',
      }}
    >
      {/* Heading */}
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #E4EAE8' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#1F2D37', margin: 0 }}>To schedule</p>
          {backlog.length > 0 && (
            <span style={{ fontSize: 12, color: '#8CA3A0' }}>{backlog.length}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <PillBtn active={backlogSort === 'oldest'} onClick={() => setBacklogSort('oldest')} small>
            Oldest first
          </PillBtn>
          <PillBtn active={backlogSort === 'area'} onClick={() => setBacklogSort('area')} small>
            By area
          </PillBtn>
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <p style={{ fontSize: 12, color: '#8CA3A0', textAlign: 'center', paddingTop: 16 }}>Loading...</p>
        ) : backlog.length === 0 ? (
          <p style={{ fontSize: 12, color: '#8CA3A0', textAlign: 'center', paddingTop: 16 }}>No jobs to schedule.</p>
        ) : (
          backlogDisplay.map((item, i) =>
            item.type === 'notice' ? (
              <p key="notice" style={{ fontSize: 10, color: '#8CA3A0', fontStyle: 'italic', margin: '0 4px', lineHeight: 1.4 }}>
                {item.text}
              </p>
            ) : item.type === 'heading' ? (
              <div
                key={`h:${item.area}`}
                style={{
                  fontSize: 15, fontWeight: 600, color: '#FFFFFF',
                  backgroundColor: '#4A5B68',
                  borderRadius: 6,
                  padding: '10px 14px',
                  borderLeft: '4px solid #22A67A',
                  marginTop: i === 0 ? 0 : 18,
                  marginBottom: 10,
                  flexShrink: 0,
                }}
              >
                {item.area}
              </div>
            ) : (
              <BacklogCard key={item.job.id} job={item.job} />
            )
          )
        )}
      </div>
    </div>
  )
}

// ─── DayViewPane ──────────────────────────────────────────────────────────────

function DayViewPane({ col, gridStartMin, gridEndMin, weather, onJobClick }) {
  if (!col) return null
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 16, paddingTop: 12, paddingBottom: 12 }}>
      {/* Dark header bar */}
      <div style={{ flexShrink: 0, borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
        <DayHeader date={col.date} dateStr={col.dateStr} weather={weather} />
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#FFF', border: '0.5px solid #E4EAE8', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '8px 8px 16px' }}>
        <TimeGridColumnBody
          dateStr={col.dateStr}
          jobs={col.jobs}
          legs={col.legs}
          leaveHome={col.leaveHome}
          leaveHomeMin={col.leaveHomeMin}
          finishMin={col.finishMin}
          finish={col.finish}
          longDay={col.longDay}
          totalDriveMin={col.totalDriveMin}
          gridStartMin={gridStartMin}
          gridEndMin={gridEndMin}
          showHourLabels={true}
          onJobClick={onJobClick}
        />
      </div>
    </div>
  )
}

// ─── WeekViewPane ─────────────────────────────────────────────────────────────

function WeekViewPane({ weekColumns, gridStartMin, gridEndMin, weather, onJobClick }) {
  const todayStr = toDateStr(new Date())
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 12, paddingTop: 12, paddingBottom: 12 }}>
      {/* Connected dark header bar */}
      <div style={{ marginLeft: HOUR_LBL_W + 8, flexShrink: 0, display: 'flex', borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
        {weekColumns.map((col, idx) => {
          const isToday = col.dateStr === todayStr
          const w = weather?.[col.dateStr]
          return (
            <div
              key={col.dateStr}
              style={{
                flex: 1,
                backgroundColor: isToday ? '#22A67A' : '#1F2D37',
                borderRight: idx < weekColumns.length - 1 ? '1px solid #2A3A45' : 'none',
                padding: '8px 6px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 500, color: isToday ? 'rgba(255,255,255,0.75)' : '#7A9490', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {col.date.toLocaleDateString('en-NZ', { weekday: 'short' })}
              </p>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', margin: '2px 0 0', lineHeight: 1 }}>
                {col.date.getDate()}
              </p>
              {w && WEATHER_CHIP[w.condition] && (() => {
                const wc = WEATHER_CHIP[w.condition]
                return (
                  <p style={{ margin: '4px 0 0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, backgroundColor: wc.bg, color: wc.text, whiteSpace: 'nowrap' }}>
                      <wc.Icon size={14} color={wc.iconColor} stroke={1.5} />
                      {w.temp_c} {wc.label}
                    </span>
                  </p>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <HourAxis gridStartMin={gridStartMin} gridEndMin={gridEndMin} />
          {weekColumns.map((col) => (
            <TimeGridColumnBody
              key={col.dateStr}
              dateStr={col.dateStr}
              jobs={col.jobs}
              legs={col.legs}
              leaveHome={col.leaveHome}
              leaveHomeMin={col.leaveHomeMin}
              finishMin={col.finishMin}
              finish={col.finish}
              longDay={col.longDay}
              totalDriveMin={col.totalDriveMin}
              gridStartMin={gridStartMin}
              gridEndMin={gridEndMin}
              showHourLabels={false}
              topFlat={true}
              onJobClick={onJobClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
