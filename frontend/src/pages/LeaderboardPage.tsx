import { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import s from './LeaderboardPage.module.css';

const TIERS = ['all','Diamond','Platinum','Gold','Silver','Bronze'];
const TC: Record<string, string> = { Diamond: '#00d4ff', Platinum: '#a855f7', Gold: '#f5c842', Silver: '#C0C0C0', Bronze: '#CD7F32' };
const TIER_EMOJI: Record<string, string> = { Diamond: '💎', Platinum: '🔮', Gold: '🥇', Silver: '🥈', Bronze: '🥉' };

// Demo players for offline / before API loads
const DEMO_PLAYERS = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1, id: `p${i}`,
  username: ['DeepBlue_X','KasparovBot','RookSlayer','PawnStorm','NightRider','BishopKing','QueenTrap','KnightFork','CheckMate9','EndgameGod','TacticsWiz','OpeningBook','BlitzKing','RapidFire','ClassicalPro','SicilianDef','KingHunt','PawnPusher','RookEndgame','DrawOffer'][i],
  rating: 2450 - i * 42,
  rankTier: i < 3 ? 'Diamond' : i < 7 ? 'Platinum' : i < 13 ? 'Gold' : 'Silver',
  avatar: ['♔','♕','♖','♗','♘','♟','♚','♛','♜','♝','♞','♟','♔','♕','♖','♗','♘','♟','♔','♕'][i],
  country: ['🇮🇳','🇺🇸','🇩🇪','🇷🇺','🇨🇳','🇧🇷','🇫🇷','🇯🇵','🇬🇧','🇦🇺','🇰🇷','🇨🇦','🇮🇳','🇺🇸','🇩🇪','🇷🇺','🇨🇳','🇧🇷','🇫🇷','🇯🇵'][i],
  winRate: 72 - i * 1.5, gamesPlayed: 312 - i * 8, winStreak: Math.max(0, 12 - i),
  isOnline: Math.random() > .5,
}));

export default function LeaderboardPage() {
  const nav = useNavigate();
  const [tier, setTier] = useState('all');
  const [players, setPlayers] = useState<any[]>(DEMO_PLAYERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/leaderboard?tier=${tier}`)
      .then(r => { if (r.data?.data?.players?.length) setPlayers(r.data.data.players); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tier]);

  const filtered = tier === 'all' ? players : players.filter(p => p.rankTier === tier);

  return (
    <div className="page-wrap">
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-sub">Top ranked players globally — updated every 60 seconds</p>

      {/* Tier filter */}
      <div className={s.filters}>
        {TIERS.map(t => (
          <button key={t} className={`${s.filterBtn}${tier===t?' '+s.active:''}`} onClick={() => setTier(t)}>
            {t === 'all' ? '🌍 All Tiers' : `${TIER_EMOJI[t]} ${t}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={`card ${s.tableWrap}`}>
        <div className={s.tableHead}>
          <div className={s.thRank}>#</div>
          <div className={s.thPlayer}>Player</div>
          <div className={s.thRating}>Rating</div>
          <div className={s.thTier}>Tier</div>
          <div className={s.thWr}>Win Rate</div>
          <div className={s.thGames}>Games</div>
          <div className={s.thStreak}>Streak</div>
          <div className={s.thStatus}>Status</div>
        </div>

        {loading && <div className={s.loadRow}><span className="spinner" /></div>}

        {filtered.map((p, i) => (
          <motion.div key={p.id} className={`${s.row}${i % 2 === 0 ? ' ' + s.even : ''}`}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .025 }}
            onClick={() => nav(`/app/profile/${p.username}`)}>
            <div className={s.thRank}>
              {p.rank <= 3
                ? <span className={s.medal}>{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</span>
                : <span className={s.rankNum}>{p.rank}</span>}
            </div>
            <div className={s.thPlayer}>
              <Avatar avatar={p.avatar} username={p.username} size={36} className={s.playerAvatar} />
              <div>
                <div className={s.playerName}>{p.username}</div>
                <div className={s.playerCountry}>{p.country}</div>
              </div>
            </div>
            <div className={s.thRating}>
              <span className={s.ratingVal} style={{ color: TC[p.rankTier] || 'var(--gold)' }}>{p.rating}</span>
            </div>
            <div className={s.thTier}>
              <span className={`badge`} style={{ color: TC[p.rankTier], background: `${TC[p.rankTier]}18`, borderColor: `${TC[p.rankTier]}40`, fontSize: '.62rem' }}>
                {TIER_EMOJI[p.rankTier]} {p.rankTier}
              </span>
            </div>
            <div className={s.thWr}>
              <div className={s.wrBar}>
                <div className={s.wrFill} style={{ width: `${p.winRate}%` }} />
              </div>
              <span>{Math.round(p.winRate)}%</span>
            </div>
            <div className={s.thGames}><span className="mono">{p.gamesPlayed}</span></div>
            <div className={s.thStreak}>
              {p.winStreak > 0 && <span className={s.streakPill}>🔥 {p.winStreak}</span>}
            </div>
            <div className={s.thStatus}>
              {p.isOnline ? <span className={s.online}><span className="live-dot" /> Live</span> : <span className={s.offline}>Offline</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
