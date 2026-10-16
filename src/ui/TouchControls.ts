import type { Input } from '../systems/Input';

// On-screen controls for phones and tablets. They appear once the screen has been touched (or
// straight away on a device whose main pointer is a finger) and stay out of the way otherwise:
// the stick is drawn wherever the left thumb lands, and the buttons sit by the right thumb.
// The action bar's own slots already take taps for abilities and panels.

export class TouchControls {
  private readonly root: HTMLElement;
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private running = false;

  constructor(private readonly input: Input, hudRoot: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.className = 'hud-only';
    this.root.innerHTML = `
      <div class="stick"><i></i></div>
      <div class="tbtns">
        <button class="tb jump" data-hold="Space" aria-label="Jump"><b>Jump</b></button>
        <button class="tb use" data-tap="KeyE" aria-label="Use"><b>Use</b></button>
        <button class="tb run" aria-label="Run"><b>Run</b></button>
        <button class="tb aim" data-tap="Tab" aria-label="Next target"><b>Target</b></button>
        <button class="tb dive" data-hold="KeyC" aria-label="Dive"><b>Dive</b></button>
      </div>`;
    hudRoot.append(this.root);
    this.base = this.root.querySelector('.stick')!;
    this.knob = this.base.querySelector('i')!;

    for (const b of Array.from(this.root.querySelectorAll<HTMLElement>('[data-hold]'))) {
      const code = b.dataset.hold!;
      const on = (e: Event) => { e.preventDefault(); b.classList.add('down'); input.hold(code, true); };
      const off = (e: Event) => { e.preventDefault(); b.classList.remove('down'); input.hold(code, false); };
      b.addEventListener('touchstart', on, { passive: false });
      b.addEventListener('touchend', off, { passive: false });
      b.addEventListener('touchcancel', off, { passive: false });
    }
    for (const b of Array.from(this.root.querySelectorAll<HTMLElement>('[data-tap]'))) {
      b.addEventListener('touchstart', (e) => { e.preventDefault(); input.tap(b.dataset.tap!); b.classList.add('down'); }, { passive: false });
      b.addEventListener('touchend', () => b.classList.remove('down'));
    }
    const run = this.root.querySelector<HTMLElement>('.run')!;
    run.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.running = !this.running;
      run.classList.toggle('on', this.running);
      input.hold('ShiftLeft', this.running);
    }, { passive: false });
    // The interaction prompt ("E  Talk to …") is a button too
    hudRoot.querySelector('#prompt')?.addEventListener('click', () => input.tap('KeyE'));

    input.onTouchSeen = () => this.enable();
    if (matchMedia('(pointer: coarse)').matches) this.enable();
  }

  private enable(): void {
    if (document.body.classList.contains('touch')) return;
    document.body.classList.add('touch');
    const tick = () => { this.draw(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  private draw(): void {
    const s = this.input.stick;
    this.base.classList.toggle('live', !!s);
    if (!s) { this.base.style.left = this.base.style.top = this.knob.style.transform = ''; return; }
    this.base.style.left = s.x0 + 'px';
    this.base.style.top = s.y0 + 'px';
    this.knob.style.transform = `translate(${s.x - s.x0}px, ${s.y - s.y0}px)`;
  }
}
