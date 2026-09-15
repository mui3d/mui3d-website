const productVariants = [
  {
    id: 'variant-a',
    name: 'Variant A',
    render: '../assets/images/products/variant-a-render.webp',
    model: '../assets/models/variant-a.glb',
    description: 'Flowing curves form a layered surface, creating a sense of movement and depth.',
    features: ['Sculpted curved surface', 'Paired metal bowls', 'Shared center and screw assembly']
  },
  {
    id: 'variant-b',
    name: 'Variant B',
    render: '../assets/images/products/variant-b-render.webp',
    model: '../assets/models/variant-b.glb',
    description: 'An irregular Voronoi pattern creates organically shaped openings with a distinctive, unpredictable character.',
    features: ['Voronoi-inspired openings', 'Irregular openwork pattern', 'Shared center and screw assembly']
  },
  {
    id: 'variant-c',
    name: 'Variant C',
    render: '../assets/images/products/variant-c-render.webp?v=90db5eb82e7c',
    model: '../assets/models/variant-c.glb?v=blender-export-20260915',
    description: 'Hexagonal openings meet a stepped outer silhouette, creating a bold geometric rhythm of structure and open space.',
    features: ['Hexagonal openwork', 'Solid bowl roots', 'Shared center and screw assembly']
  },
  {
    id: 'variant-d',
    comingSoon: true,
    name: 'Variant D',
    render: '../assets/images/products/studio-background.webp',
    description: 'A new design is in development.',
    features: []
  }
].filter((variant) => variant.available !== false);

const variantList = document.getElementById('variant-list');
const variantCount = document.getElementById('variant-count');
const renderWrap = document.querySelector('.showcase__render-wrap');
const productRender = document.getElementById('product-render');
const mediaStage = document.getElementById('media-stage');
const viewerElement = document.getElementById('viewer');
const viewerStatus = document.getElementById('viewer-status');
const viewerToggle = document.getElementById('view-3d');
const viewerToggleLabel = document.getElementById('viewer-toggle-label');
const editionNumber = document.getElementById('edition-number');
const productCopy = document.getElementById('product-copy');
const productName = document.getElementById('product-name');
const productDescription = document.getElementById('product-description');

// Single source of truth for the active variant. Both the 2D render and
// the 3D viewer must always read from this value — never from their own
// locally cached copy of "which variant is showing".
let currentVariantIndex = 0;
let viewerOpen = false;
let scene;
let camera;
let renderer;
let controls;
let loader;
let activeModel;
let animationFrame;
let loadToken = 0;
let THREE;
let GLTFLoader;
let OrbitControls;
let renderToken = 0;
let renderTimer;
let copyTimer;
let modelRequest;
let viewerInit;
let modeToken = 0;
let resizeObserver;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function createVariantButtons() {
  productVariants.forEach((variant, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `variant-button${index === 0 ? ' is-active' : ''}`;
    button.dataset.index = String(index);
    button.setAttribute('aria-pressed', String(index === 0));
    button.innerHTML = `<span class="variant-button__number">${String(index + 1).padStart(2, '0')}</span><span>${variant.name}</span>`;
    button.addEventListener('click', () => selectVariant(index));
    variantList.appendChild(button);
  });
}

function updateProductCopy(variant, index) {
  productName.textContent = variant.name;
  productDescription.textContent = variant.description;
  const displayIndex = String(index + 1).padStart(2, '0');
  editionNumber.textContent = displayIndex;
  variantCount.textContent = `${displayIndex} / ${String(productVariants.length).padStart(2, '0')}`;
}

function selectVariant(index) {
  if (index === currentVariantIndex || !productVariants[index]) return;
  currentVariantIndex = index;
  applyCurrentVariant();
}

// Single point of truth for pushing currentVariantIndex out to both views.
// This always keeps the 2D render in sync (even while it's hidden behind
// the 3D viewer) and keeps the GLB in sync whenever the viewer is active,
// so toggling between 2D/3D can never reveal a stale variant.
function applyCurrentVariant(animate = true) {
  const index = currentVariantIndex;
  const variant = productVariants[index];
  viewerToggle.disabled = false;
  viewerToggleLabel.textContent = viewerOpen ? 'Return to Preview' : 'View Interactive 3D';
  mediaStage.classList.toggle('is-coming-soon', Boolean(variant.comingSoon));

  variantList.querySelectorAll('.variant-button').forEach((button, buttonIndex) => {
    const isActive = buttonIndex === index;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  clearTimeout(copyTimer);
  updateProductCopy(variant, index);
  productCopy.classList.toggle('is-changing', animate && !reducedMotion.matches);
  copyTimer = window.setTimeout(() => productCopy.classList.remove('is-changing'), 160);
  updateRender(animate && !viewerOpen);
  if (viewerOpen) {
    if (variant.comingSoon) {
      ++modeToken;
      ++loadToken;
      modelRequest?.abort();
      modelRequest = null;
      unloadModel();
      mediaStage.setAttribute('aria-busy', 'false');
      setStatus('Coming Soon');
      requestRender();
    } else if (loader) {
      loadModel(variant.model);
    } else {
      openViewer();
    }
  }
}

function updateRender(animate = true) {
  const token = ++renderToken;
  const variant = productVariants[currentVariantIndex];
  clearTimeout(renderTimer);
  renderWrap.classList.toggle('is-changing', animate && !reducedMotion.matches);
  if (!viewerOpen) setStatus('');
  renderTimer = window.setTimeout(async () => {
    const nextImage = new Image();
    nextImage.src = variant.render;
    try {
      await nextImage.decode();
      if (token !== renderToken) return;
      productRender.src = variant.render;
      productRender.alt = variant.comingSoon ? 'Mui3D empty studio background' : `${variant.name} rendered preview`;
      if (!viewerOpen) setStatus(variant.comingSoon ? 'Coming Soon' : '');
    } catch {
      if (token !== renderToken) return;
      productRender.removeAttribute('src');
      productRender.alt = `${variant.name} preview unavailable`;
      if (!viewerOpen) setStatus(variant.comingSoon ? 'Coming Soon' : 'Preview unavailable. You can still view this model in 3D.');
    } finally {
      if (token === renderToken) renderWrap.classList.remove('is-changing');
    }
  }, animate && !reducedMotion.matches ? 180 : 0);
}

async function initViewer() {
  setStatus('Preparing interactive viewer');
  const [threeModule, loaderModule, controlsModule] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/controls/OrbitControls.js')
  ]);
  THREE = threeModule;
  GLTFLoader = loaderModule.GLTFLoader;
  OrbitControls = controlsModule.OrbitControls;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.01, 1000);
  camera.position.set(4.2, 28, 120);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  viewerElement.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 80;
  controls.maxDistance = 650;
  controls.target.set(0, 0.15, 0);

  scene.add(new THREE.HemisphereLight(0xe8f5ff, 0xffa64d, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x00aaff, 2.2);
  rimLight.position.set(-4, 2, -4);
  scene.add(rimLight);

  loader = new GLTFLoader();
  resizeViewer();
  controls.addEventListener('change', requestRender);
  resizeObserver = new ResizeObserver(resizeViewer);
  resizeObserver.observe(mediaStage);
}

function resizeViewer() {
  if (!renderer || !camera) return;
  const { clientWidth, clientHeight } = mediaStage;
  if (!clientWidth || !clientHeight) return;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
  requestRender();
}

function requestRender() {
  if (animationFrame || !renderer || !viewerOpen || document.hidden) return;
  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = null;
    if (!viewerOpen || document.hidden) return;
    controls.update();
    renderer.render(scene, camera);
  });
}

function disposeModel(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.filter(Boolean).forEach((material) => materials.add(material));
  });
  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (value?.isTexture) textures.add(value);
    });
    material.dispose();
  });
  const images = new Set();
  textures.forEach((texture) => {
    if (texture.image) images.add(texture.image);
    texture.dispose();
  });
  images.forEach((image) => image.close?.());
  geometries.forEach((geometry) => geometry.dispose());
}

function unloadModel() {
  if (!activeModel) return;
  scene.remove(activeModel);
  disposeModel(activeModel);
  activeModel = null;
  requestRender();
}

function setStatus(message) {
  viewerStatus.textContent = message;
  viewerStatus.classList.toggle('is-visible', Boolean(message));
}

async function loadModel(path) {
  const token = ++loadToken;
  modelRequest?.abort();
  const request = new AbortController();
  modelRequest = request;
  unloadModel();
  mediaStage.setAttribute('aria-busy', 'true');
  setStatus('Loading interactive model');
  try {
    const url = new URL(path, document.baseURI);
    const response = await fetch(url, { signal: request.signal });
    if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (token !== loadToken || !viewerOpen) return;
    const gltf = await loader.parseAsync(bytes, new URL('.', url).href);
    if (token !== loadToken || !viewerOpen) {
      gltf.scenes.forEach(disposeModel);
      return;
    }
    activeModel = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(activeModel);
    activeModel.position.sub(bounds.getCenter(new THREE.Vector3()));
    scene.add(activeModel);
    setStatus('');
    requestRender();
  } catch (error) {
    if (token === loadToken && error.name !== 'AbortError') {
      setStatus('Model unavailable. Return to the preview and try 3D again.');
    }
  } finally {
    if (token === loadToken) {
      mediaStage.setAttribute('aria-busy', 'false');
      modelRequest = null;
    }
  }
}

async function openViewer() {
  const token = ++modeToken;
  viewerOpen = true;
  viewerToggle.setAttribute('aria-pressed', 'true');
  viewerToggleLabel.textContent = 'Return to Preview';
  renderWrap.classList.add('is-hidden');
  viewerElement.classList.add('is-active');
  mediaStage.setAttribute('aria-busy', 'true');

  if (productVariants[currentVariantIndex].comingSoon) {
    mediaStage.setAttribute('aria-busy', 'false');
    setStatus('Coming Soon');
    requestRender();
    return;
  }

  try {
    if (!viewerInit) viewerInit = initViewer().catch((error) => {
      resizeObserver?.disconnect();
      controls?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      renderer = null;
      loader = null;
      viewerInit = null;
      throw error;
    });
    await viewerInit;
    if (!viewerOpen || token !== modeToken) return;
    resizeViewer();
    // Always load whichever variant is currently selected — this is what
    // guarantees entering 3D never shows a stale/previous variant.
    loadModel(productVariants[currentVariantIndex].model);
  } catch (error) {
    if (viewerOpen && token === modeToken) {
      setStatus('3D unavailable. Return to the preview and try again.');
      mediaStage.setAttribute('aria-busy', 'false');
    }
  }
}

function closeViewer() {
  viewerOpen = false;
  ++modeToken;
  ++loadToken;
  modelRequest?.abort();
  modelRequest = null;
  window.cancelAnimationFrame(animationFrame);
  animationFrame = null;
  unloadModel();
  mediaStage.setAttribute('aria-busy', 'false');
  setStatus('');
  viewerToggle.setAttribute('aria-pressed', 'false');
  viewerToggleLabel.textContent = 'View Interactive 3D';
  viewerElement.classList.remove('is-active');
  renderWrap.classList.remove('is-hidden');
  updateRender(false);
}

viewerToggle.addEventListener('click', async () => {
  if (viewerOpen) closeViewer();
  else await openViewer();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  } else requestRender();
});

createVariantButtons();
applyCurrentVariant(false);
