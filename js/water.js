var WIDTH = 128;
var NUM_TEXELS = WIDTH * WIDTH;

// Water size in system units
var BOUNDS = 512;
var BOUNDS_HALF = BOUNDS * 0.5;

// Boat constants
const RADIUS = 8;
const SEGMENTS = 16;
const RINGS = 16;

// Game constants
const BUOYANCY_CONSTANT = 0.7;
const LIFE_HEIGHT = 2 * RADIUS;
const HULL_HEIGHT = 0.95 * 255;
const LEAKINESS = 0.05;

var container;
var camera, scene, renderer, controls;
var gameScene, gameTexture, gameBuffer, gameLife = LIFE_HEIGHT;

var waterMesh;
var boatGeometry;
var gpuCompute;
var heightmapVariable;
var waterUniforms, boatUniforms, gameUniforms;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

init();
animate();

function init() {

  container = document.getElementById('glContainer');
  // document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 100, 350);
  camera.fov *= 0.5;
  camera.updateProjectionMatrix();

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableKeys = false;

  // document.addEventListener('keydown', function(event) {
  //   // W Pressed: Toggle wireframe
  //   if (event.keyCode === 87) {
  //     waterMesh.material.wireframe = ! waterMesh.material.wireframe;
  //     waterMesh.material.needsUpdate = true;
  //   }
  // } , false);
  window.addEventListener('resize', onWindowResize, false);

  initWater();
  initBoat();
  initGame();
  initWaves();
}

function initWater() {
  var geometry = new THREE.PlaneBufferGeometry(BOUNDS, BOUNDS, WIDTH - 1, WIDTH -1);

  var material = new THREE.ShaderMaterial({
    uniforms: {
      heightmap: { value: null }
    },
    vertexShader: document.getElementById('waterVertexShader').textContent,
    fragmentShader: document.getElementById('waterFragmentShader').textContent
  });

  material.defines.WIDTH = WIDTH.toFixed(1);
  material.defines.BOUNDS = BOUNDS.toFixed(1);
  waterUniforms = material.uniforms;

  waterMesh = new THREE.Mesh(geometry, material);
  waterMesh.rotation.x = - Math.PI / 2;
  waterMesh.matrixAutoUpdate = false;
  waterMesh.updateMatrix();

  scene.add(waterMesh);
}

function initBoat() {
  boatGeometry = new THREE.SphereGeometry(RADIUS, SEGMENTS, RINGS);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      heightmap: { value: null }
    },
    vertexShader: document.getElementById('boatVertexShader').textContent,
    fragmentShader: document.getElementById('boatFragmentShader').textContent
  });

  material.defines.BOAT_HALF_HEIGHT = RADIUS.toFixed(1);
  material.defines.BUOYANCY_CONSTANT = BUOYANCY_CONSTANT.toFixed(1);
  boatUniforms = material.uniforms;

  const boatMesh = new THREE.Mesh(boatGeometry, material);

  scene.add(boatMesh);
}

function initGame() {
  gameScene = new THREE.Scene();
  gameTexture = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight );
  gameTexture.texture.minFilter = THREE.LinearFilter;
  gameBuffer = new Uint8Array(4);

  var geometry = new THREE.PlaneBufferGeometry(BOUNDS, BOUNDS, WIDTH - 1, WIDTH -1);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      heightmap: { value: null }
    },
    vertexShader: document.getElementById('gameVertexShader').textContent,
    fragmentShader: document.getElementById('gameFragmentShader').textContent
  });

  material.defines.BOAT_HEIGHT = (2 * RADIUS).toFixed(1);
  material.defines.BUOYANCY_CONSTANT = BUOYANCY_CONSTANT.toFixed(1);
  gameUniforms = material.uniforms;

  const gameMesh = new THREE.Mesh(geometry, material);

  gameScene.add(gameMesh);
}

function initWaves() {
  gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

  var heightmap0 = gpuCompute.createTexture();
  fillTexture(heightmap0);
  heightmapVariable = gpuCompute.addVariable("heightmap", document.getElementById('heightmapFragmentShader').textContent, heightmap0);
  gpuCompute.setVariableDependencies(heightmapVariable, [ heightmapVariable ]);

  var inputsCanvas = document.getElementById('input');
  var inputsTexture = new THREE.CanvasTexture(inputsCanvas);

  heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);
  heightmapVariable.material.uniforms.keyInputs = { type: 't', value: inputsTexture };

  var error = gpuCompute.init();
  if (error !== null) {
    console.error(error);
  }
}

function fillTexture(texture) {
  var pixels = texture.image.data;
  var p = 0;
  for (var j = 0; j < WIDTH; j++) {
    for (var i = 0; i < WIDTH; i++) {
      pixels[ p + 0 ] = 0;
      pixels[ p + 1 ] = 0;
      pixels[ p + 2 ] = 0;
      pixels[ p + 3 ] = 1;
      p += 4;
    }
  }
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateGame() {
  var relHeight = gameBuffer[0];
  var sunkenness = 255 * (1 - (gameLife / LIFE_HEIGHT));
  if (relHeight > (HULL_HEIGHT - sunkenness)) {
    gameLife -= LEAKINESS;
    boatGeometry.translate(0, -LEAKINESS, 0);
    boatGeometry.needsUpdate = true;
  }
  if (gameLife < 0) {
    endGame();
    gameLife = LIFE_HEIGHT;
    boatGeometry.translate(0, LIFE_HEIGHT, 0);
    boatGeometry.needsUpdate = true;
    console.log('MUAHAHAHAHAHAAHAAAAAA');
  }
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  // Set uniforms: keyboard interaction
  var uniforms = heightmapVariable.material.uniforms;
  if (_updates) {
    uniforms.keyInputs.value.needsUpdate = true;
    _updates = false;
  }

  // Do the gpu computation
  gpuCompute.compute();

  // Get compute output in custom uniform
  var waveBuf = gpuCompute.getCurrentRenderTarget(heightmapVariable);
  var waves = waveBuf.texture;
  waterUniforms.heightmap.value = waves;
  boatUniforms.heightmap.value = waves;
  gameUniforms.heightmap.value = waves;

  // Read game state
  renderer.render(gameScene, camera, gameTexture);
  renderer.readRenderTargetPixels(gameTexture, 0, 0, 1, 1, gameBuffer);
  updateGame();

  // Render
  renderer.render(scene, camera);
}
