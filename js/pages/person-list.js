import { state } from '../state.js';
import { searchPersons } from '../domains/person.js';
import { listDeletedUnions } from '../domains/union.js';
import { fullName, coGiaTri, removeDiacritics } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

const TOI_DA = 200;

let lopPhu   = null;
let oTim     = null;
let khoiNhac = null;
let khoiDem  = null;
let khoiDong = null;
let xuLyNgoai = {};
let ngheBanPhim = null;
let cheDo    = 'danhSach';

let daChon = new Set();
let nutKhoiPhuc = null;
let nutXoaHan   = null;

export function openPersonList(xuLy = {}) {
  moManHinh('danhSach', xuLy);
}

export function openThungRac(xuLy = {}) {
  moManHinh('thungRac', xuLy);
}

export function openDanhSachGiaDinh(xuLy = {}) {
  moManHinh('giaDinh', xuLy);
}

function thungRacTrong() {
  return demThungRac() === 0;
}

function moManHinh(che, xuLy) {
  closePersonList();
  xuLyNgoai = xuLy || {};
  cheDo     = che;
  daChon    = new Set();

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-danh-sach';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(420, 680) + ';' +
    'height:' + caoHop(82) + ';display:flex;flex-direction:column;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28)';

  const laThungRac  = cheDo === 'thungRac';
  const laGiaDinh   = cheDo === 'giaDinh';
  const laChonNguoi = !laThungRac && !laGiaDinh &&
                      !xuLyNgoai.onXemHoSo && !!xuLyNgoai.onChonNguoi;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = laThungRac
    ? 'Thùng rác'
    : (laGiaDinh ? 'Các gia đình'
                 : (laChonNguoi ? 'Chọn một người' : 'Danh sách người'));
  tieuDe.style.cssText = 'font-size:19px;font-weight:600;flex:0 0 auto';

  khoiNhac = document.createElement('div');
  khoiNhac.style.cssText =
    'font-size:13px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:4px;flex:0 0 auto';
  veLaiNhac();
  const nhac = khoiNhac;

  hop.append(tieuDe, nhac);

  if (!laThungRac) {
    oTim = document.createElement('input');
    oTim.type = 'search';
    oTim.value = typeof xuLyNgoai.tuKhoa === 'string' ? xuLyNgoai.tuKhoa : '';
    oTim.placeholder = laGiaDinh ? 'Gõ tên một người, hoặc mã như U0008'
                                 : 'Gõ tên, hoặc mã như P0012';
    oTim.setAttribute('aria-label', laGiaDinh
      ? 'Tìm gia đình theo tên một người trong nhà, hoặc theo mã cặp'
      : 'Tìm người theo tên hoặc theo mã');
    oTim.autocomplete = 'off';
    oTim.style.cssText =
      'margin-top:12px;flex:0 0 auto;width:100%;box-sizing:border-box;height:44px;' +
      'padding:0 12px;font-size:16px;font-family:inherit;color:inherit;' +
      'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-giay,#fff)';
    oTim.addEventListener('input', veLaiDanhSach);
    oTim.addEventListener('keydown', (e) => { if (e.key === 'Enter') moDongDuyNhat(); });
    hop.append(oTim);
  }

  khoiDem = document.createElement('div');
  khoiDem.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin:8px 0 6px;flex:0 0 auto';

  khoiDong = document.createElement('div');
  khoiDong.style.cssText =
    'flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;' +
    'border-top:1px solid var(--sd-vien-nhat,#f0ece5)';

  hop.append(khoiDem, khoiDong, veChan(laThungRac, laChonNguoi || laGiaDinh));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonList(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  ngheBanPhim = (e) => { if (e.key === 'Escape') closePersonList(); };
  document.addEventListener('keydown', ngheBanPhim);

  veLaiDanhSach();
  if (oTim) oTim.focus();
}

function veChan(laThungRac, laChonNguoi) {
  nutKhoiPhuc = null;
  nutXoaHan   = null;

  const chan = document.createElement('div');
  chan.style.cssText =
    'display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;flex:0 0 auto;' +
    'justify-content:center';

  if (!laThungRac && !laChonNguoi && xuLyNgoai.onThungRac) {
    const rac = nutChan('Thùng rác (' + demThungRac() + ')', () => {
      const chay = xuLyNgoai.onThungRac;
      closePersonList();
      chay();
    });
    rac.dataset.viec = 'thung-rac';
    chan.append(rac);
  }

  if (!laThungRac && !laChonNguoi && xuLyNgoai.onRaSoat) {
    const ra = nutChan('Rà soát', () => {
      const chay = xuLyNgoai.onRaSoat;
      closePersonList();
      chay();
    });
    ra.dataset.viec = 'ra-soat';
    chan.append(ra);
  }

  if (laThungRac && !thungRacTrong()) {
    nutKhoiPhuc = nutChan('Khôi phục', () => chayViecTrenLuaChon(false));
    nutKhoiPhuc.dataset.viec = 'khoi-phuc';
    chan.append(nutKhoiPhuc);

    nutXoaHan = nutChan('Xoá hẳn', () => chayViecTrenLuaChon(true), true);
    nutXoaHan.dataset.viec = 'xoa-han';
    chan.append(nutXoaHan);
  }

  chan.append(nutChan('Đóng', () => closePersonList()));
  return chan;
}

function chayViecTrenLuaChon(laXoaHan) {
  if (daChon.size === 0) return;

  const ds = [...daChon];
  const chay = laXoaHan ? xuLyNgoai.onXoaHan : xuLyNgoai.onKhoiPhuc;
  if (!chay) return;

  const chonHet = daChon.size === demThungRac();
  closePersonList();
  chay(laXoaHan && chonHet ? null : ds);
}

function veLaiChan() {
  const hop = lopPhu && lopPhu.firstChild;
  if (!hop) return;
  const laThungRac  = cheDo === 'thungRac';
  const laGiaDinh   = cheDo === 'giaDinh';
  const laChonNguoi = !laThungRac && !laGiaDinh &&
                      !xuLyNgoai.onXemHoSo && !!xuLyNgoai.onChonNguoi;
  hop.replaceChild(veChan(laThungRac, laChonNguoi || laGiaDinh), hop.lastChild);
  capNhatChan();
}

function veLaiNhac() {
  if (!khoiNhac) return;

  khoiNhac.textContent = (cheDo === 'thungRac')
    ? 'Người và cặp đã xoá vẫn nằm nguyên trong file, chỉ mang một cái cờ. ' +
      'Đánh dấu những dòng cần xử lý, rồi chọn Khôi phục hay Xoá hẳn.'
    : (cheDo === 'giaDinh'
        ? 'Mỗi dòng là một gia đình. Tìm được cả gia đình mà không sơ đồ ' +
          'nào vẽ ra — kể cả cặp thừa do bấm nhầm.'
        : 'Tìm được cả người chưa nối với ai — những người không sơ đồ nào vẽ ra.');
}

function capNhatChan() {
  const n = daChon.size;
  for (const nut of [nutKhoiPhuc, nutXoaHan]) {
    if (!nut) continue;
    const chu = nut.dataset.nhan || nut.textContent;
    nut.textContent = n > 0 ? chu + ' (' + n + ')' : chu;
    nut.disabled = n === 0;
    nut.style.opacity = n === 0 ? '.4' : '1';
    nut.style.cursor = n === 0 ? 'default' : 'pointer';
  }
}

function nutChan(chu, chay, nguyHiem) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.dataset.nhan = chu;
  nut.style.cssText =
    'flex:1 1 0;height:42px;font-size:14px;font-family:inherit;' +
    'max-width:' + RONG_NUT_TOI_DA + ';' +
    'border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (nguyHiem
      ? 'color:var(--sd-do,#8a3a2a);background:var(--sd-do-nen,#fbf0ec);border:1px solid var(--sd-do-vien,#f0d8d0);font-weight:600'
      : 'color:inherit;background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien,#e6e0d8)');
  nut.addEventListener('click', chay);
  return nut;
}

function demThungRac() {
  if (!state.tree) return 0;
  const nguoi = searchPersons(state.tree, '', { gomDaXoa: true, toiDa: 0 })
    .ket.filter((m) => m.deleted).length;
  return nguoi + listDeletedUnions(state.tree).length;
}

export function closePersonList() {
  if (ngheBanPhim) document.removeEventListener('keydown', ngheBanPhim);
  ngheBanPhim = null;
  if (lopPhu) lopPhu.remove();
  lopPhu    = null;
  oTim      = null;
  khoiNhac  = null;
  khoiDem   = null;
  khoiDong  = null;
  xuLyNgoai = {};
  cheDo     = 'danhSach';
  daChon    = new Set();
  nutKhoiPhuc = null;
  nutXoaHan   = null;
}

export function dangMoPersonList() {
  return lopPhu !== null;
}

function veLaiDanhSach() {
  if (!khoiDong) return;
  khoiDong.innerHTML = '';

  if (!state.tree) {
    khoiDem.textContent = '';
    khoiDong.append(loiNhan('Chưa mở được gia phả.',
                            'Đóng màn hình này rồi thử tải lại trang.'));
    return;
  }

  if (cheDo === 'thungRac') { veThungRac(); return; }
  if (cheDo === 'giaDinh')  { veDanhSachGiaDinh(); return; }

  const tuKhoa = oTim ? oTim.value : '';
  const kq = searchPersons(state.tree, tuKhoa, { toiDa: TOI_DA });

  khoiDem.textContent = moTaSoLuong(kq, tuKhoa);

  if (kq.ket.length === 0) {
    khoiDong.append(loiNhan(
      'Không tìm thấy ai khớp "' + String(tuKhoa).trim() + '".',
      'Thử gõ ít chữ hơn — gõ tên đệm hay tên gọi ở nhà cũng tìm được. ' +
      'Biết mã thì gõ thẳng mã, ví dụ P0012.'));
    return;
  }

  for (const muc of kq.ket) khoiDong.append(veMotDong(muc));

  if (kq.conThua > 0) {
    const them = document.createElement('div');
    them.textContent =
      'Còn ' + kq.conThua + ' người nữa chưa hiện — gõ thêm chữ để thu hẹp.';
    them.style.cssText = 'padding:10px 4px;font-size:12px;color:var(--sd-chu-phu,#8a8078)';
    khoiDong.append(them);
  }

  capNhatChan();
}

function moTaSoLuong(kq, tuKhoa) {
  if (String(tuKhoa).trim() === '') return 'Gia phả có ' + kq.tongNguoi + ' người.';
  return kq.tongKhop + ' người khớp, trên tổng số ' + kq.tongNguoi + '.';
}

function veDongGiaDinh(u) {
  const tenCap = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && state.index.personById.has(id))
    .map((id) => fullName(state.index.personById.get(id)))
    .filter(coGiaTri);

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.setAttribute('data-ma', u.id);
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 8px;background:none;' +
    'border:none;border-bottom:1px solid var(--sd-vien-nhat,#f0ece5);font-family:inherit;color:inherit;' +
    'cursor:pointer;touch-action:manipulation';

  const hang1 = document.createElement('div');
  hang1.textContent = tenCap.length > 0 ? tenCap.join('  và  ') : '(gia đình chưa có ai)';
  hang1.style.cssText = 'font-size:15px;font-weight:600' +
    (tenCap.length > 0 ? '' : ';color:var(--sd-chu-phu,#8a8078);font-style:italic');
  nut.append(hang1);

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;
  const m = (u && typeof u.marriage === 'object' && u.marriage) ? u.marriage : {};

  const phu = [
    soCon > 0 ? soCon + ' con' : 'chưa có con',
    coGiaTri(m.raw) ? 'cưới ' + String(m.raw) : '',
    u.status === 'divorced' ? 'đã ly hôn' : '',
    u.id,
  ].filter(coGiaTri).join('  ·  ');

  const hang2 = document.createElement('div');
  hang2.textContent = phu;
  hang2.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
  nut.append(hang2);

  nut.addEventListener('click', () => {
    const chay = xuLyNgoai.onXemCap;
    closePersonList();
    if (chay) chay(u.id);
  });
  return nut;
}

function veDanhSachGiaDinh() {
  const index = state.index;
  const tuKhoa = removeDiacritics(oTim ? oTim.value : '').toLowerCase().trim();

  const tatCa = [];
  for (const u of (index ? index.unionById.values() : [])) {
    if (!u || u.deleted) continue;
    const ten = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => id && index.personById.has(id))
      .map((id) => fullName(index.personById.get(id)))
      .join(' ');
    tatCa.push({ u, tim: removeDiacritics(ten + ' ' + u.id).toLowerCase() });
  }

  tatCa.sort((a, b) => String(a.u.id).localeCompare(String(b.u.id)));
  const hop = tuKhoa === '' ? tatCa : tatCa.filter((m) => m.tim.indexOf(tuKhoa) >= 0);

  khoiDem.textContent = tuKhoa === ''
    ? 'Gia phả có ' + tatCa.length + ' gia đình.'
    : hop.length + ' gia đình khớp, trên tổng số ' + tatCa.length + '.';

  if (hop.length === 0) {
    khoiDong.append(loiNhan(
      'Không tìm thấy gia đình nào khớp "' + String(oTim ? oTim.value : '').trim() + '".',
      'Gõ tên MỘT NGƯỜI trong nhà — một gia đình không có tên riêng. ' +
      'Biết mã thì gõ thẳng mã, ví dụ U0008.'));
    return;
  }

  for (const m of hop) khoiDong.append(veDongGiaDinh(m.u));

  capNhatChan();
}

function veThungRac() {
  const dsNguoi = searchPersons(state.tree, '', { gomDaXoa: true, toiDa: 0 })
    .ket.filter((m) => m.deleted);
  const dsCap = listDeletedUnions(state.tree);

  khoiDem.textContent = daChon.size > 0
    ? 'Đang chọn ' + daChon.size + ' trên ' + (dsNguoi.length + dsCap.length) + '.'
    : 'Thùng rác có ' + dsNguoi.length + ' người và ' + dsCap.length +
      ' cặp. Bấm một dòng để chọn.';

  if (dsNguoi.length === 0 && dsCap.length === 0) {
    khoiDong.append(loiNhan(
      'Thùng rác trống.',
      'Chưa ai bị xoá khỏi gia phả này. Xoá một người là đặt cờ chứ không mất ' +
      'bản ghi, nên bất cứ thứ gì đã xoá đều quay lại được từ đây.'));
    capNhatChan();
    return;
  }

  khoiDong.append(veDongChonTatCa(dsNguoi.length + dsCap.length));

  if (dsNguoi.length > 0) {
    khoiDong.append(nhanNhom('Người đã xoá'));
    for (const muc of dsNguoi) khoiDong.append(veDongNguoiDaXoa(muc));
  }

  if (dsCap.length > 0) {
    khoiDong.append(nhanNhom('Cặp đã xoá'));
    for (const muc of dsCap) khoiDong.append(veDongCapDaXoa(muc));
  }

  capNhatChan();
}

function veDongChonTatCa(tong) {
  const het = tong > 0 && daChon.size === tong;
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'chon-tat-ca';
  nut.style.cssText =
    'display:flex;align-items:center;gap:9px;width:100%;text-align:left;' +
    'padding:10px 8px;background:none;border:none;border-bottom:1px solid var(--sd-vien-nhat,#f0ece5);' +
    'font-family:inherit;color:inherit;font-size:13px;cursor:pointer;' +
    'touch-action:manipulation';
  nut.append(oDanhDau(het), chuTrong(het ? 'Bỏ chọn tất cả' : 'Chọn tất cả'));

  nut.addEventListener('click', () => {
    if (het) {
      daChon.clear();
    } else {
      const ds = searchPersons(state.tree, '', { gomDaXoa: true, toiDa: 0 })
        .ket.filter((m) => m.deleted);
      for (const m of ds) daChon.add(m.id);
      for (const u of listDeletedUnions(state.tree)) daChon.add(u.id);
    }
    veLaiDanhSach();
  });
  return nut;
}

function oDanhDau(dangChon) {
  const o = document.createElement('span');
  o.textContent = dangChon ? '✓' : '';
  o.setAttribute('aria-hidden', 'true');
  o.style.cssText =
    'flex:0 0 auto;width:20px;height:20px;line-height:19px;text-align:center;' +
    'font-size:13px;border-radius:5px;' +
    (dangChon
      ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622)'
      : 'background:var(--sd-giay,#fff);border:1px solid var(--sd-vien,#d8d2c8)');
  return o;
}

function chuTrong(chu) {
  const d = document.createElement('span');
  d.textContent = chu;
  return d;
}

function nhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'padding:12px 4px 6px;font-size:12px;font-weight:600;letter-spacing:.04em;' +
    'color:var(--sd-chu-phu,#8a8078)';
  return d;
}

function veDongNguoiDaXoa(muc) {
  const coTen = muc.ten !== '';
  const nut = veDongTrong(
    muc.id,
    coTen ? muc.ten : '(chưa có tên)',
    [muc.id, muc.doiSong].filter(coGiaTri).join('  ·  '),
    coTen,
  );
  nut.setAttribute('data-ma', muc.id);
  return nut;
}

function veDongCapDaXoa(muc) {
  const ten = muc.partnerIds.map(tenTrongCay).filter(coGiaTri);
  const soCon = muc.childIds.length;

  const nut = veDongTrong(
    muc.id,
    moTaCapDaXoa(ten),
    [muc.id, soCon > 0 ? soCon + ' con' : 'chưa có con'].join('  ·  '),
    ten.length > 0,
  );
  nut.setAttribute('data-cap', muc.id);
  return nut;
}

function moTaCapDaXoa(ten) {
  if (ten.length === 0) return 'Cặp không còn ai đứng tên';
  if (ten.length === 1) return 'Cặp của ' + ten[0];
  return ten.join('  ↔  ');
}

function veDongTrong(ma, hangTren, hangDuoi, coTen) {
  const dangChon = daChon.has(ma);

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.setAttribute('aria-pressed', dangChon ? 'true' : 'false');
  nut.style.cssText =
    'display:flex;align-items:center;gap:9px;width:100%;text-align:left;' +
    'padding:10px 8px;border:none;border-bottom:1px solid var(--sd-vien-nhat,#f0ece5);' +
    'font-family:inherit;color:inherit;cursor:pointer;touch-action:manipulation;' +
    'background:' + (dangChon ? 'var(--sd-nen-nhat,#f5f1ea)' : 'none');

  const khoi = document.createElement('div');
  khoi.style.cssText = 'flex:1 1 auto;min-width:0';

  const t = document.createElement('div');
  t.textContent = hangTren;
  t.style.cssText = 'font-size:15px;font-weight:600;' +
    (coTen ? '' : 'color:var(--sd-chu-phu,#8a8078);font-style:italic');

  const d = document.createElement('div');
  d.textContent = hangDuoi;
  d.style.cssText = 'margin-top:2px;font-size:12px;color:var(--sd-chu-phu,#8a8078)';

  khoi.append(t, d);
  nut.append(oDanhDau(dangChon), khoi);

  nut.addEventListener('click', () => {
    if (dangChon) daChon.delete(ma);
    else          daChon.add(ma);
    veLaiDanhSach();
  });
  return nut;
}

function tenTrongCay(personId) {
  const ds = (state.tree && Array.isArray(state.tree.persons)) ? state.tree.persons : [];
  const p = ds.find((x) => x && x.id === personId);
  if (!p) return personId;
  const ten = fullName(p);
  return coGiaTri(ten) ? ten : personId;
}

function veMotDong(muc) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.setAttribute('data-ma', muc.id);
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 8px;background:none;' +
    'border:none;border-bottom:1px solid var(--sd-vien-nhat,#f0ece5);font-family:inherit;color:inherit;' +
    'cursor:pointer;touch-action:manipulation';

  const hang1 = document.createElement('div');
  hang1.style.cssText = 'display:flex;gap:10px;align-items:baseline';

  const coTen = muc.ten !== '';
  const ten = document.createElement('span');
  ten.textContent = coTen ? muc.ten : '(chưa có tên)';
  ten.style.cssText =
    'flex:1 1 auto;font-size:15px;font-weight:600;' +
    (coTen ? '' : 'color:var(--sd-chu-phu,#8a8078);font-style:italic');
  hang1.append(ten);

  if (muc.doiSong !== '') {
    const doi = document.createElement('span');
    doi.textContent = muc.doiSong;
    doi.style.cssText = 'flex:0 0 auto;font-size:13px;color:var(--sd-chu-phu,#8a8078)';
    hang1.append(doi);
  }

  const manh = [muc.id];
  if (muc.khop === 'tenKhac' && muc.tenKhac) manh.push('tên khác: ' + muc.tenKhac);
  if (chuaNoiVoiAi(muc.id)) manh.push('chưa nối với ai');

  const hang2 = document.createElement('div');
  hang2.textContent = manh.join('  ·  ');
  hang2.style.cssText = 'margin-top:2px;font-size:12px;color:var(--sd-chu-phu,#8a8078)';

  nut.append(hang1, hang2);
  nut.addEventListener('click', () => chonMotNguoi(muc.id));
  return nut;
}

function chuaNoiVoiAi(personId) {
  const idx = state.index;
  if (!idx || !idx.personById.has(personId)) return false;
  const capDoi = idx.unionsAsPartner.get(personId) || [];
  const laCon  = idx.unionsAsChild.get(personId)   || [];
  return capDoi.length === 0 && laCon.length === 0;
}

function moDongDuyNhat() {
  if (!khoiDong) return;
  const cacDong = khoiDong.querySelectorAll('button[data-ma]');
  if (cacDong.length !== 1) return;
  chonMotNguoi(cacDong[0].getAttribute('data-ma'));
}

function chonMotNguoi(personId) {
  if (!personId) return;
  if (xuLyNgoai.onXemHoSo) { xuLyNgoai.onXemHoSo(personId); return; }
  if (xuLyNgoai.onChonNguoi) xuLyNgoai.onChonNguoi(personId);
}

function loiNhan(tieuDe, giaiThich) {
  const hop = document.createElement('div');
  hop.style.cssText = 'padding:18px 4px;line-height:1.55';

  const h = document.createElement('div');
  h.textContent = tieuDe;
  h.style.cssText = 'font-size:14px;font-weight:600;margin-bottom:4px';

  const p = document.createElement('div');
  p.textContent = giaiThich;
  p.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078)';

  hop.append(h, p);
  return hop;
}
