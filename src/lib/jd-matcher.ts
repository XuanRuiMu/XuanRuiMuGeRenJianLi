// 简历 × JD 匹配分析器 · 纯前端核心算法
// 不依赖任何网络、密钥或后端；所有计算在浏览器内完成。
// 来源：AboutMe 技术栈 + 7 款 Canvas 游戏 + React 技能矩阵 + 本纯前端 AI 工具。

export interface 技能 {
  /** 展示名（保留技术专有名词原文，如 React / FastAPI / RAG / MCP） */
  name: string;
  /** 分类（用于报告分组展示） */
  category: string;
  /** 候选人的熟练度 0-100（来自真实项目，用于匹配度加权） */
  proficiency: number;
  /** 中英文别名 / 关键词（小写用于匹配；避免过短导致误命中） */
  aliases: string[];
  /** 是否为候选人已掌握技能（false = 市场需求但候选人暂缺 → 差距项） */
  candidate: boolean;
}

export interface 匹配结果 {
  /** 综合匹配度 0-100 */
  score: number;
  /** 等级描述 */
  level: string;
  /** 已匹配技能（候选人掌握且 JD 提及） */
  matched: 技能[];
  /** 差距技能（JD 提及但候选人暂缺） */
  gaps: 技能[];
  /** 针对性建议（结合市场需求） */
  suggestions: string[];
  /** JD 中是否识别到任何受支持的技能关键词 */
  recognizedAny: boolean;
  stats: { matchedCount: number; gapCount: number; totalRequired: number };
}

// ───────────────────────── 候选人画像 + 市场技能词库 ─────────────────────────
// candidate: true  → 候选人已掌握
// candidate: false → 市场需求常见、但本简历项目未覆盖（差距项）
const 技能库: 技能[] = [
  // —— 前端 ——
  { name: "React", category: "前端", proficiency: 88, candidate: true,
    aliases: ["react", "react18", "react 18", "react19", "react 19", "react.js", "reactjs"] },
  { name: "TypeScript", category: "前端", proficiency: 90, candidate: true,
    aliases: ["typescript"] },
  { name: "Astro", category: "前端", proficiency: 82, candidate: true,
    aliases: ["astro"] },
  { name: "Vite", category: "前端", proficiency: 80, candidate: true,
    aliases: ["vite"] },
  { name: "Svelte", category: "前端", proficiency: 65, candidate: true,
    aliases: ["svelte"] },
  { name: "SolidJS", category: "前端", proficiency: 70, candidate: true,
    aliases: ["solidjs", "solid.js"] },
  { name: "JavaScript", category: "前端", proficiency: 80, candidate: true,
    aliases: ["javascript", "ecmascript"] },
  { name: "HTML / CSS", category: "前端", proficiency: 82, candidate: true,
    aliases: ["html5", "html", "css"] },
  { name: "UnoCSS", category: "前端", proficiency: 76, candidate: true,
    aliases: ["unocss", "原子化 css", "原子化样式"] },
  { name: "前端工程化", category: "前端", proficiency: 75, candidate: true,
    aliases: ["前端工程化", "构建工具", "bundler"] },

  // —— AI 工程 ——
  { name: "AI Agent", category: "AI 工程", proficiency: 83, candidate: true,
    aliases: ["ai agent", "智能体", "agent 工作流", "agent workflow", "skill 开发", "agent 应用"] },
  { name: "RAG", category: "AI 工程", proficiency: 80, candidate: true,
    aliases: ["rag", "检索增强", "检索增强生成", "retrieval-augmented"] },
  { name: "MCP", category: "AI 工程", proficiency: 75, candidate: true,
    aliases: ["mcp", "模型上下文协议", "model context protocol"] },

  // —— 后端 ——
  { name: "Python", category: "后端", proficiency: 85, candidate: true,
    aliases: ["python", "python3"] },
  { name: "FastAPI", category: "后端", proficiency: 78, candidate: true,
    aliases: ["fastapi", "fast api"] },
  { name: "Node.js", category: "后端", proficiency: 75, candidate: true,
    aliases: ["node.js", "nodejs", "node js"] },
  { name: "SSE 流式", category: "后端", proficiency: 72, candidate: true,
    aliases: ["sse", "server-sent", "server sent events", "流式输出", "流式接口", "流式"] },
  { name: "REST API", category: "后端", proficiency: 78, candidate: true,
    aliases: ["restful", "rest api", "rest 接口", "接口设计"] },

  // —— 数据库 ——
  { name: "MySQL", category: "数据库", proficiency: 72, candidate: true,
    aliases: ["mysql"] },
  { name: "SQLAlchemy", category: "数据库", proficiency: 70, candidate: true,
    aliases: ["sqlalchemy", "异步 orm", "orm"] },
  { name: "SQLite", category: "数据库", proficiency: 68, candidate: true,
    aliases: ["sqlite", "sqlite3"] },

  // —— 工具 & 工程 ——
  { name: "Git", category: "工具", proficiency: 85, candidate: true,
    aliases: ["git", "版本控制"] },
  { name: "Playwright", category: "工具", proficiency: 75, candidate: true,
    aliases: ["playwright", "自动化测试", "e2e 测试"] },
  { name: "Canvas 游戏引擎", category: "工具", proficiency: 78, candidate: true,
    aliases: ["canvas", "游戏引擎", "webgl", "html5 游戏", "2d 游戏"] },
  { name: "Web Audio", category: "工具", proficiency: 70, candidate: true,
    aliases: ["web audio", "webaudio", "音频处理", "音频 api"] },
  { name: "全栈开发", category: "工程", proficiency: 80, candidate: true,
    aliases: ["全栈", "fullstack", "full-stack"] },
  { name: "单元测试", category: "工程", proficiency: 65, candidate: true,
    aliases: ["单元测试", "unit test"] },
  { name: "数据结构与算法", category: "工程", proficiency: 70, candidate: true,
    aliases: ["数据结构", "算法", "algorithm"] },

  // —— 市场需求但候选人暂缺（差距项）——
  { name: "Java", category: "差距·后端", proficiency: 0, candidate: false,
    aliases: ["java", "java8", "java 11", "java 17"] },
  { name: "Spring Boot", category: "差距·后端", proficiency: 0, candidate: false,
    aliases: ["spring boot", "springboot", "spring 框架"] },
  { name: "Go", category: "差距·后端", proficiency: 0, candidate: false,
    aliases: ["golang", "go 语言"] },
  { name: "Rust", category: "差距·后端", proficiency: 0, candidate: false,
    aliases: ["rust"] },
  { name: "Docker", category: "差距·运维", proficiency: 0, candidate: false,
    aliases: ["docker", "容器化", "容器"] },
  { name: "Kubernetes", category: "差距·运维", proficiency: 0, candidate: false,
    aliases: ["kubernetes", "k8s"] },
  { name: "云原生 / 云", category: "差距·运维", proficiency: 0, candidate: false,
    aliases: ["云原生", "cloud native", "aws", "亚马逊云", "阿里云", "aliyun", "腾讯云", "linux 服务器", "ubuntu"] },
  { name: "DevOps / CI-CD", category: "差距·运维", proficiency: 0, candidate: false,
    aliases: ["devops", "ci/cd", "持续集成", "持续部署"] },
  { name: "Redis / 缓存", category: "差距·数据库", proficiency: 0, candidate: false,
    aliases: ["redis", "缓存"] },
  { name: "MongoDB / NoSQL", category: "差距·数据库", proficiency: 0, candidate: false,
    aliases: ["mongodb", "nosql", "文档数据库"] },
  { name: "微服务", category: "差距·架构", proficiency: 0, candidate: false,
    aliases: ["微服务", "microservice"] },
  { name: "机器学习 / 深度学习", category: "差距·算法", proficiency: 0, candidate: false,
    aliases: ["机器学习", "machine learning", "深度学习", "deep learning", "pytorch", "tensorflow"] },
  { name: "大模型 / LLM", category: "差距·算法", proficiency: 0, candidate: false,
    aliases: ["大模型", "llm", "large language model", "gpt", "nlp", "自然语言处理"] },
  { name: "Vue", category: "差距·前端", proficiency: 0, candidate: false,
    aliases: ["vue", "vue2", "vue3", "vue.js", "vue 3"] },
  { name: "Angular", category: "差距·前端", proficiency: 0, candidate: false,
    aliases: ["angular"] },
  { name: "微信小程序", category: "差距·前端", proficiency: 0, candidate: false,
    aliases: ["微信小程序", "小程序"] },
  { name: "数据可视化", category: "差距·前端", proficiency: 0, candidate: false,
    aliases: ["数据可视化", "echarts", "d3.js", "d3"] },
];

/** 处理长文本：限制长度避免极端输入下的性能问题 */
const 最大长度 = 30000;

function 归一化(文本: string): string {
  return 文本.toLowerCase().replace(/\s+/g, " ");
}

/** 从 JD 文本中抽取命中的技能（每个技能只计一次） */
function 抽取技能(归一化文本: string): { 命中: 技能[] } {
  const 命中: 技能[] = [];
  const 已加 = new Set<string>();
  for (const 技能 of 技能库) {
    const 匹配 = 技能.aliases.some((别名) => 归一化文本.includes(别名));
    if (匹配 && !已加.has(技能.name)) {
      已加.add(技能.name);
      命中.push(技能);
    }
  }
  return { 命中 };
}

function 评级(分数: number): string {
  if (分数 >= 85) return "优秀匹配 · 高度契合";
  if (分数 >= 70) return "良好匹配 · 较契合";
  if (分数 >= 55) return "基本匹配 · 部分契合";
  if (分数 >= 40) return "偏弱 · 存在明显差距";
  if (分数 > 0) return "差距较大 · 需重点补强";
  return "暂无匹配数据";
}

/**
 * 分析 JD 与候选人画像的匹配度。
 * 纯函数、无副作用、无网络调用。空 / 超长 / 无关键词输入均优雅处理。
 */
export function 分析JD(原始文本: string): 匹配结果 {
  const 文本 = (原始文本 ?? "").slice(0, 最大长度);
  const 空输入 = 文本.trim().length === 0;

  if (空输入) {
    return {
      score: 0,
      level: "请先粘贴 JD 文本",
      matched: [],
      gaps: [],
      suggestions: [
        "尚未检测到职位描述。请在右侧文本框粘贴 JD 全文（岗位职责 / 任职要求），再点击「分析匹配度」。",
      ],
      recognizedAny: false,
      stats: { matchedCount: 0, gapCount: 0, totalRequired: 0 },
    };
  }

  const 归一 = 归一化(文本);
  const { 命中 } = 抽取技能(归一);
  const 匹配项 = 命中.filter((s) => s.candidate);
  const 差距项 = 命中.filter((s) => !s.candidate);

  if (匹配项.length === 0 && 差距项.length === 0) {
    return {
      score: 0,
      level: "未识别到技能关键词",
      matched: [],
      gaps: [],
      suggestions: [
        "未能从文本中识别到受支持的技术关键词。请确认 JD 是否包含具体技术名词（如 React、Python、MySQL、RAG、MCP 等），或粘贴更完整的「任职要求」段落。",
      ],
      recognizedAny: false,
      stats: { matchedCount: 0, gapCount: 0, totalRequired: 0 },
    };
  }

  // 加权：已掌握技能按熟练度给部分信用；差距项每项计满权 1.0
  const 匹配信用 = 匹配项.reduce((和, s) => 和 + s.proficiency / 100, 0);
  const 差距惩罚 = 差距项.length; // 每项 1.0
  const 分数 =
    差距惩罚 === 0
      ? 100
      : Math.round((匹配信用 / (匹配信用 + 差距惩罚)) * 100);
  const 安全分数 = Math.max(0, Math.min(100, 分数));

  const 建议 = 生成建议(匹配项, 差距项);

  return {
    score: 安全分数,
    level: 评级(安全分数),
    matched: 匹配项,
    gaps: 差距项,
    suggestions: 建议,
    recognizedAny: true,
    stats: {
      matchedCount: 匹配项.length,
      gapCount: 差距项.length,
      totalRequired: 匹配项.length + 差距项.length,
    },
  };
}

/** 结合市场需求，生成针对性建议（措辞诚实，呼应技术选型决策） */
function 生成建议(匹配项: 技能[], 差距项: 技能[]): string[] {
  const 建议: string[] = [];

  if (匹配项.length > 0) {
    const 名称 = 匹配项.map((s) => s.name).join("、");
    const 重点 =
      匹配项.length > 4
        ? `${匹配项.slice(0, 4).map((s) => s.name).join("、")} 等`
        : 名称;
    建议.push(
      `你在 ${名称} 方向与岗位要求高度重叠。建议在简历与面试中重点突出真实项目佐证：React 技能矩阵（真交互组件）、FastAPI + RAG + MCP 后端、7 款 Canvas 游戏（Canvas/Web Audio 手写），并量化熟练度（如 ${重点}）。`,
    );
  }

  if (差距项.length > 0) {
    const 限数 = 6;
    const 差距名 = 差距项.slice(0, 限数).map((s) => s.name).join("、");
    const 余量 = 差距项.length - 限数;
    const 后缀 = 余量 > 0 ? ` 等共 ${差距项.length} 项` : "";
    建议.push(
      `JD 额外关注 ${差距名}${后缀}。说明：你的技术栈以 AI Agent 全栈（React / TypeScript / FastAPI / RAG / MCP）为主，本项目未覆盖 Java / 云原生 / Go 等方向（属既定技术选型，非疏漏）。若目标岗位强依赖这些，建议补充对应实践，或优先投递契合度更高的岗位。`,
    );
  }

  建议.push(
    "匹配度基于「技能关键词重叠」加权计算，未计入项目深度、业务理解与软技能，结果仅供参考；完整评估请结合简历与面试表现。",
  );

  return 建议;
}

/** 候选人画像快照（供快捷提问 / 自检使用） */
export function 候选人画像摘要(): { 分类: string; 技能: string[] }[] {
  const 分组 = new Map<string, string[]>();
  for (const s of 技能库) {
    if (!s.candidate) continue;
    const 列表 = 分组.get(s.category) ?? [];
    列表.push(s.name);
    分组.set(s.category, 列表);
  }
  return Array.from(分组.entries()).map(([分类, 技能]) => ({ 分类, 技能 }));
}
