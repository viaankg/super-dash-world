
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Vector2D, Character, Coin, PlayerScore, PowerUp, PowerUpType } from './types';
import { WORLD_SIZE, INITIAL_COIN_COUNT, MAX_BOOST, BOOST_CONSUMPTION_RATE, BOOST_RECHARGE_RATE, OBSTACLES } from './constants';
import StartScreen from './components/StartScreen';
import HUD from './components/HUD';
import WinScreen from './components/WinScreen';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [player, setPlayer] = useState<{ name: string; character: Character | null }>({ name: '', character: null });
  const [score, setScore] = useState<PlayerScore | null>(null);
  const [penaltyMessage, setPenaltyMessage] = useState(false);
  const [spawnAlert, setSpawnAlert] = useState<string | null>(null);
  const [cutscene, setCutscene] = useState<{ type: 'hyper' | 'stop'; active: boolean }>({ type: 'hyper', active: false });
  const [tutorialStep, setTutorialStep] = useState(0);

  const [hudData, setHudData] = useState({
    time: 0,
    coinsCollected: 0,
    totalCoins: INITIAL_COIN_COUNT,
    boost: MAX_BOOST,
    coinBoostLeft: 0,
    speedBoostLeft: 0,
    magnetLeft: 0,
    autoDriveLeft: 0,
    hyperdriveLeft: 0,
    hasShield: false
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
  
  // Logic to allow only one Hyperdrive roll attempt per speed boost pickup
  const canRollHyperdriveRef = useRef<boolean>(false);

  const tutorialMessages = [
    "Welcome Racer! Use WASD or Arrows to drive around the map.",
    "Great! Now hold SHIFT to use your NITRO BOOST! Watch the blue bar at the bottom.",
    "Collect YELLOW COINS to gain a 5s SPEED BOOST and become INVINCIBLE to edges!",
    "POWER-UPS like Magnets and Shields will spawn every 7s. Grab them for help!",
    "PRO TIP: Combining Coin Boost + Speed Boost + Shift Nitro has a 30% chance to trigger HYPERDRIVE!",
    "Ready to race? Collect ALL coins as fast as you can to win!"
  ];

  const isPointInObstacle = (x: number, y: number, padding: number = 0) => {
    return OBSTACLES.some(obs => (
      x >= obs.x - padding &&
      x <= obs.x + obs.width + padding &&
      y >= obs.y - padding &&
      y <= obs.y + obs.height + padding
    ));
  };

  const spawnPowerUp = useCallback((forceType?: PowerUpType) => {
    let attempts = 0;
    while (attempts < 100) {
      const px = Math.random() * (WORLD_SIZE - 400) + 200;
      const py = Math.random() * (WORLD_SIZE - 400) + 200;
      if (!isPointInObstacle(px, py, 50)) {
        let type: PowerUpType;
        if (forceType) type = forceType;
        else {
          const types: PowerUpType[] = ['speed', 'shield', 'magnet'];
          type = types[Math.floor(Math.random() * types.length)];
        }
        
        if (type === 'autoDrive') {
          setSpawnAlert("AI AUTO-DRIVE SPAWNED!");
          setTimeout(() => setSpawnAlert(null), 3000);
        }

        powerUpsRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          x: px,
          y: py,
          type,
          createdAt: Date.now()
        });
        break;
      }
      attempts++;
    }
  }, []);

  const triggerCutscene = (type: 'hyper' | 'stop') => {
    setCutscene({ type, active: true });
    setTimeout(() => setCutscene(prev => ({ ...prev, active: false })), 1500);
  };

  const handleStart = (name: string, char: Character) => {
    setPlayer({ name, character: char });
    setGameState(GameState.TUTORIAL);
    setTutorialStep(0);
    // Initialize world for tutorial
    posRef.current = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    velRef.current = 0;
    angleRef.current = -Math.PI / 2;
    // Single tutorial coin
    coinsRef.current = [{ id: 999, x: WORLD_SIZE/2 + 300, y: WORLD_SIZE/2, collected: false }];
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
    canRollHyperdriveRef.current = false;
    powerUpsRef.current = [];
    setPenaltyMessage(false);
    setSpawnAlert(null);
    setCutscene({ type: 'hyper', active: false });
    
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
      coinBoostLeft: 0,
      speedBoostLeft: 0,
      magnetLeft: 0,
      autoDriveLeft: 0,
      hyperdriveLeft: 0,
      hasShield: false
    });
    setGameState(GameState.PLAYING);
  }, []);

  const handleRespawn = () => {
    posRef.current = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    velRef.current = 0;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if ((gameState !== GameState.PLAYING && gameState !== GameState.TUTORIAL) || !player.character) return;

    const char = player.character;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const update = (dt: number) => {
      const now = Date.now();
      if (gameState === GameState.PLAYING) {
        timerRef.current += dt / 1000;
      }

      // Timer updates
      if (coinBoostTimerRef.current > 0) coinBoostTimerRef.current = Math.max(0, coinBoostTimerRef.current - dt);
      if (speedBoostTimerRef.current > 0) speedBoostTimerRef.current = Math.max(0, speedBoostTimerRef.current - dt);
      if (magnetTimerRef.current > 0) magnetTimerRef.current = Math.max(0, magnetTimerRef.current - dt);
      if (autoDriveTimerRef.current > 0) autoDriveTimerRef.current = Math.max(0, autoDriveTimerRef.current - dt);
      
      const prevHyperdrive = hyperdriveTimerRef.current;
      if (hyperdriveTimerRef.current > 0) hyperdriveTimerRef.current = Math.max(0, hyperdriveTimerRef.current - dt);
      
      if (prevHyperdrive > 0 && hyperdriveTimerRef.current <= 0) {
        triggerCutscene('stop');
      }

      // Hyperdrive Roll: Must have Coin Boost, Speed Boost, Nitro held, AND canRollHyperdrive must be true
      const isHoldingBoost = keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'];
      if (canRollHyperdriveRef.current && coinBoostTimerRef.current > 0 && speedBoostTimerRef.current > 0 && isHoldingBoost && boostRef.current > 0) {
        canRollHyperdriveRef.current = false; // Only one roll per speed boost pickup
        if (Math.random() < 0.3) {
          hyperdriveTimerRef.current = 15000;
          triggerCutscene('hyper');
        }
      }

      if (gameState === GameState.PLAYING) {
        if (now - lastPowerUpSpawnRef.current > 7000) {
          spawnPowerUp();
          lastPowerUpSpawnRef.current = now;
        }
        // Auto-Drive spawns only every 50 seconds after 150s mark
        if (timerRef.current > 150 && now - lastAutoDriveSpawnRef.current > 50000) {
          spawnPowerUp('autoDrive');
          lastAutoDriveSpawnRef.current = now;
        }
      }

      // Physics variables
      const turnSpeed = 0.05 * char.handling;
      let speedMult = char.speed;
      if (coinBoostTimerRef.current > 0) speedMult *= 1.5;
      if (speedBoostTimerRef.current > 0) speedMult *= 1.5;
      if (autoDriveTimerRef.current > 0) speedMult *= 1.5;
      if (hyperdriveTimerRef.current > 0) speedMult *= 3.0; // 200% extra speed

      const accel = 0.15 * speedMult;
      const friction = 0.98;
      const maxVel = 8 * speedMult;
      const boostMult = 1.8 * char.boostPower;

      // AI Logic: Path to coins while avoiding walls/obstacles
      if (autoDriveTimerRef.current > 0 && hyperdriveTimerRef.current <= 0) {
        const uncollected = coinsRef.current.filter(c => !c.collected);
        if (uncollected.length > 0) {
          let closest = uncollected[0];
          let minDist = Infinity;
          uncollected.forEach(c => {
            const d = Math.sqrt((c.x - posRef.current.x)**2 + (c.y - posRef.current.y)**2);
            if (d < minDist) { minDist = d; closest = c; }
          });
          
          const targetAngle = Math.atan2(closest.y - posRef.current.y, closest.x - posRef.current.x);
          const lookAheadDist = 160;
          const leftWhiskAngle = angleRef.current - 0.7;
          const rightWhiskAngle = angleRef.current + 0.7;
          
          const obstacleAhead = isPointInObstacle(posRef.current.x + Math.cos(angleRef.current) * lookAheadDist, posRef.current.y + Math.sin(angleRef.current) * lookAheadDist, 60);
          const obstacleLeft = isPointInObstacle(posRef.current.x + Math.cos(leftWhiskAngle) * lookAheadDist, posRef.current.y + Math.sin(leftWhiskAngle) * lookAheadDist, 50);
          const obstacleRight = isPointInObstacle(posRef.current.x + Math.cos(rightWhiskAngle) * lookAheadDist, posRef.current.y + Math.sin(rightWhiskAngle) * lookAheadDist, 50);

          if (obstacleAhead) {
            // Dodge logic
            if (obstacleLeft && !obstacleRight) angleRef.current += turnSpeed * 1.8;
            else if (!obstacleLeft && obstacleRight) angleRef.current -= turnSpeed * 1.8;
            else angleRef.current += turnSpeed * 3.0; // Panic turn
          } else {
            // Seek coin
            let angleDiff = targetAngle - angleRef.current;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            angleRef.current += angleDiff * 0.15;
          }
        }
      }

      // Drive inputs
      if (autoDriveTimerRef.current <= 0) {
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) angleRef.current -= turnSpeed;
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) angleRef.current += turnSpeed;
      }
      
      let currentAccel = 0;
      const shouldAutoBoost = autoDriveTimerRef.current > 0 && boostRef.current > 40;

      if (autoDriveTimerRef.current > 0 || hyperdriveTimerRef.current > 0) {
        currentAccel = accel; 
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

      // Collisions (Skipped in hyperdrive)
      if (hyperdriveTimerRef.current <= 0) {
        const playerRadius = 15;
        OBSTACLES.forEach(obs => {
          const left = obs.x - playerRadius;
          const right = obs.x + obs.width + playerRadius;
          const top = obs.y - playerRadius;
          const bottom = obs.y + obs.height + playerRadius;
          if (posRef.current.x > left && posRef.current.x < right && posRef.current.y > top && posRef.current.y < bottom) {
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
            // Bounce and Turn Away
            velRef.current *= -0.4;
            angleRef.current = normalAngle + (Math.random() - 0.5) * 0.8;
          }
        });
      }

      // World Edges with Hyperdrive Teleportation
      const inHyperdrive = hyperdriveTimerRef.current > 0;
      let hitBoundary = false;
      if (posRef.current.x < 0) { if (inHyperdrive) posRef.current.x = WORLD_SIZE - 40; else { posRef.current.x = 10; hitBoundary = true; } }
      if (posRef.current.x > WORLD_SIZE) { if (inHyperdrive) posRef.current.x = 40; else { posRef.current.x = WORLD_SIZE - 10; hitBoundary = true; } }
      if (posRef.current.y < 0) { if (inHyperdrive) posRef.current.y = WORLD_SIZE - 40; else { posRef.current.y = 10; hitBoundary = true; } }
      if (posRef.current.y > WORLD_SIZE) { if (inHyperdrive) posRef.current.y = 40; else { posRef.current.y = WORLD_SIZE - 10; hitBoundary = true; } }

      if (hitBoundary) {
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

      // PowerUps
      powerUpsRef.current = powerUpsRef.current.filter(pu => {
        const dx = posRef.current.x - pu.x;
        const dy = posRef.current.y - pu.y;
        if (Math.sqrt(dx*dx + dy*dy) < 40) {
          if (pu.type === 'speed') {
            speedBoostTimerRef.current = 5000;
            canRollHyperdriveRef.current = true; // Roll granted upon speed pickup
          }
          if (pu.type === 'shield') hasShieldRef.current = true;
          if (pu.type === 'magnet') magnetTimerRef.current = 10000;
          if (pu.type === 'autoDrive') autoDriveTimerRef.current = 10000;
          return false;
        }
        return true;
      });

      // Coins
      const collectionRadius = magnetTimerRef.current > 0 ? 150 : 40;
      let collectedCount = 0;
      coinsRef.current.forEach(coin => {
        if (!coin.collected) {
          const dx = posRef.current.x - coin.x;
          const dy = posRef.current.y - coin.y;
          if (Math.sqrt(dx*dx + dy*dy) < collectionRadius) {
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
          coinBoostLeft: coinBoostTimerRef.current / 1000,
          speedBoostLeft: speedBoostTimerRef.current / 1000,
          magnetLeft: magnetTimerRef.current / 1000,
          autoDriveLeft: autoDriveTimerRef.current / 1000,
          hyperdriveLeft: hyperdriveTimerRef.current / 1000,
          hasShield: hasShieldRef.current
        });
      }

      if (gameState === GameState.PLAYING && collectedCount === INITIAL_COIN_COUNT) {
        const finalTime = timerRef.current;
        const finalScore = Math.floor(Math.max(0, 10000 - finalTime * 10) + (collectedCount * 100));
        setScore({ name: player.name, character: player.character?.name || '', time: finalTime, score: finalScore, date: new Date().toISOString() });
        setGameState(GameState.WIN);
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const camX = posRef.current.x - canvas.width / 2;
      const camY = posRef.current.y - canvas.height / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-camX, -camY);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
      for (let i = 0; i <= WORLD_SIZE; i += 200) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i); ctx.stroke();
      }
      OBSTACLES.forEach(obs => {
        ctx.fillStyle = obs.type === 'tree' ? '#166534' : '#525252';
        if (hyperdriveTimerRef.current > 0) ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 10); ctx.fill();
        ctx.globalAlpha = 1.0;
      });
      powerUpsRef.current.forEach(pu => {
        ctx.save(); ctx.translate(pu.x, pu.y);
        ctx.scale(1 + Math.sin(Date.now() / 200) * 0.1, 1 + Math.sin(Date.now() / 200) * 0.1);
        ctx.fillStyle = pu.type === 'speed' ? '#3b82f6' : pu.type === 'shield' ? '#a855f7' : pu.type === 'magnet' ? '#22c55e' : '#ef4444';
        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'white';
        if (pu.type === 'speed') { ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-8, 2); ctx.lineTo(2, 2); ctx.lineTo(-2, 15); ctx.lineTo(8, -2); ctx.lineTo(-2, -2); ctx.closePath(); ctx.fill(); }
        else if (pu.type === 'shield') { ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, -8); ctx.lineTo(10, 4); ctx.quadraticCurveTo(0, 15, -10, 4); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fill(); }
        else if (pu.type === 'magnet') { ctx.lineWidth = 6; ctx.strokeStyle = 'white'; ctx.beginPath(); ctx.arc(0, 2, 8, Math.PI, 0, true); ctx.moveTo(-8, 2); ctx.lineTo(-8, -10); ctx.moveTo(8, 2); ctx.lineTo(8, -10); ctx.stroke(); }
        else if (pu.type === 'autoDrive') { ctx.font = 'bold 20px Bungee'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AI', 0, 0); }
        ctx.restore();
      });
      coinsRef.current.forEach(coin => {
        if (!coin.collected) {
          ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(coin.x, coin.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      });
      if (speedBoostTimerRef.current > 0 || coinBoostTimerRef.current > 0 || autoDriveTimerRef.current > 0 || hyperdriveTimerRef.current > 0) {
        const trailColor = hyperdriveTimerRef.current > 0 ? 'rgba(255, 255, 0, 0.5)' : 'rgba(59, 130, 246, 0.3)';
        const count = hyperdriveTimerRef.current > 0 ? 15 : 6;
        for (let i = 0; i < count; i++) {
          ctx.fillStyle = trailColor; const offset = (i + 1) * 15;
          ctx.beginPath(); ctx.arc(posRef.current.x - Math.cos(angleRef.current) * offset, posRef.current.y - Math.sin(angleRef.current) * offset, 12 - i, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.save(); ctx.translate(posRef.current.x, posRef.current.y); ctx.rotate(angleRef.current);
      ctx.fillStyle = hyperdriveTimerRef.current > 0 ? '#fbbf24' : (autoDriveTimerRef.current > 0 ? '#ef4444' : char.color);
      ctx.beginPath(); ctx.roundRect(-25, -15, 50, 30, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
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
  }, [gameState, player.character]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-green-200 ${cutscene.active ? 'scale-[1.08] grayscale-[0.3]' : ''} transition-all duration-300`}>
      {gameState === GameState.START && <StartScreen onStart={handleStart} />}
      
      {(gameState === GameState.PLAYING || gameState === GameState.TUTORIAL) && (
        <>
          <canvas ref={canvasRef} className="block w-full h-full" />
          
          {gameState === GameState.TUTORIAL && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl z-[100] p-6">
              <div className="bg-white/95 backdrop-blur-lg rounded-3xl border-8 border-blue-600 p-10 shadow-2xl flex flex-col items-center gap-8 animate-in slide-in-from-bottom duration-500">
                <p className="bungee text-3xl text-center text-gray-800 leading-tight">
                  {tutorialMessages[tutorialStep]}
                </p>
                <button 
                  onClick={() => {
                    if (tutorialStep < tutorialMessages.length - 1) setTutorialStep(s => s + 1);
                    else initRealGame();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white bungee px-14 py-6 rounded-2xl text-3xl shadow-xl transition-all active:scale-90"
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

          {cutscene.active && (
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[110] bg-white/20 backdrop-blur-md animate-pulse">
              <div className="text-center">
                <h2 className={`bungee text-9xl italic drop-shadow-2xl ${cutscene.type === 'hyper' ? 'text-yellow-400' : 'text-red-500'}`}>
                  {cutscene.type === 'hyper' ? 'HYPERDRIVE!' : 'EXHAUSTED!'}
                </h2>
                <p className="bungee text-white text-4xl mt-6 drop-shadow">
                  {cutscene.type === 'hyper' ? '200% VELOCITY ENGAGED' : 'SYSTEM COOLING DOWN'}
                </p>
              </div>
            </div>
          )}

          <HUD 
            time={hudData.time}
            coins={hudData.coinsCollected}
            totalCoins={hudData.totalCoins}
            boost={hudData.boost}
            maxBoost={MAX_BOOST}
            onRespawn={handleRespawn}
            showPenalty={penaltyMessage}
            coinBoostLeft={hudData.coinBoostLeft}
            speedBoostLeft={hudData.speedBoostLeft}
            magnetLeft={hudData.magnetLeft}
            autoDriveLeft={hudData.autoDriveLeft}
            hyperdriveLeft={hudData.hyperdriveLeft}
            hasShield={hudData.hasShield}
          />
          
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
    </div>
  );
};

export default App;
