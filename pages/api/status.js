import db from '../../db';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const status = db.getCarStatus();
  if (!status) {
    return res.status(200).json({ status: 'available', note: '車輛可用' });
  }

  res.status(200).json(status);
}
