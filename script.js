let turnCount = 0;
const HALF_1_TURNS = 10;
let phase = "placement";

let currentPlayer = "white";
let board = Array(64).fill("");
let selectedCard = null;
let selectedSquare = null;
let statusMessage = "HALF 1 — White: pick a card and place it on your starting rows.";
let gameOver = false;
let winner = null;

let currency = {
  white: 20,
  black: 20,
};

const cardCosts = {
  P: 1,
  R: 3,
  N: 3,
  Q: 5,
  B: 3,
};

let hands = {
  white: ["R", "P", "B", "N", "Q"],
  black: ["R", "P", "B", "N", "Q"],
};

const handEl   = document.getElementById("hand");
const boardEl  = document.getElementById("board");
const statusEl = document.getElementById("status");

function isPlacementPhase() {
  return phase === "placement";
}

function checkPhaseTransition() {
  if (phase === "placement" && turnCount >= HALF_1_TURNS) {
    phase = "battle";
    currency.white = 0;
    currency.black = 0;
    hands.white = ["R", "P", "B", "N", "Q"];
    hands.black = ["R", "P", "B", "N", "Q"];
    statusMessage =
      "⚔️  HALF 2 BEGINS! Gold resets to 0. Earn gold by capturing pieces. " +
      capitalize(currentPlayer) + "'s turn.";
  }
}

function getCardCost(card) {
  return cardCosts[card];
}

function canAffordCard(card, player) {
  return currency[player] >= cardCosts[card];
}

function endGame(player) {
  winner   = player;
  gameOver = true;
  statusMessage = capitalize(player) + " won by capturing the king!";
}

function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1);
}

function removeSelectedCardFromHand() {
  const hand  = hands[currentPlayer];
  const index = hand.indexOf(selectedCard);
  if (index !== -1) hand.splice(index, 1);
}

function switchPlayer() {
  currentPlayer = currentPlayer === "white" ? "black" : "white";
}

function canPlaceOnRow(row, player) {
  if (player === "white") return row >= 6;
  return row <= 1;
}

function getPieceOwner(piece) {
  if (piece === "") return null;
  return piece[0] === "W" ? "white" : "black";
}

function getPieceType(piece) {
  if (piece === "") return null;
  return piece[1];
}

const symbols = {
  white: { R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙" },
  black: { R: "♜", N: "♞", B: "♝", Q: "♛", K: "♚", P: "♟" },
};

function getPieceSymbol(piece) {
  if (piece === "") return "";
  return symbols[getPieceOwner(piece)]?.[getPieceType(piece)] || "";
}

function getCardSymbol(card, player) {
  if (!card) return "";
  return symbols[player]?.[card] || card;
}

function isValidRookMove(fromIndex, toIndex) {
  const fromRow = Math.floor(fromIndex / 8);
  const fromCol = fromIndex % 8;
  const toRow   = Math.floor(toIndex / 8);
  const toCol   = toIndex % 8;
  return fromRow === toRow || fromCol === toCol;
}

function isPathClear(fromIndex, toIndex) {
  const fromRow = Math.floor(fromIndex / 8);
  const fromCol = fromIndex % 8;
  const toRow   = Math.floor(toIndex / 8);
  const toCol   = toIndex % 8;

  let rowStep = 0;
  let colStep = 0;

  if (toRow > fromRow) rowStep =  1;
  if (toRow < fromRow) rowStep = -1;
  if (toCol > fromCol) colStep =  1;
  if (toCol < fromCol) colStep = -1;

  let r = fromRow + rowStep;
  let c = fromCol + colStep;

  while (r !== toRow || c !== toCol) {
    if (board[r * 8 + c] !== "") return false;
    r += rowStep;
    c += colStep;
  }

  return true;
}

function renderStatus() {
  const phaseLabel = isPlacementPhase()
    ? "[HALF 1 — Placement] "
    : "[HALF 2 — Battle] ";

  const turnsLeft = isPlacementPhase()
    ? " | Turns left in Half 1: " + (HALF_1_TURNS - turnCount)
    : "";

  const gold =
    " | White gold: " + currency.white +
    " | Black gold: " + currency.black;

  if (gameOver) {
    statusEl.textContent = "Game Over — " + capitalize(winner) + " wins! " + statusMessage + gold;
    return;
  }

  statusEl.textContent = phaseLabel + statusMessage + turnsLeft + gold;
}

function renderHand() {
  handEl.innerHTML = "";
  const currentHand = hands[currentPlayer];

  for (let card of currentHand) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card");

    if (selectedCard === card) cardEl.classList.add("selected");

    cardEl.textContent = getCardSymbol(card, currentPlayer) + " (" + getCardCost(card) + "g)";

    cardEl.addEventListener("click", function () {
      if (gameOver) {
        statusMessage = "The game is over. Refresh to play again.";
        renderStatus();
        return;
      }

      if (!canAffordCard(card, currentPlayer)) {
        statusMessage = capitalize(currentPlayer) + " cannot afford " + getCardSymbol(card, currentPlayer) + ".";
        renderStatus();
        return;
      }

      selectedCard   = card;
      selectedSquare = null;
      statusMessage  =
        capitalize(currentPlayer) +
        " selected " + getCardSymbol(card, currentPlayer) +
        " (cost " + getCardCost(card) + ")";
      renderAll();
    });

    handEl.appendChild(cardEl);
  }
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let i = 0; i < 64; i++) {
    const squareEl = document.createElement("div");
    squareEl.classList.add("square");

    const row = Math.floor(i / 8);
    const col = i % 8;

    if ((row + col) % 2 === 0) {
      squareEl.classList.add("light");
    } else {
      squareEl.classList.add("dark");
    }

    squareEl.textContent = getPieceSymbol(board[i]);
    if (board[i] !== "") {
      squareEl.classList.add(getPieceOwner(board[i]) + "-piece");
    }

    squareEl.addEventListener("click", function () {
      handleSquareClick(i, row);
    });

    boardEl.appendChild(squareEl);
  }
}

function renderAll() {
  renderStatus();
  renderHand();
  renderBoard();
}

function handleSquareClick(i, row) {
  if (gameOver) {
    statusMessage = "The game is over. Refresh to play again.";
    renderStatus();
    return;
  }

  const clickedPiece = board[i];

  //Mode A: a card is selected:
  if (selectedCard) {
    if (clickedPiece !== "" && getPieceOwner(clickedPiece) === currentPlayer) {
      if (isPlacementPhase()) {
        statusMessage = "You cannot move pieces in Half 1 — place your cards!";
        renderStatus();
        return;
      }
      selectedCard = null;
      if (getPieceType(clickedPiece) !== "R") {
        statusMessage = "For now only rooks can move.";
        renderStatus();
        return;
      }
      selectedSquare = i;
      statusMessage  = capitalize(currentPlayer) + " selected a rook.";
      renderAll();
      return;
    }

    if (clickedPiece !== "" && getPieceOwner(clickedPiece) !== currentPlayer) {
      statusMessage = "That square is already taken.";
      renderStatus();
      return;
    }

    if (!canPlaceOnRow(row, currentPlayer)) {
      statusMessage = capitalize(currentPlayer) + " must place on their own starting rows.";
      renderStatus();
      return;
    }

    if (!canAffordCard(selectedCard, currentPlayer)) {
      statusMessage = capitalize(currentPlayer) + " does not have enough gold.";
      renderStatus();
      return;
    }

    const placedPiece    = currentPlayer[0].toUpperCase() + selectedCard;
    const playerWhoMoved = currentPlayer;
    const cost           = getCardCost(selectedCard);

    board[i] = placedPiece;
    currency[currentPlayer] -= cost;
    removeSelectedCardFromHand();
    selectedCard   = null;
    selectedSquare = null;

    turnCount++;
    checkPhaseTransition();
    switchPlayer();

    if (statusMessage.indexOf("HALF 2") === -1) {
      statusMessage =
        capitalize(playerWhoMoved) +
        " placed a piece. " +
        capitalize(currentPlayer) +
        "'s turn.";
    }

    renderAll();
    return;
  }

  //MODE B: a rook is already selected:
  if (selectedSquare !== null) {
    if (isPlacementPhase()) {
      statusMessage = "You cannot move pieces in Half 1 — place your cards!";
      selectedSquare = null;
      renderStatus();
      return;
    }

    const movingPiece = board[selectedSquare];

    if (i === selectedSquare) {
      selectedSquare = null;
      statusMessage  = capitalize(currentPlayer) + "'s turn.";
      renderAll();
      return;
    }

    if (getPieceOwner(movingPiece) !== currentPlayer) {
      statusMessage = "You can only move your own piece.";
      renderStatus();
      return;
    }

    if (getPieceType(movingPiece) !== "R") {
      statusMessage = "We can only move the rook for now.";
      renderStatus();
      return;
    }

    if (!isValidRookMove(selectedSquare, i)) {
      statusMessage = "Rooks move in straight lines.";
      renderStatus();
      return;
    }

    if (clickedPiece !== "" && getPieceOwner(clickedPiece) === currentPlayer) {
      if (getPieceType(clickedPiece) === "R") {
        selectedSquare = i;
        statusMessage  = capitalize(currentPlayer) + " selected a different rook.";
        renderAll();
        return;
      }
      statusMessage = "You cannot move onto your own piece.";
      renderStatus();
      return;
    }

    if (!isPathClear(selectedSquare, i)) {
      statusMessage = "Rooks cannot jump over pieces.";
      renderStatus();
      return;
    }

    const playerWhoMoved = currentPlayer;
    const capturedPiece  = board[i];

    board[i]              = movingPiece;
    board[selectedSquare] = "";
    selectedSquare        = null;

    if (capturedPiece !== "" && getPieceType(capturedPiece) === "K") {
      endGame(playerWhoMoved);
      renderAll();
      return;
    }

    if (capturedPiece !== "") {
      const reward = getCardCost(getPieceType(capturedPiece)) || 0;
      currency[playerWhoMoved] += reward;
    }

    turnCount++;
    switchPlayer();

    if (capturedPiece !== "") {
      statusMessage =
        capitalize(playerWhoMoved) +
        " captured a piece and earned " +
        (getCardCost(getPieceType(capturedPiece)) || 0) +
        " gold. " +
        capitalize(currentPlayer) + "'s turn.";
    } else {
      statusMessage =
        capitalize(playerWhoMoved) +
        " moved. " +
        capitalize(currentPlayer) + "'s turn.";
    }

    renderAll();
    return;
  }

  //Mode C: nothing is selected, so try to select something
  if (isPlacementPhase()) {
    statusMessage = "Half 1: pick a card from your hand to place.";
    renderStatus();
    return;
  }

  if (clickedPiece === "") {
    statusMessage = "Pick a card first.";
    renderStatus();
    return;
  }

  if (getPieceOwner(clickedPiece) !== currentPlayer) {
    statusMessage = "You can only select your own piece.";
    renderStatus();
    return;
  }

  if (getPieceType(clickedPiece) !== "R") {
    statusMessage = "For now only rooks can move.";
    renderStatus();
    return;
  }

  selectedSquare = i;
  selectedCard   = null;
  statusMessage  = capitalize(currentPlayer) + " selected a rook.";
  renderAll();
}

renderAll();