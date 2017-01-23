var _updates = false;
(function() {
const KEY_WIDTH = 15;
const PIXEL_WIDTH = 128;
const BRANE_WIDTH = 15;
const KEY_HEIGHT = 5;
const PIXEL_HEIGHT = PIXEL_WIDTH;
const BRANE_HEIGHT = BRANE_WIDTH;
const PPB = PIXEL_WIDTH / BRANE_WIDTH;
const BPK = BRANE_WIDTH / KEY_WIDTH;
const KEY_START = Math.floor((BRANE_HEIGHT - KEY_HEIGHT * BPK) / 2) * BRANE_WIDTH;

const ACTIVE_COLOR = 'rgba(0,0,0,1)';
const BASE_COLOR = 'rgba(255,153,153,1)';

var canvas, ctx, brane;

function initMap() {
  brane = [];
  for (var i = 0; i < BRANE_WIDTH * BRANE_HEIGHT; i++) {
    brane.push(0);
  }
}

function initCanvas() {
  canvas = document.getElementById('input');
  canvas.setAttribute('width', PIXEL_WIDTH);
  canvas.setAttribute('height', PIXEL_HEIGHT);
  ctx = canvas.getContext('2d');
}

function initInput() {
  function toggleKey(key, val) {
    if (!key || (typeof key.val !== 'undefined' && key.val === val)) return;
    key.val = val;
    var braneStart = KEY_START + (Math.floor(key.start / KEY_WIDTH) * BPK * BRANE_WIDTH) + ((key.start % KEY_WIDTH) * BPK);
    for (var i = 0; i < BPK; i++) {
      for (var j = 0; j < key.width * BPK; j++) {
        var uv = braneStart + i * BRANE_WIDTH + j;
        brane[uv] = val;
      }
    }
    _updates = true;
  }

  document.addEventListener('keydown', function(evt) {
    evt.preventDefault();
    toggleKey(KEYS[evt.code], 1);
  });

  document.addEventListener('keyup', function(evt) {
    evt.preventDefault();
    if (evt.code === 'Escape') return run = false;
    toggleKey(KEYS[evt.code], 0);
  });
}

function animate(ts) {
  for (var i = 0; i < BRANE_HEIGHT; i++) {
    for (var j = 0; j < BRANE_WIDTH; j++) {
      var uv = i * BRANE_WIDTH + j;
      ctx.fillStyle = brane[uv] ? ACTIVE_COLOR : BASE_COLOR;
      ctx.fillRect(j * PPB, i * PPB, PPB, PPB);
    }
  }
  if (run) window.requestAnimationFrame(animate);
}

var run = true;
initMap();
initCanvas();
initInput();
animate();
})();
