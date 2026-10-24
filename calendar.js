const calendar = document.querySelector(".calendar");
const link = calendar.querySelector(".calendar-link");
const menu = calendar.querySelector(".calendar-menu");

const button = document.createElement("button");
button.type = "button";
button.className = link.className;
button.textContent = link.textContent;
button.setAttribute("aria-expanded", "false");
button.setAttribute("aria-controls", menu.id);
link.replaceWith(button);

function setOpen(open, restoreFocus) {
  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  if (open) {
    menu.classList.remove("is-above");
    const rect = menu.getBoundingClientRect();
    const bound = Math.min(innerHeight, calendar.closest(".invitation").getBoundingClientRect().bottom);
    menu.classList.toggle("is-above", rect.bottom > bound);
  } else if (restoreFocus) {
    button.focus();
  }
}

button.addEventListener("click", () => setOpen(menu.hidden));
menu.addEventListener("click", () => setOpen(false));
document.addEventListener("click", (e) => { if (!menu.hidden && !calendar.contains(e.target)) setOpen(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setOpen(false, true); });
