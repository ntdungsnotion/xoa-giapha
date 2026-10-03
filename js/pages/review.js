import { state } from '../state.js';
import { validateAll } from '../domains/validate.js';
import { timCapTrung } from '../domains/union.js';
import { fullName, coGiaTri } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

const LOI_NHAC_XEM =
  'Bấm một dòng để mở hồ sơ của người có vấn đề — sửa hay xoá đều làm được ' +
  'ngay ở đó.';
const LOI_NHAC_CHON =
  'Đánh dấu những dòng muốn dọn, rồi cho cả nắm vào thùng rác. Chưa mất gì — ' +
  'lấy lại được từ thùng rác bất cứ lúc nào.';

let lopPhu      = null;
let khoiTomTat  = null;
let khoiDong    = null;
let khoiChan    = null;
let xuLyNgoai   = {};
let ngheBanPhim = null;

let dangChonRac = false;

let daChon = new Set();

let banTrung = new Map();

export function openReview(xuLy = {}) {
  closeReview();
  xuLyNgoai   = xuLy || {};
  dangChonRac = false;
  daChon      = new Set();

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-ra-soat';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(420, 680) + ';' +
    'height:' + caoHop(82) + ';display:flex;flex-direction:column;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28)';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Rà soát gia phả';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600;flex:0 0 auto';

  const nhac = document.createElement('div');
  nhac.id = 'giapha-ra-soat-nhac';
  nhac.textContent = LOI_NHAC_XEM;
  nhac.style.cssText =
    'font-size:13px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:4px;flex:0 0 auto';

  khoiTomTat = document.createElement('div');
  khoiTomTat.style.cssText =
    'margin-top:12px;flex:0 0 auto;font-size:13px;line-height:1.6;color:var(--sd-chu-vua,#5a534c);' +
    'background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;padding:10px 12px';

  khoiDong = document.createElement('div');
  khoiDong.style.cssText = 'flex:1 1 auto;overflow-y:auto;margin-top:10px';

  khoiChan = veChan();
  hop.append(tieuDe, nhac, khoiTomTat, khoiDong, khoiChan);
  lopPhu.append(hop);

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeReview(); });
  document.body.append(lopPhu);

  ngheBanPhim = (e) => { if (e.key === 'Escape') closeReview(); };
  document.addEventListener('keydown', ngheBanPhim);

  chayRaSoat();
}

export function closeReview() {
  if (ngheBanPhim) document.removeEventListener('keydown', ngheBanPhim);
  ngheBanPhim = null;
  if (lopPhu) lopPhu.remove();
  lopPhu      = null;
  khoiTomTat  = null;
  khoiDong    = null;
  khoiChan    = null;
  xuLyNgoai   = {};
  dangChonRac = false;
  daChon      = new Set();
}

export function dangMoReview() {
  return lopPhu !== null;
}

function chayRaSoat() {
  if (!khoiDong) return;
  khoiDong.innerHTML = '';

  if (!state.tree || !state.index) {
    khoiTomTat.textContent = 'Chưa mở được gia phả.';
    khoiDong.append(loiNhan('Chưa có dữ liệu để rà.',
                            'Đóng màn hình này rồi thử tải lại trang.'));
    return;
  }

  const kq = validateAll(state.tree, state.index, 'tree');
  khoiTomTat.textContent = moTaBaConSo(kq.counts);

  const moCoi   = kq.warnings.filter((m) => m.check === 'checkOrphanNode');
  const capThua = kq.warnings.filter((m) => m.check === 'checkUnionPointless');
  const capTrung = kq.warnings.filter((m) => m.check === 'checkDuplicateUnion');

  banTrung = new Map();
  if (capTrung.length > 0) {
    for (const x of timCapTrung(state.tree)) {
      if (!banTrung.has(x.unionA)) banTrung.set(x.unionA, x.unionB);
      if (!banTrung.has(x.unionB)) banTrung.set(x.unionB, x.unionA);
    }
  }
  const conLai  = kq.warnings.filter((m) => m.check !== 'checkOrphanNode' &&
                                            m.check !== 'checkUnionPointless' &&
                                            m.check !== 'checkDuplicateUnion');

  if (kq.errors.length === 0 && moCoi.length === 0 &&
      capThua.length === 0 && capTrung.length === 0 && conLai.length === 0) {
    khoiDong.append(loiNhan(
      'Không tìm thấy chỗ nào đáng ngờ.',
      'Những phép không rà được là do bản ghi chưa có đủ mốc ngày tháng — đó ' +
      'không phải lỗi, và con số ấy nằm ngay ở dòng trên.'));
    veLaiChan();
    return;
  }

  if (dangChonRac) {
    const rac = moCoi.concat(capThua);
    if (rac.length === 0) {
      khoiDong.append(loiNhan(
        'Không có rác nào để gom.',
        'Hai nhóm "Chưa nối với ai" và "Cặp thừa" đều trống. Bấm Xong để quay ' +
        'lại xem cả bản rà soát.'));
      veLaiChan();
      return;
    }
    khoiDong.append(veDongChonTatCa(rac));
    if (moCoi.length > 0) {
      khoiDong.append(nhanNhom('Chưa nối với ai (' + moCoi.length + ')'));
      for (const muc of moCoi) khoiDong.append(veMotDong(muc));
    }
    if (capThua.length > 0) {
      khoiDong.append(nhanNhom('Cặp thừa (' + capThua.length + ')'));
      for (const muc of capThua) khoiDong.append(veMotDong(muc));
    }
    veLaiChan();
    return;
  }

  if (moCoi.length > 0) {
    khoiDong.append(nhanNhom('Chưa nối với ai (' + moCoi.length + ')'));
    khoiDong.append(loiNhanNhom(
      'Bản ghi có thật nhưng không sơ đồ nào vẽ ra. Mở hồ sơ rồi dùng ' +
      '"Kết nối", hoặc xoá hẳn nếu là người thêm nhầm.'));
    for (const muc of moCoi) khoiDong.append(veMotDong(muc));
  }

  if (capThua.length > 0) {
    khoiDong.append(nhanNhom('Cặp thừa (' + capThua.length + ')'));
    khoiDong.append(loiNhanNhom(
      'Cặp không còn ai đứng tên, hoặc chỉ còn một người và không có con — nó ' +
      'không nói lên điều gì và không hiện ở đâu cả. Gỡ nối qua app không bao ' +
      'giờ để lại thứ này; sửa tay file JSON thì có.'));
    for (const muc of capThua) khoiDong.append(veMotDong(muc));
  }

  if (capTrung.length > 0) {
    khoiDong.append(nhanNhom('Cặp trùng (' + capTrung.length + ')'));
    khoiDong.append(loiNhanNhom(
      'Hai bản ghi hôn nhân cùng chỉ về một đôi — thường do một lần thêm cha ' +
      'hoặc mẹ mới quên nối vào cặp đã có sẵn. Bấm để gộp: cặp cũ hơn ở lại và ' +
      'nhận hết con cái, cặp kia vào thùng rác. Không mất gì.'));
    for (const muc of capTrung) khoiDong.append(veMotDong(muc, true));
  }

  if (kq.errors.length > 0) {
    khoiDong.append(nhanNhom('Phải sửa (' + kq.errors.length + ')'));
    for (const muc of kq.errors) khoiDong.append(veMotDong(muc));
  }

  if (conLai.length > 0) {
    khoiDong.append(nhanNhom('Đáng ngờ (' + conLai.length + ')'));
    khoiDong.append(loiNhanNhom(
      'Gia phả cũ có mâu thuẫn thật, nên những dòng này không chặn gì cả — ' +
      'chúng chỉ nhắc để người biết chuyện xem lại.'));
    for (const muc of conLai) khoiDong.append(veMotDong(muc));
  }

  veLaiChan();
}

function maCuaDong(muc) {
  return muc.personId || muc.unionId || '';
}

function veDongChonTatCa(rac) {
  const ma  = rac.map(maCuaDong).filter(Boolean);
  const het = ma.length > 0 && ma.every((id) => daChon.has(id));

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
    if (het) daChon.clear();
    else for (const id of ma) daChon.add(id);
    chayRaSoat();
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

function moTaBaConSo(counts) {
  const c = counts || {};
  return [
    (c.total || 0) + ' phép rà',
    (c.ok || 0) + ' đạt',
    (c.skip || 0) + ' chưa đủ dữ liệu để kiểm',
  ].join('  ·  ');
}

function veMotDong(muc, laCapTrung) {
  const laCap = !muc.personId && !!muc.unionId;
  const ban   = laCapTrung ? banTrung.get(muc.unionId) : null;
  const gopDuoc = !!(ban && xuLyNgoai.onGopCap);
  const ma    = muc.personId || muc.unionId || '';
  const chon  = dangChonRac && daChon.has(ma);

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'display:flex;align-items:flex-start;gap:9px;width:100%;text-align:left;' +
    'padding:10px 8px;border:none;border-bottom:1px solid var(--sd-vien-nhat,#f0ece5);' +
    'font-family:inherit;color:inherit;cursor:pointer;touch-action:manipulation;' +
    'background:' + (chon ? 'var(--sd-nen-nhat,#f5f1ea)' : 'none');
  if (ma) nut.setAttribute('data-ma', ma);
  nut.dataset.phep = muc.check || '';
  if (dangChonRac) nut.setAttribute('aria-pressed', chon ? 'true' : 'false');

  const coTen = !laCap && coGiaTri(tenNguoi(muc.personId));

  const khoi = document.createElement('div');
  khoi.style.cssText = 'flex:1 1 auto;min-width:0';

  const t = document.createElement('div');
  t.textContent = laCap
    ? 'Cặp ' + muc.unionId
    : (coTen ? tenNguoi(muc.personId) : '(chưa có tên)') +
      (muc.personId ? '  ·  ' + muc.personId : '');
  t.style.cssText = 'font-size:15px;font-weight:600;' +
    (laCap || coTen ? '' : 'color:var(--sd-chu-phu,#8a8078);font-style:italic');

  const d = document.createElement('div');
  d.textContent = boTienToTen(muc.message, ma);
  d.style.cssText = 'margin-top:2px;font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078)';

  khoi.append(t, d);

  if (!dangChonRac) {
    const v = document.createElement('div');
    v.textContent = gopDuoc ? 'Bấm để gộp với cặp ' + ban
                  : laCap   ? 'Bấm để mở thẻ gia đình'
                            : 'Bấm để mở hồ sơ';
    v.style.cssText = 'margin-top:4px;font-size:12px;color:var(--sd-chu-mo,#a89a86)';
    khoi.append(v);
  }

  if (dangChonRac) nut.append(oDanhDau(chon), khoi);
  else             nut.append(khoi);

  nut.addEventListener('click', () => {
    if (dangChonRac) {
      if (!ma) return;
      if (chon) daChon.delete(ma);
      else      daChon.add(ma);
      chayRaSoat();
      return;
    }
    if (!ma) return;
    const gop = xuLyNgoai.onGopCap;
    if (gopDuoc && gop) { closeReview(); gop(ma, ban); return; }
    const chay = laCap ? xuLyNgoai.onXemCap : xuLyNgoai.onXemHoSo;
    if (!chay) return;
    closeReview();
    chay(ma);
  });
  return nut;
}

function boTienToTen(loi, ma) {
  const cau = String(loi || '');
  if (!ma) return cau;
  const trongNgoac = cau.indexOf('(' + ma + ')');
  const vt  = trongNgoac !== -1 ? trongNgoac : cau.indexOf(ma);
  if (vt === -1) return cau;
  const dai = trongNgoac !== -1 ? ma.length + 2 : ma.length;
  const conLai = cau.slice(vt + dai).replace(/^[\s:,;–—-]+/, '');
  return conLai === '' ? cau : hoaChuDau(conLai);
}

function hoaChuDau(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function tenNguoi(personId) {
  if (!personId || !state.index || !state.index.personById) return '';
  const p = state.index.personById.get(personId);
  return p ? fullName(p) : '';
}

function nhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'padding:12px 4px 6px;font-size:12px;font-weight:600;letter-spacing:.04em;' +
    'color:var(--sd-chu-phu,#8a8078)';
  return d;
}

function loiNhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'padding:0 4px 8px;font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078)';
  return d;
}

function loiNhan(dong1, dong2) {
  const hop = document.createElement('div');
  hop.style.cssText = 'padding:18px 6px;text-align:center';

  const a = document.createElement('div');
  a.textContent = dong1;
  a.style.cssText = 'font-size:14px;font-weight:600';

  const b = document.createElement('div');
  b.textContent = dong2;
  b.style.cssText = 'margin-top:6px;font-size:12px;line-height:1.6;color:var(--sd-chu-phu,#8a8078)';

  hop.append(a, b);
  return hop;
}

function veChan() {
  const chan = document.createElement('div');
  chan.style.cssText =
    'display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;flex:0 0 auto;' +
    'justify-content:center';
  return chan;
}

function veLaiChan() {
  if (!khoiChan) return;
  khoiChan.innerHTML = '';

  const nhac = document.getElementById('giapha-ra-soat-nhac');
  if (nhac) nhac.textContent = dangChonRac ? LOI_NHAC_CHON : LOI_NHAC_XEM;

  if (dangChonRac) {
    const gom = nutChan('Cho vào thùng rác', () => gomRacDaChon(), true);
    gom.dataset.viec = 'gom-rac';
    gom.textContent = daChon.size > 0
      ? 'Cho vào thùng rác (' + daChon.size + ')'
      : 'Cho vào thùng rác';
    gom.disabled = daChon.size === 0;
    gom.style.opacity = daChon.size === 0 ? '.4' : '1';
    gom.style.cursor = daChon.size === 0 ? 'default' : 'pointer';

    const xong = nutChan('Xong', () => {
      dangChonRac = false;
      daChon = new Set();
      chayRaSoat();
    });
    xong.dataset.viec = 'xong-chon';
    khoiChan.append(gom, xong);
    return;
  }

  const raLai = nutChan('Rà lại', () => chayRaSoat());
  raLai.dataset.viec = 'ra-lai';
  khoiChan.append(raLai);

  if (xuLyNgoai.onGomRac && coRacDeGom()) {
    const chon = nutChan('Chọn để dọn', () => {
      dangChonRac = true;
      daChon = new Set();
      chayRaSoat();
    });
    chon.dataset.viec = 'chon-de-don';
    khoiChan.append(chon);
  }

  khoiChan.append(nutChan('Đóng', () => closeReview()));
}

function coRacDeGom() {
  if (!khoiDong) return false;
  return [...khoiDong.querySelectorAll('button[data-phep]')].some(
    (b) => b.dataset.phep === 'checkOrphanNode' ||
           b.dataset.phep === 'checkUnionPointless');
}

function gomRacDaChon() {
  if (daChon.size === 0) return;
  const ds = [...daChon];
  const chay = xuLyNgoai.onGomRac;
  if (!chay) return;
  closeReview();
  chay(ds);
}

function nutChan(chu, chay, nhanManh) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText =
    'flex:1 1 0;height:42px;font-size:14px;font-family:inherit;' +
    'max-width:' + RONG_NUT_TOI_DA + ';' +
    'border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (nhanManh
      ? 'color:var(--sd-nut-chu,#fffdf9);background:var(--sd-nut,#2a2622);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
      : 'color:inherit;background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien,#e6e0d8)');
  nut.addEventListener('click', chay);
  return nut;
}
