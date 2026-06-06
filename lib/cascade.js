// cascade.js
// The single source of truth for a planned day. Given an ordered list of jobs
// and the operator's settings, it computes each job's start and end, the time
// to leave home, the total drive, and whether the day runs long.
//
// Pure and side-effect free so it can run on the server, in the planner UI for
// live preview, and in unit tests. Recompute whenever a day's jobs, order,
// durations, or travel estimates change.
//
// All times are minutes from midnight internally. Use fmt() for display.

function fmt(minute) {
  if (minute == null) return "";
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h24 < 12 ? "am" : "pm";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

// jobs: [{ id, durationMin, travelMinFromPrev, bufferMin, startOverrideMin }]
//   travelMinFromPrev: drive from the previous stop. For the first job this is
//   the drive from home. null/undefined means "unknown" (API miss) and is
//   treated as 0 so a drop never blocks on a failed estimate.
// settings: { dayStartMin, dayEndTargetMin, defaultBufferMin, returnHomeMin }
function computeDay(jobs, settings) {
  const s = {
    dayStartMin: 480,
    dayEndTargetMin: null,
    defaultBufferMin: 10,
    returnHomeMin: null,
    ...settings,
  };

  const legs = [];
  let totalDrive = 0;
  let cursorEnd = null; // end of the previous job
  let leaveHome = null;

  jobs.forEach((job, i) => {
    const travel = job.travelMinFromPrev ?? 0;
    const buffer = i === 0 ? 0 : (job.bufferMin ?? s.defaultBufferMin);
    totalDrive += travel;

    let start;
    if (job.startOverrideMin != null) {
      start = job.startOverrideMin;
    } else if (i === 0) {
      start = s.dayStartMin;
    } else {
      start = cursorEnd + travel + buffer;
    }

    if (i === 0) leaveHome = start - travel;

    const end = start + job.durationMin;
    cursorEnd = end;

    legs.push({
      id: job.id,
      startMin: start,
      endMin: end,
      start: fmt(start),
      end: fmt(end),
      travelMin: travel,
      bufferMin: buffer,
    });
  });

  if (s.returnHomeMin != null) totalDrive += s.returnHomeMin;

  const finishMin = cursorEnd;
  const longDay =
    s.dayEndTargetMin != null && finishMin != null && finishMin > s.dayEndTargetMin;

  return {
    legs,
    leaveHomeMin: leaveHome,
    leaveHome: fmt(leaveHome),
    finishMin,
    finish: fmt(finishMin),
    totalDriveMin: totalDrive,
    longDay,
  };
}

export { computeDay, fmt };
