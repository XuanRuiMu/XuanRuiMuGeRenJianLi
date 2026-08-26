import { 获取自定义光标, 销毁自定义光标 } from "./game/cursor";

if (typeof document !== "undefined") {
  document.addEventListener("astro:page-load", () => {
    获取自定义光标();
  });

  document.addEventListener("astro:before-swap", () => {
    销毁自定义光标();
  });
}
