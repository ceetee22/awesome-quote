'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/lib/settings-context'
import { computeDay, fmt } from '@/lib/cascade'
import { buildDayPairs, fetchTravelTimes, coordKey } from '@/lib/travel'
import { fetchWeather } from '@/lib/weather'
import {
  getPlannerBacklog,
  getPlannerWeekJobs,
  getPlannerMonthCounts,
  dbAssignJob,
} from '@/lib/db'
import { IconSun, IconCloudRain, IconCloud, IconWind } from '@tabler/icons-react'

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

function formatDateLabel(d) {
  return d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatDayShort(d) {
  return d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatJobCount(n) {
  if (n === 0) return 'No jobs'
  return `${n} ${n === 1 ? 'job' : 'jobs'}`
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

function buildNavUrl(address, navApp) {
  const enc = encodeURIComponent(address)
  switch (navApp) {
    case 'apple_maps': return `https://maps.apple.com/?daddr=${enc}`
    case 'waze': return `https://waze.com/ul?q=${enc}&navigate=yes`
    case 'system_default': return `geo:0,0?q=${enc}`
    default: return `https://www.google.com/maps/dir/?api=1&destination=${enc}`
  }
}

// ─── Job helpers ───────────────────────────────────────────────────────────────

function jobSummary(job) {
  const items = job.job_items || []
  if (!items.length) return ''
  const labels = items.map((it) =>
    it.type === 'diagnosed'
      ? [it.joinery_type_label, it.fault_label].filter(Boolean).join(' - ')
      : (it.description || 'Custom item')
  )
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]}, ${labels[1]} +${labels.length - 2} more`
}

function calcJobValue(job) {
  const parts = (job.job_items || []).flatMap((i) => i.job_item_parts || [])
  const partsTotal = parts.reduce((s, p) => s + (Number(p.sell_price) || 0) * (Number(p.qty) || 1), 0)
  const labour = (Number(job.labour_hours) || 0) * (Number(job.hourly_rate) || 85)
  const sub = partsTotal + labour + (Number(job.callout_fee) || 0)
  return sub * 1.15
}

function fmtCurrency(v) {
  return `$${Number(v || 0).toFixed(2)}`
}

function durLabel(hours) {
  if (!hours) return ''
  if (hours === 0.5) return '30 min'
  if (hours === 1) return '1 hr'
  return `${hours} hr`
}

// ─── Cascade helper (mirrors planner logic) ────────────────────────────────────

function recomputeDay(jobs, settings, travelMap) {
  if (!jobs.length) return { legs: [], leaveHome: '', leaveHomeMin: null }
  const homeLat = settings.home_base_lat
  const homeLng = settings.home_base_lng

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
      bufferMin: settings.default_buffer_minutes ?? 10,
      travelMinFromPrev: travelMin,
      startOverrideMin: job.start_overridden === true ? job.start_minute : undefined,
    }
  })

  const result = computeDay(input, {
    dayStartMin: settings.day_start_minute ?? 480,
    dayEndTargetMin: settings.day_end_target_minute ?? null,
    defaultBufferMin: settings.default_buffer_minutes ?? 10,
  })

  return result
}

function getTravelBetween(jobs, i, settings, travelMap) {
  const homeLat = settings.home_base_lat
  const homeLng = settings.home_base_lng
  if (i === 0) {
    if (homeLat == null || !jobs[0]?.customer_lat) return null
    const ok = coordKey(homeLat, homeLng)
    const dk = coordKey(jobs[0].customer_lat, jobs[0].customer_lng)
    return travelMap[`${ok}|${dk}`] ?? null
  }
  const prev = jobs[i - 1]
  const curr = jobs[i]
  if (!prev?.customer_lat || !curr?.customer_lat) return null
  const ok = coordKey(prev.customer_lat, prev.customer_lng)
  const dk = coordKey(curr.customer_lat, curr.customer_lng)
  return travelMap[`${ok}|${dk}`] ?? null
}

// ─── Weather chip ──────────────────────────────────────────────────────────────

const WEATHER_CHIP = {
  sun:   { bg: '#FEF7E6', text: '#854F0B', iconColor: '#E8940D', Icon: IconSun       },
  rain:  { bg: '#E8F1FB', text: '#185FA5', iconColor: '#3B82D6', Icon: IconCloudRain },
  cloud: { bg: '#F1EFE8', text: '#4A5B68', iconColor: '#8CA3A0', Icon: IconCloud     },
  windy: { bg: '#EEF1F0', text: '#4A5B68', iconColor: '#4A5B68', Icon: IconWind      },
}

function WeatherChip({ condition, temp }) {
  const chip = WEATHER_CHIP[condition]
  if (!chip) return null
  const { Icon } = chip
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: chip.bg, borderRadius: 8, padding: '4px 10px' }}>
      <Icon size={14} color={chip.iconColor} />
      <span style={{ fontSize: 14, fontWeight: 500, color: chip.text }}>
        {temp != null ? `${Math.round(temp)}°` : ''} {condition}
      </span>
    </div>
  )
}

// ─── Day header ────────────────────────────────────────────────────────────────

function DayHeader({ date, jobCount, weatherEntry }) {
  const label = date.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div style={{ background: '#1F2D37', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>{label}</p>
          <p style={{ fontSize: 14, color: '#8CA3A0', margin: '2px 0 0' }}>{formatJobCount(jobCount)}</p>
        </div>
        {weatherEntry && (
          <WeatherChip condition={weatherEntry.condition} temp={weatherEntry.temp_c} />
        )}
      </div>
    </div>
  )
}

// ─── Travel pill ───────────────────────────────────────────────────────────────

function TravelPill({ minutes }) {
  if (minutes == null) return <div style={{ height: 16 }} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4 }}>
      <div style={{ width: 1, height: 12, background: '#E4EAE8' }} />
      <span style={{ fontSize: 14, color: '#8CA3A0', padding: '2px 0' }}>{minutes} min drive</span>
      <div style={{ width: 1, height: 12, background: '#E4EAE8' }} />
    </div>
  )
}

// ─── Job card (full — Today / Tomorrow view) ───────────────────────────────────

function JobCard({ job, leg, travelToNext, navApp, onNavigate }) {
  const summary = jobSummary(job)
  const startLabel = leg ? leg.start : (job.start_minute != null ? fmt(job.start_minute) : '')
  const dur = job.estimated_duration ? durLabel(job.estimated_duration) : ''
  const borderColor = job.schedule_state === 'assigned' ? '#22A67A' : '#E8940D'

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E4EAE8', borderLeft: `4px solid ${borderColor}`, borderRadius: 10, padding: 12, marginBottom: 4 }}>
      {/* Time + duration */}
      {startLabel && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#22A67A' }}>{startLabel}</span>
          {dur && <span style={{ fontSize: 14, color: '#8CA3A0' }}>{dur}</span>}
        </div>
      )}

      {/* Customer name */}
      <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', margin: '0 0 2px', lineHeight: 1.3 }}>
        {job.customer_name}
      </p>

      {/* Job description */}
      {summary && (
        <p style={{ fontSize: 14, color: '#4A5B68', margin: '0 0 2px', lineHeight: 1.4 }}>
          {summary}
        </p>
      )}

      {/* Address */}
      {job.customer_address && (
        <p style={{ fontSize: 14, color: '#8CA3A0', margin: '0 0 10px', lineHeight: 1.4 }}>
          {job.customer_address}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {job.customer_address && (
          <a
            href={buildNavUrl(job.customer_address, navApp)}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#22A67A', color: '#FFFFFF', borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Navigate
          </a>
        )}
        {job.customer_phone && (
          <a
            href={`tel:${job.customer_phone}`}
            style={{
              flex: 1, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#FFFFFF', color: '#1F2D37', borderRadius: 8, fontSize: 14, fontWeight: 500,
              border: '1px solid #E4EAE8', textDecoration: 'none',
            }}
          >
            Call
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Compact job card (week view) ──────────────────────────────────────────────

function CompactJobCard({ job, leg, onClick }) {
  const summary = jobSummary(job)
  const startLabel = leg ? leg.start : (job.start_minute != null ? fmt(job.start_minute) : '')
  const dur = job.estimated_duration ? durLabel(job.estimated_duration) : ''
  const borderColor = job.schedule_state === 'assigned' ? '#22A67A' : '#E8940D'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: '#FFFFFF', border: '1px solid #E4EAE8',
        borderLeft: `4px solid ${borderColor}`, borderRadius: 10, padding: '10px 12px',
        marginBottom: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#1F2D37', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.customer_name}
        </p>
        {summary && (
          <p style={{ fontSize: 14, color: '#4A5B68', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summary}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {startLabel && <p style={{ fontSize: 14, fontWeight: 500, color: '#22A67A', margin: 0 }}>{startLabel}</p>}
        {dur && <p style={{ fontSize: 14, color: '#8CA3A0', margin: '2px 0 0' }}>{dur}</p>}
      </div>
    </button>
  )
}

// ─── Leave home prompt ─────────────────────────────────────────────────────────

function LeaveHomePrompt({ time }) {
  if (!time) return null
  return (
    <div style={{ background: '#E6F7F0', border: '1px solid #C5E8D5', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#147A5A', margin: 0 }}>Leave home {time}</p>
    </div>
  )
}

// ─── Day view (today / tomorrow) ───────────────────────────────────────────────

function DayView({ jobs, date, weather, travelMap, settings, router }) {
  const cascade = recomputeDay(jobs, settings, travelMap)
  const dateStr = toDateStr(date)
  const isToday = dateStr === toDateStr(new Date())

  return (
    <div>
      <DayHeader
        date={date}
        jobCount={jobs.length}
        weatherEntry={weather}
      />

      {jobs.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 16, color: '#8CA3A0', margin: 0 }}>No jobs scheduled</p>
        </div>
      ) : (
        <div>
          <LeaveHomePrompt time={cascade.leaveHome} />
          {jobs.map((job, i) => {
            const leg = cascade.legs[i] || null
            const travelToNext = i < jobs.length - 1 ? getTravelBetween(jobs, i + 1, settings, travelMap) : null
            return (
              <div key={job.id}>
                <JobCard
                  job={job}
                  leg={leg}
                  travelToNext={travelToNext}
                  navApp={settings.preferred_nav_app || 'google_maps'}
                />
                {i < jobs.length - 1 && <TravelPill minutes={travelToNext} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Week view ─────────────────────────────────────────────────────────────────

function WeekView({ weekJobs, router }) {
  const monday = getMonday(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  return (
    <div>
      {days.map((date) => {
        const dateStr = toDateStr(date)
        const dayJobs = weekJobs
          .filter((j) => j.scheduled_date === dateStr)
          .sort((a, b) => (a.sequence_index ?? 999) - (b.sequence_index ?? 999))

        const dayLabel = date.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })

        return (
          <div key={dateStr} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#4A5B68', margin: '0 0 8px' }}>
              {dayLabel}
            </p>
            {dayJobs.length === 0 ? (
              <p style={{ fontSize: 14, color: '#8CA3A0', margin: 0, paddingLeft: 4 }}>No jobs scheduled</p>
            ) : (
              dayJobs.map((job) => (
                <CompactJobCard
                  key={job.id}
                  job={job}
                  leg={null}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Backlog section ───────────────────────────────────────────────────────────

function BacklogCard({ job, weekJobs, onSchedule }) {
  const summary = jobSummary(job)
  const area = getArea(job.customer_address)
  const days = daysAgo(job.accepted_at || job.created_at)
  const value = calcJobValue(job)

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E4EAE8', borderLeft: '4px solid #E8940D', borderRadius: 10, padding: 12, marginBottom: 8 }}>
      {/* Name + price */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: '#1F2D37', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.customer_name}
        </p>
        {value > 0 && (
          <span style={{ fontSize: 15, fontWeight: 500, color: '#22A67A', flexShrink: 0 }}>
            {fmtCurrency(value)}
          </span>
        )}
      </div>

      {/* Description */}
      {summary && (
        <p style={{ fontSize: 14, color: '#4A5B68', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {summary}
        </p>
      )}

      {/* Area */}
      {area && (
        <p style={{ fontSize: 14, color: '#8CA3A0', margin: '0 0 2px' }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#8CA3A0', marginRight: 6, verticalAlign: 'middle' }} />
          {area}
        </p>
      )}

      {/* Days ago + Schedule button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <p style={{ fontSize: 14, color: '#8CA3A0', margin: 0 }}>
          Accepted {days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'} ago`}
        </p>
        <button
          type="button"
          onClick={() => onSchedule(job)}
          style={{
            minHeight: 48, paddingLeft: 16, paddingRight: 16,
            background: '#22A67A', color: '#FFFFFF', borderRadius: 8,
            fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Schedule
        </button>
      </div>
    </div>
  )
}

// ─── Date picker modal ─────────────────────────────────────────────────────────

function DatePickerModal({ job, weekJobs, monthCounts, onConfirm, onCancel, loading }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [calDate, setCalDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedDate, setSelectedDate] = useState(null)

  const year = calDate.getFullYear()
  const month = calDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Mon = 0

  const totalCells = startDow + lastDay.getDate()
  const rows = Math.ceil(totalCells / 7)

  function prevMonth() {
    setCalDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setCalDate(new Date(year, month + 1, 1))
  }

  const monthLabel = calDate.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
  const summary = jobSummary(job)
  const area = getArea(job.customer_address)

  const selectedStr = selectedDate ? toDateStr(selectedDate) : null
  const jobsOnSelected = selectedStr
    ? weekJobs.filter((j) => j.scheduled_date === selectedStr).length
    : 0

  let selectedDayLabel = ''
  if (selectedDate) {
    const dayName = selectedDate.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
    selectedDayLabel = `${dayName} — ${jobsOnSelected === 0 ? 'no jobs yet' : `${jobsOnSelected} ${jobsOnSelected === 1 ? 'job' : 'jobs'}`}`
  }

  const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(31,45,55,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#FFFFFF', borderRadius: '16px 16px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <p style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37', margin: '0 0 2px' }}>
          Schedule {job.customer_name}
        </p>
        {(summary || area) && (
          <p style={{ fontSize: 14, color: '#4A5B68', margin: '0 0 20px' }}>
            {[summary, area].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{ minWidth: 48, minHeight: 48, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#4A5B68', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Previous month"
          >
            ‹
          </button>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1F2D37', margin: 0 }}>{monthLabel}</p>
          <button
            type="button"
            onClick={nextMonth}
            style={{ minWidth: 48, minHeight: 48, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#4A5B68', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* Day of week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DOW_LABELS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 14, color: '#8CA3A0', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: rows * 7 }, (_, cellIdx) => {
            const dayNum = cellIdx - startDow + 1
            if (dayNum < 1 || dayNum > lastDay.getDate()) {
              return <div key={cellIdx} />
            }
            const cellDate = new Date(year, month, dayNum)
            cellDate.setHours(0, 0, 0, 0)
            const isPast = cellDate < today
            const isToday = toDateStr(cellDate) === toDateStr(today)
            const isSelected = selectedStr === toDateStr(cellDate)
            const cellStr = toDateStr(cellDate)
            const hasJobs = (monthCounts[cellStr] || 0) > 0

            const bg = (isToday || isSelected) ? '#22A67A' : 'transparent'
            const textColor = (isToday || isSelected) ? '#FFFFFF' : isPast ? '#C5D0CC' : '#1F2D37'

            return (
              <button
                key={cellIdx}
                type="button"
                disabled={isPast}
                onClick={() => !isPast && setSelectedDate(cellDate)}
                style={{
                  minHeight: 40, borderRadius: 8, border: 'none', cursor: isPast ? 'default' : 'pointer',
                  background: bg, color: textColor, fontSize: 14, fontWeight: 500,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  opacity: isPast ? 0.4 : 1,
                }}
              >
                {dayNum}
                {hasJobs && !(isToday || isSelected) && (
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22A67A' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected day label */}
        {selectedDayLabel && (
          <p style={{ fontSize: 14, color: '#4A5B68', margin: '12px 0 0', textAlign: 'center' }}>
            {selectedDayLabel}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, minHeight: 48, border: '1px solid #E4EAE8', borderRadius: 10, background: '#FFFFFF', color: '#4A5B68', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedDate || loading}
            onClick={() => selectedDate && onConfirm(selectedDate)}
            style={{
              flex: 2, minHeight: 48, border: 'none', borderRadius: 10,
              background: selectedDate ? '#22A67A' : '#C5D0CC', color: '#FFFFFF',
              fontSize: 14, fontWeight: 500, cursor: selectedDate ? 'pointer' : 'default',
            }}
          >
            {loading ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const router = useRouter()
  const { settings } = useSettings()

  const [activeTab, setActiveTab] = useState('today')
  const [weekJobs, setWeekJobs] = useState([])
  const [backlog, setBacklog] = useState([])
  const [weather, setWeather] = useState({})
  const [travelMap, setTravelMap] = useState({})
  const [loading, setLoading] = useState(true)

  // Modal state
  const [schedulingJob, setSchedulingJob] = useState(null)
  const [monthCounts, setMonthCounts] = useState({})
  const [scheduling, setScheduling] = useState(false)

  // Date strings
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(todayDate)
  const tomorrowDate = addDays(todayDate, 1)
  const tomorrowStr = toDateStr(tomorrowDate)
  const monday = getMonday(todayDate)
  const weekStart = toDateStr(monday)
  const weekEnd = toDateStr(addDays(monday, 6))

  // Desktop redirect
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      router.push('/planner')
    }
  }, [router])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [wJobs, bJobs] = await Promise.all([
      getPlannerWeekJobs(weekStart, weekEnd),
      getPlannerBacklog(),
    ])
    setWeekJobs(wJobs)
    setBacklog(bJobs)
    setLoading(false)

    // Weather (only if home base set)
    if (settings.home_base_lat != null && settings.home_base_lng != null) {
      fetchWeather(settings.home_base_lat, settings.home_base_lng).then(setWeather)
    }

    // Travel times for today and tomorrow
    const todayJobs = wJobs.filter((j) => j.scheduled_date === todayStr).sort((a, b) => (a.sequence_index ?? 999) - (b.sequence_index ?? 999))
    const tomorrowJobs = wJobs.filter((j) => j.scheduled_date === tomorrowStr).sort((a, b) => (a.sequence_index ?? 999) - (b.sequence_index ?? 999))

    if (settings.home_base_lat != null) {
      const todayPairs = buildDayPairs(todayJobs, settings.home_base_lat, settings.home_base_lng)
      const tomorrowPairs = buildDayPairs(tomorrowJobs, settings.home_base_lat, settings.home_base_lng)
      const allPairs = [...todayPairs, ...tomorrowPairs]
      if (allPairs.length > 0) {
        fetchTravelTimes(allPairs).then(setTravelMap)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, weekEnd, todayStr, tomorrowStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open scheduling modal — also load month job counts
  async function handleOpenSchedule(job) {
    setSchedulingJob(job)
    const now = new Date()
    const mStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
    const mEnd = toDateStr(new Date(now.getFullYear(), now.getMonth() + 2, 0))
    const counts = await getPlannerMonthCounts(mStart, mEnd)
    setMonthCounts(counts)
  }

  async function handleConfirmSchedule(date) {
    if (!schedulingJob) return
    setScheduling(true)
    const dateStr = toDateStr(date)

    // Count existing jobs on that day for sequence_index
    const existingOnDay = weekJobs.filter((j) => j.scheduled_date === dateStr)
    const seqIdx = existingOnDay.length

    await dbAssignJob(schedulingJob.id, {
      scheduled_date: dateStr,
      slot: 'morning',
      estimated_duration: schedulingJob.estimated_duration || 1,
      sequence_index: seqIdx,
      start_minute: settings.day_start_minute ?? 480,
      start_overridden: false,
    })

    setScheduling(false)
    setSchedulingJob(null)

    // Refresh data
    loadData()
  }

  // Sort day jobs
  const todayJobs = weekJobs.filter((j) => j.scheduled_date === todayStr).sort((a, b) => (a.sequence_index ?? 999) - (b.sequence_index ?? 999))
  const tomorrowJobs = weekJobs.filter((j) => j.scheduled_date === tomorrowStr).sort((a, b) => (a.sequence_index ?? 999) - (b.sequence_index ?? 999))

  const todayWeather = weather[todayStr]
  const tomorrowWeather = weather[tomorrowStr]

  const TABS = [
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'week', label: 'This week' },
  ]

  return (
    <>
      <div style={{ minHeight: '100dvh', background: '#F6F8F7' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 88px' }}>

          {/* Page header */}
          <div style={{ paddingTop: 24, paddingBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1F2D37', margin: 0 }}>Schedule</h1>
          </div>

          {/* Day switcher */}
          <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #E4EAE8', borderRadius: 10, overflow: 'hidden', marginBottom: 16, height: 44 }}>
            {TABS.map((tab, i) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                    background: active ? '#22A67A' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#4A5B68',
                    borderRight: i < TABS.length - 1 ? '1px solid #E4EAE8' : 'none',
                    transition: 'background 150ms, color 150ms',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontSize: 16, color: '#8CA3A0' }}>Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'today' && (
                <>
                  <DayView
                    jobs={todayJobs}
                    date={todayDate}
                    weather={todayWeather}
                    travelMap={travelMap}
                    settings={settings}
                    router={router}
                  />
                  <BacklogSection
                    backlog={backlog}
                    weekJobs={weekJobs}
                    onSchedule={handleOpenSchedule}
                  />
                </>
              )}

              {activeTab === 'tomorrow' && (
                <>
                  <DayView
                    jobs={tomorrowJobs}
                    date={tomorrowDate}
                    weather={tomorrowWeather}
                    travelMap={travelMap}
                    settings={settings}
                    router={router}
                  />
                  <BacklogSection
                    backlog={backlog}
                    weekJobs={weekJobs}
                    onSchedule={handleOpenSchedule}
                  />
                </>
              )}

              {activeTab === 'week' && (
                <WeekView weekJobs={weekJobs} router={router} />
              )}
            </>
          )}

        </div>
      </div>

      {/* Date picker modal */}
      {schedulingJob && (
        <DatePickerModal
          job={schedulingJob}
          weekJobs={weekJobs}
          monthCounts={monthCounts}
          onConfirm={handleConfirmSchedule}
          onCancel={() => setSchedulingJob(null)}
          loading={scheduling}
        />
      )}
    </>
  )
}

// ─── Backlog section (defined after DatePickerModal for clarity) ───────────────

function BacklogSection({ backlog, weekJobs, onSchedule }) {
  if (backlog.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#1F2D37' }}>To schedule</span>
        <span style={{ fontSize: 14, color: '#8CA3A0' }}>{backlog.length} {backlog.length === 1 ? 'job' : 'jobs'}</span>
      </div>
      {backlog.map((job) => (
        <BacklogCard
          key={job.id}
          job={job}
          weekJobs={weekJobs}
          onSchedule={onSchedule}
        />
      ))}
    </div>
  )
}
