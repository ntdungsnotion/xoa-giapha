import { state, notify } from '../state.js';
import { computeVisibleSet, findStubPoints } from '../domains/bloodline.js';
import { computeLayout } from '../domains/layout.js';
import { xepCheDoChu } from '../domains/so-do-chu.js';
import { renderTree, beRong } from '../domains/render.js';
import { getSpouses, getParents, getChildren, getSiblings } from '../domains/union.js';
import { fullName, doiSongNguoi } from '../utils/text.js';
import { chiMucVe, tapHuyetThong, themDauRe } from '../utils/graph.js';
import { openPersonMenu, openPersonDetail, openUnionDetail,
         closePersonDetail } from './person-detail.js';
import { openPersonForm, closePersonForm, quickAddChild, quickAddParent,
         quickAddSpouse, linkExisting, goNoiNguoi, xoaNguoi,
         openUnionForm, openMergeForm, openSapThuTu, openSuaCon, openFamilyForm,
         khoiPhucNhieu, donThungRac, themNguoiDauTien,
         chuyenVaoThungRac } from './person-edit.js';
import { openPersonList, closePersonList, openThungRac,
         openDanhSachGiaDinh } from './person-list.js';
import { openReview, closeReview } from './review.js';
import { openSettings, closeSettings } from './settings.js';
import { openChonGiaPha, closeChonGiaPha } from './chon-gia-pha.js';
import { openXuatGedcom, closeXuatGedcom, openNhapGedcom, closeNhapGedcom }
  from './import-export.js';
import { xuatExcelNguoi } from './quan-tri/xuat-excel.js';
import { xuatAnhPNG, inSoDo, xuatAnhDoPhanGiaiCao, xuatPdfDoPhanGiaiCao, docCoSoDo,
         xuatPdfNhieuTrang, xemTruocNhieuTrang }
  from './export-image.js';
import { veBieuTuongTron } from '../utils/glyph.js';
import { rongHop, caoHop, leLopPhu } from '../config.js';

const ID_KHUNG_IN = 'giapha-khung-in';

let khungCuon = null;
let vungSoDo  = null;
let svgEl     = null;
let nhanTyLe  = null;
let layoutHT  = null;

const TY_LE_MIN = 0.25;
const TY_LE_MAX = 3;
const TY_LE_NAC = 1.25;

let tyLe = 1;
const LE_NUT_NGANG = 84;
const LE_NUT_DOC   = 56;
let padX = 0;
let padY = 0;

const CO_NUT_TRON = 44;

export function mountTreeView(containerEl) {
  if (!containerEl) return;
  closePersonDetail();
  closePersonForm();
  closePersonList();
  closeReview();
  closeSettings();
  closeChonGiaPha();
  closeXuatGedcom();
  closeNhapGedcom();
  containerEl.innerHTML = '';
  containerEl.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;' +
    'background:var(--sd-nen,#faf8f5);font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  khungCuon = document.createElement('div');
  khungCuon.id = ID_KHUNG_IN;
  khungCuon.style.cssText =
    'flex:1 1 auto;overflow:auto;-webkit-overflow-scrolling:touch;padding:0;' +
    'box-sizing:border-box;touch-action:none;overscroll-behavior:contain;' +
    'user-select:none;-webkit-user-select:none';

  svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.style.cssText = 'display:block';
  khungCuon.append(svgEl);

  vungSoDo = document.createElement('div');
  vungSoDo.style.cssText =
    'position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column';

  vungSoDo.append(khungCuon, veCotToTien(), veCotHauDue(), veHopNutTrenPhai(), veHopNut());
  containerEl.append(vungSoDo);
  ganCuChi();
  refresh();
}

let veCua = null;

function layChiMucVe() {
  if (!state.index || !state.tree) return state.index;
  if (!veCua || veCua.tree !== state.tree || veCua.index !== state.index) {
    veCua = { tree: state.tree, index: state.index, ve: chiMucVe(state.tree) };
  }
  return veCua.ve;
}

export function refresh() {
  if (!svgEl) return;
  donKhung();

  capNhatNutPhamVi();

  const index = layChiMucVe();
  const focus = state.focusPersonId;

  if (index && index.personById.size === 0) {
    const suaDuoc = !!(state.phien && state.phien.suaDuoc);
    hienLoiNhan(
      'Gia phả này chưa có ai.',
      suaDuoc
        ? 'Bắt đầu bằng một người bất kỳ — thường là người cao tuổi nhất còn ' +
          'nhớ được, hoặc chính bạn. Những người khác nối vào sau, từ người này.'
        : 'Bạn chỉ có quyền xem, nên chưa nhập được ai. Nhờ người quản lý nhập ' +
          'người đầu tiên, hoặc đổi quyền cho bạn trên Google Drive.',
      suaDuoc ? { chu: 'Thêm người đầu tiên', bam: moThemDauTien } : null
    );
    return;
  }

  if (!index || !focus) {
    hienLoiNhan('Chưa chọn được người trung tâm.',
                'Bấm nút 🔍 ở góc trên bên phải để tìm một người trong gia phả, ' +
                'hoặc kiểm tra lại file dữ liệu.');
    return;
  }

  let visible = computeVisibleSet(index, focus, state.scope);

  if (state.showInLaws === false) {
    const huyet = tapHuyetThong(index, focus);
    visible = new Map([...visible].filter(([id]) => huyet.has(id)));
  } else {
    visible = themDauRe(index, visible, focus);
  }

  if (visible.size === 0) {
    const p = index.personById.get(focus);
    hienLoiNhan(
      p ? 'Không vẽ được sơ đồ quanh ' + fullName(p) + '.'
        : 'Người trung tâm ' + focus + ' không còn trong gia phả.',
      'Có thể bản ghi này đã bị xoá. Bấm nút 🔍 ở góc trên bên phải để tìm ' +
      'và chọn một người khác.');
    return;
  }

  const hienGio = { hienNgayGio: state.hienNgayGio === true };
  let layout;
  if (docCheDoChu()) {
    const kq = xepCheDoChu(index, focus, visible, state.scope, beRong, hienGio.hienNgayGio);
    layout = kq.layout;
    hienGio.hangChu = kq.hang;
    hienGio.nguoiChu = kq.nguoi;
  } else {
    const stubs = findStubPoints(index, visible, state.scope);
    layout = computeLayout(index, focus, visible, state.scope, stubs, hienGio);
  }
  layoutHT = layout;

  renderTree(svgEl, layout, index, {
    onChonNguoi:  (personId) => bamVaoO(personId),
    onChonNotCut: (stub) => moNotCut(stub, visible),
  }, hienGio);

  apDungTyLe();
  centerOnFocus();
}

function bamVaoO(personId) {
  if (personId && personId === state.focusPersonId) {
    moTheNguoiTrungTam();
    return;
  }
  setFocusPerson(personId);
}

export function setFocusPerson(personId) {
  if (!personId || personId === state.focusPersonId) return;
  if (state.index && !state.index.personById.has(personId)) return;
  state.focusPersonId = personId;
  notify();
  refresh();
}

function moNotCut(stub, visible) {
  const ds = nguoiSauNotCut(layChiMucVe(), visible, stub);
  if (ds.length === 0) return;
  if (ds.length === 1) { setFocusPerson(ds[0]); return; }
  hienDanhSachChon(ds);
}

function nguoiSauNotCut(index, visible, stub) {
  const ra = [];
  if (!index || !stub) return ra;

  const them = (id) => {
    if (!id || visible.has(id)) return;
    if (!index.personById.has(id)) return;
    if (ra.indexOf(id) === -1) ra.push(id);
  };

  const nguon = Array.isArray(stub.nguon) && stub.nguon.length
    ? stub.nguon
    : [{ unionId: stub.unionId, direction: stub.direction }];

  for (const ng of nguon) {
    const u = index.unionById.get(ng.unionId);
    if (!u) continue;
    for (const pid of Array.isArray(u.partners) ? u.partners : []) them(pid);
    if (ng.direction !== 'up') {
      for (const con of Array.isArray(u.children) ? u.children : []) {
        them(con && con.personId);
      }
    }
  }
  return ra;
}

function apDungTyLe() {
  if (!svgEl || !khungCuon || !layoutHT || !layoutHT.bounds) return;
  const b    = layoutHT.bounds;
  const rong = Math.max(1, b.maxX - b.minX) * tyLe;
  const cao  = Math.max(1, b.maxY - b.minY) * tyLe;

  svgEl.setAttribute('width',  String(Math.round(rong)));
  svgEl.setAttribute('height', String(Math.round(cao)));

  padX = Math.max(LE_NUT_NGANG, (khungCuon.clientWidth  - rong) / 2);
  padY = Math.max(LE_NUT_DOC,   (khungCuon.clientHeight - cao)  / 2);
  khungCuon.style.padding = padY + 'px ' + padX + 'px';

  if (nhanTyLe) nhanTyLe.textContent = Math.round(tyLe * 100) + '%';
}

function datTyLeNeo(tyLeMoi, noiDungX, noiDungY, cx, cy) {
  if (!khungCuon || !layoutHT) return;
  const moi = Math.min(TY_LE_MAX, Math.max(TY_LE_MIN, tyLeMoi));
  if (Math.abs(moi - tyLe) < 0.0005) return;

  tyLe = moi;
  apDungTyLe();
  khungCuon.scrollLeft = noiDungX * tyLe + padX - cx;
  khungCuon.scrollTop  = noiDungY * tyLe + padY - cy;
}

function datTyLe(tyLeMoi, cx, cy) {
  if (!khungCuon) return;
  if (cx === undefined) { cx = khungCuon.clientWidth / 2; cy = khungCuon.clientHeight / 2; }
  const diem = noiDungTaiDiem(cx, cy);
  datTyLeNeo(tyLeMoi, diem.x, diem.y, cx, cy);
}

function noiDungTaiDiem(cx, cy) {
  return {
    x: (khungCuon.scrollLeft + cx - padX) / tyLe,
    y: (khungCuon.scrollTop  + cy - padY) / tyLe,
  };
}

function centerOnFocus() {
  if (!khungCuon || !layoutHT || !Array.isArray(layoutHT.nodes)) return;
  const nut = layoutHT.nodes.find((n) => n.laTrungTam);
  if (!nut) return;

  const b = layoutHT.bounds;
  khungCuon.scrollLeft =
    ((nut.x - b.minX) + nut.w / 2) * tyLe + padX - khungCuon.clientWidth / 2;
  khungCuon.scrollTop =
    ((nut.y - b.minY) + nut.h / 2) * tyLe + padY - khungCuon.clientHeight / 2;
}

const dangCham = new Map();

let keo    = null;
let bam    = null;
let daKeo  = false;
let vanToc = { x: 0, y: 0 };
let daRAF  = 0;
let daGanToanCuc = false;

const NGUONG_KEO = 8;

const CHO_CHAM_GIU = 500;

let hendChamGiu = 0;

let daMoHopLanNay = false;

function ganCuChi() {
  if (!khungCuon || khungCuon.dataset.daGanCuChi === '1') return;
  khungCuon.dataset.daGanCuChi = '1';

  khungCuon.addEventListener('pointerdown', chamXuong);
  khungCuon.addEventListener('wheel', lanChuot, { passive: false });
  khungCuon.addEventListener('contextmenu', chuotPhai);

  khungCuon.addEventListener('click', (e) => {
    if (!daKeo) return;
    daKeo = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  if (!daGanToanCuc) {
    daGanToanCuc = true;
    window.addEventListener('pointermove',   chamDi);
    window.addEventListener('pointerup',     chamLen);
    window.addEventListener('pointercancel', chamLen);
    window.addEventListener('resize', () => apDungTyLe());
  }
}

function chuotPhai(e) {
  const o = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
  const personId = o && o.getAttribute('data-id');
  if (!personId) return;

  e.preventDefault();
  huyChamGiu();
  if (daMoHopLanNay) return;

  daKeo = true;
  keo = null;
  openPersonMenu(personId, xuLyThe());
}

function chamXuong(e) {
  dungChayDa();
  huyChamGiu();
  dangCham.set(e.pointerId, { x: e.clientX, y: e.clientY });
  daKeo = false;
  daMoHopLanNay = false;

  if (dangCham.size === 1) {
    keo = motCuKeo(e.clientX, e.clientY);
    vanToc = { x: 0, y: 0 };
    bam = null;
    henChamGiu(e);
  } else if (dangCham.size === 2) {
    keo = null;
    bam = batDauPinch();
  }
}

function henChamGiu(e) {
  const o = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
  const personId = o && o.getAttribute('data-id');
  if (!personId) return;

  hendChamGiu = setTimeout(() => {
    hendChamGiu = 0;
    if (daKeo || dangCham.size !== 1) return;
    daKeo = true;
    keo = null;
    daMoHopLanNay = true;
    moSapAnhChiEm(personId);
  }, CHO_CHAM_GIU);
}

function huyChamGiu() {
  if (hendChamGiu) { clearTimeout(hendChamGiu); hendChamGiu = 0; }
}

function chamDi(e) {
  if (!dangCham.has(e.pointerId)) return;
  dangCham.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (dangCham.size >= 2) { pinch(); return; }
  if (!keo) return;

  const dx = e.clientX - keo.x;
  const dy = e.clientY - keo.y;
  if (!daKeo && Math.hypot(dx, dy) < NGUONG_KEO) return;
  daKeo = true;
  huyChamGiu();

  const gio = Date.now();
  const dt  = gio - keo.t;
  if (dt > 0) {
    vanToc = { x: (e.clientX - keo.xTruoc) / dt, y: (e.clientY - keo.yTruoc) / dt };
  }
  keo.xTruoc = e.clientX;
  keo.yTruoc = e.clientY;
  keo.t      = gio;

  khungCuon.scrollLeft = keo.scrollLeft - dx;
  khungCuon.scrollTop  = keo.scrollTop  - dy;
}

function chamLen(e) {
  huyChamGiu();
  dangCham.delete(e.pointerId);

  if (dangCham.size < 2) bam = null;
  if (dangCham.size === 0) {
    if (keo && daKeo) chayDa();
    keo = null;
  } else if (dangCham.size === 1) {
    const con = [...dangCham.values()][0];
    keo = motCuKeo(con.x, con.y);
    vanToc = { x: 0, y: 0 };
  }
}

function motCuKeo(x, y) {
  return {
    x, y, xTruoc: x, yTruoc: y, t: Date.now(),
    scrollLeft: khungCuon.scrollLeft, scrollTop: khungCuon.scrollTop,
  };
}

function batDauPinch() {
  const [a, b] = [...dangCham.values()];
  const r  = khungCuon.getBoundingClientRect();
  const cx = (a.x + b.x) / 2 - r.left;
  const cy = (a.y + b.y) / 2 - r.top;
  const diem = noiDungTaiDiem(cx, cy);
  return { kc: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), tyLe, x: diem.x, y: diem.y };
}

function pinch() {
  if (!bam) { bam = batDauPinch(); return; }
  const [a, b] = [...dangCham.values()];
  const r  = khungCuon.getBoundingClientRect();
  const cx = (a.x + b.x) / 2 - r.left;
  const cy = (a.y + b.y) / 2 - r.top;
  const kc = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));

  daKeo = true;
  datTyLeNeo(bam.tyLe * (kc / bam.kc), bam.x, bam.y, cx, cy);
}

function lanChuot(e) {
  e.preventDefault();
  const r = khungCuon.getBoundingClientRect();
  datTyLe(tyLe * Math.pow(0.995, e.deltaY), e.clientX - r.left, e.clientY - r.top);
}

function chayDa() {
  const GIAM = 0.94;
  const TOI_DA = 3;
  let vx = Math.max(-TOI_DA, Math.min(TOI_DA, vanToc.x));
  let vy = Math.max(-TOI_DA, Math.min(TOI_DA, vanToc.y));
  if (Math.hypot(vx, vy) < 0.05) return;

  const buoc = () => {
    vx *= GIAM;
    vy *= GIAM;
    if (Math.hypot(vx, vy) < 0.02) { daRAF = 0; return; }
    khungCuon.scrollLeft -= vx * 16;
    khungCuon.scrollTop  -= vy * 16;
    daRAF = requestAnimationFrame(buoc);
  };
  daRAF = requestAnimationFrame(buoc);
}

function dungChayDa() {
  if (daRAF) { cancelAnimationFrame(daRAF); daRAF = 0; }
}

function veHopNut() {
  const hop = document.createElement('div');
  hop.style.cssText =
    'position:absolute;right:12px;bottom:12px;z-index:10;' +
    'display:flex;flex-direction:column;align-items:stretch;gap:8px';

  nhanTyLe = document.createElement('div');
  nhanTyLe.textContent = Math.round(tyLe * 100) + '%';
  nhanTyLe.style.cssText =
    'text-align:center;font-size:12px;color:var(--sd-chu-phu,#8a8078);background:var(--sd-giay,#fffdf9);' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;padding:3px 0;' +
    'font-family:system-ui,sans-serif;user-select:none';

  hop.append(
    nutTron('ⓘ', 'Thông tin người trung tâm', () => moTheNguoiTrungTam()),
    nutTron('+', 'Phóng to', () => datTyLe(tyLe * TY_LE_NAC)),
    nhanTyLe,
    nutTron('−', 'Thu nhỏ', () => datTyLe(tyLe / TY_LE_NAC)),
    nutTron('◎', 'Đưa người trung tâm về giữa', () => centerOnFocus()),
  );
  return hop;
}

function xuatExcelCay(kieu) {
  const cay = state.tree || {};
  const hauTo = kieu === 'hai-sheet' ? '_NguoiGiaDinh' : '_BangPhang';
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const ten = 'DanhSachNguoi_' + ((state.phien && state.phien.maCay) || 'GiaPha') + hauTo + '_' +
    p2(d.getDate()) + '-' + p2(d.getMonth() + 1) + '-' + d.getFullYear();
  return xuatExcelNguoi(cay.persons || [], cay.unions || [], ten, kieu, state.doi || new Map());
}

function veHopNutTrenPhai() {
  const hop = document.createElement('div');
  hop.style.cssText =
    'position:absolute;right:12px;top:12px;z-index:10;' +
    'display:flex;flex-direction:column;align-items:stretch;gap:8px';
  hop.append(
    nutTron('⚙', 'Cài đặt', () => openSettings({
      onDoiHienThi: () => refresh(),

      onDanhSachNguoi:   () => { closeSettings(); moDanhSachNguoi(); },
      onDanhSachGiaDinh: () => { closeSettings(); moDanhSachGiaDinh(); },
      onMoChonGiaPha: () => { closeSettings(); openChonGiaPha(); },
      onMoXuatGedcom: () => { closeSettings(); openXuatGedcom(); },
      onXuatExcel: (kieu) => xuatExcelCay(kieu),
      onMoNhapGedcom: () => { closeSettings(); openNhapGedcom(); },
      onXuatAnhPng: () => xuatAnhPNG(svgEl, state.tree),
      onInSoDo: (rongKhoLonMm) => inSoDo(svgEl, ID_KHUNG_IN, rongKhoLonMm),
      onXuatAnhDpi: (rongCm, dpi) =>
        xuatAnhDoPhanGiaiCao(svgEl, state.tree, rongCm, dpi),
      onXuatPdfDpi: (rongCm, dpi) =>
        xuatPdfDoPhanGiaiCao(svgEl, state.tree, rongCm, dpi),
      onXemTruocPdf: (chuCaoMm, tenKho, nam, dpi) =>
        xemTruocNhieuTrang(svgEl, chuCaoMm, tenKho, nam, dpi),
      onXuatPdfNhieuTrang: (tuyChon) =>
        xuatPdfNhieuTrang(svgEl, state.tree, tuyChon),
      onCoSoDo: () => docCoSoDo(svgEl),
    })),
    nutTron('🔍', 'Tìm người trong gia phả', () => moDanhSachNguoi()),
    veNutCheDo(),
  );
  return hop;
}

const KHOA_CHE_DO = 'giapha.cheDoChu';
function docCheDoChu() {
  try { return localStorage.getItem(KHOA_CHE_DO) === '1'; } catch (e) { return false; }
}
function veNutCheDo() {
  const nut = nutTron('', '', () => {
    const chuMoi = !docCheDoChu();
    try { localStorage.setItem(KHOA_CHE_DO, chuMoi ? '1' : '0'); } catch (e) {   }
    ghiNhan();
    refresh();
  });
  nut.style.opacity = '0.5';
  nut.style.fontSize = '11px';
  nut.style.fontWeight = '600';
  const ghiNhan = () => {
    const chu = docCheDoChu();
    nut.textContent = chu ? 'Chữ' : 'Ảnh';
    nut.title = (chu ? 'Đang vẽ CHỈ CHỮ (tên, năm)' : 'Đang vẽ có ẢNH') + ' — bấm để đổi';
    nut.setAttribute('aria-label', nut.title);
  };
  ghiNhan();
  return nut;
}

function moDanhSachNguoi() {
  const goc = xuLyThe();
  const dongTruoc = (fn) => (...a) => { closePersonList(); fn(...a); };

  openPersonList({
    onThungRac: moThungRac,
    onRaSoat:   moRaSoat,
    onXemHoSo: (id) => openPersonDetail(id, {
      onChonNguoi:  dongTruoc(goc.onChonNguoi),
      onSuaNguoi:   dongTruoc(goc.onSuaNguoi),
      onThemChaMe:  dongTruoc(goc.onThemChaMe),
      onThemBanDoi: dongTruoc(goc.onThemBanDoi),
      onThemCon:    dongTruoc(goc.onThemCon),
      onKetNoi:     dongTruoc(goc.onKetNoi),
      onGoNoi:      dongTruoc(goc.onGoNoi),
      onXoaNguoi:   dongTruoc(goc.onXoaNguoi),
      onSuaCap:     dongTruoc(goc.onSuaCap),
      onSapThuTu:   dongTruoc(goc.onSapThuTu),
      onSuaCon:     dongTruoc(goc.onSuaCon),
      onSuaGiaDinh: dongTruoc(goc.onSuaGiaDinh),
    }),
  });
}

function moFormSuaCap(personId, unionId) {
  openUnionForm(personId, { onDaLuu: () => refresh(), unionId });
}

function moThungRac() {
  const moLai = () => { refresh(); moThungRac(); };
  openThungRac({
    onKhoiPhuc: (ids) => khoiPhucNhieu(ids, { onDaLuu: moLai }),

    onXoaHan: (ids) => donThungRac({ onDaLuu: () => refresh() }, ids),
  });
}

function moRaSoat() {
  openReview({
    onXemHoSo: (id) => openPersonDetail(id, xuLyThe()),
    onXemCap:  (id) => openUnionDetail(id, xuLyThe()),

    onGopCap:  (a, b) => openMergeForm(a, b, {
      onDaLuu: () => { refresh(); moRaSoat(); },
    }),

    onGomRac: (ids) => chuyenVaoThungRac(ids, {
      onDaLuu: () => { refresh(); moRaSoat(); },
    }),
  });
}

function moTheNguoiTrungTam() {
  if (!state.focusPersonId) return;
  openPersonMenu(state.focusPersonId, xuLyThe());
}

function xuLyThe() {
  return {
    onChonNguoi:  (id) => setFocusPerson(id),
    onSuaNguoi:   moFormSua,
    onThemChaMe:  moFormThemChaMe,
    onThemBanDoi: moFormThemBanDoi,
    onThemCon:    moFormThemCon,
    onKetNoi:     moKetNoi,
    onGoNoi:      moGoNoi,
    onXoaNguoi:   moHopXoa,
    onSuaCap:     moFormSuaCap,
    onSapThuTu:   moSapCacCon,
    onSuaCon:     moSuaCon,
    onSuaGiaDinh: moFormGiaDinh,
    onXoaCap:     moXoaCap,
  };
}

function moXoaCap(unionId) {
  chuyenVaoThungRac([unionId], { onDaLuu: () => refresh() });
}

function moDanhSachGiaDinh() {
  openDanhSachGiaDinh({
    onXemCap: (unionId) => openUnionDetail(unionId, xuLyThe()),
  });
}

function moFormGiaDinh(personId) {
  openFamilyForm(personId, Object.assign(xuLyThe(), {
    onDaLuu:  () => refresh(),
    onXemCap: (unionId) => openUnionDetail(unionId, xuLyThe()),
  }));
}

function moSuaCon(unionId) {
  openSuaCon(unionId, { onDaLuu: () => refresh() });
}

function moSapAnhChiEm(personId) {
  openSapThuTu(personId, 'anhChiEm', { onDaLuu: () => refresh() });
}

function moSapCacCon(personId) {
  openSapThuTu(personId, 'con', { onDaLuu: () => refresh() });
}

function moFormSua(personId) {
  openPersonForm(personId, { onDaLuu: () => refresh() });
}

function moFormThemCon(noiVao) {
  quickAddChild(noiVao, { onDaLuu: () => refresh() });
}

function moFormThemChaMe(personId) {
  quickAddParent(personId, { onDaLuu: () => refresh() });
}

function moFormThemBanDoi(personId) {
  quickAddSpouse(personId, { onDaLuu: () => refresh() });
}

function moKetNoi(personId) {
  openPersonList({
    onChonNguoi: (targetId) => {
      closePersonList();
      linkExisting(personId, targetId, '', { onDaLuu: () => refresh() });
    },
  });
}

function moGoNoi(personId) {
  goNoiNguoi(personId, { onDaLuu: () => refresh() });
}

function moHopXoa(personId) {
  const thay = (state.focusPersonId === personId) ? nguoiDungThayCho(personId) : null;

  xoaNguoi(personId, {
    nguoiThayThe: thay,
    onDaXoa: () => {
      if (state.focusPersonId === personId && thay) {
        state.focusPersonId = thay;
        notify();
      }
      refresh();
    },
    onDaHoanTac: () => {
      if (thay && state.focusPersonId === thay) {
        state.focusPersonId = personId;
        notify();
      }
      refresh();
    },
    onDaDoi: () => refresh(),
  });
}

function nguoiDungThayCho(personId) {
  const index = state.index;
  if (!index) return null;

  for (const nhom of [getSpouses, getParents, getChildren, getSiblings]) {
    for (const m of nhom(index, personId)) {
      if (m && m.personId !== personId && index.personById.has(m.personId)) return m.personId;
    }
  }

  const goc = state.tree && state.tree.tree && state.tree.tree.rootPersonId;
  if (goc && goc !== personId && index.personById.has(goc)) return goc;

  for (const id of index.personById.keys()) {
    if (id !== personId) return id;
  }
  return null;
}

function nutTron(chu, nhan, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.title = nhan;
  nut.setAttribute('aria-label', nhan);
  nut.style.cssText =
    'width:' + CO_NUT_TRON + 'px;height:' + CO_NUT_TRON + 'px;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:0;box-sizing:border-box;color:var(--sd-chu,#2a2622);' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:' + (CO_NUT_TRON / 2) + 'px;background:var(--sd-giay,#fffdf9);' +
    'box-shadow:0 1px 4px rgba(42,38,34,.12);cursor:pointer;touch-action:manipulation';

  nut.append(veBieuTuongTron(chu));
  nut.addEventListener('click', chay);
  return nut;
}
function donKhung() {
  if (!khungCuon) return;
  khungCuon.innerHTML = '';
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  khungCuon.append(svgEl);
}

function hienLoiNhan(tieuDe, giaiThich, nut) {
  layoutHT = null;
  donKhung();
  padX = 0;
  padY = 0;
  if (khungCuon) khungCuon.style.padding = '0';

  const hop = document.createElement('div');
  hop.style.cssText = 'max-width:min(' + rongHop(420, 620) + ', 100%);' +
                      'box-sizing:border-box;' +
                      'margin:48px auto;padding:0 24px;line-height:1.6';

  const h = document.createElement('h2');
  h.textContent = tieuDe;
  h.style.cssText = 'font-size:18px;margin:0 0 8px';

  const p = document.createElement('p');
  p.textContent = giaiThich;
  p.style.cssText = 'margin:0;font-size:14px;color:var(--sd-chu-phu,#8a8078)';

  hop.append(h, p);

  if (nut && typeof nut.bam === 'function') {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = nut.chu;
    b.style.cssText =
      'margin-top:18px;padding:10px 18px;font-size:15px;font-family:inherit;' +
      'border:1px solid var(--sd-nut,#2a2622);border-radius:8px;background:var(--sd-nut,#2a2622);' +
      'color:var(--sd-nut-chu,#fffdf9);font-weight:600;cursor:pointer';
    b.addEventListener('click', nut.bam);
    hop.append(b);
  }

  khungCuon.prepend(hop);
}

function moThemDauTien() {
  themNguoiDauTien({ onDaLuu: (personId) => setFocusPerson(personId) });
}

function hienDanhSachChon(danhSachId) {
  const phu = document.createElement('div');
  phu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:20;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu(24) + ';';

  const hop = document.createElement('div');
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:12px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(340, 520) + ';' +
    'max-height:' + caoHop(70, 24) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.25);' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const h = document.createElement('div');
  h.textContent = 'Mở nhánh nào?';
  h.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:4px';

  const g = document.createElement('div');
  g.textContent = 'Chọn một người để đưa ra giữa sơ đồ.';
  g.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078);margin-bottom:12px';

  hop.append(h, g);

  for (const id of danhSachId) {
    const p   = state.index.personById.get(id);
    const doi = p ? doiSongNguoi(p) : '';
    const nut = document.createElement('button');
    nut.textContent = (p ? fullName(p) : id) + (doi ? '  ·  ' + doi : '');
    nut.style.cssText =
      'display:block;width:100%;text-align:left;margin-bottom:8px;padding:10px 12px;' +
      'font-size:15px;font-family:inherit;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
      'background:var(--sd-giay,#fff);cursor:pointer';
    nut.addEventListener('click', () => { phu.remove(); setFocusPerson(id); });
    hop.append(nut);
  }

  const dong = document.createElement('button');
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin-top:4px;padding:8px 14px;font-size:14px;font-family:inherit;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;background:var(--sd-nen,#faf8f5);cursor:pointer';
  dong.addEventListener('click', () => phu.remove());
  hop.append(dong);

  phu.addEventListener('click', (e) => { if (e.target === phu) phu.remove(); });
  phu.append(hop);
  document.body.append(phu);
}

const NAC_TO_TIEN = [
  { nhan: 'Không giới hạn', ancestors: 0, moTa: 'Vẽ lên hết các đời tổ tiên' },
  { nhan: '4 đời trước',    ancestors: 4, moTa: 'Chỉ vẽ lên 4 đời tổ tiên' },
  { nhan: '3 đời trước',    ancestors: 3, moTa: 'Chỉ vẽ lên 3 đời tổ tiên' },
  { nhan: '2 đời trước',    ancestors: 2, moTa: 'Chỉ vẽ lên 2 đời tổ tiên' },
];

const NAC_HAU_DUE = [
  { nhan: 'Con',            descendants: 1, moTa: 'Vẽ xuống một đời' },
  { nhan: 'Cháu',           descendants: 2, moTa: 'Vẽ xuống hai đời' },
  { nhan: 'Không giới hạn', descendants: 0, moTa: 'Vẽ xuống hết các đời hậu duệ' },
];

const TOI_DA_DOI = 30;

let nutToTien = [];
let nutHauDue = [];
let nutDauRe  = null;
let oNhapToTien = null;
let oNhapHauDue = null;

let thanToTien = null, tomTatToTien = null, xoToTien = false;
let thanHauDue = null, tomTatHauDue = null, xoHauDue = false;
let cotTren = null, cotDuoi = null, daGanDongKhiBamNgoai = false;

function ganDongKhiBamNgoai() {
  if (daGanDongKhiBamNgoai) return;
  daGanDongKhiBamNgoai = true;
  document.addEventListener('pointerdown', (e) => {
    if (!xoToTien && !xoHauDue) return;
    const t = e.target;
    if ((cotTren && cotTren.contains(t)) || (cotDuoi && cotDuoi.contains(t))) return;
    datXo('tren', false);
    datXo('duoi', false);
  }, true);
}

function veCotToTien() {
  const hop = veCotNut('left:12px;top:12px');
  thanToTien = veThanCot('Đời trên');
  nutToTien = NAC_TO_TIEN.map((nac) => {
    const nut = nutChu(nac.nhan, nac.moTa, () => datPhamViToTien(nac));
    thanToTien.append(nut);
    return nut;
  });
  const nhapTren = veHangNhapTay(
    'Nhập số đời tổ tiên cần vẽ rồi bấm Vẽ. 0 = không giới hạn.',
    datPhamViToTienSo);
  oNhapToTien = nhapTren.o;
  thanToTien.append(nhapTren.nhan, nhapTren.hang);
  tomTatToTien = nutTomTat(() => datXo('tren', !xoToTien));
  hop.append(tomTatToTien, thanToTien);
  cotTren = hop;
  ganDongKhiBamNgoai();
  return hop;
}

function veCotHauDue() {
  const hop = veCotNut('left:12px;bottom:12px');
  thanHauDue = veThanCot('Đời dưới');
  nutHauDue = NAC_HAU_DUE.map((nac) => {
    const nut = nutChu(nac.nhan, nac.moTa, () => datPhamViHauDue(nac));
    thanHauDue.append(nut);
    return nut;
  });
  const nhapDuoi = veHangNhapTay(
    'Nhập số đời hậu duệ cần vẽ rồi bấm Vẽ. 0 = không giới hạn.',
    datPhamViHauDueSo);
  oNhapHauDue = nhapDuoi.o;
  thanHauDue.append(nhapDuoi.nhan, nhapDuoi.hang);

  nutDauRe = nutChu('Dâu/rể', '', () => datDauRe(state.showInLaws === false));
  thanHauDue.append(nutDauRe);

  tomTatHauDue = nutTomTat(() => datXo('duoi', !xoHauDue));
  hop.append(thanHauDue, tomTatHauDue);
  cotDuoi = hop;
  return hop;
}

function datXo(cot, xo) {
  if (cot === 'tren') { xoToTien = xo; if (xo) xoHauDue = false; }
  else                { xoHauDue = xo; if (xo) xoToTien = false; }
  if (thanToTien) thanToTien.style.display = xoToTien ? 'flex' : 'none';
  if (thanHauDue) thanHauDue.style.display = xoHauDue ? 'flex' : 'none';
}

function datPhamViToTien(nac) {
  datXo('tren', false);
  if (state.scope.ancestors === nac.ancestors) { capNhatNutPhamVi(); return; }
  state.scope.ancestors = nac.ancestors;
  notify();
  refresh();
}

function datPhamViHauDue(nac) {
  const sc = state.scope;
  datXo('duoi', false);
  if (sc.descendants === nac.descendants &&
      sc.spouseOfDescendants !== false) { capNhatNutPhamVi(); return; }
  sc.descendants         = nac.descendants;
  sc.spouseOfDescendants = true;
  notify();
  refresh();
}

function datPhamViToTienSo(soDoi) {
  datXo('tren', false);
  if ((state.scope.ancestors || 0) === soDoi) { capNhatNutPhamVi(); return; }
  state.scope.ancestors = soDoi;
  notify();
  refresh();
}

function datPhamViHauDueSo(soDoi) {
  const sc = state.scope;
  datXo('duoi', false);
  if ((sc.descendants || 0) === soDoi) { capNhatNutPhamVi(); return; }
  sc.descendants = soDoi;
  notify();
  refresh();
}

function datDauRe(bat) {
  if (state.showInLaws === bat) return;
  state.showInLaws = bat;
  notify();
  refresh();
}

function capNhatNutPhamVi() {
  const sc = state.scope || {};
  const hienDauRe = state.showInLaws !== false;

  nutToTien.forEach((nut, i) => {
    datVeChon(nut, NAC_TO_TIEN[i].ancestors === (sc.ancestors || 0));
  });

  nutHauDue.forEach((nut, i) => {
    datVeChon(nut, NAC_HAU_DUE[i].descendants === (sc.descendants || 0));
  });

  if (nutDauRe) {
    nutDauRe.textContent = (hienDauRe ? '☑' : '☐') + ' Dâu/rể';
    nutDauRe.title = hienDauRe
      ? 'Đang vẽ dâu/rể. Bấm để ẩn họ đi.'
      : 'Đang ẩn dâu/rể. Bấm để vẽ họ trở lại.';
    datVeChon(nutDauRe, hienDauRe);
  }

  if (oNhapToTien && document.activeElement !== oNhapToTien) {
    oNhapToTien.value = String(sc.ancestors || 0);
  }
  if (oNhapHauDue && document.activeElement !== oNhapHauDue) {
    oNhapHauDue.value = String(sc.descendants || 0);
  }

  const nacTren = NAC_TO_TIEN.find((n) => n.ancestors === (sc.ancestors || 0));
  const nacDuoi = NAC_HAU_DUE.find((n) => n.descendants === (sc.descendants || 0));
  if (tomTatToTien) {
    tomTatToTien.textContent = '▲ ' + (nacTren ? nacTren.nhan : sc.ancestors + ' đời trước');
    tomTatToTien.title = 'Đời trên — bấm để đổi';
  }
  if (tomTatHauDue) {
    const chuDuoi = nacDuoi
      ? nacDuoi.nhan
      : ((sc.descendants || 0) === 0 ? 'Không giới hạn' : sc.descendants + ' đời dưới');
    tomTatHauDue.textContent = '▼ ' + chuDuoi + (hienDauRe ? '' : ' · ẩn dâu/rể');
    tomTatHauDue.title = 'Đời dưới — bấm để đổi';
  }
}

function veCotNut(viTri) {
  const hop = document.createElement('div');
  hop.style.cssText =
    'position:absolute;' + viTri + ';z-index:10;' +
    'display:flex;flex-direction:column;align-items:flex-start;gap:6px';
  return hop;
}

function nutTomTat(chay) {
  const nut = nutChu('', '', chay);
  nut.style.width   = 'auto';
  nut.style.height  = '32px';
  nut.style.padding = '0 12px';
  nut.style.fontSize = '12px';
  return nut;
}

function veThanCot(tieuDe) {
  const than = document.createElement('div');
  than.style.cssText =
    'display:none;flex-direction:column;align-items:stretch;gap:6px;' +
    'background:var(--sd-giay,#fffdf9);border:1px solid var(--sd-vien,#e6e0d8);border-radius:10px;padding:6px;' +
    'box-shadow:0 2px 8px rgba(42,38,34,.16)';

  const nhan = document.createElement('div');
  nhan.textContent = tieuDe;
  nhan.style.cssText =
    'font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078);' +
    'text-align:center;user-select:none';
  than.append(nhan);
  return than;
}

function nutChu(chu, nhan, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.title = nhan;
  nut.style.cssText =
    'width:132px;height:36px;font-size:12.5px;line-height:1;' +
    'font-family:system-ui,sans-serif;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
    'box-shadow:0 1px 4px rgba(42,38,34,.12);cursor:pointer;' +
    'touch-action:manipulation;white-space:nowrap';
  datVeChon(nut, false);
  nut.addEventListener('click', chay);
  return nut;
}

function veHangNhapTay(nhan, apDung) {
  const ghi = document.createElement('div');
  ghi.textContent = 'Hoặc nhập số đời';
  ghi.title = nhan;
  ghi.style.cssText =
    'font-size:11px;color:var(--sd-chu-phu,#8a8078);text-align:center;user-select:none;margin-top:2px';

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;align-items:center;gap:6px;width:132px';

  const o = document.createElement('input');
  o.type      = 'number';
  o.min       = '0';
  o.max       = String(TOI_DA_DOI);
  o.step      = '1';
  o.inputMode = 'numeric';
  o.title     = nhan;
  o.style.cssText =
    'width:64px;height:36px;box-sizing:border-box;padding:0 6px;' +
    'font-size:12.5px;line-height:1;font-family:system-ui,sans-serif;text-align:center;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;background:var(--sd-giay,#fffdf9);color:var(--sd-chu,#2a2622)';

  const nut = nutChu('Vẽ', nhan, () => {
    const soDoi = docSoDoi(o);
    if (soDoi === null) { o.focus(); o.select(); return; }
    apDung(soDoi);
  });
  nut.style.width = '62px';

  o.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    nut.click();
  });

  hang.append(o, nut);
  return { nhan: ghi, hang, o };
}

function docSoDoi(o) {
  if (String(o.value).trim() === '') return null;
  const n = Math.round(Number(o.value));
  if (!Number.isFinite(n)) return null;
  if (n < 0)          { o.value = '0';                return 0; }
  if (n > TOI_DA_DOI) { o.value = String(TOI_DA_DOI); return TOI_DA_DOI; }
  o.value = String(n);
  return n;
}

function datVeChon(nut, dangChon) {
  nut.style.background = dangChon ? 'var(--sd-nut,#2a2622)' : 'var(--sd-giay,#fffdf9)';
  nut.style.color      = dangChon ? 'var(--sd-nut-chu,#fffdf9)' : 'var(--sd-chu,#2a2622)';
  nut.style.fontWeight = dangChon ? '600' : '400';
}
