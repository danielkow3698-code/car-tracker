import '@/styles/globals.css'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

// PWA: register service worker
function registerSW() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

// Hook to capture install prompt
let deferredPrompt = null;

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    registerSW()
    const saved = localStorage.getItem('car_tracker_user')
    if (saved) {
      setUser(JSON.parse(saved))
    }
    setLoading(false)

    // Capture install prompt
    const handler = (e) => {
      e.preventDefault()
      deferredPrompt = e
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const login = (userData, remember = false) => {
    setUser(userData)
    const data = remember
      ? { ...userData, pin: userData.pin }
      : { id: userData.id, name: userData.name, display_name: userData.display_name }
    localStorage.setItem('car_tracker_user', JSON.stringify(data))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('car_tracker_user')
    router.push('/')
  }

  const [installable, setInstallable] = useState(false)

  useEffect(() => {
    // Re-check install status periodically
    const check = () => setInstallable(!!deferredPrompt)
    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      deferredPrompt = null
      setInstallable(false)
    }
  }

  return (
    <>
      <Head>
        <meta name="application-name" content="Car Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Car Tracker" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
      </Head>
      <Component
        {...pageProps}
        user={user}
        appLoading={loading}
        onLogin={login}
        onLogout={logout}
        installable={installable}
        onInstall={handleInstall}
      />
      {installable && (
        <button
          onClick={handleInstall}
          style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', border: 'none', borderRadius: '16px',
            padding: '12px 20px', fontSize: '14px', fontWeight: 'bold',
            boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
            cursor: 'pointer',
          }}
        >
          📲 安裝 App
        </button>
      )}
    </>
  )
}
