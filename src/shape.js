import SHAPES from "./shapes.js";

class Shape {
  constructor(name, color = "red") {
    this.name = name;
    this.grid = SHAPES[name];
    this.id = null;
    this.twin_id = null;
    this.color = color;
  }

  get width() {
    return this.grid[0].length;
  }

  get height() {
    return this.grid.length;
  }
}
export default Shape;
