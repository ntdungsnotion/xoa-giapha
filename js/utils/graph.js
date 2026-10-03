export function bfs(startIds, getNeighbors) {
  return new Set(bfsLevels(startIds, getNeighbors).keys());
}

export function tapHuyetThong(index, tamId) {
  const unionIds = (bang, id) => bang.get(id) || [];
  const chaMe = (id) => unionIds(index.unionsAsChild, id)
    .flatMap((u) => (index.unionById.get(u) || {}).partners || [])
    .filter((p) => index.personById.has(p));
  const con = (id) => unionIds(index.unionsAsPartner, id)
    .flatMap((u) => ((index.unionById.get(u) || {}).children || []).map((c) => c && c.personId))
    .filter((p) => p && index.personById.has(p));
  if (!index.personById.has(tamId)) return new Set();
  return bfs([...bfs(tamId, chaMe)], con);
}

export function themDauRe(index, visible, tamId) {
  const toTien = bfs(tamId, (id) => (index.unionsAsChild.get(id) || [])
    .flatMap((u) => (index.unionById.get(u) || {}).partners || [])
    .filter((p) => index.personById.has(p)));
  const ra = new Map(visible);
  for (const [id, kieu] of visible) {
    if (kieu !== 'full' || (id !== tamId && toTien.has(id))) continue;
    for (const u of index.unionsAsPartner.get(id) || []) {
      for (const p of (index.unionById.get(u) || {}).partners || []) {
        if (p && index.personById.has(p) && !ra.has(p)) ra.set(p, 'edge');
      }
    }
  }
  return ra;
}

export function bfsLevels(startIds, getNeighbors, maxDepth = 0) {
  const doSau   = new Map();
  const hangDoi = [];

  const dau = Array.isArray(startIds) ? startIds : [startIds];
  for (const id of dau) {
    if (!id || doSau.has(id)) continue;
    doSau.set(id, 0);
    hangDoi.push(id);
  }

  let viTri = 0;
  while (viTri < hangDoi.length) {
    const id  = hangDoi[viTri++];
    const doi = doSau.get(id);
    if (maxDepth > 0 && doi >= maxDepth) continue;

    const cacKe = getNeighbors(id) || [];
    for (const ke of cacKe) {
      if (!ke || doSau.has(ke)) continue;
      doSau.set(ke, doi + 1);
      hangDoi.push(ke);
    }
  }

  return doSau;
}

export function buildIndex(tree) {
  const personById      = new Map();
  const unionById       = new Map();
  const unionsAsPartner = new Map();
  const unionsAsChild   = new Map();

  const persons = (tree && Array.isArray(tree.persons)) ? tree.persons : [];
  const unions  = (tree && Array.isArray(tree.unions))  ? tree.unions  : [];

  for (const p of persons) {
    if (!p || !p.id || p.deleted) continue;
    if (personById.has(p.id)) {
      throw new Error('Dữ liệu hỏng: có hai người cùng mã ' + p.id + '.');
    }
    personById.set(p.id, p);
    unionsAsPartner.set(p.id, []);
    unionsAsChild.set(p.id, []);
  }

  for (const u of unions) {
    if (!u || !u.id || u.deleted) continue;
    if (unionById.has(u.id)) {
      throw new Error('Dữ liệu hỏng: có hai hôn nhân cùng mã ' + u.id + '.');
    }
    unionById.set(u.id, u);

    const partners = Array.isArray(u.partners) ? u.partners : [];
    for (const personId of partners) {
      themMotLan(unionsAsPartner, personId, u.id);
    }

    const children = Array.isArray(u.children) ? u.children : [];
    for (const con of children) {
      themMotLan(unionsAsChild, con && con.personId, u.id);
    }
  }

  const vanhDaiById = new Map();
  for (const p of (tree && Array.isArray(tree.vanhDai)) ? tree.vanhDai : []) {
    if (!p || !p.id || p.deleted || personById.has(p.id)) continue;
    vanhDaiById.set(p.id, p);
  }

  return { personById, unionById, unionsAsPartner, unionsAsChild, vanhDaiById };
}

export function chiMucVe(tree) {
  const persons = (tree && Array.isArray(tree.persons)) ? tree.persons : [];
  const trong = new Set();
  for (const p of persons) if (p && p.id && !p.deleted) trong.add(p.id);

  const unions = [];
  for (const u of (tree && Array.isArray(tree.unions)) ? tree.unions : []) {
    if (!u || !u.id || u.deleted) continue;
    const partners = (Array.isArray(u.partners) ? u.partners : []).filter((id) => trong.has(id));
    if (partners.length === 0) continue;
    const children = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && trong.has(c.personId));
    const gon = { partners, children };
    if (Array.isArray(u.partnerOrder)) gon.partnerOrder = u.partnerOrder.filter((id) => trong.has(id));
    unions.push(Object.assign({}, u, gon));
  }
  return buildIndex({ persons, unions });
}

export function tinhDoi(persons, unions) {
  const trong = new Map();
  for (const p of persons || []) if (p && p.id && !p.deleted) trong.set(p.id, p);

  const cha = new Map();
  for (const u of unions || []) {
    if (!u || u.deleted) continue;
    const ong = (u.partners || []).find((id) => trong.has(id) && trong.get(id).sex === 'M');
    if (!ong) continue;
    for (const c of u.children || []) {
      if (!c || !trong.has(c.personId) || c.personId === ong) continue;
      const hang = LOAI_DONG_CHA.indexOf(c.relation || 'birth');
      if (hang < 0) continue;
      const cu = cha.get(c.personId);
      if (!cu || hang < cu.hang) cha.set(c.personId, { id: ong, hang });
    }
  }

  const doi = new Map();
  const dangTinh = new Set();
  const tinh = (id) => {
    const chuoi = [];
    let x = id;
    while (!doi.has(x) && cha.has(x) && !dangTinh.has(x)) {
      dangTinh.add(x);
      chuoi.push(x);
      x = cha.get(x).id;
    }
    let d;
    if (doi.has(x)) d = doi.get(x);
    else if (dangTinh.has(x)) { for (const y of chuoi) dangTinh.delete(y); return; }
    else { d = 1; doi.set(x, 1); }
    for (let i = chuoi.length - 1; i >= 0; i--) {
      d += 1;
      doi.set(chuoi[i], d);
      dangTinh.delete(chuoi[i]);
    }
  };
  for (const id of trong.keys()) if (!doi.has(id)) tinh(id);
  return doi;
}

const LOAI_DONG_CHA = ['birth', 'thua_tu', 'adopted', 'foster'];

function themMotLan(bang, personId, unionId) {
  if (!personId) return;
  const danhSach = bang.get(personId);
  if (!danhSach) return;
  if (danhSach.indexOf(unionId) === -1) danhSach.push(unionId);
}
