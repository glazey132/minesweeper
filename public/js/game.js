const $ = window.$;

/**
// Manage gameState of game (local storage)
**/

const getGameState = () => {
  return JSON.parse(localStorage.getItem("gameState"));
};

const saveGameState = gameState => {
  localStorage.setItem("gameState", JSON.stringify(gameState));
};

const generateSquare = (row, column) => {
  return `
    <div
      class="square"
      id=square${row}-${column}
    ></div>
  `;
};

const generateNumberSquare = (row, column, number) => {
  const color = [
    "",
    "dodgerblue",
    "lime",
    "orange",
    "teal",
    "orange",
    "blue",
    "violet",
    "indigo"
  ][number];
  return `
    <div
      class="square non-bomb-clicked-square ${color}"
      id=square${row}-${column}
    >
      ${number ? number : ""}
    </div>
  `;
};

const generateFlaggedSquare = (row, column) => {
  return `
    <img
      src="./resources/flag.png"
      class="square"
      id=square${row}-${column}
    ></img>
  `;
};

const generateRevealedBomb = (row, column, wonGame) => {
  const winOrLose = wonGame ? "show-bomb-win" : "show-bomb-lose";
  return `
    <img
      src="./resources/mine.png"
      class="square ${winOrLose}"
      id=square${row}-${column}
    ></img>
  `;
};

const generateRow = rowNumber => {
  return `
    <div
      class="mine-row"
      id=row${rowNumber}
    ></div>
  `;
};

const hideMessageDiv = messageType => {
  return `
    <div
      id=${messageType}
      class="hide-message"
    ></div>
  `;
};

const generateEndGameMessage = wonGame => {
  return `
    <div id="endGame" class="end-message">
      ${wonGame ? "You win!" : "Game Over :("}
    </div>
  `;
};

const generateTimerString = gameLength => {
  return `
    <div id="timer" class="timer-message">
      ${gameLength} seconds
    </div>
  `;
};

const generateNewGameBoard = (rows, columns, bombNumber) => {
  console.log("rows, columns, bomb count ", rows, columns, bombNumber);
  const squaresMap = {};

  //clear the board
  $("#gameBoard").empty();
  //double for loop to make squares depending on rows and columns arguments
  for (var i = 0; i < rows; i++) {
    $("#gameBoard").append(generateRow(i));
    for (var j = 0; j < columns; j++) {
      const squareId = `${i}-${j}`;
      squaresMap[squareId] = {
        isBomb: false,
        isSelected: false,
        isFlagged: false
      };
      $(`#row${i}`).append(generateSquare(i, j));
    }
  }

  const gameState = {
    rows,
    columns,
    bombNumber,
    squaresMap,
    squaresFlaggedCount: 0,
    gameOver: false,
    areBombsSet: false,
    isGameStarted: false,
    gameStartTime: null,
    timerId: null
  };
  saveGameState(gameState);
};

const placeBombs = id => {
  const gameState = getGameState();
  const bombMap = {};
  while (Object.keys(bombMap).length < parseInt(gameState.bombNumber)) {
    const row = Math.floor(Math.random() * parseInt(gameState.rows));
    const column = Math.floor(Math.random() * parseInt(gameState.columns));
    if (id !== `${row}-${column}`) {
      bombMap[`${row}-${column}`] = true;
    }
  }
  console.log("the bombMap ", bombMap);
  //set squares that are bomb to have isBomb property in game state
  for (const bombId in bombMap) {
    if (bombMap.hasOwnProperty(bombId)) {
      gameState.squaresMap[bombId].isBomb = true;
    }
  }

  gameState.areBombsSet = true;
  saveGameState(gameState);
};

const flagToggle = id => {
  const gameState = getGameState();
  const [row, column] = id.split("-").map(int => parseInt(int));
  if (gameState.squaresMap[id].isSelected) return;
  else if (gameState.squaresMap[id].isFlagged)
    $(`#squaresMap${id}`).replaceWith(generateSquare(row, column));
  else $(`#squaresMap${id}`).replaceWith(generateFlaggedSquare(row, column));
  gameState.squaresMap[id].isFlagged = !gameState.squaresMap[id].isFlagged;
  saveGameState(gameState);
};

const revealSquare = id => {
  const gameState = getGameState();
  const cascadeRevealStack = [id];
  const visitedSquares = {};
  visitedSquares[id] = true;

  while (cascadeRevealStack.length > 0) {
    const currentSquareId = cascadeRevealStack.pop();
    let adjacentBombCounter = 0;
    const [row, column] = currentSquareId.split("-").map(int => parseInt(int));
    const safeNeighborSquareIds = [];

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (
          row + i < 0 ||
          row + i >= parseInt(gameState.rows) ||
          column + j < 0 ||
          column + j >= parseInt(gameState.columns)
        ) {
          continue;
        }
        const adjacentSquareId = `${row + i}-${column + j}`;
        if (visitedSquares[adjacentSquareId]) continue;
        if (gameState.squaresMap[adjacentSquareId].isBomb === true)
          adjacentBombCounter++;
        else safeNeighborSquareIds.push(adjacentSquareId);
      }
    }
    $(`#square${row}-${column}`).replaceWith(
      generateNumberSquare(row, column, adjacentBombCounter)
    );
    gameState.squaresMap[`${row}-${column}`].isSelected = true;

    if (adjacentBombCounter === 0) {
      safeNeighborSquareIds.forEach(squareId => {
        cascadeRevealStack.push(squareId);
        visitedSquares[squareId] = true;
      });
    }

    let uncoveredSquaresCount = 0;
    for (const squareId in gameState.squaresMap) {
      if (gameState.squaresMap.hasOwnProperty(squareId)) {
        if (gameState.squaresMap[squareId].isSelected === true) {
          uncoveredSquaresCount++;
        }
      }
    }

    saveGameState(gameState);
    if (
      uncoveredSquaresCount + parseInt(gameState.bombNumber) ===
      parseInt(gameState.rows * gameState.columns)
    )
      gameOver(true);
  }
};

const gameOver = wonGame => {
  const gameState = getGameState();
  gameState.gameOver = true;
  clearInterval(gameState.timerId);
  setEndBackground(wonGame);
  showEndGameMessage(wonGame);
  showBombs(wonGame);
  saveGameState(gameState);
};

const setEndBackground = wonGame => {
  if (wonGame) {
    $("#game").addClass("game-won");
  } else if (!wonGame) {
    $("#game").addClass("game-lost");
  }
};

const showEndGameMessage = wonGame => {
  $("#endGame").replaceWith(generateEndGameMessage(wonGame));
};

const clearMessageChambers = () => {
  $("#endGame").replaceWith(hideMessageDiv("endGame"));
  $("#timer").replaceWith(hideMessageDiv("timer"));
};

const showBombs = wonGame => {
  const gameState = getGameState();
  for (let row = 0; row < parseInt(gameState.rows); row++) {
    for (let column = 0; column < parseInt(gameState.columns); column++) {
      if (gameState.squaresMap[`${row}-${column}`].isBomb === true) {
        $(`#square${row}-${column}`).replaceWith(
          generateRevealedBomb(row, column, wonGame)
        );
      }
    }
  }
};

const startTimer = () => {
  const gameState = getGameState();
  const startTime = Date.now();
  console.log("start time: ", startTime);
  const timerId = setInterval(setTimer, 1000);
  gameState.gameStartTime = startTime;
  gameState.timerId = timerId;
  gameState.isGameStarted = true;
  $("#timer").replaceWith(generateTimerString(0));
  saveGameState(gameState);
};

const setTimer = () => {
  const gameState = getGameState();
  const gameLength = Math.round((Date.now() - gameState.gameStartTime) / 1000);
  $("#timer").replaceWith(generateTimerString(gameLength));
};

const clearTimer = timerId => {
  if (!timerId) {
    const gameState = getGameState();
    if (gameState.timerId !== null) {
      clearInterval(gameState.timerId);
    }
  } else clearInterval(timerId);
};

$(document).ready(() => {
  let gameState = getGameState();
  $("#startGameButton").click(event => {
    event.preventDefault();
    const rowNumber = $("#rowsInput").val() ? $("#rowsInput").val() : 10;
    const columnNumber = $("#columnsInput").val()
      ? $("#columnsInput").val()
      : 10;
    const bombNumber = $("#bombsInput").val() ? $("#bombsInput").val() : 10;
    clearTimer();
    clearMessageChambers();
    generateNewGameBoard(rowNumber, columnNumber, bombNumber);
  });

  $("#gameBoard").delegate(".square", "click", event => {
    event.preventDefault();
    const gameState = getGameState();
    const id = event.target.id.slice(6);
    console.log("game state after gameboard sq click: ", gameState);
    console.log("the id on gameboard square click ", id);
    if (!gameState.areBombsSet) placeBombs(id);
    if (!gameState.isGameStarted) startTimer();
    else if (gameState.squaresMap[id].isSelected) return;
    else if (gameState.squaresMap[id].isFlagged) return;
    else if (gameState.squaresMap[id].isBomb) gameOver(false);
    else revealSquare(id);
  });
});
