import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';
import s from './AnalysisPage.module.css';

// ── Types ─────────────────────────────────────────────────────
type MoveClass = 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';

interface AnalyzedMove {
  san: string;
  fen: string;
  eval: number;
  evalAfter: number;
  evalLoss: number;
  classification: MoveClass;
  bestMove: string;
  color: 'w' | 'b';
  moveNum: number;
}

const CLASS_CONFIG: Record<MoveClass, { label: string; color: string; icon: string }> = {
  brilliant:  { label: 'Brilliant',  color: '#00d4ff', icon: '!!' },
  excellent:  { label: 'Excellent',  color: '#00ff88', icon: '!'  },
  good:       { label: 'Good',       color: '#88cc44', icon: ''   },
  inaccuracy: { label: 'Inaccuracy', color: '#f5c842', icon: '?!' },
  mistake:    { label: 'Mistake',    color: '#ff9933', icon: '?'  },
  blunder:    { label: 'Blunder',    color: '#ff4466', icon: '??' },
  book:       { label: 'Book',       color: '#a855f7', icon: ''   },
};

function classifyMove(evalLoss: number): MoveClass {
  if (evalLoss <= 0.2) return 'excellent';
  if (evalLoss <= 0.5) return 'good';
  if (evalLoss <= 1.0) return 'inaccuracy';
  if (evalLoss <= 2.0) return 'mistake';
  return 'blunder';
}

function calcAccuracy(moves: AnalyzedMove[], color: 'w' | 'b'): number {
  const mine = moves.filter(m => m.color === color);
  if (!mine.length) return 100;
  const avgLoss = mine.reduce((s, m) => s + Math.min(m.evalLoss, 5), 0) / mine.length;
  return Math.max(0, Math.min(100, Math.round(100 - avgLoss * 15)));
}

// ── Instant material evaluator (no minimax, no Stockfish) ────
const PIECE_VAL: Record<string, number> = { p: 1, n: 3.2, b: 3.3, r: 5, q: 9, k: 0 };

function evalPosition(fen: string): number {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -50 : 50;
  if (chess.isDraw()) return 0;
  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      score += sq.color === 'w' ? (PIECE_VAL[sq.type] || 0) : -(PIECE_VAL[sq.type] || 0);
    }
  }
  // Small mobility bonus
  score += chess.moves().length * 0.01 * (chess.turn() === 'w' ? 1 : -1);
  return score;
}

function getBestMoveLocal(fen: string): { score: number; bestMove: string } {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return { score: evalPosition(fen), bestMove: '' };
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return { score: 0, bestMove: '' };

  // Pick best move by 1-ply lookahead (instant)
  const maximizing = chess.turn() === 'w';
  let bestMove = moves[0];
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const mv of moves) {
    chess.move(mv);
    const score = evalPosition(chess.fen());
    chess.undo();
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = mv;
    }
  }
  return { score: bestScore, bestMove: `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}` };
}

// ── Mini board ────────────────────────────────────────────────
const PIECE_UNICODE: Record<string, string> = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

function MiniBoard({ fen, lastMove, highlight }: { fen: string; lastMove?: { from: string; to: string }; highlight?: string }) {
  const chess = new Chess(fen);
  const board = chess.board();
  return (
    <div className={s.miniBoard}>
      {board.map((row, ri) => (
        <div key={ri} className={s.mRow}>
          {row.map((sq, ci) => {
            const file = String.fromCharCode(97 + ci);
            const rank = 8 - ri;
            const sqName = `${file}${rank}`;
            const isLight = (ci + ri) % 2 !== 0;
            const isLast = lastMove?.from === sqName || lastMove?.to === sqName;
            const isHL = highlight === sqName;
            return (
              <div key={ci} className={`${s.mSq} ${isLight ? s.mLight : s.mDark} ${isLast ? s.mLast : ''} ${isHL ? s.mHL : ''}`}>
                {sq && (
                  <span className={`${s.mPiece} ${sq.color === 'w' ? s.mWp : s.mBp}`}>
                    {PIECE_UNICODE[`${sq.color}${sq.type.toUpperCase()}`]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Eval chart ────────────────────────────────────────────────
function EvalChart({ moves }: { moves: AnalyzedMove[] }) {
  if (!moves.length) return null;
  const W = 100, H = 60;
  const evals = moves.map(m => Math.max(-6, Math.min(6, m.evalAfter)));
  const points = evals.map((e, i) => {
    const x = (i / (evals.length - 1 || 1)) * W;
    const y = H / 2 - (e / 6) * (H / 2 - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={s.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.chart} preserveAspectRatio="none">
        <defs>
          <linearGradient id="wGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0ede6" stopOpacity=".9"/>
            <stop offset="100%" stopColor="#f0ede6" stopOpacity=".1"/>
          </linearGradient>
          <linearGradient id="bGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1a1a2e" stopOpacity=".1"/>
            <stop offset="100%" stopColor="#1a1a2e" stopOpacity=".9"/>
          </linearGradient>
          <clipPath id="above"><rect x="0" y="0" width={W} height={H/2}/></clipPath>
          <clipPath id="below"><rect x="0" y={H/2} width={W} height={H/2}/></clipPath>
        </defs>
        <polygon points={`0,${H/2} ${points} ${W},${H/2}`} fill="url(#wGrad)" clipPath="url(#above)" opacity=".8"/>
        <polygon points={`0,${H/2} ${points} ${W},${H/2}`} fill="url(#bGrad)" clipPath="url(#below)" opacity=".8"/>
        <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <polyline points={points} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth=".8"/>
        {moves.map((m, i) => m.classification === 'blunder' && (
          <circle key={i} cx={(i/(evals.length-1||1))*W} cy={H/2-(evals[i]/6)*(H/2-4)} r="1.5" fill="#ff4466"/>
        ))}
      </svg>
      <div className={s.chartLabels}>
        <span>Move 1</span><span>Move {moves.length}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AnalysisPage() {
  const navigate = useNavigate();
  const [moves, setMoves] = useState<AnalyzedMove[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [error, setError] = useState('');
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    const raw = sessionStorage.getItem('analysis_moves');
    console.log('[AnalysisPage] raw from sessionStorage:', raw ? raw.slice(0, 200) : 'NULL');

    if (!raw) { setError('No game data found. Play a game first!'); return; }

    let gameMoves: Array<{ fen: string; san: string }>;
    try {
      gameMoves = JSON.parse(raw);
    } catch {
      setError('Invalid game data — could not parse JSON.'); return;
    }

    console.log('[AnalysisPage] parsed moves:', gameMoves?.length, gameMoves?.[0]);

    if (!gameMoves || !Array.isArray(gameMoves) || gameMoves.length === 0) {
      setError('Game too short to analyze — play at least 5 moves first.'); return;
    }

    // Filter out any moves with missing san
    const validMoves = gameMoves.filter(m => m && m.san && m.san.length > 0);
    console.log('[AnalysisPage] valid moves:', validMoves.length);

    if (!validMoves.length) {
      setError('No valid moves found in game data.'); return;
    }

    runAnalysis(validMoves);
    return () => { cancelRef.current = true; };
  }, []);

  const runAnalysis = async (gameMoves: Array<{ fen: string; san: string }>) => {
    setAnalyzing(true);
    setProgress(0);

    // Rebuild full position list from start
    const chess = new Chess();
    const positions: Array<{ fen: string; san: string; color: 'w' | 'b'; moveNum: number }> = [];

    for (const gm of gameMoves) {
      if (!gm.san) continue;
      const color = chess.turn() as 'w' | 'b';
      const moveNum = chess.moveNumber();
      positions.push({ fen: chess.fen(), san: gm.san, color, moveNum });
      try { chess.move(gm.san); } catch { break; }
    }

    if (!positions.length) {
      setError('Could not reconstruct game positions.');
      setAnalyzing(false);
      return;
    }

    const analyzed: AnalyzedMove[] = [];

    for (let i = 0; i < positions.length; i++) {
      if (cancelRef.current) break;

      // Yield to UI every move so progress bar updates
      await new Promise(r => setTimeout(r, 0));
      setProgress(Math.round(((i + 1) / positions.length) * 100));

      const pos = positions[i];

      // Eval before move (instant 1-ply)
      const before = getBestMoveLocal(pos.fen);
      const evalBefore = pos.color === 'w' ? before.score : -before.score;
      const bestMove = before.bestMove;

      // Apply the move
      const chessAfter = new Chess(pos.fen);
      try { chessAfter.move(pos.san); } catch { continue; }

      // Eval after move (instant)
      const after = getBestMoveLocal(chessAfter.fen());
      const evalAfter = pos.color === 'w' ? after.score : -after.score;

      const evalLoss = Math.max(0, evalBefore - evalAfter);
      const classification = i < 4 ? 'book' : classifyMove(evalLoss);

      analyzed.push({
        san: pos.san,
        fen: pos.fen,
        eval: evalBefore,
        evalAfter,
        evalLoss,
        classification,
        bestMove,
        color: pos.color,
        moveNum: pos.moveNum,
      });
    }

    setMoves(analyzed);
    setAnalyzing(false);
    setProgress(100);
  };

  // ── Counts ────────────────────────────────────────────────
  const whiteAcc = calcAccuracy(moves, 'w');
  const blackAcc = calcAccuracy(moves, 'b');

  const countClass = (color: 'w' | 'b') => {
    const mine = moves.filter(m => m.color === color);
    return Object.fromEntries(
      (['excellent','good','inaccuracy','mistake','blunder'] as MoveClass[]).map(c => [c, mine.filter(m => m.classification === c).length])
    ) as Record<MoveClass, number>;
  };
  const wStats = countClass('w');
  const bStats = countClass('b');
  const selMove = selectedMove !== null ? moves[selectedMove] : null;

  // ── Error screen ──────────────────────────────────────────
  if (error) return (
    <div className={s.page}>
      <div className={s.errorCard}>
        <div style={{ fontSize:'3rem' }}>♟</div>
        <h2 style={{ fontFamily:'var(--font-d)', letterSpacing:2 }}>{error}</h2>
        <button className="btn btn-gold" onClick={() => navigate('/app/play')}>Play a Game</button>
      </div>
    </div>
  );

  // ── Loading screen ────────────────────────────────────────
  if (analyzing) return (
    <div className={s.page}>
      <motion.div className={s.loadingCard} initial={{ opacity:0 }} animate={{ opacity:1 }}>
        <div className={s.loadingIcon}>🔍</div>
        <h2 className={s.loadingTitle}>Analyzing Your Game</h2>
        <p className={s.loadingSub}>Evaluating every position...</p>
        <div className={s.progressBar}>
          <motion.div className={s.progressFill} animate={{ width:`${progress}%` }} transition={{ ease:'linear' }}/>
        </div>
        <div className={s.progressLabel}>{progress}% complete</div>
      </motion.div>
    </div>
  );

  // ── Results ───────────────────────────────────────────────
  return (
    <div className={s.page}>
      <div className={s.layout}>

        {/* Left col */}
        <motion.div className={s.leftCol} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}>

          {/* Accuracy */}
          <div className={`card ${s.accuracyCard}`}>
            <h2 className={s.sectionTitle}>Accuracy</h2>
            <div className={s.accuracyRow}>
              <div className={s.accBlock}>
                <div className={s.accPct} style={{ color: whiteAcc > 85 ? 'var(--green)' : whiteAcc > 65 ? 'var(--gold)' : 'var(--red)' }}>
                  {whiteAcc}%
                </div>
                <div className={s.accLabel}>⬜ White</div>
              </div>
              <div className={s.accDivider}/>
              <div className={s.accBlock}>
                <div className={s.accPct} style={{ color: blackAcc > 85 ? 'var(--green)' : blackAcc > 65 ? 'var(--gold)' : 'var(--red)' }}>
                  {blackAcc}%
                </div>
                <div className={s.accLabel}>⬛ Black</div>
              </div>
            </div>
          </div>

          {/* Eval chart */}
          <div className={`card ${s.chartCard}`}>
            <h2 className={s.sectionTitle}>Evaluation</h2>
            <EvalChart moves={moves}/>
          </div>

          {/* Move quality */}
          <div className={`card ${s.classCard}`}>
            <h2 className={s.sectionTitle}>Move Quality</h2>
            <div className={s.classTable}>
              <div className={s.classHeader}>
                <span/>
                <span style={{ color:'var(--muted)', fontSize:'.7rem', textAlign:'center' }}>⬜</span>
                <span style={{ color:'var(--muted)', fontSize:'.7rem', textAlign:'center' }}>⬛</span>
              </div>
              {(['excellent','good','inaccuracy','mistake','blunder'] as MoveClass[]).map(cls => (
                <div key={cls} className={s.classRow}>
                  <span style={{ color: CLASS_CONFIG[cls].color, fontSize:'.8rem', fontWeight:700 }}>
                    {CLASS_CONFIG[cls].icon && <span style={{ fontFamily:'var(--font-m)', marginRight:4 }}>{CLASS_CONFIG[cls].icon}</span>}
                    {CLASS_CONFIG[cls].label}
                  </span>
                  <span className={s.classCount} style={{ color: (wStats[cls]||0) > 0 && (cls==='blunder'||cls==='mistake') ? CLASS_CONFIG[cls].color : 'var(--text)' }}>
                    {wStats[cls] || 0}
                  </span>
                  <span className={s.classCount} style={{ color: (bStats[cls]||0) > 0 && (cls==='blunder'||cls==='mistake') ? CLASS_CONFIG[cls].color : 'var(--text)' }}>
                    {bStats[cls] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-gold" onClick={() => navigate('/app/play')}>Play Again</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </motion.div>

        {/* Center: board */}
        <motion.div className={s.centerCol} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.1 }}>
          {selMove ? (
            <>
              <MiniBoard
                fen={selMove.fen}
                lastMove={selMove.bestMove ? { from: selMove.bestMove.slice(0,2), to: selMove.bestMove.slice(2,4) } : undefined}
              />
              <div className={`card ${s.moveDetail}`}>
                <div className={s.moveDetailTop}>
                  <span className={s.moveDetailNum}>
                    {selMove.moveNum}. {selMove.color==='b'?'...':''}{selMove.san}
                  </span>
                  <span className={s.moveDetailClass} style={{ color: CLASS_CONFIG[selMove.classification].color }}>
                    {CLASS_CONFIG[selMove.classification].icon} {CLASS_CONFIG[selMove.classification].label}
                  </span>
                </div>
                <div className={s.moveDetailStats}>
                  <div>
                    <span className={s.detailLabel}>Before</span>
                    <span className={s.detailVal}>{selMove.eval > 0 ? '+' : ''}{selMove.eval.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className={s.detailLabel}>After</span>
                    <span className={s.detailVal}>{selMove.evalAfter > 0 ? '+' : ''}{selMove.evalAfter.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className={s.detailLabel}>Loss</span>
                    <span className={s.detailVal} style={{ color: selMove.evalLoss > 1.5 ? 'var(--red)' : selMove.evalLoss > 0.5 ? 'var(--gold)' : 'var(--green)' }}>
                      -{selMove.evalLoss.toFixed(2)}
                    </span>
                  </div>
                </div>
                {selMove.bestMove && selMove.classification !== 'excellent' && selMove.classification !== 'book' && (
                  <div className={s.bestMove}>
                    <span style={{ color:'var(--muted)', fontSize:'.75rem' }}>Best move</span>
                    <span style={{ fontFamily:'var(--font-m)', color:'var(--cyan)', fontSize:'.82rem' }}>
                      {selMove.bestMove.slice(0,2)} → {selMove.bestMove.slice(2,4)}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={s.boardPlaceholder}>
              <div style={{ fontSize:'4rem', opacity:.3 }}>♟</div>
              <p style={{ color:'var(--muted)', fontSize:'.85rem' }}>Click any move to see the position</p>
            </div>
          )}
        </motion.div>

        {/* Right: move list */}
        <motion.div className={s.rightCol} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:.15 }}>
          <div className={`card ${s.moveListCard}`}>
            <h2 className={s.sectionTitle}>Move List — {moves.length} moves</h2>
            <div className={s.moveListScroll}>
              {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
                const wm = moves[i * 2];
                const bm = moves[i * 2 + 1];
                return (
                  <div key={i} className={s.moveListRow}>
                    <span className={s.mlNum}>{i + 1}.</span>
                    {wm && (
                      <button className={`${s.mlMove}${selectedMove===i*2?' '+s.mlSelected:''}`}
                        onClick={() => setSelectedMove(selectedMove===i*2 ? null : i*2)}
                        style={{ borderLeft:`3px solid ${CLASS_CONFIG[wm.classification].color}` }}>
                        {wm.san}
                        {CLASS_CONFIG[wm.classification].icon && (
                          <span className={s.mlIcon} style={{ color:CLASS_CONFIG[wm.classification].color }}>
                            {CLASS_CONFIG[wm.classification].icon}
                          </span>
                        )}
                      </button>
                    )}
                    {bm && (
                      <button className={`${s.mlMove}${selectedMove===i*2+1?' '+s.mlSelected:''}`}
                        onClick={() => setSelectedMove(selectedMove===i*2+1 ? null : i*2+1)}
                        style={{ borderLeft:`3px solid ${CLASS_CONFIG[bm.classification].color}` }}>
                        {bm.san}
                        {CLASS_CONFIG[bm.classification].icon && (
                          <span className={s.mlIcon} style={{ color:CLASS_CONFIG[bm.classification].color }}>
                            {CLASS_CONFIG[bm.classification].icon}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
