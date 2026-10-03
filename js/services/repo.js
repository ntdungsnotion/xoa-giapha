import * as sb from './sb.js';
import { rapCay, rapMotNguoi, rapDoi, soSanh, coGiDeGhi, tangSoSauKhiLuu } from './hinh-dang.js';
import { state, notify } from '../state.js';
import { buildIndex } from '../utils/graph.js';
import { sinhMaCay, napKho, soMaTrongKho } from '../utils/id.js';
import { ghiChuKy, thieuChuKy } from '../utils/image.js';
import { DATA_VERSION } from '../config.js';

export async function khoiTao() {
  const phien = await sb.layPhien({ docCayLuon: true });
  state.phien = phien;

  if (!phien.daDangNhap) return phien;
  if (!phien.docDuoc)    return phien;

  await napCay();
  state.focusPersonId = chonNguoiTrungTam(phien);

  state.hienNgayGio = phien.hienNgayGio === true;

  return phien;
}

export async function napCay() {
  const treeId = state.phien && state.phien.treeId;
  if (!treeId) throw new Error('Chưa biết đang mở gia phả nào.');

  dayKhoMa();
  const kq = await sb.layDong(treeId);
  if (!kq)    throw new Error('Máy chủ không trả về gì khi đọc cây gia phả.');
  if (!kq.ok) throw new Error(kq.loi || 'Máy chủ từ chối trả cây gia phả.');

  const cay = kiemPhienBan(rapCay(kq.dong));

  state.treeId   = treeId;
  state.tree     = cay;
  state.index    = buildIndex(cay);
  state.revision = cay.tree.revision;
  state.doi      = rapDoi(kq.dong.doi);

  state.daLocNguoiConSong = kq.dong.cheConSong === true;
  state.nguoiBiChe = new Set(kq.dong.biChe || []);

  console.log(
    '[repo] nạp cây: ' + state.index.personById.size + ' người, ' +
    state.index.unionById.size + ' hôn nhân, revision ' + state.revision);

  await kyAnhCuaCay(cay, true);

  canhBaoThieuUid(cay);
  return cay;
}

const HAN_CHU_KY = 6 * 3600;
let henKyLai = null;

function duongAnhCuaCay(cay) {
  const ds = [];
  for (const p of (cay && cay.persons) || []) if (p && p.photoFileId) ds.push(p.photoFileId);
  for (const p of (cay && cay.vanhDai) || []) if (p && p.photoFileId) ds.push(p.photoFileId);
  for (const m of (cay && cay.media) || []) {
    if (!m || m.deleted) continue;
    if (m.driveFileId) ds.push(m.driveFileId);
    if (m.driveFileIdLon) ds.push(m.driveFileIdLon);
  }
  return ds;
}

async function kyAnhCuaCay(cay, tatCa) {
  const ds = duongAnhCuaCay(cay);
  const can = tatCa ? ds : thieuChuKy(ds);
  if (can.length) {
    try {
      const kq = await sb.kyAnh(can, HAN_CHU_KY);
      ghiChuKy(kq.bang);
      if (kq.loi) console.warn('[repo] chưa ký được một phần ảnh: ' + kq.loi);
    } catch (e) {
      console.warn('[repo] chưa ký được ảnh: ' + (e && e.message ? e.message : e));
    }
  }
  if (tatCa) {
    clearTimeout(henKyLai);
    henKyLai = setTimeout(() => { kyAnhCuaCay(state.tree, true); }, HAN_CHU_KY * 500);
  }
}

const KHO_MOI_LO = { P: 5, U: 3, M: 3 };

async function dayKhoMa() {
  if (!suaDuoc()) return;
  const can = Object.keys(KHO_MOI_LO).filter((l) => soMaTrongKho(l) === 0);
  if (!can.length) return;
  try {
    const kq = await Promise.all(can.map((l) => sb.capMa(l, KHO_MOI_LO[l])));
    can.forEach((l, i) => { if (kq[i] && kq[i].ok) napKho(l, kq[i].ds); });
  } catch (e) {
    console.warn('[repo] chưa xin được mã mới: ' + (e && e.message ? e.message : e));
  }
}

export async function xinMa(loai, so) {
  const kq = await sb.capMa(loai, so);
  if (!kq.ok) return { ok: false, loi: kq.loi, so: 0 };
  napKho(loai, kq.ds);
  return { ok: true, loi: null, so: kq.ds.length };
}

export async function taiAnh(blob, tenFile) {
  if (!state.treeId) return { ok: false, fileId: '', loi: 'Chưa mở gia phả nào nên chưa tải ảnh được.' };
  const kq = await sb.taiAnh(state.treeId, blob, tenFile);
  if (kq.ok && kq.duongDan) await kyAnhCuaCay({ persons: [{ photoFileId: kq.duongDan }] }, false);
  return { ok: kq.ok, fileId: kq.duongDan || '', loi: kq.loi };
}

export async function timNguoiMoiCay(chuoi) {
  if (!state.treeId) return { ok: false, loi: 'Chưa biết đang mở gia phả nào.', ds: [] };
  return sb.timNguoiMoiCay(state.treeId, chuoi);
}

export async function docNguoiTheoMa(ma) {
  const kq = await sb.docNguoiTheoMa(ma);
  if (!kq.ok) return { ok: false, loi: kq.loi, nguoi: null };
  const nguoi = rapMotNguoi(kq.dong);
  if (nguoi && nguoi.photoFileId) await kyAnhCuaCay({ persons: [nguoi] }, false);
  return { ok: true, loi: null, nguoi };
}

export async function nopDeNghiQuanHe(loai, unionId, personId, lyDo) {
  if (!state.treeId) return { ok: false, loi: 'Chưa biết đang mở gia phả nào.' };
  return sb.nopDeNghiQuanHe(state.treeId, loai, unionId, personId, lyDo);
}

function chonNguoiTrungTam(phien) {
  const con = (id) => !!(id && state.index && state.index.personById.has(id));

  if (con(phien.nguoiTrungTamMacDinh)) return phien.nguoiTrungTamMacDinh;

  const goc = state.tree && state.tree.tree && state.tree.tree.rootPersonId;
  if (con(goc)) return goc;

  const dau = state.index && state.index.personById.keys().next();
  return (dau && !dau.done) ? dau.value : null;
}

export async function luuCay(apDung, moTa) {
  if (!state.tree) {
    return tuChoi('chuanapcay', 'Chưa nạp được gia phả nên chưa lưu được gì.');
  }
  if (!suaDuoc()) {
    return tuChoi('khongcoquyen',
      'Bạn chỉ có quyền xem gia phả, không sửa được. ' +
      'Cần sửa thì nhờ người quản lý đổi quyền cho tài khoản của bạn.');
  }

  const banNhap = JSON.parse(JSON.stringify(state.tree));
  if (typeof apDung === 'function') apDung(banNhap);

  const ops = soSanh(state.tree, banNhap);

  if (!coGiDeGhi(ops)) {
    return { ok: true, lyDo: 'khongdoigi', loi: null, revision: state.revision };
  }

  let kq;
  try {
    kq = await sb.luuCay(state.treeId, state.revision, ops, moTa || null);
  } catch (e) {
    return tuChoi('khongnoiduoc',
      'Không gọi được máy chủ nên chưa lưu được. ' +
      (e && e.message ? e.message : String(e)));
  }

  if (!kq)    return tuChoi('khongtraloi', 'Máy chủ không trả về gì khi lưu.');
  if (!kq.ok) return kq;

  banNhap.tree.revision  = kq.revision;
  banNhap.tree.updatedAt = (kq.tree && kq.tree.updated_at) || banNhap.tree.updatedAt;
  banNhap.tree.updatedBy = (kq.tree && kq.tree.updated_by) || banNhap.tree.updatedBy;

  tangSoSauKhiLuu(banNhap, ops);

  if (moTa && moTa.target) {
    if (!Array.isArray(banNhap.changeLog)) banNhap.changeLog = [];
    banNhap.changeLog.push({ target: moTa.target, diff: moTa.diff || {} });
  }

  state.tree     = banNhap;
  state.index    = buildIndex(banNhap);
  state.revision = kq.revision;
  state.dirty    = false;
  notify();

  dayKhoMa().catch(() => {});

  lamTuoiDoi(state.treeId).catch(() => {});

  console.log('[repo] đã lưu: revision ' + kq.revision + ' · ' + tomTat(ops));
  return kq;
}

export async function napCayRieng(treeId) {
  try {
    const kq = await sb.layDong(treeId);
    if (!kq || !kq.ok) return { ok: false, loi: (kq && kq.loi) || 'Máy chủ không trả cây.', cay: null };
    return { ok: true, loi: null, cay: kiemPhienBan(rapCay(kq.dong)) };
  } catch (e) {
    return { ok: false, loi: e && e.message ? e.message : String(e), cay: null };
  }
}

export async function luuCayRieng(treeId, cay, apDung, moTa) {
  const banNhap = JSON.parse(JSON.stringify(cay));
  apDung(banNhap);
  const ops = soSanh(cay, banNhap);
  if (!coGiDeGhi(ops)) return { ok: true, lyDo: 'khongdoigi', loi: null, cay };
  const mt = typeof moTa === 'function' ? moTa() : moTa;

  let kq;
  try {
    kq = await sb.luuCay(treeId, cay.tree.revision, ops, mt || null);
  } catch (e) {
    return tuChoi('khongnoiduoc', 'Không gọi được máy chủ nên chưa lưu được. ' +
      (e && e.message ? e.message : String(e)));
  }
  if (!kq) return tuChoi('khongtraloi', 'Máy chủ không trả về gì khi lưu.');
  if (!kq.ok) return kq;

  banNhap.tree.revision = kq.revision;
  tangSoSauKhiLuu(banNhap, ops);
  console.log('[repo] đã lưu cây ' + treeId + ': revision ' + kq.revision + ' · ' + tomTat(ops));
  return { ...kq, cay: banNhap };
}

async function lamTuoiDoi(treeId) {
  const kq = await sb.docDoi(treeId);
  if (!kq.ok || state.treeId !== treeId) return;
  const moi = rapDoi(kq.dong);
  const cu = state.doi || new Map();
  let khac = moi.size !== cu.size;
  if (!khac) for (const [id, n] of moi) if (cu.get(id) !== n) { khac = true; break; }
  if (!khac) return;
  state.doi = moi;
  notify();
}

function tomTat(ops) {
  const phan = [];
  for (const ten of ['persons', 'unions', 'children', 'media', 'sources']) {
    const o = ops[ten];
    if (!o) continue;
    if (o.luu.length) phan.push(ten + ' +' + o.luu.length);
    if (o.xoa.length) phan.push(ten + ' -' + o.xoa.length);
  }
  return phan.length ? phan.join(', ') : 'chỉ khối thông tin cây';
}

function tuChoi(lyDo, loi) {
  return { ok: false, lyDo, loi, revision: null };
}

export function suaDuoc() {
  return !!(state.phien && state.phien.suaDuoc);
}

export function docDuoc() {
  return !!(state.phien && state.phien.docDuoc);
}

function kiemPhienBan(cay) {
  const v = Number(cay.version);
  if (!Number.isFinite(v)) {
    throw new Error('Gia phả không ghi số phiên bản dữ liệu.');
  }
  if (v > DATA_VERSION) {
    throw new Error('Dữ liệu là phiên bản ' + v + ', mới hơn app ' +
                    '(phiên bản ' + DATA_VERSION + '). Tải lại trang để lấy ' +
                    'bản app mới trước khi mở.');
  }
  return cay;
}

function canhBaoThieuUid(cay) {
  let thieu = 0;
  for (const ten of ['persons', 'unions']) {
    for (const b of cay[ten] || []) if (b && b.id && !b.uid) thieu++;
  }
  if (thieu) {
    console.warn('[repo] ' + thieu + ' bản ghi chưa có uid. Chạy script di ' +
                 'dời để điền, đừng để app tự điền — xem canhBaoThieuUid().');
  }
}

export async function taoGiaPhaMoi(ten, tuyChon = {}) {
  const conSong = typeof tuyChon.conSong === 'function' ? tuyChon.conSong : null;
  const ngungRoi = () => (conSong ? !conSong() : false);

  const tenSach = String(ten == null ? '' : ten).trim();
  const maCay = String(tuyChon.maCay || '').trim() || sinhMaCay(tenSach, tenSach);

  const kq = await sb.taoGiaPhaMoi(tenSach, maCay, tuyChon.note || '');
  if (ngungRoi()) return { ok: false, moi: null, lyDo: 'daDong', loi: null };

  if (!kq.ok) {
    return { ok: false, moi: null, lyDo: 'maychutuchoi', loi: kq.loi };
  }
  return {
    ok: true, lyDo: null, loi: null,
    moi: { fileId: kq.cay.fileId, ten: kq.cay.ten, tenFile: kq.cay.maCay },
  };
}
