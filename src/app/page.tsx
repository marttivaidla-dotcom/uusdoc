'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (!data.user) router.push('/login')
      else { setUser(data.user); setLoading(false) }
    })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#718096' }}>
      Laadin...
    </div>
  )

  return (
    <Layout active="/">
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>Tere tulemast!</h1>
      <p style={{ fontSize: '14px', color: '#718096' }}>Sisse logitud: {user?.email}</p>
    </Layout>
  )
}
