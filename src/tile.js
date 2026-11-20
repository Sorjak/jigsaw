import { Container, Graphics, Text } from "pixi.js";

class Tile {
  constructor(x, y, width, height, color) {
    this.x = x;         // x-coordinate of the tile
    this.y = y;         // y-coordinate of the tile
    this.width = width;
    this.height = height;

    this.shape_id = null;

    this.color = color;
    this.container = new Container();
    this.gtx = new Graphics();
    this.text = new Text({text: '', style: {}});

    this.container.addChild(this.gtx);
    this.container.addChild(this.text);
  }

  draw() {
    this.gtx.clear();

    this.gtx.rect(
      this.x * this.width, this.y * this.height,
      this.width, this.height
    ).fill(this.color);

    this.gtx.rect(      
      this.x * this.width, this.y * this.height,
      this.width, this.height
    ).stroke({width: 1, color: 'black'});
  }

  setText(newText) {
    this.text.text = newText;
  }
  
  changeColor(newColor) {
    this.color = newColor;
    this.draw();
  }

  setShape(id, color) {
    this.changeColor(color);
    this.shape_id = id;
  }

  removeShape(color) {
    this.changeColor(color);
    this.shape_id = null;
  }

  getKey() {
    return `${this.x},${this.y}`;
  }
}

export default Tile;