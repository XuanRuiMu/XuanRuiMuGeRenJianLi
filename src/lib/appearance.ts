import { AVATAR_THEMES } from "./avatar-sprite.mjs";

export const STYLES = [
  { id: "default", label: "默认" },
  { id: "style-glass", label: "玻璃" },
  { id: "style-sharp", label: "锐利" },
  { id: "style-neon", label: "霓虹" },
  { id: "style-paper", label: "纸面" },
];

const named = (ids: string[]) => ids.filter((id) => id !== "default");

const THEME_CLASSES = named(
  AVATAR_THEMES.map((t: { theme: string }) => t.theme),
);
const STYLE_CLASSES = named(STYLES.map((s) => s.id));

export const BORDER_KEY = "cardBorder";

export const isCustomBorder = () =>
  (localStorage.getItem(BORDER_KEY) ?? "custom") === "custom";

export function applyAppearance(body: HTMLElement = document.body) {
  const theme = localStorage.getItem("theme");
  const style = localStorage.getItem("portfolioStyle");
  body.classList.remove(...THEME_CLASSES, ...STYLE_CLASSES);
  if (theme && theme !== "default") body.classList.add(theme);
  if (!isCustomBorder() && style && style !== "default")
    body.classList.add(style);
}
