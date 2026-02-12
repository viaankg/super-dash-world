
export enum GameState {
  START = 'START',
  TUTORIAL = 'TUTORIAL',
  PLAYING = 'PLAYING',
  WIN = 'WIN'
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  speed: number;
  handling: number;
  boostPower: number;
  abilityName: string;
  abilityDescription: string;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export type PowerUpType = 'speed' | 'shield' | 'magnet' | 'autoDrive' | 'hyperdrive';

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  createdAt: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'tree' | 'rock' | 'water' | 'wall';
}

export interface PlayerScore {
  name: string;
  character: string;
  time: number;
  score: number;
  date: string;
}
