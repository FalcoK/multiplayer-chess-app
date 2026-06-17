import React from 'react';

// Lightweight, modern SVG definitions for all 12 chess pieces.
// Hand-optimized standard shapes that look clean on any display.
export const ChessPiece = ({ type, color, size = "100%" }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#ffffff' : '#222222';
  const stroke = isWhite ? '#222222' : '#ffffff';
  const strokeWidth = 1.5;

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 45 45",
    style: { display: 'block', transition: 'all 0.15s ease' }
  };

  switch (type.toLowerCase()) {
    case 'p': // Pawn
      return (
        <svg {...svgProps}>
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round">
            <path d="M22,9 C19.79,9 18,10.79 18,13 C18,14.24 18.57,15.34 19.47,16.07 C17.39,17.25 16,19.46 16,22 L29,22 C29,19.46 27.61,17.25 25.53,16.07 C26.43,15.34 27,14.24 27,13 C27,10.79 25.21,9 23,9 L22,9 Z" />
            <path d="M12,36 L33,36 L33,32 L12,32 L12,36 Z" />
            <path d="M14,32 L31,32 L28,22 L17,22 L14,32 Z" />
            <path d="M15,38 L30,38 L30,36 L15,36 L15,38 Z" />
          </g>
        </svg>
      );

    case 'r': // Rook
      return (
        <svg {...svgProps}>
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
            <path d="M9,39 L36,39 L36,36 L9,36 L9,39 Z" />
            <path d="M12,36 L33,36 L30,19 L15,19 L12,36 Z" />
            <path d="M14,19 L31,19 L33,9 L29,9 L29,13 L25,13 L25,9 L20,9 L20,13 L16,13 L16,9 L12,9 L14,19 Z" />
            <path d="M11,14 L34,14" fill="none" />
            <path d="M12,24 L33,24" fill="none" />
          </g>
        </svg>
      );

    case 'n': // Knight
      return (
        <svg {...svgProps}>
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
            <path d="M 33,28.5 C 33,38 21,38 21,38 C 21,38 12.5,36 12.5,30.5 C 12.5,25 15,22 17,19.5 C 15.5,19.5 13,18 12,15 C 13,15.5 15,15.5 16,15.5 C 16,15.5 12,11.5 15.5,7.5 C 19.5,8 21.5,12 21.5,12 C 21.5,12 23.5,6.5 29.5,10.5 C 34.5,13.5 32.5,20 33,24 C 33.5,28 35.5,28.5 33,28.5 z" />
            <path d="M 12.5,30.5 C 12.5,30.5 18,31.5 21,31.5 C 24,31.5 31,29.5 31,29.5" fill="none" />
            <path d="M 17,21 C 17,21 21,22.5 23.5,20" fill="none" />
            <circle cx="17.5" cy="12.5" r="2" fill={isWhite ? '#000000' : '#ffffff'} stroke="none" />
          </g>
        </svg>
      );

    case 'b': // Bishop
      return (
        <svg {...svgProps}>
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
            <path d="M9,36 C9,36 22.5,37 36,36 C36,36 33.5,32 30,30 C26.5,28 30,22 30,17 C30,11 26,7.5 22.5,7.5 C19,7.5 15,11 15,17 C15,22 18.5,28 15,30 C11.5,32 9,36 9,36 Z" />
            <circle cx="22.5" cy="5" r="2.5" />
            {/* Slash in the bishop head */}
            <path d="M 17.5,14 L 27.5,20 M 27.5,14 L 17.5,20" fill="none" />
            <path d="M12,36 L33,36" fill="none" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return (
        <svg {...svgProps}>
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
            <path d="M9,37 L36,37 L38,13 L30,28 L22.5,11 L15,28 L7,13 L9,37 Z" />
            <circle cx="6" cy="10" r="2" />
            <circle cx="14" cy="25" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="25" r="2" />
            <circle cx="39" cy="10" r="2" />
            <path d="M12,37 L33,37 L31,41 L14,41 L12,37 Z" />
          </g>
        </svg>
      );

    case 'k': // King
      return (
        <svg {...svgProps}>
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
            <path d="M8.5,35 L36.5,35 L34,16 C34,16 31,19 22.5,19 C14,19 11,16 11,16 L8.5,35 Z" />
            <path d="M11,35 L34,35 L32,39 L13,39 L11,35 Z" />
            {/* Crown peaks */}
            <path d="M11,16 C14,16 16,10 22.5,10 C29,10 31,16 34,16" fill="none" />
            {/* King Cross */}
            <path d="M22.5,4 L22.5,10 M19.5,7 L25.5,7" fill="none" />
            <path d="M12,23 L33,23" fill="none" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
