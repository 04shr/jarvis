// src/components/PetModel.jsx
import React, {
  Suspense,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useMemo,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Html,
  useGLTF,
  OrbitControls,
  Preload,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";

/* =======================================================
   COLOR ANIMATOR — Smooth color lerping
   ======================================================= */
function ColorAnimator({ meshesRef }) {
  useFrame(() => {
    const map = meshesRef.current;
    if (!map) return;

    const speed = 0.18;

    for (const key in map) {
      const entry = map[key];
      if (!entry || !entry.mesh || !entry.mesh.material) continue;

      const mat = entry.mesh.material;
      const target = entry.targetColor;

      if (mat.color && target) {
        mat.color.lerp(target, speed);
        mat.needsUpdate = true;
      }
    }
  });

  return null;
}

/* =======================================================
   MODEL — Handles mouth + idle animations
   ======================================================= */
const Model = forwardRef(({ url }, ref) => {
  const gltf = useGLTF(url || "/models/mouth.glb");
  const group = useRef();

  const meshesRef = useRef({});
  const mouthRef = useRef({ closed: null, open: null });
  const speakingRef = useRef(false);

  const headRef = useRef();
  const bodyRef = useRef();

  /* ===== Auto Scale + Center Model ===== */
  useEffect(() => {
    if (!gltf?.scene) return;

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.6 / maxDim;

    gltf.scene.scale.set(scale, scale, scale);

    const center = new THREE.Vector3();
    box.getCenter(center);
    gltf.scene.position.sub(center);
  }, [gltf]);

  /* ===== Extract meshes + mouth nodes ===== */
  useEffect(() => {
    if (!gltf?.scene) return;

    const map = {};
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const cloned = child.material.clone();
        child.material = cloned;

        const orig = child.material.color?.clone() || new THREE.Color(0xffffff);
        map[child.name] = {
          mesh: child,
          originalColor: orig.clone(),
          targetColor: orig.clone(),
        };

        const n = child.name.toLowerCase();
        if (n.includes("head")) headRef.current = child;
        if (n.includes("body")) bodyRef.current = child;
      }
    });
    meshesRef.current = map;

    // Common mouth node names
    const closed =
      gltf.scene.getObjectByName("Mouth_001") ||
      gltf.scene.getObjectByName("MouthClosed");

    const open =
      gltf.scene.getObjectByName("Mouth_002") ||
      gltf.scene.getObjectByName("MouthOpen");

    if (closed && open) {
      closed.visible = true;
      open.visible = false;
      mouthRef.current = { closed, open };
    }
  }, [gltf]);

  /* ===== Imperative API (start/stop mouth) ===== */
  useImperativeHandle(ref, () => ({
    startSpeaking: () => {
      speakingRef.current = true;
    },
    stopSpeaking: () => {
      speakingRef.current = false;
      const m = mouthRef.current;
      if (m.closed && m.open) {
        m.closed.visible = true;
        m.open.visible = false;
      }
    },
  }));

  /* ===== Idle + Mouth Animation ===== */
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    const m = mouthRef.current;
    if (m.closed && m.open && speakingRef.current) {
      const open = Math.sin(t * 10) > 0;
      m.closed.visible = !open;
      m.open.visible = open;
    }

    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.4) * 0.15;
      group.current.position.y = Math.sin(t * 1.5) * 0.06;
    }

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.8) * 0.25;
      headRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <>
      <primitive ref={group} object={gltf.scene} dispose={null} />
      <ColorAnimator meshesRef={meshesRef} />
    </>
  );
});
Model.displayName = "Model";

/* =======================================================
   RESPONSIVE WRAPPER
   ======================================================= */
function ResponsiveWrapper({ children }) {
  const { viewport } = useThree();
  const scale = Math.max(0.6, Math.min(viewport.width, viewport.height) / 4);
  return <group scale={scale}>{children}</group>;
}

/* =======================================================
   MAIN PET MODEL COMPONENT
   ======================================================= */
const PetModel = forwardRef(({ className = "w-full h-full" }, ref) => {
  const resolvedUrl = "/models/mouth.glb";

  return (
    <div className={className}>
      <Canvas
        shadows
          camera={{ position: [0, 0.5, 3.5], fov: 35 }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight intensity={1.1} position={[4, 10, 5]} castShadow />

        <Suspense fallback={<Html center>Loading PET...</Html>}>
          <ResponsiveWrapper>
            <Model ref={ref} url={resolvedUrl} />
          </ResponsiveWrapper>

          <Environment preset="sunset" />
          <ContactShadows
            position={[0, -1.4, 0]}
            scale={3}
            blur={1.4}
            opacity={0.55}
          />

          <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
});

useGLTF.preload("/models/mouth.glb");
export default PetModel;
