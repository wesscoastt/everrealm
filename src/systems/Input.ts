// Keyboard, mouse and touch state. Mouse drags orbit the camera; a click without a drag is an action.
// On a touch screen a thumb on the left of the screen is a movement stick wherever it lands, a
// finger anywhere else drags the camera (a tap is a click), and two fingers pinch to zoom.

const STICK_R = 54;

export class Input {
  readonly down = new Set<string>();
  private pressed = new Set<string>();
  dragX = 0;
  dragY = 0;
  wheel = 0;
  leftDown = false;
  rightDown = false;
  private dragDist = 0;
  private lastX = 0;
  private lastY = 0;
  /** Set when a left click (without dragging) happened this frame. */
  click: { x: number; y: number } | null = null;
  mouseX = 0;
  mouseY = 0;
  enabled = true;
  /** The touch stick, -1..1 on each axis (y is down the screen, so -1 is forward). */
  moveX = 0;
  moveY = 0;
  /** Where the stick was planted and where the thumb is, for drawing it. */
  stick: { x0: number; y0: number; x: number; y: number } | null = null;
  /** Set on the first touch: the page shows its touch controls from then on. */
  touch = false;
  onTouchSeen: (() => void) | null = null;
  private stickId: number | null = null;
  private look: { id: number; x: number; y: number; x0: number; y0: number; t: number } | null = null;
  private pinch: { id: number; x: number; y: number; d: number } | null = null;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => { this.down.clear(); this.leftDown = this.rightDown = false; this.stickId = null; this.stick = null; this.look = this.pinch = null; this.moveX = this.moveY = 0; });
    target.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    target.addEventListener('wheel', this.onWheel, { passive: false });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('touchstart', this.onTouchStart, { passive: false });
    target.addEventListener('touchmove', this.onTouchMove, { passive: false });
    target.addEventListener('touchend', this.onTouchEnd, { passive: false });
    target.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  /** A key pressed and released at once (an on-screen button). */
  tap(code: string): void {
    this.pressed.add(code);
  }

  /** An on-screen button held down or let go. */
  hold(code: string, on: boolean): void {
    if (on) { if (!this.down.has(code)) this.pressed.add(code); this.down.add(code); } else this.down.delete(code);
  }

  private seeTouch(): void {
    if (this.touch) return;
    this.touch = true;
    this.onTouchSeen?.();
  }

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    this.seeTouch();
    for (const t of Array.from(e.changedTouches)) {
      if (this.stickId === null && t.clientX < window.innerWidth * 0.4 && t.clientY > window.innerHeight * 0.3) {
        this.stickId = t.identifier;
        this.stick = { x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY };
      } else if (!this.look) {
        this.look = { id: t.identifier, x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t: performance.now() };
      } else if (!this.pinch) {
        this.pinch = { id: t.identifier, x: t.clientX, y: t.clientY, d: Math.hypot(t.clientX - this.look.x, t.clientY - this.look.y) };
        this.look.t = 0; // two fingers down: no tap
      }
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.stickId && this.stick) {
        let dx = t.clientX - this.stick.x0, dy = t.clientY - this.stick.y0;
        const d = Math.hypot(dx, dy);
        if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
        this.stick.x = this.stick.x0 + dx; this.stick.y = this.stick.y0 + dy;
        // A small dead zone, then full speed well before the rim
        const m = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - 6) / (STICK_R * 0.8)));
        const a = Math.atan2(dy, dx);
        this.moveX = Math.cos(a) * m; this.moveY = Math.sin(a) * m;
      } else if (this.pinch && (t.identifier === this.pinch.id || t.identifier === this.look?.id)) {
        if (t.identifier === this.pinch.id) { this.pinch.x = t.clientX; this.pinch.y = t.clientY; } else if (this.look) { this.look.x = t.clientX; this.look.y = t.clientY; }
        const d = Math.hypot(this.pinch.x - this.look!.x, this.pinch.y - this.look!.y);
        if (Math.abs(d - this.pinch.d) > 28) { this.wheel += d > this.pinch.d ? -1 : 1; this.pinch.d = d; }
      } else if (this.look && t.identifier === this.look.id) {
        const dx = t.clientX - this.look.x, dy = t.clientY - this.look.y;
        this.look.x = t.clientX; this.look.y = t.clientY;
        this.dragX += dx * 1.15; this.dragY += dy * 1.15;
      }
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.stickId) { this.stickId = null; this.stick = null; this.moveX = this.moveY = 0; }
      else if (this.pinch && t.identifier === this.pinch.id) this.pinch = null;
      else if (this.look && t.identifier === this.look.id) {
        const moved = Math.hypot(t.clientX - this.look.x0, t.clientY - this.look.y0);
        if (moved < 12 && this.look.t && performance.now() - this.look.t < 400) this.click = { x: t.clientX, y: t.clientY };
        this.look = null; this.pinch = null;
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (!this.down.has(e.code)) this.pressed.add(e.code);
    this.down.add(e.code);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent) => {
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragDist = 0;
    if (e.button === 0) this.leftDown = true;
    if (e.button === 2) this.rightDown = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      if (this.leftDown && this.dragDist < 6 && e.target === this.target) this.click = { x: e.clientX, y: e.clientY };
      this.leftDown = false;
    }
    if (e.button === 2) this.rightDown = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    if (!this.leftDown && !this.rightDown) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragDist += Math.abs(dx) + Math.abs(dy);
    if (this.dragDist > 4) {
      this.dragX += dx;
      this.dragY += dy;
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.wheel += Math.sign(e.deltaY);
  };

  /** True once per key press. */
  pressedOnce(code: string): boolean {
    if (!this.enabled) return false;
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  held(code: string): boolean {
    return this.enabled && this.down.has(code);
  }

  isDragging(): boolean {
    return (this.leftDown || this.rightDown) && this.dragDist > 4;
  }

  endFrame(): void {
    this.pressed.clear();
    this.dragX = 0;
    this.dragY = 0;
    this.wheel = 0;
    this.click = null;
  }
}
