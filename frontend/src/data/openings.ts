export interface Opening {
  name: string;
  eco: string;
  moves: string; // space-separated SAN moves prefix
  color?: string;
}

// Sorted by specificity (longer = more specific, checked first)
export const OPENINGS: Opening[] = [
  // Sicilian variations
  { eco:'B90', name:'Sicilian · Najdorf',           moves:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  { eco:'B86', name:'Sicilian · Sozin Attack',       moves:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bc4' },
  { eco:'B84', name:'Sicilian · Scheveningen',       moves:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6' },
  { eco:'B70', name:'Sicilian · Dragon',             moves:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6' },
  { eco:'B45', name:'Sicilian · Taimanov',           moves:'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6' },
  { eco:'B40', name:'Sicilian · Open',               moves:'e4 c5 Nf3 e6 d4 cxd4 Nxd4' },
  { eco:'B22', name:'Sicilian · Alapin',             moves:'e4 c5 c3' },
  { eco:'B20', name:'Sicilian Defence',              moves:'e4 c5' },
  // French
  { eco:'C18', name:'French · Winawer',              moves:'e4 e6 d4 d5 Nc3 Bb4' },
  { eco:'C11', name:'French · Classical',            moves:'e4 e6 d4 d5 Nc3 Nf6' },
  { eco:'C02', name:'French · Advance',              moves:'e4 e6 d4 d5 e5' },
  { eco:'C01', name:'French · Exchange',             moves:'e4 e6 d4 d5 exd5' },
  { eco:'C00', name:'French Defence',                moves:'e4 e6' },
  // Caro-Kann
  { eco:'B13', name:'Caro-Kann · Exchange',          moves:'e4 c6 d4 d5 exd5 cxd5' },
  { eco:'B12', name:'Caro-Kann · Advance',           moves:'e4 c6 d4 d5 e5' },
  { eco:'B10', name:'Caro-Kann Defence',             moves:'e4 c6' },
  // Ruy Lopez
  { eco:'C99', name:'Ruy Lopez · Closed',            moves:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O' },
  { eco:'C65', name:'Ruy Lopez · Berlin',            moves:'e4 e5 Nf3 Nc6 Bb5 Nf6' },
  { eco:'C60', name:'Ruy Lopez',                     moves:'e4 e5 Nf3 Nc6 Bb5' },
  // Italian
  { eco:'C54', name:'Italian · Giuoco Piano',        moves:'e4 e5 Nf3 Nc6 Bc4 Bc5 c3' },
  { eco:'C53', name:'Italian Game',                  moves:'e4 e5 Nf3 Nc6 Bc4 Bc5' },
  { eco:'C50', name:'Italian Game',                  moves:'e4 e5 Nf3 Nc6 Bc4' },
  // Scotch
  { eco:'C45', name:'Scotch Game',                   moves:'e4 e5 Nf3 Nc6 d4 exd4 Nxd4' },
  { eco:'C44', name:'Scotch Opening',                moves:'e4 e5 Nf3 Nc6 d4' },
  // Kings Gambit
  { eco:'C33', name:'King\'s Gambit · Accepted',     moves:'e4 e5 f4 exf4' },
  { eco:'C30', name:'King\'s Gambit',                moves:'e4 e5 f4' },
  // Petrov
  { eco:'C42', name:'Petrov Defence',                moves:'e4 e5 Nf3 Nf6' },
  // Open games
  { eco:'C20', name:'King\'s Pawn Game',             moves:'e4 e5' },
  // Queens Gambit
  { eco:'D43', name:'QGD · Semi-Slav',               moves:'d4 d5 c4 e6 Nc3 Nf6 Nf3 c6' },
  { eco:'D30', name:'QGD · Semi-Slav',               moves:'d4 d5 c4 e6 Nf3 Nf6 Nc3 c6' },
  { eco:'D35', name:'Queen\'s Gambit · Exchange',    moves:'d4 d5 c4 e6 Nc3 Nf6 cxd5' },
  { eco:'D20', name:'Queen\'s Gambit · Accepted',    moves:'d4 d5 c4 dxc4' },
  { eco:'D06', name:'Queen\'s Gambit',               moves:'d4 d5 c4' },
  // Kings Indian
  { eco:'E97', name:'King\'s Indian · Classical',    moves:'d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6' },
  { eco:'E60', name:'King\'s Indian Defence',        moves:'d4 Nf6 c4 g6' },
  // Nimzo / Queens Indian
  { eco:'E20', name:'Nimzo-Indian Defence',          moves:'d4 Nf6 c4 e6 Nc3 Bb4' },
  { eco:'E12', name:'Queen\'s Indian Defence',       moves:'d4 Nf6 c4 e6 Nf3 b6' },
  // English
  { eco:'A20', name:'English Opening',               moves:'c4 e5' },
  { eco:'A10', name:'English Opening',               moves:'c4' },
  // Dutch
  { eco:'A80', name:'Dutch Defence',                 moves:'d4 f5' },
  // Reti
  { eco:'A05', name:'Réti Opening',                  moves:'Nf3 Nf6' },
  { eco:'A04', name:'Réti Opening',                  moves:'Nf3' },
  // London
  { eco:'D02', name:'London System',                 moves:'d4 d5 Nf3 Nf6 Bf4' },
  { eco:'D01', name:'London System',                 moves:'d4 Nf6 Nf3 d5 Bf4' },
  // Pirc / Modern
  { eco:'B07', name:'Pirc Defence',                  moves:'e4 d6 d4 Nf6' },
  { eco:'B06', name:'Modern Defence',                moves:'e4 g6' },
  // Scholar's mate area
  { eco:'C50', name:'Four Knights Game',             moves:'e4 e5 Nf3 Nc6 Nc3 Nf6' },
  // d4 generic
  { eco:'A00', name:'Queen\'s Pawn Game',            moves:'d4 d5' },
  { eco:'A00', name:'Queen\'s Pawn Opening',         moves:'d4' },
];

export function detectOpening(sanMoves: string[]): Opening | null {
  if (!sanMoves.length) return null;
  const movesStr = sanMoves.join(' ');

  // Sort by move length descending (most specific first)
  const sorted = [...OPENINGS].sort((a, b) => b.moves.split(' ').length - a.moves.split(' ').length);

  for (const opening of sorted) {
    if (movesStr.startsWith(opening.moves) || movesStr === opening.moves) {
      return opening;
    }
  }
  return null;
}
