import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

function buildHelixPoints({ turns = 3.1, samples = 220, radius = 1.18, height = 9.2, phase = 0 }) {
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const angle = (t * turns * Math.PI * 2) + phase;
    const y = (t - 0.5) * height;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export default function DnaThreeWidget() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 16.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const ambient = new THREE.AmbientLight(0xffffff, 0.48);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xd8fce9, 0x1a1412, 0.62);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(6, 7, 10);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb7f0c9, 0.85);
    rimLight.position.set(-8, -3, -9);
    scene.add(rimLight);

    /* Luz de acento cálida (oro rosa) en lugar de magenta frío */
    const accentLight = new THREE.PointLight(0xf0c4a8, 0.42, 26);
    accentLight.position.set(3.6, 1.8, 6.8);
    scene.add(accentLight);

    /* Esmeralda metálica — alineada con #14532d, un poco más clara para lectura PBR */
    const emeraldStrandMat = new THREE.MeshPhysicalMaterial({
      color: 0x176a41,
      roughness: 0.18,
      metalness: 0.82,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.35,
    });
    /* Oro rosa / cobre satinado (sustituye rojo anterior) */
    const roseStrandMat = new THREE.MeshPhysicalMaterial({
      color: 0xc9a088,
      roughness: 0.17,
      metalness: 0.84,
      clearcoat: 1,
      clearcoatRoughness: 0.11,
      envMapIntensity: 1.32,
    });
    const linkerEmerald = new THREE.MeshPhysicalMaterial({
      color: 0x248a52,
      roughness: 0.2,
      metalness: 0.7,
      clearcoat: 0.75,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.2,
    });
    const linkerRose = new THREE.MeshPhysicalMaterial({
      color: 0xd8b09a,
      roughness: 0.2,
      metalness: 0.72,
      clearcoat: 0.75,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.2,
    });
    const rungCoreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeff4fa,
      roughness: 0.24,
      metalness: 0.78,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    });

    const helixPointsA = buildHelixPoints({ phase: 0 });
    const helixPointsB = buildHelixPoints({ phase: Math.PI });

    const helixCurveA = new THREE.CatmullRomCurve3(helixPointsA);
    const helixCurveB = new THREE.CatmullRomCurve3(helixPointsB);

    const strandLineEmeraldGeo = new THREE.TubeGeometry(helixCurveA, 320, 0.055, 16, false);
    const strandLineRoseGeo = new THREE.TubeGeometry(helixCurveB, 320, 0.055, 16, false);
    const strandLineEmeraldMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a5c38,
      roughness: 0.22,
      metalness: 0.72,
      clearcoat: 0.85,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.25,
    });
    const strandLineRoseMat = new THREE.MeshPhysicalMaterial({
      color: 0xb8876a,
      roughness: 0.22,
      metalness: 0.74,
      clearcoat: 0.85,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.22,
    });
    root.add(new THREE.Mesh(strandLineEmeraldGeo, strandLineEmeraldMat));
    root.add(new THREE.Mesh(strandLineRoseGeo, strandLineRoseMat));

    const rungCount = 24;
    const beadGeo = new THREE.SphereGeometry(0.205, 24, 18);
    const sideCylinderGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.34, 16);
    const rungCoreGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 16);
    const rungEndGeo = new THREE.SphereGeometry(0.09, 16, 12);

    for (let i = 0; i < rungCount; i += 1) {
      const t = i / (rungCount - 1);
      const pA = helixCurveA.getPointAt(t);
      const pB = helixCurveB.getPointAt(t);
      const center = pA.clone().add(pB).multiplyScalar(0.5);
      const direction = pB.clone().sub(pA);
      const length = direction.length();
      const dirNorm = direction.clone().normalize();
      const sideOffset = dirNorm.clone().multiplyScalar(length * 0.19);

      const leftBead = new THREE.Mesh(beadGeo, emeraldStrandMat);
      leftBead.position.copy(pA);
      root.add(leftBead);

      const rightBead = new THREE.Mesh(beadGeo, roseStrandMat);
      rightBead.position.copy(pB);
      root.add(rightBead);

      const leftLink = new THREE.Mesh(sideCylinderGeo, linkerEmerald);
      leftLink.position.copy(pA).add(sideOffset);
      leftLink.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
      root.add(leftLink);

      const rightLink = new THREE.Mesh(sideCylinderGeo, linkerRose);
      rightLink.position.copy(pB).sub(sideOffset);
      rightLink.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
      root.add(rightLink);

      const rungCore = new THREE.Mesh(rungCoreGeo, rungCoreMaterial);
      rungCore.scale.y = Math.max(length * 0.62, 0.28);
      rungCore.position.copy(center);
      rungCore.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
      root.add(rungCore);

      const rungA = new THREE.Mesh(rungEndGeo, linkerEmerald);
      rungA.position.copy(center).sub(dirNorm.clone().multiplyScalar((length * 0.31) - 0.05));
      const rungB = new THREE.Mesh(rungEndGeo, linkerRose);
      rungB.position.copy(center).add(dirNorm.clone().multiplyScalar((length * 0.31) - 0.05));
      root.add(rungA);
      root.add(rungB);
    }

    root.rotation.x = 0.14;
    root.rotation.z = -0.03;

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      const width = Math.max(clientWidth, 10);
      const height = Math.max(clientHeight, 10);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frameId = 0;
    const animate = () => {
      const t = performance.now() * 0.001;
      root.rotation.y += 0.0056;
      root.rotation.x = 0.14 + Math.sin(t * 0.65) * 0.018;
      root.rotation.z = -0.03 + Math.cos(t * 0.52) * 0.016;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      pmremGenerator.dispose();
      envTexture.dispose();
      beadGeo.dispose();
      sideCylinderGeo.dispose();
      rungCoreGeo.dispose();
      rungEndGeo.dispose();
      strandLineEmeraldGeo.dispose();
      strandLineRoseGeo.dispose();
      emeraldStrandMat.dispose();
      roseStrandMat.dispose();
      linkerEmerald.dispose();
      linkerRose.dispose();
      rungCoreMaterial.dispose();
      strandLineEmeraldMat.dispose();
      strandLineRoseMat.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="dashboard-side-info__dna-canvas" ref={mountRef} aria-hidden="true" />;
}

