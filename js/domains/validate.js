import { mocNgay, soSanhNgay, chenhNam, formatDate, calcAge } from '../utils/date.js';
import { bfs } from '../utils/graph.js';
import { conLyDoTonTai, timCapTrung } from './union.js';
import { fullName, coGiaTri, removeDiacritics } from '../utils/text.js';

export const NGUONG = {
  tuoiLamChaMeToiThieu: 16,
  tuoiLamMeToiDa:       55,
  lechTuoiVoChong:      25,
  tuoiThoToiDa:        110,
};

function dat()          { return { ok: true,  level: 'ok',      message: '' }; }
function boQua(lyDo)    { return { ok: true,  level: 'skip',    message: lyDo }; }
function canhBao(loi)   { return { ok: false, level: 'warning', message: loi }; }
function chan(loi)      { return { ok: false, level: 'error',   message: loi }; }

export function checkDeathAfterBirth(person) {
  if (!person || typeof person !== 'object') return boQua('không có bản ghi người');

  const thuTu = soSanhNgay(person.death, person.birth);
  if (thuTu === null) return boQua(lyDoThieuMoc(person));
  if (thuTu === -1) {
    return chan(moTaNguoi(person) + ': năm mất (' + formatDate(person.death) +
                ') trước năm sinh (' + formatDate(person.birth) + ').');
  }
  return dat();
}

export function checkParentAge(index, parentId, childId) {
  const cha = layNguoi(index, parentId);
  const con = layNguoi(index, childId);
  if (!cha || !con) return boQua('thiếu bản ghi của cha/mẹ hoặc con');

  const quanHe = quanHeChaCon(index, parentId, childId);
  if (quanHe && quanHe !== 'birth') {
    return boQua('quan hệ ' + quanHe + ' — không xét tuổi sinh học');
  }

  const cach = chenhNam(cha.birth, con.birth);
  if (cach === null) {
    return boQua(!mocNgay(cha.birth) ? 'cha/mẹ không có năm sinh'
                                     : 'người con không có năm sinh');
  }

  if (cach < 0) {
    return chan(moTaNguoi(cha) + ' sinh năm ' + formatDate(cha.birth) +
                ', sau con là ' + moTaNguoi(con) + ' sinh năm ' +
                formatDate(con.birth) + '.');
  }

  if (cach < NGUONG.tuoiLamChaMeToiThieu) {
    return canhBao(moTaNguoi(cha) + ' mới khoảng ' + cach + ' tuổi khi sinh ' +
                   moTaNguoi(con) + '.');
  }

  if (cha.sex === 'F' && cach > NGUONG.tuoiLamMeToiDa) {
    return canhBao(moTaNguoi(cha) + ' khoảng ' + cach + ' tuổi khi sinh ' +
                   moTaNguoi(con) + '.');
  }

  return dat();
}

export function checkNoAncestorCycle(index, childId, parentId) {
  if (!childId || !parentId) return boQua('thiếu mã người');

  const con = layNguoi(index, childId);
  const cha = layNguoi(index, parentId);
  if (!con || !cha) return boQua('thiếu bản ghi của cha/mẹ hoặc con');

  if (childId === parentId) {
    return chan(moTaNguoi(con) + ' không thể là cha/mẹ của chính mình.');
  }

  const hauDue = bfs(childId, (id) => conCua(index, id));
  if (hauDue.has(parentId)) {
    return chan(moTaNguoi(cha) + ' vừa là cha/mẹ vừa là hậu duệ của ' +
                moTaNguoi(con) + ' — quan hệ này tạo ra vòng tổ tiên.');
  }
  return dat();
}

export function checkLifespan(person) {
  if (!person || typeof person !== 'object') return boQua('không có bản ghi người');

  const tuoi = calcAge(person.birth, person.death, person.living);
  if (!tuoi) return boQua(lyDoThieuMoc(person));
  if (tuoi.tuoi <= NGUONG.tuoiThoToiDa) return dat();

  return canhBao(moTaNguoi(person) + ': ' + (tuoi.xapXi ? 'khoảng ' : '') +
                 tuoi.tuoi + ' tuổi' + (tuoi.denHomNay ? ' và vẫn ghi là còn sống' : '') + '.');
}

export function checkBirthAfterMotherDeath(index, personId) {
  const nguoi = layNguoi(index, personId);
  if (!nguoi) return boQua('thiếu bản ghi người');
  if (!mocNgay(nguoi.birth)) return boQua('không có năm sinh');

  const cacMe = chaMeCua(index, personId)
    .filter((ch) => ch.relation === 'birth')
    .map((ch) => layNguoi(index, ch.parentId))
    .filter((me) => me && me.sex === 'F' && mocNgay(me.death));

  if (cacMe.length === 0) return boQua('không có mẹ đẻ nào ghi năm mất');

  for (const me of cacMe) {
    if (soSanhNgay(nguoi.birth, me.death) === 1) {
      return canhBao(moTaNguoi(nguoi) + ' sinh năm ' + formatDate(nguoi.birth) +
                     ', sau khi mẹ là ' + moTaNguoi(me) + ' mất năm ' +
                     formatDate(me.death) + '.');
    }
  }
  return dat();
}

export function checkSpouseAgeGap(index, unionId) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union) return boQua('thiếu bản ghi hôn nhân');

  const coNamSinh = (Array.isArray(union.partners) ? union.partners : [])
    .map((id) => layNguoi(index, id))
    .filter((p) => p && mocNgay(p.birth));

  if (coNamSinh.length < 2) return boQua('cần cả hai người có năm sinh');

  for (let i = 0; i < coNamSinh.length; i++) {
    for (let j = i + 1; j < coNamSinh.length; j++) {
      const lech = Math.abs(chenhNam(coNamSinh[i].birth, coNamSinh[j].birth));
      if (lech > NGUONG.lechTuoiVoChong) {
        return canhBao(moTaNguoi(coNamSinh[i]) + ' và ' + moTaNguoi(coNamSinh[j]) +
                       ' lệch nhau khoảng ' + lech + ' tuổi.');
      }
    }
  }
  return dat();
}

export function checkOrphanNode(index, personId) {
  const nguoi = layNguoi(index, personId);
  if (!nguoi) return boQua('thiếu bản ghi người');

  const cacUnion = (index.unionsAsPartner.get(personId) || [])
    .concat(index.unionsAsChild.get(personId) || []);

  for (const unionId of cacUnion) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    for (const pid of Array.isArray(u.partners) ? u.partners : []) {
      if (pid && pid !== personId && index.personById.has(pid)) return dat();
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      const cid = c && c.personId;
      if (cid && cid !== personId && index.personById.has(cid)) return dat();
    }
  }

  return canhBao(moTaNguoi(nguoi) +
                 ' chưa nối với ai — không có cha mẹ, không có vợ/chồng, không có con.');
}

export function coNoiVanhDai(index, personId) {
  const vd = index && index.vanhDaiById;
  if (!vd || vd.size === 0) return false;
  const cacUnion = (index.unionsAsPartner.get(personId) || [])
    .concat(index.unionsAsChild.get(personId) || []);
  for (const unionId of cacUnion) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    if ((Array.isArray(u.partners) ? u.partners : []).some((p) => p !== personId && vd.has(p))) return true;
    if ((Array.isArray(u.children) ? u.children : [])
      .some((c) => c && c.personId !== personId && vd.has(c.personId))) return true;
  }
  return false;
}

export function checkDuplicate(tree, person) {
  if (!person || typeof person !== 'object') return boQua('không có bản ghi người');

  const ten = chuanTen(person);
  if (ten === '') return boQua('chưa có tên');

  const moc = mocNgay(person.birth);
  if (!moc) return boQua('không có năm sinh');

  const dsNguoi = (tree && Array.isArray(tree.persons)) ? tree.persons : [];
  const trung = dsNguoi.filter((p) => {
    if (!p || p.deleted || p.id === person.id) return false;
    if (chuanTen(p) !== ten) return false;
    const m = mocNgay(p.birth);
    return !!m && m.nam === moc.nam;
  });

  if (trung.length === 0) return dat();

  return canhBao(moTaNguoi(person) + ' trùng cả tên lẫn năm sinh với ' +
                 trung.map(moTaNguoi).join(', ') + '.');
}

export function checkUnionPointless(index, unionId) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union) return boQua('thiếu bản ghi hôn nhân');
  if (conLyDoTonTai(union)) return dat();

  const soCon = (Array.isArray(union.children) ? union.children : [])
    .filter((c) => c && c.personId).length;
  const soPartner = (Array.isArray(union.partners) ? union.partners : [])
    .filter(Boolean).length;

  return canhBao('Cặp ' + unionId + ' không còn khẳng định điều gì — ' +
                 soPartner + ' người trong cặp, ' + soCon + ' người con. ' +
                 'Bản ghi thừa, xoá đi không mất mối nối nào.');
}

export function checkDuplicateUnion(tree, index, unionId, dsTrungSan) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union) return boQua('thiếu bản ghi hôn nhân');

  const ds = dsTrungSan || timCapTrung(tree);
  const cacTrung = ds.filter((x) => x.unionA === unionId || x.unionB === unionId);
  if (cacTrung.length === 0) return dat();

  const banKia = cacTrung.map((x) => (x.unionA === unionId ? x.unionB : x.unionA));
  return canhBao('Cặp ' + unionId + ' trùng với ' + banKia.join(', ') +
                 ' — cùng người, có thể là một cặp bị ghi hai lần.');
}

export function validateAll(tree, index, changeType, payload) {
  const ra = {
    canSave: true, errors: [], warnings: [], skipped: [],
    counts: { total: 0, ok: 0, error: 0, warning: 0, skip: 0 },
  };
  const p = payload || {};

  if (changeType === 'person') {
    const nguoi = p.person || layNguoi(index, p.personId);
    if (!nguoi) return ketThuc(ra);
    raSoatMotNguoi(ra, tree, index, nguoi, true);

  } else if (changeType === 'child') {
    const cacCha = p.parentId ? [p.parentId] : partnersCuaUnion(index, p.unionId);
    for (const parentId of cacCha) {
      ghi(ra, 'checkNoAncestorCycle', checkNoAncestorCycle(index, p.childId, parentId),
          { personId: p.childId });
      ghi(ra, 'checkParentAge', checkParentAge(index, parentId, p.childId),
          { personId: p.childId });
    }
    ghi(ra, 'checkBirthAfterMotherDeath', checkBirthAfterMotherDeath(index, p.childId),
        { personId: p.childId });

  } else if (changeType === 'union') {
    ghi(ra, 'checkSpouseAgeGap',     checkSpouseAgeGap(index, p.unionId),     { unionId: p.unionId });
    ghi(ra, 'checkUnionPointless',   checkUnionPointless(index, p.unionId),   { unionId: p.unionId });
    ghi(ra, 'checkDuplicateUnion',   checkDuplicateUnion(tree, index, p.unionId), { unionId: p.unionId });

  } else if (changeType === 'tree') {
    for (const nguoi of index.personById.values()) {
      raSoatMotNguoi(ra, tree, index, nguoi, false);
    }
    const dsTrungSan = timCapTrung(tree);
    for (const unionId of index.unionById.keys()) {
      ghi(ra, 'checkSpouseAgeGap',     checkSpouseAgeGap(index, unionId),     { unionId });
      ghi(ra, 'checkUnionPointless',   checkUnionPointless(index, unionId),   { unionId });
      ghi(ra, 'checkDuplicateUnion',   checkDuplicateUnion(tree, index, unionId, dsTrungSan), { unionId });
    }
  }

  return ketThuc(ra);
}

function raSoatMotNguoi(ra, tree, index, nguoi, caChieuXuong) {
  const id = nguoi.id;
  ghi(ra, 'checkDeathAfterBirth', checkDeathAfterBirth(nguoi), { personId: id });
  ghi(ra, 'checkLifespan',        checkLifespan(nguoi),        { personId: id });
  ghi(ra, 'checkDuplicate',       checkDuplicate(tree, nguoi), { personId: id });

  if (!layNguoi(index, id)) return;

  ghi(ra, 'checkOrphanNode', checkOrphanNode(index, id), { personId: id });
  ghi(ra, 'checkBirthAfterMotherDeath', checkBirthAfterMotherDeath(index, id),
      { personId: id });

  for (const ch of chaMeCua(index, id)) {
    ghi(ra, 'checkNoAncestorCycle', checkNoAncestorCycle(index, id, ch.parentId),
        { personId: id });
    ghi(ra, 'checkParentAge', checkParentAge(index, ch.parentId, id), { personId: id });
  }

  if (!caChieuXuong) return;

  for (const conId of new Set(conCua(index, id))) {
    ghi(ra, 'checkNoAncestorCycle', checkNoAncestorCycle(index, conId, id),
        { personId: conId });
    ghi(ra, 'checkParentAge', checkParentAge(index, id, conId), { personId: conId });
    ghi(ra, 'checkBirthAfterMotherDeath', checkBirthAfterMotherDeath(index, conId),
        { personId: conId });
  }

  for (const unionId of index.unionsAsPartner.get(id) || []) {
    ghi(ra, 'checkSpouseAgeGap', checkSpouseAgeGap(index, unionId), { unionId });
  }
}

function ghi(ra, tenPhep, ketQua, viTri) {
  if (!ketQua) return;
  ra.counts.total++;
  ra.counts[ketQua.level] = (ra.counts[ketQua.level] || 0) + 1;

  if (ketQua.level === 'ok') return;
  const muc = Object.assign({ check: tenPhep, level: ketQua.level, message: ketQua.message },
                            viTri || {});
  if (ketQua.level === 'error')        ra.errors.push(muc);
  else if (ketQua.level === 'warning') ra.warnings.push(muc);
  else                                 ra.skipped.push(muc);
}

function ketThuc(ra) {
  ra.canSave = ra.errors.length === 0;
  return ra;
}

function layNguoi(index, personId) {
  if (!index || !index.personById || !personId) return null;
  return index.personById.get(personId) || null;
}

function moTaNguoi(person) {
  if (!person) return '(không rõ)';
  const ten = fullName(person);
  return (coGiaTri(ten) ? ten : '(chưa có tên)') + ' (' + person.id + ')';
}

function chuanTen(person) {
  const ten = fullName(person);
  if (!coGiaTri(ten)) return '';
  return removeDiacritics(ten).replace(/\s+/g, ' ').trim();
}

function lyDoThieuMoc(person) {
  const coSinh = !!mocNgay(person.birth);
  const coMat  = !!mocNgay(person.death);
  if (!coSinh && !coMat) return 'không có năm sinh lẫn năm mất';
  if (!coSinh) return 'không có năm sinh';
  if (!coMat)  return 'không có năm mất';
  return 'cùng năm, không đủ tháng ngày để kết luận';
}

function chaMeCua(index, personId) {
  const ra = [];
  for (const unionId of index.unionsAsChild.get(personId) || []) {
    const union = index.unionById.get(unionId);
    if (!union) continue;
    const relation = quanHeTrongUnion(union, personId);
    for (const parentId of Array.isArray(union.partners) ? union.partners : []) {
      if (parentId && parentId !== personId) ra.push({ parentId, relation });
    }
  }
  return ra;
}

function conCua(index, personId) {
  const ra = [];
  for (const unionId of index.unionsAsPartner.get(personId) || []) {
    const union = index.unionById.get(unionId);
    if (!union) continue;
    for (const con of Array.isArray(union.children) ? union.children : []) {
      if (con && con.personId) ra.push(con.personId);
    }
  }
  return ra;
}

function partnersCuaUnion(index, unionId) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union || !Array.isArray(union.partners)) return [];
  return union.partners.filter((id) => !!id);
}

function quanHeTrongUnion(union, personId) {
  for (const con of Array.isArray(union.children) ? union.children : []) {
    if (con && con.personId === personId) return con.relation || 'birth';
  }
  return 'birth';
}

function quanHeChaCon(index, parentId, childId) {
  for (const ch of chaMeCua(index, childId)) {
    if (ch.parentId === parentId) return ch.relation;
  }
  return null;
}
