'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Suspense } from 'react'
import {
  ReceiptIcon, UploadSimpleIcon, TrashIcon, SpinnerIcon,
  CheckCircleIcon, WarningIcon, DownloadSimpleIcon,
} from '@phosphor-icons/react'

type Company = { id: string; nimi: string }
type Invoice = {
  id: string; company_id: string | null; hankija: string | null; arve_nr: string | null
  arve_kuupaev: string | null; tahtaeg: string | null; summa: number | null; km: number | null
  fail_nimi: string | null; staatus: string; loodud_at: string; companies?: { nimi: string } | null
}
type Draft = {
  company_id: string; hankija: string; arve_nr: string; arve_kuupaev: string
  tahtaeg: string; summa: string; km: string; fail_nimi: string
}

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #e9ebed', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' as const,
}
const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: '600' as const, color: '#718096',
  marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.4px',
}

function InvoicesContent() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (!d.user) router.push('/login') })
    Promise.all([
      fetch('/api/companies').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
    ]).then(([cd, id]) => {
      const comps = cd.companies || []
      setCompanies(comps)
      if (comps.length > 0) setSelectedCompany(comps[0].id)
      setInvoices(id.invoices || [])
      if (id.error) setMessage('Viga: ' + id.error)
      setLoading(false)
    })
  }, [])

  const showMsg = (msg: string) => {
    setMessage(msg)
    if (!msg.includes('iga')) setTimeout(() => setMessage(''), 4000)
  }

  const processFile = async (file: File) => {
    setUploading(true)
    let data: any
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/invoices/process', { method: 'POST', body: form })
      data = await res.json()
    } catch (err: any) {
      setUploading(false)
      showMsg('Viga: ' + (err?.message || 'Timeout või võrgu viga'))
      return
    }
    setUploading(false)
    if (data.error) { showMsg('Viga: ' + data.error + (data.code ? ` (${data.code})` : '')); return }
    setDrafts(prev => [...prev, {
      company_id: selectedCompany,
      hankija: data.data.hankija || '',
      arve_nr: data.data.arve_nr || '',
      arve_kuupaev: data.data.arve_kuupaev || '',
      tahtaeg: data.data.tahtaeg || '',
      summa: data.data.summa?.toString() || '',
      km: data.data.km?.toString() || '',
      fail_nimi: data.fail_nimi || file.name,
    }])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(f => processFile(f))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f => processFile(f))
    e.target.value = ''
  }

  const updateDraft = (i: number, field: keyof Draft, val: string) =>
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d))

  const removeDraft = (i: number) => setDrafts(prev => prev.filter((_, idx) => idx !== i))

  const saveAll = async () => {
    if (drafts.length === 0) return
    setSaving(true)
    const saved: Invoice[] = []
    for (const d of drafts) {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: d.company_id || null,
          hankija: d.hankija || null,
          arve_nr: d.arve_nr || null,
          arve_kuupaev: d.arve_kuupaev || null,
          tahtaeg: d.tahtaeg || null,
          summa: d.summa ? parseFloat(d.summa) : null,
          km: d.km ? parseFloat(d.km) : null,
          fail_nimi: d.fail_nimi,
        }),
      })
      const data = await res.json()
      if (data.invoice) saved.push(data.invoice)
    }
    setInvoices(prev => [...saved, ...prev])
    setDrafts([])
    setSaving(false)
    showMsg(`${saved.length} arvet salvestatud!`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Kustuta arve?')) return
    await fetch(`/api/invoices?id=${id}`, { method: 'DELETE' })
    setInvoices(prev => prev.filter(i => i.id !== id))
  }

  const exportInvoices = (fmt: 'csv' | 'txt' | 'books') => {
    const url = `/api/invoices/export?fmt=${fmt}${selectedCompany ? `&company_id=${selectedCompany}` : ''}`
    window.open(url, '_blank')
  }

  if (loading) return <Layout active="/invoices"><div style={{ color: '#718096', fontSize: '14px' }}>Laadin...</div></Layout>

  return (
    <Layout active="/invoices">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e' }}>Arved</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {companies.length > 1 && (
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e9ebed', borderRadius: '7px', fontSize: '13px', color: '#4a5568', background: '#fff' }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.nimi}</option>)}
            </select>
          )}
          <button onClick={() => exportInvoices('csv')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#fff', border: '1px solid #e9ebed', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', color: '#4a5568', fontWeight: '500' }}>
            <DownloadSimpleIcon size={15} />CSV
          </button>
          <button onClick={() => exportInvoices('txt')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#fff', border: '1px solid #e9ebed', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', color: '#4a5568', fontWeight: '500' }}>
            <DownloadSimpleIcon size={15} />TXT
          </button>
          <button onClick={() => exportInvoices('books')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', color: '#3b5bdb', fontWeight: '600' }}>
            <DownloadSimpleIcon size={15} />Excellent Books
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: message.includes('iga') ? '#fff0f0' : '#f0fff4', color: message.includes('iga') ? '#c53030' : '#276749', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {message.includes('iga') ? <WarningIcon size={16} /> : <CheckCircleIcon size={16} />}
          {message}
        </div>
      )}

      {/* Üleslaadimise ala */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          background: dragOver ? '#eef2ff' : '#fff',
          border: `2px dashed ${dragOver ? '#3b5bdb' : '#e9ebed'}`,
          borderRadius: '10px', padding: '36px', textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer', marginBottom: '20px', transition: 'all 0.15s',
        }}
      >
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg" multiple style={{ display: 'none' }} onChange={handleFileChange} />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <SpinnerIcon size={28} color="#3b5bdb" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '14px', color: '#4a5568' }}>Gemini loeb arvet...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <UploadSimpleIcon size={36} color="#9aa5b4" weight="thin" />
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#4a5568' }}>Lohista arved siia või klõpsa</div>
            <div style={{ fontSize: '12px', color: '#9aa5b4' }}>PDF, JPG, JPEG · korraga mitu faili</div>
          </div>
        )}
      </div>

      {/* Eelvaade */}
      {drafts.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #c7d2fe', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b5bdb' }}>
              {drafts.length} arvet loetud — kontrolli ja salvesta
            </div>
            <button onClick={saveAll} disabled={saving} style={{ padding: '8px 18px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvestan...' : `Salvesta kõik (${drafts.length})`}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drafts.map((d, i) => (
              <div key={i} style={{ border: '1px solid #e9ebed', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#718096' }}>{d.fail_nimi}</span>
                  <button onClick={() => removeDraft(i)} style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer', color: '#c53030' }}>
                    <TrashIcon size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Ettevõte</label>
                    <select value={d.company_id} onChange={e => updateDraft(i, 'company_id', e.target.value)} style={inputStyle}>
                      <option value="">—</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.nimi}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Hankija</label>
                    <input value={d.hankija} onChange={e => updateDraft(i, 'hankija', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Arve nr</label>
                    <input value={d.arve_nr} onChange={e => updateDraft(i, 'arve_nr', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Kuupäev</label>
                    <input type="date" value={d.arve_kuupaev} onChange={e => updateDraft(i, 'arve_kuupaev', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Tähtaeg</label>
                    <input type="date" value={d.tahtaeg} onChange={e => updateDraft(i, 'tahtaeg', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Kokku (KM-ga)</label>
                    <input type="number" step="0.01" value={d.summa} onChange={e => updateDraft(i, 'summa', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Käibemaks</label>
                    <input type="number" step="0.01" value={d.km} onChange={e => updateDraft(i, 'km', e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arvete tabel */}
      {invoices.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ebed', padding: '48px 24px', textAlign: 'center' }}>
          <ReceiptIcon size={48} weight="thin" color="#cbd5e0" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Arveid pole veel</div>
          <div style={{ fontSize: '13px', color: '#9aa5b4' }}>Lohista PDF või JPG failid üles</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e9ebed', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e9ebed' }}>
                {['Hankija', 'Arve nr', 'Kuupäev', 'Tähtaeg', 'KM-ta', 'KM', 'Kokku', 'Ettevõte', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: ['KM-ta', 'KM', 'Kokku'].includes(h) ? 'right' : 'left', fontWeight: '600', color: '#718096', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const summa = inv.summa ?? 0
                const km = inv.km ?? 0
                const neto = summa - km
                return (
                  <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? '1px solid #f0f2f5' : 'none' }}>
                    <td style={{ padding: '11px 12px', fontWeight: '500', color: '#1a1a2e' }}>{inv.hankija || '—'}</td>
                    <td style={{ padding: '11px 12px', color: '#4a5568' }}>{inv.arve_nr || '—'}</td>
                    <td style={{ padding: '11px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{inv.arve_kuupaev || '—'}</td>
                    <td style={{ padding: '11px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{inv.tahtaeg || '—'}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', color: '#4a5568' }}>{inv.summa != null ? neto.toFixed(2) : '—'}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', color: '#4a5568' }}>{km ? km.toFixed(2) : '—'}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: '600', color: '#1a1a2e', whiteSpace: 'nowrap' }}>{inv.summa != null ? `${summa.toFixed(2)} €` : '—'}</td>
                    <td style={{ padding: '11px 12px', color: '#718096', fontSize: '12px' }}>{inv.companies?.nimi || '—'}</td>
                    <td style={{ padding: '11px 8px' }}>
                      <button onClick={() => handleDelete(inv.id)} style={{ padding: '5px', background: 'none', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#c53030', display: 'flex' }}>
                        <TrashIcon size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Layout>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<Layout active="/invoices"><div style={{ color: '#718096' }}>Laadin...</div></Layout>}>
      <InvoicesContent />
    </Suspense>
  )
}
