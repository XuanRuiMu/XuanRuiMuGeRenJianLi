// 技能矩阵（Skill Matrix）—— 真实交互式 React 组件
// 由 Astro 以 island 方式渲染：<SkillMatrix client:visible />
// 特性：useState 管理筛选/选中状态，useEffect 驱动打字流与进度条动画，
//       真实点击/筛选/展开交互，UI 中文，主题与全站霓虹深色风格一致。

import { useEffect, useMemo, useRef, useState } from "react";

type Category = "全部" | "前端框架" | "编程语言" | "AI 工程" | "工具链";

interface Skill {
  id: string;
  name: string;
  category: Exclude<Category, "全部">;
  /** 熟练度 0-100 */
  level: number;
  desc: string;
}

const SKILLS: Skill[] = [
  {
    id: "react",
    name: "React",
    category: "前端框架",
    level: 88,
    desc: "用 React 18/19 Hooks 构建交互组件，本组件即真实示例。熟悉函数组件、状态管理与客户端孤岛渲染。",
  },
  {
    id: "typescript",
    name: "TypeScript",
    category: "编程语言",
    level: 90,
    desc: "全量类型约束，覆盖组件 props、工具库与 API 契约，降低运行时错误。",
  },
  {
    id: "astro",
    name: "Astro",
    category: "前端框架",
    level: 82,
    desc: "本站点的构建核心：多框架孤岛集成（React/Solid/Svelte），默认零 JS 输出。",
  },
  {
    id: "solid",
    name: "Solid",
    category: "前端框架",
    level: 70,
    desc: "细粒度响应式，用于本站的轻量交互组件（如 Tooltip）。",
  },
  {
    id: "svelte",
    name: "Svelte",
    category: "前端框架",
    level: 65,
    desc: "编译期响应式，用于站内动效与状态驱动视图。",
  },
  {
    id: "python",
    name: "Python",
    category: "编程语言",
    level: 85,
    desc: "后端服务与 AI 工具链主力语言，配合 FastAPI 与数据处理。",
  },
  {
    id: "fastapi",
    name: "FastAPI",
    category: "AI 工程",
    level: 78,
    desc: "异步 API 框架，支撑 RAG / MCP 后端服务的接口层。",
  },
  {
    id: "rag",
    name: "RAG",
    category: "AI 工程",
    level: 80,
    desc: "检索增强生成：把私有知识库接入大模型，提升回答准确率。",
  },
  {
    id: "mcp",
    name: "MCP",
    category: "AI 工程",
    level: 75,
    desc: "模型上下文协议：为 AI Agent 提供标准化的工具与数据源接入。",
  },
  {
    id: "aiagent",
    name: "AI Agent",
    category: "AI 工程",
    level: 83,
    desc: "面向求职场景的纯前端匹配分析器与对话式助手设计能力。",
  },
  {
    id: "java",
    name: "Java",
    category: "编程语言",
    level: 75,
    desc: "Java 17 生态：Spring Boot 后端开发主力语言，AI 简历匹配平台的实现语言。",
  },
  {
    id: "springboot",
    name: "Spring Boot",
    category: "工具链",
    level: 74,
    desc: "Spring Boot 3.5：REST API、Bean Validation、Data JPA，构建生产级后端服务。",
  },
  {
    id: "redis",
    name: "Redis",
    category: "工具链",
    level: 70,
    desc: "缓存与限流：结果缓存 + 固定窗口限流，配合 Caffeine 实现双模式降级。",
  },
  {
    id: "mysql",
    name: "MySQL",
    category: "工具链",
    level: 72,
    desc: "关系型数据建模与查询优化，服务后端持久化层。",
  },
  {
    id: "unocss",
    name: "UnoCSS",
    category: "工具链",
    level: 76,
    desc: "原子化 CSS 引擎，本站点样式系统底座，按需生成、零运行时。",
  },
];

const CATEGORIES: Category[] = ["全部", "前端框架", "编程语言", "AI 工程", "工具链"];

const ACCENT = "var(--primary-500)";
const ACCENT_SOFT = "color-mix(in srgb, var(--primary-500) 22%, transparent)";
const PANEL_BG = "var(--darkslate-800)";
const PANEL_BORDER = "color-mix(in srgb, var(--primary-500) 35%, transparent)";

/** 打字流动画：把文本逐字显示，营造「AI 正在输出」的观感 */
function useTypewriter(text: string, enabled: boolean, speed = 18) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [text, enabled, speed]);
  return shown;
}

export default function SkillMatrix() {
  const [active, setActive] = useState<Category>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [animateKey, setAnimateKey] = useState(0);

  const filtered = useMemo(
    () => (active === "全部" ? SKILLS : SKILLS.filter((s) => s.category === active)),
    [active],
  );

  const selected = useMemo(
    () => SKILLS.find((s) => s.id === selectedId) ?? null,
    [selectedId],
  );

  // 选中技能时，重置动画并触发进度条增长
  const barRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selected || !barRef.current) return;
    const el = barRef.current;
    el.style.width = "0%";
    // 下一帧再设为目标值，触发 CSS 过渡动画
    const raf = requestAnimationFrame(() => {
      el.style.width = `${selected.level}%`;
    });
    return () => cancelAnimationFrame(raf);
  }, [selected, animateKey]);

  const typedDesc = useTypewriter(selected?.desc ?? "", Boolean(selected), 16);

  return (
    <section
      aria-label="技能矩阵"
      style={{
        background: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 0 18px color-mix(in srgb, var(--primary-500) 14%, transparent)",
        fontFamily: "var(--font-satoshi), system-ui, sans-serif",
        color: "var(--darkslate-50)",
        maxWidth: "760px",
      }}
    >
      <header style={{ marginBottom: "16px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "1.25rem",
            color: "var(--primary-400)",
            textShadow: "0 0 12px color-mix(in srgb, var(--primary-500) 55%, transparent)",
            letterSpacing: "0.04em",
          }}
        >
          技能矩阵
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
          点击分类筛选，点选技能查看熟练度与说明（React 构建的真实交互组件）
        </p>
      </header>

      {/* 分类筛选 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {CATEGORIES.map((cat) => {
          const isActive = cat === active;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={isActive}
              style={{
                cursor: "pointer",
                padding: "6px 14px",
                fontSize: "0.82rem",
                borderRadius: "999px",
                border: `1px solid ${isActive ? ACCENT : "rgba(255,255,255,0.18)"}`,
                background: isActive ? ACCENT_SOFT : "transparent",
                color: isActive ? "var(--primary-400)" : "rgba(255,255,255,0.6)",
                transition: "all 160ms ease",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 技能卡片网格 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        {filtered.map((skill) => {
          const isSelected = skill.id === selectedId;
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => {
                setSelectedId(skill.id);
                setAnimateKey((k) => k + 1);
              }}
              aria-pressed={isSelected}
              style={{
                cursor: "pointer",
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${isSelected ? ACCENT : "rgba(255,255,255,0.12)"}`,
                background: isSelected ? ACCENT_SOFT : "rgba(255,255,255,0.03)",
                color: "inherit",
                transition: "all 160ms ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{skill.name}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--primary-400)" }}>
                  {skill.level}
                </span>
              </div>
              <div
                style={{
                  height: "5px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.1)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${skill.level}%`,
                    background: ACCENT,
                    boxShadow: "0 0 8px color-mix(in srgb, var(--primary-500) 60%, transparent)",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 详情面板 */}
      {selected ? (
        <div
          key={selected.id}
          style={{
            borderTop: `1px solid ${PANEL_BORDER}`,
            paddingTop: "14px",
            animation: "sm-fade 220ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <strong style={{ color: "var(--primary-400)", fontSize: "1rem" }}>
              {selected.name}
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 400,
                }}
              >
                {selected.category}
              </span>
            </strong>
            <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>
              熟练度 {selected.level}%
            </span>
          </div>

          <div
            style={{
              height: "8px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
              marginBottom: "12px",
            }}
          >
            <div
              ref={barRef}
              style={{
                height: "100%",
                width: "0%",
                background: ACCENT,
                boxShadow: "0 0 10px color-mix(in srgb, var(--primary-500) 65%, transparent)",
                transition: "width 700ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.82)",
              minHeight: "3.2em",
            }}
          >
            {typedDesc}
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "1em",
                marginLeft: "2px",
                background: "var(--primary-400)",
                verticalAlign: "-2px",
                animation: "sm-blink 1s steps(2) infinite",
              }}
            />
          </p>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>
          选择一个技能以查看详细说明 →
        </p>
      )}

      <style>{`
        @keyframes sm-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes sm-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </section>
  );
}
