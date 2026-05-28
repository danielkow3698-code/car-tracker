import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'

const POLL_INTERVAL = 3000 // 每 3 秒輪詢

export default function Dashboard({ user, onLogout }) {
  const router = useRouter()
  const [carStatus, setCarStatus] = useState(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    if (!user) { router.push('/') }
  }, [user])

  // 輪詢車輛狀態
  useEffect(() => {
    if (!user) return
    const fetchStatus = () => {
      fetch('/api/status')
        .then(r => r.json())
        .then(data => setCarStatus(data))
        .catch(err => console.error(err))
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [user])

  const showToast = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [])

  const handleTakeCar = async () => {
    if (!user) return
    // 樂觀更新
    setCarStatus({
      status: 'in_use', user_id: user.id,
      user_display_name: user.display_name,
      started_at: new Date().toISOString(),
      note: note || '使用中', source: 'manual',
    })
    showToast('🚗 出發！一路順風')
    setNote('')
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take', userId: user.id, note }),
      })
    } catch (e) { console.error(e) }
  }

  const handleReturnCar = async () => {
    if (!user) return
    setCarStatus({
      status: 'available', user_id: null,
      user_display_name: null, started_at: null,
      note: note || '車輛可用', source: 'manual',
    })
    showToast('✅ 歡迎回來！')
    setNote('')
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return', note }),
      })
    } catch (e) { console.error(e) }
  }

  if (!user) return null

  const isInUse = carStatus?.status === 'in_use'
  const isMyUse = isInUse && carStatus?.user_id === user.id

  return (
    <div className="min-h-screen bg-mesh-light">
      <Head><title>用車狀態 - 家庭用車管理</title></Head>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="glass-nav shadow-sm px-5 py-3 flex items-center justify-between sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-xl"
          >🚗</motion.span>
          <span className="font-bold text-gray-700">Car Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/calendar" className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors">
            📅 行事曆
          </Link>
          <Link href="/stats" className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors">
            📊 統計
          </Link>
          <span className="text-sm text-gray-400">|</span>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-sm font-medium text-gray-600"
          >{user.display_name}</motion.span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >登出</motion.button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 glass-strong px-6 py-3 rounded-2xl shadow-2xl"
          >
            <span className="text-gray-800 font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-lg mx-auto px-4 pt-10 pb-20 relative z-10">
        {!carStatus ? (
          <div className="glass-strong rounded-3xl shadow-xl p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-400">載入中...</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            >
              <div className={`relative overflow-hidden rounded-3xl shadow-xl p-8 text-center transition-all duration-500 ${
                isInUse
                  ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-yellow-300'
                  : 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-300'
              }`}>
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${isInUse ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`} />

                <motion.div
                  className="text-7xl mb-3"
                  animate={isInUse ? {
                    x: [0, 8, -8, 0],
                    y: [0, -3, 3, 0],
                  } : {
                    scale: [1, 1.05, 1],
                  }}
                  transition={isInUse
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {isInUse ? '🚗💨' : '🚗'}
                </motion.div>

                <motion.h2
                  key={carStatus.status}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-2xl font-bold mb-1 ${isInUse ? 'text-amber-800' : 'text-emerald-800'}`}
                >
                  {isInUse ? `${carStatus.user_display_name} 正在使用中` : '車輛目前可用'}
                  <AnimatePresence mode="wait">
                    {carStatus?.source === 'schedule' && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="inline-block ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full"
                      >📅 排程</motion.span>
                    )}
                    {carStatus?.source === 'manual' && carStatus?.status === 'in_use' && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-block ml-2 text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full"
                      >👤 手動</motion.span>
                    )}
                  </AnimatePresence>
                </motion.h2>

                {isInUse && carStatus.started_at && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-gray-500 mt-1"
                  >🕐 從 {new Date(carStatus.started_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} 開始</motion.p>
                )}

                <AnimatePresence mode="wait">
                  {carStatus.note && (
                    <motion.p
                      key={carStatus.note}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`text-sm mt-1 italic ${isInUse ? 'text-amber-600' : 'text-gray-400'}`}
                    >📌 {carStatus.note}</motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-8 space-y-3">
                  {!isInUse && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="relative">
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="去哪？ (選填)"
                          className="w-full p-3.5 bg-white/80 border border-emerald-200 rounded-2xl mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                          maxLength={50}
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(59,130,246,0.3)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleTakeCar}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg"
                      >
                        🚗 我要用車
                      </motion.button>
                    </motion.div>
                  )}
                  {isInUse && isMyUse && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="車況備註 (選填)"
                        className="w-full p-3.5 bg-white/80 border border-amber-200 rounded-2xl mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
                        maxLength={50}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(34,197,94,0.3)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleReturnCar}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-2xl font-bold text-lg transition-all shadow-lg"
                      >
                        ✅ 歸還車輛
                      </motion.button>
                    </motion.div>
                  )}
                  {isInUse && !isMyUse && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-100/80 rounded-2xl p-5 text-amber-700"
                    >
                      <div className="text-2xl mb-1">⏳</div>
                      <div className="font-medium">{carStatus.user_display_name} 正在使用</div>
                      <div className="text-sm mt-1 opacity-70">請等待歸還，或跟他們協調時間</div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
