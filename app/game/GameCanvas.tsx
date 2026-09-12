"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

const MODEL_URLS = [
  "/models/island_rock.obj",
  "/models/island_sand.obj",
  "/models/island_water.obj",
  "/models/island_mountain.obj",
  "/models/island_green.obj",
  "/models/island_lightgreen.obj",
] as const;

const PALMS = [
  { position: [-2.4, -0.35, 0.9] as const, height: 1.7, rotation: 0.35 },
  { position: [-3.1, -0.25, 0.35] as const, height: 1, rotation: 1.8 },
  { position: [-0.9, -0.3, 0] as const, height: 0.85, rotation: 2.2 },
  { position: [0.25, -0.3, 3] as const, height: 0.85, rotation: -0.55 },
  { position: [2.25, 0, 0.2] as const, height: 1.45, rotation: 1.15 },
  { position: [2.95, -0.3, -1.05] as const, height: 0.95, rotation: 2.65 },
] as const;

const RIM = 3.12;
const START_Y = 1.35;
const GRAVITY = 13.5;
const JUMP = 5.1;
const MAX_HEIGHT = 3.7;
const SEED_COUNT = 4;
const COLLECT_RADIUS = 0.5;
const BIRD_HEIGHT = 0.52;
const SPECIAL_SEED_CHANCE = 0.04;

type Status = "ready" | "playing" | "dead";

type GameCanvasProps = {
  status: Status;
  flapId: number;
  sessionId: number;
  onScore: (score: number) => void;
  onDead: () => void;
  onSpecial: () => void;
};

type SeedKind = "gold" | "special" | "hazard";

type Seed = {
  mesh: THREE.Mesh;
  angle: number;
  height: number;
  kind: SeedKind;
};

type SeedLook = {
  gold: THREE.Material;
  green: THREE.Material;
  red: THREE.Material;
  sphere: THREE.BufferGeometry;
  hazard: THREE.BufferGeometry;
};

function enableShadows(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.geometry?.computeVertexNormals();
  });
}

function stripByName(object: THREE.Object3D, needles: string[]) {
  const remove: THREE.Object3D[] = [];
  object.traverse((child) => {
    const extra = child instanceof THREE.Light || child instanceof THREE.Camera;
    if (extra || needles.some((needle) => child.name.toLowerCase().includes(needle))) {
      remove.push(child);
    }
  });
  remove.forEach((child) => child.parent?.remove(child));
}

function visibleBox(object: THREE.Object3D) {
  const box = new THREE.Box3();
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible) {
      return;
    }

    box.expandByObject(child);
  });
  return box;
}

function paintNamedMeshes(
  object: THREE.Object3D,
  materials: Record<string, THREE.Material>,
) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const name = child.name.toLowerCase();
    const match = Object.keys(materials).find((key) => name === key);
    if (match) {
      child.material = materials[match];
    }
  });
}

function groundedClone(
  source: THREE.Object3D,
  height: number,
  position: readonly [number, number, number],
  rotationY = 0,
) {
  const wrap = new THREE.Group();
  const inner = source.clone(true);
  wrap.add(inner);

  const box = visibleBox(inner);
  const size = new THREE.Vector3();
  box.getSize(size);
  inner.scale.multiplyScalar(height / Math.max(size.y, 1e-4));

  const fitted = visibleBox(inner);
  const center = new THREE.Vector3();
  fitted.getCenter(center);
  inner.position.x -= center.x;
  inner.position.z -= center.z;
  inner.position.y -= fitted.min.y;

  wrap.position.set(position[0], position[1], position[2]);
  wrap.rotation.y = rotationY;
  return wrap;
}

function colorClone(source: THREE.Group, material: THREE.Material) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.material = material;
    child.castShadow = true;
    child.receiveShadow = true;
    child.geometry?.computeVertexNormals();
  });
  return clone;
}

function placeSeed(
  seed: Seed,
  islandRot: number,
  look: SeedLook,
  slot = Math.random() * 4,
) {
  const worldAngle = 0.6 + slot * 0.62 + Math.random() * 0.12;
  seed.angle = worldAngle - islandRot;
  seed.height = 1.1 + Math.random() * 1.7;
  const roll = Math.random();
  if (roll < SPECIAL_SEED_CHANCE) {
    seed.kind = "special";
  } else if (roll < SPECIAL_SEED_CHANCE * 2) {
    seed.kind = "hazard";
  } else {
    seed.kind = "gold";
  }

  const isHazard = seed.kind === "hazard";
  seed.mesh.geometry = isHazard ? look.hazard : look.sphere;
  seed.mesh.material =
    seed.kind === "special" ? look.green : isHazard ? look.red : look.gold;
  seed.mesh.position.set(
    Math.sin(seed.angle) * RIM,
    seed.height,
    Math.cos(seed.angle) * RIM,
  );
  seed.mesh.visible = true;
}

function GameWorld({
  status,
  flapId,
  sessionId,
  onScore,
  onDead,
  onSpecial,
}: GameCanvasProps) {
  const islandRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const physics = useRef({
    y: START_Y,
    vy: 0,
    score: 0,
  });
  const statusRef = useRef(status);
  const deadSent = useRef(false);
  const seededRef = useRef(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const birdWorld = useMemo(() => new THREE.Vector3(), []);
  const seedWorld = useMemo(() => new THREE.Vector3(), []);
  const down = useMemo(() => new THREE.Vector3(0, -1, 0), []);
  const { camera } = useThree();

  statusRef.current = status;

  const [rock, sand, water, mountain, green, lightGreen] = useLoader(
    OBJLoader,
    [...MODEL_URLS],
  );
  const palmFbx = useLoader(FBXLoader, "/models/palmtree.fbx");
  const guacaGltf = useLoader(GLTFLoader, "/models/guacamaya.glb");
  const birdPaint = useLoader(THREE.TextureLoader, "/models/bird-paint.jpg");

  const islandParts = useMemo(
    () => [
      colorClone(
        rock,
        new THREE.MeshLambertMaterial({
          color: 0xd37b45,
          flatShading: true,
        }),
      ),
      colorClone(
        sand,
        new THREE.MeshLambertMaterial({
          color: 0xfbd09b,
          flatShading: true,
        }),
      ),
      colorClone(
        water,
        new THREE.MeshStandardMaterial({
          color: 0xc7e4fc,
          emissive: 0x37647c,
          transparent: true,
          opacity: 0.9,
          roughness: 0.18,
          metalness: 0.35,
          flatShading: true,
        }),
      ),
      colorClone(
        mountain,
        new THREE.MeshLambertMaterial({
          color: 0x999999,
          flatShading: true,
        }),
      ),
      colorClone(
        green,
        new THREE.MeshLambertMaterial({
          color: 0x339933,
          flatShading: true,
        }),
      ),
      colorClone(
        lightGreen,
        new THREE.MeshLambertMaterial({
          color: 0x33aa33,
          flatShading: true,
        }),
      ),
    ],
    [rock, sand, water, mountain, green, lightGreen],
  );

  const palms = useMemo(() => {
    const leaf = new THREE.MeshLambertMaterial({
      color: 0x5a8c2a,
      flatShading: true,
    });
    const trunk = new THREE.MeshLambertMaterial({
      color: 0xbf7d53,
      flatShading: true,
    });
    const coconut = new THREE.MeshLambertMaterial({
      color: 0x965831,
      flatShading: true,
    });
    const palmTemplate = palmFbx.clone(true);
    stripByName(palmTemplate, ["colonly"]);
    paintNamedMeshes(palmTemplate, {
      palms: leaf,
      tree: trunk,
      coconuts: coconut,
    });
    enableShadows(palmTemplate);

    return PALMS.map((item) =>
      groundedClone(palmTemplate, item.height, item.position, item.rotation),
    );
  }, [palmFbx]);

  const bird = useMemo(() => {
    birdPaint.colorSpace = THREE.SRGBColorSpace;
    birdPaint.flipY = false;
    birdPaint.needsUpdate = true;

    const wrap = new THREE.Group();
    const inner = cloneSkinned(guacaGltf.scene);
    stripByName(inner, []);
    const paint = new THREE.MeshLambertMaterial({
      map: birdPaint,
      color: 0xffffff,
      flatShading: true,
    });
    inner.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.material = paint;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
    });

    inner.updateMatrixWorld(true);
    const box = visibleBox(inner);
    const size = new THREE.Vector3();
    box.getSize(size);
    inner.scale.multiplyScalar(BIRD_HEIGHT / Math.max(size.y, 1e-4));
    inner.updateMatrixWorld(true);
    const fitted = visibleBox(inner);
    const center = new THREE.Vector3();
    fitted.getCenter(center);
    inner.position.x -= center.x;
    inner.position.y -= fitted.min.y;
    inner.position.z -= center.z;
    inner.rotation.y = -Math.PI / 2;
    wrap.add(inner);

    const mixer = new THREE.AnimationMixer(inner);
    const clip = guacaGltf.animations[0];
    if (clip) {
      const action = mixer.clipAction(clip);
      action.play();
      // hold the clip's first frame so the bird keeps its authored pose
      action.paused = true;
    }
    mixerRef.current = mixer;

    wrap.position.set(0, START_Y, RIM);
    return wrap;
  }, [birdPaint, guacaGltf]);

  const seedField = useMemo(() => {
    const group = new THREE.Group();
    const sphere = new THREE.SphereGeometry(0.12, 12, 12);
    const hazard = new THREE.OctahedronGeometry(0.16, 0);
    const gold = new THREE.MeshStandardMaterial({
      color: 0xf0c14a,
      emissive: 0xc47a12,
      emissiveIntensity: 0.55,
      roughness: 0.45,
      metalness: 0.12,
    });
    const green = new THREE.MeshStandardMaterial({
      color: 0x3ddc84,
      emissive: 0x148f4a,
      emissiveIntensity: 0.7,
      roughness: 0.4,
      metalness: 0.12,
    });
    const red = new THREE.MeshLambertMaterial({
      color: 0xe23d3d,
      emissive: 0x7a1010,
      flatShading: true,
    });
    const look: SeedLook = { gold, green, red, sphere, hazard };
    const seeds: Seed[] = Array.from({ length: SEED_COUNT }, () => {
      const mesh = new THREE.Mesh(sphere, gold);
      mesh.castShadow = true;
      mesh.visible = false;
      group.add(mesh);
      return { mesh, angle: 0, height: 1, kind: "gold" };
    });
    return { group, seeds, look };
  }, []);

  useEffect(() => {
    physics.current.y = START_Y;
    physics.current.vy = 0;
    physics.current.score = 0;
    deadSent.current = false;
    seededRef.current = false;
    onScore(0);
    seedField.seeds.forEach((seed) => {
      seed.mesh.visible = false;
    });
  }, [onScore, seedField, sessionId]);

  useEffect(() => {
    if (status !== "playing" || flapId === 0) {
      return;
    }

    physics.current.vy = JUMP;
  }, [flapId, status]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const island = islandRef.current;
    if (!island) {
      return;
    }

    const dead = statusRef.current === "dead" || deadSent.current;
    const playing = statusRef.current === "playing" && !dead;
    const spin = playing ? 0.62 + physics.current.score * 0.018 : 0.22;
    if (!dead) {
      island.rotation.y -= spin * d;
    }

    mixerRef.current?.update(d * (physics.current.vy > 1 ? 1.8 : 0.9));

    if (statusRef.current === "ready") {
      physics.current.y = START_Y + Math.sin(state.clock.elapsedTime * 2.4) * 0.12;
      physics.current.vy = 0;
      seededRef.current = false;
      seedField.seeds.forEach((seed) => {
        seed.mesh.visible = false;
      });
    }

    if (playing && !seededRef.current) {
      seededRef.current = true;
      seedField.seeds.forEach((seed, index) =>
        placeSeed(seed, island.rotation.y, seedField.look, index),
      );
    }

    if (playing) {
      physics.current.vy -= GRAVITY * d;
      physics.current.y += physics.current.vy * d;
      if (physics.current.y > MAX_HEIGHT) {
        physics.current.y = MAX_HEIGHT;
        physics.current.vy = Math.min(physics.current.vy, 0);
      }
    }

    bird.position.set(0, physics.current.y, RIM);
    bird.rotation.z = THREE.MathUtils.clamp(physics.current.vy * 0.08, -0.55, 0.55);

    const camY = physics.current.y + 0.72;
    camera.position.set(0.55, camY, RIM + 2.45);
    camera.lookAt(0, physics.current.y + 0.18, RIM - 0.12);

    const light = lightRef.current;
    if (light) {
      if (light.parent && light.target.parent !== light.parent) {
        light.parent.add(light.target);
      }
      light.position.set(10, 12, 14);
      light.target.position.set(0, 0, 0);
      light.target.updateMatrixWorld();
    }

    if (!playing) {
      return;
    }

    birdWorld.set(0, physics.current.y + BIRD_HEIGHT * 0.35, RIM);
    raycaster.set(new THREE.Vector3(0, physics.current.y + 1.6, RIM), down);
    const hits = raycaster.intersectObjects(islandParts, true);
    const floorHit = hits.find((hit) => hit.point.y > -0.6);
    const floorY = floorHit ? floorHit.point.y : 0.12;
    if (physics.current.y <= floorY + 0.04) {
      physics.current.y = floorY + 0.04;
      physics.current.vy = 0;
      bird.position.y = physics.current.y;
      deadSent.current = true;
      onDead();
      return;
    }

    const rot = island.rotation.y;
    seedField.seeds.forEach((seed) => {
      seed.mesh.getWorldPosition(seedWorld);
      const dist = seedWorld.distanceTo(birdWorld);
      if (seed.mesh.visible && dist < COLLECT_RADIUS) {
        seed.mesh.visible = false;
        if (seed.kind === "hazard") {
          deadSent.current = true;
          onDead();
          return;
        }

        physics.current.score += 1;
        onScore(physics.current.score);
        if (seed.kind === "special") {
          onSpecial();
        }
        placeSeed(seed, rot, seedField.look, 3.4 + Math.random() * 0.6);
        return;
      }

      const worldAngle = Math.atan2(seedWorld.x, seedWorld.z);
      if (worldAngle < -0.55) {
        placeSeed(seed, rot, seedField.look, 3.2 + Math.random() * 0.8);
      }
    });
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        color={0xffe0b0}
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.03}
      />
      <group ref={islandRef}>
        {islandParts.map((part, index) => (
          <primitive key={index} object={part} />
        ))}
        {palms.map((palm, index) => (
          <primitive key={`palm-${index}`} object={palm} />
        ))}
        <primitive object={seedField.group} />
      </group>
      <primitive object={bird} />
    </>
  );
}

export default function GameCanvas(props: GameCanvasProps) {
  return (
    <Canvas
      shadows="basic"
      camera={{ position: [0.55, START_Y + 0.72, RIM + 2.45], fov: 80, near: 0.1, far: 80 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.75]}
      style={{ touchAction: "none" }}
    >
      <ambientLight intensity={0.28} />
      <hemisphereLight args={[0xfff2d6, 0x243444, 0.18]} />
      <pointLight color={0xffde9f} intensity={0.45} distance={40} position={[-4, 2, -6]} />
      <Suspense fallback={null}>
        <GameWorld {...props} />
      </Suspense>
    </Canvas>
  );
}
