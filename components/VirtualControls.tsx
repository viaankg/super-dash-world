
import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Zap } from 'lucide-react';

interface VirtualControlsProps {
  onInput: (key: string, active: boolean) => void;
}

const VirtualControls: React.FC<VirtualControlsProps> = ({ onInput }) => {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 40;
    
    const limitedX = (dx / dist) * Math.min(dist, maxRadius);
    const limitedY = (dy / dist) * Math.min(dist, maxRadius);

    setJoystickPos({ x: limitedX, y: limitedY });

    // Steering logic
    if (limitedX < -15) {
      onInput('ArrowLeft', true);
      onInput('ArrowRight', false);
    } else if (limitedX > 15) {
      onInput('ArrowRight', true);
      onInput('ArrowLeft', false);
    } else {
      onInput('ArrowLeft', false);
      onInput('ArrowRight', false);
    }
  };

  const stopDragging = () => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    onInput('ArrowLeft', false);
    onInput('ArrowRight', false);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[80] select-none">
      {/* Steering Joystick - Bottom Left */}
      <div className="absolute bottom-10 left-10 pointer-events-auto">
        <div 
          ref={joystickRef}
          className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full border-4 border-white/30 flex items-center justify-center touch-none"
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          onMouseMove={handleJoystickMove}
          onTouchMove={handleJoystickMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onTouchEnd={stopDragging}
        >
          <div 
            className="w-16 h-16 bg-white/60 backdrop-blur-lg rounded-full shadow-xl border-2 border-white transition-transform duration-75"
            style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
          />
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div className="absolute bottom-10 right-10 flex flex-col items-center gap-4 pointer-events-auto">
        {/* Nitro Button */}
        <button
          className="w-20 h-20 bg-yellow-400/80 active:bg-yellow-500 active:scale-90 backdrop-blur-md rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-all touch-none"
          onPointerDown={() => onInput('ShiftLeft', true)}
          onPointerUp={() => onInput('ShiftLeft', false)}
          onPointerLeave={() => onInput('ShiftLeft', false)}
        >
          <Zap className="w-10 h-10 text-white fill-white" />
        </button>

        <div className="flex gap-4">
          {/* Brake / Reverse */}
          <button
            className="w-24 h-24 bg-red-500/60 active:bg-red-600/80 active:scale-90 backdrop-blur-md rounded-2xl border-4 border-white shadow-2xl flex flex-col items-center justify-center transition-all touch-none"
            onPointerDown={() => onInput('ArrowDown', true)}
            onPointerUp={() => onInput('ArrowDown', false)}
            onPointerLeave={() => onInput('ArrowDown', false)}
          >
            <ChevronDown className="w-12 h-12 text-white" />
            <span className="bungee text-[10px] text-white">BRAKE</span>
          </button>

          {/* Accelerate */}
          <button
            className="w-24 h-32 bg-green-500/60 active:bg-green-600/80 active:scale-95 backdrop-blur-md rounded-2xl border-4 border-white shadow-2xl flex flex-col items-center justify-center transition-all touch-none"
            onPointerDown={() => onInput('ArrowUp', true)}
            onPointerUp={() => onInput('ArrowUp', false)}
            onPointerLeave={() => onInput('ArrowUp', false)}
          >
            <ChevronUp className="w-12 h-12 text-white" />
            <span className="bungee text-sm text-white">GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VirtualControls;
