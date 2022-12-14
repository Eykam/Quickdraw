const usernameForm = document.getElementById("username-form");
const outerBox = document.getElementById("outerbox");
const leftPlayerInfo = document.getElementById("left-player");
const rightPlayerInfo = document.getElementById("right-player");
const gameInfo = document.getElementById("game-info");
const winnerInfo = document.getElementById("winner-info");

const loader = document.createElement("div");
const div_loading = document.createElement("div");
const leftPlayerLives = document.createElement("div");
const rightPlayerLives = document.createElement("div");
const BASE_TIMER = 3000;

//change back to main
let canvas = draw("game");

const socket = io();

//Variables needed for client
let clientID = null;
let playerUsername = "";

//Render Background for start menu
outerBox.appendChild(canvas);
outerBox.appendChild(createBirds());
winnerInfo.innerText = "";
winnerInfo.classList.add("winner-info");

//Receiving messages from server
socket.on("clientID", (message) => {
  clientID = message;
});

socket.on("foundRoom", (data) => {
  let player1ID = data["player1"]["clientID"];
  let totalLives = Math.floor(data["totalRounds"] / 2) + 1;
  let leftPlayer = {};
  let rightPlayer = {};

  div_loading.remove();
  canvas.remove();
  canvas = draw("game");
  outerBox.appendChild(canvas);

  if (player1ID === clientID) {
    leftPlayer = data["player1"];
    rightPlayer = data["player2"];
  } else {
    leftPlayer = data["player2"];
    rightPlayer = data["player1"];
  }

  leftPlayerInfo.style.display = "block";
  rightPlayerInfo.style.display = "block";

  leftPlayerInfo.innerText =
    leftPlayer["username"] + "#" + leftPlayer["clientID"];
  rightPlayerInfo.innerText =
    rightPlayer["username"] + "#" + rightPlayer["clientID"];

  leftPlayerLives.classList.add("lives");
  leftPlayerLives.innerText = "Lives: ";
  leftPlayerInfo.appendChild(
    renderLives(leftPlayerLives, leftPlayer["lives"], totalLives)
  );

  rightPlayerLives.classList.add("lives");
  rightPlayerLives.innerText = "Lives: ";
  rightPlayerInfo.appendChild(
    renderLives(rightPlayerLives, rightPlayer["lives"], totalLives)
  );

  //inital render of current round and countdown
  gameInfo.appendChild(roundDisplay(data["currRound"], gameInfo));
  gameInfo.appendChild(timer(BASE_TIMER, gameInfo));

  //Add moving logic here
  startPosition(outerBox);
  walking();
  socket.emit("gameReady");
});

socket.on("startGame", (message) => {
  //Add turn logic here
  turn();
  console.log(message);
  document.addEventListener("click", shoot);
  document.addEventListener("keypress", shoot);
});

socket.on("roundWinner", (data) => {
  let leftPlayer = "";
  let rightPlayer = "";
  let player1ID = data["player1"]["clientID"];
  let totalLives = Math.floor(data["totalRounds"] / 2) + 1;

  if (player1ID === clientID) {
    leftPlayer = data["player1"];
    rightPlayer = data["player2"];
  } else {
    leftPlayer = data["player2"];
    rightPlayer = data["player1"];
  }

  //redraw canvas to move players back to starting point
  canvas.remove();
  canvas = draw("game");
  outerBox.appendChild(canvas);
  document.removeEventListener("click", shoot);
  document.removeEventListener("keypress", shoot);

  //after round, update players info
  if (data["roundWinner"] === leftPlayer["clientID"]) {
    setShot("left");
    setDead("right");
    winnerInfo.innerText =
      leftPlayer["username"] + "#" + data["roundWinner"] + " won this round!";
  } else {
    setShot("right");
    setDead("left");
    winnerInfo.innerText =
      rightPlayer["username"] + "#" + data["roundWinner"] + " won this round!";
  }

  leftPlayerInfo.append(
    renderLives(leftPlayerLives, leftPlayer["lives"], totalLives)
  );
  rightPlayerInfo.append(
    renderLives(rightPlayerLives, rightPlayer["lives"], totalLives)
  );
  console.log(
    "Round " + data["currRound"] + " Winner: ",
    data["roundWinner"] + "#" + clientID
  );

  //Render component that shows who won the round
  winnerInfo.style.display = "block";

  setTimeout(() => {
    socket.emit("nextRound");
  }, 4000);
});

socket.on("continue", (data) => {
  socket.emit("gameReady");

  //Add moving logic here
  startPosition(outerBox);
  walking();

  //Render current round in top middle and
  // countdown until next round starts, after countdown finishes, remove element
  winnerInfo.style.display = "none";
  gameInfo.appendChild(roundDisplay(data["currRound"], gameInfo));
  gameInfo.appendChild(timer(BASE_TIMER, gameInfo));
});

socket.on("gameWinner", (message) => {
  const mainmenu = document.createElement("div");
  document.removeEventListener("click", shoot);
  document.removeEventListener("keypress", shoot);

  //Set shooting and dead sprite
  if (message === playerUsername + "#" + clientID) {
    setShot("left");
    setDead("right");
  } else {
    setShot("right");
    setDead("left");
  }

  //Render page that shows Winner if won and Loser if Lost, then reloads page on "go home" button
  setTimeout(() => {
    gameInfo.innerHTML = "";
    document.getElementById("right-player-char").style.display = "none";
    document.getElementById("left-player-char").style.display = "none";

    canvas.remove();
    canvas = draw("main");
    outerBox.appendChild(canvas);

    mainmenu.innerText = "Click To Go To Main Menu";
    winnerInfo.innerText = message + " won the Game!";
    winnerInfo.style.display = "block";
    winnerInfo.appendChild(mainmenu);

    document.addEventListener("click", () => {
      window.location.reload();
    });

    document.addEventListener("keypress", () => {
      window.location.reload();
    });
  }, 3000);
});

//Wiring callback events to send server messages
usernameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  usernameForm.remove();
  playerUsername = e.target[0].value;

  div_loading.innerHTML = "Looking for Game...";
  div_loading.id = "loading";
  loader.classList.add("loader");
  //   loader.innerText = "hello";
  outerBox.appendChild(canvas);
  outerBox.appendChild(div_loading);
  div_loading.appendChild(loader);

  socket.emit("joinRoom", e.target[0].value);
  console.log("User: " + clientID + " attempting to join room");
});

//Helper Functions:
function renderLives(parent, lives, totalLives) {
  parent.innerHTML = "";

  for (let i = 0; i < totalLives; i++) {
    let currDiv = document.createElement("div");

    if (i < lives) currDiv.classList.add("remainingLife");
    else currDiv.classList.add("lostLife");

    parent.appendChild(currDiv);
  }

  return parent;
}

const shoot = function () {
  //Add shoot sprite logic here
  socket.emit("shoot");
  console.log("Shooting");
};

const timer = (BASE_TIMER, parent) => {
  let timeDisplay = document.createElement("div");
  timeDisplay.classList.add("time-display");
  let currTime = BASE_TIMER;

  parent.style.display = "block";

  let setTime = setInterval(() => {
    timeDisplay.innerText = "";
    if (currTime <= 0) {
      clearInterval(setTime);
      timeDisplay.style.display = "none";
    }

    console.log("Time: ", currTime / 1000);
    timeDisplay.innerText = currTime / 1000;
    currTime -= 1000;
  }, 1000);

  return timeDisplay;
};

const roundDisplay = (currRound, parent) => {
  let roundDisplay = document.createElement("div");

  parent.innerHTML = "";
  roundDisplay.classList.add("round-display");

  roundDisplay.innerText = "Round: " + currRound;
  return roundDisplay;
};
