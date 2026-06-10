/* Mui3D — Three.js hero background */

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 6;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  const ambient = new THREE.AmbientLight(0x6c5ce7, 0.3);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0x00cec9, 1.5, 20);
  pointLight.position.set(3, 3, 4);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x6c5ce7, 1, 20);
  pointLight2.position.set(-4, -2, 3);
  scene.add(pointLight2);

  // Central icosahedron
  const geo = new THREE.IcosahedronGeometry(1.4, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6c5ce7,
    metalness: 0.6,
    roughness: 0.2,
    wireframe: true,
    transparent: true,
    opacity: 0.7,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // Inner solid core
  const coreGeo = new THREE.IcosahedronGeometry(0.6, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x00cec9,
    metalness: 0.8,
    roughness: 0.1,
    emissive: 0x00cec9,
    emissiveIntensity: 0.15,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  // Orbiting particles
  const particleCount = 80;
  const positions = new Float32Array(particleCount * 3);
  const particleGeo = new THREE.BufferGeometry();

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 2.5 + Math.random() * 2;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xa29bfe,
    size: 0.04,
    transparent: true,
    opacity: 0.6,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Floating rings
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(2 + i * 0.6, 0.01, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0x6c5ce7 : 0x00cec9,
      transparent: true,
      opacity: 0.15 + i * 0.05,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + i * 0.3;
    ring.rotation.y = i * 0.5;
    scene.add(ring);
    rings.push(ring);
  }

  // Mouse parallax
  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Animation loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    mesh.rotation.x = t * 0.15;
    mesh.rotation.y = t * 0.2;
    core.rotation.x = -t * 0.1;
    core.rotation.y = t * 0.25;
    particles.rotation.y = t * 0.05;

    rings.forEach((ring, i) => {
      ring.rotation.z = t * (0.1 + i * 0.05);
    });

    camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 0.3 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
