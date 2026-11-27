"use strict";
const menu = document.getElementById("menu-btn");
const nav = document.getElementById("site-nav");
const navLinks = [...nav.querySelectorAll("a")];
const sections = navLinks.map(link => document.querySelector(link.hash)).filter(Boolean);
function setMenu(open) {
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  nav.classList.toggle("open", open);
}
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
navLinks.forEach(link => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", event => { if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") { setMenu(false); menu.focus(); } });
window.addEventListener("resize", () => {
  if (window.innerWidth > 880) setMenu(false);
  updateNav();
});
function updateNav() {
  const offset = 125;
  const page = document.documentElement;
  const maxScroll = page.scrollHeight - page.clientHeight;
  let active = null;
  // A short final section may never reach the activation line above the fold.
  if (maxScroll > 0 && page.scrollTop >= maxScroll - 2) {
    active = sections[sections.length - 1];
  } else {
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset) active = section;
    }
  }
  for (const link of navLinks) {
    const isActive = active?.id === link.hash.slice(1);
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
let scheduled = false;
window.addEventListener("scroll", () => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(() => { updateNav(); scheduled = false; });
  }
}, { passive: true });
window.addEventListener("pageshow", updateNav);
updateNav();
const themeButton = document.getElementById("theme-btn");
const html = document.documentElement;
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></svg>';
const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20.5 14.4A8.7 8.7 0 0 1 9.6 3.5a8.8 8.8 0 1 0 10.9 10.9Z"/></svg>';
function setTheme(theme) {
  html.dataset.theme = theme;
  themeButton.innerHTML = theme === "dark" ? sun : moon;
  themeButton.setAttribute("aria-label", theme === "dark" ? "切换至浅色模式" : "切换至深色模式");
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#141716" : "#f4f7f0";
  try { localStorage.setItem("sen-portfolio-theme", theme); } catch {}
}
let themePreference;
try { themePreference = localStorage.getItem("sen-portfolio-theme"); } catch {}
setTheme(themePreference === "light" ? "light" : "dark");
themeButton.addEventListener("click", () => setTheme(html.dataset.theme === "dark" ? "light" : "dark"));

if ("IntersectionObserver" in window && window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
  const labelObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        target.classList.add("in-view");
        labelObserver.unobserve(target);
      }
    }
  }, { threshold: 0.5 });
  document.querySelectorAll(".section-label").forEach(label => labelObserver.observe(label));
}

if ("IntersectionObserver" in window) {
  const motionObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      target.style.setProperty("--motion-state", isIntersecting ? "running" : "paused");
    }
  });
  document.querySelectorAll(".motion-surface").forEach(surface => motionObserver.observe(surface));
}

const detailMotion = matchMedia("(prefers-reduced-motion: reduce)");

function setUpProjectDetails(details) {
  const chips = details.querySelectorAll(".project-stack .stack-tags > span");
  const cards = details.querySelectorAll(".responsibility-list > li");
  chips.forEach((chip, index) => chip.style.setProperty("--slot", Math.min(index + 1, 7)));

  // Reveal cards as they reach the reader, including the ones several screens down.
  if ("IntersectionObserver" in window && Element.prototype.animate) {
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting || !details.open) continue;
        observer.unobserve(target);
        if (detailMotion.matches) continue;
        target.animate(
          [{ opacity: .55, transform: "translateY(9px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 320, delay: Math.min(order++, 3) * 45, easing: "cubic-bezier(.2,.78,.24,1)", fill: "backwards" }
        );
      }
    });
    const watchCards = () => {
      observer.disconnect();
      if (details.open) cards.forEach(card => observer.observe(card));
    };
    details.addEventListener("toggle", watchCards);
    watchCards();
  }

  const targetSelector = ".project-stack .stack-tags > span, .responsibility-list > li";
  let active = null;
  let frame = 0;
  let releaseTimer = 0;
  let x = 0;
  let y = 0;

  function clearLight() {
    clearTimeout(releaseTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    if (active) active.removeAttribute("data-lit");
    active = null;
  }
  function placeLight() {
    frame = 0;
    const box = active.getBoundingClientRect();
    active.style.setProperty("--light-x", (x - box.left) + "px");
    active.style.setProperty("--light-y", (y - box.top) + "px");
  }
  function lightAt(event) {
    const next = event.target.closest(targetSelector);
    if (next !== active) {
      clearLight();
      active = next;
      if (active) active.setAttribute("data-lit", "");
    }
    if (!active || active.tagName !== "LI" || detailMotion.matches) return;
    x = event.clientX;
    y = event.clientY;
    if (!frame) frame = requestAnimationFrame(placeLight);
  }
  details.addEventListener("pointermove", event => {
    if (event.pointerType !== "touch") lightAt(event);
  }, { passive: true });
  details.addEventListener("pointerdown", lightAt, { passive: true });
  details.addEventListener("pointerup", event => {
    if (event.pointerType !== "mouse") {
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(clearLight, 300);
    }
  }, { passive: true });
  details.addEventListener("pointerleave", event => {
    if (event.pointerType !== "touch") clearLight();
  });
  details.addEventListener("pointercancel", clearLight);
  details.addEventListener("toggle", () => { if (!details.open) clearLight(); });
}

document.querySelectorAll(".project-deepdive").forEach(setUpProjectDetails);

function setUpPointerGlow() {
  const glow = document.querySelector(".pointer-glow");
  if (!glow) return;
  const eligible = matchMedia("(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)");
  let frame = 0;
  let x = 0;
  let y = 0;

  function hide() {
    cancelAnimationFrame(frame);
    frame = 0;
    glow.classList.remove("is-visible");
  }

  function paint() {
    frame = 0;
    glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    glow.classList.add("is-visible");
  }

  function track(event) {
    if (event.pointerType !== "mouse") {
      hide();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function syncPreference() {
    if (eligible.matches) {
      document.addEventListener("pointermove", track, { passive: true });
    } else {
      document.removeEventListener("pointermove", track);
      hide();
    }
  }

  document.addEventListener("pointerout", event => { if (!event.relatedTarget) hide(); });
  document.addEventListener("pointerdown", event => { if (event.pointerType !== "mouse") hide(); }, { passive: true });
  document.addEventListener("pointercancel", hide);
  document.addEventListener("keydown", hide);
  document.addEventListener("visibilitychange", () => { if (document.hidden) hide(); });
  window.addEventListener("blur", hide);
  eligible.addEventListener("change", syncPreference);
  syncPreference();
}

setUpPointerGlow();
