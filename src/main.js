import "@pixi/layout";
import { Application, Container, Graphics } from "pixi.js";

import Grid from "./grid.js";
import {
  placeShapeOutside,
  placeStartingGroup,
  placeTwinShapes,
} from "./placements.js";
import Tile from "./tile.js";
import {
  getRandomShape,
  getRandomFakeShape,
  getRandomColorWheel,
} from "./utils.js";

const START_SHAPE_GROUPS = 3;
const START_SHAPE_NUM_PER_GROUP = 3;
const FAKE_SHAPE_NUM_PER_GROUP = 2;
const HEART = "❤️";
const GAME_OVER_DURATION_MS = 2000;

const grid = new Grid();
let lives = 5;
const livesText = document.getElementById("lives-text");
const timerText = document.getElementById("timer-text");

function addStartingShapes(grid, groupColor, usedNames) {
  const shapes = [];
  const groupNames = new Set(usedNames);

  for (let i = 0; i < START_SHAPE_NUM_PER_GROUP; i++) {
    const shape = getRandomShape(groupColor, groupNames);
    if (shape === null) break;
    shapes.push(shape);
    groupNames.add(shape.name);
  }

  if (shapes.length === 0) return [];

  const placed = placeStartingGroup(grid, shapes);
  if (placed === null) return [];

  for (const shape of placed) usedNames.add(shape.name);
  return placed;
}

function addFakeShapes(grid, groupColor, usedNames) {
  const shapesToAdd = [];

  for (let i = 0; i < FAKE_SHAPE_NUM_PER_GROUP; i++) {
    const fakeShape = getRandomFakeShape(groupColor, usedNames);
    if (fakeShape === null) continue;

    shapesToAdd.push(fakeShape);
    usedNames.add(fakeShape.name);
  }

  for (const shape of shapesToAdd) {
    placeShapeOutside(grid, shape, { tries: 30 });
  }
}

function newGame() {
  console.log("Resetting map");
  grid.clear();
  lives = 5;

  // Determine the colors for the groups;
  const colors = getRandomColorWheel(START_SHAPE_GROUPS);

  // Keep track of the taken shape names so we don't duplicate shapes.
  const usedNames = new Set();
  const shapeGroups = [];

  for (let i = 0; i < START_SHAPE_GROUPS; i++) {
    const groupColor = colors[i];
    const startingShapes = addStartingShapes(grid, groupColor, usedNames);

    placeTwinShapes(grid, startingShapes);
    shapeGroups.push(startingShapes);
  }

  for (let i = 0; i < shapeGroups.length; i++) {
    const groupColor = colors[i];
    addFakeShapes(grid, groupColor, usedNames);
  }
}

function handleInput(event, gridContainer) {
  if (lives <= 0) return;
  const mousePos = event.data.global;
  const point = gridContainer.toLocal(mousePos);

  let tile = grid.getTileForScreenPos(point);
  if (tile === null) return;
  if (grid.inPlayArea(tile)) return;
  if (tile.shape_id === null) return;

  const shapeObj = grid.getShape(tile.shape_id);
  if (shapeObj === null) return;

  let result = grid.removeShape(shapeObj);
  if (!result) lives = Math.max(0, lives - 1);
}

function drawGridLines(lines, grid, tileSize) {
  const half = 0.5 / tileSize; // half a screen pixel, in local units

  lines.clear();
  for (let x = 0; x <= grid.width; x++) {
    lines.rect(x - half, 0, 2 * half, grid.height);
  }
  for (let y = 0; y <= grid.height; y++) {
    lines.rect(0, y - half, grid.width, 2 * half);
  }
  lines.fill({ color: 0x000000 });
}

function resize(app, gridContainer, gridLines) {
  const width = window.innerWidth;
  const height = Math.min(window.innerHeight, width / 2);

  gridContainer.scale.set(width / grid.width);
  drawGridLines(gridLines, grid, gridContainer.scale.x);

  if (app.screen.width !== width || app.screen.height !== height) {
    app.renderer.resize(width, height);
  }
}

(async () => {
  // Create a new application
  const app = new Application();

  let screenWidth = window.innerWidth;
  let screenHeight = Math.min(window.innerHeight, screenWidth / 2);

  // Initialize the application
  await app.init({
    width: screenWidth,
    height: screenHeight,
  });

  // Append the application canvas to the document body
  document.getElementById("pixi-container").appendChild(app.canvas);

  const gridContainer = new Container();
  gridContainer.interactive = true;

  gridContainer.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  const tile_width = screenWidth / grid.width;
  const tile_height = screenWidth / grid.width;

  for (let col = 0; col < grid.height; col++) {
    for (let row = 0; row < grid.width; row++) {
      const tile = new Tile(row, col, tile_width, tile_height, "black");
      tile.draw();
      gridContainer.addChild(tile.container);

      grid.addTile(tile);
    }
  }

  const gridLines = new Graphics();
  gridContainer.addChild(gridLines);

  app.stage.addChild(gridContainer);

  let gameOver = false;
  let gameOverTimer = 0;
  let gameTimer = 0;
  let gameStart = Math.floor(Date.now() / 1000);
  // Listen for animate update
  app.ticker.add((time) => {
    // Handle window resize

    livesText.innerText = `${HEART.repeat(lives)}`;
    timerText.innerText = `${20 - gameTimer}s`

    const now = Math.floor(Date.now() / 1000); 
    gameTimer = now - gameStart;

    if (!gameOver) {
      if (grid.playAreaClear()) {
        grid.win();
        gameOver = true;
      }

      if (lives <= 0 || gameTimer >= 20) {
        grid.lose();
        gameOver = true;
      }
    }

    else {
      gameOverTimer += time.deltaMS;
      if (gameOverTimer > GAME_OVER_DURATION_MS) {
        gameOver = false;
        gameOverTimer = 0;
        gameTimer = 0;
        gameStart = now;
        newGame();
      }
    }
  });

  // Draw starting map
  grid.drawPlayArea();

  // Add click event for placing shapes
  gridContainer.on("rightclick", (event) => {
    const mousePos = event.data.global;
    const point = gridContainer.toLocal(mousePos)

    let tile = grid.getTileForScreenPos(point);
    if (tile === null) return;

    let log_msg = `${tile.shape_id}`;
    let shape = grid.getShape(tile.shape_id);
    if (!shape) return;

    if (shape.twin_id) {
      log_msg = `${log_msg} | ${shape.twin_id}`;
    }

    console.log(log_msg);
  });

  gridContainer.on("pointertap", (event) => {
    handleInput(event, gridContainer);
  });

  window.addEventListener("resize", () => {
    resize(app, gridContainer, gridLines);
  });

  window.resetMap = () => {
    newGame();
  };

  newGame();
  resize(app, gridContainer, gridLines);
})();
