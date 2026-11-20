import '@pixi/layout';
import { Application, Assets, Container, Graphics, Rectangle, Text } from "pixi.js";

import Grid from './grid.js';
import Shape from './shape.js';
import FakeShape from './fake_shape.js';
import SHAPES from './shapes.js';
import Tile from './tile.js';

const TILE_COLORS = ['red', 'blue', 'yellow', 'cyan', 'green'];
const START_SHAPE_GROUPS = 3;
const START_SHAPE_NUM_PER_GROUP = 3;
const FAKE_SHAPE_NUM_PER_GROUP = 2;
const HEART = '❤️';
const GAME_OVER_DURATION_MS = 2000;
const LOOP_RETRIES = 15;

function getRandomColor() {
  const clrIdx = getRandomInt(0, TILE_COLORS.length)
  return TILE_COLORS[clrIdx];
}

function getRandomColorWheel(numColors) {
  const ranColor = getRandomInt(0, TILE_COLORS.length);

  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const color = TILE_COLORS[(ranColor + i) % TILE_COLORS.length];
    colors.push(color);
  }
  return colors;
}

function getRandomShape(color, usedNames) {
  const shapeNames = Object.keys(SHAPES).filter(s => !usedNames.has(s));
  if (shapeNames.length === 0) {
    console.error('Ran out of possible shapes to add!!!!');
    return null;
  }

  const randomInt = getRandomInt(0, shapeNames.length);
  
  color = color ?? getRandomColor();
  return new Shape(shapeNames[randomInt], color);
}

function getRandomFakeShape(color, usedNames) {
  let fakeShape = getRandomShape(color, usedNames);
  if (fakeShape === null) return null;

  return new FakeShape(fakeShape.name, fakeShape.color);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomInPlayTile(grid) {
  const candidates = grid.getStartTiles();
  const idx = getRandomInt(0, candidates.length);
  return candidates[idx];
}

function getRandomOutsideTile(grid) {
  let dir = getRandomInt(0, 10);

  let hmin = 0; let hmax = grid.playArea.left;
  let vmin = 0; let vmax = grid.height;
  if (dir >= 5) {
    hmin = grid.playArea.right + 1; hmax = grid.width;
  }

  let x = getRandomInt(hmin, hmax);
  let y = getRandomInt(vmin, vmax);
  return grid.getTile(x, y);
}

function getNearbyTile(grid, shapeObj) {
  const shapeTiles = grid.getTilesInShape(shapeObj);
  let nearbyTile = null;

  const maxTries = LOOP_RETRIES;
  let tries = 0;
  while (maxTries >= tries) {
    const ran = getRandomInt(0, shapeTiles.length);
    const startTile = shapeTiles[ran];
    const neighbors = grid.getEmptyNeighborTiles(startTile);
    if (neighbors.length > 0) {
      const ranNeighbor = getRandomInt(0, neighbors.length);
      nearbyTile = neighbors[ranNeighbor]; 
      break;
    }

    tries++;
  }

  return nearbyTile;
}

function addStartingShapes(grid, groupColor, usedNames, previousGroups) {
  let tries = 0;
  const maxTries = LOOP_RETRIES;
  const shapesAdded = [];

  while (shapesAdded.length < START_SHAPE_NUM_PER_GROUP) {
    if (tries >= maxTries) {
      console.warn('Exceeded max tries on starting shapes.')
      break;
    }

    // Select a good tile for us to place the new shape in. If we have no shapes
    // already placed, pick a random tile. Otherwise, pick the closest tile we can
    // to existing shapes within this group.
    let candidates;

    // first shape of this group
    if (shapesAdded.length === 0) {
      // first shape of the game
      if (previousGroups.length === 0) {
        candidates = grid.getStartTiles();
      } else {
        // Find an empty tile in the already placed shapes
        candidates = grid.getEmptyTilesForShapes(previousGroups.flat());
      }
    } else {
      // Find an empty tile near a shape in the current group of shapes.
      candidates = grid.getEmptyTilesForShapes(shapesAdded);
    }

    const tile = candidates[getRandomInt(0, candidates.length)];
    if (tile == null) { 
      console.warn(`No nearby tile found`); 
      tries++;
      continue; 
    }

    const randomShape = getRandomShape(groupColor, usedNames);
    if (randomShape === null) {
      tries++;
      continue;
    }

    const shapeTiles = grid.getTilesForShape(tile.x, tile.y, randomShape, true);

    let result = grid.addShapeSafe(randomShape, shapeTiles);
    if (result) {
      randomShape.id = result;
      shapesAdded.push(randomShape);
      usedNames.add(randomShape.name);
      tries = 0;
      continue;
    }

    tries++;
  }

  console.log(`Added ${shapesAdded.length} starting shapes`);
  return shapesAdded;
}

function addFakeShapes(grid, startingShapes, groupColor, usedNames) {
  const shapesToAdd = [];

  for (const startingShape of startingShapes) {
    const shape = new Shape(startingShape.name, startingShape.color);
    shape.twin_id = startingShape.id;
    shapesToAdd.push(shape);
  }

  for (let i = 0; i < FAKE_SHAPE_NUM_PER_GROUP; i++) {
    let fakeShape = getRandomFakeShape(groupColor, usedNames);
    if (fakeShape === null) {
      continue;
    }

    shapesToAdd.push(fakeShape);
    usedNames.add(fakeShape.name);
  }

  const maxTries = LOOP_RETRIES;
  
  for (const shape of shapesToAdd) {
    let added = false;
    let tries = 0;
    while(tries < maxTries) {
      const tile = getRandomOutsideTile(grid);
      const shapeTiles = grid.getTilesForShape(tile.x, tile.y, shape, false);

      let result = grid.addShapeSafe(shape, shapeTiles);
      if (result) break;
      
      console.log('could not outside add shape');
      tries++;
    }
  }
}

const grid = new Grid();
let lives = 5;
const livesText = document.getElementById('lives-text');

function newGame() {
  console.log('Resetting map');
  grid.clear();
  lives = 5;

  // Determine the colors for the groups;
  const colors = getRandomColorWheel(START_SHAPE_GROUPS);

  // Keep track of the taken shape names so we don't duplicate shapes.
  const usedNames = new Set();
  const shapeGroups = [];

  for (let i = 0; i < START_SHAPE_GROUPS; i++) {
    const groupColor = colors[i];
    const startingShapes = addStartingShapes(grid, groupColor, usedNames, shapeGroups);
    addFakeShapes(grid, startingShapes, groupColor, usedNames);
    shapeGroups.push(startingShapes);
  }
  
}

(async () => {
  // Create a new application
  const app = new Application();

  let screenWidth = window.innerWidth;
  let screenHeight = Math.min(window.innerHeight, screenWidth / 2);

  // Initialize the application
  await app.init({ width: screenWidth, height: screenHeight, resizeTo: document.getElementById('#app') });

  // Append the application canvas to the document body
  document.getElementById("pixi-container").appendChild(app.canvas);

  const gridContainer = new Container();
  gridContainer.interactive = true;
  app.stage.addChild(gridContainer);
  
  gridContainer.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  const tile_width = screenWidth / grid.width;
  const tile_height = screenWidth / grid.width;

  var shapes = {};
  var colorIdx = 0
  for (let col = 0; col < grid.height; col++) {
    for (let row = 0; row < grid.width; row++) {
      const color = TILE_COLORS[colorIdx % TILE_COLORS.length];
      const tile = new Tile(row, col, tile_width, tile_height, color);

      tile.draw();
      gridContainer.addChild(tile.container);

      grid.addTile(tile);
      colorIdx++;
    }
  }

  let gameOver = false;
  let gameTimer = 0;
  // Listen for animate update
  app.ticker.add((time) => {

    // Handle window resize
    if (window.innerWidth != screenWidth) {
      screenWidth = window.innerWidth;

      grid.getTileArray().forEach((tile) => {
        tile.width = screenWidth / grid.width;
        tile.height = screenWidth / grid.width;
        tile.draw();
      });
    }

    
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
      console.log(gameOver);
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
  gridContainer.on('rightclick', (event) => {
    const mousePos = event.data.global;
    let tile = grid.getTileForScreenPos(mousePos);
    if (tile === null) return;

    let log_msg = `${tile.shape_id}`;
    let shape = grid.getShape(tile.shape_id);
    if (!shape) return;

    if (shape.twin_id) {
      log_msg = `${log_msg} | ${shape.twin_id}`
    }

    console.log(log_msg);
  });

  gridContainer.on('click', (event) => {
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
  });


  window.resetMap = () => {
    newGame();
  }

  newGame();

})();
