import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'

export default function CalendarPage({ user, onLogout }) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ startTime: '', endTime: '', purpose: '' })
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    if (!user) { router.push('/') }
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchSchedules()
  }, [year, month])

  useEffect(() => {
    if (selectedDate && user) {
      fetchDaySchedules(selectedDate)
    }
  }, [selectedDate, year, month])

  async function fetchSchedules() {
    try {
      const res = await fetch(`/api/schedule?year=${year}&month=${month}`)
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch (e) { console.error(e) }
  }

  async function fetchDaySchedules(date) {
    try {
      const res = await fetch(`/api/schedule?date=${date}`)
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch (e) { console.error(e) }
  }

  const showToast = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [])

  const handleAdd = async () => {
    if (!formData.startTime || !formData.endTime) return
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          userId: user.id,
          date: selectedDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          purpose: formData.purpose,
        }),
      })
      const data = await res.json()
      if (data.error) {
        showToast(`❌ ${data.error}`)
      } else {
        showToast('✅ 已新增預約')
        setShowForm(false)
        setFormData({ startTime: '', endTime: '', purpose: '' })
        fetchDaySchedules(selectedDate)
      }
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id) => {
    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
      showToast('🗑️ 已刪除預約')
      fetchDaySchedules(selectedDate)
    } catch (e) { console.error(e) }
  }

  if (!user) return null

  // Calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const daySchedules = schedules.filter(s => s.date === selectedDate)

  return (
    <div className="min-h-screen bg-mesh-light">
      <Head><title>行事曆 - 家庭用車管理</title></Head>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-nav shadow-sm px-5 py-3 flex items-center justify-between sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🚗</span>
          <span className="font-bold text-gray-700">用車行事曆</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-blue-500 hover:text-blue-700 text-sm font-medium">🏠 狀態</Link>
          <Link href="/stats" className="text-blue-500 hover:text-blue-700 text-sm font-medium">📊 統計</Link>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm font-medium text-gray-600">{user.display_name}</span>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onLogout} className="text-xs text-red-400 hover:text-red-600">登出</motion.button>
        </div>
      </motion.nav>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.8 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 glass-strong px-6 py-3 rounded-2xl shadow-2xl"
          >
            <span className="text-gray-800 font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 mt-6 relative z-10">
        {/* Month Navigator */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-4"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentDate(new Date(year, month - 2)); setSelectedDate(null) }}
            className="text-2xl text-gray-400 hover:text-blue-500 transition-colors"
          >‹</motion.button>
          <h2 className="text-xl font-bold text-gray-700">{year} 年 {month} 月</h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentDate(new Date(year, month)); setSelectedDate(null) }}
            className="text-2xl text-gray-400 hover:text-blue-500 transition-colors"
          >›</motion.button>
        </motion.div>

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-5 shadow-xl"
        >
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const hasEvent = schedules.some(s => s.date === dateStr)
              const isToday = dateStr === todayStr

              // Count events per user
              const myEvents = schedules.filter(s => s.date === dateStr && s.user_id === user.id)
              const otherEvents = schedules.filter(s => s.date === dateStr && s.user_id !== user.id)

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedDate(dateStr)
                    fetchDaySchedules(dateStr)
                  }}
                  className={`relative p-1.5 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
                    selectedDate === dateStr
                      ? 'bg-blue-500 text-white shadow-lg'
                      : isToday
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : hasEvent
                          ? 'bg-amber-50 text-gray-700'
                          : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{day}</span>
                  {myEvents.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full" />
                  )}
                  {otherEvents.length > 0 && myEvents.length === 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Selected Day */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4"
            >
              <motion.div className="glass-strong rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-700">
                    📅 {selectedDate}
                    {selectedDate === todayStr && <span className="ml-2 text-xs bg-blue-100 text-blue-500 px-2 py-0.5 rounded-full">今天</span>}
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowForm(true)}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded-xl text-sm font-medium shadow"
                  >＋ 新增</motion.button>
                </div>

                {daySchedules.length === 0 && !showForm && (
                  <p className="text-gray-400 text-sm text-center py-4">這天沒有預約</p>
                )}

                <AnimatePresence>
                  <div className="space-y-2 mb-3">
                    {daySchedules.map(s => {
                      const isMine = s.user_id === user.id
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
                                🕐 {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
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
                      )
                    })}
                  </div>
                </AnimatePresence>

                {/* Add Form */}
                <AnimatePresence>
                  {showForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData(f => ({ ...f, startTime: e.target.value }))}
                            className="flex-1 p-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="開始"
                          />
                          <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData(f => ({ ...f, endTime: e.target.value }))}
                            className="flex-1 p-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="結束"
                          />
                        </div>
                        <input
                          type="text"
                          value={formData.purpose}
                          onChange={(e) => setFormData(f => ({ ...f, purpose: e.target.value }))}
                          placeholder="用途 (選填)"
                          className="w-full p-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength={50}
                        />
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAdd}
                            disabled={!formData.startTime || !formData.endTime}
                            className="flex-1 bg-blue-500 text-white p-2.5 rounded-xl text-sm font-medium disabled:opacity-40 shadow"
                          >儲存</motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowForm(false)}
                            className="flex-1 bg-gray-100 text-gray-600 p-2.5 rounded-xl text-sm"
                          >取消</motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
