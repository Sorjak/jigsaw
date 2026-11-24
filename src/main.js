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
  assignGroupTextures,
  loadTileTextures,
  setTexturesEnabled,
} from "./textures.js";
import {
  getNowSeconds,
  getRandomShape,
  getRandomFakeShape,
  getRandomColorWheel,
} from "./utils.js";
import Viewport from "./viewport.js";

const START_SHAPE_GROUPS = 3;
const START_SHAPE_NUM_PER_GROUP = 3;
const FAKE_SHAPE_NUM_PER_GROUP = 2;
const HEART = "❤️";
const GAME_OVER_DURATION_MS = 2000;
const ROUND_DURATION_SECONDS = 20;

const livesText = document.getElementById("lives-text");
const timerText = document.getElementById("timer-text");
const roundTimeInput = document.getElementById("round-duration");
const shapeGroupsInput = document.getElementById("shape-groups");
const shapesPerGroupInput = document.getElementById("shapes-per-group");
const useTexturesInput = document.getElementById("use-textures");

const grid = new Grid();
let lives = 5;
let gameTimer = 0;
let gameStart = getNowSeconds();
let roundDuration = ROUND_DURATION_SECONDS;
let shapeGroupsNum = START_SHAPE_GROUPS;
let shapesPerGroup = START_SHAPE_NUM_PER_GROUP;

function addStartingShapes(grid, groupColor, usedNames) {
  const shapes = [];
  const groupNames = new Set(usedNames);

  for (let i = 0; i < shapesPerGroup; i++) {
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
  gameTimer = 0;
  gameStart = getNowSeconds();

  // Determine the colors for the groups;
  const colors = getRandomColorWheel(shapeGroupsNum);
  assignGroupTextures(colors);

  // Keep track of the taken shape names so we don't duplicate shapes.
  const usedNames = new Set();
  const shapeGroups = [];

  for (let i = 0; i < shapeGroupsNum; i++) {
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

function changeSettings() {
  roundDuration = roundTimeInput.value;
  shapeGroupsNum = shapeGroupsInput.value;
  shapesPerGroup = shapesPerGroupInput.value;
  setTexturesEnabled(useTexturesInput.checked);
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

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application with a placeholder, resize will fix it.
  await app.init({
    width: 1,
    height: 1,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  // Append the application canvas to the document body
  const pixiContainer = document.getElementById("pixi-container");
  pixiContainer.appendChild(app.canvas);

  const gridContainer = new Container();
  gridContainer.interactive = true;

  gridContainer.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  for (let col = 0; col < grid.height; col++) {
    for (let row = 0; row < grid.width; row++) {
      const tile = new Tile(row, col, "black");
      tile.draw();
      gridContainer.addChild(tile.container);

      grid.addTile(tile);
    }
  }

  const gridLines = new Graphics();
  gridContainer.addChild(gridLines);

  app.stage.addChild(gridContainer);

  // Create viewport class to manage window sizing.
  const viewport = new Viewport({
    container: pixiContainer,
    pixiApp: app,
    content: gridContainer,
    gridSize: { width: grid.width, height: grid.height },
    onResize: (scale) => drawGridLines(gridLines, grid, scale),
  });
  viewport.start();

  let gameOver = false;
  let gameOverTimer = 0;

  // Listen for animate update
  app.ticker.add((time) => {
    const livesStr = HEART.repeat(lives);
    if (livesText.textContent !== livesStr) livesText.textContent = livesStr;

    const timerStr = `${Math.max(0, roundDuration - gameTimer)}s`;
    if (timerText.textContent !== timerStr) timerText.textContent = timerStr;

    const now = getNowSeconds();

    if (!gameOver) {
      gameTimer = now - gameStart;
      if (grid.playAreaClear()) {
        grid.win();
        gameOver = true;
      }

      if (lives <= 0 || gameTimer >= roundDuration) {
        grid.lose();
        gameOver = true;
      }
    } else {
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
    const point = gridContainer.toLocal(mousePos);

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

  window.resetMap = () => {
    newGame();
  };

  window.applySettings = () => {
    changeSettings();
    newGame();
  };

  await loadTileTextures();

  changeSettings();
  newGame();
})();
