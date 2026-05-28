import { useState, useEffect } from 'react'
import { useSocket } from './_app'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function StatsPage({ user, onLogout }) {
  const router = useRouter();
  const { connected } = useSocket();
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    fetchStats();
  }, [user, days]);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?days=${days}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (!user) return null;

  const perUserData = stats?.perUser || [];
  const dailyData = stats?.daily || [];

  const barColors = ['#667eea', '#34d399', '#f59e0b', '#ef4444'];

  const userChartData = {
    labels: perUserData.map(u => u.display_name),
    datasets: [{
      label: '使用次數',
      data: perUserData.map(u => u.trip_count),
      backgroundColor: barColors.slice(0, perUserData.length),
      borderRadius: 8,
    }]
  };

  const minutesChartData = {
    labels: perUserData.map(u => u.display_name),
    datasets: [{
      data: perUserData.map(u => Math.round(u.total_minutes)),
      backgroundColor: barColors.slice(0, perUserData.length),
      borderWidth: 0,
    }]
  };

  const dailyChartData = {
    labels: dailyData.map(d => {
      const parts = d.day.split('-');
      return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
    }),
    datasets: [{
      label: '使用次數',
      data: dailyData.map(d => d.trip_count),
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#667eea',
      pointRadius: 3,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: 10 },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 12,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((ctx.parsed / total) * 100).toFixed(1);
            return ` ${ctx.label}: ${ctx.parsed} 分鐘 (${pct}%)`;
          }
        }
      },
    },
  };

  return (
    <div className="min-h-screen bg-mesh-light pb-20">
      <Head><title>用車統計 - 家庭用車管理</title></Head>

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
          <span className="text-xl">🚗</span>
          <span className="font-bold text-gray-700">用車統計</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-blue-500 hover:text-blue-700 text-sm font-medium">🏠 狀態</Link>
          <Link href="/calendar" className="text-blue-500 hover:text-blue-700 text-sm font-medium">📅 行事曆</Link>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm font-medium text-gray-600">{user.display_name}</span>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onLogout} className="text-xs text-red-400 hover:text-red-600">登出</motion.button>
        </div>
      </motion.nav>

      <div className="max-w-2xl mx-auto px-4 mt-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <h1 className="text-2xl font-bold text-gray-800">📊 用車統計</h1>
          <div className="flex gap-1 bg-white/60 rounded-xl p-1">
            {[7, 30, 90].map(n => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  days === n ? 'bg-blue-500 text-white shadow' : 'text-gray-500 hover:bg-white/60'
                }`}
              >{n}天</button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="glass-strong rounded-3xl p-12 text-center">
            <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">載入統計...</p>
          </div>
        ) : !stats || perUserData.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-3xl p-12 text-center"
          >
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-3">📊</motion.div>
            <p className="text-gray-500 font-medium">還沒有用車記錄</p>
            <p className="text-sm text-gray-400 mt-1">開始用車後，統計資料會自動產生</p>
            <Link href="/dashboard" className="inline-block mt-4 text-blue-500 text-sm font-medium">← 回到 Dashboard</Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '總使用次數', value: perUserData.reduce((a, u) => a + u.trip_count, 0), unit: '次', color: 'from-blue-400 to-indigo-500' },
                { label: '總使用時數', value: (perUserData.reduce((a, u) => a + u.total_minutes, 0) / 60).toFixed(1), unit: '小時', color: 'from-emerald-400 to-teal-500' },
                { label: '最常用', value: perUserData[0]?.display_name || '-', unit: '', color: 'from-amber-400 to-orange-500' },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 text-white shadow-lg`}
                >
                  <div className="text-xs opacity-70 mb-1">{card.label}</div>
                  <div className="text-2xl font-bold">{card.value}<span className="text-sm ml-0.5 opacity-70">{card.unit}</span></div>
                </motion.div>
              ))}
            </div>

            {/* Week Comparison */}
            {stats.thisWeek && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-strong rounded-3xl p-5"
              >
                <div className="font-bold text-gray-700 mb-3">📈 本週 vs 上週</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">本週</div>
                    <div className="text-xl font-bold text-blue-600">{stats.thisWeek.trips} 次</div>
                    <div className="text-xs text-gray-400">{Math.round(stats.thisWeek.minutes / 60)}h {stats.thisWeek.minutes % 60}m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">上週</div>
                    <div className="text-xl font-bold text-gray-500">{stats.lastWeek.trips} 次</div>
                    <div className="text-xs text-gray-400">{Math.round(stats.lastWeek.minutes / 60)}h {stats.lastWeek.minutes % 60}m</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* User Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-strong rounded-3xl p-5"
            >
              <div className="font-bold text-gray-700 mb-3">👤 每人使用次數</div>
              <div className="h-48">
                <Bar data={userChartData} options={chartOptions} />
              </div>
            </motion.div>

            {/* Usage Time Doughnut */}
            {perUserData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-strong rounded-3xl p-5"
              >
                <div className="font-bold text-gray-700 mb-3">⏱️ 使用時間佔比</div>
                <div className="h-64 flex items-center justify-center">
                  <Doughnut data={minutesChartData} options={doughnutOptions} />
                </div>
              </motion.div>
            )}

            {/* Daily Trend */}
            {dailyData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-strong rounded-3xl p-5"
              >
                <div className="font-bold text-gray-700 mb-3">📅 每日使用趨勢</div>
                <div className="h-48">
                  <Line data={dailyChartData} options={chartOptions} />
                </div>
              </motion.div>
            )}

            {/* Detail Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="glass-strong rounded-3xl p-5"
            >
              <div className="font-bold text-gray-700 mb-3">📋 詳細資料</div>
              <div className="space-y-2">
                {perUserData.map((u, i) => (
                  <div key={u.display_name} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}</span>
                      <span className="font-medium text-gray-700">{u.display_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{u.trip_count} 次</div>
                      <div className="text-xs text-gray-400">{Math.round(u.total_minutes / 60)}h {u.total_minutes % 60}m</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
