import db from '../../db';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const days = parseInt(req.query.days || '30', 10);
  const stats = db.getUsageStats(Math.min(Math.max(days, 7), 365));
  res.status(200).json(stats);
}
