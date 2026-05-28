import { supabase } from '../lib/supabase'

// ── Users ──
export async function getUser(name) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('name', name)
    .single()
  return data
}

export async function verifyPin(name, pin) {
  const user = await getUser(name)
  return user && user.pin === pin
}

// ── Car Status ──
export async function getCarStatus() {
  const { data } = await supabase
    .from('car_status')
    .select('*, users!car_status_user_id_fkey(display_name)')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return { status: 'available', note: '車輛可用' }
  }

  return {
    id: data.id,
    status: data.status,
    user_id: data.user_id,
    user_display_name: data.users?.display_name || null,
    started_at: data.started_at,
    note: data.note,
    source: data.source,
  }
}

export async function takeCar(userId, note = '', source = 'manual') {
  const { data: existing } = await supabase
    .from('car_status')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('car_status')
      .update({
        status: 'in_use',
        user_id: userId,
        started_at: new Date().toISOString(),
        note,
        source,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('car_status').insert({
      status: 'in_use',
      user_id: userId,
      started_at: new Date().toISOString(),
      note,
      source,
    })
  }

  // 紀錄用車開始
  await supabase.from('usage_log').insert({
    user_id: userId,
    started_at: new Date().toISOString(),
    note,
    source,
  })

  return getCarStatus()
}

export async function returnCar(note = '', source = 'manual') {
  const { data: existing } = await supabase
    .from('car_status')
    .select('id, note')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('car_status')
      .update({
        status: 'available',
        user_id: null,
        started_at: null,
        note,
        source,
      })
      .eq('id', existing.id)
  }

  // 結束用車紀錄 — fetch the pending log and update it
  const { data: pending } = await supabase
    .from('usage_log')
    .select('id, note')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pending) {
    await supabase
      .from('usage_log')
      .update({
        ended_at: new Date().toISOString(),
        note: `${pending.note || ''} → ${note}`,
      })
      .eq('id', pending.id)
  }

  return getCarStatus()
}

// ── Usage Stats ──
export async function getUsageStats(days = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  // 每人使用統計
  const { data: logs } = await supabase
    .from('usage_log')
    .select('user_id, started_at, ended_at, users!usage_log_user_id_fkey(display_name)')
    .gte('started_at', cutoffStr)

  const userMap = {}
  for (const log of logs || []) {
    const displayName = log.users?.display_name || 'Unknown'
    if (!userMap[displayName]) userMap[displayName] = { display_name: displayName, trip_count: 0, total_minutes: 0 }
    userMap[displayName].trip_count++
    const start = new Date(log.started_at)
    const end = log.ended_at ? new Date(log.ended_at) : new Date()
    const minutes = Math.round((end - start) / 60000)
    userMap[displayName].total_minutes += minutes
  }
  const perUser = Object.values(userMap).sort((a, b) => b.total_minutes - a.total_minutes)

  // 每日使用次數
  const dailyMap = {}
  for (const log of logs || []) {
    const day = log.started_at.slice(0, 10)
    dailyMap[day] = (dailyMap[day] || 0) + 1
  }
  const daily = Object.entries(dailyMap)
    .map(([day, trip_count]) => ({ day, trip_count }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // 本週 vs 上週
  const now = new Date()
  const dayOfWeek = now.getDay()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  thisWeekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const thisWeekEnd = new Date(thisWeekStart)
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7)

  function calcStats(logArray) {
    let trips = 0
    let minutes = 0
    for (const log of logArray || []) {
      trips++
      const start = new Date(log.started_at)
      const end = log.ended_at ? new Date(log.ended_at) : new Date()
      minutes += Math.round((end - start) / 60000)
    }
    return { trips, minutes }
  }

  const thisWeekLogs = (logs || []).filter(l => {
    const d = new Date(l.started_at)
    return d >= thisWeekStart && d < thisWeekEnd
  })
  const lastWeekLogs = (logs || []).filter(l => {
    const d = new Date(l.started_at)
    return d >= lastWeekStart && d < thisWeekStart
  })

  return {
    perUser,
    daily,
    thisWeek: calcStats(thisWeekLogs),
    lastWeek: calcStats(lastWeekLogs),
    range: `${days}天`,
  }
}

// ── Schedules ──
export async function getSchedules(date) {
  const { data } = await supabase
    .from('schedules')
    .select('*, users!schedules_user_id_fkey(display_name)')
    .eq('date', date)
    .order('start_time')

  return (data || []).map(s => ({
    ...s,
    user_display_name: s.users?.display_name,
  }))
}

export async function getMonthSchedules(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('schedules')
    .select('*, users!schedules_user_id_fkey(display_name)')
    .gte('date', start)
    .lte('date', end)
    .order('date')
    .order('start_time')

  return (data || []).map(s => ({
    ...s,
    user_display_name: s.users?.display_name,
  }))
}

export async function getActiveSchedule() {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const { data } = await supabase
    .from('schedules')
    .select('*, users!schedules_user_id_fkey(display_name)')
    .eq('date', today)
    .lte('start_time', currentTime)
    .gt('end_time', currentTime)
    .limit(1)
    .maybeSingle()

  if (data) {
    return { ...data, user_display_name: data.users?.display_name }
  }
  return null
}

export async function addSchedule(userId, date, startTime, endTime, purpose = '') {
  // 檢查重疊
  const { data: overlaps } = await supabase
    .from('schedules')
    .select('id')
    .eq('date', date)
    .eq('user_id', userId)
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1)

  if (overlaps && overlaps.length > 0) {
    return { error: '該時段已有您的預約，請選擇其他時間' }
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert({ user_id: userId, date, start_time: startTime, end_time: endTime, purpose })
    .select('*, users!schedules_user_id_fkey(display_name)')
    .single()

  if (error) return { error: error.message }
  return { ...data, user_display_name: data.users?.display_name }
}

export async function deleteSchedule(id) {
  await supabase.from('schedules').delete().eq('id', id)
}
