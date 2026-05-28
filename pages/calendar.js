import { useState, useEffect } from 'react'
import { useSocket } from './_app'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'

const MONTHS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const DAYS = ['日','一','二','三','四','五','六'];

function formatDate(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

export default function CalendarPage({ user, onLogout }) {
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [today] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  });
  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);
  const [selectedDate, setSelectedDate] = useState(formatDate(today.year, today.month, today.day));
  const [schedules, setSchedules] = useState({});
  const [selectedDaySchedules, setSelectedDaySchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formPurpose, setFormPurpose] = useState('');
  const [slideDir, setSlideDir] = useState(0);

  useEffect(() => { if (!user) router.push('/'); }, [user]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleMonthResult = ({ year, month, schedules: scheds }) => {
      if (year === viewYear && month === viewMonth) {
        const grouped = {};
        scheds.forEach(s => {
          const d = s.date;
          if (!grouped[d]) grouped[d] = [];
          grouped[d].push(s);
        });
        setSchedules(prev => ({ ...prev, ...grouped }));
      }
    };

    const handleAdded = (sched) => {
      const d = sched.date;
      setSchedules(prev => {
        const existing = [...(prev[d] || []), sched].sort((a, b) => a.start_time.localeCompare(b.start_time));
        return { ...prev, [d]: existing };
      });
    };

    const handleDeleted = ({ id }) => {
      setSchedules(prev => {
        const next = {};
        for (const [date, scheds] of Object.entries(prev)) {
          next[date] = scheds.filter(s => s.id !== id);
        }
        return next;
      });
    };

    socket.on('schedule:month_result', handleMonthResult);
    socket.on('schedule:added', handleAdded);
    socket.on('schedule:deleted', handleDeleted);
    socket.on('schedule:error', ({ error }) => alert(error));

    socket.emit('schedule:month', { year: viewYear, month: viewMonth });

    return () => {
      socket.off('schedule:month_result', handleMonthResult);
      socket.off('schedule:added', handleAdded);
      socket.off('schedule:deleted', handleDeleted);
      socket.off('schedule:error');
    };
  }, [connected, viewYear, viewMonth]);

  useEffect(() => { setSelectedDaySchedules(schedules[selectedDate] || []); }, [schedules, selectedDate]);

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

  const calendarDays = [];
  for (let i = firstDay - 1; i >= 0; i--) calendarDays.push({ day: daysInPrevMonth - i, otherMonth: true });
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ day: i, otherMonth: false });
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) for (let i = 1; i <= remaining; i++) calendarDays.push({ day: i, otherMonth: true });

  const handlePrevMonth = () => {
    setSlideDir(-1);
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else { setViewMonth(viewMonth - 1); }
  };

  const handleNextMonth = () => {
    setSlideDir(1);
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else { setViewMonth(viewMonth + 1); }
  };

  const handleAddSchedule = (e) => {
    e.preventDefault();
    if (!socket || !user) return;
    socket.emit('schedule:add', { userId: user.id, date: selectedDate, startTime: formStart, endTime: formEnd, purpose: formPurpose });
    setShowForm(false);
    setFormPurpose('');
  };

  const handleDelete = (id) => {
    if (!socket) return;
    if (confirm('確定刪除此預約？')) socket.emit('schedule:delete', { id });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-mesh-light pb-20">
      <Head><title>行事曆 - 家庭用車管理</title></Head>

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="glass-nav shadow-sm px-5 py-3 flex items-center justify-between sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl"
          >🚗</motion.span>
          <span className="font-bold text-gray-700">行事曆</span>
          <motion.span
            animate={{ opacity: connected ? 1 : 0.4, scale: connected ? 1 : 0.8 }}
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
          />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors">
            🏠 狀態
          </Link>
          <Link href="/stats" className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors">
            📊 統計
          </Link>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm font-medium text-gray-600">{user.display_name}</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="text-xs text-red-400 hover:text-red-600"
          >登出</motion.button>
        </div>
      </motion.nav>

      <div className="max-w-2xl mx-auto px-4 mt-6 relative z-10">
        {/* Calendar Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <div className="glass-strong rounded-3xl shadow-xl p-6">
            {/* Month Header */}
            <div className="flex items-center justify-between mb-5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevMonth}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">←</span>
              </motion.button>
              <motion.h2
                key={`${viewYear}-${viewMonth}`}
                initial={{ opacity: 0, y: slideDir * 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-bold text-gray-800"
              >
                {viewYear} 年 {MONTHS[viewMonth - 1]}
              </motion.h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNextMonth}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">→</span>
              </motion.button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d, i) => (
                <div key={d} className={`text-center text-sm font-medium py-1 ${i === 0 || i === 6 ? 'text-red-300' : 'text-gray-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ day, otherMonth }, i) => {
                const dKey = otherMonth ? null : formatDate(viewYear, viewMonth, day);
                const hasEvents = dKey && (schedules[dKey]?.length > 0);
                const isSelected = dKey === selectedDate;
                const isTodayDate = dKey === formatDate(today.year, today.month, today.day);

                return (
                  <motion.button
                    key={i}
                    whileHover={dKey ? { scale: 1.1 } : {}}
                    whileTap={dKey ? { scale: 0.95 } : {}}
                    onClick={() => dKey && setSelectedDate(dKey)}
                    disabled={!dKey}
                    className={`
                      relative p-2 text-sm rounded-xl transition-all cal-day
                      ${otherMonth ? 'text-gray-200 cursor-default' : ''}
                      ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 font-bold' : ''}
                      ${isTodayDate && !isSelected ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
                      ${!isSelected && !otherMonth ? 'hover:bg-blue-50 text-gray-700' : ''}
                    `}
                  >
                    <span>{day}</span>
                    {hasEvents && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {[...new Set(schedules[dKey].map(s => s.user_display_name))].map(name => (
                          <span key={name} className={`w-1.5 h-1.5 rounded-full ${name === 'Daniel' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                        ))}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Selected Day */}
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl shadow-xl p-6 mt-4"
        >
          <div className="flex items-center justify-between mb-4">
            <motion.h3
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="font-bold text-lg text-gray-800"
            >
              📅 {selectedDate}
            </motion.h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-200 transition-all"
            >
              {showForm ? '✕ 取消' : '+ 新增預約'}
            </motion.button>
          </div>

          {/* New Schedule Form */}
          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddSchedule}
                className="bg-gray-50/80 rounded-2xl p-5 mb-4 space-y-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">開始</label>
                    <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">結束</label>
                    <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" required />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">用途</label>
                  <input type="text" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)}
                    placeholder="去超市買菜..."
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" maxLength={50} />
                </div>
                <div className="flex gap-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all"
                  >
                    ✅ 確認預約
                  </motion.button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="text-gray-500 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                    取消
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Schedule List */}
          {selectedDaySchedules.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 text-gray-400"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-5xl mb-3"
              >📋</motion.div>
              <p className="font-medium">這天還沒有預約</p>
              <p className="text-sm mt-1">點擊「新增預約」來規劃用車時間</p>
            </motion.div>
          ) : (
            <div className="space-y-3 schedule-scroll max-h-96 overflow-y-auto pr-1">
              <AnimatePresence>
                {selectedDaySchedules.map((s) => {
                  const isMine = s.user_id === user.id;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.95 }}
                      layout
                      className={`rounded-2xl p-4 flex items-center justify-between ${
                        isMine
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                          : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="text-2xl"
                        >{isMine ? '👦' : '👨'}</motion.span>
                        <div>
                          <div className="font-bold text-gray-800">{s.user_display_name}</div>
                          <div className="text-sm text-gray-500">
                            🕐 {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                          </div>
                          {s.purpose && (
                            <div className="text-sm text-gray-600 mt-0.5">📌 {s.purpose}</div>
                          )}
                        </div>
                      </div>
                      {isMine && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(s.id)}
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors"
                          title="刪除"
                        >✕</motion.button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
