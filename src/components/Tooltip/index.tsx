import { useState, type ReactNode } from "react";
import { 古诗词, 取随机序号 } from "../../lib/locales/poems";

type Props = {
  children?: ReactNode;
  class?: string;
};

export default function Tooltip(props: Props) {
  const [序号, 设置序号] = useState(() => 取随机序号(-1));
  const [是否显示, 设置是否显示] = useState(false);

  const 诗句 = 古诗词[序号];

  // 每次按下都重新抽取，并与当前这一句不同，避免“点了却没变”的观感
  const 按下 = () => {
    设置序号((旧序号) => 取随机序号(旧序号));
    设置是否显示(true);
  };

  const 抬起 = () => 设置是否显示(false);

  return (
    <div className={`h-full relative inline-block ${props.class ?? ""}`}>
      <div
        className="h-full"
        onMouseDown={按下}
        onMouseUp={抬起}
        onMouseLeave={抬起}
        onTouchStart={按下}
        onTouchEnd={抬起}
      >
        {props.children}
      </div>

      {是否显示 && (
        <div
          className="tt-shell absolute z-10"
          style={{ width: "max-content" }}
        >
          <div
            className="tt--ns max-w-[19rem] p-2 bg-black text-white text-center rounded-lg shadow-custom shadow-primary-500 border border-primary-500 whitespace-normal after:content-[''] after:block after:rotate-45 after:w-4 after:h-4 after:shadow-custom after:shadow-primary-500 after:absolute after:-bottom-2 after:-translate-x-1/2 after:left-1/2 after:bg-black after:z-20"
            style={{ minWidth: "max-content" }}
          >
            <div className="text-sm leading-relaxed text-center">
              {诗句.正文
                .split(/(?<=[，。；、！？])/)
                .map((句, i) => (
                  <span key={i} className="block">
                    {句}
                  </span>
                ))}
            </div>
            <p className="mt-1 text-3xs text-darkslate-300">
              —— {诗句.作者}《{诗句.篇名}》
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
