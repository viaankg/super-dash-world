
import React, { useEffect, useState } from 'react';
import { PlayerScore } from '../types';
import { getVictoryMessage } from '../services/geminiService';
import { Sparkles, Trophy, RotateCcw, Medal } from 'lucide-react';

interface WinScreenProps {
  score: PlayerScore;
  onRestart: () => void;
}

const WinScreen: React.FC<WinScreenProps> = ({ score, onRestart }) => {
  const [victoryMsg, setVictoryMsg] = useState('Loading your special trophy message...');
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);

  useEffect(() => {
    // Generate AI feedback
    getVictoryMessage(score.name, score.time, score.score).then(setVictoryMsg);

    // Manage local leaderboard
    const stored = localStorage.getItem('dash_leaderboard');
    const currentScores: PlayerScore[] = stored ? JSON.parse(stored) : [];
    const updated = [...currentScores, score].sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem('dash_leaderboard', JSON.stringify(updated));
    setLeaderboard(updated);
  }, [score]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col border-8 border-yellow-400 shadow-2xl scale-in-center">
        {/* Header */}
        <div className="bg-yellow-400 p-8 text-center relative overflow-hidden">
          <Sparkles className="absolute top-4 left-4 text-white w-8 h-8 animate-bounce" />
          <Sparkles className="absolute bottom-4 right-4 text-white w-8 h-8 animate-bounce delay-100" />
          <h2 className="bungee text-5xl text-white drop-shadow-lg">YOU WON!</h2>
          <p className="text-yellow-900 font-bold mt-2">Amazing driving, {score.name}!</p>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* AI Message */}
          <div className="bg-blue-50 border-4 border-blue-200 rounded-2xl p-6 mb-8 italic text-blue-700 text-lg text-center">
            "{victoryMsg}"
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-100 p-4 rounded-2xl text-center">
              <span className="block text-gray-500 font-bold uppercase text-xs">Final Time</span>
              <span className="text-3xl font-bold bungee text-gray-800">{score.time.toFixed(2)}s</span>
            </div>
            <div className="bg-gray-100 p-4 rounded-2xl text-center border-4 border-yellow-200">
              <span className="block text-yellow-600 font-bold uppercase text-xs">Total Score</span>
              <span className="text-3xl font-bold bungee text-gray-800">{score.score}</span>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="mb-8">
            <h3 className="flex items-center gap-2 font-bold text-gray-700 mb-4 border-b-2 border-gray-100 pb-2">
              <Medal className="text-yellow-500" />
              TOP RACERS
            </h3>
            <div className="space-y-2">
              {leaderboard.map((s, idx) => (
                <div 
                  key={idx} 
                  className={`flex justify-between items-center p-3 rounded-xl ${
                    s.name === score.name && s.time === score.time ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-400 w-6">#{idx + 1}</span>
                    <span className="font-bold text-gray-800">{s.name}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500 font-medium">{s.time.toFixed(1)}s</span>
                    <span className="font-bold text-blue-600">{s.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onRestart}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white bungee text-2xl rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <RotateCcw className="w-8 h-8" />
            PLAY AGAIN!
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinScreen;
