const { Chess } = require('chess.js');

/**
 * Calculates ELO changes for a completed chess game.
 * @param {number} whiteElo - Current ELO of the White player
 * @param {number} blackElo - Current ELO of the Black player
 * @param {string} result - Match result: 'white_win', 'black_win', or 'draw'
 * @param {number} kFactor - The ELO K-factor (default 32)
 * @returns {{whiteDelta: number, blackDelta: number, newWhiteElo: number, newBlackElo: number}}
 */
function calculateElo(whiteElo, blackElo, result, kFactor = 32) {
  // Expected scores
  const expectedWhite = 1 / (1 + Math.pow(10, (blackElo - whiteElo) / 400));
  const expectedBlack = 1 / (1 + Math.pow(10, (whiteElo - blackElo) / 400));

  // Actual scores
  let scoreWhite = 0.5;
  let scoreBlack = 0.5;

  if (result === 'white_win') {
    scoreWhite = 1;
    scoreBlack = 0;
  } else if (result === 'black_win') {
    scoreWhite = 0;
    scoreBlack = 1;
  }

  // Calculate rating changes
  const whiteDelta = Math.round(kFactor * (scoreWhite - expectedWhite));
  const blackDelta = Math.round(kFactor * (scoreBlack - expectedBlack));

  return {
    whiteDelta,
    blackDelta,
    newWhiteElo: Math.max(100, whiteElo + whiteDelta), // Keep Elo above 100
    newBlackElo: Math.max(100, blackElo + blackDelta)
  };
}

/**
 * Validates a move on a given FEN string and returns the new FEN and PGN info.
 * @param {string} fen - Current board FEN
 * @param {object|string} move - Move to execute (e.g. {from: 'e2', to: 'e4', promotion: 'q'} or SAN 'e4')
 * @returns {{valid: boolean, fen: string, pgn: string, isGameOver: boolean, result: string|null, termination: string|null}}
 */
function validateAndMakeMove(fen, move, currentPgn = '') {
  try {
    const chess = new Chess(fen);
    
    // Load PGN history if any exists
    if (currentPgn) {
      chess.loadPgn(currentPgn);
    }
    
    // Make the move
    const executedMove = chess.move(move);
    
    if (!executedMove) {
      return { valid: false };
    }

    let isGameOver = chess.isGameOver();
    let result = null;
    let termination = null;

    if (isGameOver) {
      if (chess.isCheckmate()) {
        result = chess.turn() === 'w' ? 'black_win' : 'white_win'; // Active turn is the player who is mated
        termination = 'checkmate';
      } else if (chess.isDraw()) {
        result = 'draw';
        if (chess.isStalemate()) {
          termination = 'stalemate';
        } else if (chess.isThreefoldRepetition()) {
          termination = 'threefold_repetition';
        } else if (chess.isInsufficientMaterial()) {
          termination = 'draw_insufficient_material';
        } else {
          termination = 'draw_agreement'; // Default draw
        }
      }
    }

    return {
      valid: true,
      fen: chess.fen(),
      pgn: chess.pgn(),
      isGameOver,
      result,
      termination,
      san: executedMove.san
    };
  } catch (error) {
    console.error('Chess logic validation error:', error);
    return { valid: false };
  }
}

module.exports = {
  calculateElo,
  validateAndMakeMove
};
