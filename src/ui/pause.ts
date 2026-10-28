// Pause (Esc or the ❚❚ button, SPEC §13 bottom-right): resume, restart, or back to the menu.
import { onLangChange, t } from '../i18n/i18n';
import { versionLabel } from './whatsNew';

export const backToMenu = () => { location.href = location.pathname; };

export class PauseMenu {
  private el = document.createElement('div');
  private btn = document.createElement('button');
  paused = false;

  constructor(private actions: { restart: () => void; onChange: (paused: boolean) => void }) {
    this.el.className = 'pause';
    this.el.hidden = true;
    this.btn.className = 'pause-btn';
    this.btn.textContent = '❚❚';
    this.btn.addEventListener('click', () => this.toggle());
    document.body.append(this.el, this.btn);
    addEventListener('keydown', e => { if (e.code === 'Escape' && !e.repeat) this.toggle(); });
    this.draw();
    onLangChange(() => this.draw());
  }

  private draw(): void {
    this.el.innerHTML = `<div class="panel"><h2>${t('paused')}</h2><div class="buttons">
      <button data-a="resume">${t('resume')}</button><button data-a="restart">${t('restart')}</button><button data-a="menu">${t('menu')}</button></div></div>${versionLabel()}`;
    this.el.querySelector('[data-a="resume"]')!.addEventListener('click', () => this.set(false));
    this.el.querySelector('[data-a="restart"]')!.addEventListener('click', () => { this.set(false); this.actions.restart(); });
    this.el.querySelector('[data-a="menu"]')!.addEventListener('click', backToMenu);
  }

  toggle(): void { this.set(!this.paused); }

  set(p: boolean): void {
    this.paused = p;
    this.el.hidden = !p;
    this.actions.onChange(p);
  }
}
