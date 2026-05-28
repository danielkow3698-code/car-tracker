const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');

// Force next to use the correct directory
process.chdir(__dirname);

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

const db = require('./db');

// ── 排程監控器 ──
function startScheduleWatcher(io) {
  let lastMidnightReset = null;
  let lastTickLog = '';

  setInterval(() => {
    try {
      const now = new Date();
      const currentStatus = db.getCarStatus();

      // 1️⃣ 午夜自動歸還（00:00 - 00:01）
      if (now.getHours() === 0 && now.getMinutes() < 1) {
        const today = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
        if (lastMidnightReset !== today) {
          lastMidnightReset = today;
          if (currentStatus && currentStatus.status === 'in_use') {
            console.log(`[排程] 午夜自動歸還 — ${currentStatus.user_display_name} 忘記歸還`);
            const status = db.returnCar('⏰ 每日自動歸還', 'schedule');
            io.emit('car_status', status);
          }
        }
        return; // 午夜檢查優先，不繼續排程邏輯
      }

      // 2️⃣ 排程自動取車/歸還
      const activeSchedule = db.getActiveSchedule();

      if (activeSchedule && currentStatus.status === 'available') {
        // 排程開始 → 自動取車
        const note = `📅 ${activeSchedule.purpose || '排程用車'} (${activeSchedule.start_time}-${activeSchedule.end_time})`;
        console.log(`[排程] ${activeSchedule.user_display_name} 自動取車`);
        const status = db.takeCar(activeSchedule.user_id, note, 'schedule');
        io.emit('car_status', status);
      } else if (!activeSchedule && currentStatus && currentStatus.status === 'in_use' && currentStatus.source === 'schedule') {
        // 排程結束且車輛是排程自動取的 → 自動歸還
        console.log(`[排程] 排程結束，自動歸還`);
        const status = db.returnCar('📅 排程結束', 'schedule');
        io.emit('car_status', status);
      }
    } catch (err) {
      console.error('[排程] 錯誤:', err.message);
    }
  }, 30000); // 每 30 秒檢查一次

  console.log('  ⏰ 排程監控器已啟動 (每30秒檢查)');
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Send initial state
    socket.emit('car_status', db.getCarStatus());

    // Car status: client requesting current state
    socket.on('car:get', () => {
      socket.emit('car_status', db.getCarStatus());
    });

    // Manual car take
    socket.on('car:take', ({ userId, note }) => {
      const status = db.takeCar(userId, note, 'manual');
      io.emit('car_status', status);
    });

    // Manual car return
    socket.on('car:return', ({ note }) => {
      const status = db.returnCar(note, 'manual');
      io.emit('car_status', status);
    });

    // Schedules
    socket.on('schedule:list', ({ date }) => {
      const schedules = db.getSchedules(date);
      socket.emit('schedule:list_result', { date, schedules });
    });

    socket.on('schedule:month', ({ year, month }) => {
      const schedules = db.getMonthSchedules(year, month);
      socket.emit('schedule:month_result', { year, month, schedules });
    });

    socket.on('schedule:add', ({ userId, date, startTime, endTime, purpose }) => {
      const result = db.addSchedule(userId, date, startTime, endTime, purpose);
      if (result.error) {
        socket.emit('schedule:error', { error: result.error });
      } else {
        io.emit('schedule:added', result);
      }
    });

    socket.on('schedule:delete', ({ id }) => {
      db.deleteSchedule(id);
      io.emit('schedule:deleted', { id });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`\n  🚗 家庭用車管理工具已啟動！
  ────────────────────────────
  🌐 區域網路: http://localhost:${port}
  📱 區域網路 IP: http://0.0.0.0:${port} (同一區網的裝置可用你的 IP 連線)
  ────────────────────────────`);
  });

  // 啟動排程監控器
  startScheduleWatcher(io);
});
