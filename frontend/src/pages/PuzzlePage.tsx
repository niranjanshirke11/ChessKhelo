import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { PUZZLES, THEME_LABELS, DIFFICULTY_COLORS, type Puzzle } from '../data/puzzles';
import s from './PuzzlePage.module.css';

// ── Helpers ───────────────────────────────────────────────────
function uciToMove(uci: string) {
  if (uci === 'NONE') return null;
  const promo = uci.length === 5 ? uci[4] : undefined;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: promo || 'q' };
}

function getDailyPuzzleIndex() {
  const day = Math.floor(Date.now() / 86400000);
  return day % PUZZLES.length;
}

type Phase = 'idle' | 'playing' | 'correct' | 'failed';

const PIECE_UNICODE: Record<string, string> = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

// ── Mini Chess Board ──────────────────────────────────────────
function PuzzleBoard({ chess, onMove, disabled, lastMove, playerColor }: {
  chess: Chess;
  onMove: (from: string, to: string) => void;
  disabled: boolean;
  lastMove: { from: string; to: string } | null;
  playerColor: 'white' | 'black';
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);

  const board = chess.board();
  const flipped = playerColor === 'black';

  const rows = flipped ? [...board].reverse() : board;
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  const handleSquare = useCallback((sq: string) => {
    if (disabled) return;
    if (selected) {
      if (validMoves.includes(sq)) {
        onMove(selected, sq);
        setSelected(null); setValidMoves([]);
      } else {
        const piece = chess.get(sq as any);
        const myColor = playerColor === 'white' ? 'w' : 'b';
        if (piece && piece.color === myColor) {
          setSelected(sq);
          setValidMoves(chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to));
        } else {
          setSelected(null); setValidMoves([]);
        }
      }
    } else {
      const piece = chess.get(sq as any);
      const myColor = playerColor === 'white' ? 'w' : 'b';
      if (piece && piece.color === myColor) {
        setSelected(sq);
        setValidMoves(chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to));
      }
    }
  }, [selected, validMoves, chess, disabled, onMove, playerColor]);

  useEffect(() => { setSelected(null); setValidMoves([]); }, [chess.fen()]);

  return (
    <div className={s.board}>
      {rows.map((row, ri) => {
        const rank = flipped ? ri + 1 : 8 - ri;
        return (
          <div key={ri} className={s.boardRow}>
            <span className={s.rankLabel}>{rank}</span>
            {cols.map((ci) => {
              const sq = row[ci];
              const file = String.fromCharCode(97 + ci);
              const sqName = `${file}${rank}`;
              const isLight = (ci + (8 - rank)) % 2 === 0;
              const isSelected = selected === sqName;
              const isValid = validMoves.includes(sqName);
              const isLastFrom = lastMove?.from === sqName;
              const isLastTo = lastMove?.to === sqName;

              return (
                <div key={ci}
                  className={`${s.sq} ${isLight ? s.sqLight : s.sqDark}
                    ${isSelected ? s.sqSelected : ''}
                    ${isLastFrom || isLastTo ? s.sqLast : ''}
                    ${isValid ? s.sqValid : ''}`}
                  onClick={() => handleSquare(sqName)}>
                  {isValid && !sq && <div className={s.dot} />}
                  {isValid && sq && <div className={s.captureDot} />}
                  {sq && (
                    <span className={`${s.piece} ${sq.color === 'w' ? s.wp : s.bp}`}>
                      {PIECE_UNICODE[`${sq.color}${sq.type.toUpperCase()}`]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className={s.fileLabels}>
        <span />
        {(flipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h']).map(f => (
          <span key={f} className={s.fileLabel}>{f}</span>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PuzzlePage() {
  const { user } = useAuth();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chess, setChess] = useState<Chess>(new Chess());
  const [phase, setPhase] = useState<Phase>('idle');
  const [moveIdx, setMoveIdx] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [puzzleRating, setPuzzleRating] = useState(1200);
  const [solved, setSolved] = useState(0);
  const [failed, setFailed] = useState(0);
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [dailyDone, setDailyDone] = useState(false);
  const feedbackRef = useRef<string>('');

  const filteredPuzzles = PUZZLES.filter(p => filter === 'all' || p.difficulty === filter);

  const loadPuzzle = useCallback((p: Puzzle) => {
    const c = new Chess(p.fen);
    setPuzzle(p);
    setChess(c);
    setPhase('playing');
    setMoveIdx(0);
    setHintsUsed(0);
    setHintSquare(null);
    setLastMove(null);
  }, []);

  const loadDaily = () => {
    const idx = getDailyPuzzleIndex();
    loadPuzzle(PUZZLES[idx]);
  };

  const loadRandom = () => {
    const pool = filteredPuzzles;
    loadPuzzle(pool[Math.floor(Math.random() * pool.length)]);
  };

  // Apply opponent move after player's correct move
  const applyOpponentMove = useCallback((currentChess: Chess, currentPuzzle: Puzzle, nextMoveIdx: number) => {
    const opponentMove = currentPuzzle.moves[nextMoveIdx];
    if (!opponentMove || opponentMove === 'NONE') return;
    
    setTimeout(() => {
      const mv = uciToMove(opponentMove);
      if (!mv) return;
      const newChess = new Chess(currentChess.fen());
      try {
        const result = newChess.move(mv);
        if (result) {
          setLastMove({ from: result.from, to: result.to });
          setChess(newChess);
          setMoveIdx(nextMoveIdx + 1);
        }
      } catch {}
    }, 600);
  }, []);

  const handleMove = useCallback((from: string, to: string) => {
    if (!puzzle || phase !== 'playing') return;
    const expectedUci = puzzle.moves[moveIdx];
    if (!expectedUci || expectedUci === 'NONE') return;

    const expected = uciToMove(expectedUci);
    if (!expected) return;

    const isCorrect = from === expected.from && to === expected.to;

    if (isCorrect) {
      const newChess = new Chess(chess.fen());
      try {
        const result = newChess.move({ from, to, promotion: expected.promotion || 'q' });
        if (!result) return;
        setLastMove({ from: result.from, to: result.to });
        setChess(newChess);
        setHintSquare(null);

        const nextIdx = moveIdx + 1;
        // Check if puzzle is complete
        if (nextIdx >= puzzle.moves.length || puzzle.moves[nextIdx] === 'NONE') {
          setTimeout(() => {
            setPhase('correct');
            setStreak(s => s + 1);
            setSolved(s => s + 1);
            setPuzzleRating(r => Math.min(3000, r + Math.max(5, Math.floor((puzzle.rating - r) * 0.1 + 15) - hintsUsed * 5)));
          }, 400);
        } else {
          // Apply opponent's response
          applyOpponentMove(newChess, puzzle, nextIdx);
        }
      } catch { /* invalid move */ }
    } else {
      // Wrong move
      feedbackRef.current = 'wrong';
      setPhase('failed');
      setStreak(0);
      setFailed(f => f + 1);
      setPuzzleRating(r => Math.max(100, r - 10));
    }
  }, [puzzle, phase, moveIdx, chess, hintsUsed, applyOpponentMove]);

  const useHint = () => {
    if (!puzzle || hintsUsed >= 3) return;
    const expected = uciToMove(puzzle.moves[moveIdx]);
    if (!expected) return;
    setHintSquare(expected.from);
    setHintsUsed(h => h + 1);
  };

  const retry = () => {
    if (!puzzle) return;
    loadPuzzle(puzzle);
  };

  const next = () => {
    loadRandom();
  };

  // ── IDLE ───────────────────────────────────────────────────
  if (phase === 'idle') return (
    <div className={s.page}>
      <div className={s.idleLayout}>
        {/* Header */}
        <motion.div className={s.idleHeader} initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}>
          <div className={s.puzzleIcon}>🧩</div>
          <h1 className={s.idleTitle}>Puzzle Training</h1>
          <p className={s.idleSub}>Sharpen your tactics. Solve puzzles. Climb the rating ladder.</p>
        </motion.div>

        {/* Stats row */}
        <motion.div className={s.statsRow} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.1 }}>
          {[
            { label: 'Puzzle Rating', value: puzzleRating, color: 'var(--gold)' },
            { label: 'Solved', value: solved, color: 'var(--green)' },
            { label: 'Failed', value: failed, color: 'var(--red)' },
            { label: 'Streak 🔥', value: streak, color: 'var(--cyan)' },
          ].map(({ label, value, color }) => (
            <div key={label} className={s.statBox}>
              <div className={s.statVal} style={{ color }}>{value}</div>
              <div className={s.statLbl}>{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Daily puzzle */}
        <motion.div className={`card ${s.dailyCard}`} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15 }}>
          <div className={s.dailyBadge}>📅 DAILY PUZZLE</div>
          <div className={s.dailyInfo}>
            <div className={s.dailyTitle}>{PUZZLES[getDailyPuzzleIndex()].title}</div>
            <div className={s.dailyMeta}>
              <span style={{ color: DIFFICULTY_COLORS[PUZZLES[getDailyPuzzleIndex()].difficulty] }}>
                {PUZZLES[getDailyPuzzleIndex()].difficulty.toUpperCase()}
              </span>
              <span className={s.dot2}>·</span>
              <span>{THEME_LABELS[PUZZLES[getDailyPuzzleIndex()].theme]}</span>
              <span className={s.dot2}>·</span>
              <span style={{ color:'var(--gold)', fontFamily:'var(--font-m)' }}>
                {PUZZLES[getDailyPuzzleIndex()].rating} rating
              </span>
            </div>
          </div>
          <button className="btn btn-gold" onClick={loadDaily}>
            {dailyDone ? '✅ Solved! Play Again' : 'Solve Today\'s Puzzle →'}
          </button>
        </motion.div>

        {/* Filter + puzzle grid */}
        <motion.div className={s.browseSection} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.2 }}>
          <div className={s.browseHeader}>
            <h2 className={s.browseTitle}>Browse Puzzles</h2>
            <div className={s.filterRow}>
              {(['all','easy','medium','hard'] as const).map(f => (
                <button key={f} className={`btn btn-sm ${filter===f ? 'btn-gold' : 'btn-ghost'}`}
                  onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={s.puzzleGrid}>
            {filteredPuzzles.map((p, i) => (
              <motion.div key={p.id} className={`card card-hover ${s.puzzleCard}`}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .02 }}
                onClick={() => loadPuzzle(p)}>
                <div className={s.pcTop}>
                  <span className={s.pcTheme}>{THEME_LABELS[p.theme]}</span>
                  <span className={s.pcRating} style={{ fontFamily:'var(--font-m)', color:'var(--muted)' }}>
                    {p.rating}
                  </span>
                </div>
                <div className={s.pcTitle}>{p.title}</div>
                <div className={s.pcDiff} style={{ color: DIFFICULTY_COLORS[p.difficulty] }}>
                  {'●'.repeat(p.difficulty==='easy'?1:p.difficulty==='medium'?2:3)}{'○'.repeat(3-(p.difficulty==='easy'?1:p.difficulty==='medium'?2:3))}
                  {' '}{p.difficulty}
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ textAlign:'center', marginTop: 24 }}>
            <button className="btn btn-gold btn-lg" onClick={loadRandom}>
              🎲 Random Puzzle
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // ── PLAYING / CORRECT / FAILED ─────────────────────────────
  return (
    <div className={s.page}>
      <div className={s.gameLayout}>
        {/* Left: info */}
        <motion.div className={s.leftCol} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}>
          {/* Puzzle info */}
          <div className={`card ${s.infoCard}`}>
            <div className={s.infoTop}>
              <div>
                <div className={s.infoTheme}>{THEME_LABELS[puzzle!.theme]}</div>
                <div className={s.infoTitle}>{puzzle!.title}</div>
              </div>
              <span className={s.infoDiff} style={{ color: DIFFICULTY_COLORS[puzzle!.difficulty] }}>
                {puzzle!.difficulty.toUpperCase()}
              </span>
            </div>
            <div className={s.infoRating}>
              <span style={{ color:'var(--muted)', fontSize:'.75rem' }}>PUZZLE RATING</span>
              <span style={{ fontFamily:'var(--font-m)', color:'var(--gold)' }}>{puzzle!.rating}</span>
            </div>
            <div className={s.infoInstruct}>
              {puzzle!.playerColor === 'white' ? '⬜' : '⬛'} Find the best move for <strong>{puzzle!.playerColor}</strong>
            </div>
          </div>

          {/* Your stats */}
          <div className={`card ${s.myStats}`}>
            <div className={s.myStatsRow}>
              <div className={s.myStat}>
                <span className={s.myStatVal} style={{ color:'var(--gold)' }}>{puzzleRating}</span>
                <span className={s.myStatLbl}>Your Rating</span>
              </div>
              <div className={s.myStat}>
                <span className={s.myStatVal} style={{ color:'var(--cyan)' }}>{streak}🔥</span>
                <span className={s.myStatLbl}>Streak</span>
              </div>
            </div>
            <div className={s.myStatsRow}>
              <div className={s.myStat}>
                <span className={s.myStatVal} style={{ color:'var(--green)' }}>{solved}</span>
                <span className={s.myStatLbl}>Solved</span>
              </div>
              <div className={s.myStat}>
                <span className={s.myStatVal} style={{ color:'var(--red)' }}>{failed}</span>
                <span className={s.myStatLbl}>Failed</span>
              </div>
            </div>
          </div>

          {/* Hint button */}
          {phase === 'playing' && (
            <button className={`btn btn-outline ${s.hintBtn}`} onClick={useHint} disabled={hintsUsed >= 3}>
              💡 Hint {hintsUsed > 0 ? `(${3 - hintsUsed} left)` : ''}
            </button>
          )}

          <button className="btn btn-ghost btn-sm" onClick={() => { setPhase('idle'); setPuzzle(null); }}>
            ← Back to Puzzles
          </button>
        </motion.div>

        {/* Center: board */}
        <div className={s.centerCol}>
          <div className={s.boardWrap}>
            <PuzzleBoard
              chess={chess}
              onMove={handleMove}
              disabled={phase !== 'playing'}
              lastMove={lastMove}
              playerColor={puzzle!.playerColor}
            />

            {/* Hint highlight overlay */}
            {hintSquare && phase === 'playing' && (
              <div className={s.hintOverlay}>
                <div className={s.hintPulse} style={{
                  left: `${(puzzle!.playerColor === 'white'
                    ? (hintSquare.charCodeAt(0) - 97)
                    : (7 - (hintSquare.charCodeAt(0) - 97))) * 12.5}%`,
                  bottom: `${(puzzle!.playerColor === 'white'
                    ? (parseInt(hintSquare[1]) - 1)
                    : (8 - parseInt(hintSquare[1]))) * 12.5}%`,
                }} />
              </div>
            )}
          </div>

          {/* Move progress dots */}
          {phase === 'playing' && (
            <div className={s.moveDots}>
              {puzzle!.moves.filter(m => m !== 'NONE').map((_, i) => (
                <div key={i} className={`${s.moveDot}${i < moveIdx ? ' ' + s.moveDotDone : i === moveIdx ? ' ' + s.moveDotActive : ''}`} />
              ))}
            </div>
          )}
        </div>

        {/* Right: result / moves */}
        <motion.div className={s.rightCol} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
          <AnimatePresence mode="wait">
            {phase === 'correct' && (
              <motion.div key="correct" className={`card ${s.resultCard} ${s.correct}`}
                initial={{ scale:.8, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ opacity:0 }}>
                <div className={s.resultEmoji}>✅</div>
                <div className={s.resultTitle}>Brilliant!</div>
                <div className={s.resultSub}>+{Math.max(5, Math.floor((puzzle!.rating - puzzleRating) * 0.1 + 15) - hintsUsed * 5)} rating</div>
                {streak > 1 && <div className={s.streakBadge}>🔥 {streak} Streak!</div>}
                <div className={s.resultBtns}>
                  <button className="btn btn-gold btn-lg" onClick={next}>Next Puzzle →</button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setPhase('idle'); }}>Browse All</button>
                </div>
              </motion.div>
            )}
            {phase === 'failed' && (
              <motion.div key="failed" className={`card ${s.resultCard} ${s.failed}`}
                initial={{ scale:.8, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ opacity:0 }}>
                <div className={s.resultEmoji}>❌</div>
                <div className={s.resultTitle}>Not quite!</div>
                <div className={s.resultSub}>-10 rating · Streak reset</div>
                <div className={s.resultBtns}>
                  <button className="btn btn-gold btn-lg" onClick={retry}>↺ Try Again</button>
                  <button className="btn btn-outline btn-sm" onClick={next}>Skip →</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPhase('idle')}>Browse All</button>
                </div>
              </motion.div>
            )}
            {phase === 'playing' && (
              <motion.div key="playing" className={`card ${s.tipsCard}`}
                initial={{ opacity:0 }} animate={{ opacity:1 }}>
                <div className="sec-hdr">Tips</div>
                <div className={s.tipsList}>
                  <div className={s.tip}>🔍 Look for checks, captures, threats</div>
                  <div className={s.tip}>♞ Knights can attack from unexpected angles</div>
                  <div className={s.tip}>📌 Pinned pieces can't defend well</div>
                  <div className={s.tip}>💡 Use hints if you're stuck (max 3)</div>
                  <div className={s.tip}>🎯 Think 2-3 moves ahead</div>
                </div>

                <div className={s.diffBreakdown}>
                  <div className="sec-hdr" style={{ marginTop:16 }}>Difficulty</div>
                  {(['easy','medium','hard'] as const).map(d => (
                    <div key={d} className={s.diffRow}>
                      <span style={{ color: DIFFICULTY_COLORS[d], fontSize:'.78rem', width:60 }}>{d}</span>
                      <div className={s.diffBar}>
                        <div className={s.diffFill} style={{
                          width: `${(PUZZLES.filter(p=>p.difficulty===d).length / PUZZLES.length) * 100}%`,
                          background: DIFFICULTY_COLORS[d]
                        }} />
                      </div>
                      <span style={{ color:'var(--muted)', fontSize:'.72rem', fontFamily:'var(--font-m)', width:24 }}>
                        {PUZZLES.filter(p=>p.difficulty===d).length}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
