import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../store/authStore';
import api from '../services/api';
import s from './AuthPage.module.css';

const FLAGS = ['🌍','🇮🇳','🇺🇸','🇬🇧','🇩🇪','🇫🇷','🇯🇵','🇰🇷','🇧🇷','🇷🇺','🇨🇳','🇦🇺','🇨🇦'];

export default function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login'|'register'>(params.get('mode') === 'login' ? 'login' : 'register');
  const [form, setForm] = useState({ username: '', email: '', password: '', country: '🌍' });
  const [showPwd, setShowPwd] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const { login, register, googleLogin, isLoading, error, clearError, isAuthenticated, loadDemo } = useAuth();
  const nav = useNavigate();

  useEffect(() => { if (isAuthenticated) nav('/app/play', { replace: true }); }, [isAuthenticated]);

  const upd = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); clearError(); };

  const submit = async () => {
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.username, form.email, form.password, form.country);
    } catch(_) {}
  };

  const handleGoogleLogin = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin;
    const scope = 'email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=select_account`;
    
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(url, 'google-login', `width=${width},height=${height},left=${left},top=${top}`);

    setGLoading(true);

    const timer = setInterval(async () => {
      try {
        if (!popup || popup.closed) { clearInterval(timer); setGLoading(false); return; }
        const popupUrl = popup.location.href;
        if (popupUrl.includes('access_token')) {
          clearInterval(timer);
          popup.close();
          const hash = new URL(popupUrl).hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          if (accessToken) {
            const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            }).then(r => r.json());
            await googleLogin(accessToken, userInfo);
          }
          setGLoading(false);
        }
      } catch(_) {}
    }, 500);
  }, [googleLogin]);

  return (
    <div className={s.page}>
      <div className={s.bg}><div className={s.glow1}/><div className={s.glow2}/><div className={s.grid}/></div>
      <button className={`btn btn-ghost btn-sm ${s.back}`} onClick={() => nav('/')}>← Home</button>

      <motion.div className={s.card}
        initial={{ opacity: 0, y: 28, scale: .97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}>

        <div className={s.logo}>♟ Knight<span>OS</span></div>
        <div className={s.tagline}>Climb the ranks. Beat the AI. Dominate the board.</div>

        <div className={s.tabs}>
          <button className={`${s.tab}${mode==='register'?' '+s.active:''}`} onClick={()=>{setMode('register');clearError();}}>Create Account</button>
          <button className={`${s.tab}${mode==='login'  ?' '+s.active:''}`} onClick={()=>{setMode('login');clearError();}}>Sign In</button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode} className={s.form}
            initial={{ opacity: 0, x: mode==='login' ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .18 }}>

            {/* Custom Google Button */}
            <button className={s.googleBtn} onClick={handleGoogleLogin} disabled={gLoading || isLoading}>
              {gLoading ? <span className="spinner" /> : (
                <>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                </>
              )}
            </button>

            <div className={s.or}><span>or continue with email</span></div>

            {mode === 'register' && (
              <div className={s.field}>
                <label className={s.label}>Username</label>
                <input className={`input${error?.toLowerCase().includes('user')||error?.toLowerCase().includes('letter') ? ' err' : ''}`}
                  placeholder="GrandMaster_X" value={form.username} maxLength={20}
                  onChange={e => upd('username', e.target.value)}
                  onKeyDown={e => e.key==='Enter' && submit()} />
                <span className={s.hint}>3–20 chars · letters, numbers, underscores</span>
              </div>
            )}

            <div className={s.field}>
              <label className={s.label}>Email</label>
              <input className={`input${error?.toLowerCase().includes('email') ? ' err' : ''}`}
                type="email" placeholder="you@example.com" value={form.email}
                onChange={e => upd('email', e.target.value)}
                onKeyDown={e => e.key==='Enter' && submit()} />
            </div>

            <div className={s.field}>
              <label className={s.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className={`input${error?.toLowerCase().includes('password')||error?.toLowerCase().includes('minimum') ? ' err' : ''}`}
                  type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                  style={{ paddingRight: 44 }}
                  onChange={e => upd('password', e.target.value)}
                  onKeyDown={e => e.key==='Enter' && submit()} />
                <button type="button" className={s.eye} onClick={() => setShowPwd(v => !v)}>{showPwd ? '🙈' : '👁'}</button>
              </div>
              {mode==='register' && <span className={s.hint}>Min 8 chars · 1 uppercase · 1 number</span>}
            </div>

            {mode==='register' && (
              <div className={s.field}>
                <label className={s.label}>Country</label>
                <div className={s.flags}>
                  {FLAGS.map(f => (
                    <button key={f} type="button"
                      className={`${s.flag}${form.country===f ? ' '+s.flagOn : ''}`}
                      onClick={() => upd('country', f)}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <motion.div className={s.errBox} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                ⚠ {error}
              </motion.div>
            )}

            <button className={`btn btn-gold ${s.submitBtn}`} onClick={submit} disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>

            <div className={s.or}><span>or</span></div>

            <button className={`btn btn-outline ${s.submitBtn}`} onClick={loadDemo}>
              ♟ Try Demo Account — No signup needed
            </button>
          </motion.div>
        </AnimatePresence>

        <div className={s.strip}>
          {[['Free','Forever'],['47K','Players'],['99.9%','Uptime']].map(([v,l]) => (
            <div key={l} className={s.stripStat}><strong>{v}</strong><span>{l}</span></div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
