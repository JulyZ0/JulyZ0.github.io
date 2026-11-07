const SCENARIOS = {
  archive: {
    question: '把这个目录里的发票按月归档。',
    summary: '归档完成，6 份待人工确认',
    steps: [
      { tag: 'PLAN', title: '拆解目标', detail: '识别 128 个 PDF，提取开票日期，再生成月度目录。', meta: '3 个子任务' },
      { tag: 'SANDBOX', title: '申请受限容器', detail: '沙箱可用：Inbox 只读挂载，Archive 可写，禁止出网。', meta: '隔离就绪', tone: 'ok' },
      { tag: 'TOOL', title: '批量提取文本 ×128', detail: '提取在容器内完成，宿主进程不落盘。', meta: '128 次调用 · 本地用量 42.1k tokens' },
      { tag: 'OBSERVE', title: '校验日期解析', detail: '6 份扫描件日期置信度偏低，转交子智能体复核。', meta: '子智能体 1 · 运行中' },
      { tag: 'DONE', title: '写入月度目录', detail: '按 2026-01 至 2026-06 归档，复核未通过的单独列出。', meta: '用时 2m14s' }
    ]
  },
  tests: {
    question: '找出仓库里失败的测试，并说明原因。',
    summary: '定位 2 处根因，未修改任何文件',
    steps: [
      { tag: 'PLAN', title: '定位测试入口', detail: '读取 Makefile 与 pytest 配置，确定 2 个测试目标。', meta: '2 个测试目标' },
      { tag: 'SANDBOX', title: '申请受限容器', detail: '沙箱可用：仓库只读挂载，禁止出网。', meta: '隔离就绪', tone: 'ok' },
      { tag: 'TOOL', title: '执行 pytest -q', detail: '在容器内运行 214 项，9 项失败。', meta: '214 项 · 9 项失败' },
      { tag: 'OBSERVE', title: '归并失败堆栈', detail: '9 项失败聚成 2 类：fixture 路径与时区断言。', meta: '2 类根因' },
      { tag: 'DONE', title: '输出结论', detail: '给出 2 处根因和最小复现命令，未改动仓库文件。', meta: '用时 1m02s' }
    ]
  },
  nosandbox: {
    question: '沙箱不可用的时候，它会怎么做？',
    summary: '已拒绝启动，宿主未执行任何命令',
    steps: [
      { tag: 'PLAN', title: '准备执行环境', detail: '会话请求调用本地工具，先检查隔离前提。', meta: '1 个工具请求' },
      { tag: 'SANDBOX', title: '受限容器未就绪', detail: '容器运行时不可用，隔离前提不成立。', meta: '检查未通过', tone: 'warn' },
      { tag: 'BLOCK', title: '拒绝启动', detail: '不降级为进程内执行，会话终止并给出原因。', meta: '0 次回退', tone: 'warn' },
      { tag: 'DONE', title: '会话结束', detail: '宿主未执行任何命令，等待环境修复后重试。', meta: '0 次工具调用' }
    ]
  }
};

const list = document.getElementById('demo-steps');
const questionEl = document.getElementById('demo-question');
const statusEl = document.getElementById('demo-status');
const chips = Array.from(document.querySelectorAll('.chip[data-scenario]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let current = 'archive';
let timers = [];

function motionScale() {
  const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-motion'));
  return Number.isFinite(raw) ? raw : 1;
}

function stopPlayback() {
  timers.forEach(clearTimeout);
  timers = [];
  list.classList.remove('is-playing');
}

function render(key) {
  const scenario = SCENARIOS[key];
  questionEl.textContent = scenario.question;
  list.replaceChildren();

  scenario.steps.forEach((step, i) => {
    const li = document.createElement('li');
    li.className = 'step is-on';
    if (step.tone) li.dataset.tone = step.tone;

    const num = document.createElement('span');
    num.className = 'step-num';
    num.textContent = String(i + 1).padStart(2, '0');

    const body = document.createElement('div');
    const head = document.createElement('div');
    head.className = 'step-head';
    const tag = document.createElement('span');
    tag.className = 'step-tag';
    tag.textContent = step.tag;
    const title = document.createElement('span');
    title.className = 'step-title';
    title.textContent = step.title;
    head.append(tag, title);

    const detail = document.createElement('p');
    detail.className = 'step-detail';
    detail.textContent = step.detail;
    const meta = document.createElement('p');
    meta.className = 'step-meta';
    meta.textContent = step.meta;

    body.append(head, detail, meta);
    li.append(num, body);
    list.append(li);
  });

  setStatus(scenario.steps.length, scenario.summary);
}

function setStatus(total, summary, progress) {
  statusEl.textContent = progress === undefined
    ? `演示数据 · ${total} 步 · ${summary}`
    : `演示回放 · 第 ${progress} / ${total} 步`;
}

function play() {
  stopPlayback();
  const scenario = SCENARIOS[current];
  const items = Array.from(list.children);
  const scale = motionScale();

  if (reducedMotion.matches || scale <= 0) {
    setStatus(scenario.steps.length, scenario.summary);
    return;
  }

  items.forEach((li) => li.classList.remove('is-on'));
  list.classList.add('is-playing');
  const beat = 620 * scale;

  items.forEach((li, i) => {
    timers.push(setTimeout(() => {
      li.classList.add('is-on');
      setStatus(items.length, scenario.summary, i + 1);
    }, beat * (i + 1)));
  });

  timers.push(setTimeout(() => {
    list.classList.remove('is-playing');
    setStatus(items.length, scenario.summary);
  }, beat * (items.length + 1)));
}

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    current = chip.dataset.scenario;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    stopPlayback();
    render(current);
    play();
  });
});

document.getElementById('demo-replay').addEventListener('click', play);

document.getElementById('hero-play').addEventListener('click', () => {
  document.getElementById('demo').scrollIntoView({
    behavior: reducedMotion.matches ? 'auto' : 'smooth',
    block: 'center'
  });
  play();
});

render(current);