const COLS = 6;
const ROWS = 4;

export const SPRITE = {
  COLS,
  ROWS,
  FRAMES: COLS * ROWS,
  CELL_W: 414,
  CELL_H: 390,
};

// 数组顺序即主题切换按钮的排列顺序。
// `default` 表示不挂任何主题类，此时生效的是 :root 里的调色板（蓝色）。
export const AVATAR_THEMES = [
  { theme: "default", name: "blue" },
  { theme: "yellow-theme", name: "yellow" },
  { theme: "red-theme", name: "red" },
  { theme: "purple-theme", name: "purple" },
  { theme: "green-theme", name: "green" },
].map((t) => ({ ...t, sheet: `/avatar-spin-${t.name}.webp` }));

export const UNDITHERED_SHEET = "/avatar-spin.webp";

export const SHEET_BY_THEME = Object.fromEntries(
  AVATAR_THEMES.map((t) => [t.theme, t.sheet]),
);

export const SHEET_BY_NAME = Object.fromEntries(
  AVATAR_THEMES.map((t) => [t.name, t.sheet]),
);

export const DEFAULT_SHEET = SHEET_BY_THEME.default;

export function cellPosition(index) {
  const col = index % SPRITE.COLS;
  const row = Math.floor(index / SPRITE.COLS);
  return `${(col * 100) / (SPRITE.COLS - 1)}% ${(row * 100) / (SPRITE.ROWS - 1)}%`;
}
