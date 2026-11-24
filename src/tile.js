import { Container, Graphics, Sprite, Text } from "pixi.js";
import { getTileTexture } from "./textures.js";
import { getTextureBackground } from "./utils.js";

class Tile {
  constructor(x, y, color) {
    this.x = x; // x-coordinate of the tile
    this.y = y; // y-coordinate of the tile

    this.shape_id = null;

    this.color = color;
    this.container = new Container();
    this.sprite = new Sprite();
    this.sprite.visible = false;
    this.gtx = new Graphics();
    this.text = new Text({ text: "", style: {} });

    this.container.addChild(this.gtx);
    this.container.addChild(this.sprite);
    this.container.addChild(this.text);
    this.container.position.set(x, y);
  }

  draw() {
    this.gtx.clear();

    const texture = this.shape_id === null ? null : getTileTexture(this.color);

    if (texture) {
      const background = getTextureBackground(this.color);
      this.gtx.rect(0, 0, 1, 1).fill(background);
      this.sprite.texture = texture;
      this.sprite.setSize(1, 1);
      this.sprite.visible = true;
      return;
    }

    this.sprite.visible = false;
    this.gtx.rect(0, 0, 1, 1).fill(this.color);
  }

  setText(newText) {
    this.text.text = newText;
  }

  changeColor(newColor) {
    this.color = newColor;
    this.draw();
  }

  setShape(id, color) {
    this.shape_id = id;
    this.changeColor(color);
  }

  removeShape(color) {
    this.shape_id = null;
    this.changeColor(color);
  }

  getKey() {
    return `${this.x},${this.y}`;
  }
}

export default Tile;
