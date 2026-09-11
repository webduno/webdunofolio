"use client";

import { Suspense, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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

/** Smaller = closer to the island. 1.0 is tight, 2.0 has lots of empty space. */
const CAMERA_DISTANCE = 1.1;

/** More negative = lower on screen. */
const ISLAND_Y = -0.3;

const PALMS = [
  { position: [-2.4, -0.35, .9] as const, height: 1.7, rotation: 0.35, perch: true },
  { position: [-3.1, -0.25, .35] as const, height: 1, rotation: 1.8 },
  { position: [-.9, -0.3, 0] as const, height: .85, rotation: 2.2 },
  { position: [0.25, -.3, 3] as const, height: 0.85, rotation: -0.55 },
  { position: [2.25, 0, 0.2] as const, height: 1.45, rotation: 1.15 },
  { position: [2.95, -0.3, -1.05] as const, height: 0.95, rotation: 2.65 },
] as const;

const CLOUDS = [
  { position: [0.05, 5.35, -0.2] as const, width: 14.8, rotation: 0.12 },
  { position: [2.35, 5.85, 0.7] as const, width: 5.2, rotation: 1.3 },
] as const;

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
    const name = child.name.toLowerCase();
    const extra =
      child instanceof THREE.Light || child instanceof THREE.Camera;
    if (extra || needles.some((needle) => name.includes(needle))) {
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

function paintAllMeshes(object: THREE.Object3D, material: THREE.Material) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material;
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

function floatingClone(
  source: THREE.Object3D,
  width: number,
  position: readonly [number, number, number],
  rotationY = 0,
) {
  const wrap = new THREE.Group();
  const inner = source.clone(true);
  wrap.add(inner);

  const box = visibleBox(inner);
  const size = new THREE.Vector3();
  box.getSize(size);
  inner.scale.multiplyScalar(width / Math.max(size.x, size.z, 1e-4));

  const fitted = visibleBox(inner);
  const center = new THREE.Vector3();
  fitted.getCenter(center);
  inner.position.sub(center);

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

function IslandDecor() {
  const cloudsRef = useRef<THREE.Group>(null);
  const palmFbx = useLoader(FBXLoader, "/models/palmtree.fbx");
  const cloudsFbx = useLoader(FBXLoader, "/models/clouds.fbx");
  const guacaGltf = useLoader(GLTFLoader, "/models/guacamaya-retracted.glb");
  const birdPaint = useLoader(THREE.TextureLoader, "/models/bird-paint.jpg");

  const decorations = useMemo(() => {
    birdPaint.colorSpace = THREE.SRGBColorSpace;
    birdPaint.flipY = false;
    birdPaint.needsUpdate = true;

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
    const cloud = new THREE.MeshLambertMaterial({
      color: 0xfff6ee,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
      flatShading: true,
      transparent: true,
      opacity: 0.5,
    });

    const palmTemplate = palmFbx.clone(true);
    stripByName(palmTemplate, ["colonly"]);
    paintNamedMeshes(palmTemplate, {
      palms: leaf,
      tree: trunk,
      coconuts: coconut,
    });
    enableShadows(palmTemplate);

    const cloudTemplate = cloudsFbx.clone(true);
    stripByName(cloudTemplate, []);
    paintAllMeshes(cloudTemplate, cloud);
    enableShadows(cloudTemplate);

    const birdPaintMat = new THREE.MeshLambertMaterial({
      map: birdPaint,
      color: 0xffffff,
      flatShading: true,
    });
    const bird = cloneSkinned(guacaGltf.scene);
    stripByName(bird, []);
    const perchClip = guacaGltf.animations[0];
    if (perchClip) {
      const mixer = new THREE.AnimationMixer(bird);
      mixer.clipAction(perchClip).play();
      mixer.update(0);
    }
    bird.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.material = birdPaintMat;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
    });
    bird.updateMatrixWorld(true);
    const rawBird = visibleBox(bird);
    const rawBirdSize = new THREE.Vector3();
    rawBird.getSize(rawBirdSize);
    bird.scale.multiplyScalar(.5 / Math.max(rawBirdSize.y, 1e-4));
    bird.updateMatrixWorld(true);
    const birdBox = visibleBox(bird);
    const birdCenter = new THREE.Vector3();
    birdBox.getCenter(birdCenter);
    bird.position.x -= birdCenter.x +5;
    bird.position.z -= birdCenter.z -1;
    bird.position.y -= birdBox.min.y-2
    palmTemplate.updateMatrixWorld(true);

    
    cloudTemplate.updateMatrixWorld(true);

    const clouds = CLOUDS.map((item) =>
      floatingClone(cloudTemplate, item.width, item.position, item.rotation),
    );

    const grounded: THREE.Object3D[] = [];
    PALMS.forEach((item) => {
      grounded.push(
        groundedClone(
          palmTemplate,
          item.height,
          item.position,
          item.rotation,
        ),
      );
      if ("perch" in item && item.perch) {
        const perch = new THREE.Group();
        perch.add(bird);
        perch.position.set(
          item.position[0] + 0.2,
          item.position[1] + item.height * 0.82,
          item.position[2] + 0.12,
        );
        perch.rotation.y = Math.PI * 0.55;
        grounded.push(perch);
      }
    });

    return { clouds, grounded };
  }, [birdPaint, cloudsFbx, guacaGltf, palmFbx]);

  useFrame((_, delta) => {
    const clouds = cloudsRef.current;
    if (!clouds) {
      return;
    }

    clouds.rotation.y -= delta * 0.03;
  });

  return (
    <>
      <group ref={cloudsRef}>
        {decorations.clouds.map((item, index) => (
          <primitive key={`cloud-${index}`} object={item} />
        ))}
      </group>
      {decorations.grounded.map((item, index) => (
        <primitive key={`ground-${index}`} object={item} />
      ))}
    </>
  );
}

function IslandOrbit() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useLayoutEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2.08;
    const dist = camera.position.distanceTo(controls.target);
    controls.minDistance = dist * 0.55;
    controls.maxDistance = dist * 2.3;
    controls.zoomSpeed = 0.7;
    controls.rotateSpeed = 0.65;
    controls.update();
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

function IslandModel({ onReady }: { onReady: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const didCenter = useRef(false);
  const { camera } = useThree();
  const [rock, sand, water, mountain, green, lightGreen] = useLoader(
    OBJLoader,
    [...MODEL_URLS],
  );

  const parts = useMemo(
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

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || didCenter.current) {
      return;
    }

    const box = new THREE.Box3();
    parts.forEach((part) => box.expandByObject(part));
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    group.position.sub(center);
    group.position.y += size.y * ISLAND_Y;

    const maxDim = Math.max(size.x, size.y, size.z);
    const persp = camera as THREE.PerspectiveCamera;
    const fov = persp.fov * (Math.PI / 180);
    const fit = maxDim / 2 / Math.tan(fov / 2);
    persp.position.set(0, maxDim * 0.8, fit * CAMERA_DISTANCE);
    persp.near = 0.1;
    persp.far = Math.max(100, fit * 20);
    persp.lookAt(0, 0, 0);
    persp.updateProjectionMatrix();

    const light = lightRef.current;
    if (light) {
      if (light.parent && light.target.parent !== light.parent) {
        light.parent.add(light.target);
      }
      const extent = Math.max(maxDim * 0.7, 4);
      light.position.set(extent * 5, extent * 1.7, extent * 5);
      light.target.position.set(0, group.position.y, 0);
      light.target.updateMatrixWorld();
      const shadowCam = light.shadow.camera;
      shadowCam.left = -extent;
      shadowCam.right = extent;
      shadowCam.top = extent;
      shadowCam.bottom = -extent;
      shadowCam.near = 0.5;
      shadowCam.far = extent * 8;
      shadowCam.updateProjectionMatrix();
      light.shadow.needsUpdate = true;
    }

    didCenter.current = true;
    onReady();
  }, [camera, onReady, parts]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    group.rotation.y = (-0.35 + Math.sin(state.clock.elapsedTime * 0.22) * 0.12)*-1;
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
        shadow-radius={0}
      />
      <group ref={groupRef} scale={1}>
        {parts.map((part, index) => (
          <primitive key={index} object={part} />
        ))}
        <Suspense fallback={null}>
          <IslandDecor />
        </Suspense>
      </group>
      <IslandOrbit />
    </>
  );
}

export default function IslandCanvas({ onReady }: { onReady: () => void }) {
  const handleReady = useCallback(() => {
    onReady();
  }, [onReady]);

  return (
    <Canvas
      shadows="basic"
      camera={{ position: [0, 3, 18], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.75]}
      style={{ touchAction: "none" }}
    >
      <ambientLight intensity={0.28} />
      <hemisphereLight args={[0xfff2d6, 0x243444, 0.18]} />
      <pointLight
        color={0xffde9f}
        intensity={0.45}
        distance={40}
        position={[-4, 2, -6]}
      />
      <Suspense fallback={null}>
        <IslandModel onReady={handleReady} />
      </Suspense>
    </Canvas>
  );
}
