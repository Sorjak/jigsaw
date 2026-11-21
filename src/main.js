import "@pixi/layout";
import { Application, Container } from "pixi.js";

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

function handleInput(event) {
  const mousePos = event.data.global;
  if (lives <= 0) return;

  let tile = grid.getTileForScreenPos(mousePos);
  if (tile === null) return;
  if (grid.inPlayArea(tile)) return;
  if (tile.shape_id === null) return;

  const shapeObj = grid.getShape(tile.shape_id);
  if (shapeObj === null) return;

  let result = grid.removeShape(shapeObj);
  if (!result) lives = Math.max(0, lives - 1);
}

function resize(app, gridContainer) {
  const width = window.innerWidth;
  const height = Math.min(window.innerHeight, width / 2);
  gridContainer.scale.set(width / grid.width);

  if (app.screen.width !== width && app.screen.height !== height) {
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
  app.stage.addChild(gridContainer);

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

  let gameOver = false;
  let gameTimer = 0;
  // Listen for animate update
  app.ticker.add((time) => {
    // Handle window resize

    livesText.innerText = `${HEART.repeat(lives)}`;

    if (lives <= 0) {
      grid.lose();
      gameOver = true;
    }

    if (grid.playAreaClear()) {
      grid.win();
      gameOver = true;
    }

    if (gameOver) {
      gameTimer += time.deltaMS;
      if (gameTimer > GAME_OVER_DURATION_MS) {
        gameOver = false;
        gameTimer = 0;
        newGame();
      }
    }
  });

  // Draw starting map
  grid.drawPlayArea();

  // Add click event for placing shapes
  gridContainer.on("rightclick", (event) => {
    const mousePos = event.data.global;
    let tile = grid.getTileForScreenPos(mousePos);
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
    handleInput(event);
  });

  window.addEventListener("resize", () => {
    resize(app, gridContainer);
  });

  window.resetMap = () => {
    newGame();
  };

  newGame();
  resize(app, gridContainer);
})();
