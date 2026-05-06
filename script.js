// ─── State ────────────────────────────────────────────────────────────────────

let gamePhase = "setup";   // "setup" or "battle"
let gameOver  = false;
let winner    = null;

let currentPlayer  = "white";
let board          = Array(64).fill("");
let selectedCard   = null;
let selectedSquare = null;
let statusMessage  = "";

// Coin cost when buying a card; also the reward when capturing that piece type.
let currency = { white: 20, black: 20 };
const cardCosts = { P: 1, R: 3, N: 3, Q: 5, B: 3, K: 0 };

// Shop always lists these types (unlimited in battle; setup enforces limits below).
const SHOP_CARDS = ["K", "R", "P", "B", "N", "Q"];

// How many of each piece each player has placed during setup.
let purchaseCount = {
  white: { P: 0, R: 0, N: 0, B: 0, Q: 0, K: 0 },
  black: { P: 0, R: 0, N: 0, B: 0, Q: 0, K: 0 },
};
// Max purchases per card type in setup phase (K and Q are 1; others are 2).
const maxPurchase = { K: 1, Q: 1, R: 2, N: 2, B: 2, P: 2 };

// Battle turn runs in two phases: buy/place first, then move.
let battleTurnPhase = "buy";   // "buy" or "move"

// Squares the selected piece can legally move to.
let validMoveSquares = [];

const handEl   = document.getElementById("hand");
const boardEl  = document.getElementById("board");
const statusEl = document.getElementById("status");


// ─── Piece helpers ────────────────────────────────────────────────────────────

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
  return symbols[player]?.[card] || card;
}

function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1);
}

// Returns true once the player has placed their King in setup.
function kingPlacedBy(player) {
  return purchaseCount[player].K >= 1;
}


// ─── Movement ─────────────────────────────────────────────────────────────────

// Slides along each direction until hitting the board edge or a piece.
// Used by rook, bishop, and queen.
function slideMoves(index, owner, directions) {
  const moves = [];
  const row   = Math.floor(index / 8);
  const col   = index % 8;
  for (let [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = board[r * 8 + c];
      if (target === "") {
        moves.push(r * 8 + c);
      } else {
        if (getPieceOwner(target) !== owner) moves.push(r * 8 + c); // can capture
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function getRookMoves(index, owner) {
  return slideMoves(index, owner, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
}

function getBishopMoves(index, owner) {
  return slideMoves(index, owner, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
}

function getQueenMoves(index, owner) {
  return slideMoves(index, owner, [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]);
}

function getKnightMoves(index, owner) {
  const moves = [];
  const row   = Math.floor(index / 8);
  const col   = index % 8;
  for (let [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = board[r * 8 + c];
      if (target === "" || getPieceOwner(target) !== owner) moves.push(r * 8 + c);
    }
  }
  return moves;
}

function getPawnMoves(index, owner) {
  const moves    = [];
  const row      = Math.floor(index / 8);
  const col      = index % 8;
  const dir      = owner === "white" ? -1 : 1;   // white moves up (row decreases)
  const startRow = owner === "white" ? 6 : 1;

  // One square forward
  const r1 = row + dir;
  if (r1 >= 0 && r1 < 8 && board[r1 * 8 + col] === "") {
    moves.push(r1 * 8 + col);
    // Two squares on first move
    const r2 = row + dir * 2;
    if (row === startRow && r2 >= 0 && r2 < 8 && board[r2 * 8 + col] === "") {
      moves.push(r2 * 8 + col);
    }
  }
  // Diagonal captures
  for (let dc of [-1, 1]) {
    const c = col + dc;
    if (r1 >= 0 && r1 < 8 && c >= 0 && c < 8) {
      const target = board[r1 * 8 + c];
      if (target !== "" && getPieceOwner(target) !== owner) moves.push(r1 * 8 + c);
    }
  }
  return moves;
}

function getKingMoves(index, owner) {
  const moves = [];
  const row   = Math.floor(index / 8);
  const col   = index % 8;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = board[r * 8 + c];
        if (target === "" || getPieceOwner(target) !== owner) moves.push(r * 8 + c);
      }
    }
  }
  return moves;
}

function getValidMoves(index) {
  const type  = getPieceType(board[index]);
  const owner = getPieceOwner(board[index]);
  switch (type) {
    case "R": return getRookMoves(index, owner);
    case "B": return getBishopMoves(index, owner);
    case "Q": return getQueenMoves(index, owner);
    case "N": return getKnightMoves(index, owner);
    case "P": return getPawnMoves(index, owner);
    case "K": return getKingMoves(index, owner);
  }
  return [];
}


// ─── Game logic ───────────────────────────────────────────────────────────────

function isSetupPhase() {
  return gamePhase === "setup";
}

function canPlaceOnRow(row, player) {
  return player === "white" ? row >= 6 : row <= 1;
}

function switchPlayer() {
  currentPlayer = currentPlayer === "white" ? "black" : "white";
}

// Called at game start and after each player switch in setup.
// Auto-selects the King card when the current player hasn't placed theirs yet.
function initPlayerTurn() {
  if (isSetupPhase() && !kingPlacedBy(currentPlayer)) {
    selectedCard  = "K";
    statusMessage = capitalize(currentPlayer) + ": place your King on a starting square first!";
  }
}

// Skip the buy/place phase and go straight to moving.
function skipBuy() {
  if (gamePhase !== "battle" || battleTurnPhase !== "buy") return;
  battleTurnPhase  = "move";
  selectedCard     = null;
  validMoveSquares = [];
  statusMessage    = capitalize(currentPlayer) + ": select a piece to move, or click End Turn.";
  renderAll();
}

// End the move phase and pass the turn to the other player.
function endTurn() {
  if (gamePhase !== "battle") return;
  battleTurnPhase  = "buy";
  selectedSquare   = null;
  selectedCard     = null;
  validMoveSquares = [];
  switchPlayer();
  statusMessage = capitalize(currentPlayer) + "'s turn — buy/place a card, or click Skip.";
  renderAll();
}

function startBattle() {
  if (gamePhase !== "setup") return;
  if (!kingPlacedBy("white") || !kingPlacedBy("black")) {
    statusMessage = "Both players must place their King before starting the battle!";
    renderStatus();
    return;
  }
  gamePhase       = "battle";
  currency.white  = 0;
  currency.black  = 0;
  battleTurnPhase = "buy";
  statusMessage   =
    "⚔️ Battle begun! Coins reset to 0. Earn coins by capturing. " +
    capitalize(currentPlayer) + "'s turn.";
  renderAll();
}

function endGame(player) {
  winner   = player;
  gameOver = true;
  const banner = document.getElementById("game-over-banner");
  banner.textContent   = "🏆 " + capitalize(player) + " wins!";
  banner.style.display = "block";
}


// ─── Rendering ────────────────────────────────────────────────────────────────

function renderHUD() {
  document.getElementById("hud-phase").textContent =
    gamePhase === "setup" ? "Setup" : "Battle";
  document.getElementById("coins-white").textContent = currency.white;
  document.getElementById("coins-black").textContent = currency.black;
  document.getElementById("dot-white").classList.toggle("active", currentPlayer === "white");
  document.getElementById("dot-black").classList.toggle("active", currentPlayer === "black");
}

function renderStatus() {
  statusEl.textContent = gameOver
    ? capitalize(winner) + " captured the King and wins!"
    : statusMessage;
}

function renderHand() {
  handEl.innerHTML = "";
  const labelEl = document.getElementById("hand-label");

  let cards;
  let mode; // "setup" | "battle-buy" | "battle-move"

  if (isSetupPhase()) {
    // Only show cards the player can still buy (under their setup limit)
    cards = SHOP_CARDS.filter(c => purchaseCount[currentPlayer][c] < maxPurchase[c]);
    mode  = "setup";
    labelEl.textContent = "Shop — " + capitalize(currentPlayer);
  } else if (battleTurnPhase === "buy") {
    cards = SHOP_CARDS.filter(c => c !== "K");   // no second King in battle
    mode  = "battle-buy";
    labelEl.textContent = "Buy & place a card — or click Skip";
  } else {
    cards = [];
    mode  = "battle-move";
    labelEl.textContent = capitalize(currentPlayer) + ": select a piece to move";
  }

  for (let card of cards) {
    const cost      = cardCosts[card];
    const canAfford = currency[currentPlayer] >= cost;

    // Block non-King cards before King is placed (setup only)
    const kingLocked = isSetupPhase() && !kingPlacedBy(currentPlayer) && card !== "K";

    const cardEl = document.createElement("div");
    cardEl.classList.add("card");

    if (selectedCard === card && mode !== "battle-buy") cardEl.classList.add("selected");
    if (!canAfford || kingLocked) cardEl.classList.add("unaffordable");

    cardEl.innerHTML =
      '<span class="card-symbol">' + getCardSymbol(card, currentPlayer) + "</span>" +
      '<span class="card-cost">' + cost + "</span>";

    cardEl.addEventListener("click", function () {
      if (gameOver) return;

      if (kingLocked) {
        statusMessage = capitalize(currentPlayer) + " must place their King first!";
        renderStatus();
        return;
      }
      if (!canAfford) {
        statusMessage = "Not enough coins for " + getCardSymbol(card, currentPlayer) + ".";
        renderStatus();
        return;
      }

      // Select the card — clicking the board will place it
      selectedCard     = card;
      selectedSquare   = null;
      validMoveSquares = [];
      statusMessage    = capitalize(currentPlayer) + " selected " + getCardSymbol(card, currentPlayer) +
        " — click a starting-row square to place it.";
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
    squareEl.classList.add((row + col) % 2 === 0 ? "light" : "dark");

    const piece = board[i];
    if (piece !== "") {
      squareEl.textContent = getPieceSymbol(piece);
      squareEl.classList.add(getPieceOwner(piece) + "-piece");
    }

    if (i === selectedSquare) squareEl.classList.add("selected-piece");

    const isValidDest   = validMoveSquares.includes(i);
    const isEnemyTarget = isValidDest && piece !== "" && getPieceOwner(piece) !== currentPlayer;
    if (isValidDest && !isEnemyTarget) squareEl.classList.add("valid-move");
    if (isEnemyTarget)                  squareEl.classList.add("capturable");

    squareEl.addEventListener("click", function () {
      handleSquareClick(i, row);
    });

    boardEl.appendChild(squareEl);
  }
}

function renderAll() {
  renderHUD();
  renderStatus();
  renderHand();
  renderBoard();

  document.getElementById("start-battle-btn").style.display =
    (isSetupPhase() && !gameOver) ? "inline-block" : "none";

  document.getElementById("skip-buy-btn").style.display =
    (gamePhase === "battle" && battleTurnPhase === "buy" && !gameOver) ? "inline-block" : "none";

  document.getElementById("end-turn-btn").style.display =
    (gamePhase === "battle" && battleTurnPhase === "move" && !gameOver) ? "inline-block" : "none";
}


// ─── Square click handler ─────────────────────────────────────────────────────

function handleSquareClick(i, row) {
  if (gameOver) return;

  const clickedPiece = board[i];

  // ── MODE A: card selected → place it ────────────────────────────────────

  if (selectedCard !== null) {

    // In move phase, placing is not allowed
    if (gamePhase === "battle" && battleTurnPhase === "move") {
      statusMessage = "Buy/place phase has passed. Move a piece or click End Turn.";
      renderStatus();
      return;
    }

    // Clicking own piece while a card is selected: must place first
    if (clickedPiece !== "" && getPieceOwner(clickedPiece) === currentPlayer) {
      statusMessage = "Place the selected card first, or click Skip to move instead.";
      renderStatus();
      return;
    }

    if (clickedPiece !== "") {
      statusMessage = "That square is already occupied.";
      renderStatus();
      return;
    }

    if (!canPlaceOnRow(row, currentPlayer)) {
      statusMessage = capitalize(currentPlayer) + " must place on their own starting rows.";
      renderStatus();
      return;
    }

    if (currency[currentPlayer] < cardCosts[selectedCard]) {
      statusMessage = "Not enough coins.";
      renderStatus();
      return;
    }

    // === Place the piece ===
    const cardBeingPlaced = selectedCard;
    const playerPlacing   = currentPlayer;

    board[i]                = currentPlayer[0].toUpperCase() + cardBeingPlaced;
    currency[currentPlayer] -= cardCosts[cardBeingPlaced];

    selectedCard     = null;
    selectedSquare   = null;
    validMoveSquares = [];

    if (isSetupPhase()) {
      purchaseCount[currentPlayer][cardBeingPlaced]++;
      switchPlayer();
      initPlayerTurn();
      statusMessage = cardBeingPlaced === "K"
        ? capitalize(playerPlacing) + " placed their King! " + capitalize(currentPlayer) + "'s turn."
        : capitalize(playerPlacing) + " placed a piece. " + capitalize(currentPlayer) + "'s turn.";
    } else {
      // Battle buy phase: after placing, advance to move phase
      battleTurnPhase = "move";
      statusMessage   = "Piece placed! Now move a piece, or click End Turn.";
    }

    renderAll();
    return;
  }

  // ── MODE B: piece selected → move it ────────────────────────────────────

  if (selectedSquare !== null) {

    if (isSetupPhase()) {
      statusMessage    = "Pieces cannot move during setup.";
      selectedSquare   = null;
      validMoveSquares = [];
      renderAll();
      return;
    }

    // Can't move in buy phase
    if (battleTurnPhase === "buy") {
      statusMessage    = "Buy/place a card first — or click Skip to move.";
      selectedSquare   = null;
      validMoveSquares = [];
      renderAll();
      return;
    }

    // Click same square → deselect
    if (i === selectedSquare) {
      selectedSquare   = null;
      validMoveSquares = [];
      statusMessage    = capitalize(currentPlayer) + ": select a piece to move.";
      renderAll();
      return;
    }

    // Click a different own piece → switch selection
    if (clickedPiece !== "" && getPieceOwner(clickedPiece) === currentPlayer) {
      selectedSquare   = i;
      validMoveSquares = getValidMoves(i);
      statusMessage    = capitalize(currentPlayer) + " selected " + getPieceSymbol(clickedPiece) + ".";
      renderAll();
      return;
    }

    // Destination not in valid moves
    if (!validMoveSquares.includes(i)) {
      statusMessage = "That's not a valid move for this piece.";
      renderStatus();
      return;
    }

    // === Execute the move ===
    const movingPiece    = board[selectedSquare];
    const capturedPiece  = board[i];
    const playerWhoMoved = currentPlayer;

    board[i]              = movingPiece;
    board[selectedSquare] = "";
    selectedSquare        = null;
    validMoveSquares      = [];

    // King captured → game over
    if (capturedPiece !== "" && getPieceType(capturedPiece) === "K") {
      endGame(playerWhoMoved);
      renderAll();
      return;
    }

    // Award capture coins
    if (capturedPiece !== "") {
      const reward = cardCosts[getPieceType(capturedPiece)] || 0;
      currency[playerWhoMoved] += reward;
      statusMessage = capitalize(playerWhoMoved) + " captured a piece and earned " + reward +
        " coin" + (reward !== 1 ? "s" : "") + "!";
    } else {
      statusMessage = capitalize(playerWhoMoved) + " moved.";
    }

    // Move auto-ends the turn
    battleTurnPhase = "buy";
    switchPlayer();
    statusMessage += " " + capitalize(currentPlayer) + "'s turn — buy/place a card, or click Skip.";

    renderAll();
    return;
  }

  // ── MODE C: nothing selected → select a piece ───────────────────────────

  if (isSetupPhase()) {
    statusMessage = "Setup: pick a card from the shop above to place.";
    renderStatus();
    return;
  }

  // Can't select pieces in buy phase — must buy/place or skip first
  if (battleTurnPhase === "buy") {
    statusMessage = "Buy/place a card first — or click Skip to go straight to moving.";
    renderStatus();
    return;
  }

  if (clickedPiece === "") {
    statusMessage = "No piece there. Select one of your pieces on the board.";
    renderStatus();
    return;
  }

  if (getPieceOwner(clickedPiece) !== currentPlayer) {
    statusMessage = "That's " + capitalize(getPieceOwner(clickedPiece)) + "'s piece.";
    renderStatus();
    return;
  }

  selectedSquare   = i;
  selectedCard     = null;
  validMoveSquares = getValidMoves(i);
  statusMessage    = capitalize(currentPlayer) + " selected " + getPieceSymbol(clickedPiece) + ".";
  renderAll();
}


// ─── Start ────────────────────────────────────────────────────────────────────

initPlayerTurn();
renderAll();
