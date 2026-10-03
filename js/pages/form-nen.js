import { state } from '../state.js';
import { getParentUnions, getPartnerUnions, rankCua } from '../domains/union.js';
import { luuCay, suaDuoc } from '../services/repo.js';
import { fullName, coGiaTri } from '../utils/text.js';
import { formatDate, parseLooseDate } from '../utils/date.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

const N = {
  lopPhu:       null,
  khoiKetQua:   null,
  nutLuu:       null,
  xuLyNgoai:    {},
  dangLuu:      false,
  daXemCanhBao: false,
  cheDo:        'sua',
};

const o = {};

let thuBacNhap = [];
function xoaThuBacNhap() { thuBacNhap = []; }

export function dangKyDonDep(fn) {
  if (!dangKyDonDep.ds) dangKyDonDep.ds = [];
  if (!dangKyDonDep.ds.includes(fn)) dangKyDonDep.ds.push(fn);
}

function closePersonForm() {
  if (N.lopPhu) N.lopPhu.remove();
  N.lopPhu       = null;
  for (const k of Object.keys(o)) delete o[k];
  N.khoiKetQua   = null;
  N.nutLuu       = null;
  N.dangLuu      = false;
  N.daXemCanhBao = false;
  N.cheDo        = 'sua';
  thuBacNhap     = [];
  for (const fn of (dangKyDonDep.ds || [])) fn();
}

function canTroLuu() {
  if (!suaDuoc()) {
    return 'Bạn chỉ có quyền xem gia phả nên chưa lưu được. Xem và sửa thử thì ' +
           'vẫn được, chỉ là bấm Lưu sẽ bị máy chủ từ chối. Cần sửa thật thì ' +
           'nhờ người quản lý gia phả cấp quyền cho tài khoản của bạn.';
  }
  if (state.daLocNguoiConSong) {
    return 'Bản gia phả trong máy đang bị ẩn bớt chi tiết người còn sống, nên ' +
           'không được phép lưu đè lên bản gốc.';
  }
  return null;
}

function keTenPartner(unionId) {
  const u = state.index && state.index.unionById.get(unionId);
  const ds = (Array.isArray(u && u.partners) ? u.partners : [])
    .filter((id) => id && state.index.personById.has(id))
    .map(tenNguoi);
  return ds.length > 0 ? ds.join('  và  ') : '(cặp chưa có ai)';
}

function tenNguoi(personId) {
  const p = state.index && state.index.personById.get(personId);
  const ten = p ? fullName(p) : '';
  return coGiaTri(ten) ? ten : '(chưa có tên)';
}

function veNhan(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:16px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078)';
  return d;
}

function tenBanDoiTrongCap(index, u, personId) {
  const ds = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== personId && index.personById.has(id))
    .map(tenNguoi);
  return ds.length > 0 ? ds.join('  và  ') : '(chưa có tên người kia)';
}

function oChu(khoa, nhan, giaTri, goiY, phan) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px;' + (phan ? 'flex:' + phan + ' 1 0;min-width:0' : '');

  const input = document.createElement('input');
  input.type = 'text';
  input.value = coGiaTri(giaTri) ? String(giaTri) : '';
  input.placeholder = goiY || '';
  input.setAttribute('aria-label', nhan);
  input.style.cssText = KIEU_O;
  o[khoa] = input;

  boc.append(input);
  if (!phan) {
    boc.prepend(veNhanO(nhan));
  }
  return boc;
}

function oNhieuDong(khoa, giaTri, goiY) {
  const t = document.createElement('textarea');
  t.value = coGiaTri(giaTri) ? String(giaTri) : '';
  t.placeholder = goiY || '';
  t.rows = 4;
  t.style.cssText = KIEU_O + 'resize:vertical;line-height:1.5';
  o[khoa] = t;
  return t;
}

function veNhanO(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:11px;color:var(--sd-chu-mo,#b3aaa0);margin-bottom:3px';
  return d;
}

function oNgay(khoa, khoiNgay, nhanRieng) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const nhan = nhanRieng || (khoa === 'birth' ? 'Ngày sinh' : 'Ngày mất');

  const cu = khoiNgayCua(khoiNgay);
  const input = document.createElement('input');
  input.type = 'text';
  input.value = coGiaTri(cu.raw) ? String(cu.raw) : '';
  input.placeholder = '1948  ·  12/3/1948  ·  khoảng 1948';
  input.setAttribute('aria-label', nhan);
  input.style.cssText = KIEU_O;
  o[khoa] = input;

  const doc = document.createElement('div');
  doc.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';

  const capNhat = () => { doc.textContent = mayDocDuocGi(input.value); };
  input.addEventListener('input', capNhat);
  capNhat();

  boc.append(veNhanO(nhan), input, doc);
  return boc;
}

function mayDocDuocGi(chu) {
  const s = typeof chu === 'string' ? chu.trim() : '';
  if (s === '') return '';

  const kq = parseLooseDate(s);
  if (!kq.iso) {
    return 'Máy chưa đọc ra năm nào trong chữ này. Vẫn lưu được, và vẫn hiện ' +
           'đúng chữ bạn gõ — chỉ là app không dùng nó để tính tuổi được.';
  }
  const dep = formatDate({ iso: kq.iso, raw: '' });
  if (kq.confident) return 'Máy đọc được: ' + dep + '.';
  return 'Máy đoán là ' + dep + ', nhưng không chắc. Chữ bạn gõ vẫn giữ nguyên.';
}

function veChan(chayLuu, luuDuoc, chuNut = 'Lưu') {
  const chan = document.createElement('div');
  chan.style.cssText =
    'display:flex;gap:8px;margin-top:18px;position:sticky;bottom:-18px;' +
    'padding:10px 0;background:var(--sd-giay,#fffdf9);justify-content:center';

  N.nutLuu = document.createElement('button');
  N.nutLuu.type = 'button';
  N.nutLuu.textContent = chuNut;
  N.nutLuu.disabled = !luuDuoc;
  N.nutLuu.style.cssText = KIEU_NUT_CHAN +
    'flex:1 1 auto;max-width:' + RONG_NUT_TOI_DA + ';' +
    (luuDuoc
      ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
      : 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);opacity:.45;cursor:not-allowed');
  if (luuDuoc) {
    N.nutLuu.addEventListener('click', () => chayLuu());
  }

  const huy = document.createElement('button');
  huy.type = 'button';
  huy.textContent = 'Huỷ';
  huy.style.cssText = KIEU_NUT_CHAN +
    'flex:0 0 auto;background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)';
  huy.addEventListener('click', () => closePersonForm());

  chan.append(N.nutLuu, huy);
  return chan;
}

function gopRaSoat(a, b) {
  const ra = {
    canSave: a.canSave && b.canSave,
    errors: [], warnings: [], skipped: [],
    counts: { total: 0, ok: 0, error: 0, warning: 0, skip: 0 },
  };

  for (const ten of ['errors', 'warnings', 'skipped']) {
    const daThay = new Set();
    for (const muc of a[ten].concat(b[ten])) {
      const khoa = muc.check + '|' + muc.message;
      if (daThay.has(khoa)) continue;
      daThay.add(khoa);
      ra[ten].push(muc);
    }
  }
  for (const khoa of Object.keys(ra.counts)) {
    ra.counts[khoa] = (a.counts[khoa] || 0) + (b.counts[khoa] || 0);
  }
  return ra;
}

function nutChon(chu, chinh, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText = KIEU_NUT_CHAN + 'width:100%;text-align:center;' +
    (chinh
      ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
      : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
  nut.addEventListener('click', chay);
  return nut;
}

function tenTrongCay(cay, personId) {
  const p = (cay && Array.isArray(cay.persons))
    ? cay.persons.find((x) => x && x.id === personId) : null;
  const ten = p ? fullName(p) : '';
  return coGiaTri(ten) ? ten : personId;
}

function docO(khoa) {
  const el = o[khoa];
  if (!el) return '';
  if (typeof el.doc === 'function') return el.doc();
  return typeof el.value === 'string' ? el.value : '';
}

function hienNhan(chu, laLoi, dong) {
  if (!N.khoiKetQua) return;
  N.khoiKetQua.innerHTML = '';

  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:14px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:var(--sd-do,#8a3a2a);background:var(--sd-do-nen,#fbf0ec);border:1px solid var(--sd-do-vien,#f0d8d0)'
      : 'color:var(--sd-chu-phu,#8a8078);background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4)');
  N.khoiKetQua.append(d);

  for (const chuDong of (dong || [])) {
    const m = document.createElement('div');
    m.textContent = '• ' + chuDong;
    m.style.cssText =
      'margin-top:6px;padding:7px 10px;font-size:12px;line-height:1.5;' +
      'border-radius:8px;background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4);color:var(--sd-chu-vua,#5c554e)';
    N.khoiKetQua.append(m);
  }
}

function khoiNgayCua(khoi) {
  if (!khoi || typeof khoi !== 'object') return { iso: null, raw: '', place: '' };
  return khoi;
}

const KIEU_O =
  'width:100%;box-sizing:border-box;padding:9px 10px;font-size:15px;' +
  'font-family:inherit;color:var(--sd-chu,#2a2622);background:var(--sd-giay,#fff);border:1px solid var(--sd-vien,#e6e0d8);' +
  'border-radius:8px;outline-color:var(--sd-vang,#8a6a3a);';

const KIEU_NUT_CHON =
  'flex:1 1 0;min-height:40px;padding:0 8px;font-size:14px;font-family:inherit;' +
  'border-radius:9px;cursor:pointer;touch-action:manipulation;';

const KIEU_NUT_CHAN =
  'min-height:44px;padding:0 16px;font-size:14px;font-family:inherit;' +
  'border-radius:9px;cursor:pointer;touch-action:manipulation;';

const KIEU_LOP_PHU =
  'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:35;' +
  'display:flex;align-items:center;justify-content:center;' +
  'padding:' + leLopPhu() + ';' +
  'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

const KIEU_HOP =
  'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
  'width:100%;max-width:' + rongHop(380, 640) + ';' +
  'max-height:' + caoHop(86) + ';overflow:auto;' +
  'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
  '-webkit-overflow-scrolling:touch';

async function ghiMotNguoi(nguoiMoi, moTa) {
  try {
    return await luuCay((cay) => {
      const ds = Array.isArray(cay.persons) ? cay.persons : [];
      const i = ds.findIndex((p) => p && p.id === nguoiMoi.id);
      if (i < 0) {
        throw new Error('Không còn ai mang mã ' + nguoiMoi.id +
                        ' trong bản trên Drive. Tải lại trang rồi làm lại.');
      }
      ds[i] = JSON.parse(JSON.stringify(nguoiMoi));
    }, moTa);
  } catch (e) {
    return { ok: false, loi: e && e.message ? e.message : String(e) };
  }
}

function hienLoiGhi(ketQua, hienTrang) {
  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa đúng bản ghi này trong lúc hộp này đang mở — ' +
             'có thể từ một gia phả khác cùng chứa người ấy — nên app KHÔNG ' +
             'ghi đè lên bản của họ. ' + hienTrang + ' Tải lại trang rồi làm lại.', true);
    return;
  }
  const cua = (ketQua && ketQua.loi) || 'Máy chủ không nói rõ vì sao.';
  hienNhan(hienTrang + ' ' + cua, true);
}

function nutChanXoa(chu, nguyHiem, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText = KIEU_NUT_CHAN + 'flex:1 1 45%;text-align:center;' +
    (nguyHiem
      ? 'background:var(--sd-do-dac,#8a3a2a);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-do,#8a3a2a);font-weight:600'
      : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
  nut.addEventListener('click', chay);
  return nut;
}

function moHopTrang(che, xuLy, tieuDe, phu) {
  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = che;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-hop-viec';
  hop.style.cssText = KIEU_HOP;

  const t = document.createElement('div');
  t.textContent = tieuDe;
  t.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(t);

  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText =
      'font-size:12px;color:var(--sd-chu-mo,#b3aaa0);margin-top:3px;letter-spacing:.03em;line-height:1.45';
    hop.append(d);
  }

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  hop.append(chan);

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
  return chan;
}

function nutMuc(muc) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.muc = muc.ma || '';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 12px;font-family:inherit;' +
    'font-size:14px;border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (muc.nguyHiem
      ? 'color:var(--sd-do,#8a3a2a);border:1px solid var(--sd-do-vien,#f0d8d0);background:var(--sd-do-nen,#fbf0ec)'
      : 'color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8);background:var(--sd-giay,#fff)');

  const d1 = document.createElement('div');
  d1.textContent = muc.chu;
  nut.append(d1);

  if (coGiaTri(muc.phu)) {
    const d2 = document.createElement('div');
    d2.textContent = muc.phu;
    d2.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:2px;line-height:1.4';
    nut.append(d2);
  }

  nut.addEventListener('click', muc.chay);
  return nut;
}

function moHopChon(che, xuLy, c) {
  const chan = moHopTrang(che, xuLy, c.tieuDe, c.phu);
  hienNhan(c.cauMo, false, c.cacDong);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  for (const m of c.cacMuc) hang.append(nutMuc(m));
  N.khoiKetQua.append(hang);

  chan.append(nutChanXoa(c.chuHuy || 'Huỷ', false, () => closePersonForm()));
}

function gaiTruocChan(chan, cacEl) {
  const hop = chan && chan.parentElement;
  if (!hop) return;
  for (const el of cacEl) hop.insertBefore(el, chan);
}

function moHopBao(tieuDe, cau, laLoi, dong) {
  const chan = moHopTrang('chon', {}, tieuDe, '');
  hienNhan(cau, !!laLoi, dong);
  chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
}

function soPartner(u) {
  return (Array.isArray(u && u.partners) ? u.partners : []).filter(Boolean).length;
}

function moTaCap(u) {
  const soCon = (Array.isArray(u.children) ? u.children : []).length;
  return [soCon > 0 ? soCon + ' con' : 'chưa có con', u.id]
    .filter(coGiaTri).join('  ·  ');
}

function chonCap(vaiTro, mocId, xuLy, tiep, doiTacId = '') {
  const index = state.index;
  if (!index) return;

  let tatCa = (vaiTro === 'chaMe')
    ? getParentUnions(index, mocId)
    : getPartnerUnions(index, mocId);

  if (vaiTro === 'banDoi' && doiTacId) {
    const daCo = new Set(tatCa.map((u) => u.id));
    for (const u of getPartnerUnions(index, doiTacId)) {
      if (!daCo.has(u.id)) { daCo.add(u.id); tatCa = tatCa.concat([u]); }
    }
  }

  const nhanDuoc = (vaiTro === 'con') ? tatCa : tatCa.filter((u) => soPartner(u) < 2);

  if (tatCa.length === 0) { tiep(''); return; }
  if (vaiTro !== 'banDoi' && nhanDuoc.length === 1 && tatCa.length === 1) {
    tiep(nhanDuoc[0].id);
    return;
  }

  const cacMuc = nhanDuoc.map((u) => ({
    ma: u.id,
    chu: (vaiTro === 'chaMe' || vaiTro === 'banDoi')
      ? 'Đứng chung cặp với ' + keTenPartner(u.id)
      : 'Con của ' + keTenPartner(u.id),
    phu: moTaCap(u),
    chay: () => tiep(u.id),
  }));

  if (vaiTro === 'banDoi') {
    for (const m of cacMuc) {
      const u = nhanDuoc.find((x) => x.id === m.ma);
      const soCon = (u && Array.isArray(u.children)) ? u.children.length : 0;
      if (soCon > 0) {
        m.phu = m.phu + '  ·  ⚠ bước vào cặp này là nhận luôn ' + soCon +
                ' người con ấy làm con mình';
      }
    }
  }

  cacMuc.push({
    ma: 'moi',
    chu: vaiTro === 'chaMe' ? 'Tạo một cặp cha mẹ MỚI' : 'Tạo một cặp MỚI',
    phu: vaiTro === 'chaMe'
      ? 'Dùng khi đây là cha mẹ nuôi / kế, khác với cặp đã có ở trên.'
      : 'Dùng khi đây là một cuộc hôn nhân khác, không phải cặp đã có ở trên.',
    chay: () => tiep(''),
  });

  const dayRoi = tatCa.filter((u) => nhanDuoc.indexOf(u) < 0);
  const cacDong = dayRoi.map((u) =>
    'Cặp ' + u.id + ' (' + keTenPartner(u.id) + ') đã đủ hai người nên không ' +
    'nhận thêm được — trong gia phả này nhiều vợ / nhiều chồng là NHIỀU CẶP, ' +
    'không phải một cặp ba người.');

  moHopChon('chon', xuLy, {
    tieuDe: 'Nối vào cặp nào?',
    phu:    doiTacId
      ? tenNguoi(mocId) + '  ←→  ' + tenNguoi(doiTacId)
      : tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  nhanDuoc.length === 0
      ? (vaiTro === 'chaMe'
        ? tenNguoi(mocId) + ' đã có đủ cha mẹ trong gia phả, nên người này sẽ ' +
          'thành một cặp cha mẹ THỨ HAI — cha mẹ nuôi hoặc cha mẹ kế.'
        : tenNguoi(mocId) + ' đã có đủ vợ/chồng trong mọi cặp đang có, nên đây ' +
          'sẽ là một cuộc hôn nhân KHÁC.')
      : (vaiTro === 'chaMe'
        ? 'Cha mẹ của ' + tenNguoi(mocId) + ' được ghi theo CẶP. Chọn cặp:'
        : (vaiTro === 'banDoi'
          ? (doiTacId
            ? 'Hai người này đứng chung cặp nào? Cặp kể dưới đây là cặp của ' +
              'CẢ HAI phía, và cặp nào cũng còn đúng một chỗ trống.'
            : 'Chọn chỗ đứng cho người vợ / chồng này:')
          : 'Người con này thuộc về cặp nào của ' + tenNguoi(mocId) + '?')),
    cacDong,
    cacMuc,
  });
}

function khoiHoiThuBac(mocId, boQuaCapId) {
  const index = state.index;
  if (!index || !mocId || !index.personById.has(mocId)) return [];

  const dsCap = getPartnerUnions(index, mocId).filter((u) => u.id !== boQuaCapId);
  if (dsCap.length === 0) return [];

  const goiY = dsCap.length + 1;
  const ten  = tenNguoi(mocId);

  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.value = String(goiY);
  input.dataset.thuBacCua = mocId;
  input.setAttribute('aria-label', 'Đây là cặp thứ mấy của ' + ten + '?');
  input.style.cssText = KIEU_O;

  const nhac = document.createElement('div');
  nhac.textContent =
    '1 là vợ cả / chồng đầu, 2 là vợ thứ hai… tính riêng theo phía ' + ten +
    '. App điền sẵn ' + goiY + ' vì ' + ten + ' đang có ' + dsCap.length +
    ' cặp, nhưng SỬA ĐƯỢC: gia phả cũ chép thứ bậc theo lệ chứ không theo thứ ' +
    'tự nhập liệu, có nhà bà cưới sau vẫn là chính thất.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';

  const dsCu = document.createElement('div');
  dsCu.textContent = 'Đang có: ' + dsCap
    .map((u) => tenBanDoiTrongCap(index, u, mocId) +
                ' (thứ ' + rankCua(u, mocId) + ')')
    .join('  ·  ');
  dsCu.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:3px';

  thuBacNhap.push({ mocId, input });
  boc.append(input, nhac, dsCu);

  return [veNhan('Đây là cặp thứ mấy của ' + ten + '?'), boc];
}

function docThuBacNhap() {
  const ra = {};
  for (const m of thuBacNhap) {
    const n = Number(String(m.input.value || '').trim());
    if (Number.isFinite(n) && n > 1) ra[m.mocId] = Math.floor(n);
  }
  return ra;
}

function loiThuBacGoSai() {
  const ra = [];
  for (const m of thuBacNhap) {
    const chu = String(m.input.value || '').trim();
    const n   = Number(chu);
    if (chu !== '' && Number.isFinite(n) && n >= 1 && Math.floor(n) === n) continue;
    ra.push('Ô "đây là cặp thứ mấy của ' + tenNguoi(m.mocId) + '" đang mang "' +
            chu + '", không phải một số nguyên từ 1 trở lên. App sẽ ghi là ' +
            'thứ 1. Muốn con số khác thì sửa lại ô ấy rồi bấm lần nữa.');
  }
  return ra;
}

const TEN_QUAN_HE = { parent: 'cha / mẹ', spouse: 'vợ / chồng', child: 'con' };

async function ghiBanGhi(nguoiThem, cacUnion, moTa, anh) {
  try {
    return await luuCay((cay) => {
      if (!Array.isArray(cay.persons)) cay.persons = [];
      if (!Array.isArray(cay.unions))  cay.unions  = [];

      if (nguoiThem) {
        if (cay.persons.some((p) => p && p.id === nguoiThem.id)) {
          throw new Error('Mã ' + nguoiThem.id + ' vừa được dùng cho một người ' +
                          'khác. Tải lại trang rồi làm lại.');
        }
        cay.persons.push(JSON.parse(JSON.stringify(nguoiThem)));
      }

      for (const u of (cacUnion || [])) {
        if (!u || !u.id) continue;
        const i = cay.unions.findIndex((x) => x && x.id === u.id);
        if (i >= 0) cay.unions[i] = JSON.parse(JSON.stringify(u));
        else        cay.unions.push(JSON.parse(JSON.stringify(u)));
      }

      if (anh) {
        if (!Array.isArray(cay.media)) cay.media = [];
        for (const m of anh.themVao) {
          if (cay.media.some((x) => x && x.id === m.id)) {
            throw new Error('Mã ảnh ' + m.id + ' vừa được dùng cho một tấm khác. ' +
                            'Tải lại trang rồi gắn ảnh lại.');
          }
          cay.media.push(JSON.parse(JSON.stringify(m)));
        }
        for (const m of anh.goRa) {
          const k = cay.media.findIndex((x) => x && x.id === m.id);
          if (k >= 0) cay.media[k] = JSON.parse(JSON.stringify(m));
        }
      }
    }, moTa);
  } catch (e) {
    return { ok: false, loi: e && e.message ? e.message : String(e) };
  }
}

function thuTuCon(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

function maTrangThaiCap(u) {
  return u && u.status === 'divorced' ? 'divorced' : ((u && u.status) || 'married');
}

function nutChanDam(chu, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText = KIEU_NUT_CHAN + 'flex:1 1 45%;text-align:center;' +
    'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600';
  nut.addEventListener('click', chay);
  return nut;
}

function timNguoiTrongCay(personId) {
  const ds = (state.tree && Array.isArray(state.tree.persons)) ? state.tree.persons : [];
  return ds.find((p) => p && p.id === personId) || null;
}

function timCapTrongCay(unionId) {
  const ds = (state.tree && Array.isArray(state.tree.unions)) ? state.tree.unions : [];
  return ds.find((u) => u && u.id === unionId) || null;
}

export { N, o, KIEU_O, KIEU_NUT_CHON, KIEU_NUT_CHAN, KIEU_LOP_PHU, KIEU_HOP,
         TEN_QUAN_HE,
         closePersonForm, canTroLuu, moHopTrang, moHopChon, moHopBao, hienNhan, hienLoiGhi,
         nutChon, nutChanXoa, nutChanDam, nutMuc, gaiTruocChan, veNhan, veNhanO,
         oChu, oNhieuDong, oNgay, khoiNgayCua, docO, mayDocDuocGi, veChan, gopRaSoat,
         ghiBanGhi, ghiMotNguoi, tenNguoi, tenTrongCay, keTenPartner,
         tenBanDoiTrongCap, soPartner, moTaCap, thuTuCon, maTrangThaiCap,
         chonCap, khoiHoiThuBac, docThuBacNhap, loiThuBacGoSai, xoaThuBacNhap,
         timNguoiTrongCay, timCapTrongCay };
