import { useEffect, useState } from 'react';

// Basic sanitization
function sanitizeText(text: string): string {
  if (!text) return '';
  return text.replace(/[<>]/g, ''); // Removes < and > to prevent basic injection
}

export default function AuthNav({ isMobile = false }: { isMobile?: boolean }) {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check URL params first (old behavior)
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    const e = params.get('e');
    const clear = params.get('clear');

    if (clear) {
      localStorage.removeItem('mipos_user_name');
      localStorage.removeItem('mipos_user_email');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (u && e) {
      const sName = sanitizeText(decodeURIComponent(u));
      const sEmail = sanitizeText(decodeURIComponent(e));
      localStorage.setItem('mipos_user_name', sName);
      localStorage.setItem('mipos_user_email', sEmail);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check localStorage (Supabase session or legacy)
    try {
      let foundUser = false;
      
      // Try Supabase first
      const keys = Object.keys(localStorage);
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      
      if (authKey) {
        const token = localStorage.getItem(authKey);
        if (token) {
          const session = JSON.parse(token);
          if (session && session.user && session.user.email) {
            setUser({
              name: sanitizeText(session.user.user_metadata?.full_name || session.user.email.split('@')[0]),
              email: sanitizeText(session.user.email)
            });
            foundUser = true;
          }
        }
      }

      // Fallback to legacy
      if (!foundUser) {
        const savedName = localStorage.getItem('mipos_user_name');
        const savedEmail = localStorage.getItem('mipos_user_email');
        if (savedName) {
          setUser({
            name: sanitizeText(savedName),
            email: sanitizeText(savedEmail || '')
          });
        }
      }
    } catch (err) {
      console.error('Error reading session', err);
    }
  }, []);

  if (!mounted) {
    // SSR placeholder - show guest by default
    return (
      <>
        {isMobile ? (
          <>
            <a href="https://app.mipos.online/login" className="btn btn-ghost btn-lg">Entrar</a>
            <a href="https://app.mipos.online/login" className="btn btn-orange btn-lg">Probar gratis</a>
          </>
        ) : (
          <>
            <a href="https://app.mipos.online/login" className="link-in">Entrar</a>
            <a href="https://app.mipos.online/login" className="btn btn-ink">Probar gratis</a>
          </>
        )}
      </>
    );
  }

  if (user) {
    if (isMobile) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--panel)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--brand)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: 700 }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
            </div>
          </div>
          <a href="https://app.mipos.online/pos" className="btn btn-ink btn-lg" style={{ width: '100%' }}>Ir al Panel</a>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', lineHeight: 1.1 }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{user.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{user.email}</span>
        </div>
        <a href="https://app.mipos.online/pos" className="btn btn-ink" style={{ padding: '8px 14px', fontSize: '13px' }}>Ir al Panel</a>
      </div>
    );
  }

  // Not logged in
  return (
    <>
      {isMobile ? (
        <>
          <a href="https://app.mipos.online/login" className="btn btn-ghost btn-lg">Entrar</a>
          <a href="https://app.mipos.online/login" className="btn btn-orange btn-lg">Probar gratis</a>
        </>
      ) : (
        <>
          <a href="https://app.mipos.online/login" className="link-in">Entrar</a>
          <a href="https://app.mipos.online/login" className="btn btn-ink">Probar gratis</a>
        </>
      )}
    </>
  );
}
