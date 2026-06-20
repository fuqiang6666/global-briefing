# 全球重要信息简报 – 项目规范

## 项目概览

面向金融从业者的「每日全球要闻简报」智能 Web 应用。每天北京时间 08:01 自动采集并筛选全球重要新闻，生成 10 条结构化简报（远期发展 2 + 国内市场直接影响 3 + 未来一周重点事件 5），以仪表盘形式呈现，并支持邮件推送。

## 目录结构

```
src/
├── app/                       # Next.js App Router 页面与 API
│   ├── page.tsx               # 首页：简报展示 + 日期切换
│   ├── media/page.tsx         # 媒体库管理
│   ├── model/page.tsx         # 模型逻辑管理
│   ├── briefings/page.tsx     # 简报信息表管理
│   ├── events/page.tsx        # 未来事件表管理
│   ├── email/page.tsx         # 邮件设置
│   ├── layout.tsx             # 根布局（含 Shell 侧边栏 + TopBar）
│   ├── globals.css            # 全局样式（深色金融终端风）
│   └── api/                   # 后端 API 路由
│       ├── health/
│       ├── briefings/         # /api/briefings, /api/briefings/item/[id], /api/briefings/excel, /api/briefings/generate
│       ├── media/             # /api/media, /api/media/[id], /api/media/excel
│       ├── model/             # /api/model, /api/model/[id]
│       ├── events/            # /api/events, /api/events/[id], /api/events/excel
│       ├── email/             # /api/email/settings, /api/email/logs, /api/email/send, /api/email/status
│       └── cron/daily/        # 定时任务触发入口
├── components/
│   ├── Shell.tsx              # 桌面端侧边栏+顶栏壳
│   ├── Sidebar.tsx            # 左侧导航
│   ├── TopBar.tsx             # 顶栏
│   └── MobileNav.tsx          # 移动端汉堡菜单
├── lib/
│   ├── llm.ts                 # LLM 调用封装（非流式）
│   ├── web-search.ts          # 联网搜索封装
│   ├── email.ts               # 邮件发送主流程
│   ├── email-client.ts        # SMTP 客户端（SMTP 凭据从 coze_workload_identity 获取）
│   ├── excel.ts               # Excel 导入导出（基于 xlsx）
│   ├── date.ts                # 北京时间工具
│   └── generate-briefing.ts   # 简报生成主流程（联网搜索 + LLM 筛选）
├── storage/database/
│   ├── supabase-client.ts     # Supabase 客户端
│   ├── shared/schema.ts       # Drizzle 数据库 Schema（被 drizzle-kit 使用）
│   ├── schema.ts              # 原始 Schema 源
│   ├── media-sources.ts       # 媒体库 CRUD
│   ├── model-params.ts        # 筛选模型参数 CRUD（多版本）
│   ├── briefings.ts           # 简报 CRUD
│   ├── future-events.ts       # 未来事件 CRUD
│   └── email.ts               # 邮件设置/发送日志 CRUD
├── types/
│   └── briefing.ts            # SECTION_LABELS、Confidence、SECTION_ORDER 等共享类型
└── ...

DESIGN.md                     # 设计规范
```

## 数据库表（PostgreSQL via Supabase）

- `media_sources` – 媒体源（名称 / 网址 / 类型 party/financial/international/industry / 区域 / 是否启用 / 备注）
- `model_params` – 筛选模型参数（多版本，关键字权重、主题偏好、排除词、远期/国内/一周 数量、时间窗、备注、created_by=manual|ai）
- `briefings` – 每日简报条目（日期 / 板块 long_term|domestic_impact|weekly_event / 排序 / 标题 / 正文 / 出处 / 出处链接 / 置信度 / 详细分析 / 相关标的 JSON / 波动预测 / 事件日期）
- `future_events` – 未来事件（事件日期 / 标题 / 描述 / 分类 / 置信度 / 影响标的 / 波动预测 / 出处 / 详细分析 / 状态 pending|done|cancelled）
- `email_settings` – 邮件设置（单行；启用 / 收件人 / 抄送 / 主题前缀 / 发送小时 / 发送分钟 / 末尾链接开关）
- `email_send_log` – 邮件发送日志（发送日期 / 收件人 / 主题 / 状态 / 错误 / 简报日期 / 条目数）

所有表已启用 RLS（管理员单用户，策略为「全开」）。

## 关键流程

### 1. 简报生成
- `/api/briefings/generate` 接收 `{ date, replace }`
- `lib/generate-briefing.ts`：
  1. 读取媒体库与激活态的 `model_params`
  2. 联网搜索多组 query（宏观/政策/市场/事件/科技等）
  3. 提示 LLM 基于媒体权威 + 关键词权重 + 主题偏好筛选 10 条
  4. 调用 LLM 生成详细分析（影响逻辑 / 受影响标的 / 波动预测）
  5. 返回结构化 JSON

### 2. 定时任务
- `/api/cron/daily` 接收 `{ secret, date?, forceGenerate?, forceSendEmail? }`
- 流程：鉴权 → 生成简报 → 写库 → 检查邮件设置并在 08:01（或 `forceSendEmail`）发送
- 保护：`CRON_SECRET` 环境变量，默认 `global-briefing-default-secret`

### 3. 邮件发送
- `lib/email-client.ts` 从 `coze_workload_identity` 拉取 SMTP 凭据（Python helper）
- `lib/email.ts` 用 `nodemailer` 组装 HTML / 纯文本，附末尾「媒体库」「模型逻辑」链接
- 发送后写 `email_send_log`

## 编码规范

- 全部使用 pnpm，禁止 npm/yarn
- TypeScript 严格模式，所有函数必须显式标注返回类型
- 严格禁止 `as any`、`// @ts-ignore`
- React 组件：服务端组件默认，`useEffect` + `useState` 仅在必须时使用
- 样式：Tailwind CSS 4 + 少量自定义 CSS 变量（`--bg-deep` / `--accent`）
- 颜色体系：深色金融终端风（`slate-950` / `slate-900` 底 + 琥珀色 `amber-500` 强调 + 翠色 `emerald-500` 涨 / 玫瑰色 `rose-500` 跌）
- 字体：系统 sans + `font-mono` 用于数字与代码

## 关键命令

- `pnpm dev` – 启动开发环境
- `pnpm build` – 构建
- `pnpm start` – 启动生产环境
- `pnpm lint --quiet` – 静态检查
- `pnpm ts-check` – TypeScript 类型检查
- `coze-coding-ai db upgrade` – 将 `shared/schema.ts` 同步到 Supabase
- `coze-coding-ai db generate-models` – 从远端覆盖 `shared/schema.ts`

## 定时任务外部触发

外部 cron 服务（北京时区）每天 08:01 POST 到 `${COZE_PROJECT_DOMAIN_DEFAULT}/api/cron/daily`，body 为：
```json
{ "secret": "global-briefing-default-secret" }
```

## 环境变量

- `CRON_SECRET` – 定时任务密钥（不设置时使用默认值）
- `COZE_PROJECT_DOMAIN_DEFAULT` – 邮件中的链接域名
- Supabase / LLM / Web Search / Email 凭据由 `coze-coding-dev-sdk` 自动注入，无需手工配置
