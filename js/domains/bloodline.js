import { bfsLevels } from '../utils/graph.js';

export function computeVisibleSet(index, focusPersonId, scope) {
  const ketQua = new Map();
  if (!index || !index.personById || !index.personById.has(focusPersonId)) {
    return ketQua;
  }
  const s = chuanHoaScope(scope);

  const doiToTien = bfsLevels(
    focusPersonId,
    (id) => chaMeCua(index, id),
    s.ancestors,
  );

  const trucHe = new Map();
  for (const personId of doiToTien.keys()) {
    for (const unionId of danhSachUnionLamVoChong(index, personId)) {
      if (trucHe.has(unionId)) continue;
      const cacPartner = danhSachPartner(index, unionId);
      if (cacPartner.length === 0) continue;

      let moiPartnerDeuLaToTien = true;
      let d = 0;
      for (const pid of cacPartner) {
        if (!doiToTien.has(pid)) { moiPartnerDeuLaToTien = false; break; }
        d = Math.max(d, doiToTien.get(pid));
      }
      if (moiPartnerDeuLaToTien) trucHe.set(unionId, d);
    }
  }

  const full = new Set(doiToTien.keys());

  themHauDue(index, [focusPersonId], s.descendants, full);

  for (const [unionId, d] of trucHe) {
    if (d > s.k) continue;

    if (d === 0) continue;

    const sauNhat = s.descendants > 0 ? s.descendants + d - 1 : 0;
    themHauDue(index, conCua(index, unionId), sauNhat, full);
  }

  const nutBien = new Set();
  const unionCuaFocus = new Set(danhSachUnionLamVoChong(index, focusPersonId));

  for (const unionId of index.unionById.keys()) {
    const cacPartner = danhSachPartner(index, unionId);
    const conThieu   = cacPartner.filter((pid) => !full.has(pid));
    if (conThieu.length === 0) continue;

    let duocLay = false;
    if (unionCuaFocus.has(unionId)) {
      duocLay = true;
    } else if (s.spouseOfDescendants) {
      const daCoMotPartnerTrongFull = cacPartner.some((pid) => full.has(pid));
      const coConTrongFull = conCua(index, unionId).some((cid) => full.has(cid));
      duocLay = daCoMotPartnerTrongFull && coConTrongFull;
    }
    if (!duocLay) continue;

    for (const pid of conThieu) nutBien.add(pid);
  }

  for (const id of full)    ketQua.set(id, 'full');
  for (const id of nutBien) if (!ketQua.has(id)) ketQua.set(id, 'edge');
  return ketQua;
}

export function findStubPoints(index, visibleSet, scope) {
  const ketQua = [];
  const daGhi  = new Set();

  const dangVe = (id) => visibleSet.has(id);

  for (const personId of visibleSet.keys()) {
    for (const unionId of danhSachUnionLamCon(index, personId)) {
      const chuaVe = danhSachPartner(index, unionId).filter((pid) => !dangVe(pid));
      if (chuaVe.length === 0) continue;
      ghiNotCut(ketQua, daGhi, personId, unionId, 'up', chuaVe.length);
    }
  }

  for (const unionId of index.unionById.keys()) {
    const cacPartner = danhSachPartner(index, unionId);
    if (cacPartner.length === 0) continue;

    const partnerChuaVe = cacPartner.filter((pid) => !dangVe(pid));
    const conChuaVe     = conCua(index, unionId).filter((cid) => !dangVe(cid));

    if (partnerChuaVe.length === 0) {
      if (conChuaVe.length === 0) continue;
      const moc = cacPartner.find((pid) => visibleSet.get(pid) === 'full')
               || cacPartner[0];
      ghiNotCut(ketQua, daGhi, moc, unionId, 'side', conChuaVe.length);
    } else {
      for (const pid of cacPartner) {
        if (visibleSet.get(pid) !== 'full') continue;
        ghiNotCut(ketQua, daGhi, pid, unionId, 'side',
                  partnerChuaVe.length + conChuaVe.length);
      }
    }
  }

  return ketQua;
}

function chuanHoaScope(scope) {
  const s = scope || {};
  return {
    ancestors:           soKhongAm(s.ancestors),
    descendants:         soKhongAm(s.descendants),
    spouseOfDescendants: s.spouseOfDescendants !== false,
    k:                   soKhongAm(s.k === undefined ? 1 : s.k),
  };
}

function soKhongAm(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function danhSachPartner(index, unionId) {
  const u = index.unionById.get(unionId);
  if (!u || !Array.isArray(u.partners)) return [];
  const ra = [];
  for (const pid of u.partners) {
    if (pid && index.personById.has(pid) && ra.indexOf(pid) === -1) ra.push(pid);
  }
  return ra;
}

function conCua(index, unionId) {
  const u = index.unionById.get(unionId);
  if (!u || !Array.isArray(u.children)) return [];
  const ra = [];
  for (const con of u.children) {
    const cid = con && con.personId;
    if (cid && index.personById.has(cid) && ra.indexOf(cid) === -1) ra.push(cid);
  }
  return ra;
}

function danhSachUnionLamVoChong(index, personId) {
  return index.unionsAsPartner.get(personId) || [];
}

function danhSachUnionLamCon(index, personId) {
  return index.unionsAsChild.get(personId) || [];
}

function chaMeCua(index, personId) {
  const ra = [];
  for (const unionId of danhSachUnionLamCon(index, personId)) {
    for (const pid of danhSachPartner(index, unionId)) {
      if (pid !== personId && ra.indexOf(pid) === -1) ra.push(pid);
    }
  }
  return ra;
}

function conCuaNguoi(index, personId) {
  const ra = [];
  for (const unionId of danhSachUnionLamVoChong(index, personId)) {
    for (const cid of conCua(index, unionId)) {
      if (cid !== personId && ra.indexOf(cid) === -1) ra.push(cid);
    }
  }
  return ra;
}

function themHauDue(index, batDauIds, sauNhat, tapDich) {
  const dau = batDauIds.filter((id) => index.personById.has(id));
  if (dau.length === 0) return;
  const dat = bfsLevels(dau, (id) => conCuaNguoi(index, id), sauNhat);
  for (const id of dat.keys()) tapDich.add(id);
}

function ghiNotCut(ketQua, daGhi, personId, unionId, direction, hiddenCount) {
  if (hiddenCount <= 0) return;
  const khoa = personId + '|' + unionId + '|' + direction;
  if (daGhi.has(khoa)) return;
  daGhi.add(khoa);
  ketQua.push({ personId, unionId, direction, hiddenCount });
}
