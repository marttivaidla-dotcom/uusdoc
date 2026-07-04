'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { BuildingsIcon, PlusIcon, TrashIcon, CloudArrowUpIcon, CheckCircleIcon, WarningIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Suspense } from 'react'

type Company = { id: string; nimi: string; registrikood: string | null; onedrive_url: string | null; jarjekorra_nr: string | null }
type AriResult = { nimi: string; registrikood: string | null }

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #e9ebed', borderRadius: '8px',
  fontSize: '14px', outline: 'none', background: '#fff', boxSizing: 'border-box' as const,
}
const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: '500' as const, color: '#718096',
  marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px',
}

function CompaniesContent() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nimi: '', registrikood: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingOd, setEditingOd] = useState<string | null>(null)
  const [odUrl, setOdUrl] = useState('')
  const [editingJnr, setEditingJnr] = useState<string | null>(null)
  const [jnrValue, setJnrValue] = useState('')

  // Äriregistri otsing
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AriResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) router.push('/login')
    })
    loadCompanies()
    if (searchParams.get('connected') === '1') setMessage('OneDrive ühendatud!')
    if (searchParams.get('error')) setMessage('Viga: ' + searchParams.get('error'))
  }, [])

  const loadCompanies = async () => {
    const res = await fetch('/api/companies')
    const data = await res.json()
    if (data.error) setMessage('Viga laadimisel: ' + data.error)
    setCompanies(data.companies || [])
    setLoading(false)
  }

  const saveJnr = async (id: string) => {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jarjekorra_nr: jnrValue.trim() || null }),
    })
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, jarjekorra_nr: jnrValue.trim() || null } : c))
    setEditingJnr(null)
  }

  const saveOdUrl = async (id: string) => {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onedrive_url: odUrl.trim() || null }),
    })
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, onedrive_url: odUrl.trim() || null } : c))
    setEditingOd(null)
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setSearchDone(false)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (val.length < 2) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/ariregister?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setSearchResults(data.companies || [])
      setSearchDone(true)
      setSearching(false)
    }, 400)
  }

  const selectFromSearch = (r: AriResult) => {
    setForm({ nimi: r.nimi, registrikood: r.registrikood || '' })
    setSearchQuery('')
    setSearchResults([])
    setShowForm(true)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) { setMessage('Viga: ' + data.error); setSaving(false); return }
    setCompanies(prev => [...prev, data.company])
    setForm({ nimi: '', registrikood: '' })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Kustuta ettevõte?')) return
    await fetch(`/api/companies/${id}`, { method: 'DELETE' })
    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <Layout active="/companies"><div style={{ color: '#718096', fontSize: '14px' }}>Laadin...</div></Layout>

  return (
    <Layout active="/companies">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e' }}>Ettevõtted</h1>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: message.includes('iga') ? '#fff0f0' : '#f0fff4', color: message.includes('iga') ? '#c53030' : '#276749', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {message.includes('iga') ? <WarningIcon size={16} /> : <CheckCircleIcon size={16} />}
          {message}
        </div>
      )}

      {/* Äriregistri otsing */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ebed', padding: '20px', marginBottom: '20px' }}>
        <label style={labelStyle}>Otsi äriregistrist</label>
        <div style={{ position: 'relative' as const }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <MagnifyingGlassIcon size={16} color="#9aa5b4" />
          </div>
          <input
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px' }}
            placeholder="Ettevõtte nimi või registrikood..."
          />
          {searching && (
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#718096' }}>
              Otsin...
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div style={{ marginTop: '8px', border: '1px solid #e9ebed', borderRadius: '8px', overflow: 'hidden' }}>
            {searchResults.map((r, i) => (
              <div
                key={i}
                onClick={() => selectFromSearch(r)}
                style={{ padding: '10px 14px', borderBottom: i < searchResults.length - 1 ? '1px solid #f0f2f5' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1a1a2e' }}>
                    {r.nimi}
                  </div>
                  {r.registrikood && (
                    <div style={{ fontSize: '12px', color: '#9aa5b4', marginTop: '2px' }}>
                      {r.registrikood}
                    </div>
                  )}
                </div>
                <PlusIcon size={14} color="#3b5bdb" weight="bold" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {searchDone && searchResults.length === 0 && searchQuery.length >= 2 && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#718096', padding: '10px 0' }}>
            Ei leitud. <button onClick={() => { setShowForm(true); setForm(p => ({ ...p, nimi: searchQuery })); setSearchQuery('') }} style={{ background: 'none', border: 'none', color: '#3b5bdb', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}>Lisa käsitsi</button>
          </div>
        )}

        {!searchQuery && (
          <button
            onClick={() => { setShowForm(v => !v); setForm({ nimi: '', registrikood: '' }); setMessage('') }}
            style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#718096', padding: 0, textDecoration: 'underline' }}>
            {showForm ? 'Sulge' : 'Lisa käsitsi'}
          </button>
        )}
      </div>

      {/* Käsitsi lisamise vorm */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ebed', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e', marginBottom: '16px' }}>Lisa ettevõte</h2>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Ettevõtte nimi *</label>
              <input value={form.nimi} onChange={e => setForm(p => ({ ...p, nimi: e.target.value }))} required style={inputStyle} placeholder="nt. Acme OÜ" autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Registrikood</label>
              <input value={form.registrikood} onChange={e => setForm(p => ({ ...p, registrikood: e.target.value }))} style={inputStyle} placeholder="nt. 12345678" />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13.5px', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvestan...' : 'Lisa'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', background: '#f8f9fb', border: '1px solid #e9ebed', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', color: '#4a5568' }}>
                Tühista
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ettevõtete nimekiri */}
      {companies.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ebed', padding: '48px 24px', textAlign: 'center' }}>
          <BuildingsIcon size={48} weight="thin" color="#cbd5e0" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Ettevõtteid pole lisatud</div>
          <div style={{ fontSize: '13px', color: '#9aa5b4' }}>Otsi äriregistrist või lisa käsitsi</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {companies.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ebed', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <BuildingsIcon size={18} color="#3b5bdb" weight="duotone" />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>{c.nimi}</span>
                    {c.registrikood && <span style={{ fontSize: '12px', color: '#9aa5b4' }}>{c.registrikood}</span>}
                    {editingJnr === c.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          value={jnrValue}
                          onChange={e => setJnrValue(e.target.value)}
                          placeholder="nr"
                          autoFocus
                          style={{ width: '80px', padding: '4px 8px', border: '1px solid #e9ebed', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                        />
                        <button onClick={() => saveJnr(c.id)} style={{ padding: '4px 10px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>OK</button>
                        <button onClick={() => setEditingJnr(null)} style={{ padding: '4px 8px', background: '#f8f9fb', border: '1px solid #e9ebed', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#718096' }}>×</button>
                      </div>
                    ) : (
                      <span
                        onClick={() => { setEditingJnr(c.id); setJnrValue(c.jarjekorra_nr || '') }}
                        style={{ fontSize: '12px', color: c.jarjekorra_nr ? '#3b5bdb' : '#cbd5e0', cursor: 'pointer', border: '1px dashed', borderColor: c.jarjekorra_nr ? '#c7d2fe' : '#e9ebed', borderRadius: '5px', padding: '2px 8px' }}
                        title="Kliki järjekorra numbri muutmiseks"
                      >
                        {c.jarjekorra_nr || 'nr?'}
                      </span>
                    )}
                  </div>
                  {editingOd === c.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        value={odUrl}
                        onChange={e => setOdUrl(e.target.value)}
                        placeholder="https://onedrive.live.com/..."
                        autoFocus
                        style={{ ...inputStyle, fontSize: '13px', padding: '7px 10px' }}
                      />
                      <button onClick={() => saveOdUrl(c.id)} style={{ padding: '7px 14px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>Salvesta</button>
                      <button onClick={() => setEditingOd(null)} style={{ padding: '7px 10px', background: '#f8f9fb', border: '1px solid #e9ebed', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', color: '#718096' }}>Tühista</button>
                    </div>
                  ) : c.onedrive_url ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f0fff4', borderRadius: '8px', border: '1px solid #c6f6d5' }}>
                      <CheckCircleIcon size={14} color="#276749" weight="fill" />
                      <a href={c.onedrive_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#276749', fontWeight: '500', textDecoration: 'none' }}>OneDrive kaust</a>
                      <button onClick={() => { setEditingOd(c.id); setOdUrl(c.onedrive_url || '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#718096', textDecoration: 'underline', padding: 0 }}>Muuda</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingOd(c.id); setOdUrl('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 14px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '8px', color: '#3b5bdb', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                      <CloudArrowUpIcon size={15} weight="bold" />
                      Lisa OneDrive link
                    </button>
                  )}
                </div>
                <button onClick={() => handleDelete(c.id)} style={{ padding: '7px', background: 'none', border: '1px solid #fecaca', borderRadius: '7px', cursor: 'pointer', color: '#c53030', display: 'flex', flexShrink: 0 }}>
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<Layout active="/companies"><div style={{ color: '#718096' }}>Laadin...</div></Layout>}>
      <CompaniesContent />
    </Suspense>
  )
}
