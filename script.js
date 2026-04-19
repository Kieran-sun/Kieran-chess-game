let currentPlayer = "white";
let board = Array(64).fill("");
let selectedCard = null;
let selectedSquare = null;
let statusMessage = "White: select a card, then click one of your squares";

let hands = {
  white: ["R", "K", "P", "B", "N", "Q"],
  black: ["R", "K", "P", "B", "N", "Q"]
};

const handEl = document.getElementById("hand");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");

function renderStatus(){
  statusEl.textContent = statusMessage;
} 

function capitalize(word){
  let capitalized_word = word[0].toUpperCase() + word.slice(1);
  return capitalized_word;
}

function renderHand() {
  handEl.innerHTML = "";
  const currentHand = hands[currentPlayer];

  for (let card of currentHand) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card");

    if (selectedCard === card) {
      cardEl.classList.add("selected");
    }

    cardEl.textContent = card;

    cardEl.addEventListener("click", function () {
      selectedCard = card;
      selectedSquare = null;
      statusMessage = capitalize(currentPlayer) + " selected card " + card;
      renderAll();
    });

    handEl.appendChild(cardEl);
  }
}

function removeSelectedCardFromHand(){
  const currentHand = hands[currentPlayer];
  const index = currentHand.indexOf(selectedCard);

  if(index != -1){
    currentHand.splice(index, 1);
  }
}

function switchPlayer(){
  currentPlayer = currentPlayer === "white" ? "black" : "white";
}

function canPlaceOnRow(row, player) {
  if (player === "white") return row >= 6;
  return row <= 1;
}

function getPieceOwner(piece) {
  // Do it!
  return "white"
}

function isValidRookMove(fromIndex, toIndex) {
  const fromRow = Math.floor(fromIndex / 8);
  const fromCol = fromIndex % 8;

  const toRow = Math.floor(toIndex / 8);
  const toCol = toIndex % 8;

  return fromRow === toRow || fromCol === toCol;
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

    squareEl.textContent = board[i];

    squareEl.addEventListener("click", function () {

      const clickedPiece = board[i];

      if (!selectedCard) {
        statusMessage = "Pick a card first.";
        renderStatus();
        return;
      }

      if (selectedCard) {
        if (board[i] !== "") {
          statusMessage = "That square is already taken.";
          renderStatus();
          return;
        }

        if (!canPlaceOnRow(row, currentPlayer)) {
          statusMessage = capitalize(currentPlayer) + " must place on their own starting rows.";
          renderStatus();
          return;
        }

        const placedPiece = currentPlayer[0].toUpperCase() + selectedCard;
        const playerWhoMoved = currentPlayer;

        board[i] = placedPiece;
        removeSelectedCardFromHand();
        selectedCard = null;
        switchPlayer();

        statusMessage =
          capitalize(playerWhoMoved) +
          " placed " +
          placedPiece +
          ". " +
          capitalize(currentPlayer) +
          " turn.";

        renderAll();
        return;
      }

      if (board[i] !== "") {
        statusMessage = "That square is already taken.";
        renderStatus();
        return;
      }

      board[i] = selectedCard;
      statusMessage = selectedCard + " placed on square " + i + ".";
      selectedCard = null;
      renderAll();
    });

    boardEl.appendChild(squareEl);
  }
}

function renderAll(){
  renderStatus();
  renderHand();
  renderBoard();
}

renderAll();