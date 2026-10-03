import { state, notify } from '../state.js';
import {
  dangXuat, datHienNgayGio, coKetNoi, datNguoiTrungTamMacDinh,
} from '../services/sb.js';
import { fullName, coGiaTri, doiSongNguoi } from '../utils/text.js';
import { veLinkTai, inAnhRaster, dpiConDungDuoc, laManHinhMayTinh, DAI_DPI,
         KHO_GIAY, CHU_CAO_KHUYEN_NGHI_MM }
  from './export-image.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA,
         vaiTroBangChu } from '../config.js';

let lopPhu = null;
let xuLyNgoai = {};

let khoiMacDinh = null;

export function openSettings(xuLy = {}) {
  closeSettings();
  xuLyNgoai = xuLy;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-cai-dat';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.style.cssText =
    'display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap';
  const chuTieuDe = document.createElement('span');
  chuTieuDe.textContent = 'Cài đặt';
  chuTieuDe.style.cssText = 'font-size:19px;font-weight:600';
  tieuDe.append(chuTieuDe);

  const coCay = Boolean(state.tree);
  const tenCayDangMo = coCay && state.phien && (state.phien.tenCay || state.phien.tenHo || state.phien.tenFileDuLieu);
  const maCayDangMo = coCay && state.phien && state.phien.maCay;
  if (tenCayDangMo || maCayDangMo) {
    const nhanCay = document.createElement('span');
    nhanCay.textContent = 'Cây đang hiển thị: ' + tenCayDangMo +
      (maCayDangMo ? ' (' + maCayDangMo + ')' : '');
    nhanCay.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078)';
    tieuDe.append(nhanCay);
  }
  hop.append(tieuDe);

  veKhoiQuanLy(hop);
  if (coCay) {
    veKhoiMacDinh(hop);
    veKhoiHienThi(hop);
  }
  veKhoiChonGiaPha(hop);
  veKhoiXuat(hop);
  veKhoiNhap(hop);
  veKhoiPhien(hop);

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin:18px auto 0;display:block;width:100%;height:42px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);cursor:pointer;' +
    'touch-action:manipulation';
  dong.addEventListener('click', () => closeSettings());
  hop.append(dong);

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeSettings(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

export function closeSettings() {
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  khoiMacDinh = null;
}

function veKhoiMacDinh(vao) {
  khoiMacDinh = document.createElement('div');
  khoiMacDinh.style.cssText = 'margin-top:16px';
  vao.append(khoiMacDinh);
  veLaiKhoiMacDinh();
  return khoiMacDinh;
}

function veLaiKhoiMacDinh(loi) {
  const khoi = khoiMacDinh;
  if (!khoi) return;
  khoi.innerHTML = '';

  khoi.append(veNhanKhoi('Người trung tâm mặc định'));

  const macDinh = state.phien && state.phien.nguoiTrungTamMacDinh;
  const nguoiMacDinh = macDinh && state.index ? state.index.personById.get(macDinh) : null;

  const giaiThich = document.createElement('div');
  giaiThich.style.cssText = 'font-size:13px;line-height:1.55;color:var(--sd-chu-phu,#8a8078);margin-bottom:10px';
  if (coGiaTri(macDinh) && nguoiMacDinh) {
    giaiThich.textContent =
      'Mỗi lần bạn mở app, sơ đồ sẽ vẽ quanh ' + fullName(nguoiMacDinh) + '. ' +
      'Giá trị này của riêng tài khoản bạn, người khác trong họ không thấy.';
  } else if (coGiaTri(macDinh)) {
    giaiThich.textContent =
      'Đang đặt mã ' + macDinh + ', nhưng không còn ai mang mã đó trong gia phả. ' +
      'Nên bỏ mặc định đi.';
  } else {
    giaiThich.textContent =
      'Chưa đặt. Mỗi lần mở app, sơ đồ vẽ quanh người gốc của gia phả.';
  }
  khoi.append(giaiThich);

  if (nguoiMacDinh) khoi.append(veTheNho(nguoiMacDinh));

  const dangXem = state.index && state.focusPersonId
    ? state.index.personById.get(state.focusPersonId) : null;
  const coNoi = coKetNoi();
  const datMacDinh = (ma) => (state.treeId
    ? datNguoiTrungTamMacDinh(state.treeId, ma)
    : Promise.resolve({ ok: false, loi: 'Chưa mở gia phả nào nên chưa làm được việc này.' }));

  const hangNut = document.createElement('div');
  hangNut.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';

  if (dangXem && state.focusPersonId !== macDinh) {
    hangNut.append(nut(
      'Đặt ' + fullName(dangXem) + ' làm mặc định', true, coNoi,
      () => chay(() => datMacDinh(state.focusPersonId), state.focusPersonId)));
  }
  if (coGiaTri(macDinh)) {
    hangNut.append(nut('Bỏ mặc định', false, coNoi,
      () => chay(() => datMacDinh(null), '')));
  }
  khoi.append(hangNut);

  if (!coNoi) {
    khoi.append(veLoiNhan(
      'Chưa nối được máy chủ nên nút trên chưa bấm được. Hãy mở gia phả bằng ' +
      'đúng đường link thường dùng.',
      false));
  }
  if (loi) khoi.append(veLoiNhan(loi, true));
}

async function chay(lenh, giaTriMoi) {
  const khoi = khoiMacDinh;
  if (khoi) khoi.style.opacity = '0.5';
  try {
    await lenh();
    if (!state.phien) state.phien = {};
    state.phien.nguoiTrungTamMacDinh = giaTriMoi;
    notify();
    if (khoi) khoi.style.opacity = '1';
    veLaiKhoiMacDinh();
    if (xuLyNgoai.onDoiMacDinh) xuLyNgoai.onDoiMacDinh(giaTriMoi);
  } catch (e) {
    if (khoi) khoi.style.opacity = '1';
    veLaiKhoiMacDinh(e && e.message ? e.message : String(e));
  }
}

function veKhoiHienThi(vao) {
  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Hiển thị'));

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hopChon = document.createElement('input');
  hopChon.type = 'checkbox';
  hopChon.id = 'giapha-ct-ngay-gio';
  hopChon.checked = state.hienNgayGio === true;
  hopChon.style.cssText = 'width:18px;height:18px;accent-color:var(--sd-chu,#2a2622)';
  hopChon.addEventListener('change', () => {
    state.hienNgayGio = hopChon.checked;
    notify();
    if (xuLyNgoai.onDoiHienThi) xuLyNgoai.onDoiHienThi();

    const treeId = state.phien && state.phien.treeId;
    if (treeId) {
      datHienNgayGio(treeId, hopChon.checked).then((kq) => {
        if (!kq || !kq.ok) console.warn('[settings] không lưu được công tắc ngày giỗ:', kq && kq.loi);
      });
    }
  });

  const chu = document.createElement('span');
  chu.textContent = 'Hiện hàng ngày giỗ dưới mỗi ô';

  nhan.append(hopChon, chu);
  khoi.append(nhan);

  const nhac = document.createElement('div');
  nhac.textContent =
    'Bật lên thì mọi ô cao thêm một hàng, kể cả ô chưa có ngày giỗ.';
  nhac.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  khoi.append(nhac);

  vao.append(khoi);
  return khoi;
}

function veKhoiChonGiaPha(vao) {
  if (!xuLyNgoai.onMoChonGiaPha) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Gia phả'));

  const dangMo = state.tree && state.phien && (state.phien.tenCay || state.phien.tenHo || state.phien.tenFileDuLieu);
  const giaiThich = document.createElement('div');
  giaiThich.textContent =
    (dangMo ? 'Đang mở ' + dangMo + '. ' : '') +
    'Đổi sang một cây khác được chia sẻ cho bạn. Lựa chọn này của riêng tài khoản bạn.';
  giaiThich.style.cssText =
    'font-size:13px;line-height:1.55;color:var(--sd-chu-phu,#8a8078);margin-bottom:10px';
  khoi.append(giaiThich);

  const b = nut('Chọn gia phả khác', false, true, () => xuLyNgoai.onMoChonGiaPha());
  b.dataset.viec = 'chon-gia-pha';
  khoi.append(b);

  vao.append(khoi);
  return khoi;
}

function veKhoiXuat(vao) {
  if (!xuLyNgoai.onMoXuatGedcom && !xuLyNgoai.onXuatExcel && !xuLyNgoai.onXuatAnhPng
      && !xuLyNgoai.onInSoDo && !xuLyNgoai.onXuatAnhDpi) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Xuất dữ liệu'));

  if (xuLyNgoai.onMoXuatGedcom || xuLyNgoai.onXuatExcel) veNutXuatDuLieu(khoi);

  veKhoiXuatAnh(khoi);

  vao.append(khoi);
  return khoi;
}

function veNutXuatDuLieu(khoi) {
  const chon = document.createElement('div');
  chon.hidden = true;
  chon.style.cssText = 'margin-top:6px;padding-left:12px;border-left:2px solid var(--sd-vien,#e6e0d8)';
  const ketQua = document.createElement('div');
  ketQua.style.cssText = 'font-size:12px;line-height:1.5;margin-top:6px';

  const chinh = nut('Xuất dữ liệu ▾', false, true, () => { chon.hidden = !chon.hidden; });
  chinh.dataset.viec = 'xuat-du-lieu';
  chinh.style.marginTop = '4px';

  const muc = (chu, viec, lam) => {
    const b = nut(chu, false, true, lam);
    b.dataset.viec = viec;
    b.style.marginTop = '6px';
    chon.append(b);
    return b;
  };
  if (xuLyNgoai.onMoXuatGedcom) {
    muc('GEDCOM (.ged) — sang phần mềm gia phả khác', 'xuat-gedcom',
        () => xuLyNgoai.onMoXuatGedcom());
  }
  if (xuLyNgoai.onXuatExcel) {
    const excel = (kieu) => async () => {
      for (const b of chon.querySelectorAll('button')) b.disabled = true;
      ketQua.style.color = 'var(--sd-chu-phu,#8a8078)';
      ketQua.textContent = 'Đang tạo file…';
      let kq;
      try { kq = await xuLyNgoai.onXuatExcel(kieu); }
      catch (e) { kq = { ok: false, loi: e && e.message ? e.message : String(e) }; }
      for (const b of chon.querySelectorAll('button')) b.disabled = false;
      ketQua.style.color = kq && kq.ok ? 'var(--sd-chu-phu,#8a8078)' : 'var(--sd-do,#8a3a2a)';
      ketQua.textContent = kq && kq.ok ? '' : ((kq && kq.loi) || 'Không tạo được file.');
    };
    muc('Excel — Bảng phẳng (.xlsx), nhập lại được', 'xuat-excel-phang', excel('phang'));
    muc('Excel — 2 sheet Người + Gia đình (.xlsx)', 'xuat-excel-hai-sheet', excel('hai-sheet'));
  }
  chon.append(ketQua);
  khoi.append(chinh, chon);
}

function veKhoiXuatAnh(khoi) {
  if (!xuLyNgoai.onXuatAnhPng && !xuLyNgoai.onInSoDo && !xuLyNgoai.onXuatAnhDpi) return;

  const chu = document.createElement('div');
  chu.textContent = 'Ảnh và PDF dưới đây chỉ chụp đúng PHẦN SƠ ĐỒ ĐANG HIỆN '
                   + 'trên màn hình (theo đúng phạm vi đời đang chọn) — không '
                   + 'phải toàn bộ gia phả như Xuất dữ liệu ở trên.';
  chu.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:10px';
  khoi.append(chu);

  if (xuLyNgoai.onXuatAnhPng) {
    const ketQua = document.createElement('div');

    const nutPng = nut('Chụp ảnh sơ đồ (.png)', false, true, async () => {
      nutPng.disabled = true;
      nutPng.style.opacity = '0.6';
      nutPng.style.cursor = 'wait';
      ketQua.textContent = 'Đang tạo ảnh...';
      ketQua.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
      try {
        const anh = await xuLyNgoai.onXuatAnhPng();
        ketQua.textContent = '';

        const doDuoc = document.createElement('div');
        doDuoc.dataset.viec = 'co-anh-png';
        doDuoc.textContent = 'Ảnh ' + anh.w + '×' + anh.h + ' điểm ảnh'
          + (anh.tyLe < 1
             ? ' — ⚠ NHỎ HƠN sơ đồ trên màn hình (sơ đồ quá lớn so với mức '
               + 'trình duyệt dựng nổi). Muốn nét hơn thì dùng "Ảnh độ phân '
               + 'giải cao" bên dưới, hoặc thu bớt số đời đang hiện.'
             : '.');
        doDuoc.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
        ketQua.append(doDuoc);

        ketQua.append(veLinkTai(anh.blob, anh.tenFile, 'Tải ảnh PNG về máy'));
      } catch (e) {
        ketQua.textContent = 'Không tạo được ảnh: ' + (e && e.message ? e.message : String(e));
      } finally {
        nutPng.disabled = false;
        nutPng.style.opacity = '1';
        nutPng.style.cursor = 'pointer';
      }
    });
    nutPng.dataset.viec = 'xuat-anh-png';
    nutPng.style.marginTop = '8px';
    khoi.append(nutPng, ketQua);
  }

  if (xuLyNgoai.onInSoDo) {
    const nutIn = nut('In sơ đồ (lưu PDF từ hộp thoại in)', false, true,
                       () => xuLyNgoai.onInSoDo());
    nutIn.dataset.viec = 'in-so-do';
    nutIn.style.marginTop = '8px';
    khoi.append(nutIn);
  }

  veKhoiPdfNhieuTrang(khoi);
  veKhoiAnhDpi(khoi);
}

function veKhoiPdfNhieuTrang(khoi) {
  if (!xuLyNgoai.onXuatPdfNhieuTrang || !xuLyNgoai.onXemTruocPdf) return;

  const boc = document.createElement('div');
  boc.dataset.viec = 'khoi-pdf-nhieu-trang';
  boc.style.cssText =
    'margin-top:10px;padding:10px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
    'background:var(--sd-nen,#faf8f5)';

  const nhan = document.createElement('label');
  nhan.textContent = 'In treo tường — chữ in ra cao bao nhiêu mm?';
  nhan.style.cssText = 'display:block;font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-bottom:6px';
  boc.append(nhan);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:8px;align-items:stretch;flex-wrap:wrap';

  const oChu = document.createElement('input');
  oChu.type = 'number';
  oChu.min = '1';
  oChu.max = '100';
  oChu.step = '0.5';
  oChu.value = String(CHU_CAO_KHUYEN_NGHI_MM);
  oChu.dataset.viec = 'chu-cao-mm';
  oChu.style.cssText =
    'width:80px;min-height:38px;padding:6px 8px;font-size:14px;font-family:inherit;' +
    'border-radius:8px;border:1px solid var(--sd-vien,#e6e0d8);box-sizing:border-box';

  const oKho = document.createElement('select');
  oKho.dataset.viec = 'kho-giay';
  oKho.style.cssText =
    'flex:1;min-width:150px;min-height:38px;padding:6px 8px;font-size:14px;' +
    'font-family:inherit;border-radius:8px;border:1px solid var(--sd-vien,#e6e0d8);box-sizing:border-box';
  for (const ten of Object.keys(KHO_GIAY)) {
    for (const nam of [false, true]) {
      const o = document.createElement('option');
      o.value = ten + (nam ? '|ngang' : '|doc');
      const [a, b] = KHO_GIAY[ten];
      const [r, c] = nam ? [b, a] : [a, b];
      o.textContent = ten + (nam ? ' ngang' : ' dọc') + ' — ' + r + '×' + c + 'mm';
      oKho.append(o);
    }
  }
  oKho.value = 'A4|ngang';

  hang.append(oChu, oKho);
  boc.append(hang);

  const oDpi = document.createElement('select');
  oDpi.dataset.viec = 'dpi-nhieu-trang';
  oDpi.style.cssText =
    'width:100%;min-height:38px;margin-top:8px;padding:6px 8px;font-size:14px;' +
    'font-family:inherit;border-radius:8px;border:1px solid var(--sd-vien,#e6e0d8);box-sizing:border-box';
  for (const dpi of DAI_DPI) {
    const o = document.createElement('option');
    o.value = String(dpi);
    o.textContent = dpi + ' DPI' + (dpi === 150 ? ' — đủ cho tranh treo tường' : '');
    oDpi.append(o);
  }
  oDpi.value = '150';

  boc.append(oDpi);

  const xemTruoc = document.createElement('div');
  xemTruoc.dataset.viec = 'xem-truoc-pdf';
  xemTruoc.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
  boc.append(xemTruoc);

  const ketQua = document.createElement('div');

  function capNhat() {
    const [tenKho, chieu] = String(oKho.value).split('|');
    const xem = xuLyNgoai.onXemTruocPdf(
      Number(oChu.value), tenKho, chieu === 'ngang', Number(oDpi.value));
    if (!xem) {
      xemTruoc.textContent = 'Chưa tính được — sơ đồ chưa vẽ xong hoặc số chưa hợp lệ.';
      return null;
    }
    const cm = (mm) => (mm / 10).toFixed(0);
    xemTruoc.textContent =
      'Cả sơ đồ sẽ là ' + cm(xem.rongMm) + '×' + cm(xem.caoMm) + 'cm, ' +
      'chia thành ' + xem.tong + ' trang (' + xem.cot + ' ngang × ' + xem.hang + ' dọc), ' +
      'mỗi trang ' + xem.wPx + '×' + xem.hPx + ' điểm ảnh. Dán ' + xem.cot + ' tờ ' +
      'cạnh nhau, ' + xem.hang + ' hàng.' +
      (xem.tong > 30
        ? ' ⚠ Nhiều trang quá — thu bớt số đời đang hiện, hoặc chọn khổ giấy lớn hơn.'
        : '');
    return xem;
  }

  oChu.addEventListener('input', capNhat);
  oKho.addEventListener('change', capNhat);
  oDpi.addEventListener('change', capNhat);
  capNhat();

  const nutXuat = nut('Tải PDF nhiều trang', true, true, async () => {
    const xem = capNhat();
    if (!xem) return;
    nutXuat.disabled = true;
    nutXuat.style.opacity = '0.6';
    nutXuat.style.cursor = 'wait';
    ketQua.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
    ketQua.textContent = 'Đang dựng trang 1/' + xem.tong + '...';
    try {
      const [tenKho, chieu] = String(oKho.value).split('|');
      const pdf = await xuLyNgoai.onXuatPdfNhieuTrang({
        chuCaoMm: Number(oChu.value),
        tenKho,
        nam: chieu === 'ngang',
        dpi: Number(oDpi.value),
        onTien: (xong, tong) => {
          ketQua.textContent = 'Đang dựng trang ' + Math.min(xong + 1, tong) + '/' + tong + '...';
        },
      });
      ketQua.textContent = '';
      const doDuoc = document.createElement('div');
      doDuoc.dataset.viec = 'co-pdf-nhieu-trang';
      doDuoc.textContent =
        'Xong: ' + pdf.tong + ' trang, ghép lại thành ' + (pdf.rongMm / 10).toFixed(0) +
        '×' + (pdf.caoMm / 10).toFixed(0) + 'cm. Chữ in ra cao đúng ' +
        oChu.value + 'mm.';
      doDuoc.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
      ketQua.append(doDuoc, veLinkTai(pdf.blob, pdf.tenFile, 'Tải file PDF về máy'));
    } catch (e) {
      ketQua.textContent = 'Không dựng được PDF: ' + (e && e.message ? e.message : String(e));
    } finally {
      nutXuat.disabled = false;
      nutXuat.style.opacity = '1';
      nutXuat.style.cursor = 'pointer';
    }
  });
  nutXuat.dataset.viec = 'tai-pdf-nhieu-trang';
  nutXuat.style.marginTop = '8px';

  boc.append(nutXuat, ketQua);

  const giaiThich = document.createElement('div');
  giaiThich.textContent =
    'Khuyến nghị ' + CHU_CAO_KHUYEN_NGHI_MM + 'mm — đọc thoải mái khi đứng cách ' +
    '1–1,5m. Chữ càng cao thì khổ giấy càng lớn và càng nhiều trang. Khổ giấy ' +
    'ghi thẳng trong file PDF nên mang ra tiệm in là đúng cỡ, không phụ thuộc ' +
    'máy in nào.';
  giaiThich.style.cssText = 'font-size:11px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  boc.append(giaiThich);

  khoi.append(boc);
}

function veKhoiAnhDpi(khoi) {
  if (!xuLyNgoai.onXuatAnhDpi) return;
  if (!laManHinhMayTinh()) return;

  const boc = document.createElement('div');
  boc.dataset.viec = 'khoi-anh-dpi';
  boc.style.cssText =
    'margin-top:10px;padding:10px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
    'background:var(--sd-nen,#faf8f5)';

  const nhan = document.createElement('label');
  nhan.textContent = 'Ảnh độ phân giải cao (gửi máy in PDF, tiệm in) — bề ngang khổ giấy, cm:';
  nhan.style.cssText = 'display:block;font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-bottom:6px';
  boc.append(nhan);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:8px;align-items:stretch;flex-wrap:wrap';

  const oNhap = document.createElement('input');
  oNhap.type = 'number';
  oNhap.min = '5';
  oNhap.max = '800';
  oNhap.step = '1';
  oNhap.value = '84';
  oNhap.dataset.viec = 'rong-anh-dpi-cm';
  oNhap.style.cssText =
    'width:80px;min-height:38px;padding:6px 8px;font-size:14px;font-family:inherit;' +
    'border-radius:8px;border:1px solid var(--sd-vien,#e6e0d8);box-sizing:border-box';

  const oDpi = document.createElement('select');
  oDpi.dataset.viec = 'chon-dpi';
  oDpi.style.cssText =
    'flex:1;min-width:150px;min-height:38px;padding:6px 8px;font-size:14px;' +
    'font-family:inherit;border-radius:8px;border:1px solid var(--sd-vien,#e6e0d8);box-sizing:border-box';
  for (const dpi of DAI_DPI) {
    const o = document.createElement('option');
    o.value = String(dpi);
    o.textContent = dpi + ' DPI';
    oDpi.append(o);
  }
  oDpi.value = '300';

  hang.append(oNhap, oDpi);
  boc.append(hang);

  const canhBao = document.createElement('div');
  canhBao.dataset.viec = 'canh-bao-dpi';
  canhBao.style.cssText = 'font-size:11px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  boc.append(canhBao);

  const ketQua = document.createElement('div');

  function capNhatDpi() {
    const co = xuLyNgoai.onCoSoDo ? xuLyNgoai.onCoSoDo() : null;
    const vbW = co && co.vbW > 0 ? co.vbW : 1;
    const vbH = co && co.vbH > 0 ? co.vbH : 1;
    const cm = Number(oNhap.value);
    const dungDuoc = dpiConDungDuoc(cm, vbW, vbH);

    for (const o of oDpi.options) {
      const duoc = dungDuoc.indexOf(Number(o.value)) !== -1;
      o.disabled = !duoc;
      o.textContent = o.value + ' DPI' + (duoc ? '' : ' — quá lớn, không dựng nổi');
    }

    if (!dungDuoc.length) {
      oDpi.disabled = true;
      canhBao.textContent =
        'Khổ ' + (cm > 0 ? cm + 'cm' : 'này') + ' quá lớn: không mức nào trong ' +
        '75–1200 DPI dựng nổi thành ảnh. Hãy giảm bề ngang, hoặc dùng "In khổ ' +
        'lớn (PDF)" ở trên — đường ấy là PDF vector nên không có trần này.';
      return;
    }

    oDpi.disabled = false;
    if (dungDuoc.indexOf(Number(oDpi.value)) === -1) {
      oDpi.value = String(dungDuoc[dungDuoc.length - 1]);
    }
    const caoNhat = dungDuoc[dungDuoc.length - 1];
    canhBao.textContent = caoNhat < DAI_DPI[DAI_DPI.length - 1]
      ? 'Ở bề ngang ' + cm + 'cm, trình duyệt chỉ dựng nổi tới ' + caoNhat +
        ' DPI — các mức cao hơn đã mờ đi. Cần nét hơn nữa thì dùng "In khổ ' +
        'lớn (PDF)" ở trên: PDF vector nét ở mọi cỡ phóng.'
      : 'Bề dài tự tính theo đúng tỷ lệ sơ đồ, không bóp méo. Ảnh càng nhiều ' +
        'DPI càng lâu và càng nặng — 300 DPI đã đủ cho hầu hết tiệm in.';
  }

  oNhap.addEventListener('input', capNhatDpi);
  capNhatDpi();

  const nutTao = nut('Tạo ảnh độ phân giải cao', true, true, async () => {
    nutTao.disabled = true;
    nutTao.style.opacity = '0.6';
    nutTao.style.cursor = 'wait';
    ketQua.textContent = 'Đang tạo ảnh...';
    ketQua.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
    try {
      const anh = await xuLyNgoai.onXuatAnhDpi(Number(oNhap.value), Number(oDpi.value));
      ketQua.textContent = '';

      const doDuoc = document.createElement('div');
      doDuoc.textContent = 'Đã tạo ảnh ' + anh.w + '×' + anh.h + ' điểm ảnh — khổ ' +
                           Math.round(anh.rongMm / 10) + '×' + Math.round(anh.caoMm / 10) + 'cm.';
      doDuoc.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
      ketQua.append(doDuoc);

      const link = veLinkTai(anh.blob, anh.tenFile, 'Tải ảnh về máy');
      ketQua.append(link);

      const nutIn = nut('Gửi tới máy in', false, true,
                        () => inAnhRaster(link.href, anh.rongMm, anh.caoMm));
      nutIn.dataset.viec = 'in-anh-dpi';
      nutIn.style.marginTop = '8px';
      ketQua.append(nutIn);

      const nhacIn = document.createElement('div');
      nhacIn.textContent =
        'Nút này mở hộp thoại in của máy — khổ giấy sẽ do chính máy in quyết ' +
        'định, không phải khổ đã gõ ở trên. Muốn đúng khổ thì dùng nút "Tải ' +
        'file PDF" bên trên.';
      nhacIn.style.cssText = 'font-size:11px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
      ketQua.append(nhacIn);
    } catch (e) {
      ketQua.textContent = 'Không tạo được ảnh: ' + (e && e.message ? e.message : String(e));
    } finally {
      nutTao.disabled = false;
      nutTao.style.opacity = '1';
      nutTao.style.cursor = 'pointer';
    }
  });
  nutTao.dataset.viec = 'tao-anh-dpi';
  nutTao.style.marginTop = '8px';

  const nutPdf = xuLyNgoai.onXuatPdfDpi
    ? nut('Tải file PDF đúng khổ (cùng ảnh trên, gói vào PDF)', false, true, async () => {
        nutPdf.disabled = true;
        nutPdf.style.opacity = '0.6';
        nutPdf.style.cursor = 'wait';
        ketQua.textContent = 'Đang dựng file PDF...';
        ketQua.style.cssText = 'font-size:13px;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
        try {
          const pdf = await xuLyNgoai.onXuatPdfDpi(Number(oNhap.value), Number(oDpi.value));
          ketQua.textContent = '';

          const doDuoc = document.createElement('div');
          doDuoc.dataset.viec = 'co-pdf-dpi';
          doDuoc.textContent =
            'PDF khổ ' + (pdf.rongMm / 10).toFixed(1) + '×' + (pdf.caoMm / 10).toFixed(1) +
            'cm, ảnh bên trong ' + pdf.w + '×' + pdf.h + ' điểm ảnh. Khổ này nằm ' +
            'trong chính file — mở ở đâu, in ở tiệm nào cũng đúng bằng đó.';
          doDuoc.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
          ketQua.append(doDuoc);
          ketQua.append(veLinkTai(pdf.blob, pdf.tenFile, 'Tải file PDF về máy'));
        } catch (e) {
          ketQua.textContent = 'Không dựng được PDF: ' + (e && e.message ? e.message : String(e));
        } finally {
          nutPdf.disabled = false;
          nutPdf.style.opacity = '1';
          nutPdf.style.cursor = 'pointer';
        }
      })
    : null;
  boc.append(nutTao);
  if (nutPdf) {
    nutPdf.dataset.viec = 'tao-pdf-dpi';
    nutPdf.style.marginTop = '8px';
    boc.append(nutPdf);
  }
  boc.append(ketQua);
  khoi.append(boc);
}

function veKhoiNhap(vao) {
  if (!xuLyNgoai.onMoNhapGedcom) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Nhập dữ liệu'));

  const b = nut('Nhập từ file GEDCOM hoặc Excel', false, true,
                () => xuLyNgoai.onMoNhapGedcom());
  b.dataset.viec = 'nhap-gedcom';
  b.style.marginTop = '4px';
  khoi.append(b);

  const chu = document.createElement('div');
  chu.textContent = 'Xem file .ged có những gì, rồi ghi vào một gia phả MỚI. '
                  + 'Gia phả đang mở không bị đụng tới.';
  chu.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  khoi.append(chu);

  vao.append(khoi);
  return khoi;
}

function veKhoiQuanLy(vao) {
  if (!xuLyNgoai.onDanhSachNguoi && !xuLyNgoai.onDanhSachGiaDinh) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:4px';
  khoi.append(veNhanKhoi('Quản lý gia phả'));

  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;flex-direction:column;gap:8px;margin-top:4px';

  if (xuLyNgoai.onDanhSachNguoi) {
    const b = nut('Danh sách người — xem và sửa từng người', false, true,
                  () => xuLyNgoai.onDanhSachNguoi());
    b.dataset.viec = 'danh-sach-nguoi';
    hang.append(b);
  }

  if (xuLyNgoai.onDanhSachGiaDinh) {
    const b = nut('Các gia đình — xem một cặp và các con', false, true,
                  () => xuLyNgoai.onDanhSachGiaDinh());
    b.dataset.viec = 'danh-sach-gia-dinh';
    hang.append(b);
  }

  khoi.append(hang);
  vao.append(khoi);
  return khoi;
}

function veKhoiPhien(vao) {
  const phien = state.phien;
  if (!phien) return;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Tài khoản và vai trò'));

  const bang = document.createElement('div');
  bang.style.cssText = 'display:flex;flex-direction:column;gap:1px';
  hang(bang, 'Đăng nhập', phien.email);
  hang(bang, 'Mã tài khoản', phien.maNgan);
  hang(bang, 'Dòng họ', phien.tenDongHo);
  hang(bang, 'Vai trò', vaiTroBangChu(phien.vaiTro));
  hang(bang, 'Quyền', quyenBangChu(phien));
  hang(bang, 'Người quản lý', phien.nguoiQuanLy);
  if (phien.tenFileDuLieu) hang(bang, 'File dữ liệu', phien.tenFileDuLieu);
  khoi.append(bang);

  const bQuanTri = nut('Mở trang Quản trị', false, true, () => {
    window.location.href = 'QuanTri.html';
  });
  bQuanTri.dataset.viec = 'mo-quan-tri';
  bQuanTri.style.cssText += ';margin-top:10px';
  khoi.append(bQuanTri);

  const nhac = document.createElement('div');
  nhac.textContent =
    'Quyền do máy chủ quyết định theo vai trò của tài khoản trong gia phả này, ' +
    'không sửa được trong app. Cần đổi thì nhờ người quản lý.';
  nhac.style.cssText = 'margin-top:8px;font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078)';
  khoi.append(nhac);

  if (state.daLocNguoiConSong) {
    khoi.append(veLoiNhan(
      "Máy chủ đang lược bớt chi tiết người còn sống trước khi gửi bản gia phả " +
      "về máy này, nên app KHÔNG được phép lưu đè lên bản gốc. Đây không phải " +
      "gia phả thiếu thông tin.", false));
  }

  khoi.append(veNutDangXuat());

  vao.append(khoi);
}

function veNutDangXuat() {
  const hop = document.createElement('div');
  hop.style.cssText = 'margin-top:12px';

  let daHoi = false;
  const b = nut('Đăng xuất', false, true, async () => {
    if (!daHoi) {
      daHoi = true;
      b.textContent = 'Bấm lần nữa để đăng xuất';
      b.style.color = 'var(--sd-do,#8a3a2a)';
      b.style.borderColor = 'var(--sd-do-vien,#f0d8d0)';
      return;
    }
    b.disabled = true;
    b.textContent = 'Đang đăng xuất…';
    const kq = await dangXuat();
    if (kq && kq.ok === false) {
      b.disabled = false;
      b.textContent = 'Đăng xuất';
      hop.append(veLoiNhan(kq.loi || 'Không đăng xuất được.', true));
      return;
    }
    window.location.reload();
  });
  hop.append(b);
  return hop;
}

function quyenBangChu(phien) {
  if (phien.suaDuoc) return 'Xem và sửa';
  if (phien.docDuoc) return 'Chỉ xem';
  return '';
}

function veNhanKhoi(chu) {
  const n = document.createElement('div');
  n.textContent = chu;
  n.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078);margin-bottom:6px';
  return n;
}

function veTheNho(p) {
  const the = document.createElement('div');
  the.style.cssText =
    'padding:9px 11px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;background:var(--sd-nen,#faf8f5)';

  const ten = document.createElement('div');
  ten.textContent = fullName(p);
  ten.style.cssText = 'font-size:14px';
  the.append(ten);

  const song = doiSongNguoi(p);
  const phu = [song, p.id].filter(coGiaTri).join('  ·  ');
  const d = document.createElement('div');
  d.textContent = phu;
  d.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
  the.append(d);

  return the;
}

function hang(bang, nhan, giaTri) {
  if (!coGiaTri(giaTri)) return;
  const h = document.createElement('div');
  h.style.cssText =
    'display:flex;gap:10px;align-items:baseline;padding:6px 0;border-top:1px solid var(--sd-vien-nhat,#f0ebe4)';

  const n = document.createElement('div');
  n.textContent = nhan;
  n.style.cssText = 'flex:0 0 100px;font-size:12px;color:var(--sd-chu-phu,#8a8078)';

  const g = document.createElement('div');
  g.textContent = String(giaTri).trim();
  g.style.cssText = 'flex:1 1 auto;font-size:14px;word-break:break-word';

  h.append(n, g);
  bang.append(h);
}

function nut(chu, chinh, batDuoc, chay_) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'width:100%;min-height:42px;padding:8px 14px;font-size:14px;font-family:inherit;' +
    'border-radius:9px;touch-action:manipulation;line-height:1.35;' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45') + ';' +
    (chinh
      ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
      : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
  if (batDuoc) b.addEventListener('click', chay_);
  return b;
}

function veLoiNhan(chu, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:10px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:var(--sd-do,#8a3a2a);background:var(--sd-do-nen,#fbf0ec);border:1px solid var(--sd-do-vien,#f0d8d0)'
      : 'color:var(--sd-chu-phu,#8a8078);background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4)');
  return d;
}
