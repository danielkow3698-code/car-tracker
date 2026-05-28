import '@/styles/globals.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

// PWA: register service worker
function registerSW() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

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

  return (
    <Component
      {...pageProps}
      user={user}
      appLoading={loading}
      onLogin={login}
      onLogout={logout}
    />
  )
}
