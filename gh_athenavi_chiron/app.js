const SCENARIOS = [
  {
    id: "contracts",
    label: "把这批合同归档到知识库，并列出续签风险",
    tenant: "acme",
    question: "把这批合同归档到知识库，并列出续签风险。",
    status: "运行完成 · 4 个事件 · 证据链可回放",
    steps: [
      { kind: "PLAN", text: "拆成两步：先入库建索引，再基于条款做续签风险归纳。", meta: "Agent: 合同助理 · 挂载技能 2 个" },
      { kind: "RETRIEVE", text: "解析 24 份合同写入知识库，向量落在 PostgreSQL 的 float8[] 列。", meta: "租户上下文 acme 随查询下推到数据层" },
      { kind: "TOOL", text: "调用条款抽取脚本，在独立受限容器内执行。", meta: "sandbox-service · 只读挂载 · 无外网" },
      { kind: "USAGE", text: "写入本次用量并记账，计费键幂等，重试不会重复扣费。", meta: "租户配额剩余充足 · 审计事件已落库" }
    ],
    evidence: [
      { title: "知识库写入", ref: "kb://acme/contracts · 24 docs" },
      { title: "沙箱执行记录", ref: "sandbox://run/clause-extract" },
      { title: "计费流水", ref: "billing://acme/idempotency-key" }
    ]
  },
  {
    id: "incident",
    label: "昨晚的告警是哪次工具调用引起的？",
    tenant: "northwind",
    question: "昨晚的告警是哪次工具调用引起的？给我可回放的证据。",
    status: "运行完成 · 4 个事件 · 断点续传已验证",
    steps: [
      { kind: "PLAN", text: "先按时间窗定位运行，再回放该运行的事件流。", meta: "Agent: 运维助手 · 只读权限" },
      { kind: "RETRIEVE", text: "从租户审计里筛出时间窗内的运行与工具调用事件。", meta: "租户级审计 · 不跨租户检索" },
      { kind: "REPLAY", text: "带 Last-Event-ID 重连 SSE，从断点继续接收而非重跑。", meta: "会话锁持有者唯一 · 运行亲和路由命中同一副本" },
      { kind: "USAGE", text: "输出定位结论并附事件编号，用量计入本次会话。", meta: "思考 / 工具 / 用量为独立事件" }
    ],
    evidence: [
      { title: "审计事件窗口", ref: "audit://northwind/run-0412" },
      { title: "SSE 续传点", ref: "Last-Event-ID: 118" },
      { title: "工具调用记录", ref: "tool://http-fetch#3" }
    ]
  },
  {
    id: "onboarding",
    label: "给新开通的租户初始化 Agent 与配额",
    tenant: "helix",
    question: "新租户用邀请码开通了标准套餐，帮它初始化 Agent 与配额。",
    status: "运行完成 · 4 个事件 · 租户上下文已建立",
    steps: [
      { kind: "PLAN", text: "校验邀请码与套餐，确定该租户的配额上限与限流阈值。", meta: "网关侧完成，引擎不直接信任前端传入的租户" },
      { kind: "TOOL", text: "创建租户上下文、默认 Agent 与角色权限。", meta: "数据库层带租户上下文写入" },
      { kind: "RETRIEVE", text: "挂载内置目录型技能，读取 {name}/SKILL.md 声明。", meta: "market/skills · 按需启用" },
      { kind: "USAGE", text: "登记套餐与按租户限流规则，超额请求在网关侧拦截。", meta: "计费幂等 · 管理员可在后台调整" }
    ],
    evidence: [
      { title: "邀请码核销", ref: "invite://helix/standard" },
      { title: "技能挂载", ref: "skill://market/report-writer" },
      { title: "限流规则", ref: "ratelimit://tenant/helix" }
    ]
  }
];

function makeStep(step, index) {
  const li = document.createElement("li");
  li.className = "step";

  const no = document.createElement("span");
  no.className = "step__no";
  no.textContent = String(index + 1).padStart(2, "0");

  const body = document.createElement("div");
  const kind = document.createElement("span");
  kind.className = "step__kind";
  kind.textContent = step.kind;

  const text = document.createElement("span");
  text.className = "step__text";
  text.append(kind, document.createTextNode(step.text));

  const meta = document.createElement("span");
  meta.className = "step__meta";
  meta.textContent = step.meta;

  body.append(text, meta);
  li.append(no, body);
  return li;
}

function renderHero() {
  const scenario = SCENARIOS[0];
  const list = document.querySelector("[data-hero-steps]");
  if (!list) return;
  list.replaceChildren(...scenario.steps.map(makeStep));
  document.querySelector("[data-hero-question]").textContent = scenario.question;
  document.querySelector("[data-hero-status]").textContent = scenario.status;
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

  function select(tab) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden = !active;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const offsets = { ArrowRight: 1, ArrowLeft: -1 };
      let next = null;
      if (event.key in offsets) next = tabs[(index + offsets[event.key] + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      select(next);
      next.focus();
    });
  });
}

function setupDemo() {
  const select = document.querySelector("[data-demo-select]");
  if (!select) return;

  const playBtn = document.querySelector("[data-demo-play]");
  const resetBtn = document.querySelector("[data-demo-reset]");
  const hint = document.querySelector("[data-demo-hint]");
  const stepsEl = document.querySelector("[data-demo-steps]");
  const evidenceEl = document.querySelector("[data-demo-evidence]");
  const statusEl = document.querySelector("[data-demo-status]");
  const questionEl = document.querySelector("[data-demo-question]");
  const titleEl = document.querySelector("[data-demo-title]");

  let timer = null;
  let shown = 0;

  SCENARIOS.forEach((scenario) => {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = scenario.label;
    select.append(option);
  });

  const current = () => SCENARIOS.find((item) => item.id === select.value) || SCENARIOS[0];

  function renderEvidence(count) {
    const items = current().evidence.slice(0, Math.max(0, count - 1)).map((entry) => {
      const li = document.createElement("li");
      const ref = document.createElement("span");
      ref.textContent = entry.ref;
      li.append(document.createTextNode(entry.title), ref);
      return li;
    });
    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "evidence__empty";
      empty.textContent = "暂无事件，展开运行后生成。";
      empty.style.border = "0";
      items.push(empty);
    }
    evidenceEl.replaceChildren(...items);
  }

  function reset() {
    clearTimeout(timer);
    timer = null;
    shown = 0;
    const scenario = current();
    questionEl.textContent = scenario.question;
    titleEl.textContent = `chiron / console — 租户 ${scenario.tenant} · 演示`;
    stepsEl.replaceChildren();
    renderEvidence(0);
    statusEl.textContent = "等待开始";
    playBtn.disabled = false;
    hint.textContent = "已重置，点击「逐步展开」开始。";
  }

  function tick() {
    const scenario = current();
    if (shown >= scenario.steps.length) {
      timer = null;
      statusEl.textContent = scenario.status;
      playBtn.disabled = false;
      hint.textContent = "演示结束。可切换问题或重置后重放。";
      return;
    }
    stepsEl.append(makeStep(scenario.steps[shown], shown));
    shown += 1;
    renderEvidence(shown);
    statusEl.textContent = `运行中 · 已接收 ${shown} / ${scenario.steps.length} 个事件`;
    timer = setTimeout(tick, 700);
  }

  playBtn.addEventListener("click", () => {
    if (timer) return;
    if (shown >= current().steps.length) reset();
    playBtn.disabled = true;
    hint.textContent = "正在按事件顺序展开演示数据。";
    tick();
  });

  resetBtn.addEventListener("click", reset);
  select.addEventListener("change", reset);
  reset();
}

renderHero();
setupTabs();
setupDemo();