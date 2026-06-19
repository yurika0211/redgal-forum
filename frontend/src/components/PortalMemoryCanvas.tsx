import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  DoubleSide,
  MathUtils,
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type Mesh,
  type Texture,
} from "three";
import { PORTAL_MEMORY_CARD_ASPECT, PORTAL_MEMORY_COVER_URLS } from "./portalMemoryAssets";

interface MemoryCard {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  speed: number;
}

function prepareTextures(textures: Texture[]): Texture[] {
  textures.forEach((texture) => {
    const image = texture.image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
    const imageWidth = image.naturalWidth || image.width || 1;
    const imageHeight = image.naturalHeight || image.height || 1;
    const imageAspect = imageWidth / imageHeight;

    if (imageAspect > PORTAL_MEMORY_CARD_ASPECT) {
      const repeatX = PORTAL_MEMORY_CARD_ASPECT / imageAspect;
      texture.repeat.set(repeatX, 1);
      texture.offset.set((1 - repeatX) / 2, 0);
    } else {
      const repeatY = imageAspect / PORTAL_MEMORY_CARD_ASPECT;
      texture.repeat.set(1, repeatY);
      texture.offset.set(0, (1 - repeatY) / 2);
    }

    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  });
  return textures;
}

function MemoryCardField() {
  const groupRef = useRef<Group>(null);
  const meshRefs = useRef<Array<Mesh | null>>([]);
  const textures = prepareTextures(useLoader(TextureLoader, PORTAL_MEMORY_COVER_URLS));
  const cards = useMemo<MemoryCard[]>(
    () => [
      { x: -2.95, y: -0.2, z: -1.25, rotationY: 0.46, rotationZ: -0.13, scale: 1.05, speed: 0.7 },
      { x: -1.45, y: 0.44, z: -0.25, rotationY: 0.2, rotationZ: 0.08, scale: 1.18, speed: 0.82 },
      { x: 0, y: -0.05, z: 0.38, rotationY: 0, rotationZ: -0.02, scale: 1.34, speed: 0.58 },
      { x: 1.5, y: 0.34, z: -0.28, rotationY: -0.22, rotationZ: -0.08, scale: 1.18, speed: 0.76 },
      { x: 2.95, y: -0.24, z: -1.16, rotationY: -0.48, rotationZ: 0.13, scale: 1.05, speed: 0.66 },
    ],
    [],
  );

  useFrame(({ clock, pointer }) => {
    const elapsed = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, pointer.x * 0.11, 0.06);
      groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, -pointer.y * 0.035, 0.06);
      groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, pointer.x * 0.08, 0.05);
    }

    meshRefs.current.forEach((mesh, index) => {
      const card = cards[index];
      if (!mesh || !card) {
        return;
      }
      mesh.position.y = card.y + Math.sin(elapsed * card.speed + index * 0.82) * 0.075;
      mesh.rotation.z = card.rotationZ + Math.sin(elapsed * 0.42 + index) * 0.018;
    });
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, -0.08, -1.85]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[7.8, 2.45, 1, 1]} />
        <meshBasicMaterial color="#dfeaf2" transparent opacity={0.34} />
      </mesh>

      {cards.map((card, index) => (
        <mesh
          key={PORTAL_MEMORY_COVER_URLS[index]}
          ref={(mesh) => {
            meshRefs.current[index] = mesh;
          }}
          position={[card.x, card.y, card.z]}
          rotation={[0, card.rotationY, card.rotationZ]}
          scale={card.scale}
        >
          <planeGeometry args={[1.08, 1.56]} />
          <meshBasicMaterial map={textures[index]} side={DoubleSide} toneMapped={false} transparent opacity={0.98} />
        </mesh>
      ))}
    </group>
  );
}

export default function PortalMemoryCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.06, 6.2], fov: 39 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      resize={{ scroll: false }}
    >
      <Suspense fallback={null}>
        <MemoryCardField />
      </Suspense>
    </Canvas>
  );
}
