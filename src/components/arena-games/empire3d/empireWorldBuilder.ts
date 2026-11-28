import * as THREE from 'three';
import type { RobotAvatarSpec } from '../../../utils/empireBuilderLogic';

export interface TargetDummyEntity {
  id: string;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  baseX: number;
  baseZ: number;
  phase: number;
}

export interface RaiderEntity {
  id: string;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  alive: boolean;
}

export interface GuardEntity {
  mesh: THREE.Group;
  angle: number;
  radius: number;
  cooldown: number;
}

export interface VillagerEntity {
  mesh: THREE.Group;
  homeX: number;
  homeZ: number;
  phase: number;
}

export interface LaserBoltEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  ttl: number;
  fromPlayer: boolean;
}

export interface WorldRefs {
  playerGroup: THREE.Group;
  nameSprite: THREE.Sprite;
  gaadiGroup: THREE.Group;
  ghodaGaadiGroup: THREE.Group;
  senapatiGroup: THREE.Group;
  dynamicHousesGroup: THREE.Group;
  dynamicTowersGroup: THREE.Group;
  dynamicWallsGroup: THREE.Group;
  alliedEmpiresGroup: THREE.Group;
  spotlights: THREE.PointLight[];
  dummies: TargetDummyEntity[];
  raiders: RaiderEntity[];
  guards: GuardEntity[];
  villagers: VillagerEntity[];
  fountainWater: THREE.Mesh;
}

/**
 * Generates a crisp floating canvas-textured 3D name tag sprite (defaults to "PrepsKM").
 */
export function createNameTagSprite(label: string, accentHex = '#C6FF00'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(6, 11, 24, 0.85)';
  ctx.beginPath();
  ctx.roundRect(24, 24, 464, 80, 20);
  ctx.fill();
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.slice(0, 18) || 'PrepsKM', 256, 65);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

/**
 * Composite 9-part articulated PrepSKM Robot Avatar (no single-primitive placeholders).
 */
export function buildRobotAvatar(spec: RobotAvatarSpec, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: spec.primaryColor,
    roughness: 0.38,
    metalness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accentColor,
    roughness: 0.3,
    metalness: 0.6,
    emissive: spec.accentColor,
    emissiveIntensity: 0.25,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: spec.visorColor,
    emissive: spec.visorColor,
    emissiveIntensity: 0.7,
    roughness: 0.15,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.6,
    metalness: 0.5,
  });

  // Legs
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.34), darkMat);
  leftLeg.position.set(-0.24, 0.42, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.24;

  // Torso + chest core
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.58), bodyMat);
  torso.position.set(0, 1.35, 0);
  const chestCore = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.62), accentMat);
  chestCore.position.set(0, 1.4, 0);

  // Arms + Cyber Blaster on right arm
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), bodyMat);
  leftArm.position.set(-0.66, 1.32, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), bodyMat);
  rightArm.position.set(0.66, 1.32, 0.15);
  rightArm.rotation.x = -Math.PI * 0.32;

  const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.72), darkMat);
  blaster.position.set(0.66, 1.32, 0.68);
  const blasterTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.16), accentMat);
  blasterTip.position.set(0.66, 1.32, 1.06);

  // Head + Glowing Visor + Antenna
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.66, 0.66), bodyMat);
  head.position.set(0, 2.25, 0);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.68), visorMat);
  visor.position.set(0, 2.28, 0.03);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), accentMat);
  antenna.position.set(0, 2.75, 0);

  group.add(
    leftLeg,
    rightLeg,
    torso,
    chestCore,
    leftArm,
    rightArm,
    blaster,
    blasterTip,
    head,
    visor,
    antenna
  );
  group.scale.setScalar(scale);
  return group;
}

/**
 * Enterable Multi-Story Grand Royal Palace (Rajmahal) with climbable seedhi staircases,
 * throne room interior, balconies, rooftop watchpoint, and golden domes.
 */
function buildRoyalPalace(): THREE.Group {
  const palace = new THREE.Group();
  const sandstone = new THREE.MeshStandardMaterial({ color: '#e2c08d', roughness: 0.78 });
  const royalTrim = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.4, metalness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    roughness: 0.25,
    metalness: 0.75,
    emissive: '#b45309',
    emissiveIntensity: 0.2,
  });
  const carpetMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.85 });

  // Plinth & Throne Room Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(24, 0.8, 20), sandstone);
  floor.position.set(0, 0.4, 0);
  palace.add(floor);

  // Red Royal Carpet & Golden Throne inside Enterable Hall
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 16), carpetMat);
  carpet.position.set(0, 0.85, 0);
  const throneSeat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2), goldMat);
  throneSeat.position.set(0, 1.4, -6.5);
  const throneBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 0.5), goldMat);
  throneBack.position.set(0, 2.6, -7.3);
  palace.add(carpet, throneSeat, throneBack);

  // Enterable Walls (open front Grand Entry Gate)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, 8.5, 1.2), sandstone);
  backWall.position.set(0, 4.65, -9.4);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.5, 20), sandstone);
  leftWall.position.set(-11.4, 4.65, 0);
  const rightWall = leftWall.clone();
  rightWall.position.x = 11.4;

  // Front Left & Right Gate Towers (leaving wide 8-unit open archway)
  const frontL = new THREE.Mesh(new THREE.BoxGeometry(8, 8.5, 1.4), sandstone);
  frontL.position.set(-8, 4.65, 9.3);
  const frontR = frontL.clone();
  frontR.position.x = 8;
  const gateLint = new THREE.Mesh(new THREE.BoxGeometry(8, 2.2, 1.6), royalTrim);
  gateLint.position.set(0, 7.8, 9.3);
  palace.add(backWall, leftWall, rightWall, frontL, frontR, gateLint);

  // Upper Terrace Roof + Balconies
  const roof = new THREE.Mesh(new THREE.BoxGeometry(25.2, 1, 21.2), sandstone);
  roof.position.set(0, 9.2, 0);
  palace.add(roof);

  // Climbable Voxel Staircase (Seedhi) on right exterior to rooftop watchpoint
  for (let i = 0; i < 10; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 1.2), royalTrim);
    step.position.set(13.4, 0.45 + i * 0.9, 6 - i * 1.1);
    palace.add(step);
  }

  // Central Golden Dome + 4 Corner Minarets
  const mainDome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), goldMat);
  mainDome.position.set(0, 9.7, 0);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.8, 8), goldMat);
  spire.position.set(0, 14.5, 0);
  palace.add(mainDome, spire);

  for (const [cx, cz] of [
    [-11.2, -9.2],
    [11.2, -9.2],
    [-11.2, 9.2],
    [11.2, 9.2],
  ]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 12.5, 10), sandstone);
    tower.position.set(cx, 6.25, cz);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), goldMat);
    cap.position.set(cx, 12.6, cz);
    palace.add(tower, cap);
  }

  // Prominent prepskm.in Royal Signboard
  const signSprite = createNameTagSprite('prepskm.in RAJMAHAL', '#fbbf24');
  signSprite.scale.set(9.5, 2.1, 1);
  signSprite.position.set(0, 11.4, 10.6);
  palace.add(signSprite);

  return palace;
}

/**
 * Enterable Furnished Village House (Gaon) with sofa, study desk, bed, glowing lantern & Live Study TV.
 */
export function buildFurnishedHouse(index: number): THREE.Group {
  const house = new THREE.Group();
  const wallColor = index % 2 === 0 ? '#f1f5f9' : '#fef3c7';
  const roofColor = index % 2 === 0 ? '#b45309' : '#0369a1';
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 });
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: '#0ea5e9',
    emissive: '#38bdf8',
    emissiveIntensity: 0.85,
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 8), woodMat);
  floor.position.set(0, 0.2, 0);
  const backW = new THREE.Mesh(new THREE.BoxGeometry(9, 4.4, 0.45), wallMat);
  backW.position.set(0, 2.4, -3.75);
  const leftW = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.4, 8), wallMat);
  leftW.position.set(-4.25, 2.4, 0);
  const rightW = leftW.clone();
  rightW.position.x = 4.25;
  const frontL = new THREE.Mesh(new THREE.BoxGeometry(3, 4.4, 0.45), wallMat);
  frontL.position.set(-3, 2.4, 3.75);
  const frontR = frontL.clone();
  frontR.position.x = 3;

  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.8, 3.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, 6.2, 0);

  // Furnished Interior: Sofa, Study Desk, Bed & Live Study TV
  const sofa = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.8 })
  );
  sofa.position.set(-2.4, 0.85, -2.5);

  const studyDesk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.0), woodMat);
  studyDesk.position.set(2.2, 0.85, -2.5);

  const studyTv = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 0.2), tvScreenMat);
  studyTv.position.set(0, 2.4, -3.4);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.75, 0.8),
    new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.55, roughness: 0.35 })
  );
  chest.position.set(2.5, 0.78, 1.4);

  house.add(floor, backW, leftW, rightW, frontL, frontR, roof, sofa, studyDesk, studyTv, chest);
  return house;
}

/**
 * Climbable Sniper Watchtower overlooking the open-world perimeter.
 */
export function buildWatchtower(): THREE.Group {
  const tower = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 });

  for (const [px, pz] of [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 9, 0.45), woodMat);
    leg.position.set(px, 4.5, pz);
    tower.add(leg);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 4.2), stoneMat);
  deck.position.set(0, 9, 0);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 0.3), stoneMat);
  parapet.position.set(0, 9.75, 2.05);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.3, 2, 4), woodMat);
  canopy.rotation.y = Math.PI / 4;
  canopy.position.set(0, 12.2, 0);
  tower.add(deck, parapet, canopy);
  return tower;
}

/**
 * Drivable Modern Voxel Car (Gaadi) — composite 10-part vehicle.
 */
function buildGaadiCar(): THREE.Group {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.25, metalness: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.1, metalness: 0.2 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85 });
  const lightMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fde047', emissiveIntensity: 0.9 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 4.6), bodyMat);
  chassis.position.set(0, 0.85, 0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 2.3), glassMat);
  cabin.position.set(0, 1.65, -0.2);

  for (const [wx, wz] of [
    [-1.2, 1.45],
    [1.2, 1.45],
    [-1.2, -1.45],
    [1.2, -1.45],
  ]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.38, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.48, wz);
    car.add(wheel);
  }
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.16), lightMat);
  hlL.position.set(-0.75, 0.9, 2.32);
  const hlR = hlL.clone();
  hlR.position.x = 0.75;

  car.add(chassis, cabin, hlL, hlR);
  return car;
}

/**
 * Drivable Traditional Horse-Drawn Carriage (Ghoda Gaadi).
 */
function buildGhodaGaadi(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.4 });
  const horseMat = new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 0.75 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.85 });

  // Royal Carriage Cabin
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 3.0), woodMat);
  carriage.position.set(0, 1.6, -1.2);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 3.2), goldMat);
  canopy.position.set(0, 2.65, -1.2);

  for (const [wx, wz] of [
    [-1.35, -0.2],
    [1.35, -0.2],
    [-1.35, -2.2],
    [1.35, -2.2],
  ]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.22, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.65, wz);
    group.add(wheel);
  }

  // Voxel Horse Pulling in Front
  const horseBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 2.0), horseMat);
  horseBody.position.set(0, 1.35, 2.1);
  const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.0, 0.55), horseMat);
  horseNeck.position.set(0, 2.05, 2.9);
  const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.85), horseMat);
  horseHead.position.set(0, 2.45, 3.35);

  group.add(carriage, canopy, horseBody, horseNeck, horseHead);
  return group;
}

/**
 * Royal Assembly Stage (Gaana Bajwana) with loudspeakers & neon spotlights.
 */
function buildAssemblyStage(): { stage: THREE.Group; spotlights: THREE.PointLight[] } {
  const stage = new THREE.Group();
  const deckMat = new THREE.MeshStandardMaterial({ color: '#1e1b4b', roughness: 0.5 });
  const speakerMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 });
  const neonMat = new THREE.MeshStandardMaterial({
    color: '#C6FF00',
    emissive: '#C6FF00',
    emissiveIntensity: 0.85,
  });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 8), deckMat);
  deck.position.set(0, 0.6, 0);
  const backdrop = new THREE.Mesh(new THREE.BoxGeometry(12, 5.5, 0.6), deckMat);
  backdrop.position.set(0, 3.6, -3.7);
  const neonBar = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.35, 0.4), neonMat);
  neonBar.position.set(0, 5.8, -3.3);

  const spkL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.8, 1.8), speakerMat);
  spkL.position.set(-5.4, 3.1, -1.8);
  const spkR = spkL.clone();
  spkR.position.x = 5.4;

  const sign = createNameTagSprite('GAANA BAJWANA STAGE', '#C6FF00');
  sign.scale.set(6.5, 1.5, 1);
  sign.position.set(0, 7.2, -3.2);

  const lightA = new THREE.PointLight('#22d3ee', 0, 22);
  lightA.position.set(-4, 5.5, 0);
  const lightB = new THREE.PointLight('#f472b6', 0, 22);
  lightB.position.set(4, 5.5, 0);

  stage.add(deck, backdrop, neonBar, spkL, spkR, sign, lightA, lightB);
  return { stage, spotlights: [lightA, lightB] };
}

/**
 * Builds the entire 200x200 Open-World Voxel Empire Scene.
 */
export function buildEmpireWorld(
  scene: THREE.Scene,
  avatarSpec: RobotAvatarSpec,
  playerNameTag: string
): WorldRefs {
  // 1. Massive 220x220 Lush Terrain + Royal Paved Roads + River Crossing
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: '#3b7a3d', roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: '#c8b28e', roughness: 0.9 });
  const roadNS = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 190), roadMat);
  roadNS.position.set(0, 0.04, 0);
  const roadEW = new THREE.Mesh(new THREE.BoxGeometry(190, 0.08, 8), roadMat);
  roadEW.position.set(0, 0.04, 0);
  scene.add(roadNS, roadEW);

  // River & Arched Bridge
  const river = new THREE.Mesh(
    new THREE.BoxGeometry(220, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.2, metalness: 0.3 })
  );
  river.position.set(0, 0.05, 58);
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.6, 15),
    new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 })
  );
  bridge.position.set(0, 0.4, 58);
  scene.add(river, bridge);

  // 2. Central Fountain Plaza
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10.5, 0.25, 24),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.85 })
  );
  plaza.position.set(0, 0.12, 0);
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 4.2, 1.1, 16),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.7 })
  );
  basin.position.set(0, 0.65, 0);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(3.3, 3.3, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.35 })
  );
  fountainWater.position.set(0, 1.15, 0);
  scene.add(plaza, basin, fountainWater);

  // 3. InstancedMesh Voxel Forest (120 trees in 2 draw calls for silky FPS!)
  const treeCount = 120;
  const trunkGeo = new THREE.BoxGeometry(1.1, 4.2, 1.1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
  const canopyGeo = new THREE.BoxGeometry(3.8, 3.6, 3.8);
  const canopyMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.85 });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  const dummyObj = new THREE.Object3D();

  let placed = 0;
  let attempt = 0;
  while (placed < treeCount && attempt < 600) {
    attempt++;
    const angle = (attempt * 137.5 * Math.PI) / 180;
    const radius = 44 + ((attempt * 19) % 58);
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    if (Math.abs(tx) < 10 || Math.abs(tz) < 10 || Math.abs(tz - 58) < 10) continue;

    dummyObj.position.set(tx, 2.1, tz);
    dummyObj.scale.setScalar(0.85 + (placed % 4) * 0.14);
    dummyObj.updateMatrix();
    trunkInst.setMatrixAt(placed, dummyObj.matrix);

    dummyObj.position.set(tx, 5.2, tz);
    dummyObj.updateMatrix();
    canopyInst.setMatrixAt(placed, dummyObj.matrix);
    placed++;
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  scene.add(trunkInst, canopyInst);

  // 4. Grand Enterable Royal Palace (Rajmahal)
  const palace = buildRoyalPalace();
  palace.position.set(0, 0, -34);
  scene.add(palace);

  // 5. Royal Assembly Stage (Gaana Bajwana)
  const { stage, spotlights } = buildAssemblyStage();
  stage.position.set(24, 0, -16);
  stage.rotation.y = -Math.PI / 5;
  scene.add(stage);

  // 6. Dynamic Empire Architecture Containers
  const dynamicHousesGroup = new THREE.Group();
  const dynamicTowersGroup = new THREE.Group();
  const dynamicWallsGroup = new THREE.Group();
  const alliedEmpiresGroup = new THREE.Group();
  scene.add(dynamicHousesGroup, dynamicTowersGroup, dynamicWallsGroup, alliedEmpiresGroup);

  // 7. Training Grounds Floating Target Dummies
  const dummies: TargetDummyEntity[] = [];
  const targetMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#b91c1c',
    emissiveIntensity: 0.35,
  });
  const ringMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  for (let i = 0; i < 4; i++) {
    const grp = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.35, 16), targetMat);
    outer.rotation.x = Math.PI / 2;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), ringMat);
    inner.rotation.x = Math.PI / 2;
    grp.add(outer, inner);
    const bx = -24 + i * 4.5;
    const bz = 24;
    grp.position.set(bx, 2.8, bz);
    scene.add(grp);
    dummies.push({ id: `dummy-${i}`, mesh: grp, hp: 50, maxHp: 50, baseX: bx, baseZ: bz, phase: i * 1.4 });
  }

  // 8. Roaming Village NPCs (dance when stage music plays!)
  const villagers: VillagerEntity[] = [];
  const villagerPalette = ['#f97316', '#10b981', '#eab308', '#ec4899', '#6366f1'];
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Group();
    const robe = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.2, 0.5),
      new THREE.MeshStandardMaterial({ color: villagerPalette[i % villagerPalette.length], roughness: 0.7 })
    );
    robe.position.y = 0.8;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.6 })
    );
    head.position.y = 1.75;
    v.add(robe, head);
    const hx = -14 + i * 5.6;
    const hz = 12 + (i % 2) * 4;
    v.position.set(hx, 0, hz);
    scene.add(v);
    villagers.push({ mesh: v, homeX: hx, homeZ: hz, phase: i * 1.1 });
  }

  // 9. Armed Defense Robot Guards patrolling walls
  const guards: GuardEntity[] = [];
  const guardSpec: RobotAvatarSpec = {
    ...avatarSpec,
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    visorColor: '#C6FF00',
  };
  for (let i = 0; i < 3; i++) {
    const gMesh = buildRobotAvatar(guardSpec, 0.92);
    const angle = (i / 3) * Math.PI * 2;
    gMesh.position.set(Math.cos(angle) * 28, 0, Math.sin(angle) * 28);
    scene.add(gMesh);
    guards.push({ mesh: gMesh, angle, radius: 28, cooldown: 0 });
  }

  // 10. Invading Red Raiders
  const raiders: RaiderEntity[] = [];
  const raiderSpec: RobotAvatarSpec = {
    ...avatarSpec,
    primaryColor: '#dc2626',
    accentColor: '#fb7185',
    visorColor: '#fef08a',
  };
  for (let i = 0; i < 4; i++) {
    const rMesh = buildRobotAvatar(raiderSpec, 0.95);
    const a = (i / 4) * Math.PI * 2 + 0.5;
    rMesh.position.set(Math.cos(a) * 48, 0, Math.sin(a) * 48);
    scene.add(rMesh);
    raiders.push({ id: `raider-${i}`, mesh: rMesh, hp: 60, maxHp: 60, speed: 3.4, alive: true });
  }

  // 11. Drivable Vehicles (Gaadi & Ghoda Gaadi) + Senapati General
  const gaadiGroup = buildGaadiCar();
  gaadiGroup.position.set(9, 0, 12);
  gaadiGroup.visible = false;
  scene.add(gaadiGroup);

  const ghodaGaadiGroup = buildGhodaGaadi();
  ghodaGaadiGroup.position.set(-9, 0, 12);
  ghodaGaadiGroup.visible = false;
  scene.add(ghodaGaadiGroup);

  const senapatiGroup = buildRobotAvatar(
    { ...avatarSpec, primaryColor: '#f59e0b', accentColor: '#C6FF00', visorColor: '#ffffff' },
    1.18
  );
  senapatiGroup.position.set(-4, 0, 8);
  senapatiGroup.visible = false;
  const senSprite = createNameTagSprite('SENAPATI AI', '#f59e0b');
  senSprite.position.set(0, 3.3, 0);
  senapatiGroup.add(senSprite);
  scene.add(senapatiGroup);

  // 12. Player Robot Avatar + Floating Name Tag
  const playerGroup = buildRobotAvatar(avatarSpec, 1);
  playerGroup.position.set(0, 0, 14);
  const nameSprite = createNameTagSprite(playerNameTag, avatarSpec.accentColor);
  nameSprite.position.set(0, 3.3, 0);
  playerGroup.add(nameSprite);
  scene.add(playerGroup);

  return {
    playerGroup,
    nameSprite,
    gaadiGroup,
    ghodaGaadiGroup,
    senapatiGroup,
    dynamicHousesGroup,
    dynamicTowersGroup,
    dynamicWallsGroup,
    alliedEmpiresGroup,
    spotlights,
    dummies,
    raiders,
    guards,
    villagers,
    fountainWater,
  };
}

/**
 * Re-syncs built Houses, Watchtowers, Walls, and Connected Allied Empires into the 3D world.
 */
export function syncEmpireStructuresInWorld(
  refs: WorldRefs,
  counts: {
    housesBuilt: number;
    watchtowersBuilt: number;
    wallsBuilt: number;
    alliedEmpires: Array<{ id: string; name: string; areaSqFt: number; bannerColor: string }>;
  }
) {
  refs.dynamicHousesGroup.clear();
  const houseSpots = [
    [-22, -10],
    [-22, 6],
    [22, 10],
    [-34, -2],
    [34, -2],
    [22, 26],
  ];
  for (let i = 0; i < Math.min(counts.housesBuilt, houseSpots.length); i++) {
    const h = buildFurnishedHouse(i);
    h.position.set(houseSpots[i][0], 0, houseSpots[i][1]);
    h.rotation.y = houseSpots[i][0] < 0 ? Math.PI / 2 : -Math.PI / 2;
    refs.dynamicHousesGroup.add(h);
  }

  refs.dynamicTowersGroup.clear();
  const towerSpots = [
    [-28, -28],
    [28, -28],
    [-28, 34],
    [28, 34],
  ];
  for (let i = 0; i < Math.min(counts.watchtowersBuilt, towerSpots.length); i++) {
    const t = buildWatchtower();
    t.position.set(towerSpots[i][0], 0, towerSpots[i][1]);
    refs.dynamicTowersGroup.add(t);
  }

  refs.dynamicWallsGroup.clear();
  const wallMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.85 });
  const wallSpots: Array<[number, number, number]> = [
    [-28, -42, 0],
    [28, -42, 0],
    [-42, 0, Math.PI / 2],
    [42, 0, Math.PI / 2],
  ];
  for (let i = 0; i < Math.min(counts.wallsBuilt, wallSpots.length); i++) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(24, 4.5, 1.8), wallMat);
    wall.position.set(wallSpots[i][0], 2.25, wallSpots[i][1]);
    wall.rotation.y = wallSpots[i][2];
    refs.dynamicWallsGroup.add(wall);
  }

  // Render Connected Allied Empires dynamically adjacent to borders
  refs.alliedEmpiresGroup.clear();
  const allyAnchors = [
    [-58, -44],
    [58, -44],
    [58, 36],
  ];
  counts.alliedEmpires.slice(0, allyAnchors.length).forEach((ally, idx) => {
    const [ax, az] = allyAnchors[idx];
    const allyBase = new THREE.Group();
    const keep = new THREE.Mesh(
      new THREE.BoxGeometry(12, 8, 12),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.8 })
    );
    keep.position.y = 4;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(8, 4.5, 4),
      new THREE.MeshStandardMaterial({ color: ally.bannerColor, roughness: 0.5 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 10.2;
    const tag = createNameTagSprite(`ALLY: ${ally.name}`, ally.bannerColor);
    tag.scale.set(7.5, 1.7, 1);
    tag.position.set(0, 14, 0);
    allyBase.add(keep, roof, tag);
    allyBase.position.set(ax, 0, az);
    refs.alliedEmpiresGroup.add(allyBase);
  });
}
