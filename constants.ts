
import { Character, Obstacle } from './types';

export const WORLD_SIZE = 4000;
export const INITIAL_COIN_COUNT = 50;
export const MAX_BOOST = 100;
export const BOOST_CONSUMPTION_RATE = 0.5;
export const BOOST_RECHARGE_RATE = 0.1;
export const ABILITY_COOLDOWN = 20000; // 20 seconds

export const CHARACTERS: Character[] = [
  { 
    id: 'dash', 
    name: 'Dashing Dino', 
    color: '#4ADE80', 
    secondaryColor: '#166534', 
    speed: 1.1, 
    handling: 0.9, 
    boostPower: 1.2,
    abilityName: 'Nitro Burst',
    abilityDescription: 'Instantly refills all Nitro and grants 3s of Invincibility.'
  },
  { 
    id: 'bolt', 
    name: 'Bolt Bunny', 
    color: '#60A5FA', 
    secondaryColor: '#1E40AF', 
    speed: 0.9, 
    handling: 1.2, 
    boostPower: 1.0,
    abilityName: 'Phase Leap',
    abilityDescription: 'Become ghostly and drive through any obstacle or wall for 5 seconds.'
  },
  { 
    id: 'sparky', 
    name: 'Sparky Squirrel', 
    color: '#FACC15', 
    secondaryColor: '#854D0E', 
    speed: 1.0, 
    handling: 1.0, 
    boostPower: 1.1,
    abilityName: 'Electric Pulse',
    abilityDescription: 'Instantly pulls in all coins within a massive radius.'
  },
  { 
    id: 'fizz', 
    name: 'Fizz Fox', 
    color: '#FB923C', 
    secondaryColor: '#9A3412', 
    speed: 1.2, 
    handling: 0.8, 
    boostPower: 0.9,
    abilityName: 'Turbo AI',
    abilityDescription: 'Activates AI Auto-Pilot and Speed Boost for 6 seconds.'
  },
  {
    id: 'warp',
    name: 'Warp Wizard',
    color: '#C084FC',
    secondaryColor: '#581C87',
    speed: 1.0,
    handling: 1.0,
    boostPower: 1.0,
    abilityName: 'Chrono-Teleport',
    abilityDescription: 'Open a map, teleport anywhere, and collect all coins in a 7x7 sector!',
    isSecret: true
  }
];

export const OBSTACLES: Obstacle[] = [];
// Generate some random obstacles
for (let i = 0; i < 60; i++) {
  OBSTACLES.push({
    x: Math.random() * (WORLD_SIZE - 200) + 100,
    y: Math.random() * (WORLD_SIZE - 200) + 100,
    width: 60 + Math.random() * 100,
    height: 60 + Math.random() * 100,
    type: Math.random() > 0.5 ? 'tree' : 'rock',
  });
}
