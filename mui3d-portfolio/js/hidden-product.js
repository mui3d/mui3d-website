const productVariants = [
  {
    id: 'variant-a',
    name: 'Variant A',
    render: '../assets/images/products/variant-a-render.webp',
    model: '../assets/models/variant-a.glb',
    description: 'A restrained sculptural form shaped around balance, clarity, and a precise studio finish.',
    features: ['Balanced geometric form', 'Studio-grade surface finish', 'Designed and made by Mui3D']
  },
  {
    id: 'variant-b',
    name: 'Variant B',
    render: '../assets/images/products/variant-b-render.webp',
    model: '../assets/models/variant-b.glb',
    description: 'A sharper expression with layered geometry and a stronger sense of mechanical rhythm.',
    features: ['Layered technical profile', 'High-contrast material treatment', 'Collector-scale presentation']
  },
  {
    id: 'variant-c',
    name: 'Variant C',
    render: '../assets/images/products/variant-c-render.webp',
    model: '../assets/models/variant-c.glb',
    description: 'An elongated edition that emphasizes motion through its silhouette and directional surfaces.',
    features: ['Extended dynamic silhouette', 'Directional surface detailing', 'Display-ready proportions']
  },
  {
    id: 'variant-d',
    name: 'Variant D',
    render: '../assets/images/products/variant-d-render.webp',
    model: '../assets/models/variant-d.glb',
    description: 'A compact, architectural interpretation designed for a quieter but equally deliberate presence.',
    features: ['Compact architectural form', 'Refined edge treatment', 'Small-footprint display format']
  },
  {
    id: 'variant-e',
    name: 'Variant E',
    render: '../assets/images/products/variant-e-render.webp',
    model: '../assets/models/variant-e.glb',
    description: 'The most expressive edition, combining character-led geometry with a dramatic final finish.',
    features: ['Character-led geometry', 'Premium dramatic finish', 'Limited concept edition']
  }
];

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
const productFeatures = document.getElementById('product-features');

let selectedIndex = 0;
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
  productFeatures.replaceChildren(...variant.features.map((feature) => {
    const item = document.createElement('li');
    item.textContent = feature;
    return item;
  }));
  const displayIndex = String(index + 1).padStart(2, '0');
  editionNumber.textContent = displayIndex;
  variantCount.textContent = `${displayIndex} / ${String(productVariants.length).padStart(2, '0')}`;
}

function selectVariant(index) {
  if (index === selectedIndex || !productVariants[index]) return;
  selectedIndex = index;
  const variant = productVariants[index];

  variantList.querySelectorAll('.variant-button').forEach((button, buttonIndex) => {
    const isActive = buttonIndex === index;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  productCopy.classList.add('is-changing');
  if (viewerOpen) {
    updateProductCopy(variant, index);
    window.setTimeout(() => productCopy.classList.remove('is-changing'), 160);
    if (loader) loadModel(variant.model);
    return;
  }

  renderWrap.classList.add('is-changing');
  window.setTimeout(() => {
    productRender.src = variant.render;
    productRender.alt = `${variant.name} rendered preview`;
    updateProductCopy(variant, index);
    productRender.decode().catch(() => {}).finally(() => {
      renderWrap.classList.remove('is-changing');
      productCopy.classList.remove('is-changing');
    });
  }, 220);
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
  scene.background = new THREE.Color(0x0c0e11);

  camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.01, 100);
  camera.position.set(4.2, 2.8, 5.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  viewerElement.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = true;
  controls.minDistance = 2;
  controls.maxDistance = 12;
  controls.target.set(0, 0.15, 0);

  scene.add(new THREE.HemisphereLight(0xe8f5ff, 0x1b2025, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xd7ff43, 2.2);
  rimLight.position.set(-4, 2, -4);
  scene.add(rimLight);

  loader = new GLTFLoader();
  resizeViewer();
  animateViewer();
  window.addEventListener('resize', resizeViewer);
}

function resizeViewer() {
  if (!renderer || !camera) return;
  const { clientWidth, clientHeight } = mediaStage;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
}

function animateViewer() {
  animationFrame = window.requestAnimationFrame(animateViewer);
  controls.update();
  renderer.render(scene, camera);
}

function disposeMaterial(material) {
  Object.values(material).forEach((value) => {
    if (value && value.isTexture) value.dispose();
  });
  material.dispose();
}

function unloadModel() {
  if (!activeModel) return;
  scene.remove(activeModel);
  activeModel.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
    else if (object.material) disposeMaterial(object.material);
  });
  activeModel = null;
}

function setStatus(message) {
  viewerStatus.textContent = message;
  viewerStatus.classList.toggle('is-visible', Boolean(message));
}

function loadModel(path) {
  const token = ++loadToken;
  unloadModel();
  setStatus('Loading interactive model');

  loader.load(
    path,
    (gltf) => {
      if (token !== loadToken) {
        gltf.scene.traverse((object) => object.geometry?.dispose());
        return;
      }
      activeModel = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(activeModel);
      const center = bounds.getCenter(new THREE.Vector3());
      activeModel.position.sub(center);
      scene.add(activeModel);
      setStatus('');
    },
    undefined,
    () => {
      if (token === loadToken) setStatus('Interactive model could not be loaded');
    }
  );
}

async function openViewer() {
  viewerOpen = true;
  viewerToggle.setAttribute('aria-pressed', 'true');
  viewerToggleLabel.textContent = 'Return to Render';
  renderWrap.classList.add('is-hidden');
  viewerElement.classList.add('is-active');
  viewerToggle.disabled = true;

  try {
    if (!renderer) await initViewer();
    if (!viewerOpen) return;
    resizeViewer();
    loadModel(productVariants[selectedIndex].model);
  } catch (error) {
    setStatus('Interactive viewer could not be loaded');
  } finally {
    viewerToggle.disabled = false;
  }
}

function closeViewer() {
  viewerOpen = false;
  ++loadToken;
  unloadModel();
  setStatus('');
  viewerToggle.setAttribute('aria-pressed', 'false');
  viewerToggleLabel.textContent = 'View Interactive 3D';
  viewerElement.classList.remove('is-active');
  renderWrap.classList.remove('is-hidden');
}

viewerToggle.addEventListener('click', async () => {
  if (viewerOpen) closeViewer();
  else await openViewer();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && animationFrame) window.cancelAnimationFrame(animationFrame);
  else if (!document.hidden && renderer) animateViewer();
});

createVariantButtons();
