import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage({ user, onLogin, appLoading }) {
  const router = useRouter();
  const [showPin, setShowPin] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);

  // Auto-login if PIN is remembered
  useEffect(() => {
    if (appLoading) return;
    if (user && user.pin) {
      // PIN is remembered, auto-login
      autoLogin(user.name, user.pin);
    }
  }, [user, appLoading]);

  if (user && user.pin) {
    // Will auto-login via effect above
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const users = [
    { name: 'daniel', display_name: 'Daniel', emoji: '👦', color: 'from-blue-400 to-indigo-500' },
    { name: 'dad', display_name: '爸爸', emoji: '👨', color: 'from-emerald-400 to-teal-500' },
  ];

  async function autoLogin(name, savedPin) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin: savedPin }),
    });
    const data = await res.json();
    if (data.success) {
      onLogin(data.user, true);
      router.push('/dashboard');
    }
  }

  const handleUserClick = (u) => {
    setShowPin(u);
    setPin('');
    setError('');
  };

  const handlePinSubmit = async () => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: showPin.name, pin }),
    });
    const data = await res.json();
    if (data.success) {
      onLogin({ ...data.user, pin: remember ? pin : undefined }, remember);
      router.push('/dashboard');
    } else {
      setError('PIN 錯誤，請再試一次');
      setPin('');
    }
  };

  if (appLoading) return null;

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <Head><title>家庭用車管理</title></Head>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="glass-strong rounded-3xl shadow-2xl p-8 w-full max-w-sm relative z-10"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl mb-3"
          >🚗</motion.div>
          <h1 className="text-2xl font-bold text-gray-800">家庭用車管理</h1>
          <p className="text-gray-400 mt-1 text-sm">選擇使用者以繼續</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!showPin ? (
            <motion.div
              key="users"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {users.map((u, i) => (
                <motion.button
                  key={u.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.1 }}
                  whileHover={{ scale: 1.03, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleUserClick(u)}
                  className={`w-full p-4 rounded-2xl bg-gradient-to-r ${u.color} text-white flex items-center gap-4 shadow-lg`}
                >
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                    className="text-3xl"
                  >{u.emoji}</motion.span>
                  <div className="text-left">
                    <div className="font-bold text-lg">{u.display_name}</div>
                    <div className="text-sm text-white/70">點擊登入</div>
                  </div>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity }}
                    className="ml-auto text-xl"
                  >→</motion.span>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPin(null)}
                className="text-sm text-blue-500 hover:text-blue-700 mb-4 flex items-center gap-1 transition-colors"
              >← 返回</motion.button>

              <div className="text-center mb-6">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-5xl mb-2"
                >{showPin.emoji}</motion.div>
                <div className="font-bold text-xl text-gray-800">{showPin.display_name}</div>
                <div className="text-sm text-gray-400 mt-1">請輸入 PIN 碼</div>
              </div>

              <div className="flex justify-center gap-3 mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={pin.length > i ? { scale: [1, 1.2, 1], backgroundColor: '#3b82f6' } : {}}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                      pin.length > i ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                  />
                ))}
              </div>

              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && handlePinSubmit()}
                className="w-full text-center text-2xl tracking-[0.5em] p-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="● ● ● ●"
                autoFocus
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-500 text-sm mt-3 text-center"
                  >{error}</motion.p>
                )}
              </AnimatePresence>

              {/* Remember me */}
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                />
                <span className="text-sm text-gray-500">記住我，下次自動登入</span>
              </label>

              <motion.button
                whileHover={pin.length === 4 ? { scale: 1.02 } : {}}
                whileTap={pin.length === 4 ? { scale: 0.98 } : {}}
                onClick={handlePinSubmit}
                disabled={pin.length < 4}
                className="w-full mt-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3.5 rounded-2xl font-bold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
              >
                {pin.length === 4 ? '🚀 登入' : '輸入 PIN 碼'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
