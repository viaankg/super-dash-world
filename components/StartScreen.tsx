
import React, { useState, useEffect } from 'react';
import { CHARACTERS } from '../constants';
import { Character } from '../types';
import { Lock } from 'lucide-react';

interface StartScreenProps {
  onStart: (name: string, character: Character) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    const ids = [];
    if (localStorage.getItem('velocity_valley_warp_unlocked') === 'true') ids.push('warp');
    if (localStorage.getItem('velocity_valley_mirror_unlocked') === 'true') ids.push('mirror');
    setUnlockedIds(ids);
  }, []);

  const handleStart = () => {
    if (name.trim()) {
      onStart(name, selectedChar);
    }
  };

  const visibleCharacters = CHARACTERS.filter(char => !char.isSecret || unlockedIds.includes(char.id));

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border-8 border-yellow-400 my-8">
        <h1 className="bungee text-5xl text-center text-blue-600 mb-8 drop-shadow-md tracking-tighter">VELOCITY VALLEY</h1>
        
        <div className="mb-8">
          <label className="block text-gray-700 font-bold mb-2 text-xl">What's your name, Racer?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your name..."
            className="w-full p-4 text-2xl border-4 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
            maxLength={15}
          />
        </div>

        <div className="mb-8">
          <label className="block text-gray-700 font-bold mb-4 text-xl text-center">Pick your character!</label>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {visibleCharacters.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedChar(char)}
                className={`p-4 rounded-2xl border-4 transition-all transform hover:scale-105 flex flex-col items-center ${
                  selectedChar.id === char.id ? 'border-yellow-400 bg-yellow-50 scale-110 shadow-lg' : 'border-gray-100 hover:border-blue-300'
                }`}
              >
                <div 
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full mb-2 border-4 border-white shadow-inner relative flex items-center justify-center"
                  style={{ backgroundColor: char.color }}
                >
                   {char.isSecret && <span className="absolute -top-2 -right-2 bg-purple-500 text-white p-1 rounded-full text-[8px] border-2 border-white">SECRET</span>}
                </div>
                <span className="font-bold text-[10px] md:text-[12px] text-center leading-tight">{char.name}</span>
              </button>
            ))}
            {unlockedIds.length < 2 && (
              <div className="p-4 rounded-2xl border-4 border-dashed border-gray-300 flex flex-col items-center opacity-50 grayscale">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full mb-2 bg-gray-200 border-4 border-white flex items-center justify-center">
                  <Lock className="text-gray-400" />
                </div>
                <span className="font-bold text-[10px] md:text-sm text-center text-gray-400">Secret?</span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 rounded-2xl p-4 border-4 border-blue-100 animate-in fade-in zoom-in duration-300">
            <h3 className="bungee text-blue-600 text-lg mb-1 flex items-center gap-2">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">ABILITY</span>
              {selectedChar.abilityName}
            </h3>
            <p className="text-blue-800 text-sm italic">{selectedChar.abilityDescription}</p>
          </div>
          
          {unlockedIds.length < 2 && (
            <p className="mt-4 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
              Hint: Win in under 78 seconds to unlock secret racers!
            </p>
          )}
        </div>

        <button
          disabled={!name.trim()}
          onClick={handleStart}
          className={`w-full py-6 rounded-2xl bungee text-3xl text-white transition-all transform ${
            name.trim() 
              ? 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-xl' 
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          LET'S RACE!
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
