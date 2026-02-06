import React from 'react';

interface CursorProps {
  x: number; // -1 to 1
  y: number; // -1 to 1
  isPinching: boolean;
  isActive: boolean;
}

const Cursor: React.FC<CursorProps> = ({ x, y, isPinching, isActive }) => {
  if (!isActive) return null;

  // Convert -1 to 1 range to screen percentage (0 to 100)
  // 0,0 is center. 
  // x: -1 => 0%, 1 => 100%
  const left = (x + 1) * 50;
  const top = (y + 1) * 50;

  return (
    <div 
      className="fixed pointer-events-none z-[100] transition-transform duration-75 ease-out will-change-transform"
      style={{ 
        left: `${left}%`, 
        top: `${top}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Outer Ring */}
      <div 
        className={`rounded-full border-2 transition-all duration-200 ${
          isPinching 
            ? 'w-4 h-4 border-indigo-400 bg-indigo-400/50 scale-75' 
            : 'w-12 h-12 border-white/50 scale-100'
        }`}
      />
      {/* Inner Dot */}
      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};

export default Cursor;