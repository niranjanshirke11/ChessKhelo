import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import s from './LandingPage.module.css';

const FEATURES = [
  { icon: '🏆', title: 'Ranked Elo System',    desc: 'Climb from Bronze to Diamond with real-time Elo updates. Every game counts.',  route: '/app/play' },
  { icon: '🤖', title: 'AI Training Engine',   desc: 'Play vs adjustable AI difficulty. Get accuracy reports and blunder detection.',  route: '/app/play' },
  { icon: '⚡', title: 'Live Multiplayer',     desc: 'Elo-matched opponents, private lobbies, spectator mode, in-game chat.',  route: '/app/play' },
  { icon: '📊', title: 'Deep Analytics',       desc: 'Rating history, accuracy rings, win/loss breakdown, opening explorer.',  route: '/app/profile' },
  { icon: '💎', title: 'Cosmetics Store',      desc: 'Animated boards, piece sets, victory effects. Zero pay-to-win.',  route: '/app/pricing' },
  { icon: '🌍', title: 'Global Leaderboards',  desc: 'Filter by tier, country, streak. Live viewer counts, Top 500 badges.',  route: '/app/leaderboard' },
];

const TIERS = [
  { name: 'Bronze',   range: '< 1000',    color: '#CD7F32', icon: '🥉' },
  { name: 'Silver',   range: '1000–1400', color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold',     range: '1400–1800', color: '#f5c842', icon: '🥇' },
  { name: 'Platinum', range: '1800–2200', color: '#a855f7', icon: '🔮' },
  { name: 'Diamond',  range: '2200+',     color: '#00d4ff', icon: '💎' },
];

const BOARD = [
  ['♜','♞','♝','♛','♚','♝','♞','♜'],
  ['♟','♟','♟','♟','♟','♟','♟','♟'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','♙','','',''],
  ['','','♘','','','','',''],
  ['♙','♙','♙','♙','','♙','♙','♙'],
  ['♖','♘','♗','♕','♔','♗','','♖'],
];

export default function LandingPage() {
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      dx: (Math.random() - .5) * .35, dy: (Math.random() - .5) * .35,
      r: Math.random() * 1.3 + .3, op: Math.random() * .3 + .05,
    }));
    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,200,66,${p.op})`; ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className={s.page}>
      <canvas ref={canvasRef} className={s.particles} />

      {/* Nav */}
      <header className={s.header}>
        <div className={s.hlogo}>Knight<span>OS</span></div>
        <div className={s.hlinks}>
          <a href="#features">Features</a>
          <a href="#ranks">Ranks</a>
          <button className="btn btn-outline btn-sm" onClick={() => nav('/auth?mode=login')}>Sign In</button>
          <button className="btn btn-gold btn-sm"    onClick={() => nav('/auth')}>Play Free →</button>
        </div>
      </header>

      {/* Hero */}
      <section className={s.hero}>
        <motion.div className={s.heroL} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7 }}>
          <div className={s.liveBadge}><span className="live-dot" />  Season 4 · Now Live</div>
          <h1 className={s.heroTitle}>The Competitive<br /><span className={s.gold}>Chess Platform</span></h1>
          <p className={s.heroDesc}>Ranked Elo play, AI training, real-time multiplayer, and deep post-game analytics — built for players who take the board seriously.</p>
          <div className={s.ctas}>
            <button className="btn btn-gold btn-xl" onClick={() => nav('/auth')}>Start Playing Free →</button>
            <button className="btn btn-outline btn-lg" onClick={() => nav('/auth?mode=login')}>Sign In</button>
          </div>
          <div className={s.stats}>
            {[['47K','Players'],['312K','Games'],['342','Live Now'],['99.9%','Uptime']].map(([v,l]) => (
              <div key={l} className={s.stat}><strong>{v}</strong><span>{l}</span></div>
            ))}
          </div>
        </motion.div>

        <motion.div className={s.heroR} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, duration: .7 }}>
          <div className={s.boardPrev}>
            {BOARD.map((row, ri) => (
              <div key={ri} className={s.bRow}>
                {row.map((p, ci) => (
                  <div key={ci} className={`${s.bSq} ${(ri+ci)%2===0?s.bLt:s.bDk}`}>{p}</div>
                ))}
              </div>
            ))}
            <div className={s.evalBubble}>+0.3 ↑ White</div>
          </div>

          <motion.div className={s.floatCard} style={{ top: '10%', right: '-8%' }}
            animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <div><div style={{ fontWeight: 700, fontSize: '.82rem' }}>Rank Up!</div><div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Gold → Platinum</div></div>
          </motion.div>

          <motion.div className={s.floatCard} style={{ bottom: '16%', left: '-10%' }}
            animate={{ y: [5, -5, 5] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <div><div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--green)' }}>+18 ELO</div><div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Checkmate win</div></div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className={s.section} id="features">
        <motion.h2 className={s.secTitle} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          Everything a Serious Player Needs
        </motion.h2>
        <div className={s.featGrid}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} className={`card card-hover ${s.featCard}`} onClick={() => nav(f.route)} style={{ cursor: "pointer" }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .07 }}>
              <div className={s.featIcon}>{f.icon}</div>
              <div className={s.featTitle}>{f.title}</div>
              <p className={s.featDesc}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className={s.tiersSection} id="ranks">
        <motion.h2 className={s.secTitle} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          5 Tiers. One Goal: Diamond.
        </motion.h2>
        <div className={s.tierRow}>
          {TIERS.map((t, i) => (
            <motion.div key={t.name} className={`card ${s.tierCard}`} style={{ borderColor: `${t.color}25` }}
              initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * .08 }} whileHover={{ y: -6, scale: 1.04 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{t.icon}</div>
              <div className={s.tierName} style={{ color: t.color }}>{t.name}</div>
              <div className={s.tierRange}>{t.range}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={s.ctaSection}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className={s.ctaTitle}>Ready to Climb the Ranks?</h2>
          <p className={s.ctaSub}>Free forever. No credit card. Play in 30 seconds.</p>
          <button className="btn btn-gold btn-xl" onClick={() => nav('/auth')}>Create Free Account →</button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <span className={s.flogo}>KnightOS</span>
        <span style={{ color: 'var(--muted)', fontSize: '.78rem' }}>© 2024 KnightOS · Built for champions</span>
        <div style={{ display: 'flex', gap: 16, fontSize: '.78rem' }}>
          {['Privacy','Terms','Contact'].map(l => <a key={l} href="#" style={{ color: 'var(--muted)' }}>{l}</a>)}
        </div>
      </footer>
    </div>
  );
}
