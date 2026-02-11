
import React from 'react';
import { Timer, Trophy, Zap, AlertTriangle, RotateCcw, Shield, Magnet, Wind, Cpu, Rocket } from 'lucide-react';

interface HUDProps {
  time: number;
  coins: number;
  totalCoins: number;
  boost: number;
  maxBoost: number;
  onRespawn: () => void;
  showPenalty: boolean;
  coinBoostLeft: number;
  speedBoostLeft: number;
  magnetLeft: number;
  autoDriveLeft: number;
  hyperdriveLeft: number;
  hasShield: boolean;
}

const HUD: React.FC<HUDProps> = ({ 
  time, coins, totalCoins, boost, maxBoost, onRespawn, showPenalty,
  coinBoostLeft, speedBoostLeft, magnetLeft, autoDriveLeft, hyperdriveLeft, hasShield
}) => {
  const boostPercent = (boost / maxBoost) * 100;

  return (
    <div className="fixed inset-0 pointer-events-none p-6 select-none flex flex-col justify-between">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-4 border-4 border-blue-400 shadow-lg flex items-center gap-3">
              <Timer className="text-blue-500 w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-blue-400 uppercase">Time</span>
                <span className="text-2xl font-bold bungee text-gray-800">{time.toFixed(1)}s</span>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-2xl p-4 border-4 border-yellow-400 shadow-lg flex items-center gap-3">
              <Trophy className="text-yellow-500 w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-yellow-500 uppercase">Coins</span>
                <span className="text-2xl font-bold bungee text-gray-800">{coins} / {totalCoins}</span>
              </div>
            </div>
          </div>

          {showPenalty && (
            <div className="bg-red-500 text-white px-6 py-3 rounded-2xl border-4 border-white shadow-2xl flex items-center gap-3 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
              <span className="bungee text-2xl">10 SECOND PENALTY!</span>
            </div>
          )}
        </div>

        {/* Top Right PowerUp Timers */}
        <div className="flex flex-col items-end gap-2">
          {hyperdriveLeft > 0 && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-600 text-white px-6 py-3 rounded-2xl border-4 border-white shadow-lg flex items-center gap-3 animate-pulse">
              <Rocket className="w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase">Hyperdrive</span>
                <span className="font-bold bungee text-xl">{hyperdriveLeft.toFixed(1)}s</span>
              </div>
            </div>
          )}
          {autoDriveLeft > 0 && (
            <div className="bg-red-600 text-white px-4 py-2 rounded-xl border-4 border-white shadow-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 animate-pulse" />
              <span className="font-bold bungee text-lg">AI PILOT: {autoDriveLeft.toFixed(1)}s</span>
            </div>
          )}
          {coinBoostLeft > 0 && (
            <div className="bg-yellow-400 text-white px-4 py-2 rounded-xl border-4 border-white shadow-lg flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-bold bungee text-lg">COIN BOOST: {coinBoostLeft.toFixed(1)}s</span>
            </div>
          )}
          {speedBoostLeft > 0 && (
            <div className="bg-blue-500 text-white px-4 py-2 rounded-xl border-4 border-white shadow-lg flex items-center gap-2">
              <Wind className="w-5 h-5" />
              <span className="font-bold bungee text-lg">SPEED: {speedBoostLeft.toFixed(1)}s</span>
            </div>
          )}
          {magnetLeft > 0 && (
            <div className="bg-green-500 text-white px-4 py-2 rounded-xl border-4 border-white shadow-lg flex items-center gap-2">
              <Magnet className="w-5 h-5" />
              <span className="font-bold bungee text-lg">MAGNET: {magnetLeft.toFixed(1)}s</span>
            </div>
          )}
          {hasShield && (
            <div className="bg-purple-500 text-white px-4 py-2 rounded-xl border-4 border-white shadow-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="font-bold bungee text-lg">SHIELD ACTIVE</span>
            </div>
          )}
        </div>

        <button 
          onClick={onRespawn}
          className="pointer-events-auto bg-red-500 hover:bg-red-600 active:scale-95 text-white p-4 rounded-full border-4 border-white shadow-lg transition-all"
          title="Respawn"
        >
          <RotateCcw className="w-8 h-8" />
        </button>
      </div>

      {/* Bottom HUD */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-64 bg-gray-200 h-8 rounded-full border-4 border-white shadow-lg overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-75 ease-out flex items-center justify-end pr-2 ${hyperdriveLeft > 0 ? 'bg-yellow-400' : 'bg-blue-500'}`}
            style={{ width: `${boostPercent}%` }}
          >
            {boostPercent > 10 && <Zap className="text-white w-4 h-4" />}
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-700 uppercase drop-shadow">
            {hyperdriveLeft > 0 ? 'HYPERDRIVE ACTIVE!' : 'BOOST! (SHIFT)'}
          </span>
        </div>
        
        <div className="text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm text-sm font-bold">
          WASD or Arrows to Drive
        </div>
      </div>
    </div>
  );
};

export default HUD;
