import { Chess } from 'chess.js';

// Material weights
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece-Square Tables (PST) to encourage positional chess
// Values from White's perspective (mirror for Black)
const PAWN_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_PST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_MIDDLE_PST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

// Helper: Evaluates static position score
function evaluateBoard(chess) {
  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (!square) continue;

      const type = square.type;
      const color = square.color;
      let val = PIECE_VALUES[type];

      // Add positional adjustments from PST
      let pstVal = 0;
      const rowIdx = color === 'w' ? r : 7 - r; // Mirror PST for Black
      const colIdx = color === 'w' ? c : 7 - c;

      if (type === 'p') pstVal = PAWN_PST[rowIdx][colIdx];
      else if (type === 'n') pstVal = KNIGHT_PST[rowIdx][colIdx];
      else if (type === 'b') pstVal = BISHOP_PST[rowIdx][colIdx];
      else if (type === 'r') pstVal = ROOK_PST[rowIdx][colIdx];
      else if (type === 'q') pstVal = QUEEN_PST[rowIdx][colIdx];
      else if (type === 'k') pstVal = KING_MIDDLE_PST[rowIdx][colIdx];

      val += pstVal;

      if (color === 'w') {
        score += val;
      } else {
        score -= val;
      }
    }
  }

  // Active color perspective
  return score;
}

// Quiescence Search: avoids the horizon effect by searching all captures until position stable
function quiescenceSearch(chess, alpha, beta, colorFactor) {
  const standPat = evaluateBoard(chess) * colorFactor;
  
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  // Generate captures only
  const moves = chess.moves({ verbose: true }).filter(m => m.captured);

  for (const move of moves) {
    chess.move(move);
    const score = -quiescenceSearch(chess, -beta, -alpha, -colorFactor);
    chess.undo();

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

// Negamax search with alpha-beta pruning
function minimax(chess, depth, alpha, beta, isMaximizing, colorFactor) {
  if (depth === 0) {
    return quiescenceSearch(chess, alpha, beta, colorFactor);
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    if (chess.inCheck()) {
      return -99999 + (10 - depth); // Prefer faster mates
    }
    return 0; // Draw / Stalemate
  }

  // Move ordering: sort captures and promotions to search them first (yields faster alpha-beta cuts)
  moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA = PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB = PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    if (a.promotion) scoreA += 900;
    if (b.promotion) scoreB += 900;
    return scoreB - scoreA;
  });

  let bestValue = -Infinity;

  for (const move of moves) {
    chess.move(move);
    const val = -minimax(chess, depth - 1, -beta, -alpha, !isMaximizing, -colorFactor);
    chess.undo();

    bestValue = Math.max(bestValue, val);
    alpha = Math.max(alpha, val);
    if (alpha >= beta) {
      break; // Alpha-beta cut
    }
  }

  return bestValue;
}

/**
 * Calculates the best move on the current FEN.
 * @param {string} fen - Current board FEN
 * @param {number} level - Bot difficulty level (1 to 5)
 * @returns {object} The chosen move (e.g. {from: 'e2', to: 'e4'})
 */
export function getBestMove(fen, level) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });

  if (moves.length === 0) return null;

  // Level 1: Beginner
  // Depth 1 + 25% chance of playing a random move
  if (level === 1) {
    if (Math.random() < 0.25) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  const activeColor = chess.turn();
  const colorFactor = activeColor === 'w' ? 1 : -1;
  const depth = level; // Depth maps exactly to difficulty level (Level 1-5)

  let bestMove = null;
  let bestValue = -Infinity;

  // Move ordering
  moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA = PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB = PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    return scoreB - scoreA;
  });

  for (const move of moves) {
    chess.move(move);
    // Search child
    const val = -minimax(chess, depth - 1, -Infinity, Infinity, false, -colorFactor);
    chess.undo();

    if (val > bestValue) {
      bestValue = val;
      bestMove = move;
    }
  }

  // Fallback
  return bestMove || moves[Math.floor(Math.random() * moves.length)];
}
