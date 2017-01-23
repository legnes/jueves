var endGame;
(function() {

  var GAME_STATES = {
    START: 'start',
    GAME: 'game',
    OVER: 'over',
    READY: 'ready'
  }
  var gameState = GAME_STATES.START;

  function remove(elt) {
    elt.parentNode.removeChild(elt);
  }

  function add(elt) {
    document.body.appendChild(elt);
  }

  function _startGame(state) {
    if (state === GAME_STATES.START) {
      remove(introScreen);
      audio.play();
      return GAME_STATES.GAME;
    }
  }

  function _endGame() {
    if (gameState === GAME_STATES.GAME) {
      add(overScreen);
      gameState = GAME_STATES.OVER;
      setTimeout(function() {
        gameState = GAME_STATES.READY;
      }, 10000);
    }
  }

  function _resetGame(state) {
    if (state === GAME_STATES.READY) {
      remove(overScreen);
      add(introScreen);
      return GAME_STATES.START;
    }
  }

  document.addEventListener('keydown', function(evt) {
    var state = gameState;
    gameState = _startGame(state) || gameState;
    // gameState = _endGame(state) || gameState;
    gameState = _resetGame(state) || gameState;
  });

  endGame = _endGame;

  var introScreen = document.getElementsByClassName('start-screen')[0];
  var gameScreen = document.getElementsByClassName('game-screen')[0];
  var overScreen = document.getElementsByClassName('over-screen')[0];
  remove(overScreen);

  var audio = new Audio('assets/dan00b.mp3');
  audio.addEventListener('ended', function() {
    audio.currentTime = 0;
    setTimeout(function() {
      if (gameState === GAME_STATES.GAME) {
        audio.play();
      }
    }, 5000);
  });

})();