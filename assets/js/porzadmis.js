(function(){
'use strict';
const $ = window.PF.$, $$ = window.PF.$$, esc = window.PF.esc, pl = window.PF.pl;
/* ================= PORZĄDMIŚ: warunki z firestore.rules i households.ts ================= */
(function(){
  const rows = $('#pm-rows'); if (!rows) return;
  /* aktor: admin | author (domownik, autor lub osoba przypisana) | member (inny domownik) | outsider */
  const isMember = (a) => a !== 'outsider';
  const isAdmin = (a) => a === 'admin';
  const OPS = [
    { label: 'Czyta wydatki i plan budżetu', can: (a) => isAdmin(a),
      rule: 'match /expenses/{id} {\n  allow read: if isAdmin(hid);\n}\nmatch /budgetPlans/{month} {\n  allow read: if isAdmin(hid);\n}',
      test: 'deny: Domownik nie czyta ani nie pisze wydatków i planów (również pojedynczych dokumentów)' },
    { label: 'Czyta kategorie budżetu (bez kwot)', can: (a) => isMember(a),
      rule: '// Kategorie czytają wszyscy (nie zdradzają kwot)\nmatch /categories/{id} {\n  allow read: if isMember(hid);\n  allow create, update: if isAdmin(hid) && validCategory(request.resource.data);\n}',
      test: 'allow: Domownik czyta kategorie; deny: nie pisze ich' },
    { label: 'Dodaje i odhacza pozycję na liście zakupów', can: (a) => isMember(a),
      rule: 'match /shoppingLists/{listId}/items/{itemId} {\n  allow read: if isMember(hid);\n  allow create: if isMember(hid) && validShoppingItem(hid, request.resource.data) && ...\n}',
      test: '' },
    { label: 'Edytuje notatkę wspólną napisaną przez Domownika', can: (a) => a === 'author' || isAdmin(a),
      rule: 'function isAuthorOrAdmin(hid) {\n  return resource.data.createdBy == request.auth.uid || isAdmin(hid);\n}\nmatch /notes/{id} {\n  allow update: if isMember(hid) && validSharedNote(hid, request.resource.data)\n    && request.resource.data.createdBy == resource.data.createdBy\n    && isAuthorOrAdmin(hid);\n}',
      test: 'deny: inny domownik czyta, ale nie edytuje ani nie usuwa cudzej notatki' },
    { label: 'Czyta notatkę prywatną Domownika', can: (a) => a === 'author',
      rule: '// Wpisy prywatne: wyłącznie właściciel, nawet Administrator ich nie widzi.\nmatch /users/{uid}/privateNotes/{id} {\n  allow read, delete: if signedIn() && request.auth.uid == uid;\n}',
      test: 'deny: Administrator ani nikt inny nie czyta cudzych prywatnych' },
    { label: 'Tworzy regułę obowiązku', can: (a) => isAdmin(a),
      rule: 'match /choreRules/{id} {\n  allow read: if isMember(hid);\n  allow create: if isAdmin(hid) && validChoreRule(hid, request.resource.data)\n    && request.resource.data.createdBy == request.auth.uid;\n}',
      test: 'deny: Domownik nie tworzy, nie edytuje, nie usuwa; obcy nie czyta' },
    { label: 'Odhacza obowiązek przypisany Domownikowi', can: (a) => a === 'author' || isAdmin(a),
      rule: 'match /choreOccurrences/{id} {\n  allow update: if isMember(hid)\n    && request.resource.data.diff(resource.data).affectedKeys().hasOnly([\'status\', \'doneBy\', \'doneAt\'])\n    && (resource.data.get(\'assigneeId\', null) == null\n        || resource.data.assigneeId == request.auth.uid\n        || isAdmin(hid))\n    && ...\n}',
      test: 'deny: inny domownik nie odhacza cudzego; klient nie tworzy ani nie usuwa' },
    { label: 'Zmienia rolę bezpośrednio w bazie, z pominięciem funkcji', can: () => false,
      rule: '// Członkostwo i role zmieniają wyłącznie funkcje (ochrona ostatniego admina).\nmatch /members/{uid} {\n  allow create, delete: if false;\n  allow update: if isMember(hid) && (isAdmin(hid) || request.auth.uid == uid)\n    && request.resource.data.diff(resource.data).affectedKeys().hasOnly([\'displayName\']) && ...\n}',
      test: 'deny: nawet admin nie zmienia ról z klienta' },
    { label: 'Czyta kody zaproszeń', can: (a) => isAdmin(a),
      rule: '// Zaproszenia tworzy i realizuje serwer; admin może je czytać.\nmatch /invites/{code} {\n  allow read: if isAdmin(hid);\n  allow write: if false;\n}',
      test: 'deny: domownik nie czyta zaproszeń' }
  ];
  const ACT = [['admin', 'Administrator'], ['author', 'Domownik (autor wpisu)'], ['member', 'Inny domownik'], ['outsider', 'Osoba spoza domu']];
  let sel = [4, 0];
  function drawMatrix(){
    rows.innerHTML = OPS.map((o, i) => '<tr><td>' + esc(o.label) + '</td>' + ACT.map((a, j) => {
      const ok = o.can(a[0]);
      return '<td><button type="button" class="cellbtn ' + (ok ? 'y' : 'n') + '" data-i="' + i + '" data-j="' + j + '" aria-pressed="' + (sel[0] === i && sel[1] === j) + '" aria-label="' + esc(a[1] + ': ' + o.label + ' — ' + (ok ? 'dozwolone' : 'odmowa')) + '">' + (ok ? 'tak' : 'nie') + '</button></td>';
    }).join('') + '</tr>').join('');
    const o = OPS[sel[0]], a = ACT[sel[1]], ok = o.can(a[0]);
    $('#pm-rule').innerHTML = '<p><b>' + esc(a[1]) + '</b>: ' + esc(o.label.charAt(0).toLowerCase() + o.label.slice(1)) + ' → <span class="badge ' + (ok ? 'pass">dozwolone' : 'fail">odmowa') + '</span></p><pre>' + esc(o.rule) + '</pre>' + (o.test ? '<p>Test: „' + esc(o.test) + '”</p>' : '');
  }
  rows.addEventListener('click', (e) => { const b = e.target.closest('.cellbtn'); if (b) { sel = [+b.dataset.i, +b.dataset.j]; drawMatrix(); } });
  drawMatrix();

  /* households.ts: setMemberRole, removeMember, leaveHousehold */
  let members, deleted;
  const actorSel = $('#pm-actor'), out = $('#pm-out');
  const roleName = (r) => r === 'admin' ? 'Administrator' : 'Domownik';
  const admins = () => members.filter(m => m.role === 'admin');
  function say(text, err){ out.className = 'alert' + (err ? ' err' : ''); out.textContent = text; }
  function requireAdmin(uid){ const me = members.find(m => m.id === uid); if (!me || me.role !== 'admin') throw new Error('Tylko administrator może to zrobić'); }
  function setMemberRole(uid, targetUid, role){
    requireAdmin(uid);
    const target = members.find(m => m.id === targetUid);
    if (!target) throw new Error('Nie ma takiego domownika');
    if (target.role === 'admin' && role === 'member') { if (admins().length <= 1) throw new Error('Dom musi mieć co najmniej jednego administratora'); }
    target.role = role;
  }
  function removeMember(uid, targetUid){
    requireAdmin(uid);
    const target = members.find(m => m.id === targetUid);
    if (!target) throw new Error('Nie ma takiego domownika');
    if (target.role === 'admin') { if (admins().length <= 1) throw new Error('Nie można usunąć ostatniego administratora'); }
    members = members.filter(m => m.id !== targetUid);
  }
  function leaveHousehold(uid){
    const me = members.find(m => m.id === uid);
    if (!me) throw new Error('Nie należysz do tego domu');
    const isLast = members.length === 1;
    if (!isLast && me.role === 'admin') { if (admins().length <= 1) throw new Error('Jesteś jedynym Administratorem. Nadaj tę rolę komuś innemu, zanim wyjdziesz'); }
    members = members.filter(m => m.id !== uid);
    return { deleted: isLast };
  }
  function drawHouse(keepActor){
    const prev = keepActor ? actorSel.value : '';
    actorSel.innerHTML = members.map(m => '<option value="' + m.id + '">' + esc(m.name) + ' (' + roleName(m.role) + ')</option>').join('');
    if (prev && members.some(m => m.id === prev)) actorSel.value = prev;
    actorSel.disabled = deleted; $('#pm-leave').disabled = deleted;
    $('#pm-members').innerHTML = deleted ? '<li><span class="who">Dom został usunięty razem z danymi.</span></li>' : members.map(m =>
      '<li><span class="who"><b>' + esc(m.name) + '</b><span class="role">' + roleName(m.role) + '</span></span><span class="btnrow">' +
      '<button type="button" class="btn btn-sm" data-act="role" data-id="' + m.id + '">' + (m.role === 'admin' ? 'Odbierz rolę Administratora' : 'Nadaj rolę Administratora') + '</button>' +
      '<button type="button" class="btn btn-sm" data-act="remove" data-id="' + m.id + '">Usuń z domu</button></span></li>').join('');
  }
  function resetHouse(){
    members = [{ id: 'ania', name: 'Ania', role: 'admin' }, { id: 'tomek', name: 'Tomek', role: 'member' }, { id: 'ola', name: 'Ola', role: 'member' }];
    deleted = false; drawHouse(false); say('Dom „Nasz dom”: jedna Administratorka i dwoje Domowników.');
  }
  $('#pm-members').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const uid = actorSel.value, t = members.find(m => m.id === b.dataset.id);
    try {
      if (b.dataset.act === 'role') { const nr = t.role === 'admin' ? 'member' : 'admin'; setMemberRole(uid, t.id, nr); say('Zmieniono rolę: ' + t.name + ' to teraz ' + roleName(nr) + '.'); }
      else { removeMember(uid, t.id); say(t.name + ' nie należy już do domu.'); }
    } catch (err) { say('Odmowa: ' + err.message + '.', true); }
    drawHouse(true);
  });
  $('#pm-leave').addEventListener('click', () => {
    const uid = actorSel.value, me = members.find(m => m.id === uid);
    try { const r = leaveHousehold(uid); if (r.deleted) { deleted = true; say('Ostatnia osoba (' + me.name + ') opuściła dom. Dom został usunięty razem z danymi.'); } else say(me.name + ' opuszcza dom. Dom zostaje.'); }
    catch (err) { say('Odmowa: ' + err.message + '.', true); }
    drawHouse(false);
  });
  $('#pm-reset').addEventListener('click', resetHouse);
  resetHouse();
  window.__pm = { OPS: OPS, get members(){ return members; }, setMemberRole: setMemberRole, removeMember: removeMember, leaveHousehold: leaveHousehold, reset: resetHouse };
})();
})();
