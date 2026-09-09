"use client";

import { Suspense, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
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
const ISLAND_Y = -0.26;

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

    const box = new THREE.Box3().setFromObject(group);
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

    group.rotation.y = 0.35 + Math.sin(state.clock.elapsedTime * 0.22) * 0.12;
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
      </group>
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
