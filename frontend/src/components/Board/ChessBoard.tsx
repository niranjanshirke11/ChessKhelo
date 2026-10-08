import { useMemo, useCallback } from 'react';
import { useGame } from '../../store/gameStore';
import { sounds } from '../../services/sounds';
import s from './Board.module.css';

const U: Record<string, string> = {
  wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
  bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟',
};
const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

export default function ChessBoard() {
  const { chess, selectedSq, validMoves, lastMove, flipped, selectSq, playerColor, phase } = useGame();
  useMemo(() => chess.board(), [chess.fen()]);
  const myTurn = chess.turn() === (playerColor === 'white' ? 'w' : 'b') && phase === 'playing';

  const getSq = useCallback((r: number, c: number): string => {
    const dr = flipped ? 7 - r : r;
    const dc = flipped ? 7 - c : c;
    return `${FILES[dc]}${RANKS[dr]}`;
  }, [flipped]);

  const renderSq = (r: number, c: number) => {
    const sq = getSq(r, c);
    const dr = flipped ? 7 - r : r;
    const dc = flipped ? 7 - c : c;
    const light = (dr + dc) % 2 === 0;
    const piece = chess.get(sq as any);
    const k = piece ? `${piece.color}${piece.type.toUpperCase()}` : null;

    const cls = [
      s.sq, light ? s.lt : s.dk,
      sq === selectedSq ? s.sel : '',
      lastMove && (lastMove.from === sq || lastMove.to === sq) ? s.last : '',
      validMoves.includes(sq) ? (piece ? s.cap : s.mv) : '',
    ].filter(Boolean).join(' ');

    return (
      <div key={sq} className={cls} onClick={() => { sounds.resume(); myTurn && selectSq(sq); }}>
        {c === 0 && <span className={`${s.coord} ${s.cr}`}>{RANKS[dr]}</span>}
        {r === 7 && <span className={`${s.coord} ${s.cf}`}>{FILES[dc]}</span>}
        {k && (
          <span className={`${s.piece} ${piece?.color === 'w' ? s.wp : s.bp}`}>
            {U[k]}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={s.wrap}>
      <div className={s.board}>
        {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => renderSq(r, c)))}
      </div>
    </div>
  );
}
