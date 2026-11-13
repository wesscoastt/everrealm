import type { Input } from './Input';

// A controller, laid out the way ESO's console controls are (owner 2026-11-12: "improve controller support where needed to
// match ESO controls"). It drives the game through the same keys the keyboard does (Input.hold / tap), so everything the
// keyboard can do, the pad can, and the options' key moves follow it.
//
//   Left stick: move. Right stick: the camera. L3: sprint (toggle). R3: next target.
//   RT: attack (skill 1). LT: block, held. LT + A: dodge roll.
//   X, Y, B, RB: skills 2 to 5. Hold LB: X, Y, B are skills 6 to 8; LB + RB is skill 8 (the ultimate, as ESO's).
//   A: talk to or use what's in reach, or jump. D-pad: up, the quick slot (food); down, the horse; left, your light;
//   right, sheathe or draw. Start: the menu (closes a window). View: the map. LB + Start: the pack; LB + View: the journal.
//   In a conversation: A, X and Y pick the first three answers, B leaves. In a window: the left stick moves a pointer,
//   A clicks, B closes.

const DEAD = 0.2;
/** Standard-mapping button indexes. */
const A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7, VIEW = 8, START = 9, L3 = 10, R3 = 11, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;

export interface PadHost {
  rotate(dx: number, dy: number): void;
  /** A window open (inventory, map, options...). */
  windowOpen(): boolean;
  inDialogue(): boolean;
  /** Something in reach to talk to or use (the E prompt is showing). */
  canInteract(): boolean;
  /** Seen a pad for the first time: say how it's laid out. */
  hello(name: string): void;
}

export class Gamepad {
  private prev: boolean[] = [];
  private sprint = false;
  private seen = false;
  private cursor: HTMLDivElement | null = null;
  private cx = innerWidth / 2;
  private cy = innerHeight / 2;
  /** Keys held down for a button, so they're let go with it. */
  private holding = new Map<number, string>();

  constructor(private input: Input, private host: PadHost) {}

  poll(dt: number): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = [...pads].find((p) => p && p.connected && p.mapping === 'standard') ?? [...pads].find((p) => p && p.connected);
    if (!pad) { this.release(); return; }
    if (!this.seen) { this.seen = true; this.host.hello(pad.id); }
    const btn = (i: number) => { const b = pad.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
    const was = (i: number) => !!this.prev[i];
    const down = (i: number) => btn(i) && !was(i);
    const ax = (i: number) => { const v = pad.axes[i] ?? 0; return Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD); };
    const I = this.input;
    const ui = this.host.windowOpen(), talk = this.host.inDialogue();

    // The pointer, in a window: the left stick moves it, A clicks what's under it, B closes the window
    if (ui && !talk) {
      this.showCursor(true);
      this.cx = Math.max(0, Math.min(innerWidth - 1, this.cx + ax(0) * 900 * dt));
      this.cy = Math.max(0, Math.min(innerHeight - 1, this.cy + ax(1) * 900 * dt));
      this.cursor!.style.transform = `translate(${this.cx}px, ${this.cy}px)`;
      if (down(A)) (document.elementFromPoint(this.cx, this.cy) as HTMLElement | null)?.click();
      // (the right stick scrolls what's under the pointer)
      const sy = ax(3);
      if (sy) (document.elementFromPoint(this.cx, this.cy) as HTMLElement | null)?.closest('.body, .rb-list, .inv-bag, .panel, [class*="scroll"]')?.scrollBy(0, sy * 900 * dt);
      I.moveX = I.moveY = 0;
      if (down(B) || down(START)) I.tap('Escape');
      if (down(VIEW)) I.tap('KeyM');
      this.remember(pad);
      return;
    }
    this.showCursor(false);

    // Moving and looking (a touch stick in use keeps the stick)
    if (!I.stick) { I.moveX = ax(0); I.moveY = ax(1); }
    const rx = ax(2), ry = ax(3);
    if (rx || ry) this.host.rotate(rx * 650 * dt, ry * 420 * dt);
    if (down(L3)) this.sprint = !this.sprint;
    if (Math.hypot(ax(0), ax(1)) < 0.1) this.sprint = false;
    this.hold(L3 + 100, 'ShiftLeft', this.sprint);

    // In a conversation: answers on the face buttons
    if (talk) {
      if (down(A)) I.tap('Digit1');
      if (down(X)) I.tap('Digit2');
      if (down(Y)) I.tap('Digit3');
      if (down(B)) I.tap('Escape');
      this.remember(pad);
      return;
    }

    const lb = btn(LB);
    // Attack, block, dodge
    if (down(RT)) I.tap('Digit1');
    this.hold(LT, 'KeyV', btn(LT));
    if (down(A)) { if (btn(LT)) I.tap('KeyQ'); else if (this.host.canInteract()) I.tap('KeyE'); else { I.tap('Space'); this.hold(A + 100, 'Space', true); } }
    if (!btn(A)) this.hold(A + 100, 'Space', false);
    // The bar
    if (down(X)) I.tap(lb ? 'Digit6' : 'Digit2');
    if (down(Y)) I.tap(lb ? 'Digit7' : 'Digit3');
    if (down(B)) I.tap(lb ? 'Digit8' : 'Digit4');
    if (down(RB)) I.tap(lb ? 'Digit8' : 'Digit5');
    // The D-pad, the target, the menus
    if (down(UP)) I.tap('KeyF');
    if (down(DOWN)) I.tap('KeyG');
    if (down(LEFT)) I.tap('KeyL');
    if (down(RIGHT)) I.tap('KeyH');
    if (down(R3)) I.tap('Tab');
    if (down(START)) I.tap(lb ? 'KeyI' : 'Escape');
    if (down(VIEW)) I.tap(lb ? 'KeyJ' : 'KeyM');
    this.remember(pad);
  }

  private hold(id: number, code: string, on: boolean): void {
    const had = this.holding.has(id);
    if (on && !had) { this.input.hold(code, true); this.holding.set(id, code); }
    else if (!on && had) { this.input.hold(code, false); this.holding.delete(id); }
  }

  private release(): void {
    for (const [id, code] of this.holding) { this.input.hold(code, false); this.holding.delete(id); }
    this.showCursor(false);
  }

  private remember(pad: globalThis.Gamepad): void { this.prev = pad.buttons.map((b) => b.pressed || b.value > 0.5); }

  private showCursor(on: boolean): void {
    if (on && !this.cursor) {
      this.cursor = document.createElement('div');
      this.cursor.id = 'pad-cursor';
      document.body.appendChild(this.cursor);
    }
    if (this.cursor) this.cursor.style.display = on ? 'block' : 'none';
  }
}
