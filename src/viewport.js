const RESIZE_DEBOUNCE_MS = 300;

export default class Viewport {
  constructor({ container, pixiApp, content, gridSize, onResize }) {
    this.container = container;
    this._app = pixiApp;
    this.renderer = pixiApp.renderer;
    this.content = content;
    this.gridSize = gridSize;
    this.onResize = onResize;

    this.scale = 1;
    this._width = -1;
    this._height = -1;
    this._timer = null;
    this._paused = false;
    this._observer = new ResizeObserver(() => this.schedule());
  }

  /** Start observing the container and fit once immediately. */
  start() {
    this._observer.observe(this.container);
    this.resize();
  }

  /**
   * Wait for a resize burst to settle before fitting. Calling
   * `renderer.resize` mid-drag would reallocate the canvas backing store on
   * every animation frame, which is very expensive for large high-DPR windows.
   *
   * Rendering is paused for the whole burst so the game isn't repainting a big
   * canvas while the browser is laying out and compositing the resize.
   */
  schedule() {
    // Ignore observer noise when the box didn't actually change size.
    if (
      this.container.clientWidth === this._width &&
      this.container.clientHeight === this._height
    ) {
      return;
    }

    if (this._timer === null) {
      this._paused = true;
      this._app.stop();
    } else {
      clearTimeout(this._timer);
    }

    this._timer = setTimeout(() => {
      this._timer = null;
      this.resize();
      if (this._paused) {
        this._paused = false;
        this._app.start();
      }
    }, RESIZE_DEBOUNCE_MS);
  }

  /** Fit the grid into the container, preserving aspect ratio. */
  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Not laid out yet (or hidden) — wait for the next observation.
    if (width === 0 || height === 0) return;
    if (width === this._width && height === this._height) return;

    this._width = width;
    this._height = height;

    const scale = Math.min(
      width / this.gridSize.width,
      height / this.gridSize.height,
    );
    this.scale = scale;

    this.content.scale.set(scale);

    // `_width`/`_height` already ensure the container genuinely changed and the
    // grid size is constant, so resize unconditionally. Comparing against
    // `renderer.screen` would be unreliable: Pixi quantises it to whole device
    // pixels, so fractional-DPR screens rarely match the requested size.
    const renderWidth = this.gridSize.width * scale;
    const renderHeight = this.gridSize.height * scale;
    this.renderer.resize(renderWidth, renderHeight);

    this.onResize?.(scale);
  }

  destroy() {
    this._observer.disconnect();
    if (this._timer !== null) clearTimeout(this._timer);
    if (this._paused) this._app.start();
  }
}
