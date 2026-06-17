import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessPiece } from './ChessPieces';
import './ChessBoard.css';

export default function ChessBoard({
  fen,
  orientation = 'white',
  lastMove = null,
  onMove,
  disabled = false,
  theme = 'modern',
  coachHighlight = null
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [promotionPending, setPromotionPending] = useState(null);

  // Instantiating chess.js to compute legal moves, checks, etc.
  const chess = new Chess(fen);
  const isChecked = chess.inCheck();
  const activeColor = chess.turn(); // 'w' or 'b'

  // Clear selections when FEN changes
  useEffect(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
    setPromotionPending(null);
  }, [fen]);

  // Find King square if checked
  let checkedKingSquare = null;
  if (isChecked) {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell && cell.type === 'k' && cell.color === activeColor) {
          checkedKingSquare = cell.square;
          break;
        }
      }
      if (checkedKingSquare) break;
    }
  }

  const ranks = orientation === 'white' 
    ? ['8', '7', '6', '5', '4', '3', '2', '1'] 
    : ['1', '2', '3', '4', '5', '6', '7', '8'];

  const files = orientation === 'white' 
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] 
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  const handleSquareClick = (square) => {
    if (disabled || promotionPending) return;

    const piece = chess.get(square);

    // If a piece is already selected and we click on a destination
    if (selectedSquare) {
      const isLegalDestination = legalMoves.some(m => m.to === square);

      if (isLegalDestination) {
        // Check if this move is a promotion (pawn reaching 1st or 8th rank)
        const movingPiece = chess.get(selectedSquare);
        const isPawn = movingPiece && movingPiece.type === 'p';
        const isPromotionRank = square.endsWith('8') || square.endsWith('1');

        if (isPawn && isPromotionRank) {
          // Trigger promotion selection dialog
          setPromotionPending({ from: selectedSquare, to: square });
          return;
        }

        // Execute normal move
        onMove({ from: selectedSquare, to: square });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Select piece of active color
    if (piece && piece.color === activeColor) {
      setSelectedSquare(square);
      // Fetch legal moves for this square
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handlePromotionSelect = (promotionPiece) => {
    if (promotionPending) {
      onMove({
        from: promotionPending.from,
        to: promotionPending.to,
        promotion: promotionPiece
      });
      setPromotionPending(null);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  return (
    <div className="board-container animate-fade-in">
      <div className={`chess-board board-theme-${theme}`}>
        
        {ranks.map((rank, rIdx) => 
          files.map((file, fIdx) => {
            const square = file + rank;
            const piece = chess.get(square);
            const isLight = (rIdx + fIdx) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isKingChecked = checkedKingSquare === square;
            
            // Highlight if part of the last move
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);

            // Highlight if recommended by coach
            const isCoachHighlight = coachHighlight && (coachHighlight.from === square || coachHighlight.to === square);

            // Is this a legal move destination?
            const legalMove = legalMoves.find(m => m.to === square);
            const isLegal = !!legalMove;
            const isCapture = isLegal && piece;

            return (
              <div
                key={square}
                className={`board-square ${isLight ? 'light-square' : 'dark-square'} ${isSelected ? 'selected-square' : ''} ${isLastMove ? 'last-move-square' : ''} ${isKingChecked ? 'king-checked' : ''} ${isCoachHighlight ? 'coach-highlight-square' : ''}`}
                onClick={() => handleSquareClick(square)}
              >
                {/* Labels on edges */}
                {((orientation === 'white' && rank === '1') || (orientation === 'black' && rank === '8')) && (
                  <span className="square-label file-label">{file}</span>
                )}
                {((orientation === 'white' && file === 'a') || (orientation === 'black' && file === 'h')) && (
                  <span className="square-label rank-label">{rank}</span>
                )}

                {/* Render piece */}
                {piece && (
                  <div className="board-piece">
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal Move Indicators */}
                {isLegal && !isCapture && <div className="legal-dot"></div>}
                {isLegal && isCapture && <div className="legal-ring"></div>}
              </div>
            );
          })
        )}

        {/* Promotion Dialog Modal overlay inside the board */}
        {promotionPending && (
          <div className="promotion-overlay">
            <div className="promotion-box">
              {['q', 'r', 'b', 'n'].map(pCode => (
                <button
                  key={pCode}
                  className="promotion-option"
                  onClick={() => handlePromotionSelect(pCode)}
                >
                  <ChessPiece type={pCode} color={activeColor} size="45px" />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
