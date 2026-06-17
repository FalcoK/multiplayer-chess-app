import { Chess } from 'chess.js';

const PIECE_NAMES = {
  p: 'Bauer',
  n: 'Springer',
  b: 'Läufer',
  r: 'Turm',
  q: 'Dame',
  k: 'König'
};

/**
 * Compares two board states and returns a natural language explanation on why the move is optimal.
 * @param {string} fenBefore - Board state before the move
 * @param {object} move - The move object (e.g. from chessEngine.js)
 * @returns {string} Explanatory coaching text in German
 */
export function explainMove(fenBefore, move) {
  if (!move) return "Überlege dir einen soliden Entwicklungszug, um deine Figuren zu aktivieren.";

  const chess = new Chess(fenBefore);
  const from = move.from;
  const to = move.to;
  const piece = chess.get(from);
  
  if (!piece) return "Dieser Zug verbessert die Aktivität deiner Figuren.";

  const pieceName = PIECE_NAMES[piece.type];
  const targetPiece = chess.get(to);

  // Execute the move to see what changes
  const executed = chess.move({ from, to, promotion: move.promotion || 'q' });
  if (!executed) return "Dieser Zug verbessert deine allgemeine Position.";

  const san = executed.san;
  const isCheck = chess.inCheck();
  const isMate = chess.isGameOver() && chess.isCheckmate();
  const isDraw = chess.isGameOver() && !chess.isCheckmate();

  // Tactic checks
  // 1. Checkmate
  if (isMate) {
    return `Der Zug **${san}** setzt den gegnerischen König direkt **Schachmatt** und beendet die Partie erfolgreich! Hervorragende Taktik.`;
  }

  // 2. Material Capture
  if (executed.captured) {
    const capturedName = PIECE_NAMES[executed.captured];
    const valueDiff = getPieceValue(executed.captured) - getPieceValue(piece.type);
    
    if (valueDiff > 0) {
      return `Mit **${san}** schlägst du einen gegnerischen **${capturedName}** mit einem schwächeren **${pieceName}**. Dies ist ein hervorragender Materialgewinn!`;
    }
    return `Der Zug **${san}** schlägt den gegnerischen **${capturedName}** auf ${to} und sichert dir wichtiges Material auf dem Brett.`;
  }

  // 3. Pawn Promotion
  if (move.promotion || san.includes('=')) {
    return `Mit **${san}** bringst du deinen Bauern zur gegnerischen Grundreihe und wandelst ihn in eine extrem spielstarke **Dame** um.`;
  }

  // 4. Castling
  if (san === 'O-O' || san === 'O-O-O') {
    return `Die Rochade (**${san}**) bringt deinen **König** in Sicherheit vor feindlichen Angriffen und aktiviert gleichzeitig den **Turm** für den Spielaufbau.`;
  }

  // 5. Check
  if (isCheck) {
    return `Durch **${san}** gibst du dem gegnerischen König ein **Schach**. Dies stört den gegnerischen Spielfluss und zwingt ihn zur Verteidigung.`;
  }

  // 6. Central control
  const centerSquares = ['d4', 'd5', 'e4', 'e5'];
  if (centerSquares.includes(to)) {
    return `Der Zug **${san}** platziert deinen **${pieceName}** im **Zentrum** des Bretts. Die Beherrschung des Zentrums ist der Schlüssel zur Kontrolle des gesamten Spiels.`;
  }

  // 7. Minor piece development in opening (moves 1-10)
  const isOpening = chess.history().length < 20;
  if (isOpening && (piece.type === 'n' || piece.type === 'b')) {
    return `Dieser Zug entwickelt deinen **${pieceName}** auf ein aktiveres Feld (**${to}**). In der Eröffnung solltest du deine Leichtfiguren schnell ins Spiel bringen.`;
  }

  // 8. King safety / defense
  if (piece.type === 'k') {
    return `Durch **${san}** ziehst du deinen **König** aus der Gefahrenzone auf ein sichereres Feld, um feindlichen Mattdrohungen auszuweichen.`;
  }

  // 9. Attacking / Pinning threats
  // Check if after the move, we attack something valuable that wasn't attacked before
  const newChess = new Chess(chess.fen());
  const moves = newChess.moves({ verbose: true });
  const attacksValuable = moves.some(m => m.captured && getPieceValue(m.captured) >= 300);
  if (attacksValuable) {
    return `Der Zug **${san}** bringt deinen **${pieceName}** in eine offensive Position und droht im nächsten Zug mit dem Gewinn einer wertvollen gegnerischen Figur.`;
  }

  // Default
  return `Der Zug **${san}** verbessert deine Positionierung, erhöht die Aktivität deines **${pieceName}s** und sichert dir eine stabile Stellung.`;
}

function getPieceValue(type) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  return values[type] || 0;
}
