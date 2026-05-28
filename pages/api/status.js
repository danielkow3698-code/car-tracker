import { getCarStatus, takeCar, returnCar } from '../../db'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const status = await getCarStatus()
    return res.status(200).json(status)
  }

  if (req.method === 'POST') {
    const { action, userId, note } = req.body
    if (action === 'take') {
      const result = await takeCar(userId, note || '', 'manual')
      return res.json(result)
    }
    if (action === 'return') {
      const result = await returnCar(note || '', 'manual')
      return res.json(result)
    }
    return res.status(400).json({ error: '未知操作' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
