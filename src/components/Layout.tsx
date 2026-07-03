'use client'
import { useRouter, usePathname } from 'next/navigation'
import { HouseIcon, ReceiptIcon, BuildingsIcon, UserIcon } from '@phosphor-icons/react'

const NAV = [
  { href: '/', label: 'Avaleht', icon: HouseIcon },
  { href: '/invoices', label: 'Arved', icon: ReceiptIcon },
  { href: '/companies', label: 'Ettevõtted', icon: BuildingsIcon },
  { href: '/profile', label: 'Profiil', icon: UserIcon },
]

export default function Layout({ children, active }: { children: React.ReactNode; active?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const current = active || pathname

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e9ebed', padding: '0 24px', display: 'flex', alignItems: 'center', height: '56px', gap: '24px' }}>
        <span style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e' }}>Ostuarved</span>
        <nav style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {NAV.map(({ href, label }) => (
            <a key={href} href={href} style={{
              padding: '6px 14px', borderRadius: '7px', fontSize: '13.5px', fontWeight: current === href ? '600' : '400',
              color: current === href ? '#3b5bdb' : '#4a5568', background: current === href ? '#eef2ff' : 'transparent',
              textDecoration: 'none'
            }}>{label}</a>
          ))}
        </nav>
        <button onClick={handleSignOut} style={{ padding: '6px 14px', background: '#f8f9fb', border: '1px solid #e9ebed', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', color: '#718096' }}>
          Logi välja
        </button>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 100px' }}>
        {children}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e9ebed', display: 'flex', justifyContent: 'space-around', padding: '8px 0 max(8px, env(safe-area-inset-bottom))' }}>
        {NAV.map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 16px', textDecoration: 'none', color: current === href ? '#3b5bdb' : '#9aa5b4' }}>
            <Icon size={22} weight={current === href ? 'fill' : 'regular'} />
            <span style={{ fontSize: '10px', fontWeight: current === href ? '600' : '400' }}>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
