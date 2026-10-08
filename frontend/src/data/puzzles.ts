export interface Puzzle {
  id: string;
  fen: string;          // position to solve
  moves: string[];      // correct move sequence (UCI format e.g. "e2e4")
  theme: string;        // 'checkmate' | 'fork' | 'pin' | 'skewer' | 'discovery' | 'deflection'
  difficulty: 'easy' | 'medium' | 'hard';
  rating: number;
  title: string;
  playerColor: 'white' | 'black';
}

export const PUZZLES: Puzzle[] = [
  // ── EASY: Checkmate in 1 ──────────────────────────────────
  {
    id: 'p001', title: 'Back Rank Mate', theme: 'checkmate', difficulty: 'easy', rating: 800,
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    moves: ['e1e8'], playerColor: 'white'
  },
  {
    id: 'p002', title: 'Queen Delivers', theme: 'checkmate', difficulty: 'easy', rating: 850,
    fen: '5rk1/5ppp/8/8/8/8/5PPP/5QK1 w - - 0 1',
    moves: ['f1f8'], playerColor: 'white'
  },
  {
    id: 'p003', title: 'Smothered Threat', theme: 'checkmate', difficulty: 'easy', rating: 900,
    fen: 'r5k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    moves: ['a1a8'], playerColor: 'white'
  },
  {
    id: 'p004', title: 'Rook to the Rescue', theme: 'checkmate', difficulty: 'easy', rating: 800,
    fen: '6k1/6pp/8/8/8/8/6PP/3R2K1 w - - 0 1',
    moves: ['d1d8'], playerColor: 'white'
  },
  {
    id: 'p005', title: 'Queen Checkmate', theme: 'checkmate', difficulty: 'easy', rating: 750,
    fen: '7k/6pp/8/8/8/8/6PP/6QK w - - 0 1',
    moves: ['g1g8'], playerColor: 'white'
  },
  {
    id: 'p006', title: 'Corner Trap', theme: 'checkmate', difficulty: 'easy', rating: 820,
    fen: '7k/5Qpp/8/8/8/8/6PP/6K1 w - - 0 1',
    moves: ['f7f8'], playerColor: 'white'
  },
  {
    id: 'p007', title: 'Rook Sweep', theme: 'checkmate', difficulty: 'easy', rating: 860,
    fen: '5k2/5ppp/8/8/8/8/5PPP/3RK3 w - - 0 1',
    moves: ['d1d8'], playerColor: 'white'
  },
  {
    id: 'p008', title: 'Bishop Assist', theme: 'checkmate', difficulty: 'easy', rating: 880,
    fen: '6k1/6pp/6P1/8/8/8/6PP/5QK1 w - - 0 1',
    moves: ['f1f8'], playerColor: 'white'
  },
  // ── EASY: Forks ──────────────────────────────────────────
  {
    id: 'p009', title: 'Knight Fork', theme: 'fork', difficulty: 'easy', rating: 900,
    fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
    moves: ['d5c7'], playerColor: 'white'
  },
  {
    id: 'p010', title: 'Royal Fork', theme: 'fork', difficulty: 'easy', rating: 950,
    fen: 'r3k3/8/8/8/8/3N4/8/4K3 w - - 0 1',
    moves: ['d3c5', 'e8d8', 'c5a8'], playerColor: 'white'  
  },
  {
    id: 'p011', title: 'Queen Fork', theme: 'fork', difficulty: 'easy', rating: 880,
    fen: '4k3/8/8/3r4/8/8/3Q4/4K3 w - - 0 1',
    moves: ['d2d5'], playerColor: 'white'
  },
  // ── MEDIUM: Checkmate in 2 ────────────────────────────────
  {
    id: 'p012', title: 'Double Attack', theme: 'checkmate', difficulty: 'medium', rating: 1100,
    fen: '5rk1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1',
    moves: ['f3f7', 'g8h8', 'f7f8'], playerColor: 'white'
  },
  {
    id: 'p013', title: 'Rook Ladder', theme: 'checkmate', difficulty: 'medium', rating: 1050,
    fen: '6k1/7p/8/8/8/8/7P/R5RK w - - 0 1',
    moves: ['g1g7', 'g8h8', 'a1a8'], playerColor: 'white'
  },
  {
    id: 'p014', title: 'Discovered Check', theme: 'discovery', difficulty: 'medium', rating: 1150,
    fen: '4r1k1/5ppp/8/3B4/8/8/5PPP/4R1K1 w - - 0 1',
    moves: ['d5f7', 'g8h8', 'e1e8'], playerColor: 'white'
  },
  {
    id: 'p015', title: 'Pin and Win', theme: 'pin', difficulty: 'medium', rating: 1100,
    fen: '4k3/4r3/8/8/8/8/4R3/3BK3 w - - 0 1',
    moves: ['d1b3', 'e8d8', 'e2e7'], playerColor: 'white'
  },
  {
    id: 'p016', title: 'Skewer Attack', theme: 'skewer', difficulty: 'medium', rating: 1080,
    fen: '6k1/8/8/8/8/8/R7/6K1 w - - 0 1',
    moves: ['a2a8'], playerColor: 'white'
  },
  {
    id: 'p017', title: 'Deflection', theme: 'deflection', difficulty: 'medium', rating: 1200,
    fen: '3r2k1/5ppp/8/8/3Q4/8/5PPP/6K1 w - - 0 1',
    moves: ['d4d8', 'd8d8', 'NONE'], playerColor: 'white'
  },
  {
    id: 'p018', title: 'Overloaded Defender', theme: 'deflection', difficulty: 'medium', rating: 1180,
    fen: '5rk1/4rppp/8/8/8/1Q6/5PPP/6K1 w - - 0 1',
    moves: ['b3b8', 'f8b8', 'NONE'], playerColor: 'white'
  },
  {
    id: 'p019', title: 'Bishop Fork', theme: 'fork', difficulty: 'medium', rating: 1120,
    fen: 'r3k2r/8/8/3B4/8/8/8/4K3 w - - 0 1',
    moves: ['d5b7'], playerColor: 'white'
  },
  {
    id: 'p020', title: 'Zwischenzug', theme: 'checkmate', difficulty: 'medium', rating: 1250,
    fen: '2r3k1/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1',
    moves: ['d3d8', 'c8d8', 'NONE'], playerColor: 'white'
  },
  // ── MEDIUM: Pins ──────────────────────────────────────────
  {
    id: 'p021', title: 'Absolute Pin', theme: 'pin', difficulty: 'medium', rating: 1100,
    fen: '4k3/4n3/8/8/8/8/4B3/4K3 w - - 0 1',
    moves: ['e2b5'], playerColor: 'white'
  },
  {
    id: 'p022', title: 'Pin the Knight', theme: 'pin', difficulty: 'medium', rating: 1050,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['c4f7'], playerColor: 'white'
  },
  // ── MEDIUM: Tactics ──────────────────────────────────────
  {
    id: 'p023', title: 'Removing the Guard', theme: 'deflection', difficulty: 'medium', rating: 1200,
    fen: '5k2/5ppp/5n2/8/8/5Q2/5PPP/5K2 w - - 0 1',
    moves: ['f3f6', 'g7f6', 'NONE'], playerColor: 'white'
  },
  {
    id: 'p024', title: 'X-Ray Attack', theme: 'skewer', difficulty: 'medium', rating: 1150,
    fen: '3k4/8/8/8/8/8/8/R2K4 w - - 0 1',
    moves: ['a1d1'], playerColor: 'white'
  },
  {
    id: 'p025', title: 'Desperado', theme: 'fork', difficulty: 'medium', rating: 1300,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    moves: ['c4f7', 'e8f7', 'f3e5'], playerColor: 'white'
  },
  // ── HARD: Checkmate in 3 ─────────────────────────────────
  {
    id: 'p026', title: 'Smothered Mate', theme: 'checkmate', difficulty: 'hard', rating: 1600,
    fen: '6rk/6pp/7N/8/8/8/6PP/6RK w - - 0 1',
    moves: ['h6f7', 'g8f8', 'f7h6', 'f8g8', 'h6f7'], playerColor: 'white'
  },
  {
    id: 'p027', title: 'Arabian Mate', theme: 'checkmate', difficulty: 'hard', rating: 1500,
    fen: '5k2/5N1p/7R/8/8/8/8/5K2 w - - 0 1',
    moves: ['f7h8', 'f8e7', 'h6h7'], playerColor: 'white'
  },
  {
    id: 'p028', title: 'Epaulette Mate', theme: 'checkmate', difficulty: 'hard', rating: 1550,
    fen: '3rkr2/8/8/8/8/3Q4/8/3K4 w - - 0 1',
    moves: ['d3d8'], playerColor: 'white'
  },
  {
    id: 'p029', title: 'Boden\'s Mate', theme: 'checkmate', difficulty: 'hard', rating: 1650,
    fen: '2kr4/ppp5/2n5/3B4/8/2B5/PPP5/2KR4 w - - 0 1',
    moves: ['d5b7'], playerColor: 'white'
  },
  {
    id: 'p030', title: 'Anastasia\'s Mate', theme: 'checkmate', difficulty: 'hard', rating: 1700,
    fen: '5rk1/4Nppp/8/8/8/8/5PPP/6K1 w - - 0 1',
    moves: ['e7f5', 'g8h8', 'f5h6', 'h8g8', 'h6f7'], playerColor: 'white'
  },
  // ── HARD: Complex Tactics ─────────────────────────────────
  {
    id: 'p031', title: 'Windmill', theme: 'discovery', difficulty: 'hard', rating: 1800,
    fen: '5rk1/2p2Npp/8/8/8/8/5PPP/5RK1 w - - 0 1',
    moves: ['f7h6', 'g8h8', 'h6f7', 'h8g8', 'f7d8', 'g8h8', 'd8f7'], playerColor: 'white'
  },
  {
    id: 'p032', title: 'Discovered Attack', theme: 'discovery', difficulty: 'hard', rating: 1650,
    fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    moves: ['f3g5', 'e8g8', 'g5f7'], playerColor: 'white'
  },
  {
    id: 'p033', title: 'Interference', theme: 'deflection', difficulty: 'hard', rating: 1750,
    fen: '2r1r1k1/5ppp/8/4N3/8/8/5PPP/2R1R1K1 w - - 0 1',
    moves: ['e5f7', 'e8f8', 'e1e8'], playerColor: 'white'
  },
  {
    id: 'p034', title: 'Battery Mate', theme: 'checkmate', difficulty: 'hard', rating: 1600,
    fen: '6k1/5ppp/8/8/8/1Q6/5PPP/3RR1K1 w - - 0 1',
    moves: ['d1d8', 'g8f7', 'b3f7'], playerColor: 'white'
  },
  {
    id: 'p035', title: 'Zugzwang', theme: 'checkmate', difficulty: 'hard', rating: 1900,
    fen: '6k1/6p1/6K1/6Q1/8/8/8/8 w - - 0 1',
    moves: ['g5g6', 'g8h8', 'g6h6'], playerColor: 'white'
  },
  // ── More EASY ────────────────────────────────────────────
  {
    id: 'p036', title: 'Hanging Piece', theme: 'fork', difficulty: 'easy', rating: 800,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['f3e5'], playerColor: 'white'
  },
  {
    id: 'p037', title: 'Free Queen', theme: 'fork', difficulty: 'easy', rating: 750,
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1',
    moves: ['g1f3'], playerColor: 'white'
  },
  {
    id: 'p038', title: 'Scholar\'s Mate', theme: 'checkmate', difficulty: 'easy', rating: 700,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    moves: ['f3f7'], playerColor: 'white'
  },
  {
    id: 'p039', title: 'Fool\'s Mate Setup', theme: 'checkmate', difficulty: 'easy', rating: 650,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 1',
    moves: ['d8h4'], playerColor: 'black'
  },
  {
    id: 'p040', title: 'Pawn Promotion', theme: 'checkmate', difficulty: 'easy', rating: 900,
    fen: '8/3P3k/8/8/8/8/8/7K w - - 0 1',
    moves: ['d7d8q'], playerColor: 'white'
  },
  // ── More MEDIUM ───────────────────────────────────────────
  {
    id: 'p041', title: 'Greek Gift', theme: 'checkmate', difficulty: 'medium', rating: 1400,
    fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    moves: ['c4f7', 'e8f7', 'f3g5', 'f7g8', 'd1f3'], playerColor: 'white'
  },
  {
    id: 'p042', title: 'Back Rank Weakness', theme: 'checkmate', difficulty: 'medium', rating: 1200,
    fen: '5rk1/5ppp/8/4q3/8/8/5PPP/3RR1K1 w - - 0 1',
    moves: ['d1d8', 'e5e1', 'e1e1'], playerColor: 'white'
  },
  {
    id: 'p043', title: 'Rook Sacrifice', theme: 'checkmate', difficulty: 'medium', rating: 1350,
    fen: '5k2/5pp1/7p/8/8/3Q4/5PPP/5K2 w - - 0 1',
    moves: ['d3d8', 'f8e7', 'd8e7'], playerColor: 'white'
  },
  {
    id: 'p044', title: 'Trapped Queen', theme: 'fork', difficulty: 'medium', rating: 1100,
    fen: 'rnb1kbnr/pppp1ppp/8/4p2q/4PP2/8/PPPP2PP/RNBQKBNR w KQkq - 0 1',
    moves: ['g2g3'], playerColor: 'white'
  },
  {
    id: 'p045', title: 'Knight Outpost', theme: 'fork', difficulty: 'medium', rating: 1250,
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1',
    moves: ['f3d5'], playerColor: 'white'
  },
  // ── More HARD ─────────────────────────────────────────────
  {
    id: 'p046', title: 'Lollis Mate', theme: 'checkmate', difficulty: 'hard', rating: 1700,
    fen: '2r3k1/5ppp/8/8/8/3Q4/5PPP/5RK1 w - - 0 1',
    moves: ['d3d8', 'c8d8', 'f1f8', 'd8f8', 'NONE'], playerColor: 'white'
  },
  {
    id: 'p047', title: 'Morphy\'s Style', theme: 'checkmate', difficulty: 'hard', rating: 1850,
    fen: 'r3kb1r/ppp2ppp/2n1bn2/3qp3/2BPP3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    moves: ['c4f7', 'e8f7', 'f3e5', 'f7e8', 'e5f7'], playerColor: 'white'
  },
  {
    id: 'p048', title: 'Dovetail Mate', theme: 'checkmate', difficulty: 'hard', rating: 1750,
    fen: '3r2k1/5ppp/8/8/2Q5/8/5PPP/6K1 w - - 0 1',
    moves: ['c4c8', 'd8c8', 'NONE'], playerColor: 'white'
  },
  {
    id: 'p049', title: 'Suffocation Mate', theme: 'checkmate', difficulty: 'hard', rating: 1800,
    fen: '6rk/6pp/7N/8/8/8/6PP/7K w - - 0 1',
    moves: ['h6f7', 'g8g7', 'f7h8'], playerColor: 'white'
  },
  {
    id: 'p050', title: 'Opera Mate', theme: 'checkmate', difficulty: 'hard', rating: 1900,
    fen: '3k4/R7/1R6/8/8/8/8/3K4 w - - 0 1',
    moves: ['b6b8'], playerColor: 'white'
  },
];

export const THEME_LABELS: Record<string, string> = {
  checkmate: '♚ Checkmate',
  fork: '⚔️ Fork',
  pin: '📌 Pin',
  skewer: '🗡️ Skewer',
  discovery: '💥 Discovery',
  deflection: '🌀 Deflection',
};

export const DIFFICULTY_COLORS = {
  easy:   '#00ff88',
  medium: '#f5c842',
  hard:   '#ff4466',
};
