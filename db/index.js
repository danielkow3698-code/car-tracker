const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd();
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'data', 'car-tracker.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
      const insertUser = db.prepare('INSERT INTO users (name, display_name, pin) VALUES (?, ?, ?)');
      insertUser.run('daniel', 'Daniel', '1234');
      insertUser.run('dad', '爸爸', '5678');
      db.prepare('INSERT INTO car_status (status, note, source) VALUES (?, ?, ?)').run('available', '車輛可用', 'manual');
    }
  }
  return db;
}

// ── Users ──
function getUser(name) {
  return getDb().prepare('SELECT * FROM users WHERE name = ?').get(name);
}

function verifyPin(name, pin) {
  const user = getUser(name);
  return user && user.pin === pin;
}

// ── Car Status ──
function getCarStatus() {
  return getDb().prepare(`
    SELECT cs.*, u.display_name as user_display_name
    FROM car_status cs
    LEFT JOIN users u ON cs.user_id = u.id
    ORDER BY cs.id DESC LIMIT 1
  `).get();
}

function takeCar(userId, note = '', source = 'manual') {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM car_status ORDER BY id DESC LIMIT 1').get();
  if (existing) {
    db.prepare("UPDATE car_status SET status = ?, user_id = ?, started_at = datetime('now', 'localtime'), note = ?, source = ? WHERE id = ?")
      .run('in_use', userId, note, source, existing.id);
  } else {
    db.prepare("INSERT INTO car_status (status, user_id, started_at, note, source) VALUES (?, ?, datetime('now', 'localtime'), ?, ?)")
      .run('in_use', userId, note, source);
  }
  // 記錄用車開始
  startUsageLog(userId, note, source);
  return getCarStatus();
}

function returnCar(note = '', source = 'manual') {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM car_status ORDER BY id DESC LIMIT 1').get();
  if (existing) {
    db.prepare('UPDATE car_status SET status = ?, user_id = NULL, started_at = NULL, note = ?, source = ? WHERE id = ?')
      .run('available', note, source, existing.id);
  }
  // 記錄用車結束
  endUsageLog(note);
  return getCarStatus();
}

// ── Usage Log ──
function startUsageLog(userId, note, source) {
  getDb().prepare(`INSERT INTO usage_log (user_id, started_at, note, source) VALUES (?, datetime('now', 'localtime'), ?, ?)`
  ).run(userId, note, source);
}

function endUsageLog(note) {
  const pending = getDb().prepare(
    'SELECT id FROM usage_log WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1'
  ).get();
  if (pending) {
    getDb().prepare(`UPDATE usage_log SET ended_at = datetime('now', 'localtime'), note = note || ' → ' || ? WHERE id = ?`
    ).run(note, pending.id);
  }
}

function getUsageStats(days = 30) {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 19).replace('T', ' ');

  // 每人使用次數 & 總時長
  const perUser = db.prepare(`
    SELECT u.display_name,
           COUNT(ul.id) as trip_count,
           COALESCE(SUM(
             CAST(
               (julianday(COALESCE(ul.ended_at, datetime('now', 'localtime'))) - julianday(ul.started_at)) * 24 * 60
             AS INTEGER)
           ), 0) as total_minutes
    FROM usage_log ul
    JOIN users u ON ul.user_id = u.id
    WHERE ul.started_at >= ?
    GROUP BY ul.user_id
    ORDER BY total_minutes DESC
  `).all(cutoffStr);

  // 每日使用次數
  const daily = db.prepare(`
    SELECT date(ul.started_at) as day,
           COUNT(*) as trip_count
    FROM usage_log ul
    WHERE ul.started_at >= ?
    GROUP BY date(ul.started_at)
    ORDER BY day
  `).all(cutoffStr);

  // 本週 vs 上週
  const thisWeek = db.prepare(`
    SELECT COUNT(*) as trips, COALESCE(SUM(
      CAST((julianday(COALESCE(ended_at, datetime('now', 'localtime'))) - julianday(started_at)) * 24 * 60 AS INTEGER)
    ), 0) as minutes
    FROM usage_log
    WHERE started_at >= date('now', 'weekday 1', '-7 days')
  `).get();

  const lastWeek = db.prepare(`
    SELECT COUNT(*) as trips, COALESCE(SUM(
      CAST((julianday(COALESCE(ended_at, datetime('now', 'localtime'))) - julianday(started_at)) * 24 * 60 AS INTEGER)
    ), 0) as minutes
    FROM usage_log
    WHERE started_at >= date('now', 'weekday 1', '-14 days')
      AND started_at < date('now', 'weekday 1', '-7 days')
  `).get();

  return { perUser, daily, thisWeek, lastWeek, range: `${days}天` };
}

// ── Schedules ──
function getSchedules(date) {
  return getDb().prepare(`
    SELECT s.*, u.display_name as user_display_name
    FROM schedules s
    JOIN users u ON s.user_id = u.id
    WHERE s.date = ?
    ORDER BY s.start_time
  `).all(date);
}

function getMonthSchedules(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return getDb().prepare(`
    SELECT s.*, u.display_name as user_display_name
    FROM schedules s
    JOIN users u ON s.user_id = u.id
    WHERE s.date >= ? AND s.date <= ?
    ORDER BY s.date, s.start_time
  `).all(start, end);
}

function getActiveSchedule() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  return getDb().prepare(`
    SELECT s.*, u.display_name as user_display_name
    FROM schedules s
    JOIN users u ON s.user_id = u.id
    WHERE s.date = ? AND s.start_time <= ? AND s.end_time > ?
    LIMIT 1
  `).get(today, currentTime, currentTime);
}

function addSchedule(userId, date, startTime, endTime, purpose = '') {
  const db = getDb();
  const sameUserOverlaps = db.prepare(`
    SELECT COUNT(*) as count FROM schedules
    WHERE date = ? AND user_id = ?
    AND NOT (end_time <= ? OR start_time >= ?)
  `).get(date, userId, startTime, endTime);
  if (sameUserOverlaps.count > 0) {
    return { error: '該時段已有您的預約，請選擇其他時間' };
  }
  const result = db.prepare(
    'INSERT INTO schedules (user_id, date, start_time, end_time, purpose) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, date, startTime, endTime, purpose);
  return getDb().prepare(`
    SELECT s.*, u.display_name as user_display_name
    FROM schedules s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);
}

function deleteSchedule(id) {
  getDb().prepare('DELETE FROM schedules WHERE id = ?').run(id);
}

module.exports = {
  getUser,
  verifyPin,
  getCarStatus,
  takeCar,
  returnCar,
  getSchedules,
  getMonthSchedules,
  getActiveSchedule,
  addSchedule,
  deleteSchedule,
  getUsageStats,
};
