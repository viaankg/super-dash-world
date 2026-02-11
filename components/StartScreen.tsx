
import React, { useState } from 'react';
import { CHARACTERS } from '../constants';
import { Character } from '../types';

interface StartScreenProps {
  onStart: (name: string, character: Character) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);

  const handleStart = () => {
    if (name.trim()) {
      onStart(name, selectedChar);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border-8 border-yellow-400">
        <h1 className="bungee text-5xl text-center text-blue-600 mb-8 drop-shadow-md">SUPER DASH WORLD</h1>
        
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
          <label className="block text-gray-700 font-bold mb-4 text-xl">Pick your character!</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CHARACTERS.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedChar(char)}
                className={`p-4 rounded-2xl border-4 transition-all transform hover:scale-105 flex flex-col items-center ${
                  selectedChar.id === char.id ? 'border-yellow-400 bg-yellow-50 scale-110 shadow-lg' : 'border-gray-100 hover:border-blue-300'
                }`}
              >
                <div 
                  className="w-16 h-16 rounded-full mb-2 border-4 border-white shadow-inner"
                  style={{ backgroundColor: char.color }}
                />
                <span className="font-bold text-sm text-center">{char.name}</span>
              </button>
            ))}
          </div>
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
