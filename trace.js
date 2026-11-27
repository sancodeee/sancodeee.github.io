(() => {
  "use strict";

  const card = document.querySelector(".identity-card");
  const diagram = document.getElementById("trace-pane");
  const profile = document.getElementById("profile-pane");
  const map = diagram.querySelector(".trace-map");
  const canvas = map.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const tabs = [...card.querySelectorAll('[role="tab"]')];
  const nodes = [...map.querySelectorAll(".trace-node")];
  const message = diagram.querySelector(".trace-message");
  const announce = diagram.querySelector(".trace-announcement");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 3800;
  const routes = [
    ["entry", "model", .04, .30],
    ["model", "a", .30, .56],
    ["model", "b", .30, .65],
    ["a", "quote", .56, .84],
    ["b", "quote", .65, .93]
  ];
  const arrivals = { entry: 0, model: .30, a: .56, b: .65, quote: .93 };
  let paths = [];
  let colors;
  let progress = 0;
  let frame = 0;
  let started = false;
  let manual = false;

  function measure() {
    const width = map.clientWidth;
    const height = map.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const points = Object.fromEntries(nodes.map(n => [n.dataset.node, [n.offsetLeft, n.offsetTop]]));
    paths = routes.map(([from, to, start, end]) => {
      const [x1, y1] = points[from];
      const [x2, y2] = points[to];
      // Horizontal tangents at both ends keep the split and merge easy to follow.
      const samples = Array.from({ length: 65 }, (_, i) => {
        const t = i / 64;
        return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t * t * (3 - 2 * t)];
      });
      return { samples, start, end };
    });
    const style = getComputedStyle(card);
    colors = { wire: style.getPropertyValue("--muted-2").trim(), pulse: style.getPropertyValue("--accent").trim() };
    draw();
  }

  function stroke(points, start, end) {
    ctx.beginPath();
    ctx.moveTo(...points[start]);
    for (let i = start + 1; i <= end; i++) ctx.lineTo(...points[i]);
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    for (const { samples, start, end } of paths) {
      const last = samples.length - 1;
      ctx.globalAlpha = .65;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = colors.wire;
      stroke(samples, 0, last);
      if (progress <= start) continue;
      const t = Math.min(1, (progress - start) / (end - start));
      const head = Math.round(t * last);
      ctx.strokeStyle = colors.pulse;
      ctx.globalAlpha = .66;
      stroke(samples, 0, head);
      if (t < 1) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.pulse;
        stroke(samples, Math.max(0, head - 9), head);
        ctx.beginPath();
        ctx.arc(...samples[head], 2.8, 0, Math.PI * 2);
        ctx.fillStyle = colors.pulse;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
    diagram.style.setProperty("--progress", String(progress));
  }

  function updateStage() {
    for (const node of nodes) node.classList.toggle("lit", progress >= arrivals[node.dataset.node]);
    let text = "已接收模拟申请";
    if (progress >= .30) text = "动态问答已完成，正在适配机构字段";
    if (progress >= .56) text = "机构 A 已返回，等待机构 B";
    if (progress >= .65) text = "两家机构已返回，正在汇总报价";
    if (progress >= 1) text = "演示完成 · 两家机构的模拟报价已汇总";
    if (message.textContent !== text) message.textContent = text;
  }

  function finish() {
    cancelAnimationFrame(frame);
    frame = 0;
    progress = 1;
    draw();
    updateStage();
    if (manual) announce.textContent = message.textContent;
  }

  function run(byUser) {
    cancelAnimationFrame(frame);
    started = true;
    manual = byUser;
    announce.textContent = "";
    if (reduced.matches) { finish(); return; }
    const start = performance.now();
    function tick(now) {
      progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) { finish(); return; }
      draw();
      updateStage();
      frame = requestAnimationFrame(tick);
    }
    tick(start);
  }

  function select(tab) {
    const showDiagram = tab.id === "trace-tab";
    for (const item of tabs) {
      item.setAttribute("aria-selected", String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    }
    diagram.hidden = !showDiagram;
    diagram.inert = !showDiagram;
    profile.hidden = showDiagram;
    profile.inert = showDiagram;
    card.querySelector(".editor-language").textContent = showDiagram ? "TRACE" : "JSON";
    if (!showDiagram && frame) finish();
    if (showDiagram) measure();
  }

  card.classList.add("trace-ready");
  card.querySelector(".trace-tabs").hidden = false;
  select(tabs[0]);
  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      let next = tabs.find(item => item !== tab);
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[1];
      select(next);
      next.focus();
    });
  }
  diagram.querySelector(".trace-run").addEventListener("click", () => run(true));
  new MutationObserver(measure).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(map);
  else window.addEventListener("resize", measure);
  reduced.addEventListener("change", () => { if (frame && reduced.matches) finish(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && frame) finish(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !diagram.hidden && !document.hidden && !started && !reduced.matches) run(false);
      if (!entry.isIntersecting && frame) finish();
    }, { threshold: .55 }).observe(map);
  }
})();
