import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../store/authStore';
import api from '../services/api';
import s from './ProfilePage.module.css';

const TC: Record<string, string> = { Diamond: '#00d4ff', Platinum: '#a855f7', Gold: '#f5c842', Silver: '#C0C0C0', Bronze: '#CD7F32' };

function RatingChart({ history }: { history: { rating: number; date: string }[] }) {
  if (!history?.length) return null;
  const W = 360, H = 100, P = 12;
  const ratings = history.map(h => h.rating);
  const min = Math.min(...ratings) - 20, max = Math.max(...ratings) + 20;
  const points = history.map((h, i) => {
    const x = P + (i / Math.max(history.length - 1, 1)) * (W - P * 2);
    const y = P + (1 - (h.rating - min) / (max - min)) * (H - P * 2);
    return `${x},${y}`;
  });
  const path = `M ${points.join(' L ')}`;
  const fill = `M ${points[0]} L ${points.join(' L ')} L ${W - P},${H - P} L ${P},${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.chart} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c842" stopOpacity=".35"/>
          <stop offset="100%" stopColor="#f5c842" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#cg)"/>
      <path d={path} fill="none" stroke="#f5c842" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {history.map((_, i) => {
        const [x, y] = points[i].split(',').map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill="#f5c842"/>;
      })}
    </svg>
  );
}

function AccuracyRing({ pct }: { pct: number }) {
  const r = 38, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--cyan)" strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * .25}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }}/>
      <text x="50" y="54" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="700" fontFamily="Space Mono">{pct}%</text>
    </svg>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const target = username || me?.username;

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    api.get(`/users/${target}`)
      .then(r => { setProfile(r.data.data.user); setGames(r.data.data.recentGames || []); })
      .catch(() => {
        // Demo fallback
        setProfile({ ...me, ratingHistory: Array.from({length:10},(_, i)=>({rating: 1200 + i*30, date: new Date(Date.now()-i*7*24*60*60*1000).toISOString()})) });
      })
      .finally(() => setLoading(false));
  }, [target]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><span className="spinner"/></div>;
  if (!profile) return <div style={{ textAlign:'center', padding:80, color:'var(--muted)' }}>User not found</div>;

  const u = profile;
  const gp = u.stats?.gamesPlayed || 0;
  const winRate = gp > 0 ? Math.round((u.stats.wins / gp) * 100) : 0;
  const tierColor = TC[u.rankTier] || 'var(--gold)';

  return (
    <div className="page-wrap">
      {/* Profile header */}
      <motion.div className={`card ${s.header}`} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}>
        <Avatar avatar={u.avatar} username={u.username} size={72} className={s.avatar} />
        <div className={s.info}>
          <div className={s.username}>{u.username}</div>
          <div className={s.meta}>
            <span>{u.country}</span>
            <span style={{ color:'var(--muted)' }}>·</span>
            <span className={`badge`} style={{ color:tierColor, background:`${tierColor}18`, borderColor:`${tierColor}40` }}>{u.rankTier}</span>
            <span className={`badge badge-${u.plan==='elite'?'cyan':u.plan==='premium'?'purple':'silver'}`}>{u.plan.toUpperCase()}</span>
            {u.isOnline && <span className={s.onlinePill}><span className="live-dot"/> Online</span>}
          </div>
          {u.badges?.length > 0 && (
            <div className={s.badges}>
              {u.badges.map((b: string) => <span key={b} className="badge badge-gold">{b}</span>)}
            </div>
          )}
        </div>
        <div className={s.ratingBlock}>
          <div className={s.ratingBig} style={{ color: tierColor }}>{u.rating}</div>
          <div className={s.ratingLbl}>ELO RATING</div>
        </div>
      </motion.div>

      <div className={s.grid}>
        {/* Stats */}
        <motion.div className={`card ${s.statsCard}`} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 }}>
          <div className="sec-hdr">Statistics</div>
          <div className={s.statsGrid}>
            {[
              { l:'Games Played', v:gp,              c:'' },
              { l:'Wins',         v:u.stats?.wins,   c:'var(--green)' },
              { l:'Losses',       v:u.stats?.losses, c:'var(--red)'   },
              { l:'Draws',        v:u.stats?.draws,  c:'var(--muted)' },
              { l:'Win Rate',     v:`${winRate}%`,   c:winRate>50?'var(--green)':'var(--text)' },
              { l:'Best Streak',  v:u.stats?.bestStreak, c:'var(--gold)' },
            ].map(({ l, v, c }) => (
              <div key={l} className={s.statBox}>
                <div className={s.statVal} style={{ color:c||'var(--text)' }}>{v ?? '—'}</div>
                <div className={s.statLbl}>{l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Accuracy ring */}
        <motion.div className={`card ${s.accuracyCard}`} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}>
          <div className="sec-hdr">Accuracy</div>
          <div className={s.ringWrap}>
            <AccuracyRing pct={u.stats?.accuracy || 0} />
            <div className={s.ringLabel}>Average<br/>Move Accuracy</div>
          </div>
        </motion.div>

        {/* Rating chart */}
        <motion.div className={`card ${s.chartCard}`} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:.12 }}>
          <div className="sec-hdr">Rating History</div>
          <div className={s.chartWrap}>
            {u.ratingHistory?.length > 1
              ? <RatingChart history={u.ratingHistory} />
              : <div style={{ color:'var(--dim)', fontSize:'.8rem', textAlign:'center', padding:'32px 0' }}>Play more games to see chart</div>}
          </div>
        </motion.div>

        {/* Recent games */}
        <motion.div className={`card ${s.gamesCard}`} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15 }}>
          <div className="sec-hdr">Recent Games</div>
          {games.length === 0
            ? <div className={s.noGames}>No games yet</div>
            : games.map((g: any, i: number) => {
                const isW = g.white?._id === u._id || g.white === u._id;
                const opp = isW ? g.black : g.white;
                const res = g.result;
                const won  = (isW && res==='1-0') || (!isW && res==='0-1');
                const draw = res === '1/2-1/2';
                return (
                  <div key={i} className={s.gameRow}>
                    <div className={`${s.gameResult} ${won?s.win:draw?s.draw:s.loss}`}>
                      {won ? 'W' : draw ? 'D' : 'L'}
                    </div>
                    <div className={s.gameInfo}>
                      <div className={s.gameOpp}>vs {opp?.username || '?'}</div>
                      <div className={s.gameMeta}>{g.termination?.replace(/_/g,' ')} · {g.timeControl?.initial}s</div>
                    </div>
                    <div className={s.gameMoves}>{g.moves?.length || 0} moves</div>
                  </div>
                );
              })}
        </motion.div>
      </div>
    </div>
  );
}
