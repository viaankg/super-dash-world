
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Vector2D, Character, Coin, PlayerScore, PowerUp, PowerUpType } from './types';
import { WORLD_SIZE, INITIAL_COIN_COUNT, MAX_BOOST, BOOST_CONSUMPTION_RATE, BOOST_RECHARGE_RATE, OBSTACLES, ABILITY_COOLDOWN } from './constants';
import StartScreen from './components/StartScreen';
import HUD from './components/HUD';
import WinScreen from './components/WinScreen';
import VirtualControls from './components/VirtualControls';
import { MapPin } from 'lucide-react';

const SECTOR_SIZE = 700; // 7x7 grid where each unit is 100 world units

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [player, setPlayer] = useState<{ name: string; character: Character | null }>({ name: '', character: null });
  const [score, setScore] = useState<PlayerScore | null>(null);
  const [penaltyMessage, setPenaltyMessage] = useState(false);
  const [spawnAlert, setSpawnAlert] = useState<string | null>(null);
  const [cutscene, setCutscene] = useState<{ type: 'hyper' | 'stop'; active: boolean }>({ type: 'hyper', active: false });
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showTeleportMap, setShowTeleportMap] = useState(false);
  const [teleportCursorPos, setTeleportCursorPos] = useState({ x: 50, y: 50 });

  const [hudData, setHudData] = useState({
    time: 0,
    coinsCollected: 0,
    totalCoins: INITIAL_COIN_COUNT,
    boost: MAX_BOOST,
    maxBoost: MAX_BOOST,
    coinBoostLeft: 0,
    speedBoostLeft: 0,
    magnetLeft: 0,
    autoDriveLeft: 0,
    hyperdriveLeft: 0,
    hasShield: false,
    hasSeeThrough: false,
    abilityCooldown: 0,
    maxAbilityCooldown: ABILITY_COOLDOWN
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<Vector2D>({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const velRef = useRef<number>(0);
  const angleRef = useRef<number>(0);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const boostRef = useRef<number>(MAX_BOOST);
  const keysRef = useRef<Record<string, boolean>>({});
  const timerRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const lastPenaltyTimeRef = useRef<number>(0);
  const lastPowerUpSpawnRef = useRef<number>(0);
  const lastAutoDriveSpawnRef = useRef<number>(0);

  const coinBoostTimerRef = useRef<number>(0);
  const speedBoostTimerRef = useRef<number>(0);
  const magnetTimerRef = useRef<number>(0);
  const autoDriveTimerRef = useRef<number>(0);
  const hyperdriveTimerRef = useRef<number>(0);
  const hasShieldRef = useRef<boolean>(false);
  const hasSeeThroughRef = useRef<boolean>(false);
  const isCurrentlyPassingThroughRef = useRef<boolean>(false);
  
  const canRollHyperdriveRef = useRef<boolean>(false);
  const abilityCooldownRef = useRef<number>(0);
  const isPhasingRef = useRef<boolean>(false);
  const sparkyPulseTimerRef = useRef<number>(0); 

  // Mirror ability state
  const isMirroringRef = useRef<boolean>(false);
  const mirrorClonesRef = useRef<Vector2D[]>([]);
  const mirrorTimerRef = useRef<number>(0);
  const mirrorDashRef = useRef<boolean>(false);

  const tutorialMessages = [
    "Welcome Racer! Use WASD or Arrows to drive around the map.",
    "Great! Now hold SHIFT to use your NITRO BOOST! Watch the blue bar at the bottom.",
    "Collect YELLOW COINS to gain a 5s SPEED BOOST and become INVINCIBLE to edges!",
    "POWER-UPS like Magnets and Shields give you special abilities. Try the ones nearby!",
    "PRO TIP: Each character has a UNIQUE ABILITY! Press 'Q' or click the Star to use it!",
    "Ready to race? Collect ALL coins as fast as you can to win!"
  ];

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const isPointInObstacle = (x: number, y: number, padding: number = 0) => {
    return OBSTACLES.some(obs => (
      x >= obs.x - padding &&
      x <= obs.x + obs.width + padding &&
      y >= obs.y - padding &&
      y <= obs.y + obs.height + padding
    ));
  };

  const spawnPowerUp = useCallback((forceType?: PowerUpType, nearPlayer: boolean = false) => {
    let attempts = 0;
    while (attempts < 100) {
      let px, py;
      if (nearPlayer) {
        const radius = 500;
        px = posRef.current.x + (Math.random() - 0.5) * radius;
        py = posRef.current.y + (Math.random() - 0.5) * radius;
      } else {
        px = Math.random() * (WORLD_SIZE - 400) + 200;
        py = Math.random() * (WORLD_SIZE - 400) + 200;
      }
      
      const clampedX = Math.max(150, Math.min(WORLD_SIZE - 150, px));
      const clampedY = Math.max(150, Math.min(WORLD_SIZE - 150, py));

      if (!isPointInObstacle(clampedX, clampedY, 50)) {
        let type: PowerUpType;
        if (forceType) type = forceType;
        else {
          const types: PowerUpType[] = ['speed', 'shield', 'magnet', 'seeThrough'];
          type = types[Math.floor(Math.random() * types.length)];
        }
        
        if (type === 'autoDrive' && gameState === GameState.PLAYING) {
          setSpawnAlert("AI AUTO-DRIVE SPAWNED!");
          setTimeout(() => setSpawnAlert(null), 3000);
        }

        powerUpsRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          x: clampedX,
          y: clampedY,
          type,
          createdAt: Date.now()
        });
        break;
      }
      attempts++;
    }
  }, [gameState]);

  const triggerCutscene = (type: 'hyper' | 'stop') => {
    setCutscene({ type, active: true });
    setTimeout(() => setCutscene(prev => ({ ...prev, active: false })), 1500);
  };

  const handleUseAbility = useCallback(() => {
    if (abilityCooldownRef.current > 0 || !player.character || showTeleportMap || isMirroringRef.current) return;

    const char = player.character;

    if (char.id === 'dash') {
      abilityCooldownRef.current = ABILITY_COOLDOWN;
      boostRef.current = MAX_BOOST;
      coinBoostTimerRef.current = 3000;
      speedBoostTimerRef.current = 3000;
    } else if (char.id === 'bolt') {
      abilityCooldownRef.current = ABILITY_COOLDOWN;
      isPhasingRef.current = true;
      setTimeout(() => { isPhasingRef.current = false; }, 5000);
    } else if (char.id === 'sparky') {
      abilityCooldownRef.current = ABILITY_COOLDOWN;
      const radius = 600;
      sparkyPulseTimerRef.current = 1200; // Increased duration for visibility
      coinsRef.current.forEach(coin => {
        if (!coin.collected) {
          const dx = posRef.current.x - coin.x;
          const dy = posRef.current.y - coin.y;
          if (Math.sqrt(dx*dx + dy*dy) < radius) {
            coin.collected = true;
            boostRef.current = Math.min(MAX_BOOST, boostRef.current + 5);
          }
        }
      });
      setSpawnAlert("ELECTRIC PULSE!");
      setTimeout(() => setSpawnAlert(null), 1000);
    } else if (char.id === 'fizz') {
      abilityCooldownRef.current = ABILITY_COOLDOWN;
      autoDriveTimerRef.current = 6000;
      speedBoostTimerRef.current = 6000;
    } else if (char.id === 'warp') {
      setShowTeleportMap(true);
    } else if (char.id === 'mirror') {
      isMirroringRef.current = true;
      mirrorDashRef.current = false;
      mirrorTimerRef.current = 4000; // Total duration
      velRef.current = 0;
      angleRef.current = -Math.PI / 2; // Face vertical exactly
      
      const px = posRef.current.x;
      const py = posRef.current.y;
      mirrorClonesRef.current = [
        { x: px - 300, y: py },
        { x: px - 150, y: py },
        { x: px + 150, y: py },
        { x: px + 300, y: py }
      ];

      setTimeout(() => {
        mirrorDashRef.current = true;
        setSpawnAlert("DUPLICATE SWEEP!");
        setTimeout(() => setSpawnAlert(null), 1500);
      }, 700);
    }
  }, [player.character, showTeleportMap, isMirroringRef]);

  const handleTeleportSelect = (x: number, y: number) => {
    if (!player.character || player.character.id !== 'warp') return;
    
    if (isPointInObstacle(x, y, 15)) {
        setSpawnAlert("CAN'T TELEPORT INTO WALLS!");
        setTimeout(() => setSpawnAlert(null), 2000);
        return;
    }

    posRef.current = { x, y };
    velRef.current = 0;
    
    coinsRef.current.forEach(coin => {
        if (!coin.collected) {
            if (Math.abs(coin.x - x) < SECTOR_SIZE/2 && Math.abs(coin.y - y) < SECTOR_SIZE/2) {
                coin.collected = true;
                boostRef.current = Math.min(MAX_BOOST, boostRef.current + 5);
            }
        }
    });

    setSpawnAlert("CHRONO-JUMP!");
    setTimeout(() => setSpawnAlert(null), 1000);
    
    abilityCooldownRef.current = ABILITY_COOLDOWN;
    setShowTeleportMap(false);
  };

  const handleStart = (name: string, char: Character) => {
    setPlayer({ name, character: char });
    setGameState(GameState.TUTORIAL);
    setTutorialStep(0);
    posRef.current = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    velRef.current = 0;
    angleRef.current = -Math.PI / 2;
    boostRef.current = MAX_BOOST; 
    powerUpsRef.current = [];
    abilityCooldownRef.current = 0;
    isPhasingRef.current = false;
    sparkyPulseTimerRef.current = 0;
    isMirroringRef.current = false;
    mirrorClonesRef.current = [];
    hasSeeThroughRef.current = false;
    isCurrentlyPassingThroughRef.current = false;
    setShowTeleportMap(false);
    coinsRef.current = [{ id: 999, x: WORLD_SIZE/2 + 400, y: WORLD_SIZE/2, collected: false }];
    
    spawnPowerUp('speed', true);
    spawnPowerUp('magnet', true);
    spawnPowerUp('shield', true);
    spawnPowerUp('seeThrough', true);
  };

  const initRealGame = useCallback(() => {
    posRef.current = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    velRef.current = 0;
    angleRef.current = -Math.PI / 2;
    boostRef.current = MAX_BOOST;
    timerRef.current = 0;
    lastPenaltyTimeRef.current = 0;
    lastPowerUpSpawnRef.current = Date.now();
    lastAutoDriveSpawnRef.current = Date.now();
    coinBoostTimerRef.current = 0;
    speedBoostTimerRef.current = 0;
    magnetTimerRef.current = 0;
    autoDriveTimerRef.current = 0;
    hyperdriveTimerRef.current = 0;
    hasShieldRef.current = false;
    hasSeeThroughRef.current = false;
    isCurrentlyPassingThroughRef.current = false;
    canRollHyperdriveRef.current = false;
    abilityCooldownRef.current = 0;
    isPhasingRef.current = false;
    sparkyPulseTimerRef.current = 0;
    isMirroringRef.current = false;
    mirrorClonesRef.current = [];
    powerUpsRef.current = [];
    setPenaltyMessage(false);
    setSpawnAlert(null);
    setCutscene({ type: 'hyper', active: false });
    setShowTeleportMap(false);
    
    const coins: Coin[] = [];
    let attempts = 0;
    while (coins.length < INITIAL_COIN_COUNT && attempts < 1000) {
      const cx = Math.random() * (WORLD_SIZE - 200) + 100;
      const cy = Math.random() * (WORLD_SIZE - 200) + 100;
      if (!isPointInObstacle(cx, cy, 30)) {
        coins.push({ id: coins.length, x: cx, y: cy, collected: false });
      }
      attempts++;
    }
    coinsRef.current = coins;
    setHudData({
      time: 0,
      coinsCollected: 0,
      totalCoins: INITIAL_COIN_COUNT,
      boost: MAX_BOOST,
      maxBoost: MAX_BOOST,
      coinBoostLeft: 0,
      speedBoostLeft: 0,
      magnetLeft: 0,
      autoDriveLeft: 0,
      hyperdriveLeft: 0,
      hasShield: false,
      hasSeeThrough: false,
      abilityCooldown: 0,
      maxAbilityCooldown: ABILITY_COOLDOWN
    });
    setGameState(GameState.PLAYING);
  }, [spawnPowerUp]);

  const handleRespawn = useCallback(() => {
    setGameState(GameState.START);
  }, []);

  const handleVirtualInput = (key: string, active: boolean) => {
    keysRef.current[key] = active;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyQ' && (gameState === GameState.PLAYING || gameState === GameState.TUTORIAL)) {
        handleUseAbility();
      }
      if (e.code === 'Escape' && showTeleportMap) {
        setShowTeleportMap(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleUseAbility, showTeleportMap]);

  useEffect(() => {
    if ((gameState !== GameState.PLAYING && gameState !== GameState.TUTORIAL) || !player.character) return;

    const char = player.character;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const update = (dt: number) => {
      const now = Date.now();
      if (showTeleportMap) return;

      if (gameState === GameState.PLAYING || gameState === GameState.TUTORIAL) {
        if (gameState === GameState.PLAYING) timerRef.current += dt / 1000;
        
        if (abilityCooldownRef.current > 0) {
          abilityCooldownRef.current = Math.max(0, abilityCooldownRef.current - dt);
        }
        if (sparkyPulseTimerRef.current > 0) {
          sparkyPulseTimerRef.current = Math.max(0, sparkyPulseTimerRef.current - dt);
        }
        if (isMirroringRef.current) {
          mirrorTimerRef.current = Math.max(0, mirrorTimerRef.current - dt);
          if (mirrorTimerRef.current <= 0) {
            isMirroringRef.current = false;
            mirrorDashRef.current = false;
            abilityCooldownRef.current = ABILITY_COOLDOWN;
            mirrorClonesRef.current = [];
          }
        }
      }

      if (coinBoostTimerRef.current > 0) coinBoostTimerRef.current = Math.max(0, coinBoostTimerRef.current - dt);
      if (speedBoostTimerRef.current > 0) speedBoostTimerRef.current = Math.max(0, speedBoostTimerRef.current - dt);
      if (magnetTimerRef.current > 0) magnetTimerRef.current = Math.max(0, magnetTimerRef.current - dt);
      if (autoDriveTimerRef.current > 0) autoDriveTimerRef.current = Math.max(0, autoDriveTimerRef.current - dt);
      
      const prevHyperdrive = hyperdriveTimerRef.current;
      if (hyperdriveTimerRef.current > 0) hyperdriveTimerRef.current = Math.max(0, hyperdriveTimerRef.current - dt);
      
      if (prevHyperdrive > 0 && hyperdriveTimerRef.current <= 0) {
        triggerCutscene('stop');
      }

      const isHoldingBoost = keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'] || keysRef.current['Shift'];
      if (canRollHyperdriveRef.current && coinBoostTimerRef.current > 0 && speedBoostTimerRef.current > 0 && isHoldingBoost && boostRef.current > 0) {
        canRollHyperdriveRef.current = false; 
        if (Math.random() < 0.5) {
          hyperdriveTimerRef.current = 15000;
          triggerCutscene('hyper');
        }
      }

      if (gameState === GameState.PLAYING) {
        if (now - lastPowerUpSpawnRef.current > 7000) {
          spawnPowerUp();
          lastPowerUpSpawnRef.current = now;
        }
        if (timerRef.current > 150 && now - lastAutoDriveSpawnRef.current > 50000) {
          spawnPowerUp('autoDrive');
          lastAutoDriveSpawnRef.current = now;
        }
      }

      const turnSpeed = 0.05 * char.handling;
      let speedMult = char.speed;
      if (coinBoostTimerRef.current > 0) speedMult *= 1.5;
      if (speedBoostTimerRef.current > 0) speedMult *= 1.5;
      if (autoDriveTimerRef.current > 0) speedMult *= 1.5;
      if (hyperdriveTimerRef.current > 0) speedMult *= 3.0;

      const accel = 0.15 * speedMult;
      const friction = 0.98;
      const maxVel = 8 * speedMult;
      const boostMult = 1.8 * char.boostPower;

      let aiBraking = false;
      let aiTurnWeight = 0;

      if (autoDriveTimerRef.current > 0 && hyperdriveTimerRef.current <= 0 && !isMirroringRef.current) {
        const uncollected = coinsRef.current.filter(c => !c.collected);
        if (uncollected.length > 0) {
          let closest = uncollected[0];
          let minDist = Infinity;
          uncollected.forEach(c => {
            const d = Math.sqrt((c.x - posRef.current.x)**2 + (c.y - posRef.current.y)**2);
            if (d < minDist) { minDist = d; closest = c; }
          });
          
          const targetAngle = Math.atan2(closest.y - posRef.current.y, closest.x - posRef.current.x);
          
          let angleDiff = targetAngle - angleRef.current;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          
          aiTurnWeight = angleDiff;

          if (!isPhasingRef.current) {
            const scanDist = 180;
            const scanAngles = [-0.8, -0.4, 0, 0.4, 0.8];
            let pushForce = 0;

            for (const sa of scanAngles) {
              const checkAngle = angleRef.current + sa;
              const checkX = posRef.current.x + Math.cos(checkAngle) * scanDist;
              const checkY = posRef.current.y + Math.sin(checkAngle) * scanDist;
              
              if (isPointInObstacle(checkX, checkY, 50)) {
                pushForce += (sa > 0 ? -0.5 : (sa < 0 ? 0.5 : (angleDiff > 0 ? -0.3 : 0.3)));
                if (Math.abs(sa) < 0.2) aiBraking = true;
              }
            }
            aiTurnWeight += pushForce;
          }

          const finalTurn = Math.max(-1, Math.min(1, aiTurnWeight)) * 0.2;
          angleRef.current += finalTurn;

          if (Math.abs(angleDiff) > Math.PI / 2) {
            aiBraking = true;
          }
        }
      }

      if (autoDriveTimerRef.current <= 0 && !isMirroringRef.current) {
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) angleRef.current -= turnSpeed;
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) angleRef.current += turnSpeed;
      }
      
      let currentAccel = 0;
      const isAutoDriving = autoDriveTimerRef.current > 0 || hyperdriveTimerRef.current > 0;
      const shouldAutoBoost = autoDriveTimerRef.current > 0 && boostRef.current > 30 && !aiBraking;

      if (isMirroringRef.current) {
        if (mirrorDashRef.current) {
          const dashSpeed = 18;
          posRef.current.y -= dashSpeed;
          mirrorClonesRef.current.forEach(clone => clone.y -= dashSpeed);
        }
      } else {
        if (isAutoDriving) {
          if (aiBraking && hyperdriveTimerRef.current <= 0) {
            currentAccel = -accel * 0.3;
          } else {
            currentAccel = accel; 
          }
        } else {
          if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) currentAccel = accel;
          if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) currentAccel = -accel * 0.5;
        }

        const isBoosting = (isHoldingBoost || shouldAutoBoost) && boostRef.current > 0;
        if (isBoosting) {
          currentAccel *= boostMult;
          boostRef.current = Math.max(0, boostRef.current - BOOST_CONSUMPTION_RATE);
        } else {
          boostRef.current = Math.min(MAX_BOOST, boostRef.current + BOOST_RECHARGE_RATE);
        }

        velRef.current = (velRef.current + currentAccel) * friction;
        if (Math.abs(velRef.current) > maxVel && !isBoosting && hyperdriveTimerRef.current <= 0) velRef.current *= 0.95;

        posRef.current.x += Math.cos(angleRef.current) * velRef.current;
        posRef.current.y += Math.sin(angleRef.current) * velRef.current;
      }

      if (hyperdriveTimerRef.current <= 0 && !isPhasingRef.current && !isMirroringRef.current) {
        const playerRadius = 15;
        let isInsideAny = false;
        OBSTACLES.forEach(obs => {
          const left = obs.x - playerRadius;
          const right = obs.x + obs.width + playerRadius;
          const top = obs.y - playerRadius;
          const bottom = obs.y + obs.height + playerRadius;
          
          if (posRef.current.x > left && posRef.current.x < right && posRef.current.y > top && posRef.current.y < bottom) {
            isInsideAny = true;
            if (hasSeeThroughRef.current) {
               if (!isCurrentlyPassingThroughRef.current) {
                  hasSeeThroughRef.current = false;
                  isCurrentlyPassingThroughRef.current = true;
               }
               return; 
            }

            if (!isCurrentlyPassingThroughRef.current) {
              const dl = posRef.current.x - left;
              const dr = right - posRef.current.x;
              const dt_side = posRef.current.y - top;
              const db = bottom - posRef.current.y;
              const minOverlap = Math.min(dl, dr, dt_side, db);
              let normalAngle = 0;
              if (minOverlap === dl) { posRef.current.x = left; normalAngle = Math.PI; }
              else if (minOverlap === dr) { posRef.current.x = right; normalAngle = 0; }
              else if (minOverlap === dt_side) { posRef.current.y = top; normalAngle = -Math.PI/2; }
              else { posRef.current.y = bottom; normalAngle = Math.PI/2; }
              velRef.current *= -0.4;
              angleRef.current = normalAngle + (Math.random() - 0.5) * 0.8;
            }
          }
        });

        if (!isInsideAny) {
           isCurrentlyPassingThroughRef.current = false;
        }
      }

      const inHyperdrive = hyperdriveTimerRef.current > 0;
      let hitBoundary = false;
      if (posRef.current.x < 0) { if (inHyperdrive || isMirroringRef.current) posRef.current.x = WORLD_SIZE - 40; else { posRef.current.x = 10; hitBoundary = true; } }
      if (posRef.current.x > WORLD_SIZE) { if (inHyperdrive || isMirroringRef.current) posRef.current.x = 40; else { posRef.current.x = WORLD_SIZE - 10; hitBoundary = true; } }
      if (posRef.current.y < 0) { if (inHyperdrive || isMirroringRef.current) posRef.current.y = WORLD_SIZE - 40; else { posRef.current.y = 10; hitBoundary = true; } }
      if (posRef.current.y > WORLD_SIZE) { if (inHyperdrive || isMirroringRef.current) posRef.current.y = 40; else { posRef.current.y = WORLD_SIZE - 10; hitBoundary = true; } }

      // Corrected boundary looping for Mirror Dash 
      if (isMirroringRef.current) {
        mirrorClonesRef.current.forEach(clone => {
          if (clone.x < 0) clone.x = WORLD_SIZE - 40;
          if (clone.x > WORLD_SIZE) clone.x = 40;
          if (clone.y < 0) clone.y = WORLD_SIZE - 40;
          if (clone.y > WORLD_SIZE) clone.y = 40;
        });
      }

      if (hitBoundary && !isPhasingRef.current && !isMirroringRef.current) {
        const isInvincible = coinBoostTimerRef.current > 0 || autoDriveTimerRef.current > 0;
        if (!isInvincible) {
          if (hasShieldRef.current) {
            hasShieldRef.current = false;
            velRef.current *= -0.5;
          } else if (now - lastPenaltyTimeRef.current > 3000) {
            if (gameState === GameState.PLAYING) timerRef.current += 10;
            lastPenaltyTimeRef.current = now;
            setPenaltyMessage(true);
            setTimeout(() => setPenaltyMessage(false), 2000);
            velRef.current *= -0.5;
          }
        }
      }

      powerUpsRef.current = powerUpsRef.current.filter(pu => {
        const dx = posRef.current.x - pu.x;
        const dy = posRef.current.y - pu.y;
        if (Math.sqrt(dx*dx + dy*dy) < 40) {
          if (pu.type === 'speed') { speedBoostTimerRef.current = 5000; canRollHyperdriveRef.current = true; }
          if (pu.type === 'shield') hasShieldRef.current = true;
          if (pu.type === 'magnet') magnetTimerRef.current = 10000;
          if (pu.type === 'autoDrive') autoDriveTimerRef.current = 10000;
          if (pu.type === 'seeThrough') hasSeeThroughRef.current = true;
          return false;
        }
        return true;
      });

      const collectionRadius = hyperdriveTimerRef.current > 0 ? 225 : (magnetTimerRef.current > 0 ? 150 : (isMirroringRef.current ? 75 : 40));
      let collectedCount = 0;
      coinsRef.current.forEach(coin => {
        if (!coin.collected) {
          const dx = posRef.current.x - coin.x;
          const dy = posRef.current.y - coin.y;
          let isHit = Math.sqrt(dx*dx + dy*dy) < collectionRadius;
          
          if (!isHit && isMirroringRef.current) {
            for (const clone of mirrorClonesRef.current) {
              const cdx = clone.x - coin.x;
              const cdy = clone.y - coin.y;
              if (Math.sqrt(cdx*cdx + cdy*cdy) < collectionRadius) {
                isHit = true;
                break;
              }
            }
          }

          if (isHit) {
            coin.collected = true;
            boostRef.current = Math.min(MAX_BOOST, boostRef.current + 20);
            coinBoostTimerRef.current = 5000; 
          }
        } else {
          collectedCount++;
        }
      });

      if (frameIdRef.current % 5 === 0) {
        setHudData({
          time: timerRef.current,
          coinsCollected: collectedCount,
          totalCoins: coinsRef.current.length,
          boost: boostRef.current,
          maxBoost: MAX_BOOST,
          coinBoostLeft: coinBoostTimerRef.current / 1000,
          speedBoostLeft: speedBoostTimerRef.current / 1000,
          magnetLeft: magnetTimerRef.current / 1000,
          autoDriveLeft: autoDriveTimerRef.current / 1000,
          hyperdriveLeft: hyperdriveTimerRef.current / 1000,
          hasShield: hasShieldRef.current,
          hasSeeThrough: hasSeeThroughRef.current,
          abilityCooldown: abilityCooldownRef.current,
          maxAbilityCooldown: ABILITY_COOLDOWN
        });
      }

      if (gameState === GameState.PLAYING && collectedCount === coinsRef.current.length) {
        const finalTime = timerRef.current;
        const finalScore = Math.floor(Math.max(0, 10000 - finalTime * 10) + (collectedCount * 100));
        if (finalTime <= 78) {
          localStorage.setItem('velocity_valley_warp_unlocked', 'true');
          localStorage.setItem('velocity_valley_mirror_unlocked', 'true');
        }
        setScore({ name: player.name, character: player.character?.name || '', time: finalTime, score: finalScore, date: new Date().toISOString() });
        setGameState(GameState.WIN);
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const camScale = isMirroringRef.current ? 0.75 : 1.0;
      const camX = posRef.current.x - (canvas.width / camScale) / 2;
      const camY = posRef.current.y - (canvas.height / camScale) / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.scale(camScale, camScale);
      ctx.translate(-camX, -camY);
      
      // Ground
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
      for (let i = 0; i <= WORLD_SIZE; i += 200) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i); ctx.stroke();
      }

      // Obstacles
      OBSTACLES.forEach(obs => {
        ctx.fillStyle = obs.type === 'tree' ? '#166534' : '#525252';
        if (hyperdriveTimerRef.current > 0 || isPhasingRef.current || isCurrentlyPassingThroughRef.current || isMirroringRef.current) ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 10); ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Power-ups
      powerUpsRef.current.forEach(pu => {
        ctx.save(); ctx.translate(pu.x, pu.y);
        ctx.scale(1 + Math.sin(Date.now() / 200) * 0.1, 1 + Math.sin(Date.now() / 200) * 0.1);
        ctx.fillStyle = pu.type === 'speed' ? '#3b82f6' : 
                        pu.type === 'shield' ? '#a855f7' : 
                        pu.type === 'magnet' ? '#22c55e' : 
                        pu.type === 'seeThrough' ? '#22d3ee' : '#ef4444';
        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'white';
        if (pu.type === 'speed') { ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-8, 2); ctx.lineTo(2, 2); ctx.lineTo(-2, 15); ctx.lineTo(8, -2); ctx.lineTo(-2, -2); ctx.closePath(); ctx.fill(); }
        else if (pu.type === 'shield') { ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, -8); ctx.lineTo(10, 4); ctx.quadraticCurveTo(0, 15, -10, 4); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fill(); }
        else if (pu.type === 'magnet') { ctx.lineWidth = 6; ctx.strokeStyle = 'white'; ctx.beginPath(); ctx.arc(0, 2, 8, Math.PI, 0, true); ctx.moveTo(-8, 2); ctx.lineTo(-8, -10); ctx.moveTo(8, 2); ctx.lineTo(8, -10); ctx.stroke(); }
        else if (pu.type === 'seeThrough') {
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        else if (pu.type === 'autoDrive') { ctx.font = 'bold 20px Bungee'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AI', 0, 0); }
        ctx.restore();
      });

      // Coins
      coinsRef.current.forEach(coin => {
        if (!coin.collected) {
          ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(coin.x, coin.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      });

      // Trails
      const isBoosting = (keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'] || keysRef.current['Shift']) && boostRef.current > 0;
      if (speedBoostTimerRef.current > 0 || coinBoostTimerRef.current > 0 || autoDriveTimerRef.current > 0 || hyperdriveTimerRef.current > 0 || isBoosting) {
        const isHyper = hyperdriveTimerRef.current > 0;
        const trailColor = isHyper ? 'rgba(255, 255, 0, 0.5)' : (isBoosting ? 'rgba(255, 100, 0, 0.4)' : 'rgba(59, 130, 246, 0.3)');
        const count = isHyper ? 20 : (isBoosting ? 12 : 6);
        for (let i = 0; i < count; i++) {
          ctx.fillStyle = trailColor; const offset = (i + 1) * 12;
          ctx.beginPath(); 
          ctx.arc(posRef.current.x - Math.cos(angleRef.current) * offset, posRef.current.y - Math.sin(angleRef.current) * offset, Math.max(0, 15 - i * 0.8), 0, Math.PI * 2); 
          ctx.fill();
        }
      }

      // Sparky Electric Pulse Visual (ENHANCED AND FIXED)
      if (sparkyPulseTimerRef.current > 0) {
        ctx.save();
        ctx.translate(posRef.current.x, posRef.current.y);
        const maxPulseTime = 1200;
        const progress = Math.min(1, Math.max(0, (maxPulseTime - sparkyPulseTimerRef.current) / maxPulseTime));
        const maxPulseRadius = 800;
        const currentRadius = maxPulseRadius * progress;
        const alpha = 1.0 - (progress * progress); // Fades slower then faster for impact

        // Main outer ring
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
        ctx.lineWidth = 15 * (1 - progress); 
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FACC15';
        ctx.stroke();

        // Inner glowing fill
        ctx.fillStyle = `rgba(250, 204, 21, ${alpha * 0.15})`;
        ctx.fill();

        // Extra "electric arcs"
        for (let j = 0; j < 6; j++) {
            const arcAngle = (j / 6) * Math.PI * 2 + (progress * Math.PI);
            ctx.beginPath();
            ctx.moveTo(Math.cos(arcAngle) * (currentRadius * 0.8), Math.sin(arcAngle) * (currentRadius * 0.8));
            ctx.lineTo(Math.cos(arcAngle) * (currentRadius * 1.1), Math.sin(arcAngle) * (currentRadius * 1.1));
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
      }

      // Magnet/Hyperdrive/Duplicate Field Rings
      const drawFieldRing = (x: number, y: number, radius: number, isHyper: boolean, isMirror: boolean) => {
        ctx.save();
        ctx.translate(x, y);
        // "1/2 a magnet" for mirror clones means slightly smaller or semi-transparent
        ctx.strokeStyle = isHyper ? 'rgba(255, 255, 0, 0.6)' : (isMirror ? 'rgba(244, 114, 182, 0.4)' : 'rgba(34, 197, 94, 0.6)');
        ctx.lineWidth = isMirror ? 2 : 4;
        ctx.setLineDash([10, 15]);
        const pulse = Math.sin(Date.now() / 150) * 10;
        ctx.beginPath();
        ctx.arc(0, 0, radius + pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = isMirror ? 0.05 : 0.15;
        ctx.fillStyle = isHyper ? 'yellow' : (isMirror ? '#F472B6' : '#22c55e');
        ctx.beginPath();
        ctx.arc(0, 0, radius + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      if (magnetTimerRef.current > 0 || hyperdriveTimerRef.current > 0 || isMirroringRef.current) {
        const radius = hyperdriveTimerRef.current > 0 ? 225 : (magnetTimerRef.current > 0 ? 150 : 75);
        drawFieldRing(posRef.current.x, posRef.current.y, radius, hyperdriveTimerRef.current > 0, isMirroringRef.current);
        if (isMirroringRef.current) {
          mirrorClonesRef.current.forEach(clone => {
            drawFieldRing(clone.x, clone.y, radius, false, true);
          });
        }
      }

      // Player and Clones
      const drawCar = (x: number, y: number, ang: number, carColor: string, isGlitch: boolean) => {
        ctx.save(); 
        ctx.translate(x, y); 
        ctx.rotate(ang);
        
        if (isGlitch) {
          const ox = (Math.random() - 0.5) * 12;
          const oy = (Math.random() - 0.5) * 12;
          ctx.translate(ox, oy);
          if (Math.random() > 0.7) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = Math.random() > 0.5 ? '#00ffff' : '#ff00ff';
          }
        }

        if (isPhasingRef.current || isCurrentlyPassingThroughRef.current || isMirroringRef.current) { 
          ctx.globalAlpha = isGlitch ? 0.7 : 0.6; 
          ctx.shadowBlur = 15; 
          ctx.shadowColor = carColor; 
        }
        
        ctx.fillStyle = hyperdriveTimerRef.current > 0 ? '#fbbf24' : (autoDriveTimerRef.current > 0 ? '#ef4444' : carColor);
        ctx.beginPath(); ctx.roundRect(-25, -15, 50, 30, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath(); ctx.roundRect(5, -11, 12, 22, 4); ctx.fill();
        ctx.restore();
      };

      drawCar(posRef.current.x, posRef.current.y, angleRef.current, char.color, false);
      if (isMirroringRef.current) {
        mirrorClonesRef.current.forEach(clone => {
          drawCar(clone.x, clone.y, angleRef.current, char.color, true);
        });
      }

      if (hasShieldRef.current) {
        ctx.save(); ctx.translate(posRef.current.x, posRef.current.y);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)'; ctx.lineWidth = 5;
        const shieldPulse = Math.sin(Date.now() / 100) * 5;
        ctx.beginPath(); ctx.arc(0, 0, 45 + shieldPulse, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); 
    };

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      update(dt);
      draw();
      frameIdRef.current = requestAnimationFrame(loop);
    };
    frameIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [gameState, player.character, spawnPowerUp, handleUseAbility, showTeleportMap]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-green-200 ${cutscene.active ? 'scale-[1.08] grayscale-[0.3]' : ''} transition-all duration-300`}>
      {gameState === GameState.START && <StartScreen onStart={handleStart} />}
      
      {(gameState === GameState.PLAYING || gameState === GameState.TUTORIAL) && (
        <>
          <canvas ref={canvasRef} className="block w-full h-full" />
          
          {gameState === GameState.TUTORIAL && (
            <div className="fixed top-12 left-1/2 -translate-x-1/2 w-full max-w-2xl z-[100] p-6">
              <div className="bg-white/95 backdrop-blur-lg rounded-3xl border-8 border-blue-600 p-8 shadow-2xl flex flex-col items-center gap-6 animate-in slide-in-from-top duration-500">
                <p className="bungee text-2xl text-center text-gray-800 leading-tight">
                  {tutorialMessages[tutorialStep]}
                </p>
                <button 
                  onClick={() => { if (tutorialStep < tutorialMessages.length - 1) setTutorialStep(s => s + 1); else initRealGame(); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white bungee px-10 py-4 rounded-2xl text-2xl shadow-xl transition-all active:scale-95"
                >
                  {tutorialStep < tutorialMessages.length - 1 ? "NEXT STEP!" : "GO RACING!"}
                </button>
              </div>
            </div>
          )}

          {spawnAlert && (
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[60]">
              <div className="bg-red-600 text-white px-12 py-6 rounded-3xl border-8 border-yellow-400 shadow-2xl animate-bounce">
                <span className="bungee text-5xl drop-shadow-lg">{spawnAlert}</span>
              </div>
            </div>
          )}

          {showTeleportMap && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-8 animate-in zoom-in duration-300">
                <div className="bg-white rounded-3xl p-6 border-8 border-purple-500 shadow-2xl w-full max-w-4xl flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h2 className="bungee text-3xl text-purple-600">SELECT CHRONO-TARGET</h2>
                    <button onClick={() => setShowTeleportMap(false)} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-xl bungee text-gray-600 transition-colors pointer-events-auto">CANCEL (ESC)</button>
                  </div>
                  <div className="relative aspect-square w-full max-h-[70vh] bg-green-100 border-4 border-purple-200 rounded-xl overflow-hidden cursor-crosshair group pointer-events-auto"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const px = ((e.clientX - rect.left) / rect.width) * 100;
                      const py = ((e.clientY - rect.top) / rect.height) * 100;
                      setTeleportCursorPos({ x: px, y: py });
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * WORLD_SIZE;
                      const y = ((e.clientY - rect.top) / rect.height) * WORLD_SIZE;
                      handleTeleportSelect(x, y);
                    }}
                  >
                    {OBSTACLES.map((obs, idx) => (
                      <div key={idx} className="absolute bg-gray-400 opacity-50 rounded"
                        style={{
                          left: `${(obs.x / WORLD_SIZE) * 100}%`,
                          top: `${(obs.y / WORLD_SIZE) * 100}%`,
                          width: `${(obs.width / WORLD_SIZE) * 100}%`,
                          height: `${(obs.height / WORLD_SIZE) * 100}%`,
                        }}
                      />
                    ))}
                    {coinsRef.current.map((coin, idx) => !coin.collected && (
                      <div key={idx} className="absolute bg-yellow-400 rounded-full w-2 h-2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
                        style={{
                          left: `${(coin.x / WORLD_SIZE) * 100}%`,
                          top: `${(coin.y / WORLD_SIZE) * 100}%`,
                        }}
                      />
                    ))}
                    <div className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        left: `${(posRef.current.x / WORLD_SIZE) * 100}%`,
                        top: `${(posRef.current.y / WORLD_SIZE) * 100}%`,
                      }}
                    >
                        <MapPin className="text-red-600 w-full h-full fill-red-600" />
                    </div>
                    <div className="absolute border-4 border-purple-500 bg-purple-500/10 pointer-events-none transition-opacity duration-150 -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: `${teleportCursorPos.x}%`,
                            top: `${teleportCursorPos.y}%`,
                            width: `${(SECTOR_SIZE / WORLD_SIZE) * 100}%`,
                            height: `${(SECTOR_SIZE / WORLD_SIZE) * 100}%`,
                        }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-px bg-purple-500/20" />
                        <div className="h-full w-px bg-purple-500/20 absolute" />
                      </div>
                    </div>
                  </div>
                  <p className="bungee text-center text-purple-400 text-sm italic">Warps you and harvests all coins in the 7x7 Chrono-Zone!</p>
                </div>
             </div>
          )}

          <HUD 
            time={hudData.time}
            coins={hudData.coinsCollected}
            totalCoins={hudData.totalCoins}
            boost={hudData.boost}
            maxBoost={hudData.maxBoost}
            onRespawn={handleRespawn}
            showPenalty={penaltyMessage}
            coinBoostLeft={hudData.coinBoostLeft}
            speedBoostLeft={hudData.speedBoostLeft}
            magnetLeft={hudData.magnetLeft}
            autoDriveLeft={hudData.autoDriveLeft}
            hyperdriveLeft={hudData.hyperdriveLeft}
            hasShield={hudData.hasShield}
            hasSeeThrough={hudData.hasSeeThrough}
            abilityCooldown={hudData.abilityCooldown}
            maxAbilityCooldown={hudData.maxAbilityCooldown}
            abilityName={player.character?.abilityName || 'Special Ability'}
            onUseAbility={handleUseAbility}
          />

          {isTouchDevice && gameState === GameState.PLAYING && (
            <VirtualControls onInput={handleVirtualInput} />
          )}
          
          <div className="fixed bottom-6 right-6 w-32 h-32 bg-black/30 border-2 border-white/50 backdrop-blur rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute w-2 h-2 bg-red-500 rounded-full border border-white"
              style={{ left: `${(posRef.current.x / WORLD_SIZE) * 100}%`, top: `${(posRef.current.y / WORLD_SIZE) * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </>
      )}
      
      {gameState === GameState.WIN && score && (
        <WinScreen score={score} onRestart={() => setGameState(GameState.START)} />
      )}

      {/* FIXED CUTSCENE OVERLAY - ALWAYS ON TOP */}
      {cutscene.active && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9999] bg-black/20 backdrop-blur-sm animate-pulse">
          <div className="text-center p-12 rounded-full">
            <h2 className={`bungee text-8xl sm:text-9xl italic drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] ${cutscene.type === 'hyper' ? 'text-yellow-400' : 'text-red-500'}`}>
              {cutscene.type === 'hyper' ? 'HYPERDRIVE!' : 'EXHAUSTED!'}
            </h2>
            <p className="bungee text-white text-3xl sm:text-4xl mt-6 drop-shadow-lg">
              {cutscene.type === 'hyper' ? '200% VELOCITY ENGAGED' : 'SYSTEM COOLING DOWN'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
