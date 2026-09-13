"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import type { RefObject } from "react";
import type { WorldControls } from "./controls";

const GRAVITY = 13.5;
const JUMP = 5.1;
const MAX_ALTITUDE = 9;
const FLY_SPEED = 5.5;
const WALK_SPEED = 2.6;
const BIRD_HEIGHT = 0.52;
const CAM_DISTANCE = 3.4;
const CAM_HEIGHT = 1.45;
const CAM_FOV = 70;
const SKY_COLOR = 0xcfe6ee;
// the bird starts standing on the pier, a few meters out from the house
const SPAWN_AHEAD_OF_HOUSE = 6;
const FBX_TO_METERS = 0.01;

// meshes the bird can stand on / bump into (godot StaticBody nodes)
const FLOOR_NAMES = [
  "sand",
  "first_island",
  "pier_floor",
  "house_2",
  "house_wood",
  "rock_group",
  "tree_leafe_wall",
  "poles",
];
const WALL_NAMES = [
  "house_2",
  "house_wood",
  "tree_leafe_wall",
  "poles",
  "rock_group",
  "first_island",
];
// invisible helper volumes in the godot scene
const HIDDEN_NAMES = ["boundary", "water_area"];

type WorldCanvasProps = {
  controls: RefObject<WorldControls>;
  onReady: () => void;
};

type BirdState = {
  pos: THREE.Vector3;
  vy: number;
  yaw: number;
  camYaw: number;
  grounded: boolean;
  lastJump: number;
};

function lambert(color: number, doubleSide = false) {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

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

function stripExtras(object: THREE.Object3D) {
  const remove: THREE.Object3D[] = [];
  object.traverse((child) => {
    if (child instanceof THREE.Light || child instanceof THREE.Camera) {
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

function meshesNamed(root: THREE.Object3D, names: string[]) {
  const found: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && names.includes(child.name.toLowerCase())) {
      found.push(child);
    }
  });
  return found;
}

function lerpAngle(from: number, to: number, t: number) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) {
    diff -= Math.PI * 2;
  } else if (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return from + diff * t;
}

function WorldScene({ controls, onReady }: WorldCanvasProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const stateRef = useRef<BirdState | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const down = useMemo(() => new THREE.Vector3(0, -1, 0), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const moveDir = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();

  const restingaFbx = useLoader(FBXLoader, "/models/restinga.fbx");
  const guacaGltf = useLoader(GLTFLoader, "/models/guacamaya.glb");
  const birdPaint = useLoader(THREE.TextureLoader, "/models/bird-paint.jpg");

  const terrain = useMemo(() => {
    const root = restingaFbx.clone(true);
    stripExtras(root);
    // the fbx is authored in centimeters
    root.scale.setScalar(FBX_TO_METERS);

    // colors taken from guacamisland/assets/materials/nature/*.tres
    const woodLight = lambert(0x9e6e4b);
    const woodDark = lambert(0x604330, true);
    const leaf = lambert(0x699e38, true);
    const leafLight = lambert(0x93aa52, true);
    const leafDark = lambert(0x60890c, true);
    const sand = lambert(0xbba275);
    const rock = lambert(0x8a9180);
    const water = new THREE.MeshStandardMaterial({
      color: 0xb9d7bc,
      emissive: 0x06642a,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.72,
      roughness: 0.2,
      metalness: 0.3,
      flatShading: true,
    });
    const sea = new THREE.MeshStandardMaterial({
      color: 0xb9d7bc,
      emissive: 0x06642a,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.3,
      flatShading: true,
    });

    const paint: Record<string, THREE.Material> = {
      house_2: woodLight,
      poles: woodLight,
      light_runks: woodLight,
      house_wood: woodDark,
      pier_floor: woodDark,
      dark_trunks: woodDark,
      leaf,
      leaf_2: leaf,
      tree_leafe_wall: leaf,
      scene: leaf,
      light_leaf: leafLight,
      light_leaf_2: leafLight,
      light_leaf_2_2: leafLight,
      first_island: leafLight,
      dark_leaf: leafDark,
      dark_leaf_2: leafDark,
      sand,
      rock_group: rock,
      water,
      external_water: sea,
    };

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const name = child.name.toLowerCase();
      if (HIDDEN_NAMES.includes(name)) {
        child.visible = false;
        return;
      }

      const material = paint[name];
      if (material) {
        child.material = material;
      }
    });
    enableShadows(root);
    const waterMesh = meshesNamed(root, ["water"])[0];
    if (waterMesh) {
      waterMesh.castShadow = false;
    }
    const seaMesh = meshesNamed(root, ["external_water"])[0];
    if (seaMesh) {
      seaMesh.castShadow = false;
    }

    root.updateMatrixWorld(true);
    const floors = meshesNamed(root, FLOOR_NAMES);
    const walls = meshesNamed(root, WALL_NAMES);
    const sandMesh = meshesNamed(root, ["sand"])[0];
    const houseMesh = meshesNamed(root, ["house_2"])[0];
    const pierMesh = meshesNamed(root, ["pier_floor"])[0];
    const bounds = sandMesh ? visibleBox(sandMesh) : visibleBox(root);
    const waterY = waterMesh ? visibleBox(waterMesh).max.y : 0;
    const pierY = pierMesh ? visibleBox(pierMesh).max.y : waterY;

    const center = new THREE.Vector3();
    bounds.getCenter(center);
    const houseCenter = new THREE.Vector3();
    if (houseMesh) {
      visibleBox(houseMesh).getCenter(houseCenter);
    } else {
      houseCenter.copy(center);
    }
    const towardCenter = Math.sign(center.z - houseCenter.z) || 1;
    const spawn = new THREE.Vector3(
      houseCenter.x,
      pierY + 0.3,
      houseCenter.z + towardCenter * SPAWN_AHEAD_OF_HOUSE,
    );
    const startYaw = Math.atan2(center.x - spawn.x, center.z - spawn.z);

    return { root, floors, walls, bounds, waterY, spawn, startYaw };
  }, [restingaFbx]);

  const bird = useMemo(() => {
    birdPaint.colorSpace = THREE.SRGBColorSpace;
    birdPaint.flipY = false;
    birdPaint.needsUpdate = true;

    const wrap = new THREE.Group();
    const inner = cloneSkinned(guacaGltf.scene);
    stripExtras(inner);
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
    // model faces -Z, turn it so the wrapper's forward is +Z
    inner.rotation.y = Math.PI;
    wrap.add(inner);

    const mixer = new THREE.AnimationMixer(inner);
    const clip = guacaGltf.animations[0];
    if (clip) {
      const action = mixer.clipAction(clip);
      action.play();
      // rest pose is static: the clip only runs while flapping upward
      action.paused = true;
      actionRef.current = action;
    }
    mixerRef.current = mixer;
    return wrap;
  }, [birdPaint, guacaGltf]);

  useEffect(() => {
    stateRef.current = {
      pos: terrain.spawn.clone(),
      vy: 0,
      yaw: terrain.startYaw,
      camYaw: terrain.startYaw,
      grounded: false,
      lastJump: controls.current?.jumpId ?? 0,
    };
    bird.position.copy(terrain.spawn);
    bird.rotation.y = terrain.startYaw;
    camera.position.set(
      terrain.spawn.x - Math.sin(terrain.startYaw) * CAM_DISTANCE,
      terrain.spawn.y + CAM_HEIGHT,
      terrain.spawn.z - Math.cos(terrain.startYaw) * CAM_DISTANCE,
    );
    camera.lookAt(terrain.spawn);
    onReady();
  }, [bird, camera, controls, onReady, terrain]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    const s = stateRef.current;
    const c = controls.current;
    if (!s || !c) {
      return;
    }

    if (c.jumpId !== s.lastJump) {
      s.lastJump = c.jumpId;
      s.vy = JUMP;
      s.grounded = false;
    }

    s.camYaw += c.yawDelta;
    c.yawDelta = 0;

    const mag = Math.hypot(c.move.x, c.move.y);
    if (mag > 0.08) {
      const amount = Math.min(mag, 1);
      const sin = Math.sin(s.camYaw);
      const cos = Math.cos(s.camYaw);
      // camera-relative: forward is where the camera looks, right is perpendicular
      moveDir.set(
        sin * c.move.y - cos * c.move.x,
        0,
        cos * c.move.y + sin * c.move.x,
      );
      moveDir.normalize();

      const speed = (s.grounded ? WALK_SPEED : FLY_SPEED) * amount;
      rayOrigin.set(s.pos.x, s.pos.y + BIRD_HEIGHT * 0.5, s.pos.z);
      raycaster.set(rayOrigin, moveDir);
      raycaster.far = 0.6;
      const blocked = raycaster.intersectObjects(terrain.walls, false).length > 0;
      if (!blocked) {
        s.pos.x += moveDir.x * speed * d;
        s.pos.z += moveDir.z * speed * d;
      }

      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      s.yaw = lerpAngle(s.yaw, targetYaw, 1 - Math.exp(-10 * d));
      s.camYaw = lerpAngle(s.camYaw, s.yaw, 1 - Math.exp(-1.6 * d));
    }

    s.vy -= GRAVITY * d;
    s.pos.y += s.vy * d;
    const ceiling = terrain.waterY + MAX_ALTITUDE;
    if (s.pos.y > ceiling) {
      s.pos.y = ceiling;
      s.vy = Math.min(s.vy, 0);
    }

    const margin = 0.6;
    s.pos.x = THREE.MathUtils.clamp(
      s.pos.x,
      terrain.bounds.min.x + margin,
      terrain.bounds.max.x - margin,
    );
    s.pos.z = THREE.MathUtils.clamp(
      s.pos.z,
      terrain.bounds.min.z + margin,
      terrain.bounds.max.z - margin,
    );

    rayOrigin.set(s.pos.x, s.pos.y + 2, s.pos.z);
    raycaster.set(rayOrigin, down);
    raycaster.far = 40;
    const hits = raycaster.intersectObjects(terrain.floors, false);
    const solidY = hits.length > 0 ? hits[0].point.y : -Infinity;
    // the water surface works as a floor too, the bird just floats on it
    const floorY = Math.max(solidY, terrain.waterY);
    if (s.pos.y <= floorY) {
      s.pos.y = floorY;
      s.vy = 0;
      s.grounded = true;
    } else {
      s.grounded = false;
    }

    bird.position.copy(s.pos);
    bird.rotation.y = s.yaw;
    bird.rotation.x = s.grounded
      ? 0
      : THREE.MathUtils.clamp(-s.vy * 0.06, -0.4, 0.4);

    const action = actionRef.current;
    if (action) {
      action.paused = s.grounded || s.vy < 0.2;
    }
    mixerRef.current?.update(d * 1.6);

    camTarget.set(
      s.pos.x - Math.sin(s.camYaw) * CAM_DISTANCE,
      s.pos.y + CAM_HEIGHT,
      s.pos.z - Math.cos(s.camYaw) * CAM_DISTANCE,
    );
    camera.position.lerp(camTarget, 1 - Math.exp(-7 * d));
    camera.lookAt(s.pos.x, s.pos.y + 0.35, s.pos.z);

    const light = lightRef.current;
    if (light) {
      if (light.parent && light.target.parent !== light.parent) {
        light.parent.add(light.target);
      }
      light.position.set(s.pos.x - 8, s.pos.y + 14, s.pos.z + 10);
      light.target.position.copy(s.pos);
      light.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        color={0xffe0b0}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.03}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      <primitive object={terrain.root} />
      <primitive object={bird} />
    </>
  );
}

export default function WorldCanvas(props: WorldCanvasProps) {
  return (
    <Canvas
      shadows="basic"
      camera={{ fov: CAM_FOV, near: 0.1, far: 220 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.75]}
      style={{ touchAction: "none" }}
    >
      <fog attach="fog" args={[SKY_COLOR, 28, 130]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={[0xe8f6ff, 0x4e6b3a, 0.35]} />
      <Suspense fallback={null}>
        <WorldScene {...props} />
      </Suspense>
    </Canvas>
  );
}
