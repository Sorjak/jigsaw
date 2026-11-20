import SHAPES from './shapes.js';

class FakeShape {
  constructor(name, color) {
    this.name = name;
    this.grid = SHAPES[name];
    this.id = 'fake';
    this.twin_id = null;
    this.color = color;
  }

  get width()  {
    return this.grid[0].length;
  }

  get height() {
    return this.grid.length;
  }

}
export default FakeShape;