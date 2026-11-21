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

  addShape(shapeObj, shapeTiles) {
    if (!shapeTiles || shapeTiles.length <= 0) return false;

    let tileId = `${Date.now().toString(36)}-${shapeTiles[0].getKey()}`;

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
    return tile.x < this.playArea.left || tile.x >= this.playArea.right;
  }

  playAreaClear() {
    const playAreaTiles = this.getTileArray().filter((t) => this.inPlayArea(t));
    return playAreaTiles.every((t) => t.shape_id === null);
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
