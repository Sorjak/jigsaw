import SHAPES from "./shapes.js";
import Shape from "./shape.js";
import FakeShape from "./fake_shape.js";

const TILE_COLORS = ["red", "blue", "yellow", "cyan", "green"];

export function getRandomColor() {
  const clrIdx = getRandomInt(0, TILE_COLORS.length);
  return TILE_COLORS[clrIdx];
}

export function getRandomColorWheel(numColors) {
  const ranColor = getRandomInt(0, TILE_COLORS.length);

  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const color = TILE_COLORS[(ranColor + i) % TILE_COLORS.length];
    colors.push(color);
  }
  return colors;
}

export function getRandomShape(color, usedNames) {
  const shapeNames = Object.keys(SHAPES).filter((s) => !usedNames.has(s));
  if (shapeNames.length === 0) {
    console.error("Ran out of possible shapes to add!!!!");
    return null;
  }

  const randomShape = shapeNames[getRandomInt(0, shapeNames.length)];
  const randomRot = getRandomInt(0, 4);

  color = color ?? getRandomColor();
  return new Shape(randomShape, color, randomRot);
}

export function getRandomFakeShape(color, usedNames) {
  let fakeShape = getRandomShape(color, usedNames);
  if (fakeShape === null) return null;

  return new FakeShape(fakeShape.name, fakeShape.color, fakeShape.rotation);
}

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

export function getNowSeconds() {
    return Math.floor(Date.now() / 1000); 
}
