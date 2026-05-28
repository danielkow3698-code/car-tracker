import { addSchedule, deleteSchedule, getSchedules, getMonthSchedules } from '../../db'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, userId, date, startTime, endTime, purpose, id } = req.body

    if (action === 'add') {
      if (!userId || !date || !startTime || !endTime) {
        return res.status(400).json({ error: '缺少必要參數' })
      }
      const result = await addSchedule(userId, date, startTime, endTime, purpose || '')
      return res.json(result)
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: '缺少 id' })
      await deleteSchedule(id)
      return res.json({ success: true })
    }
  }

  if (req.method === 'GET') {
    const { date, month, year, userId, startTime, endTime, purpose, id } = req.query
    if (date) {
      const schedules = await getSchedules(date)
      return res.json({ schedules })
    }
    if (year && month) {
      const schedules = await getMonthSchedules(parseInt(year), parseInt(month))
      return res.json({ schedules })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
