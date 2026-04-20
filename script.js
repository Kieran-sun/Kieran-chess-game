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
  if (piece === "") return null;
  else if (piece[0] === "W") return "white";
  else return "black";
}

function getPieceType(piece){
  if (piece === "") return null;
  return piece[1];
}

function isValidRookMove(fromIndex, toIndex) {
  const fromRow = Math.floor(fromIndex / 8);
  const fromCol = fromIndex % 8;

  const toRow = Math.floor(toIndex / 8);
  const toCol = toIndex % 8;

  return fromRow === toRow || fromCol === toCol;
}

function isPathClear(fromIndex, toIndex){
  const fromRow = Math.floor(fromIndex / 8);
  const fromCol = fromIndex % 8;
  const toRow = Math.floor(toIndex / 8);
  const toCol = toIndex % 8;

  let rowStep = 0;
  let colStep = 0;

  if (toRow > fromRow) rowStep = 1;
  if (toRow < fromRow) rowStep = -1;

  if (toCol > fromCol) colStep = 1;
  if (toCol < fromCol) colStep = -1;

  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;

  while (currentRow !== toRow || currentCol !== toCol){
    const checkIndex = currentRow * 8 + currentCol;
    if (board[checkIndex] !== ""){
      return false;
    }
    currentRow += rowStep;
    currentCol += colStep;
  }

  return true;
 
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
      
      //Mode A: a card is selected:

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
      
      //MODE B: a rook is already selected:

      if (selectedSquare !== null){
        const movingPiece = board[selectedSquare];


        if (i === selectedSquare){
          selectedSquare = null;
          statusMessage = capitalize(currentPlayer);
          renderAll();
          return;
        }

        if (getPieceOwner(movingPiece) !== currentPlayer){
          statusMessage = "you can only move your own piece"
          renderStatus();
          return;
        }
        
        if(getPieceType(movingPiece) !== "R"){
          statusMessage = "We can only move the rook for now"
          renderStatus();
          return;
        }

        if (clickedPiece !== "" && getPieceOwner(clickedPiece) === currentPlayer){
          statusMessage = "Rooks move in straight line"
          renderStatus();
          return;
        }

        if (!isPathClear(selectedSquare, i)){
          statusMessage = "rooks cannot jump over pieces"
          renderStatus();
          return;
        }
        const playerWhoMoved = currentPlayer;
        const capturedPiece = board[i];

        board[i] = movingPiece;
        board[selectedSquare] = "";
        selectedSquare = null;
        switchPlayer();

        if (capturedPiece !== ""){
          statusMessage =
          capitalize(playerWhoMoved) +
          " captured" +
          capturedPiece +
          ". " +
          capitalize(currentPlayer) +
          " turn.";
    
        } else{
          statusMessage = 
          capitalize(playerWhoMoved) +
          " moved" +
          movingPiece +
          ". " +
          capitalize(currentPlayer) +
          " turn."; 
        }
        renderAll();
        return;
      }

      //Mode C: nothing is selected, so try to select something
      if (clickedPiece === "") {
        statusMessage = "Pick a card first.";
        renderStatus();
        return;
      }
      
      if (getPieceOwner(clickedPiece) !== currentPlayer){
        statusMessage = "you can only select you own piece"
        renderStatus();
        return;
      }
      
      if(getPieceType(clickedPiece) !== "R"){
        statusMessage = "For now only rooks can move"
        renderStatus();
        return;
      }

      if (board[i] !== "") {
        statusMessage = "That square is already taken.";
        renderStatus();
        return;
      }

      statusMessage = selectedCard + " placed on square " + i + ".";
      selectedSquare = i;
      selectedCard = null;
      statusMessage = capitalize(currentPlayer) + " selected rook " + clickedPiece + " ."
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