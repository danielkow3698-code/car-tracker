import db from '../../db';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ success: false, error: '缺少參數' });
  }

  const user = db.getUser(name);
  if (!user) {
    return res.status(401).json({ success: false, error: '使用者不存在' });
  }

  if (user.pin !== pin) {
    return res.status(401).json({ success: false, error: 'PIN 錯誤' });
  }

  res.json({
    success: true,
    user: { id: user.id, name: user.name, display_name: user.display_name },
  });
}
