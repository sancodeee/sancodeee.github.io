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
