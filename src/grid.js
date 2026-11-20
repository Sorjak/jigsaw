import { Rectangle } from "pixi.js";

const GRID_WIDTH = 32;
const GRID_HEIGHT = 16;

const PLAY_AREA_OFFSET = 9;
const PLAY_AREA_WIDTH = 14;
const PLAY_AREA_HEIGHT = 16;

class Grid {
  constructor() {
    this.width = GRID_WIDTH;
    this.height = GRID_HEIGHT;
    this.tiles = {}; // Use an object to store tiles by their coordinates
    this.shapes = {};
    this.playArea = new Rectangle(
      PLAY_AREA_OFFSET,
      0,
      PLAY_AREA_WIDTH,
      PLAY_AREA_HEIGHT,
    );
  }

  addTile(tile) {
    this.tiles[tile.getKey()] = tile; // Tile object
  }

  getTile(x, y) {
    return this.tiles[`${x},${y}`];
  }

  getTileArray() {
    return Object.values(this.tiles);
  }

  getStartTiles() {
    return this.getTileArray().filter((tile) => {
      return (
        tile.x > PLAY_AREA_OFFSET + 2 &&
        tile.x < PLAY_AREA_OFFSET + 6 &&
        tile.y > 2 &&
        tile.y < 6
      );
    });
  }

  addShape(shapeObj, shapeTiles) {
    if (!shapeTiles || shapeTiles.length <= 0) return false;

    let tileId = `${Date.now().toString(36)}${shapeTiles[0].x}${shapeTiles[0].y}`;

    for (const tile of shapeTiles) {
      tile.setShape(tileId, shapeObj.color);
      shapeObj.id = tileId;
      this.shapes[tileId] = shapeObj;
    }

    return tileId;
  }

  getShape(tileId) {
    return this.shapes[tileId];
  }

  getTwinShapes() {
    const shapes = Object.values(this.shapes);
    return shapes.filter((shape) => {
      return shape.twin_id !== null;
    });
  }

  removeShapeById(tileId) {
    const shapeObj = this.getShape(tileId);
    if (shapeObj) {
      console.log(`Removed shape: ${tileId}`);
      return this.removeShape(shapeObj);
    }
  }

  removeShape(shapeObj) {
    const shapeTiles = this.getTilesInShape(shapeObj);
    this.clearTiles(shapeTiles);
    delete this.shapes[shapeObj.id];

    if (shapeObj.twin_id !== null) {
      let twinShape = this.getShape(shapeObj.twin_id);
      if (twinShape) {
        this.removeShapeById(shapeObj.twin_id);
        return true;
      }
    }
    return false;
  }

  clearTiles(tiles) {
    tiles.forEach((tile) => {
      tile.removeShape("black");
    });
  }

  addShapeSafe(shapeObj, shapeTiles, buffer = 0) {
    // Add a shape object on the given tiles, but do some
    // checking to see that it isn't overlapping existing shapes
    // and that it isn't within <buffer> tiles of any other shape.
    if (!shapeTiles || shapeTiles.length <= 0) return false;
    if (shapeTiles.some((t) => t.shape_id !== null)) return false; // overlap

    if (buffer > 0) {
      const emptyTiles = this.getEmptyTilesForShapes(
        this.getOutsideShapes(),
        buffer,
      );
      const forbidden = new Set(emptyTiles.map((tile) => tile.getKey()));

      // are any of the given tiles forbidden?
      if (shapeTiles.some((tile) => forbidden.has(tile.getKey()))) return false;
    }

    return this.addShape(shapeObj, shapeTiles);
  }

  getOccupiedTiles() {
    return this.getTileArray().filter((tile) => tile.shape_id !== null);
  }

  getEmptyTilesForShapes(shapes, radius = 1) {
    // Given a set of shapes, get all of the empty tiles around all
    // of the shapes, used for determining where to place a new shape.

    const shapeIds = new Set(shapes.map((s) => s.id).filter(Boolean));
    if (shapeIds.size === 0) return [];

    const shapeTiles = this.getTileArray().filter((t) =>
      shapeIds.has(t.shape_id),
    );
    const seen = new Set();
    const emptyTiles = [];

    for (const tile of shapeTiles) {
      for (const neighbor of this.getEmptyNeighborTiles(tile, radius)) {
        const key = neighbor.getKey();

        if (seen.has(key)) continue;

        seen.add(key);
        emptyTiles.push(neighbor);
      }
    }

    return emptyTiles;
  }

  getTilesForShape(x, y, shape, inPlay = false) {
    let shapeTiles = [];
    for (let row = 0; row < shape.height; row++) {
      for (let col = 0; col < shape.width; col++) {
        const cellValue = shape.grid[row][col];
        if (cellValue === 1) {
          // Calculate the actual tile position on the grid
          const tileX = x + col;
          const tileY = y + row;

          if (
            tileX < 0 ||
            tileX >= this.width ||
            tileY < 0 ||
            tileY >= this.height
          ) {
            console.error(
              `Shape ${shape.name} at ${x}, ${y} includes invalid tiles`,
            );
            return [];
          }

          // Get the tile at this position
          let tile = this.getTile(tileX, tileY);
          if (tile) {
            if (inPlay && !this.inPlayArea(tile)) {
              console.error(
                `Shape ${shape.name} at ${x}, ${y} includes out of play tiles`,
              );
              return [];
            }
            if (!inPlay && !this.outPlayArea(tile)) {
              console.error(
                `Shape ${shape.name} at ${x}, ${y} includes inplay tiles`,
              );
              return [];
            }
            shapeTiles.push(tile);
          }
        }
      }
    }

    return shapeTiles;
  }

  getTilesInShape(shapeObj) {
    const shapeTiles = this.getTileArray().filter(
      (t) => t.shape_id === shapeObj.id,
    );

    return shapeTiles;
  }

  getTileForScreenPos(screenPos) {
    const tiles = this.getTileArray();

    for (const tile of tiles) {
      const left = tile.x * tile.width;
      const top = tile.y * tile.height;
      const right = left + tile.width;
      const bottom = top + tile.height;

      if (
        screenPos.x >= left &&
        screenPos.x <= right &&
        screenPos.y >= top &&
        screenPos.y <= bottom
      ) {
        return tile;
      }
    }

    return null;
  }

  getNeighborTiles(tile, radius = 1) {
    const neighbors = [];

    for (let col = tile.y - radius; col <= tile.y + radius; col++) {
      for (let row = tile.x - radius; row <= tile.x + radius; row++) {
        const neighbor = this.getTile(row, col);
        if (neighbor && neighbor !== tile) {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }

  getEmptyNeighborTiles(tile, radius = 1) {
    const neighbors = this.getNeighborTiles(tile, radius);
    return neighbors.filter((tile) => tile.shape_id === null);
  }

  getOutsideShapes() {
    const shapeMap = {};
    for (const tile of this.getTileArray()) {
      const id = tile.shape_id;

      if (id !== null && this.outPlayArea(tile)) {
        const shape = this.getShape(id);

        if (shape && !(id in shapeMap)) {
          shapeMap[tile.shape_id] = shape;
        }
      }
    }
    return Object.values(shapeMap);
  }

  drawPlayArea() {
    const tiles = this.getTileArray();

    for (const tile of tiles) {
      const x = tile.x;
      const y = tile.y;

      let color = "black";
      // Check if the tile is within the play area bounds
      if (
        tile.x >= this.playArea.left &&
        tile.x < this.playArea.right &&
        tile.y >= this.playArea.top &&
        tile.y < this.playArea.bottom
      ) {
        // Check if the tile is on the perimeter of the play area
        const isOnPerimeter =
          x === this.playArea.left ||
          x === this.playArea.right - 1 ||
          y === this.playArea.top ||
          y === this.playArea.bottom - 1;

        if (isOnPerimeter) {
          color = "green";
        }
      }

      tile.removeShape(color);
    }
  }

  inPlayArea(tile) {
    return (
      tile.x > this.playArea.left &&
      tile.x < this.playArea.right - 1 &&
      tile.y > this.playArea.top &&
      tile.y < this.playArea.bottom - 1
    );
  }

  outPlayArea(tile) {
    return tile.x < this.playArea.left || tile.x > this.playArea.right;
  }

  playAreaClear() {
    const playAreaTiles = this.getTileArray().filter(t => this.inPlayArea(t));
    return playAreaTiles.every(t => t.shape_id === null);
  }

  clear() {
    this.drawPlayArea();
    this.shapes = {};
  }

  lose() {
    const tiles = this.getTileArray();
    for (const tile of tiles) {
      tile.removeShape("red");
    }
  }

  win() {
    const tiles = this.getTileArray();
    for (const tile of tiles) {
      tile.removeShape("green");
    }
  }
}

export default Grid;
