import { state } from '../state.js';
import { coKetNoi as coMayChu, layDanhSachGiaPha, chonGiaPha } from '../services/sb.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

let lopPhu   = null;
let khoiDs   = null;
let dangChay = false;

export function dangMoChonGiaPha() {
  return !!lopPhu;
}

export function closeChonGiaPha() {
  if (lopPhu) lopPhu.remove();
  lopPhu   = null;
  khoiDs   = null;
  dangChay = false;
}

export function openChonGiaPha() {
  closeChonGiaPha();

  lopPhu = document.createElement('div');
  lopPhu.id = 'giapha-lop-chon-gia-pha';
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-chon-gia-pha';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  hop.append(tieuDeHop('Chọn gia phả'));

  const phu = document.createElement('div');
  phu.textContent =
    'Bạn mở được những cây dưới đây. Chọn cây nào là việc của riêng tài khoản ' +
    'bạn — người khác trong họ vẫn mở cây của họ.';
  phu.style.cssText =
    'font-size:13px;line-height:1.55;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  hop.append(phu);

  khoiDs = document.createElement('div');
  khoiDs.style.cssText = 'margin-top:16px';
  hop.append(khoiDs);

  hop.append(nut('Đóng', false, true, () => closeChonGiaPha()));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeChonGiaPha(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  if (coMayChu()) {
    napDanhSach();
  } else {
    khoiDs.append(nhan('Các gia phả bạn mở được'));
    khoiDs.append(loiNhan(
      'Chưa nối được máy chủ nên chưa đọc được danh sách gia phả. Hãy mở gia ' +
      'phả bằng đúng đường link thường dùng.', false));
  }
}

async function napDanhSach() {
  const khoi = khoiDs;
  if (!khoi) return;
  khoi.innerHTML = '';
  khoi.append(nhan('Các gia phả bạn mở được'));
  khoi.append(doanChu('Đang tải danh sách gia phả…'));

  let kq;
  try {
    kq = await layDanhSachGiaPha();
  } catch (e) {
    if (khoiDs !== khoi) return;
    khoi.innerHTML = '';
    khoi.append(nhan('Các gia phả bạn mở được'));
    khoi.append(loiNhan(cauLoiMayChu(e), true));
    return;
  }
  if (khoiDs !== khoi) return;

  khoi.innerHTML = '';
  khoi.append(nhan('Các gia phả bạn mở được'));

  if (!kq || !kq.ok) {
    khoi.append(loiNhan((kq && kq.loi) || 'Máy chủ không trả về danh sách.', true));
    return;
  }

  const ds = Array.isArray(kq.ds) ? kq.ds : [];
  if (ds.length === 0) {
    khoi.append(doanChu(
      'Không có gia phả nào được chia sẻ cho tài khoản này. Nhờ ' +
      ((state.phien && state.phien.nguoiQuanLy) || 'người quản lý') +
      ' chia sẻ gia phả cho tài khoản này.'));
    return;
  }

  for (const muc of ds) khoi.append(dongGiaPha(muc));

  khoi.append(doanChu(
    'Bấm một dòng để đổi sang cây ấy. App sẽ hỏi lại trước khi đổi.'));
}

function dongGiaPha(muc) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.giaPha = muc.fileId;
  const laDangMo = !!(muc.dangChon || (state.phien && (state.phien.treeId === muc.fileId || state.phien.tenFileDuLieu === muc.treeCode || state.phien.maCay === muc.treeCode)));
  if (laDangMo) b.dataset.dangMo = '1';
  b.style.cssText =
    'display:block;width:100%;text-align:left;margin-top:6px;padding:10px 11px;' +
    'border:1px solid ' + (laDangMo ? 'var(--sd-vien-dam,#c8bfb2)' : 'var(--sd-vien,#e6e0d8)') + ';' +
    'border-radius:9px;background:' + (laDangMo ? 'var(--sd-nen-nhat,#f4efe7)' : 'var(--sd-nen,#faf8f5)') + ';' +
    'font-family:inherit;color:var(--sd-chu,#2a2622);cursor:pointer;touch-action:manipulation';

  const d1 = document.createElement('div');
  d1.textContent = muc.ten + (laDangMo ? '   ·   đang mở' : '');
  d1.style.cssText = 'font-size:14px' + (laDangMo ? ';font-weight:600' : '');

  const d2 = document.createElement('div');
  d2.textContent = [
    demNguoi(muc.soNguoi),
    Number(muc.soCap) > 0 ? muc.soCap + ' cặp' : '',
    muc.suaDuoc ? '' : 'chỉ xem',
    muc.doiLuc ? 'sửa ' + muc.doiLuc : '',
  ].filter((x) => !!x).join('  ·  ');
  d2.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';

  b.append(d1, d2);
  if (d2.textContent === '') d2.remove();

  b.addEventListener('click', () => {
    if (laDangMo) return moHopDangMo(muc);
    moHopDoiCay(muc);
  });
  return b;
}

function demNguoi(so) {
  const n = Number(so);
  if (!isFinite(n) || n < 0) return '';
  return n === 0 ? 'chưa có ai' : n + ' người';
}

function moHopDangMo(muc) {
  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (!hop) return;
  hop.innerHTML = '';
  hop.append(tieuDeHop('Đang mở gia phả này'));
  hop.append(doanChu(muc.ten + ' chính là cây app đang mở. Không có gì phải đổi.'));
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));
}

function moHopDoiCay(muc) {
  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (!hop) return;

  hop.innerHTML = '';
  hop.append(tieuDeHop('Mở gia phả này?'));
  hop.append(doanChu(muc.ten));

  for (const dong of bonDongHauQua(muc)) hop.append(gachDau(dong));

  const nutLam = nut('Mở gia phả này', true, true, () => chayDoiCay(muc, nutLam));
  nutLam.dataset.viec = 'xac-nhan-doi-cay';
  hop.append(nutLam);
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));
}

function bonDongHauQua(muc) {
  const tenDangMo = state.phien && (state.phien.tenCay || state.phien.tenHo || state.phien.tenFileDuLieu);
  const dangMo = tenDangMo ? 'App đang mở ' + tenDangMo + '. ' : '';

  const veCay = dangMo + 'Bấm xong, app mở ' + muc.ten + ': ' +
                [demNguoi(muc.soNguoi),
                 Number(muc.soCap) > 0 ? muc.soCap + ' cặp' : '']
                  .filter((x) => !!x).join(' · ') + '.';

  const veTai = 'Trang sẽ tải lại — sơ đồ, ảnh, danh sách đều dựng lại từ ' +
                'cây mới. Cây đang mở không bị đụng tới.';

  const veRieng = 'Lựa chọn này của riêng tài khoản bạn. Người khác trong họ ' +
                  'mở app vẫn thấy cây của họ.';

  const veLui = muc.suaDuoc
    ? 'Đổi lại lúc nào cũng được, theo đúng đường này.'
    : 'Bạn chỉ có quyền XEM cây ấy — mở ra đọc được, nhưng không sửa được gì. ' +
      'Đổi lại lúc nào cũng được, theo đúng đường này.';

  return [veCay, veTai, veRieng, veLui];
}

async function chayDoiCay(muc, nutLam) {
  if (dangChay) return;
  dangChay = true;
  nutLam.disabled = true;
  nutLam.style.opacity = '.45';

  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (hop) hop.append(doanChu('Đang đổi sang ' + muc.ten + '…'));

  let kq;
  try {
    kq = await chonGiaPha(muc.fileId);
  } catch (e) {
    dangChay = false;
    if (hop) veHopLoi(hop, cauLoiMayChu(e));
    return;
  }

  dangChay = false;
  if (!lopPhu || !hop) return;

  if (!kq || !kq.ok) {
    veHopLoi(hop, (kq && kq.loi) || 'Máy chủ không đổi được gia phả.');
    return;
  }

  hop.innerHTML = '';
  hop.append(tieuDeHop('Đã đổi gia phả'));
  hop.append(gachDau('App nay mở ' + (kq.ten || muc.ten) + '.'));
  hop.append(gachDau('Bấm nút dưới để tải lại trang và xem cây mới.'));
  const nutTai = nut('Tải lại trang', true, true, () => location.reload());
  nutTai.dataset.viec = 'tai-lai';
  hop.append(nutTai);
}

function veHopLoi(hop, cau, tieuDe) {
  hop.innerHTML = '';
  hop.append(tieuDeHop(tieuDe || 'Chưa đổi gia phả'));
  hop.append(loiNhan(cau, true));
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));
}

function cauLoiMayChu(e) {
  return String((e && e.message) || e || '') || 'Không gọi được máy chủ.';
}

function tieuDeHop(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:19px;font-weight:600';
  return d;
}

function nhan(chu) {
  const n = document.createElement('div');
  n.textContent = chu;
  n.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078);' +
    'margin-bottom:6px;margin-top:12px';
  return n;
}

function doanChu(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:13px;line-height:1.55;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
  return d;
}

function gachDau(chu) {
  const d = document.createElement('div');
  d.textContent = '• ' + chu;
  d.style.cssText =
    'font-size:13px;line-height:1.55;margin-top:8px;overflow-wrap:anywhere';
  return d;
}

function loiNhan(chu, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:10px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:var(--sd-do,#8a3a2a);background:var(--sd-do-nen,#fbf0ec);border:1px solid var(--sd-do-vien,#f0d8d0)'
      : 'color:var(--sd-chu-phu,#8a8078);background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4)');
  return d;
}

function nut(chu, chinh, batDuoc, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'display:block;width:100%;margin:12px auto 0;min-height:42px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border-radius:9px;touch-action:manipulation;line-height:1.35;' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45') + ';' +
    (chinh
      ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
      : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
  if (batDuoc) b.addEventListener('click', chay);
  return b;
}
