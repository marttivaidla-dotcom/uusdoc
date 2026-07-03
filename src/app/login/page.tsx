'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const router = useRouter()

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #e9ebed', borderRadius: '8px',
    fontSize: '14px', outline: 'none', background: '#fff', boxSizing: 'border-box' as const,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const endpoint = isRegister ? '/api/auth/signup' : '/api/auth/login'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.error) {
      setMessage(data.error)
    } else if (isRegister) {
      setMessage('Kinnitusmeil saadetud!')
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e9ebed', padding: '32px', width: '100%', maxWidth: '380px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' }}>Ostuarved</h1>
        <p style={{ fontSize: '13px', color: '#718096', marginBottom: '24px' }}>{isRegister ? 'Loo konto' : 'Logi sisse'}</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#718096', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="sinu@email.ee" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#718096', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Parool</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
          </div>
          {message && (
            <div style={{ padding: '10px', borderRadius: '7px', fontSize: '13px', background: message.includes('saadetud') ? '#f0fff4' : '#fff0f0', color: message.includes('saadetud') ? '#276749' : '#c53030' }}>{message}</div>
          )}
          <button type="submit" disabled={loading} style={{ padding: '11px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Ootan...' : isRegister ? 'Loo konto' : 'Logi sisse'}
          </button>
        </form>
        <button onClick={() => { setIsRegister(v => !v); setMessage('') }} style={{ marginTop: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#3b5bdb', padding: 0 }}>
          {isRegister ? 'Juba on konto? Logi sisse' : 'Pole kontot? Registreeru'}
        </button>
      </div>
    </div>
  )
}
