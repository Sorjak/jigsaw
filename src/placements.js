import Shape from "./shape.js";
import { getRandomInt } from "./utils.js";

const OUTSIDE_SHAPE_BUFFER = 1;
const OUTSIDE_SHAPE_TRIES = 15;
const MAX_BOX_SLACK = 8;
const NEIGHBORS = [
  [-1, 0], // left
  [1, 0], // right
  [0, -1], // up
  [0, 1], // down
];

/**
 * Placement helpers.
 *
 * A "layout" is a packed group in its own small coordinate system:
 *
 *   {
 *     width, height,
 *     placements: [{ shape, rotation, cells: [[x, y], ...] }]
 *   }
 *
 * `cells` are absolute coordinates inside the layout box.
 * `placeLayoutOnGrid` slides the whole layout onto the real grid.
 */

// ---------------------------------------------------------------------------
// Packing a group into the smallest hole-free rectangle
// ---------------------------------------------------------------------------

/** Coordinates of every filled cell in a shape's current rotation. */
function cellsOf(shape) {
  const cells = [];

  for (let y = 0; y < shape.height; y++) {
    for (let x = 0; x < shape.width; x++) {
      if (shape.grid[y][x]) cells.push([x, y]);
    }
  }

  return cells;
}

/** All unique rotations of a shape, with their cells and bounding box. */
function orientations(shape) {
  const result = [];
  const seen = new Set();

  for (let rotation = 0; rotation < 4; rotation++) {
    const rotated = new Shape(shape.name, shape.color, rotation);
    const key = rotated.grid.map((row) => row.join("")).join("/");

    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      rotation,
      cells: cellsOf(rotated),
      width: rotated.width,
      height: rotated.height,
    });
  }

  return result;
}

function emptyGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(false));
}

function markCells(grid, cells, value) {
  for (const [x, y] of cells) grid[y][x] = value;
}

function overlaps(occupied, cells) {
  return cells.some(([x, y]) => occupied[y][x]);
}

/** True when every occupied cell can be reached from every other one. */
function isConnected(occupied) {
  const height = occupied.length;
  const width = occupied[0].length;

  let start = null;
  let total = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!occupied[y][x]) continue;
      total++;
      if (start === null) start = [x, y];
    }
  }

  if (start === null) return false;

  const seen = emptyGrid(width, height);
  const queue = [start];
  seen[start[1]][start[0]] = true;
  let reached = 0;

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    reached++;

    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (!occupied[ny][nx] || seen[ny][nx]) continue;

      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }

  return reached === total;
}

/** True when an empty cell is fully enclosed by occupied cells. */
function hasHole(occupied) {
  const height = occupied.length;
  const width = occupied[0].length;

  // Flood-fill the empty cells that touch the border. Anything the fill
  // cannot reach is enclosed by the shape, i.e. a hole.
  const reached = emptyGrid(width, height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    queue.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    queue.push([0, y], [width - 1, y]);
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    if (occupied[y][x] || reached[y][x]) continue;

    reached[y][x] = true;

    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      queue.push([nx, ny]);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!occupied[y][x] && !reached[y][x]) return true;
    }
  }

  return false;
}

/** A group is solid when it is one connected piece with no holes. */
function isSolid(occupied) {
  return isConnected(occupied) && !hasHole(occupied);
}

/** Every position and rotation of a piece that fits inside the box. */
function placementsInBox(piece, width, height) {
  const placements = [];

  for (const orientation of piece.orientations) {
    for (let y = 0; y + orientation.height <= height; y++) {
      for (let x = 0; x + orientation.width <= width; x++) {
        placements.push({
          rotation: orientation.rotation,
          cells: orientation.cells.map(([dx, dy]) => [x + dx, y + dy]),
        });
      }
    }
  }

  return placements;
}

/** Try to fit every piece in the box without overlaps or holes. */
function fillBox(pieces, width, height) {
  const options = pieces.map((piece) => placementsInBox(piece, width, height));
  const occupied = emptyGrid(width, height);
  const chosen = [];

  function search(index) {
    if (index === pieces.length) {
      return isSolid(occupied) ? chosen.slice() : null;
    }

    for (const option of options[index]) {
      if (overlaps(occupied, option.cells)) continue;

      markCells(occupied, option.cells, true);
      chosen.push(option);

      const result = search(index + 1);
      if (result) return result;

      chosen.pop();
      markCells(occupied, option.cells, false);
    }

    return null;
  }

  return search(0);
}

/** Factor pairs that make a width x height box of exactly `area` cells. */
function boxesWithArea(area, maxWidth, maxHeight) {
  const boxes = [];

  for (let width = 1; width <= maxWidth; width++) {
    if (area % width !== 0) continue;

    const height = area / width;
    if (height <= maxHeight) boxes.push({ width, height });
  }

  // Prefer square boxes: they look tighter than long, thin ones.
  boxes.sort(
    (a, b) => Math.abs(a.width - a.height) - Math.abs(b.width - b.height),
  );

  return boxes;
}

/**
 * Pack shapes into the smallest rectangle where the group is connected
 * and has no holes. Returns null when nothing fits within the limits.
 */
export function packShapes(shapes, maxWidth = 12, maxHeight = 14) {
  const totalCells = shapes.reduce(
    (sum, shape) => sum + cellsOf(shape).length,
    0,
  );

  // Larger pieces first; that prunes the search much faster. Every rotation
  // has the same cell count, so the first orientation is representative.
  const pieces = shapes
    .map((shape) => ({ shape, orientations: orientations(shape) }))
    .sort(
      (a, b) => b.orientations[0].cells.length - a.orientations[0].cells.length,
    );

  // Shapes rarely fill a rectangle exactly, so try the smallest possible
  // area first, then allow a little empty space ("slack").
  for (let area = totalCells; area <= totalCells + MAX_BOX_SLACK; area++) {
    for (const { width, height } of boxesWithArea(area, maxWidth, maxHeight)) {
      const placed = fillBox(pieces, width, height);
      if (!placed) continue;

      return {
        width,
        height,
        placements: placed.map((placement, index) => ({
          shape: pieces[index].shape,
          rotation: placement.rotation,
          cells: placement.cells,
        })),
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Turning a shape at a grid position into actual tiles
// ---------------------------------------------------------------------------

function invalidTiles(shape, x, y, reason) {
  console.error(`Shape ${shape.name} at ${x}, ${y} ${reason}`);
  return [];
}

/**
 * Tiles covered by `shape` when its top-left corner is at `(x, y)`.
 * The placement must stay inside the play area (`inPlay`) or outside it.
 */
export function tilesForShape(grid, x, y, shape, inPlay = false) {
  const tiles = [];

  for (let row = 0; row < shape.height; row++) {
    for (let col = 0; col < shape.width; col++) {
      if (shape.grid[row][col] !== 1) continue;

      const tileX = x + col;
      const tileY = y + row;

      if (
        tileX < 0 ||
        tileX >= grid.width ||
        tileY < 0 ||
        tileY >= grid.height
      ) {
        return invalidTiles(shape, x, y, "includes invalid tiles");
      }

      const tile = grid.getTile(tileX, tileY);
      if (!tile) continue;

      if (inPlay && !grid.inPlayArea(tile)) {
        return invalidTiles(shape, x, y, "includes out of play tiles");
      }
      if (!inPlay && !grid.outPlayArea(tile)) {
        return invalidTiles(shape, x, y, "includes inplay tiles");
      }

      tiles.push(tile);
    }
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// Keeping outside shapes at a distance
// ---------------------------------------------------------------------------

function neighborTiles(grid, tile, radius = 1) {
  const neighbors = [];

  for (let y = tile.y - radius; y <= tile.y + radius; y++) {
    for (let x = tile.x - radius; x <= tile.x + radius; x++) {
      const neighbor = grid.getTile(x, y);
      if (neighbor && neighbor !== tile) neighbors.push(neighbor);
    }
  }

  return neighbors;
}

/** Empty tiles within `radius` of any of the given shapes. */
function emptyTilesAround(grid, shapes, radius = 1) {
  const shapeIds = new Set(shapes.map((shape) => shape.id).filter(Boolean));
  if (shapeIds.size === 0) return [];

  const empty = new Set();

  for (const tile of grid.getTileArray()) {
    if (!shapeIds.has(tile.shape_id)) continue;

    for (const neighbor of neighborTiles(grid, tile, radius)) {
      if (neighbor.shape_id === null) empty.add(neighbor);
    }
  }

  return [...empty];
}

function outsideShapes(grid) {
  const shapes = new Map();

  for (const tile of grid.getTileArray()) {
    if (tile.shape_id === null || !grid.outPlayArea(tile)) continue;
    if (shapes.has(tile.shape_id)) continue;

    const shape = grid.getShape(tile.shape_id);
    if (shape) shapes.set(tile.shape_id, shape);
  }

  return [...shapes.values()];
}

/**
 * Add a shape on the given tiles, rejecting overlaps and placements too
 * close to another outside shape.
 */
export function addShapeSafe(grid, shape, shapeTiles, buffer = 0) {
  if (!shapeTiles || shapeTiles.length === 0) return false;
  if (shapeTiles.some((tile) => tile.shape_id !== null)) return false;

  if (buffer > 0) {
    const forbidden = new Set(
      emptyTilesAround(grid, outsideShapes(grid), buffer).map((tile) =>
        tile.getKey(),
      ),
    );

    if (shapeTiles.some((tile) => forbidden.has(tile.getKey()))) return false;
  }

  return grid.addShape(shape, shapeTiles);
}

// ---------------------------------------------------------------------------
// Sliding a finished layout onto the grid
// ---------------------------------------------------------------------------

function layoutFitsAt(grid, layout, offsetX, offsetY) {
  return layout.placements.every((placement) =>
    placement.cells.every(([x, y]) => {
      const tile = grid.getTile(offsetX + x, offsetY + y);
      return tile && grid.inPlayArea(tile) && tile.shape_id === null;
    }),
  );
}

/**
 * Put a packed layout into the play area. Among all valid offsets, choose
 * the one whose center is closest to the play-area center.
 */
export function placeLayoutOnGrid(grid, layout) {
  const centerX = grid.playArea.left + (grid.playArea.width - 1) / 2;
  const centerY = (grid.playArea.height - 1) / 2;

  let best = null;

  for (let offsetY = 0; offsetY + layout.height <= grid.height; offsetY++) {
    for (let offsetX = 0; offsetX + layout.width <= grid.width; offsetX++) {
      if (!layoutFitsAt(grid, layout, offsetX, offsetY)) continue;

      const distance = Math.hypot(
        offsetX + layout.width / 2 - centerX,
        offsetY + layout.height / 2 - centerY,
      );

      if (best === null || distance < best.distance) {
        best = { offsetX, offsetY, distance };
      }
    }
  }

  if (best === null) return null;

  for (const { shape, rotation, cells } of layout.placements) {
    // Store the packer's rotation on the real shape; twins copy it later.
    shape.setRotation(rotation);

    grid.addShape(
      shape,
      cells.map(([x, y]) => grid.getTile(best.offsetX + x, best.offsetY + y)),
    );
  }

  return layout.placements.map(({ shape }) => shape);
}

/** Pack a starting group and place it as close to the center as possible. */
export function placeStartingGroup(grid, shapes) {
  const layout = packShapes(
    shapes,
    grid.playArea.width - 2,
    grid.playArea.height - 2,
  );

  return layout === null ? null : placeLayoutOnGrid(grid, layout);
}

// ---------------------------------------------------------------------------
// Placing twins and fakes outside the play area
// ---------------------------------------------------------------------------

/** Random tile to the left or right of the play area. */
function randomOutsideTile(grid) {
  const onRight = Math.random() < 0.5;
  const x = onRight
    ? getRandomInt(grid.playArea.right, grid.width)
    : getRandomInt(0, grid.playArea.left);
  const y = getRandomInt(0, grid.height);

  return grid.getTile(x, y);
}

/** Try random outside positions until the shape fits. */
export function placeShapeOutside(
  grid,
  shape,
  { buffer = OUTSIDE_SHAPE_BUFFER, tries = OUTSIDE_SHAPE_TRIES } = {},
) {
  for (let i = 0; i < tries; i++) {
    const tile = randomOutsideTile(grid);
    if (!tile) continue;

    const shapeTiles = tilesForShape(grid, tile.x, tile.y, shape, false);
    if (addShapeSafe(grid, shape, shapeTiles, buffer)) return true;
  }

  return false;
}

/** Place a matching outside copy for every starting shape. */
export function placeTwinShapes(grid, shapes) {
  for (const shape of shapes) {
    const newRot = getRandomInt(0, 4);
    const twin = new Shape(shape.name, shape.color, newRot);
    twin.twin_id = shape.id;

    // Removing the inside shape later also removes its twin (linked by id).
    if (!placeShapeOutside(grid, twin)) {
      console.warn(`Could not place twin for shape ${shape.name}`);
    }
  }
}
