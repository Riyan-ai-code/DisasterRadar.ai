import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function SplineAiGuardian({
  probability = 78.4,
  riskLevel = 'HIGH',
  rainfall24h = 85,
  elevation = 20,
  location = 'Mira Bhayandar'
}) {
  const mountRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Map risk to primary illumination color
  const getRiskColorHex = (risk, prob) => {
    if (risk === 'CRITICAL' || risk === 'SEVERE' || prob >= 70) return 0xef4444; // Crimson
    if (risk === 'HIGH' || prob >= 50) return 0xf97316; // Amber-Orange
    if (risk === 'MODERATE' || prob >= 30) return 0xeab308; // Warning Amber
    return 0x06b6d4; // Cyan Guardian Blue
  };

  const currentRiskHex = getRiskColorHex(riskLevel, probability);
  const currentRiskCss = riskLevel === 'CRITICAL' || riskLevel === 'SEVERE' || probability >= 70
    ? '#ef4444' : (probability >= 50 ? '#f97316' : (probability >= 30 ? '#eab308' : '#06b6d4'));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 340;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL context creation failed for SplineAiGuardian:', e);
      return;
    }

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(currentRiskHex, 3.2, 10);
    rimLight.position.set(-3, 3, -2);
    scene.add(rimLight);

    const guardianGroup = new THREE.Group();
    scene.add(guardianGroup);

    // 3. Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.88,
      roughness: 0.22,
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.35,
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: currentRiskHex,
      transparent: true,
      opacity: 0.9
    });

    const holoWireMat = new THREE.MeshBasicMaterial({
      color: currentRiskHex,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });

    // 4. Humanoid Rescue Guardian Geometry
    // Head / Helmet
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 0);

    const helmetGeo = new THREE.SphereGeometry(0.24, 24, 24);
    helmetGeo.scale(1, 1.15, 1.05);
    const helmet = new THREE.Mesh(helmetGeo, chassisMat);
    headGroup.add(helmet);

    // Expressive Digital Visor Eyes
    const visorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 18, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
    const visor = new THREE.Mesh(visorGeo, glowMat);
    visor.rotation.z = Math.PI / 2;
    visor.position.set(0, 0.02, 0.16);
    headGroup.add(visor);

    guardianGroup.add(headGroup);

    // Torso / Chest Armor
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.72, 16);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.position.set(0, 1.05, 0);
    guardianGroup.add(torso);

    // Chest Core Holographic Environmental Monitor
    const coreGeo = new THREE.TorusGeometry(0.11, 0.022, 16, 32);
    const coreMesh = new THREE.Mesh(coreGeo, glowMat);
    coreMesh.position.set(0, 1.15, 0.26);
    guardianGroup.add(coreMesh);

    const coreCenterGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const coreCenter = new THREE.Mesh(coreCenterGeo, glowMat);
    coreCenter.position.set(0, 1.15, 0.26);
    guardianGroup.add(coreCenter);

    // Shoulders & Arms
    const shoulderLGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const shoulderL = new THREE.Mesh(shoulderLGeo, chassisMat);
    shoulderL.position.set(-0.42, 1.28, 0);
    guardianGroup.add(shoulderL);

    const shoulderR = shoulderL.clone();
    shoulderR.position.set(0.42, 1.28, 0);
    guardianGroup.add(shoulderR);

    // Left Arm resting in operational stance
    const armLGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.5, 12);
    const armL = new THREE.Mesh(armLGeo, armorMat);
    armL.position.set(-0.44, 0.92, 0.05);
    armL.rotation.z = 0.15;
    guardianGroup.add(armL);

    // Right Arm raised projecting holographic 3D terrain
    const armRGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.48, 12);
    const armR = new THREE.Mesh(armRGeo, armorMat);
    armR.position.set(0.44, 1.05, 0.22);
    armR.rotation.x = -Math.PI / 3;
    armR.rotation.z = -0.35;
    guardianGroup.add(armR);

    // Hand projector palm node
    const handNodeGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const handNode = new THREE.Mesh(handNodeGeo, glowMat);
    handNode.position.set(0.56, 1.18, 0.45);
    guardianGroup.add(handNode);

    // Lower Chassis & Base Stand
    const waistGeo = new THREE.CylinderGeometry(0.20, 0.25, 0.35, 16);
    const waist = new THREE.Mesh(waistGeo, chassisMat);
    waist.position.set(0, 0.58, 0);
    guardianGroup.add(waist);

    // 5. Projected 3D Floating Holographic Terrain / Contour Map
    const holoGroup = new THREE.Group();
    holoGroup.position.set(0.68, 1.28, 0.55);
    guardianGroup.add(holoGroup);

    // Floating 3D Contour Elevation Mesh
    const terrainGeo = new THREE.PlaneGeometry(0.75, 0.75, 14, 14);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const dist = Math.sqrt(vx * vx + vy * vy);
      const zWave = Math.sin(dist * 9.0) * 0.12 - (dist * 0.1);
      pos.setZ(i, zWave);
    }
    terrainGeo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(terrainGeo, holoWireMat);
    terrainMesh.rotation.x = -Math.PI / 2.3;
    holoGroup.add(terrainMesh);

    // Concentric Radar Scan Rings
    const radarRingGeo = new THREE.RingGeometry(0.42, 0.45, 32);
    const radarRing = new THREE.Mesh(radarRingGeo, glowMat);
    radarRing.rotation.x = -Math.PI / 2.3;
    holoGroup.add(radarRing);

    // 6. Environmental Particles (Rain & Atmospheric Data Nodes)
    const particleCount = 180;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 4.5;
      rainPositions[i + 1] = Math.random() * 3.5;
      rainPositions[i + 2] = (Math.random() - 0.5) * 3.0;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.024,
      transparent: true,
      opacity: 0.65
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    scene.add(rainSystem);

    // 7. Mouse Interactivity / Parallax Tracking
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 8. Animation Loop
    let animId;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;

      // Subtle Breathing / Idle Levitation
      guardianGroup.position.y = Math.sin(elapsed * 1.8) * 0.04 - 0.15;

      // Mouse Parallax head tracking
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, mousePos.x * 0.35, 0.05);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, -mousePos.y * 0.25, 0.05);
      guardianGroup.rotation.y = THREE.MathUtils.lerp(guardianGroup.rotation.y, mousePos.x * 0.18, 0.04);

      // Rotate Holographic Map & Pulse Core
      terrainMesh.rotation.z += 0.008;
      radarRing.rotation.z -= 0.012;

      const pulseScale = 1 + Math.sin(elapsed * 4.0) * 0.08;
      coreMesh.scale.set(pulseScale, pulseScale, pulseScale);

      // Rain Particles Flow
      const posArray = rainGeo.attributes.position.array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        posArray[i] -= 0.035;
        if (posArray[i] < 0) {
          posArray[i] = 3.5;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [currentRiskHex]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '320px' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      {/* Floating Holographic Telemetry HUD over the Guardian */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          background: 'rgba(10, 16, 28, 0.82)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${currentRiskCss}44`,
          borderRadius: '10px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 16px ${currentRiskCss}22`,
          pointerEvents: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: currentRiskCss,
              boxShadow: `0 0 8px ${currentRiskCss}`
            }}
          />
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
              Guardian Intelligence Active
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
              {location} • {riskLevel} RISK
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Rain 24h</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>{rainfall24h} mm</div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Elevation</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>{elevation} m</div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>AI Probability</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: currentRiskCss }}>{probability}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
