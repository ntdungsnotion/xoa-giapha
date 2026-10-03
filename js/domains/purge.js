import { conLyDoTonTai } from './union.js';

export function planPurge(tree, chiNhung) {
  const persons = mang(tree && tree.persons);
  const unions  = mang(tree && tree.unions);
  const media   = mang(tree && tree.media);

  const loc = Array.isArray(chiNhung) ? new Set(chiNhung) : null;
  const nhan = (id) => loc === null || loc.has(id);

  const personIds = persons.filter(daXoa).map((p) => p.id).filter(nhan);
  const unionIds  = unions.filter(daXoa).map((u) => u.id).filter(nhan);

  const boNguoi = new Set(personIds);
  const boCap   = new Set(unionIds);

  const anhLacChu = [];
  const mediaIds  = [];
  for (const m of media) {
    if (!m || !m.id) continue;
    if (daXoa(m)) { if (nhan(m.id)) mediaIds.push(m.id); continue; }
    if (boNguoi.has(m.subjectId) || boCap.has(m.subjectId)) {
      mediaIds.push(m.id);
      anhLacChu.push(m.id);
    }
  }

  const boMedia = new Set(mediaIds);
  const conDung = new Set();
  for (const m of media) {
    if (!m || !m.id || boMedia.has(m.id)) continue;
    if (m.driveFileId) conDung.add(m.driveFileId);
  }
  const fileIds = [];
  const daKe = new Set();
  for (const m of media) {
    if (!m || !boMedia.has(m.id)) continue;
    const f = m.driveFileId;
    if (!f || daKe.has(f) || conDung.has(f)) continue;
    daKe.add(f);
    fileIds.push(f);
  }

  const capPhaiGo  = [];
  const capHetLyDo = [];
  for (const u of unions) {
    if (!u || !u.id || boCap.has(u.id)) continue;
    if (!capCoNguoi(u, boNguoi)) continue;
    capPhaiGo.push(u.id);
    if (!conLyDoTonTai(goNguoiKhoiCap(u, boNguoi))) capHetLyDo.push(u.id);
  }

  return {
    personIds, unionIds, mediaIds, fileIds,
    capPhaiGo, capHetLyDo, anhLacChu,
    trong: personIds.length === 0 && unionIds.length === 0 && mediaIds.length === 0,
  };
}

export function applyPurge(tree, chiNhung) {
  if (!tree) return null;
  const ke = planPurge(tree, chiNhung);
  if (ke.trong) return null;

  const boNguoi = new Set(ke.personIds);
  const boCap   = new Set(ke.unionIds);
  const boMedia = new Set(ke.mediaIds);
  const boFile  = new Set(ke.fileIds);

  const unions = mang(tree.unions)
    .filter((u) => u && u.id && !boCap.has(u.id))
    .map((u) => (capCoNguoi(u, boNguoi) ? goNguoiKhoiCap(u, boNguoi) : u));

  const persons = mang(tree.persons)
    .filter((p) => p && p.id && !boNguoi.has(p.id))
    .map((p) => (p.photoFileId && boFile.has(p.photoFileId)
      ? Object.assign({}, p, { photoFileId: '' })
      : p));

  const media = mang(tree.media).filter((m) => m && m.id && !boMedia.has(m.id));

  const cayMoi = Object.assign({}, tree, { persons, unions, media });

  const diff = {};
  diff['persons'] = [mang(tree.persons).length, persons.length];
  diff['unions']  = [mang(tree.unions).length,  unions.length];
  diff['media']   = [mang(tree.media).length,   media.length];
  if (ke.personIds.length) diff['nguoiXoaHan'] = ['', ke.personIds.join(' ')];
  if (ke.unionIds.length)  diff['capXoaHan']   = ['', ke.unionIds.join(' ')];
  if (ke.fileIds.length)   diff['anhXoaHan']   = ['', ke.fileIds.join(' ')];

  return { tree: cayMoi, ke, diff };
}

export function moTaKePurge(ke) {
  const phan = [];
  if (ke.personIds.length) phan.push(ke.personIds.length + ' người');
  if (ke.unionIds.length)  phan.push(ke.unionIds.length + ' cặp');
  if (ke.mediaIds.length)  phan.push(ke.mediaIds.length + ' bản ghi ảnh');
  if (phan.length === 0) return 'không có gì';
  if (phan.length === 1) return phan[0];
  return phan.slice(0, -1).join(', ') + ' và ' + phan[phan.length - 1];
}

function mang(x) { return Array.isArray(x) ? x : []; }

function daXoa(x) { return !!x && x.deleted === true; }

function capCoNguoi(u, boNguoi) {
  const coPartner = mang(u.partners).some((id) => boNguoi.has(id));
  const coCon = mang(u.children).some((c) => c && boNguoi.has(c.personId));
  return coPartner || coCon;
}

function goNguoiKhoiCap(u, boNguoi) {
  const moi = JSON.parse(JSON.stringify(u));
  moi.partners = mang(moi.partners).filter((id) => id && !boNguoi.has(id));
  if (Array.isArray(moi.partnerOrder)) {
    moi.partnerOrder = moi.partnerOrder.filter((id) => id && !boNguoi.has(id));
  }
  moi.children = mang(moi.children).filter((c) => c && !boNguoi.has(c.personId));
  return moi;
}
