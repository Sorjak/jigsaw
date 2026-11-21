import Shape from "./shape.js";

class FakeShape extends Shape {
  constructor(name, color, rotation) {
    super(name, color, rotation);
    this.id = "fake";
  }
}
export default FakeShape;
