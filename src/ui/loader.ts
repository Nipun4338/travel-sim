// The loading screen (index.html paints it before any script runs): a progress bar fed by real
// loading work, a status line, rotating tips, and a fade-out once the first frame is ready.
import { getLang, t } from '../i18n/i18n';
import { APP_VERSION } from './whatsNew';

const TIPS: Record<'bn' | 'en', string[]> = {
  bn: [
    'স্টপে থেমে দরজা খুলুন (F), যাত্রীরা উঠবে-নামবে।',
    'V চাপলে ক্যাব আর বাইরের ক্যামেরা বদলায়।',
    'বৃষ্টিতে থামতে বেশি জায়গা লাগে, আগে থেকে ব্রেক করুন।',
    'M চাপলে কোণের মানচিত্র দেখা যায় বা লুকায়।',
    'ঝাঁকুনি ছাড়া মসৃণভাবে চালালে যাত্রীরা খুশি থাকে।',
    'বিমানে W চাপলে নাক নামে, S চাপলে ওঠে, যেমন আসল কন্ট্রোলে।',
    'সেটিংস থেকে আরামের খেলা বা স্কোরের খেলা বেছে নিন।',
    'অঞ্চল ডাউনলোড করে রাখলে ইন্টারনেট ছাড়াও খেলা যায়।',
  ],
  en: [
    'Stop at the Stop and open the doors (F) to let passengers on and off.',
    'Press V to switch between the cab and the outside camera.',
    'Rain lengthens your stopping distance: brake early.',
    'Press M to show or hide the corner map.',
    'Drive smoothly, without jerks, to keep passengers happy.',
    'In the plane, W lowers the nose and S raises it, like a real control column.',
    'Choose relaxed or scored play in Settings.',
    'Download a Region and you can play it without internet.',
  ],
};

class Loader {
  private el = document.getElementById('loading');
  private fill = this.el?.querySelector<HTMLElement>('.ld-fill') ?? null;
  private bar = this.el?.querySelector<HTMLElement>('.ld-bar') ?? null;
  private status = this.el?.querySelector<HTMLElement>('.ld-status') ?? null;
  private tip = this.el?.querySelector<HTMLElement>('.ld-tip') ?? null;
  private shown = 0;
  private range: [number, number] = [0, 0.1];
  private tipTimer = 0;

  constructor() {
    if (!this.el) return;
    const lang = getLang();
    const v = this.el.querySelector('.ld-version');
    if (v) v.textContent = `v${APP_VERSION}`;
    if (lang === 'en') {
      this.el.querySelector('.ld-sub')!.textContent = 'Travel Sim · Dhaka & Bandarban';
      this.status!.textContent = 'Loading…';
    }
    const tips = TIPS[lang];
    let i = Math.floor(Math.random() * tips.length);
    const show = () => {
      if (!this.tip) return;
      this.tip.style.opacity = '0';
      setTimeout(() => { this.tip!.textContent = tips[i++ % tips.length]; this.tip!.style.opacity = '.8'; }, 300);
    };
    show();
    this.tipTimer = window.setInterval(show, 5000);
  }

  /** Starts a stage: its status text (an i18n key) and the slice of the bar it fills, 0..1. */
  stage(key: string, from: number, to: number): void {
    if (this.status) this.status.textContent = t(key);
    this.range = [from, to];
    this.progress(0);
  }

  /** Progress within the current stage, 0..1. The bar never moves backwards. */
  progress(p: number): void {
    const [a, b] = this.range;
    this.shown = Math.max(this.shown, a + (b - a) * Math.max(0, Math.min(1, p)));
    if (this.fill) this.fill.style.width = `${Math.max(4, this.shown * 100)}%`;
    this.bar?.setAttribute('aria-valuenow', String(Math.round(this.shown * 100)));
  }

  /** Fills the bar and fades the screen out. */
  done(): void {
    if (!this.el) return;
    this.range = [1, 1];
    this.progress(1);
    clearInterval(this.tipTimer);
    const el = this.el;
    this.el = null;
    requestAnimationFrame(() => {
      el.classList.add('done');
      setTimeout(() => el.remove(), 500);
    });
  }
}

export const loader = new Loader();
