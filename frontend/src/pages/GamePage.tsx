import { Chess } from 'chess.js';
import Avatar from '../components/Avatar';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { useAuth } from '../store/authStore';
import { getSocket } from '../services/socket';
import { getStockfish, DIFFICULTY_LEVELS } from '../services/stockfish';
import { sounds } from '../services/sounds';
import ChessBoard from '../components/Board/ChessBoard';
import s from './GamePage.module.css';

const TIME_CONTROLS = [
  { label: 'Bullet',    tc: '60+0',   icon: '⚡', ms: 60,  inc: 0  },
  { label: 'Blitz',     tc: '180+0',  icon: '🔥', ms: 180, inc: 0  },
  { label: 'Rapid',     tc: '600+0',  icon: '⏱',  ms: 600, inc: 0  },
  { label: 'Classical', tc: '900+10', icon: '♟',  ms: 900, inc: 10 },
];

const REACTIONS = ['👏','😮','🔥','😂','🤔','💪','😤','🎯','♟','⚡'];
const DIFF_COLORS = ['','#00ff88','#55ff99','#aaee66','#f5c842','#ffaa33','#ff7744','#ff4466','#aa00ff'];
const TIER_COLORS: Record<string,string> = { Diamond:'#00d4ff', Platinum:'#a855f7', Gold:'#f5c842', Silver:'#C0C0C0', Bronze:'#CD7F32' };

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

export default function GamePage() {
  const { gameId: urlGameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const game = useGame();
  const socket = getSocket();
  const sf = getStockfish();

  const [selectedTC, setSelectedTC] = useState('600+0');
  const [chatMsg, setChatMsg] = useState('');
  const [isAiGame, setIsAiGame] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(4);
  const [aiThinking, setAiThinking] = useState(false);
  const [sfReady, setSfReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [rematchStatus, setRematchStatus] = useState<'idle'|'offered'|'waiting'|'declined'>('idle');
  const [waitingForFriend, setWaitingForFriend] = useState(false);
  const [liveGames, setLiveGames] = useState<any[]>([]);
  const [spectateTab, setSpectateTab] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<ReturnType<typeof setInterval>>();
  const aiLock = useRef(false);
  const gameMovesRef = useRef<Array<{fen:string;san:string}>>([]);

  // Init Stockfish
  useEffect(() => {
    sf.init().then(() => setSfReady(true)).catch(() => {});
  }, []);

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [game.chat]);

  useEffect(() => {
    sounds.setEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    if (game.phase === 'playing') clockRef.current = setInterval(() => game.tick(), 1000);
    else clearInterval(clockRef.current);
    return () => clearInterval(clockRef.current);
  }, [game.phase]);

  // Eval bar
  useEffect(() => {
    if (game.phase !== 'playing') return;
    sf.evaluate(game.chess.fen(), 8, (r) => {
      const score = r.mate ? (r.mate > 0 ? 10 : -10) : Math.max(-10, Math.min(10, r.score));
      game.setEval(score);
    });
    // Track moves for analysis
    if (game.moves.length > 0) {
      const lm = game.moves[game.moves.length-1];
      gameMovesRef.current = game.moves.map(m => ({ fen: game.fen, san: m.san }));
    }
  }, [game.fen]);

  // AI move
  useEffect(() => {
    if (!isAiGame || game.phase !== 'playing' || game.chess.turn() !== 'b' || aiLock.current) return;
    aiLock.current = true;
    setAiThinking(true);
    const diff = DIFFICULTY_LEVELS[aiDifficulty-1];
    const fen = game.chess.fen();

    setTimeout(async () => {
      try {
        if (sfReady) {
          sf.setSkillLevel(diff.skill);
          const r = await sf.getBestMove(fen, diff.depth);
          if (r.bestMove && r.bestMove !== '(none)') {
            game.receiveMove(r.bestMove.slice(0,2), r.bestMove.slice(2,4), r.bestMove[4] || 'q');
          }
        } else {
          
          const c = new Chess(fen);
          const mvs = c.moves({ verbose: true });
          mvs.sort(() => Math.random() - 0.5);
          const mv = mvs[Math.floor(Math.random() * Math.min(mvs.length, Math.max(1, 8-aiDifficulty)))];
          if (mv) game.receiveMove(mv.from, mv.to, mv.promotion || 'q');
        }
        setTimeout(() => {
          if (game.chess.isCheckmate()) game.endGame('0-1','checkmate',-15);
          else if (game.chess.isDraw()) game.endGame('1/2-1/2','draw',0);
        }, 100);
      } catch {}
      setAiThinking(false);
      aiLock.current = false;
    }, 400 + Math.random()*400);
  }, [game.fen, isAiGame, sfReady, aiDifficulty]);

  // Player checkmate check
  useEffect(() => {
    if (!isAiGame || game.phase !== 'playing' || game.chess.turn() !== 'b') return;
    if (game.chess.isCheckmate()) setTimeout(() => { game.endGame('1-0','checkmate',20); useAuth.getState().refreshUser(); }, 200);
    else if (game.chess.isDraw()) setTimeout(() => { game.endGame('1/2-1/2','draw',0); useAuth.getState().refreshUser(); }, 200);
  }, [game.fen]);

  // On mount: check if we navigated here to accept a friend challenge
  // Acceptor stores {fromUserId, timeControl} before navigating
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingChallenge');
    if (raw) {
      sessionStorage.removeItem('pendingChallenge');
      try {
        const { fromUserId, timeControl } = JSON.parse(raw);
        // Give socket a tick to settle, then emit accept
        setTimeout(() => {
          console.log('[GamePage] emitting friend:challenge_accept', fromUserId, timeControl);
          getSocket().emit('friend:challenge_accept', { fromUserId, timeControl });
        }, 300);
      } catch (e) { console.error('pendingChallenge parse error', e); }
    }
    // Challenger: show waiting screen
    if (sessionStorage.getItem('friendChallengeWaiting') === '1') {
      setWaitingForFriend(true);
      sessionStorage.removeItem('friendChallengeWaiting');
    }
  }, []);

  // Emit moves to server when move list changes (multiplayer only, not spectator)
  const prevMovesLen = useRef(0);
  useEffect(() => {
    if (isAiGame || !game.gameId || game.phase !== 'playing') return;
    if (game.isSpectator) return; // spectators never emit moves
    const moves = game.moves;
    if (moves.length > prevMovesLen.current) {
      const last = moves[moves.length - 1];
      const myColor = game.playerColor === 'white' ? 'w' : 'b';
      if (last.color === myColor) {
        socket.emit('game:move', { gameId: game.gameId, from: last.from, to: last.to, promotion: 'q' });
        // Check if this move ended the game → report to server to save stats
        const chess = game.chess;
        if (chess.isCheckmate()) {
          const result = last.color === 'w' ? '1-0' : '0-1';
          socket.emit('game:report_result', { gameId: game.gameId, result, termination: 'checkmate' });
        } else if (chess.isStalemate()) {
          socket.emit('game:report_result', { gameId: game.gameId, result: '1/2-1/2', termination: 'stalemate' });
        } else if (chess.isDraw()) {
          socket.emit('game:report_result', { gameId: game.gameId, result: '1/2-1/2', termination: 'draw' });
        }
      }
      prevMovesLen.current = moves.length;
    }
  }, [game.moves.length, game.isSpectator]);

  // Socket listeners
  useEffect(() => {
    socket.on('matchmaking:found', ({ gameId, color, timeControl, increment, opponent }) => {
      console.log('[matchmaking:found]', gameId, color, opponent);
      const [ms] = timeControl.split('+').map(Number);
      setIsAiGame(false);
      setRematchStatus('idle');
      setWaitingForFriend(false);
      prevMovesLen.current = 0;
      gameMovesRef.current = [];
      sounds.resume(); // unlock AudioContext on game start
      useGame.getState().initGame(gameId, color, opponent, ms, increment || 0);
      socket.emit('game:join', { gameId }); // join room (no spectate flag = real player)
    });

    // matchmaking:searching - show searching screen while in queue
    socket.on('matchmaking:searching', () => {
      useGame.getState().setSearching();
    });

    // ── Spectator ONLY: receive current game state on join ──
    // Real players NEVER get this event (backend only sends it when spectate=true)
    socket.on('game:state', ({ game }: any) => {
      if (!game) return;
      // Backend only sends this when spectate:true — safe to always process
      const whiteName = game.white?.username || 'White';
      const blackName = game.black?.username || 'Black';
      const whiteRating = game.white?.rating || 1200;
      const blackRating = game.black?.rating || 1200;
      const moveList = game.moves || game.moveList || [];
      const fen = game.fen || 'start';
      console.log('[Spectator] game:state received — moves:', moveList.length, 'fen:', fen, 'white:', whiteName, 'black:', blackName);
      useGame.getState().initSpectator(
        game.gameId, whiteName, blackName,
        fen, moveList,
        whiteRating, blackRating
      );
    });

    socket.on('friend:challenge_declined', () => {
      setWaitingForFriend(false);
      sessionStorage.removeItem('friendChallengeWaiting');
      useGame.getState().reset();
    });

    socket.on('friend:challenge_failed', () => {
      setWaitingForFriend(false);
      sessionStorage.removeItem('friendChallengeWaiting');
    });
    socket.on('game:move', ({ from, to, promotion }) => {
      console.log('[game:move received]', from, to);
      useGame.getState().receiveMove(from, to, promotion);
    });
    socket.on('game:end', ({ result, termination }) => {
      useGame.getState().endGame(result, termination, 0);
      // Refresh user profile so ELO + wins/losses update in navbar and profile
      setTimeout(() => {
        useAuth.getState().refreshUser();
      }, 1000);
    });
    socket.on('game:chat', (msg) => useGame.getState().addChat({ ...msg, timestamp: new Date(msg.timestamp) }));
    socket.on('game:offer_draw', ({ username }) => {
      if (window.confirm(`${username} offered a draw. Accept?`)) socket.emit('game:accept_draw', { gameId: game.gameId });
    });
    socket.on('game:reaction', (r) => { game.addReaction(r); sounds.reaction(); });
    socket.on('game:spectators', ({ count }) => game.setSpectators(count));
    socket.on('game:rematch_offered', ({ username }) => {
      setRematchStatus('offered');
      game.addChat({ userId:'system', username:'System', message:`${username} offered a rematch!`, timestamp: new Date() });
    });
    socket.on('game:rematch_start', ({ gameId, color, timeControl, increment, opponent }) => {
      const [ms] = timeControl.split('+').map(Number);
      setIsAiGame(false); setRematchStatus('idle');
      useGame.getState().initGame(gameId, color, opponent, ms, increment || 0);
      socket.emit('game:join', { gameId });
      gameMovesRef.current = [];
      prevMovesLen.current = 0;
    });
    socket.on('game:rematch_declined', () => setRematchStatus('declined'));
    socket.on('spectate:list', (games) => setLiveGames(games));
    if (urlGameId) {
      // Direct URL navigation — join as spectator
      setTimeout(() => socket.emit('game:join', { gameId: urlGameId, spectate: true }), 150);
    }
    return () => {
      ['matchmaking:found','matchmaking:searching','game:state','game:move','game:end','game:chat','game:offer_draw','friend:challenge_waiting','friend:challenge_declined','friend:challenge_failed',
       'game:reaction','game:spectators','game:rematch_offered','game:rematch_start',
       'game:rematch_declined','spectate:list'].forEach(e => socket.off(e));
    };
  }, []);

  const startSearch = () => {
    setIsAiGame(false);
    game.reset();
    gameMovesRef.current = [];
    prevMovesLen.current = 0;
    // Resume AudioContext on user gesture
    sounds.resume();
    if (!socket.connected) {
      socket.connect();
      socket.once('connect', () => {
        socket.emit('matchmaking:join', { timeControl: selectedTC });
        game.setSearching();
      });
    } else {
      socket.emit('matchmaking:join', { timeControl: selectedTC });
      game.setSearching();
    }
  };

  const startAiGame = () => {
    sounds.resume();
    const tc = TIME_CONTROLS.find(t => t.tc === selectedTC)!;
    const diff = DIFFICULTY_LEVELS[aiDifficulty-1];
    aiLock.current = false; setIsAiGame(true); gameMovesRef.current = [];
    game.initGame('ai-game', 'white', { username: `🤖 ${diff.label}`, rating: diff.elo }, tc.ms, tc.inc);
  };

  const resign = () => {
    if (!window.confirm('Resign?')) return;
    if (isAiGame) { game.endGame('0-1','resignation',-10); useAuth.getState().refreshUser(); }
    else if (game.gameId) socket.emit('game:resign', { gameId: game.gameId });
  };

  const sendReaction = (emoji: string) => {
    game.addReaction({ userId: user?.id||'', username: user?.username||'You', emoji });
    if (!isAiGame && game.gameId) socket.emit('game:reaction', { gameId: game.gameId, emoji });
    else if (isAiGame) {
      setTimeout(() => {
        const botReactions = ['😤','🤔','😮','♟'];
        game.addReaction({ userId:'bot', username:'🤖 Bot', emoji: botReactions[Math.floor(Math.random()*botReactions.length)] });
      }, 800);
    }
    setShowReactions(false);
  };

  const offerRematch = () => {
    if (!game.gameId || isAiGame) { startAiGame(); return; }
    socket.emit('game:rematch_offer', { gameId: game.gameId });
    setRematchStatus('waiting');
  };

  const acceptRematch = () => {
    if (game.gameId) socket.emit('game:rematch_accept', { gameId: game.gameId });
    setRematchStatus('idle');
  };

  const declineRematch = () => {
    if (game.gameId) socket.emit('game:rematch_decline', { gameId: game.gameId });
    setRematchStatus('idle');
  };

  const loadSpectateList = () => {
    setSpectateTab(true);
    socket.emit('spectate:list');
  };

  const spectate = (gameId: string) => {
    // Mark as incoming spectator BEFORE navigate to avoid race with game:state
    useGame.getState().reset();
    navigate(`/app/play/${gameId}`);
    // Small delay to let React re-render route before socket events arrive
    setTimeout(() => {
      socket.emit('game:join', { gameId, spectate: true });
    }, 100);
  };

  const goToAnalysis = () => {
    // Read directly from zustand store to avoid stale closure
    const currentMoves = useGame.getState().moves;
    console.log('[Analysis] moves:', currentMoves.length);
    if (!currentMoves.length) { alert('No moves recorded!'); return; }

    const tmp = new Chess();
    const movesWithFen = currentMoves.map(m => {
      const fen = tmp.fen();
      try { tmp.move(m.san); } catch(e) { console.warn('failed:', m.san); }
      return { san: m.san, fen };
    });
    console.log('[Analysis] saving', movesWithFen.length, 'moves to sessionStorage');
    sessionStorage.setItem('analysis_moves', JSON.stringify(movesWithFen));
    sessionStorage.setItem('analysis_result', useGame.getState().result || '');
    navigate('/app/analysis');
  };

  const sendChat = useCallback(() => {
    if (!chatMsg.trim()) return;
    if (isAiGame) {
      // AI: add locally, server not involved
      game.addChat({ userId: user?.id||'', username: user?.username||'You', message: chatMsg.trim(), timestamp: new Date() });
      const replies = ['Good move! 🤖','Interesting...','Calculating...','♟ Nice!','I see your strategy...'];
      setTimeout(() => game.addChat({ userId:'bot', username:'🤖 Bot', message: replies[Math.floor(Math.random()*replies.length)], timestamp: new Date() }), 900);
    } else if (game.gameId) {
      // Multiplayer: emit to server, server broadcasts to BOTH players via game:chat
      // Do NOT add locally — server echo adds it for everyone including sender
      socket.emit('game:chat', { gameId: game.gameId, message: chatMsg.trim() });
    }
    setChatMsg('');
  }, [chatMsg, isAiGame, game.gameId]);

  // ─── IDLE ─────────────────────────────────────────────────
  if (game.phase === 'idle') return (
    <div className={s.page}>
      <div className={s.lobby}>
        <motion.div className={s.lobbyCard} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
          {/* Tabs: Play | Spectate */}
          <div className={s.lobbyTabs}>
            <button className={`${s.lobbyTab}${!spectateTab?' '+s.lobbyTabActive:''}`} onClick={() => setSpectateTab(false)}>⚔️ Play</button>
            <button className={`${s.lobbyTab}${spectateTab?' '+s.lobbyTabActive:''}`} onClick={loadSpectateList}>👁 Watch Live</button>
          </div>

          {!spectateTab ? (<>
            <h1 className={s.lobbyTitle}>Find a Game</h1>
            <div className={s.tcGrid}>
              {TIME_CONTROLS.map(tc => (
                <motion.button key={tc.tc} className={`${s.tcCard}${selectedTC===tc.tc?' '+s.tcSel:''}`}
                  onClick={() => setSelectedTC(tc.tc)} whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}>
                  <span className={s.tcIcon}>{tc.icon}</span>
                  <span className={s.tcLabel}>{tc.label}</span>
                  <span className={s.tcTime}>{tc.tc}</span>
                </motion.button>
              ))}
            </div>
            <button className={`btn btn-gold btn-lg ${s.playBtn}`} onClick={startSearch}>Find Opponent →</button>
            <div className={s.orBar}><span>or</span></div>

            {/* AI section */}
            <div className={s.aiSection}>
              <div className={s.aiHeader}>
                <span>🤖 vs AI</span>
                {sfReady ? <span className={s.sfReady}>⚡ Stockfish Ready</span>
                          : <span className={s.sfLoading}>Loading engine...</span>}
              </div>
              <div className={s.diffGrid}>
                {DIFFICULTY_LEVELS.map(d => (
                  <motion.button key={d.level}
                    className={`${s.diffCard}${aiDifficulty===d.level?' '+s.diffSel:''}`}
                    style={aiDifficulty===d.level?{borderColor:DIFF_COLORS[d.level],boxShadow:`0 0 12px ${DIFF_COLORS[d.level]}33`}:{}}
                    onClick={() => setAiDifficulty(d.level)} whileHover={{ scale:1.04 }} whileTap={{ scale:.97 }}>
                    <span className={s.diffLevel} style={{ color:DIFF_COLORS[d.level] }}>{d.level}</span>
                    <span className={s.diffLabel}>{d.label}</span>
                    <span className={s.diffElo}>{d.elo}</span>
                  </motion.button>
                ))}
              </div>
              <button className="btn btn-outline btn-lg" style={{ width:'100%' }} onClick={startAiGame}>
                Play vs {DIFFICULTY_LEVELS[aiDifficulty-1].label} ({DIFFICULTY_LEVELS[aiDifficulty-1].elo}) →
              </button>
            </div>
          </>) : (
            /* Spectate tab */
            <div className={s.spectateList}>
              <h2 className={s.lobbyTitle}>Live Games</h2>
              {liveGames.length === 0 ? (
                <div className={s.noGames}>No live games right now.<br/>Be the first to play! 🎮</div>
              ) : liveGames.map(g => (
                <div key={g.gameId} className={s.liveGameRow} onClick={() => spectate(g.gameId)}>
                  <div className={s.lgPlayers}>
                    <span>⬜ {g.white} ({g.whiteRating})</span>
                    <span className={s.lgVs}>vs</span>
                    <span>⬛ {g.black} ({g.blackRating})</span>
                  </div>
                  <div className={s.lgMeta}>
                    <span>{g.timeControl}</span>
                    <span>{g.moves} moves</span>
                    {g.spectators > 0 && <span>👁 {g.spectators}</span>}
                  </div>
                  <button className="btn btn-outline btn-sm">Watch →</button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {user && (
          <motion.div className={`card ${s.statsCard}`} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:.15 }}>
            <div className="sec-hdr">Your Stats</div>
            <div className={s.statsBody}>
              <div className={s.ratingDisplay}>
                <div className={s.ratingNum} style={{ color:TIER_COLORS[user.rankTier] }}>{user.rating}</div>
                <div className={s.ratingLabel}>ELO RATING</div>
                <span className="badge" style={{ color:TIER_COLORS[user.rankTier], fontSize:'.65rem' }}>{user.rankTier}</span>
              </div>
              <div className={s.statGrid}>
                {[{l:'Games',v:user.stats.gamesPlayed},{l:'Wins',v:user.stats.wins,c:'var(--green)'},{l:'Losses',v:user.stats.losses,c:'var(--red)'},{l:'Streak',v:user.stats.winStreak}].map(({l,v,c})=>(
                  <div key={l} className={s.miniStat}><strong style={{color:c}}>{v}</strong><span>{l}</span></div>
                ))}
              </div>
            </div>
            {/* Sound toggle */}
            <div className={s.soundToggle}>
              <span style={{ fontSize:'.8rem', color:'var(--muted)' }}>Sound</span>
              <button className={`btn btn-sm ${soundOn ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setSoundOn(!soundOn)}>
                {soundOn ? '🔊 On' : '🔇 Off'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  // ─── SEARCHING ────────────────────────────────────────────
  if (waitingForFriend) return (
    <div className={s.page}>
      <motion.div className={s.searchingCard} initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }}>
        <div className={s.searchRing}><div className={s.searchPulse}/><div className={s.searchInner}>⚔️</div></div>
        <h2 className={s.searchTitle}>Waiting for Response...</h2>
        <p className={s.searchSub}>Your friend is deciding whether to accept</p>
        <button className="btn btn-outline" onClick={() => { setWaitingForFriend(false); game.reset(); }}>Cancel</button>
      </motion.div>
    </div>
  );

  if (game.phase === 'searching') return (
    <div className={s.page}>
      <motion.div className={s.searchingCard} initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }}>
        <div className={s.searchRing}><div className={s.searchPulse}/><div className={s.searchInner}>♟</div></div>
        <h2 className={s.searchTitle}>Finding Opponent...</h2>
        <p className={s.searchSub}>Matching by Elo · {selectedTC} time control</p>
        <button className="btn btn-outline" onClick={() => { socket.emit('matchmaking:leave'); game.reset(); }}>Cancel</button>
      </motion.div>
    </div>
  );

  // ─── PLAYING ──────────────────────────────────────────────
  const isWhite = game.playerColor === 'white';
  const isSpectator = game.isSpectator;
  const oppTime = isWhite ? game.timeB : game.timeW;
  const myTime  = isWhite ? game.timeW : game.timeB;
  const evalPct = Math.max(5, Math.min(95, 50 + game.evalScore * 4));

  return (
    <div className={s.page}>
      <div className={s.gameLayout}>
        {/* Eval bar */}
        <div className={s.evalBar}>
          <div className={s.evalWhite} style={{ height:`${100-evalPct}%` }}/>
          <div className={s.evalBlack} style={{ height:`${evalPct}%` }}/>
          <div className={s.evalLabel}>{game.evalScore>0?`+${game.evalScore.toFixed(1)}`:game.evalScore.toFixed(1)}</div>
        </div>

        <div className={s.centerCol}>
          {/* Opening name */}
          <AnimatePresence>
            {game.opening && (
              <motion.div className={s.openingBadge}
                initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                📖 {game.opening}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Opponent / Black player (top) */}
          <div className={s.playerBar}>
            <div className={s.playerInfo}>
              <span className={s.playerAv} style={{ background:'var(--card2)' }}>{isAiGame?'🤖':'♟'}</span>
              <div>
                <div className={s.playerName}>
                  {isSpectator
                    ? (game.blackPlayer?.username || 'Black')
                    : (game.opponent?.username || 'Opponent')}
                  {aiThinking && <span style={{ color:'var(--cyan)', fontSize:'.7rem', marginLeft:8 }}>thinking...</span>}
                </div>
                <div className={s.playerElo}>
                  {isSpectator ? game.blackPlayer?.rating : game.opponent?.rating} ELO
                </div>
              </div>
            </div>
            <div className={`${s.clock}${game.phase==='playing'&&(isWhite?game.chess.turn()==='b':game.chess.turn()==='w')?' '+s.clockActive:''}`}>
              {fmt(oppTime)}
            </div>
          </div>

          {/* Floating reactions */}
          <div className={s.reactionsFloat}>
            <AnimatePresence>
              {game.reactions.map(r => (
                <motion.div key={r.id} className={s.reactionBubble}
                  initial={{ opacity:0, y:20, scale:0.5 }} animate={{ opacity:1, y:-40, scale:1 }}
                  exit={{ opacity:0, scale:0.5 }} transition={{ duration:.5 }}>
                  <span className={s.reactionEmoji}>{r.emoji}</span>
                  <span className={s.reactionUser}>{r.username}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <ChessBoard />

          {/* Spectator banner */}
          {isSpectator && (
            <div className={s.spectatorBanner}>
              <span>👁 Spectating</span>
              {game.spectators > 1 && <span className={s.spectatorCount}>{game.spectators} watching</span>}
              <button className={s.spectatorLeave} onClick={() => {
                socket.emit('game:leave', { gameId: game.gameId, spectate: true });
                game.reset();
                navigate('/app/play');
              }}>Leave</button>
            </div>
          )}
          {!isSpectator && game.spectators > 0 && (
            <div className={s.spectatorBadge}>👁 {game.spectators} watching</div>
          )}

          {/* Me / White player (bottom) */}
          <div className={s.playerBar}>
            <div className={s.playerInfo}>
              <span className={s.playerAv} style={{ background: isSpectator ? 'var(--card2)' : (user?.avatar?.startsWith('http') ? 'transparent' : 'linear-gradient(135deg,var(--gold),var(--gold2))') }}>
                {isSpectator ? '♙' : <Avatar avatar={user?.avatar || '♟'} username={user?.username || ''} size={24} />}
              </span>
              <div>
                <div className={s.playerName}>
                  {isSpectator
                    ? (game.whitePlayer?.username || 'White')
                    : <>{user?.username} <span style={{ color:'var(--muted)', fontSize:'.72rem' }}>(You)</span></>}
                </div>
                <div className={s.playerElo}>
                  {isSpectator ? game.whitePlayer?.rating : user?.rating} ELO
                  {!isSpectator && game.increment > 0 && <span style={{ color:'var(--cyan)', fontFamily:'var(--font-m)', fontSize:'.65rem' }}> +{game.increment}s</span>}
                </div>
              </div>
            </div>
            <div className={`${s.clock}${game.phase==='playing'&&(isWhite?game.chess.turn()==='w':game.chess.turn()==='b')?' '+s.clockActive:''}`}>
              {fmt(myTime)}
            </div>
          </div>

          {game.phase === 'playing' && (
            <div className={s.controls}>
              <button className="btn btn-ghost btn-sm" onClick={() => game.flip()}>🔄</button>
              {!isAiGame && !isSpectator && <button className="btn btn-outline btn-sm" onClick={() => socket.emit('game:offer_draw',{gameId:game.gameId})}>½</button>}
              <div className={s.reactionWrap}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowReactions(!showReactions)}>😊</button>
                <AnimatePresence>
                  {showReactions && (
                    <motion.div className={s.reactionPicker}
                      initial={{ opacity:0, scale:.8, y:10 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:.8 }}>
                      {REACTIONS.map(e => (
                        <button key={e} className={s.reactionBtn} onClick={() => sendReaction(e)}>{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSoundOn(v => !v)}>{soundOn?'🔊':'🔇'}</button>
              <button className="btn btn-danger btn-sm" onClick={resign}>🏳</button>
            </div>
          )}
        </div>

        {/* Right: moves + chat */}
        <div className={s.rightCol}>
          <div className={`card ${s.movePanel}`}>
            <div className="sec-hdr">Moves</div>
            <div className={s.moveList}>
              {Array.from({length:Math.ceil(game.moves.length/2)},(_,i)=>(
                <div key={i} className={s.moveRow}>
                  <span className={s.moveNum}>{i+1}.</span>
                  <span className={s.moveSan}>{game.moves[i*2]?.san}</span>
                  <span className={s.moveSan}>{game.moves[i*2+1]?.san}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`card ${s.chatPanel}`}>
            <div className="sec-hdr">Chat</div>
            <div className={s.chatMessages} ref={chatRef}>
              {game.chat.length===0&&<div className={s.chatEmpty}>Say something...</div>}
              {game.chat.map((m,i)=>(
                <div key={i} className={`${s.chatMsg}${m.userId===user?.id?' '+s.mine:m.userId==='system'?' '+s.system:''}`}>
                  {m.userId!=='system'&&<span className={s.chatUser}>{m.userId===user?.id?'You':m.username}</span>}
                  <span className={s.chatText}>{m.message}</span>
                </div>
              ))}
            </div>
            {isSpectator && (
              <div style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: '.8rem', textAlign: 'center' }}>
                👁 You are spectating — chat disabled
              </div>
            )}
            {!isSpectator && <div className={s.chatInput}>
              <input className="input" placeholder="Type a message..." value={chatMsg}
                onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} maxLength={200}/>
              <button className="btn btn-gold btn-sm" onClick={sendChat}>Send</button>
            </div>}
          </div>
        </div>
      </div>

      {/* Game over overlay */}
      <AnimatePresence>
        {game.phase==='ended'&&(
          <motion.div className={s.overlay} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div className={s.resultCard} initial={{scale:.85,y:30}} animate={{scale:1,y:0}} transition={{type:'spring',stiffness:250,damping:20}}>
              <div className={s.resultEmoji}>
                {isSpectator
                  ? (game.result==='1-0'?'⚪':game.result==='0-1'?'⚫':'🤝')
                  : (game.result==='1-0'?(isWhite?'🏆':'😔'):game.result==='0-1'?(isWhite?'😔':'🏆'):'🤝')}
              </div>
              <div className={s.resultTitle}>
                {isSpectator
                  ? (game.result==='1/2-1/2'?'Draw!'
                    : game.result==='1-0'?`${game.whitePlayer?.username||'White'} Wins!`
                    : `${game.blackPlayer?.username||'Black'} Wins!`)
                  : (game.result==='1/2-1/2'?'Draw!':game.result==='1-0'?(isWhite?'You Won!':'You Lost'):(isWhite?'You Lost':'You Won!'))}
              </div>
              <div className={s.resultSub}>{game.termination?.replace(/_/g,' ')}</div>
              {!!game.eloChange&&<div className={s.eloChange} style={{color:(game.eloChange||0)>0?'var(--green)':'var(--red)'}}>{(game.eloChange||0)>0?'+':''}{game.eloChange} ELO</div>}

              {/* Rematch status */}
              {rematchStatus === 'offered' && (
                <div className={s.rematchOffer}>
                  <p>Rematch offered!</p>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-gold" onClick={acceptRematch}>✅ Accept</button>
                    <button className="btn btn-outline" onClick={declineRematch}>❌ Decline</button>
                  </div>
                </div>
              )}
              {rematchStatus === 'waiting' && <div className={s.rematchWaiting}>Waiting for response...</div>}
              {rematchStatus === 'declined' && <div className={s.rematchDeclined}>Rematch declined</div>}

              <div className={s.resultBtns}>
                <button className="btn btn-gold btn-lg" onClick={offerRematch}>
                  {isAiGame ? '↺ Play Again' : rematchStatus === 'idle' ? '🔄 Rematch' : '↺ New Game'}
                </button>
                {game.moves.length > 4 && (
                  <button className="btn btn-outline" onClick={goToAnalysis}>📊 Analyze Game</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => { game.reset(); setIsAiGame(false); setRematchStatus('idle'); }}>
                  Back to Lobby
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
