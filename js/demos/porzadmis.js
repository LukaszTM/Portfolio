/* PorządMiś: lista zakupów z prawdziwymi motywami aplikacji (assets/themes/*.json). */
window.DEMOS.porzadmis = function (root) {
  const themes = window.PORZADMIS_THEMES || [];
  const DEPARTMENTS = ["Warzywa i owoce", "Pieczywo", "Nabiał", "Mięso i ryby", "Napoje", "Chemia i dom", "Inne"];
  let items = [
    { name: "Pomidory", dept: 0, bought: false }, { name: "Jabłka", dept: 0, bought: false },
    { name: "Chleb", dept: 1, bought: true }, { name: "Mleko", dept: 2, bought: false },
    { name: "Jogurt naturalny", dept: 2, bought: false }, { name: "Płyn do naczyń", dept: 5, bought: false }
  ];
  let undo = null;

  const phone = el("div", { class: "pm-phone" });
  function applyTheme(theme) {
    Object.keys(theme.tokens).forEach(function (key) { phone.style.setProperty("--pm-" + key, theme.tokens[key]); });
  }

  const select = el("select", { class: "pm-select", id: "pm-theme", onchange: function () { applyTheme(themes[select.selectedIndex]); } });
  let group = null, groupName = null;
  themes.forEach(function (theme) {
    if (theme.group !== groupName) { groupName = theme.group; group = el("optgroup", { label: groupName }); select.appendChild(group); }
    group.appendChild(el("option", { text: theme.name }));
  });

  const listBox = el("div", { class: "pm-list" });
  const toast = el("div", { class: "pm-toast", "aria-live": "polite" });
  const count = el("span", { class: "pm-count" });

  function draw() {
    listBox.textContent = "";
    const todo = items.filter(function (i) { return !i.bought; });
    count.textContent = todo.length + " do kupienia";
    if (!items.length) { listBox.appendChild(el("p", { class: "pm-empty", text: "Lista pusta – dopisz pierwszą rzecz." })); }
    DEPARTMENTS.forEach(function (dept, index) {
      const rows = items.filter(function (i) { return i.dept === index; });
      if (!rows.length) { return; }
      listBox.appendChild(el("p", { class: "pm-dept", text: dept }));
      rows.forEach(function (item) {
        listBox.appendChild(el("button", { class: "pm-row" + (item.bought ? " is-bought" : ""), role: "checkbox", "aria-checked": item.bought ? "true" : "false",
          onclick: function () { item.bought = !item.bought; draw(); } },
          el("span", { class: "pm-check", "aria-hidden": "true" }), el("span", { text: item.name })));
      });
    });
    clear.disabled = !items.some(function (i) { return i.bought; });
  }

  const nameInput = el("input", { class: "pm-input", type: "text", "aria-label": "Nowa pozycja", placeholder: "Co dopisać? np. chleb", autocomplete: "off" });
  const deptSelect = el("select", { class: "pm-input", "aria-label": "Dział" });
  DEPARTMENTS.forEach(function (dept) { deptSelect.appendChild(el("option", { text: dept })); });
  deptSelect.selectedIndex = 6;
  const add = el("form", { class: "pm-add", onsubmit: function (event) {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    items.push({ name: name.charAt(0).toUpperCase() + name.slice(1), dept: deptSelect.selectedIndex, bought: false });
    nameInput.value = ""; draw();
  } }, nameInput, deptSelect, el("button", { class: "pm-btn", type: "submit" }, "Dopisz"));

  const clear = el("button", { class: "pm-btn is-quiet", onclick: function () {
    const before = items.slice();
    items = items.filter(function (i) { return !i.bought; });
    undo = before; draw();
    toast.textContent = "";
    toast.appendChild(el("span", { text: "Wyczyszczono kupione." }));
    toast.appendChild(el("button", { class: "pm-btn", onclick: function () { if (undo) { items = undo; undo = null; toast.textContent = ""; draw(); } } }, "Cofnij"));
  } }, "Wyczyść kupione");

  phone.appendChild(el("div", { class: "pm-bar" }, el("strong", { text: "Zakupy" }), count));
  phone.appendChild(add);
  phone.appendChild(listBox);
  phone.appendChild(el("div", { class: "pm-foot" }, clear));
  phone.appendChild(toast);

  root.appendChild(el("div", { class: "pm-top" }, el("label", { for: "pm-theme", text: "Motyw aplikacji (13 do wyboru)" }), select));
  root.appendChild(phone);
  root.appendChild(el("p", { class: "demo-note", text: "Kolory pochodzą z plików motywów aplikacji. W aplikacji lista jest wspólna dla całego domu i zmienia się u wszystkich na żywo." }));
  if (themes.length) { applyTheme(themes[0]); }
  draw();
};
