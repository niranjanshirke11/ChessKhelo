// ============================================================================
// ChessKhelo — Game Page (Play vs AI Only)
// ============================================================================
// No multiplayer. No Socket.IO. Just chess vs Stockfish AI.
// The AI runs entirely in the browser via a Web Worker (stockfish.js).
// ============================================================================

import { Chess } from 'chess.js';
import Avatar from '../components/Avatar';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { useAuth } from '../store/authStore';
import { getStockfish, DIFFICULTY_LEVELS } from '../services/stockfish';
import { sounds } from '../services/sounds';
import ChessBoard from '../components/Board/ChessBoard';
import s from './GamePage.module.css';

// Time control options (ms seconds)
const TIME_CONTROLS = [
  { label: 'Bullet',    tc: '60+0',   icon: '⚡', ms: 60,  inc: 0  },
  { label: 'Blitz',     tc: '180+0',  icon: '🔥', ms: 180, inc: 0  },
  { label: 'Rapid',     tc: '600+0',  icon: '⏱',  ms: 600, inc: 0  },
  { label: 'Classical', tc: '900+10', icon: '♟',  ms: 900, inc: 10 },
];

const DIFF_COLORS = ['','#00ff88','#55ff99','#aaee66','#f5c842','#ffaa33','#ff7744','#ff4466','#aa00ff'];
const TIER_COLORS: Record<string, string> = {
  Diamond: '#00d4ff', Platinum: '#a855f7', Gold: '#f5c842', Silver: '#C0C0C0', Bronze: '#CD7F32',
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GamePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const game = useGame();
  const sf = getStockfish();

  // Game settings
  const [selectedTC, setSelectedTC] = useState('600+0');
  const [aiDifficulty, setAiDifficulty] = useState(4);

  // UI state
  const [aiThinking, setAiThinking] = useState(false);
  const [sfReady, setSfReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Chat
  const [chatMsg, setChatMsg] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // Refs for AI move handling
  const clockRef = useRef<ReturnType<typeof setInterval>>();
  const aiLock = useRef(false);

  // ── Stockfish init ─────────────────────────────────────────
  useEffect(() => {
    sf.init().then(() => setSfReady(true)).catch(() => {});
  }, []);

  // ── Sound toggle ───────────────────────────────────────────
  useEffect(() => { sounds.setEnabled(soundOn); }, [soundOn]);

  // ── Clock ticker ───────────────────────────────────────────
  useEffect(() => {
    if (game.phase === 'playing') clockRef.current = setInterval(() => game.tick(), 1000);
    else clearInterval(clockRef.current);
    return () => clearInterval(clockRef.current);
  }, [game.phase]);

  // ── Eval bar update ────────────────────────────────────────
  useEffect(() => {
    if (game.phase !== 'playing') return;
    sf.evaluate(game.chess.fen(), 8, (r) => {
      const score = r.mate
        ? (r.mate > 0 ? 10 : -10)
        : Math.max(-10, Math.min(10, r.score));
      game.setEval(score);
    });
  }, [game.fen]);

  // ── AI move engine ─────────────────────────────────────────
  // Triggers when it's Black's turn (player plays White)
  useEffect(() => {
    if (game.phase !== 'playing' || game.chess.turn() !== 'b' || aiLock.current) return;
    aiLock.current = true;
    setAiThinking(true);

    const diff = DIFFICULTY_LEVELS[aiDifficulty - 1];
    const fen = game.chess.fen();

    setTimeout(async () => {
      try {
        if (sfReady) {
          // Stockfish AI move
          sf.setSkillLevel(diff.skill);
          const r = await sf.getBestMove(fen, diff.depth);
          if (r.bestMove && r.bestMove !== '(none)') {
            game.receiveMove(r.bestMove.slice(0, 2), r.bestMove.slice(2, 4), r.bestMove[4] || 'q');
          }
        } else {
          // Fallback: random move if Stockfish not loaded
          const c = new Chess(fen);
          const mvs = c.moves({ verbose: true });
          mvs.sort(() => Math.random() - 0.5);
          const mv = mvs[Math.floor(Math.random() * Math.min(mvs.length, Math.max(1, 8 - aiDifficulty)))];
          if (mv) game.receiveMove(mv.from, mv.to, mv.promotion || 'q');
        }
        // Check for game end after AI move
        setTimeout(() => {
          if (game.chess.isCheckmate()) game.endGame('0-1', 'checkmate', -15);
          else if (game.chess.isDraw())  game.endGame('1/2-1/2', 'draw', 0);
        }, 100);
      } catch (_) {}

      setAiThinking(false);
      aiLock.current = false;
    }, 400 + Math.random() * 400);  // Human-like thinking delay
  }, [game.fen, sfReady, aiDifficulty]);

  // ── Check for player winning after their move ──────────────
  useEffect(() => {
    if (game.phase !== 'playing' || game.chess.turn() !== 'b') return;
    if (game.chess.isCheckmate()) {
      setTimeout(() => { game.endGame('1-0', 'checkmate', 20); }, 200);
    } else if (game.chess.isDraw()) {
      setTimeout(() => { game.endGame('1/2-1/2', 'draw', 0); }, 200);
    }
  }, [game.fen]);

  // ── Auto-scroll chat ───────────────────────────────────────
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [game.chat]);

  // ── Start a new AI game ────────────────────────────────────
  const startAiGame = () => {
    sounds.resume();
    const tc = TIME_CONTROLS.find(t => t.tc === selectedTC)!;
    const diff = DIFFICULTY_LEVELS[aiDifficulty - 1];
    aiLock.current = false;
    game.initGame('ai-game', 'white', { username: `🤖 ${diff.label}`, rating: diff.elo }, tc.ms, tc.inc);
  };

  // ── Resign ─────────────────────────────────────────────────
  const resign = () => {
    if (!window.confirm('Resign this game?')) return;
    game.endGame('0-1', 'resignation', -10);
  };

  // ── Chat (with bot replies) ────────────────────────────────
  const sendChat = () => {
    if (!chatMsg.trim()) return;
    game.addChat({ userId: user?.id || '', username: user?.username || 'You', message: chatMsg.trim(), timestamp: new Date() });
    const replies = ['Good move! 🤖', 'Interesting...', 'Calculating...', '♟ Nice!', 'I see your strategy...'];
    setTimeout(() => game.addChat({
      userId: 'bot', username: '🤖 Bot',
      message: replies[Math.floor(Math.random() * replies.length)],
      timestamp: new Date(),
    }), 900);
    setChatMsg('');
  };

  // ── Go to analysis page ────────────────────────────────────
  const goToAnalysis = () => {
    const currentMoves = useGame.getState().moves;
    if (!currentMoves.length) { alert('No moves to analyze yet!'); return; }
    const tmp = new Chess();
    const movesWithFen = currentMoves.map(m => {
      const fen = tmp.fen();
      try { tmp.move(m.san); } catch (_) {}
      return { san: m.san, fen };
    });
    sessionStorage.setItem('analysis_moves', JSON.stringify(movesWithFen));
    sessionStorage.setItem('analysis_result', useGame.getState().result || '');
    navigate('/app/analysis');
  };

  // ══════════════════════════════════════════════════════════
  // ─── RENDER: IDLE (Lobby) ─────────────────────────────────
  // ══════════════════════════════════════════════════════════
  if (game.phase === 'idle') return (
    <div className={s.page}>
      <div className={s.lobby}>
        <motion.div className={s.lobbyCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className={s.lobbyTitle}>♟ Play vs AI</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '1.2rem', textAlign: 'center' }}>
            Challenge Stockfish at your level. No internet needed — runs in your browser!
          </p>

          {/* Time Control */}
          <div style={{ marginBottom: '1rem' }}>
            <div className="sec-hdr" style={{ marginBottom: '.6rem' }}>⏱ Time Control</div>
            <div className={s.tcGrid}>
              {TIME_CONTROLS.map(tc => (
                <motion.button key={tc.tc}
                  className={`${s.tcCard}${selectedTC === tc.tc ? ' ' + s.tcSel : ''}`}
                  onClick={() => setSelectedTC(tc.tc)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: .97 }}>
                  <span className={s.tcIcon}>{tc.icon}</span>
                  <span className={s.tcLabel}>{tc.label}</span>
                  <span className={s.tcTime}>{tc.tc}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          <div className={s.aiSection}>
            <div className={s.aiHeader}>
              <span>🤖 AI Difficulty</span>
              {sfReady
                ? <span className={s.sfReady}>⚡ Stockfish Ready</span>
                : <span className={s.sfLoading}>Loading engine...</span>}
            </div>
            <div className={s.diffGrid}>
              {DIFFICULTY_LEVELS.map(d => (
                <motion.button key={d.level}
                  className={`${s.diffCard}${aiDifficulty === d.level ? ' ' + s.diffSel : ''}`}
                  style={aiDifficulty === d.level ? { borderColor: DIFF_COLORS[d.level], boxShadow: `0 0 12px ${DIFF_COLORS[d.level]}33` } : {}}
                  onClick={() => setAiDifficulty(d.level)}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }}>
                  <span className={s.diffLevel} style={{ color: DIFF_COLORS[d.level] }}>{d.level}</span>
                  <span className={s.diffLabel}>{d.label}</span>
                  <span className={s.diffElo}>{d.elo}</span>
                </motion.button>
              ))}
            </div>
            <button className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '1rem' }} onClick={startAiGame}>
              Play vs {DIFFICULTY_LEVELS[aiDifficulty - 1].label} ({DIFFICULTY_LEVELS[aiDifficulty - 1].elo} ELO) →
            </button>
          </div>
        </motion.div>

        {/* Sidebar: your stats */}
        {user && (
          <motion.div className={`card ${s.statsCard}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15 }}>
            <div className="sec-hdr">Your Stats</div>
            <div className={s.statsBody}>
              <div className={s.ratingDisplay}>
                <div className={s.ratingNum} style={{ color: TIER_COLORS[user.rankTier] }}>{user.rating}</div>
                <div className={s.ratingLabel}>ELO RATING</div>
                <span className="badge" style={{ color: TIER_COLORS[user.rankTier], fontSize: '.65rem' }}>{user.rankTier}</span>
              </div>
              <div className={s.statGrid}>
                {[
                  { l: 'Games', v: user.stats.gamesPlayed },
                  { l: 'Wins',  v: user.stats.wins,   c: 'var(--green)' },
                  { l: 'Losses',v: user.stats.losses, c: 'var(--red)' },
                  { l: 'Streak',v: user.stats.winStreak },
                ].map(({ l, v, c }) => (
                  <div key={l} className={s.miniStat}><strong style={{ color: c }}>{v}</strong><span>{l}</span></div>
                ))}
              </div>
            </div>
            <div className={s.soundToggle}>
              <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Sound</span>
              <button className={`btn btn-sm ${soundOn ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setSoundOn(!soundOn)}>
                {soundOn ? '🔊 On' : '🔇 Off'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // ─── RENDER: PLAYING ──────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  const isWhite = game.playerColor === 'white';
  const oppTime = isWhite ? game.timeB : game.timeW;
  const myTime  = isWhite ? game.timeW : game.timeB;
  const evalPct = Math.max(5, Math.min(95, 50 + game.evalScore * 4));

  return (
    <div className={s.page}>
      <div className={s.gameLayout}>

        {/* Eval bar */}
        <div className={s.evalBar}>
          <div className={s.evalWhite} style={{ height: `${100 - evalPct}%` }} />
          <div className={s.evalBlack} style={{ height: `${evalPct}%` }} />
          <div className={s.evalLabel}>{game.evalScore > 0 ? `+${game.evalScore.toFixed(1)}` : game.evalScore.toFixed(1)}</div>
        </div>

        <div className={s.centerCol}>
          {/* Opening name */}
          <AnimatePresence>
            {game.opening && (
              <motion.div className={s.openingBadge}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                📖 {game.opening}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Opponent (AI) — top */}
          <div className={s.playerBar}>
            <div className={s.playerInfo}>
              <span className={s.playerAv} style={{ background: 'var(--card2)' }}>🤖</span>
              <div>
                <div className={s.playerName}>
                  {game.opponent?.username || '🤖 AI'}
                  {aiThinking && <span style={{ color: 'var(--cyan)', fontSize: '.7rem', marginLeft: 8 }}>thinking...</span>}
                </div>
                <div className={s.playerElo}>{game.opponent?.rating} ELO</div>
              </div>
            </div>
            <div className={`${s.clock}${game.phase === 'playing' && (isWhite ? game.chess.turn() === 'b' : game.chess.turn() === 'w') ? ' ' + s.clockActive : ''}`}>
              {fmt(oppTime)}
            </div>
          </div>

          <ChessBoard />

          {/* Me (player) — bottom */}
          <div className={s.playerBar}>
            <div className={s.playerInfo}>
              <span className={s.playerAv} style={{ background: user?.avatar?.startsWith('http') ? 'transparent' : 'linear-gradient(135deg,var(--gold),var(--gold2))' }}>
                <Avatar avatar={user?.avatar || '♟'} username={user?.username || ''} size={24} />
              </span>
              <div>
                <div className={s.playerName}>
                  {user?.username} <span style={{ color: 'var(--muted)', fontSize: '.72rem' }}>(You)</span>
                </div>
                <div className={s.playerElo}>
                  {user?.rating} ELO
                  {game.increment > 0 && <span style={{ color: 'var(--cyan)', fontSize: '.65rem' }}> +{game.increment}s</span>}
                </div>
              </div>
            </div>
            <div className={`${s.clock}${game.phase === 'playing' && (isWhite ? game.chess.turn() === 'w' : game.chess.turn() === 'b') ? ' ' + s.clockActive : ''}`}>
              {fmt(myTime)}
            </div>
          </div>

          {/* In-game controls */}
          {game.phase === 'playing' && (
            <div className={s.controls}>
              <button className="btn btn-ghost btn-sm" onClick={() => game.flip()}>🔄 Flip</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSoundOn(v => !v)}>{soundOn ? '🔊' : '🔇'}</button>
              <button className="btn btn-danger btn-sm" onClick={resign}>🏳 Resign</button>
            </div>
          )}
        </div>

        {/* Right column: moves + chat */}
        <div className={s.rightCol}>
          <div className={`card ${s.movePanel}`}>
            <div className="sec-hdr">Moves</div>
            <div className={s.moveList}>
              {Array.from({ length: Math.ceil(game.moves.length / 2) }, (_, i) => (
                <div key={i} className={s.moveRow}>
                  <span className={s.moveNum}>{i + 1}.</span>
                  <span className={s.moveSan}>{game.moves[i * 2]?.san}</span>
                  <span className={s.moveSan}>{game.moves[i * 2 + 1]?.san}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`card ${s.chatPanel}`}>
            <div className="sec-hdr">Chat</div>
            <div className={s.chatMessages} ref={chatRef}>
              {game.chat.length === 0 && <div className={s.chatEmpty}>Say something to the bot...</div>}
              {game.chat.map((m, i) => (
                <div key={i} className={`${s.chatMsg}${m.userId === user?.id ? ' ' + s.mine : ''}`}>
                  {m.userId !== 'system' && <span className={s.chatUser}>{m.userId === user?.id ? 'You' : m.username}</span>}
                  <span className={s.chatText}>{m.message}</span>
                </div>
              ))}
            </div>
            <div className={s.chatInput}>
              <input className="input" placeholder="Chat with bot..." value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()} maxLength={200} />
              <button className="btn btn-gold btn-sm" onClick={sendChat}>Send</button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Over overlay */}
      <AnimatePresence>
        {game.phase === 'ended' && (
          <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={s.resultCard}
              initial={{ scale: .85, y: 30 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20 }}>
              <div className={s.resultEmoji}>
                {game.result === '1-0' ? '🏆' : game.result === '0-1' ? '😔' : '🤝'}
              </div>
              <div className={s.resultTitle}>
                {game.result === '1/2-1/2' ? 'Draw!' : game.result === '1-0' ? 'You Won! 🎉' : 'You Lost'}
              </div>
              <div className={s.resultSub}>{game.termination?.replace(/_/g, ' ')}</div>
              {!!game.eloChange && (
                <div className={s.eloChange} style={{ color: (game.eloChange || 0) > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(game.eloChange || 0) > 0 ? '+' : ''}{game.eloChange} ELO
                </div>
              )}

              <div className={s.resultBtns}>
                <button className="btn btn-gold btn-lg" onClick={startAiGame}>↺ Play Again</button>
                {game.moves.length > 4 && (
                  <button className="btn btn-outline" onClick={goToAnalysis}>📊 Analyze Game</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => game.reset()}>← Back to Lobby</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
