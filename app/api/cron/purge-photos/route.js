import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const RETENTION_DAYS = 90

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function extractStoragePath(url, jobId) {
  if (!url || !jobId) return null
  const marker = '/job-photos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length)
  if (!path.startsWith(jobId + '/')) return null
  return path
}

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, after_photos, job_items(id, photos)')
    .eq('photos_purged', false)
    .not('completed_at', 'is', null)
    .lt('completed_at', cutoff.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let purgedJobs = 0
  let deletedFiles = 0

  for (const job of jobs || []) {
    const paths = []

    for (const item of job.job_items || []) {
      for (const photo of item.photos || []) {
        const p = extractStoragePath(photo.url, job.id)
        if (p) paths.push(p)
      }
    }

    for (const photo of job.after_photos || []) {
      const p = extractStoragePath(photo.url, job.id)
      if (p) paths.push(p)
    }

    if (paths.length > 0) {
      const { error: delError } = await supabase.storage.from('job-photos').remove(paths)
      if (delError) {
        console.error(`purge-photos: failed for job ${job.id}:`, delError.message)
        continue
      }
      deletedFiles += paths.length
    }

    await supabase.from('jobs').update({ photos_purged: true }).eq('id', job.id)
    purgedJobs++
  }

  return NextResponse.json({ purgedJobs, deletedFiles })
}
