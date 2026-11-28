import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  Car,
  Castle,
  Coins,
  Compass,
  Crosshair,
  Crown,
  Eye,
  Flag,
  Hammer,
  Handshake,
  Home,
  Map as MapIcon,
  Music,
  Play,
  Shield,
  Sparkles,
  Swords,
  Tv,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlatformData } from '../../context/PlatformDataContext';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import {
  loadEmpireProgress,
  pickArenaQuestion,
  saveEmpireProgress,
} from '../../services/blueprintStore';
import type { BlueprintQuestionItem } from '../../utils/chatHistoryLogic';
import {
  applyPaldaAnswer,
  computeQuizRewardCoins,
  generateMatchedRivals,
  getActionCoinCost,
  getMatchmakingBracket,
  getRobotAvatarSpec,
  resolvePaldaOutcome,
  ROBOT_AVATARS,
  selectDifficultyForStake,
  startPaldaBattle,
  type EmpireActionType,
  type EmpireSaveState,
  type PaldaBattleState,
  type RivalEmpireSpec,
  type RobotAvatarId,
} from '../../utils/empireBuilderLogic';
import { EmpireAudioEngine, type AssemblyMusicTrack } from './empire3d/empireAudio';
import {
  buildEmpireWorld,
  syncEmpireStructuresInWorld,
  type LaserBoltEntity,
  type WorldRefs,
} from './empire3d/empireWorldBuilder';

interface EmpireBuilderGameProps {
  onBack: () => void;
}

const LIVE_STUDY_TV_CARDS = [
  {
    subject: 'Physics',
    title: 'Gauss Law & Electric Flux',
    formula: 'Φ = ∮ E · dA = q_enclosed / ε₀',
    tip: 'Flux depends ONLY on enclosed charge, never on cavity shape or outside charges.',
  },
  {
    subject: 'Chemistry',
    title: 'First-Order Kinetics & Nernst',
    formula: 't₁/₂ = 0.693 / k   |   E = E° − (0.0591/n) log Q',
    tip: 'Half-life of a first-order reaction is independent of initial concentration [A]₀.',
  },
  {
    subject: 'Mathematics',
    title: 'King’s Definite Integral Property',
    formula: '∫ₐᵇ f(x) dx = ∫ₐᵇ f(a + b − x) dx',
    tip: 'Use King’s property first on trigonometric fractions over [0, π/2].',
  },
];

export function EmpireBuilderGame({ onBack }: EmpireBuilderGameProps) {
  const { firebaseUser, profile } = useAuth();
  const { materials } = usePlatformData();
  const { recordArenaGameResult, triggerPrepsBotVictory } = usePrepskm2();
  const userScope = firebaseUser?.uid ?? 'guest';

  const [empire, setEmpire] = useState<EmpireSaveState>(() => loadEmpireProgress(userScope));
  const [phase, setPhase] = useState<'title' | 'playing'>('title');
  const [cameraMode, setCameraMode] = useState<'3p' | '1p'>('3p');
  const [scopeZoom, setScopeZoom] = useState(false);
  const [drivingMode, setDrivingMode] = useState<'foot' | 'gaadi' | 'ghoda'>('foot');
  const [fullMapOpen, setFullMapOpen] = useState(false);
  const [studyTvOpen, setStudyTvOpen] = useState(false);
  const [studyTvSlide, setStudyTvSlide] = useState(0);
  const [musicMenuOpen, setMusicMenuOpen] = useState(false);
  const [warModalOpen, setWarModalOpen] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Universal Quiz-Gated Action Modal
  const [quizModal, setQuizModal] = useState<{
    action: EmpireActionType;
    title: string;
    costCoins: number;
    question: BlueprintQuestionItem;
    feedback?: string;
  } | null>(null);

  // Palda (Tug-of-War) Quiz Warfare State
  const [paldaBattle, setPaldaBattle] = useState<PaldaBattleState | null>(null);
  const [paldaQuestion, setPaldaQuestion] = useState<BlueprintQuestionItem | null>(null);
  const [paldaTimerSec, setPaldaTimerSec] = useState(20);
  const paldaStartMsRef = useRef(Date.now());

  // Mount & Input Refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<WorldRefs | null>(null);
  const audioRef = useRef<EmpireAudioEngine | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0.24);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const playerVelYRef = useRef(0);
  const groundedRef = useRef(true);
  const boltsRef = useRef<LaserBoltEntity[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const empireRef = useRef(empire);
  empireRef.current = empire;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;
  const scopeZoomRef = useRef(scopeZoom);
  scopeZoomRef.current = scopeZoom;
  const drivingModeRef = useRef(drivingMode);
  drivingModeRef.current = drivingMode;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const avatarSpec = useMemo(() => getRobotAvatarSpec(empire.avatarId), [empire.avatarId]);
  const matchmakingBracket = useMemo(() => getMatchmakingBracket(empire.areaSqFt), [empire.areaSqFt]);
  const matchedRivals = useMemo(
    () =>
      generateMatchedRivals(
        empire.areaSqFt,
        empire.alliedEmpires.map((a) => a.id)
      ),
    [empire.areaSqFt, empire.alliedEmpires]
  );

  // Persist Empire state automatically
  useEffect(() => {
    saveEmpireProgress(userScope, empire);
  }, [empire, userScope]);

  // Mirror state for browser testability
  useEffect(() => {
    document.body.dataset.state = phase === 'title' ? 'title' : 'playing';
    return () => {
      delete document.body.dataset.state;
    };
  }, [phase]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  // Init Web Audio engine
  useEffect(() => {
    audioRef.current = new EmpireAudioEngine();
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.enabled = sfxEnabled;
      if (!sfxEnabled) audioRef.current.stopStageMusic();
    }
  }, [sfxEnabled]);

  // Fire Cyber-Blaster (Bandook) laser bolt from player toward forward look direction
  const fireCyberBlaster = useCallback(() => {
    const world = worldRef.current;
    const scene = sceneRef.current;
    if (!world || !scene || phaseRef.current !== 'playing') return;

    audioRef.current?.playSfx('laser');
    const dir = new THREE.Vector3(
      -Math.sin(yawRef.current),
      -Math.sin(pitchRef.current) * 0.4,
      -Math.cos(yawRef.current)
    ).normalize();

    const boltGeo = new THREE.BoxGeometry(0.18, 0.18, 1.4);
    const boltMat = new THREE.MeshStandardMaterial({
      color: '#C6FF00',
      emissive: '#C6FF00',
      emissiveIntensity: 1.0,
    });
    const mesh = new THREE.Mesh(boltGeo, boltMat);
    mesh.position.copy(world.playerGroup.position).add(new THREE.Vector3(0, 1.45, 0));
    mesh.lookAt(mesh.position.clone().add(dir));
    scene.add(mesh);
    boltsRef.current.push({
      mesh,
      vel: dir.multiplyScalar(58),
      ttl: 1.4,
      fromPlayer: true,
    });
  }, []);

  // Open Universal Quiz-Gated Action Modal
  const openQuizGate = useCallback(
    (action: EmpireActionType, title: string) => {
      const cost = getActionCoinCost(action, empireRef.current.avatarId);
      if (cost > 0 && empireRef.current.coins < cost) {
        showToast(`Need ${cost} Empire Coins! Tap "Earn Coins" quiz to fill your treasury.`);
        return;
      }
      const diff = selectDifficultyForStake(action, empireRef.current.areaSqFt);
      const q = pickArenaQuestion(diff);
      setQuizModal({ action, title, costCoins: cost, question: q });
    },
    [showToast]
  );

  const handleQuizAnswer = (optIdx: number) => {
    if (!quizModal) return;
    const isCorrect = quizModal.question.correctOptionIndices.includes(optIdx);
    if (!isCorrect) {
      audioRef.current?.playSfx('wrong');
      setEmpire((prev) => ({ ...prev, quizStreak: 0 }));
      setQuizModal((prev) =>
        prev ? { ...prev, feedback: `Not quite! Hint: ${prev.question.solutionText}` } : null
      );
      return;
    }

    const rewardCoins = computeQuizRewardCoins(
      quizModal.question.difficultyTier,
      empire.quizStreak + 1,
      empire.avatarId
    );
    audioRef.current?.playSfx(quizModal.action.startsWith('build') ? 'build' : 'coin');

    setEmpire((prev) => {
      const next: EmpireSaveState = {
        ...prev,
        coins: Math.max(0, prev.coins - quizModal.costCoins + rewardCoins),
        quizStreak: prev.quizStreak + 1,
        totalQuestionsSolved: prev.totalQuestionsSolved + 1,
      };
      if (quizModal.action === 'build-house') {
        next.housesBuilt = Math.min(6, prev.housesBuilt + 1);
        next.areaSqFt = prev.areaSqFt + 25;
      } else if (quizModal.action === 'build-tower') {
        next.watchtowersBuilt = Math.min(4, prev.watchtowersBuilt + 1);
        next.areaSqFt = prev.areaSqFt + 35;
      } else if (quizModal.action === 'build-wall') {
        next.wallsBuilt = Math.min(4, prev.wallsBuilt + 1);
        next.areaSqFt = prev.areaSqFt + 20;
      } else if (quizModal.action === 'summon-gaadi') {
        next.hasGaadi = true;
      } else if (quizModal.action === 'summon-ghoda-gaadi') {
        next.hasGhodaGaadi = true;
      } else if (quizModal.action === 'summon-senapati') {
        next.hasSenapati = true;
      } else if (quizModal.action === 'deploy-guard') {
        next.guardRobots = prev.guardRobots + 1;
      } else if (quizModal.action === 'unlock-chest') {
        next.unlockedChests = prev.unlockedChests + 1;
        next.coins += 65;
      }
      return next;
    });

    if (quizModal.action === 'summon-gaadi') setDrivingMode('gaadi');
    if (quizModal.action === 'summon-ghoda-gaadi') setDrivingMode('ghoda');
    showToast(`+${rewardCoins} Coins! ${quizModal.title} completed.`);
    setQuizModal(null);
  };

  // Start Palda Tug-of-War Battle
  const handleStartPalda = (rival: RivalEmpireSpec) => {
    const battle = startPaldaBattle(rival);
    const q = pickArenaQuestion(rival.difficulty);
    setPaldaBattle(battle);
    setPaldaQuestion(q);
    setPaldaTimerSec(20 + avatarSpec.quizTimeBonusSec);
    paldaStartMsRef.current = Date.now();
  };

  // Palda countdown timer
  useEffect(() => {
    if (!paldaBattle || paldaBattle.status !== 'active') return;
    const id = window.setInterval(() => {
      setPaldaTimerSec((t) => {
        if (t <= 1) {
          const updated = applyPaldaAnswer(paldaBattle, false, 20);
          setPaldaBattle(updated);
          if (updated.status === 'active') {
            setPaldaQuestion(pickArenaQuestion(updated.rival.difficulty));
            paldaStartMsRef.current = Date.now();
            return 20 + avatarSpec.quizTimeBonusSec;
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [paldaBattle, avatarSpec.quizTimeBonusSec]);

  const handlePaldaChoice = (optIdx: number) => {
    if (!paldaBattle || !paldaQuestion || paldaBattle.status !== 'active') return;
    const elapsedSec = (Date.now() - paldaStartMsRef.current) / 1000;
    const isCorrect = paldaQuestion.correctOptionIndices.includes(optIdx);
    audioRef.current?.playSfx(isCorrect ? 'hit' : 'wrong');
    const updated = applyPaldaAnswer(paldaBattle, isCorrect, elapsedSec);
    setPaldaBattle(updated);

    if (updated.status === 'active') {
      setPaldaQuestion(pickArenaQuestion(updated.rival.difficulty, undefined, [paldaQuestion.id]));
      setPaldaTimerSec(20 + avatarSpec.quizTimeBonusSec);
      paldaStartMsRef.current = Date.now();
    } else if (updated.status === 'player-won') {
      audioRef.current?.playSfx('victory');
    } else {
      setEmpire((prev) => resolvePaldaOutcome(prev, updated.rival, 'defeat'));
      showToast('Defeated in Palda Debate! Territory reset to 10 sq. ft. starter plot.');
    }
  };

  const handlePaldaPostVictory = (choice: 'annex' | 'ally') => {
    if (!paldaBattle) return;
    const rival = paldaBattle.rival;
    setEmpire((prev) => resolvePaldaOutcome(prev, rival, choice));
    recordArenaGameResult({
      gameName: '3D Empire Builder — Palda War',
      subject: 'speedArena',
      score: rival.areaSqFt * 10,
      accuracyRatio:
        paldaBattle.playerHits / Math.max(1, paldaBattle.playerHits + paldaBattle.rivalHits),
      maxCombo: paldaBattle.playerHits,
      xpEarned: 220,
    });
    triggerPrepsBotVictory({
      title: choice === 'annex' ? `${rival.name} Annexed!` : `${rival.name} Allied!`,
      subtitle:
        choice === 'annex'
          ? `+${rival.areaSqFt} sq. ft. added to your PrepsKM Empire!`
          : `Connected Allied Empire rendered adjacent to your borders!`,
      badge: choice === 'annex' ? 'HADAP LO' : 'DOSTI ALLY',
    });
    setPaldaBattle(null);
    setPaldaQuestion(null);
    setWarModalOpen(false);
  };

  const handleToggleStageMusic = (track: AssemblyMusicTrack) => {
    setEmpire((prev) => {
      const samePlaying = prev.stageMusicPlaying && prev.musicTrack === track;
      const nextPlaying = !samePlaying;
      if (nextPlaying) {
        audioRef.current?.startStageMusic(track);
        showToast(`Royal Assembly Stage playing: ${track.replace('-', ' ').toUpperCase()}`);
      } else {
        audioRef.current?.stopStageMusic();
      }
      return { ...prev, musicTrack: track, stageMusicPlaying: nextPlaying };
    });
  };

  // Sync dynamic structures (Houses, Watchtowers, Walls, Connected Allied Empires, Vehicles, Senapati)
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    syncEmpireStructuresInWorld(world, {
      housesBuilt: empire.housesBuilt,
      watchtowersBuilt: empire.watchtowersBuilt,
      wallsBuilt: empire.wallsBuilt,
      alliedEmpires: empire.alliedEmpires,
    });
    world.gaadiGroup.visible = empire.hasGaadi;
    world.ghodaGaadiGroup.visible = empire.hasGhodaGaadi;
    world.senapatiGroup.visible = empire.hasSenapati;
  }, [
    empire.housesBuilt,
    empire.watchtowersBuilt,
    empire.wallsBuilt,
    empire.alliedEmpires,
    empire.hasGaadi,
    empire.hasGhodaGaadi,
    empire.hasSenapati,
    phase,
  ]);

  // Mount Three.js WebGL Engine ONCE when entering 'playing' phase
  useEffect(() => {
    if (phase !== 'playing') return;
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL renderer (SwiftShader / llvmpipe) to guarantee smooth, zero-freeze frames
    const probeCanvas = document.createElement('canvas');
    const probeGl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    let isSoftwareGl = false;
    if (probeGl) {
      const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbg
        ? String(probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
        : '';
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 960, container.clientHeight || 540);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#7dd3fc');
    scene.fog = new THREE.Fog('#bae6fd', 75, 195);
    sceneRef.current = scene;

    // IBL Environment Lighting (RoomEnvironment) + Sun + Hemisphere
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const hemi = new THREE.HemisphereLight('#f0f9ff', '#365314', 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fffbeb', 1.35);
    sun.position.set(45, 70, 35);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || 960) / (container.clientHeight || 540),
      0.2,
      280
    );
    camera.position.set(0, 6.2, 23.5);
    camera.lookAt(0, 2.2, 0);

    const world = buildEmpireWorld(
      scene,
      getRobotAvatarSpec(empireRef.current.avatarId),
      empireRef.current.playerNameTag
    );
    world.playerGroup.rotation.y = Math.PI;
    worldRef.current = world;
    syncEmpireStructuresInWorld(world, {
      housesBuilt: empireRef.current.housesBuilt,
      watchtowersBuilt: empireRef.current.watchtowersBuilt,
      wallsBuilt: empireRef.current.wallsBuilt,
      alliedEmpires: empireRef.current.alliedEmpires,
    });
    world.gaadiGroup.visible = empireRef.current.hasGaadi;
    world.ghodaGaadiGroup.visible = empireRef.current.hasGhodaGaadi;
    world.senapatiGroup.visible = empireRef.current.hasSenapati;

    // Keyboard & Pointer Controls
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (k === 'v') setCameraMode((m) => (m === '3p' ? '1p' : '3p'));
      else if (k === 'q') setScopeZoom((z) => !z);
      else if (k === 'm') setFullMapOpen((o) => !o);
      else if (k === 'f') fireCyberBlaster();
      else if (k === 'e') setStudyTvOpen((o) => !o);
      else if (k === ' ' && groundedRef.current) {
        playerVelYRef.current = 11.5;
        groundedRef.current = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        setScopeZoom((z) => !z);
        return;
      }
      draggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      yawRef.current -= dx * 0.0065;
      pitchRef.current = Math.max(-0.35, Math.min(0.85, pitchRef.current + dy * 0.005));
    };
    const onPointerUp = () => {
      draggingRef.current = false;
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const dom = renderer.domElement;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('contextmenu', onContextMenu);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Scratch vectors allocated once outside frame loop
    const moveVec = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const camDesired = new THREE.Vector3();

    let disposed = false;
    let lastTs = performance.now();
    let timerId = 0;
    let rafId = 0;

    // Software WebGL fence-based pacing so Playwright & SwiftShader never starve IPC
    const gl = renderer.getContext();
    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      if (!isSoftwareGl) {
        rafId = window.requestAnimationFrame(cb);
        return;
      }
      const gl2 = gl as WebGL2RenderingContext;
      if (typeof gl2.fenceSync === 'function') {
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl2.deleteSync(sync);
            return;
          }
          if (!sync || gl2.clientWaitSync(sync, 0, 0) !== gl2.TIMEOUT_EXPIRED) {
            if (sync) gl2.deleteSync(sync);
            timerId = window.setTimeout(cb, 80);
          } else {
            timerId = window.setTimeout(poll, 16);
          }
        };
        timerId = window.setTimeout(poll, 16);
      } else {
        timerId = window.setTimeout(cb, 90);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      const spec = getRobotAvatarSpec(empireRef.current.avatarId);
      const speedBase =
        drivingModeRef.current === 'gaadi'
          ? 24
          : drivingModeRef.current === 'ghoda'
            ? 17
            : 12.5;
      const speed = speedBase * spec.moveSpeedMultiplier;

      const forward =
        (keysRef.current['w'] || keysRef.current['arrowup'] ? 1 : 0) -
        (keysRef.current['s'] || keysRef.current['arrowdown'] ? 1 : 0);
      const strafe =
        (keysRef.current['d'] || keysRef.current['arrowright'] ? 1 : 0) -
        (keysRef.current['a'] || keysRef.current['arrowleft'] ? 1 : 0);

      moveVec.set(0, 0, 0);
      if (forward !== 0 || strafe !== 0) {
        const sinY = Math.sin(yawRef.current);
        const cosY = Math.cos(yawRef.current);
        moveVec.x = (-sinY * forward + cosY * strafe) * speed * dt;
        moveVec.z = (-cosY * forward - sinY * strafe) * speed * dt;
        world.playerGroup.position.x = Math.max(-96, Math.min(96, world.playerGroup.position.x + moveVec.x));
        world.playerGroup.position.z = Math.max(-96, Math.min(96, world.playerGroup.position.z + moveVec.z));
        world.playerGroup.rotation.y = Math.atan2(moveVec.x, moveVec.z);
      }

      // Gravity & Climbable Rajmahal Rooftop elevation support
      if (!groundedRef.current || world.playerGroup.position.y > 0) {
        playerVelYRef.current -= 28 * dt;
        world.playerGroup.position.y += playerVelYRef.current * dt;
        if (world.playerGroup.position.y <= 0) {
          world.playerGroup.position.y = 0;
          playerVelYRef.current = 0;
          groundedRef.current = true;
        }
      }

      // Sync vehicle under player when driving Gaadi or Ghoda Gaadi
      if (drivingModeRef.current === 'gaadi' && world.gaadiGroup.visible) {
        world.gaadiGroup.position.set(
          world.playerGroup.position.x,
          0,
          world.playerGroup.position.z
        );
        world.gaadiGroup.rotation.y = world.playerGroup.rotation.y;
      } else if (drivingModeRef.current === 'ghoda' && world.ghodaGaadiGroup.visible) {
        world.ghodaGaadiGroup.position.set(
          world.playerGroup.position.x,
          0,
          world.playerGroup.position.z
        );
        world.ghodaGaadiGroup.rotation.y = world.playerGroup.rotation.y;
      }

      // Senapati AI General follows player
      if (world.senapatiGroup.visible) {
        world.senapatiGroup.position.x +=
          (world.playerGroup.position.x - 3.2 - world.senapatiGroup.position.x) * dt * 2.5;
        world.senapatiGroup.position.z +=
          (world.playerGroup.position.z + 2.5 - world.senapatiGroup.position.z) * dt * 2.5;
      }

      // Animate Floating Target Dummies
      const tSec = now * 0.001;
      for (const d of world.dummies) {
        d.mesh.position.y = 2.6 + Math.sin(tSec * 2.4 + d.phase) * 0.45;
        d.mesh.rotation.y = tSec * 1.1;
      }

      // Animate Roaming Villagers + Royal Assembly Stage Party Dance
      const musicOn = empireRef.current.stageMusicPlaying;
      world.spotlights[0].intensity = musicOn ? 2.5 + Math.sin(tSec * 8) * 1.5 : 0;
      world.spotlights[1].intensity = musicOn ? 2.5 + Math.cos(tSec * 8) * 1.5 : 0;
      for (const v of world.villagers) {
        v.mesh.position.x = v.homeX + Math.sin(tSec * 0.7 + v.phase) * 2.6;
        v.mesh.position.y = musicOn ? Math.abs(Math.sin(tSec * 7 + v.phase)) * 0.85 : 0;
        v.mesh.rotation.y = musicOn ? tSec * 4 + v.phase : Math.sin(tSec + v.phase);
      }

      // Armed Defense Guards Patrol & Auto-Fire Lasers at Invading Red Raiders
      for (const g of world.guards) {
        g.angle += dt * 0.25;
        g.mesh.position.set(Math.cos(g.angle) * g.radius, 0, Math.sin(g.angle) * g.radius);
        g.mesh.rotation.y = -g.angle;
        g.cooldown = Math.max(0, g.cooldown - dt);
        if (g.cooldown <= 0) {
          const target = world.raiders.find(
            (r) => r.alive && r.mesh.position.distanceTo(g.mesh.position) < 28
          );
          if (target) {
            g.cooldown = 1.3;
            const bMesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.14, 0.14, 1.1),
              new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1 })
            );
            bMesh.position.copy(g.mesh.position).add(new THREE.Vector3(0, 1.5, 0));
            const bDir = target.mesh.position.clone().sub(g.mesh.position).normalize();
            bMesh.lookAt(target.mesh.position);
            scene.add(bMesh);
            boltsRef.current.push({
              mesh: bMesh,
              vel: bDir.multiplyScalar(42),
              ttl: 1.0,
              fromPlayer: false,
            });
          }
        }
      }

      // Invading Red Raiders Patrol / Respawn
      for (const r of world.raiders) {
        if (!r.alive) continue;
        const toCenter = new THREE.Vector3(-r.mesh.position.x, 0, -r.mesh.position.z);
        const dist = toCenter.length();
        if (dist > 18) {
          toCenter.normalize();
          r.mesh.position.addScaledVector(toCenter, r.speed * dt);
          r.mesh.rotation.y = Math.atan2(toCenter.x, toCenter.z);
        }
      }

      // Update Laser Bolts & Collisions
      const nextBolts: LaserBoltEntity[] = [];
      for (const b of boltsRef.current) {
        b.ttl -= dt;
        b.mesh.position.addScaledVector(b.vel, dt);
        let hit = false;

        for (const r of world.raiders) {
          if (!r.alive) continue;
          if (b.mesh.position.distanceTo(r.mesh.position.clone().setY(1.4)) < 1.8) {
            r.hp -= 30;
            hit = true;
            if (b.fromPlayer) audioRef.current?.playSfx('hit');
            if (r.hp <= 0) {
              // Respawn raider on outer perimeter and award coins
              const ang = Math.random() * Math.PI * 2;
              r.mesh.position.set(Math.cos(ang) * 58, 0, Math.sin(ang) * 58);
              r.hp = r.maxHp;
              if (b.fromPlayer) {
                setEmpire((prev) => ({
                  ...prev,
                  coins: prev.coins + 25,
                  raidersDefeated: prev.raidersDefeated + 1,
                }));
              }
            }
            break;
          }
        }

        if (!hit && b.fromPlayer) {
          for (const d of world.dummies) {
            if (b.mesh.position.distanceTo(d.mesh.position) < 1.6) {
              hit = true;
              audioRef.current?.playSfx('hit');
              setEmpire((prev) => ({ ...prev, coins: prev.coins + 10 }));
              break;
            }
          }
        }

        if (hit || b.ttl <= 0) {
          scene.remove(b.mesh);
          b.mesh.geometry.dispose();
        } else {
          nextBolts.push(b);
        }
      }
      boltsRef.current = nextBolts;

      // Camera 1P / 3P + Sniper Scope FOV Zoom
      const targetFov = scopeZoomRef.current ? 24 : 62;
      if (Math.abs(camera.fov - targetFov) > 0.2) {
        camera.fov += (targetFov - camera.fov) * 0.22;
        camera.updateProjectionMatrix();
      }

      const px = world.playerGroup.position.x;
      const py = world.playerGroup.position.y;
      const pz = world.playerGroup.position.z;

      if (cameraModeRef.current === '1p' || scopeZoomRef.current) {
        world.playerGroup.visible = false;
        camera.position.set(px, py + 2.2, pz);
        camTarget.set(
          px - Math.sin(yawRef.current) * 14,
          py + 2.2 - Math.sin(pitchRef.current) * 10,
          pz - Math.cos(yawRef.current) * 14
        );
        camera.lookAt(camTarget);
      } else {
        world.playerGroup.visible = true;
        const dist = drivingModeRef.current !== 'foot' ? 13 : 9.5;
        camDesired.set(
          px + Math.sin(yawRef.current) * dist * Math.cos(pitchRef.current),
          py + 3.2 + Math.sin(pitchRef.current) * dist,
          pz + Math.cos(yawRef.current) * dist * Math.cos(pitchRef.current)
        );
        camera.position.lerp(camDesired, 0.18);
        camTarget.set(px, py + 1.8, pz);
        camera.lookAt(camTarget);
      }

      renderer.render(scene, camera);

      // Update Live Corner Minimap Radar
      const mini = minimapRef.current;
      if (mini) {
        const mctx = mini.getContext('2d');
        if (mctx) {
          const S = mini.width;
          const mapScale = S / 160;
          const toM = (v: number) => S / 2 + v * mapScale;

          mctx.fillStyle = '#07111f';
          mctx.fillRect(0, 0, S, S);
          // Roads
          mctx.fillStyle = '#334155';
          mctx.fillRect(S / 2 - 3, 0, 6, S);
          mctx.fillRect(0, S / 2 - 3, S, 6);
          // River
          mctx.fillStyle = '#0284c7';
          mctx.fillRect(0, toM(58) - 3, S, 6);
          // Rajmahal
          mctx.fillStyle = '#fbbf24';
          mctx.fillRect(toM(-10), toM(-42), 20 * mapScale, 16 * mapScale);
          // Raiders (Red)
          mctx.fillStyle = '#ef4444';
          for (const r of world.raiders) {
            mctx.beginPath();
            mctx.arc(toM(r.mesh.position.x), toM(r.mesh.position.z), 3, 0, Math.PI * 2);
            mctx.fill();
          }
          // Allied Empires (Emerald)
          mctx.fillStyle = '#10b981';
          const allyAnchors = [
            [-58, -44],
            [58, -44],
            [58, 36],
          ];
          empireRef.current.alliedEmpires.slice(0, 3).forEach((_, i) => {
            mctx.fillRect(toM(allyAnchors[i][0]) - 4, toM(allyAnchors[i][1]) - 4, 8, 8);
          });
          // Player Dot (Acid Lime)
          mctx.fillStyle = '#C6FF00';
          mctx.beginPath();
          mctx.arc(toM(px), toM(pz), 4.2, 0, Math.PI * 2);
          mctx.fill();
        }
      }

      afterDraw(tick);
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      pmrem.dispose();
      renderer.dispose();
    };
  }, [phase, fireCyberBlaster]);

  // ==========================================
  // PRE-START AVATAR & NAME TAG SELECTION
  // ==========================================
  if (phase === 'title') {
    return (
      <div className="min-h-[82vh] rounded-3xl bg-[#070B16] border border-slate-800 p-6 sm:p-8 text-slate-100">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Apex Arena
          </button>
          <span className="text-xs font-mono uppercase tracking-widest text-[#C6FF00]">
            Apex Arena · 3D Open-World Flagship
          </span>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              3D Open-World Empire Builder
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl mx-auto">
              Start at <strong className="text-white">10 sq. ft.</strong>, explore your enterable Rajmahal &amp; Gaon village, watch live <strong className="text-sky-400">prepskm.in</strong> Study TVs, summon Gaadi &amp; Ghoda Gaadi, and conquer rivals through <strong className="text-[#C6FF00]">Palda Tug-of-War Quiz Battles</strong>.
            </p>
          </div>

          {/* 5 Selectable PrepSKM Robot Avatars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ROBOT_AVATARS.map((av) => {
              const selected = empire.avatarId === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  data-testid={`avatar-card-${av.id}`}
                  onClick={() => setEmpire((prev) => ({ ...prev, avatarId: av.id as RobotAvatarId }))}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    selected
                      ? 'bg-slate-900 border-[#C6FF00] ring-2 ring-[#C6FF00]/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center font-black text-slate-950 text-xs"
                    style={{ backgroundColor: av.primaryColor, border: `2px solid ${av.accentColor}` }}
                  >
                    BOT
                  </div>
                  <div className="font-display font-bold text-sm text-white">{av.name}</div>
                  <div className="text-[11px] font-mono text-sky-400">{av.roleTitle}</div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-snug">{av.perkSummary}</p>
                </button>
              );
            })}
          </div>

          {/* Customizable 3D Floating Name Tag + Launch CTA */}
          <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  3D Floating Name Tag (defaults to PrepsKM)
                </label>
                <input
                  data-testid="empire-nametag-input"
                  type="text"
                  maxLength={18}
                  value={empire.playerNameTag}
                  onChange={(e) =>
                    setEmpire((prev) => ({ ...prev, playerNameTag: e.target.value }))
                  }
                  placeholder={profile?.displayName || 'PrepsKM'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm font-bold text-white"
                />
              </div>
              <div className="sm:pt-5">
                <button
                  type="button"
                  data-start="true"
                  data-testid="enter-empire-3d-btn"
                  onClick={() => setPhase('playing')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C6FF00] hover:bg-[#d8ff4d] text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Enter 3D Empire ({empire.areaSqFt} sq. ft.)
                </button>
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400 font-mono">
              <span>WASD/Arrows: Move · Drag: Orbit · V: 1P/3P · Space: Jump</span>
              <span>F: Fire Blaster · Q/R-Click: Sniper Scope · M: Full Map</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // LIVE 3D OPEN-WORLD EMPIRE VIEWPORT
  // ==========================================
  return (
    <div className="relative rounded-3xl bg-[#050811] border border-slate-800 overflow-hidden text-slate-100 select-none">
      {/* Compact Top HUD (zero backdrop-filter over WebGL!) */}
      <div className="px-3.5 py-2.5 bg-[#091022] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audioRef.current?.stopStageMusic();
              setPhase('title');
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer"
            aria-label="Exit to Avatar Setup"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold tabular-nums">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 inline-flex items-center gap-1">
              <Castle className="w-3.5 h-3.5" />
              {empire.areaSqFt.toLocaleString('en-IN')} sq. ft.
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-[#C6FF00]/40 text-[#C6FF00] inline-flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              {empire.coins} Coins
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-sky-500/35 text-sky-300 hidden sm:inline-flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Guards {empire.guardRobots} · Allies {empire.alliedEmpires.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCameraMode((m) => (m === '3p' ? '1p' : '3p'))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            {cameraMode.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => setScopeZoom((z) => !z)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
              scopeZoom ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Scope
          </button>
          <button
            type="button"
            onClick={fireCyberBlaster}
            className="px-2.5 py-1.5 rounded-lg bg-[#C6FF00] text-slate-950 text-xs font-black cursor-pointer"
          >
            Fire Blaster
          </button>
          <button
            type="button"
            onClick={() => setFullMapOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
            Map
          </button>
          <button
            type="button"
            onClick={() => setSfxEnabled((s) => !s)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 cursor-pointer"
            aria-label="Toggle Sound"
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D WebGL Viewport Container */}
      <div className="relative w-full h-[540px] sm:h-[600px] bg-sky-300">
        <div ref={mountRef} className="w-full h-full" />

        {/* Sniper Scope Reticle Overlay */}
        {scopeZoom && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-[36px] border-black/80">
            <div className="w-48 h-48 rounded-full border-2 border-rose-500/90 relative flex items-center justify-center">
              <div className="w-full h-0.5 bg-rose-500/70 absolute" />
              <div className="h-full w-0.5 bg-rose-500/70 absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#C6FF00]" />
            </div>
          </div>
        )}

        {/* Live Corner Minimap Radar (solid dark frame, zero backdrop-blur) */}
        <div className="absolute top-3 right-3 rounded-xl border-2 border-slate-700 bg-[#07111f] p-1 shadow-xl">
          <canvas ref={minimapRef} width={116} height={116} className="block rounded-lg" />
          <div className="text-[9px] font-mono text-center text-slate-400 mt-0.5">
            RADAR · {empire.playerNameTag}
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-950 border border-[#C6FF00]/60 text-xs font-bold text-[#C6FF00] shadow-xl">
            {toast}
          </div>
        )}

        {/* Mobile Touch Controls (Left Directional Pad + Right Jump/Fire) */}
        <div className="absolute bottom-3 left-3 flex md:hidden flex-col items-center gap-1">
          <button
            type="button"
            onPointerDown={() => (keysRef.current['w'] = true)}
            onPointerUp={() => (keysRef.current['w'] = false)}
            onPointerLeave={() => (keysRef.current['w'] = false)}
            className="w-11 h-11 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-black"
          >
            W
          </button>
          <div className="flex gap-1">
            {(['a', 's', 'd'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onPointerDown={() => (keysRef.current[k] = true)}
                onPointerUp={() => (keysRef.current[k] = false)}
                onPointerLeave={() => (keysRef.current[k] = false)}
                className="w-11 h-11 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-black uppercase"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Universal Quiz-Gated Command Dock */}
      <div className="p-3 bg-[#091022] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid="empire-earn-coins-btn"
            onClick={() => openQuizGate('earn-coins', 'Earn Empire Coins')}
            className="px-3 py-2 rounded-xl bg-[#C6FF00] text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            Quiz: Earn Coins
          </button>
          <button
            type="button"
            onClick={() => openQuizGate('build-house', 'Build Gaon House (+25 sq. ft.)')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            Build House ({getActionCoinCost('build-house', empire.avatarId)}c)
          </button>
          <button
            type="button"
            onClick={() => openQuizGate('build-tower', 'Build Sniper Watchtower (+35 sq. ft.)')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Hammer className="w-3.5 h-3.5 text-sky-400" />
            Watchtower ({getActionCoinCost('build-tower', empire.avatarId)}c)
          </button>
          <button
            type="button"
            onClick={() => {
              if (empire.hasGaadi) {
                setDrivingMode((d) => (d === 'gaadi' ? 'foot' : 'gaadi'));
              } else {
                openQuizGate('summon-gaadi', 'Summon Modern Gaadi');
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
              drivingMode === 'gaadi' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            {empire.hasGaadi ? (drivingMode === 'gaadi' ? 'Exit Gaadi' : 'Drive Gaadi') : 'Summon Gaadi'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (empire.hasGhodaGaadi) {
                setDrivingMode((d) => (d === 'ghoda' ? 'foot' : 'ghoda'));
              } else {
                openQuizGate('summon-ghoda-gaadi', 'Summon Royal Ghoda Gaadi');
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
              drivingMode === 'ghoda' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {empire.hasGhodaGaadi
              ? drivingMode === 'ghoda'
                ? 'Exit Carriage'
                : 'Ride Ghoda Gaadi'
              : 'Ghoda Gaadi'}
          </button>
          <button
            type="button"
            onClick={() => openQuizGate('summon-senapati', 'Summon Senapati AI General')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-amber-300" />
            {empire.hasSenapati ? 'Senapati Active' : 'Summon Senapati'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid="open-study-tv-btn"
            onClick={() => setStudyTvOpen(true)}
            className="px-3 py-2 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5" />
            Live Study TV
          </button>
          <button
            type="button"
            onClick={() => setMusicMenuOpen((o) => !o)}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
              empire.stageMusicPlaying
                ? 'bg-pink-600 text-white'
                : 'bg-slate-800 text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            Gaana Bajwana
          </button>
          <button
            type="button"
            data-testid="open-palda-war-btn"
            onClick={() => setWarModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            Palda War &amp; Rivals
          </button>
        </div>
      </div>

      {/* Royal Assembly Stage Music Drawer */}
      {musicMenuOpen && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-pink-400">
            Royal Assembly Stage — Villagers &amp; Guards dance when music plays:
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'royal-anthem', label: 'Royal Victory Anthem' },
                { id: 'study-lofi', label: 'Study Lo-Fi Chill' },
                { id: 'cyber-party', label: 'Cyber Party Beat' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToggleStageMusic(t.id)}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                  empire.stageMusicPlaying && empire.musicTrack === t.id
                    ? 'bg-pink-500 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {empire.stageMusicPlaying && empire.musicTrack === t.id ? '■ Stop ' : '▶ '}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Universal Quiz-Gated Action Modal */}
      {quizModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-[#C6FF00]/50 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[11px] font-mono text-[#C6FF00]">
                  {quizModal.question.subjectName} · {quizModal.question.difficultyTier}
                </div>
                <h3 className="font-display font-bold text-lg text-white">{quizModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuizModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-100">{quizModal.question.questionText}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {quizModal.question.optionTexts.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuizAnswer(idx)}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-[#C6FF00]/20 border border-slate-700 hover:border-[#C6FF00] text-left text-xs font-semibold cursor-pointer"
                >
                  {['A', 'B', 'C', 'D'][idx]}. {opt}
                </button>
              ))}
            </div>
            {quizModal.feedback && (
              <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/30 p-2.5 rounded-lg">
                {quizModal.feedback}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Live Study TV (inside Village Houses) */}
      {studyTvOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border-4 border-sky-500/50 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-sky-400" />
                <h3 className="font-display font-bold text-lg text-white">
                  prepskm.in Live Study TV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStudyTvOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#071124] border border-sky-500/30 space-y-2.5">
              <span className="text-xs font-mono text-sky-400 uppercase">
                {LIVE_STUDY_TV_CARDS[studyTvSlide].subject} Broadcast
              </span>
              <h4 className="font-display text-xl font-bold text-white">
                {LIVE_STUDY_TV_CARDS[studyTvSlide].title}
              </h4>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-sm text-[#C6FF00]">
                {LIVE_STUDY_TV_CARDS[studyTvSlide].formula}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {LIVE_STUDY_TV_CARDS[studyTvSlide].tip}
              </p>
            </div>

            {materials.length > 0 && (
              <div className="text-xs text-slate-400">
                Live Portal Feed ({materials.length} notes available):{' '}
                <span className="text-sky-300 font-semibold">{materials[0]?.title}</span>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() =>
                  setStudyTvSlide((s) => (s + 1) % LIVE_STUDY_TV_CARDS.length)
                }
                className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Next Concept Channel
              </button>
              <button
                type="button"
                onClick={() => setStudyTvOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs cursor-pointer"
              >
                Return to Village
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Map Territory Overview Modal */}
      {fullMapOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-white">
                Empire World Overview — {empire.areaSqFt.toLocaleString('en-IN')} sq. ft.
              </h3>
              <button
                type="button"
                onClick={() => setFullMapOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950">Rajmahal Palace: North</div>
              <div className="p-3 rounded-xl bg-slate-950">Gaon Houses: {empire.housesBuilt}/6</div>
              <div className="p-3 rounded-xl bg-slate-950">Watchtowers: {empire.watchtowersBuilt}/4</div>
              <div className="p-3 rounded-xl bg-slate-950">Defense Walls: {empire.wallsBuilt}/4</div>
              <div className="p-3 rounded-xl bg-slate-950">Raiders Defeated: {empire.raidersDefeated}</div>
              <div className="p-3 rounded-xl bg-slate-950">Allied Empires: {empire.alliedEmpires.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tiered Fair Matchmaking & Palda (Tug-of-War) Warfare Modal */}
      {warModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-rose-500/45 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[11px] font-mono text-rose-400 uppercase">
                  Tiered Fair Matchmaking · {matchmakingBracket.tierLabel}
                </div>
                <h3 className="font-display font-bold text-xl text-white">
                  Palda (Tug-of-War) Kingdom Warfare
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWarModalOpen(false);
                  setPaldaBattle(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!paldaBattle ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Your Territory: <strong className="text-white">{empire.areaSqFt} sq. ft.</strong>. Challenge a fairly matched rival in a timed Palda Quiz Debate. Win to <strong className="text-rose-400">Annex (Hadap Lo)</strong> or <strong className="text-emerald-400">Spare &amp; Ally (Dosti)</strong> — defeat resets your plot to 10 sq. ft.!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {matchedRivals.map((rival) => (
                    <div
                      key={rival.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <Flag className="w-4 h-4" style={{ color: rival.bannerColor }} />
                          <span className="text-[11px] font-mono text-amber-300">
                            {rival.areaSqFt} sq. ft.
                          </span>
                        </div>
                        <div className="font-display font-bold text-sm text-white mt-2">
                          {rival.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rival.commanderName} · {rival.difficulty}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid={`challenge-rival-${rival.id}`}
                        onClick={() => handleStartPalda(rival)}
                        className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                      >
                        {rival.allied ? 'Spar Ally' : 'Start Palda War'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : paldaBattle.status === 'active' && paldaQuestion ? (
              <div className="space-y-4">
                {/* Palda Tug-of-War Bar */}
                <div>
                  <div className="flex justify-between text-xs font-mono font-bold mb-1.5">
                    <span className="text-rose-400">{paldaBattle.rival.name}</span>
                    <span className="text-amber-300">Timer: {paldaTimerSec}s</span>
                    <span className="text-[#C6FF00]">{empire.playerNameTag}</span>
                  </div>
                  <div className="h-4 rounded-full bg-rose-950 border border-slate-700 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-[#C6FF00] transition-all duration-300"
                      style={{ width: `${(paldaBattle.balance + 100) / 2}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <p className="text-sm font-semibold text-white">{paldaQuestion.questionText}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {paldaQuestion.optionTexts.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePaldaChoice(idx)}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-[#C6FF00]/20 border border-slate-700 hover:border-[#C6FF00] text-left text-xs font-semibold cursor-pointer"
                    >
                      {['A', 'B', 'C', 'D'][idx]}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : paldaBattle.status === 'player-won' ? (
              <div className="text-center space-y-4 py-3">
                <Crown className="w-12 h-12 text-[#C6FF00] mx-auto" />
                <h4 className="font-display text-2xl font-bold text-white">
                  Palda Victory over {paldaBattle.rival.name}!
                </h4>
                <p className="text-xs text-slate-300">
                  Choose the fate of {paldaBattle.rival.name} ({paldaBattle.rival.areaSqFt} sq. ft.):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handlePaldaPostVictory('annex')}
                    className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    Annex (Hadap Lo)
                    <span className="text-[11px] font-normal">
                      +{paldaBattle.rival.areaSqFt} sq. ft. &amp; +{paldaBattle.rival.treasuryCoins} Coins
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaldaPostVictory('ally')}
                    className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <Handshake className="w-5 h-5" />
                    Spare &amp; Ally (Chhod Do / Dosti)
                    <span className="text-[11px] font-normal">
                      Render Connected Allied Empire at borders
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-4">
                <h4 className="font-display text-2xl font-bold text-rose-400">
                  Palda Defeat — Reset to 10 sq. ft.
                </h4>
                <p className="text-xs text-slate-300">
                  Your avatar and concepts mastered remain intact. Rebuild your empire and challenge again!
                </p>
                <button
                  type="button"
                  onClick={() => setPaldaBattle(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm cursor-pointer"
                >
                  Back to Matchmaking
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
