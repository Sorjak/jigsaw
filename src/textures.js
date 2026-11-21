import { Assets, Rectangle, Texture } from "pixi.js";

const CAT_SHEET = "/assets/cats_32x32.png";
const FRAME_SIZE = 32;
const SHEET_COLUMNS = 5;
const SHEET_ROWS = 4;

const groupTextures = new Map();
let catTextures = [];
let enabled = false;

export function setTexturesEnabled(value) {
  enabled = Boolean(value);
}

export async function loadTileTextures() {
  if (catTextures.length > 0) return;

  const sheet = await Assets.load(CAT_SHEET);
  sheet.source.scaleMode = "nearest";

  for (let row = 0; row < SHEET_ROWS; row++) {
    for (let col = 0; col < SHEET_COLUMNS; col++) {
      catTextures.push(
        new Texture({
          source: sheet.source,
          frame: new Rectangle(
            col * FRAME_SIZE,
            row * FRAME_SIZE,
            FRAME_SIZE,
            FRAME_SIZE,
          ),
        }),
      );
    }
  }
}

// Give each shape-group color a random cat for this game.
export function assignGroupTextures(colors) {
  if (catTextures.length === 0) return;

  const cats = [...catTextures].sort(() => Math.random() - 0.5);

  groupTextures.clear();
  colors.forEach((color, index) => {
    groupTextures.set(color, cats[index % cats.length]);
  });
}

export function getTileTexture(color) {
  if (!enabled) return null;
  return groupTextures.get(color) ?? null;
}
