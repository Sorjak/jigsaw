import SHAPES from "./shapes.js";

function rotateCW(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const rotated = [];

  for (let row = 0; row < w; row++) {
    rotated[row] = [];
    for (let col = 0; col < h; col++) {
      rotated[row][col] = grid[h - 1 - col][row];
    }
  }

  return rotated;
}

class Shape {
  constructor(name, color = "red", rotation = 0) {
    this.name = name;

    this.id = null;
    this.twin_id = null;
    this.color = color;

    this._grid = SHAPES[name];
    this._rotatedGrid = null;
    this._rotation = 0;

    this.setRotation(rotation);
  }

  get grid() {
    if (this._rotation === 0) return this._grid;
    return this._rotatedGrid;
  }

  get width() {
    return this.grid[0].length;
  }

  get height() {
    return this.grid.length;
  }

  get rotation() {
    return this._rotation;
  }

  rotate(turns = 1) {
    this._rotation = (((this.rotation + turns) % 4) + 4) % 4;

    let rotatedGrid = this._grid;
    for (let i = 0; i < this._rotation; i++) {
      rotatedGrid = rotateCW(rotatedGrid);
    }

    this._rotatedGrid = rotatedGrid;
    return this;
  }

  setRotation(rotation) {
    return this.rotate(rotation - this._rotation);
  }
}
export default Shape;
