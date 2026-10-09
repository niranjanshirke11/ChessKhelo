import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../store/authStore';
import s from './AuthPage.module.css';

const FLAGS = ['🌍','🇮🇳','🇺🇸','🇬🇧','🇩🇪','🇫🇷','🇯🇵','🇰🇷','🇧🇷','🇷🇺','🇨🇳','🇦🇺','🇨🇦'];

const RANDOM_NAMES = [
  'SpeedyKnight', 'BishopKing', 'RookMaster', 'PawnStormer', 
  'QueenHunter', 'ChessNinja', 'GrandTactician', 'BlitzHero', 
  'SilentGambit', 'EndgamePro', 'CastleKing', 'RoyalFork'
];

export default function AuthPage() {
  const [params] = useSearchParams();
  const initialMode = params.get('mode') === 'login' ? 'login' : params.get('mode') === 'guest' ? 'guest' : 'register';
  const [mode, setMode] = useState<'guest' | 'register' | 'login'>(initialMode);
  
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    country: '🌍',
  });
  
  const [showPwd, setShowPwd] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  
  const { login, register, guestLogin, googleLogin, isLoading, error, clearError, isAuthenticated, loadDemo } = useAuth();
  const nav = useNavigate();

  useEffect(() => { 
    if (isAuthenticated) nav('/app/play', { replace: true }); 
  }, [isAuthenticated, nav]);

  const upd = (k: string, v: string) => { 
    setForm(f => ({ ...f, [k]: v })); 
    clearError(); 
  };

  const handleRandomName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    upd('username', `${random}${num}`);
  };

  const submit = async () => {
    try {
      if (mode === 'guest') {
        await guestLogin(form.username, form.country);
      } else if (mode === 'login') {
        await login(form.username || form.email, form.password);
      } else {
        await register(form.username, form.email, form.password, form.country);
      }
    } catch (_) {}
  };

  const handleGoogleLogin = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      guestLogin(form.username || 'GoogleUser', form.country);
      return;
    }
    
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
        if (!popup || popup.closed) { 
          clearInterval(timer); 
          setGLoading(false); 
          return; 
        }
        const popupUrl = popup.location.href;
        if (popupUrl.includes('access_token')) {
          clearInterval(timer);
          popup.close();
          const hash = new URL(popupUrl).hash.substring(1);
          const p = new URLSearchParams(hash);
          const accessToken = p.get('access_token');
          if (accessToken) {
            const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            }).then(r => r.json());
            await googleLogin(accessToken, userInfo);
          }
          setGLoading(false);
        }
      } catch (_) {}
    }, 500);
  }, [googleLogin, guestLogin, form.username, form.country]);

  return (
    <div className={s.page}>
      <div className={s.bg}><div className={s.glow1}/><div className={s.glow2}/><div className={s.grid}/></div>
      <button className={`btn btn-ghost btn-sm ${s.back}`} onClick={() => nav('/')}>← Home</button>

      <motion.div className={s.card}
        initial={{ opacity: 0, y: 28, scale: .97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}>

        <div className={s.logo}>♟ Chess<span>Khelo</span></div>
        <div className={s.tagline}>Play online chess with players worldwide or practice vs AI</div>

        {/* 3 Simple Navigation Tabs */}
        <div className={s.tabs}>
          <button 
            className={`${s.tab}${mode === 'guest' ? ' ' + s.active : ''}`} 
            onClick={() => { setMode('guest'); clearError(); }}>
            ⚡ Quick Guest
          </button>
          <button 
            className={`${s.tab}${mode === 'register' ? ' ' + s.active : ''}`} 
            onClick={() => { setMode('register'); clearError(); }}>
            📝 Register
          </button>
          <button 
            className={`${s.tab}${mode === 'login' ? ' ' + s.active : ''}`} 
            onClick={() => { setMode('login'); clearError(); }}>
            🔑 Sign In
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode} className={s.form}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .18 }}>

            {/* TAB 1: QUICK GUEST PLAY */}
            {mode === 'guest' && (
              <>
                <div className={s.field}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={s.label}>Choose a Handle / Username</label>
                    <button type="button" className="btn btn-ghost btn-xs text-gold" onClick={handleRandomName}>
                      🎲 Random Name
                    </button>
                  </div>
                  <input 
                    className="input"
                    placeholder="e.g. KnightPlayer" 
                    value={form.username} 
                    maxLength={20}
                    onChange={e => upd('username', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()} 
                  />
                  <span className={s.hint}>Temporary guest player profile — no password required!</span>
                </div>

                <div className={s.field}>
                  <label className={s.label}>Country Flag</label>
                  <div className={s.flags}>
                    {FLAGS.map(f => (
                      <button key={f} type="button"
                        className={`${s.flag}${form.country === f ? ' ' + s.flagOn : ''}`}
                        onClick={() => upd('country', f)}>{f}</button>
                    ))}
                  </div>
                </div>

                <button className={`btn btn-gold ${s.submitBtn}`} onClick={submit} disabled={isLoading}>
                  {isLoading ? <span className="spinner" /> : '⚡ Start Playing Immediately'}
                </button>
              </>
            )}

            {/* TAB 2: SIMPLE REGISTRATION */}
            {mode === 'register' && (
              <>
                <div className={s.field}>
                  <label className={s.label}>Username</label>
                  <input 
                    className="input"
                    placeholder="e.g. ChessMaster_10" 
                    value={form.username} 
                    maxLength={25}
                    onChange={e => upd('username', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()} 
                  />
                  <span className={s.hint}>At least 2 characters</span>
                </div>

                <div className={s.field}>
                  <label className={s.label}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      className="input"
                      type={showPwd ? 'text' : 'password'} 
                      placeholder="Enter password (e.g. 12345)" 
                      value={form.password}
                      style={{ paddingRight: 44 }}
                      onChange={e => upd('password', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()} 
                    />
                    <button type="button" className={s.eye} onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                  <span className={s.hint}>Simple password (min 3 characters)</span>
                </div>

                <div className={s.field}>
                  <label className={s.label}>Email (Optional)</label>
                  <input 
                    className="input"
                    type="email" 
                    placeholder="you@example.com (optional)" 
                    value={form.email}
                    onChange={e => upd('email', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()} 
                  />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Country Flag</label>
                  <div className={s.flags}>
                    {FLAGS.map(f => (
                      <button key={f} type="button"
                        className={`${s.flag}${form.country === f ? ' ' + s.flagOn : ''}`}
                        onClick={() => upd('country', f)}>{f}</button>
                    ))}
                  </div>
                </div>

                <button className={`btn btn-gold ${s.submitBtn}`} onClick={submit} disabled={isLoading}>
                  {isLoading ? <span className="spinner" /> : 'Create Account & Play →'}
                </button>
              </>
            )}

            {/* TAB 3: SIGN IN */}
            {mode === 'login' && (
              <>
                <div className={s.field}>
                  <label className={s.label}>Username or Email</label>
                  <input 
                    className="input"
                    placeholder="Username or your email" 
                    value={form.username || form.email}
                    onChange={e => {
                      const v = e.target.value;
                      setForm(f => ({ ...f, username: v, email: v }));
                      clearError();
                    }}
                    onKeyDown={e => e.key === 'Enter' && submit()} 
                  />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      className="input"
                      type={showPwd ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={form.password}
                      style={{ paddingRight: 44 }}
                      onChange={e => upd('password', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()} 
                    />
                    <button type="button" className={s.eye} onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button className={`btn btn-gold ${s.submitBtn}`} onClick={submit} disabled={isLoading}>
                  {isLoading ? <span className="spinner" /> : 'Sign In →'}
                </button>
              </>
            )}

            {error && (
              <motion.div className={s.errBox} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                ⚠ {error}
              </motion.div>
            )}

            <div className={s.or}><span>or instant test access</span></div>

            {/* ONE-CLICK DEMO ACCOUNT */}
            <button type="button" className={`btn btn-outline ${s.submitBtn}`} onClick={loadDemo}>
              ♟ Try Demo Account (Grandmaster Mode)
            </button>

            {/* Optional Google Login */}
            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <button type="button" className={s.googleBtn} onClick={handleGoogleLogin} disabled={gLoading || isLoading}>
                {gLoading ? <span className="spinner" /> : 'Sign in with Google'}
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        <div className={s.strip}>
          {[['Free', 'Forever'], ['Multiplayer', 'Live'], ['99.9%', 'Uptime']].map(([v, l]) => (
            <div key={l} className={s.stripStat}>
              <strong>{v}</strong>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
