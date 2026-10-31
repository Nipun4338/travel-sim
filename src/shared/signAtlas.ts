// The street-sign atlas (polish spec §3): the bake writes UVs into this layout and the game paints
// it at load time, so the shop names cost no download. One 1024² canvas: 48 shop boards of
// 256×64 px in the top 768 px, then 4 billboards of 512×128 px.
export const ATLAS_PX = 1024;
export const SIGN_COLS = 4, SIGN_ROWS = 12, SIGN_W = 256, SIGN_H = 64;
export const SIGN_CELLS = SIGN_COLS * SIGN_ROWS;
export const BILLBOARD_W = 512, BILLBOARD_H = 128, BILLBOARD_CELLS = 4;

/** u0, v0, u1, v1 with v up: the canvas top is v = 1 (CanvasTexture's default flipY). */
export type UVRect = [number, number, number, number];

const rect = (x: number, y: number, w: number, h: number): UVRect => {
  const inset = 2; // keep mipmaps from bleeding into the neighbouring cell
  return [(x + inset) / ATLAS_PX, 1 - (y + h - inset) / ATLAS_PX, (x + w - inset) / ATLAS_PX, 1 - (y + inset) / ATLAS_PX];
};
export const signCell = (i: number): [number, number] => {
  const c = ((i % SIGN_CELLS) + SIGN_CELLS) % SIGN_CELLS;
  return [(c % SIGN_COLS) * SIGN_W, Math.floor(c / SIGN_COLS) * SIGN_H];
};
export const billboardCell = (i: number): [number, number] => {
  const c = ((i % BILLBOARD_CELLS) + BILLBOARD_CELLS) % BILLBOARD_CELLS;
  return [(c % 2) * BILLBOARD_W, SIGN_ROWS * SIGN_H + Math.floor(c / 2) * BILLBOARD_H];
};
export const signUV = (i: number): UVRect => rect(...signCell(i), SIGN_W, SIGN_H);
export const billboardUV = (i: number): UVRect => rect(...billboardCell(i), BILLBOARD_W, BILLBOARD_H);

/** Generic shop names, no real brands. */
export const SHOP_NAMES = [
  'মায়ের দোয়া স্টোর', 'নিউ ঢাকা ফার্মেসী', 'বিসমিল্লাহ হোটেল', 'রহিম টেলিকম', 'ফ্লেক্সিলোড', 'আল-আমিন ট্রেডার্স', 'জননী ফ্যাশন', 'সততা মেডিকেল হল',
  'নিউ মডেল টেইলার্স', 'বাংলা রেস্তোরাঁ', 'ফটোকপি কম্পিউটার', 'চা পান সিগারেট', 'লাকী ইলেকট্রনিক্স', 'হাজী বিরিয়ানি ঘর', 'রূপসী বিউটি পার্লার', 'নূর হার্ডওয়্যার',
  'কোচিং সেন্টার', 'ডায়াগনস্টিক সেন্টার', 'সোনালী জুয়েলার্স', 'মোবাইল সার্ভিসিং', 'ফুচকা চটপটি', 'আমানত ক্লথ স্টোর', 'স্বপ্ন ডেন্টাল কেয়ার', 'ভাই ভাই স্টোর',
];
export const BILLBOARD_SLOGANS: Array<[string, string, string]> = [
  ['#0b5394', 'নতুন ফ্ল্যাট বুকিং চলছে', '#ffd84d'], ['#c62828', 'মিষ্টি দই ও রসমালাই', '#ffffff'],
  ['#1b7f3b', 'ভর্তি চলছে! কোচিং', '#ffffff'], ['#f2c200', 'সাশ্রয়ী মূল্যে টাইলস', '#7a0d0d'],
];
export const SIGN_COLOURS = ['#c62828', '#1b7f3b', '#1f4fa8', '#f2c200', '#e8710a', '#b0186e', '#f3efe3', '#138a8a', '#222222', '#6a1b9a'];
