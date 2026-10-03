import { boDauChoTenFile } from '../domains/gedcom.js';
import { VE } from '../domains/render.js';
import { PHOTO } from '../config.js';
import { driveThumbUrl } from '../utils/image.js';

const TY_LE_CHU_HOA = 0.70;

export const CHU_CAO_KHUYEN_NGHI_MM = 7;

export const KHO_GIAY = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
};

export function tinhKhoTuChuCao(vbW, vbH, chuCaoMm) {
  const mmMoiDonVi = chuCaoMm / (VE.chuTen * TY_LE_CHU_HOA);
  return { rongMm: vbW * mmMoiDonVi, caoMm: vbH * mmMoiDonVi, mmMoiDonVi };
}

export function tinhSoTrang(rongMm, caoMm, trangRongMm, trangCaoMm) {
  if (!(rongMm > 0) || !(caoMm > 0) || !(trangRongMm > 0) || !(trangCaoMm > 0)) {
    return { cot: 0, hang: 0, tong: 0 };
  }
  const cot = Math.max(1, Math.ceil(rongMm / trangRongMm - 1e-6));
  const hang = Math.max(1, Math.ceil(caoMm / trangCaoMm - 1e-6));
  return { cot, hang, tong: cot * hang };
}

const NEN_SO_DO   = '#faf8f5';
const TY_LE_PNG   = 2;

const DIEN_TICH_PNG_NHANH = 120e6;

const LE_TRANG_MM   = 10;
const MM_MOI_INCH   = 25.4;

const TRAN_DIEN_TICH_PX = 268435456;
const TRAN_CANH_PX      = 65535;

export const DAI_DPI = [75, 150, 300, 600, 900, 1200];

export const TRAN_CANVAS = { dienTich: TRAN_DIEN_TICH_PX, canh: TRAN_CANH_PX };

const ID_CSS_IN      = 'giapha-css-in';
const ID_KHUNG_ANH_IN = 'giapha-khung-anh-in';

export async function xuatAnhPNG(svgEl, tree) {
  const { vbW, vbH } = docCoSoDoBatBuoc(svgEl);

  const tyLe = tinhTyLePng(vbW, vbH);
  const w = Math.max(1, Math.round(vbW * tyLe));
  const h = Math.max(1, Math.round(vbH * tyLe));

  const blob = await dungBlobPngTuSvg(svgEl, w, h, null,
                                      { banDoLon: banDoAnhLon(tree) });
  return { blob, tenFile: tenFileAnh(tree, 'png'), w, h, tyLe };
}

export function tinhTyLePng(vbW, vbH) {
  const dienTichGoc = vbW * vbH;
  const canhDaiGoc = Math.max(vbW, vbH);

  let tyLe = TY_LE_PNG;
  if (dienTichGoc * tyLe * tyLe > DIEN_TICH_PNG_NHANH) {
    tyLe = Math.sqrt(DIEN_TICH_PNG_NHANH / dienTichGoc);
  }
  tyLe = Math.max(1, tyLe);

  tyLe = Math.min(tyLe, TRAN_CANH_PX / canhDaiGoc,
                  Math.sqrt(TRAN_DIEN_TICH_PX / dienTichGoc));
  return tyLe;
}

export function tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH) {
  const w = Math.max(1, Math.round((rongCm * 10) / MM_MOI_INCH * dpi));
  const h = Math.max(1, Math.round(w * (vbH / vbW)));
  return { w, h };
}

export function kiemTranCanvas(w, h) {
  const canhDai = Math.max(w, h);
  if (canhDai > TRAN_CANH_PX) {
    throw new Error(
      'Ảnh cần cạnh ' + canhDai + ' điểm ảnh, vượt trần ' + TRAN_CANH_PX +
      ' điểm ảnh mỗi cạnh của trình duyệt. Hãy giảm độ phân giải hoặc bề ngang khổ giấy.');
  }
  if (w * h > TRAN_DIEN_TICH_PX) {
    const trieu = (n) => Math.round(n / 1e6);
    throw new Error(
      'Ảnh cần ' + trieu(w * h) + ' triệu điểm ảnh (' + w + '×' + h + '), vượt trần ' +
      trieu(TRAN_DIEN_TICH_PX) + ' triệu của trình duyệt. ' +
      'Hãy giảm độ phân giải hoặc bề ngang khổ giấy.');
  }
}

export function dpiConDungDuoc(rongCm, vbW, vbH) {
  if (!(rongCm > 0) || !(vbW > 0) || !(vbH > 0)) return [];
  return DAI_DPI.filter((dpi) => {
    const { w, h } = tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH);
    try { kiemTranCanvas(w, h); return true; } catch (e) { return false; }
  });
}

const PT_MOI_INCH = 72;

export function goiJpegThanhPdf(jpeg, wPx, hPx, rongMm, caoMm) {
  return goiNhieuJpegThanhPdf([jpeg], wPx, hPx, rongMm, caoMm);
}

export function goiNhieuJpegThanhPdf(danhSachJpeg, wPx, hPx, rongMm, caoMm) {
  const rongPt = rongMm / MM_MOI_INCH * PT_MOI_INCH;
  const caoPt  = caoMm  / MM_MOI_INCH * PT_MOI_INCH;
  const so = (n) => n.toFixed(4).replace(/\.?0+$/, '');

  const phan = [];
  let daiHienTai = 0;
  const viTri = {};

  const them = (x) => {
    phan.push(x);
    daiHienTai += typeof x === 'string' ? x.length : x.length;
  };
  const doiTuong = (soHieu, than) => {
    viTri[soHieu] = daiHienTai;
    them(soHieu + ' 0 obj\n' + than + '\nendobj\n');
  };

  them('%PDF-1.4\n');
  them(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

  const soTrang = danhSachJpeg.length;
  if (!soTrang) throw new Error('Không có trang nào để gói vào PDF.');

  const maTrang = (i) => 4 + 2 * i;
  const maAnh   = (i) => 5 + 2 * i;
  const tongDoiTuong = 3 + 2 * soTrang;

  doiTuong(1, '<< /Type /Catalog /Pages 2 0 R >>');

  const kids = [];
  for (let i = 0; i < soTrang; i++) kids.push(maTrang(i) + ' 0 R');
  doiTuong(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + soTrang + ' >>');

  const noiDung = 'q\n' + so(rongPt) + ' 0 0 ' + so(caoPt) + ' 0 0 cm\n/Im0 Do\nQ\n';
  doiTuong(3, '<< /Length ' + noiDung.length + ' >>\nstream\n' + noiDung + 'endstream');

  for (let i = 0; i < soTrang; i++) {
    doiTuong(maTrang(i),
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + so(rongPt) + ' ' + so(caoPt) + ']' +
      ' /Resources << /XObject << /Im0 ' + maAnh(i) + ' 0 R >> >> /Contents 3 0 R >>');

    const jpeg = danhSachJpeg[i];
    viTri[maAnh(i)] = daiHienTai;
    them(maAnh(i) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + wPx +
         ' /Height ' + hPx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
         ' /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
    them(jpeg);
    them('\nendstream\nendobj\n');
  }

  const viTriXref = daiHienTai;
  let xref = 'xref\n0 ' + (tongDoiTuong + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= tongDoiTuong; i++) {
    xref += String(viTri[i]).padStart(10, '0') + ' 00000 n \n';
  }
  them(xref);
  them('trailer\n<< /Size ' + (tongDoiTuong + 1) + ' /Root 1 0 R >>\nstartxref\n' +
       viTriXref + '\n%%EOF\n');

  const gom = new Uint8Array(daiHienTai);
  let cho = 0;
  for (const x of phan) {
    if (typeof x === 'string') {
      for (let i = 0; i < x.length; i++) gom[cho + i] = x.charCodeAt(i) & 0xff;
      cho += x.length;
    } else {
      gom.set(x, cho);
      cho += x.length;
    }
  }
  return new Blob([gom], { type: 'application/pdf' });
}

export async function xuatAnhDoPhanGiaiCao(svgEl, tree, rongCm, dpi) {
  const { vbW, vbH } = docCoSoDoBatBuoc(svgEl);
  if (!(rongCm > 0)) throw new Error('Chưa nhập bề ngang khổ giấy.');
  if (!(dpi > 0)) throw new Error('Chưa chọn độ phân giải.');

  const { w, h } = tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH);
  kiemTranCanvas(w, h);

  const blob = await dungBlobPngTuSvg(svgEl, w, h, null,
                                      { banDoLon: banDoAnhLon(tree) });
  const rongMm = rongCm * 10;
  return {
    blob,
    tenFile: tenFileAnh(tree, 'png', Math.round(rongCm) + 'cm-' + dpi + 'dpi'),
    w,
    h,
    rongMm,
    caoMm: rongMm * (vbH / vbW),
  };
}

export async function xuatPdfDoPhanGiaiCao(svgEl, tree, rongCm, dpi) {
  const { vbW, vbH } = docCoSoDoBatBuoc(svgEl);
  if (!(rongCm > 0)) throw new Error('Chưa nhập bề ngang khổ giấy.');
  if (!(dpi > 0)) throw new Error('Chưa chọn độ phân giải.');

  const { w, h } = tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH);
  kiemTranCanvas(w, h);

  const jpegBlob = await dungBlobPngTuSvg(svgEl, w, h, 'image/jpeg',
                                          { banDoLon: banDoAnhLon(tree) });
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());

  const rongMm = rongCm * 10;
  const caoMm = rongMm * (vbH / vbW);
  return {
    blob: goiJpegThanhPdf(jpeg, w, h, rongMm, caoMm),
    tenFile: tenFileAnh(tree, 'pdf', Math.round(rongCm) + 'cm-' + dpi + 'dpi'),
    w,
    h,
    rongMm,
    caoMm,
  };
}

export function xemTruocNhieuTrang(svgEl, chuCaoMm, tenKho, nam, dpi) {
  const co = docCoSoDo(svgEl);
  if (!co || !(chuCaoMm > 0) || !(dpi > 0)) return null;
  const kho = KHO_GIAY[tenKho];
  if (!kho) return null;

  const [trangRongMm, trangCaoMm] = nam ? [kho[1], kho[0]] : [kho[0], kho[1]];
  const { rongMm, caoMm, mmMoiDonVi } = tinhKhoTuChuCao(co.vbW, co.vbH, chuCaoMm);
  const { cot, hang, tong } = tinhSoTrang(rongMm, caoMm, trangRongMm, trangCaoMm);

  return {
    rongMm, caoMm, mmMoiDonVi, cot, hang, tong, trangRongMm, trangCaoMm,
    wPx: Math.max(1, Math.round(trangRongMm / MM_MOI_INCH * dpi)),
    hPx: Math.max(1, Math.round(trangCaoMm / MM_MOI_INCH * dpi)),
  };
}

export async function xuatPdfNhieuTrang(svgEl, tree, tuyChon) {
  const { chuCaoMm, tenKho, nam, dpi, onTien } = tuyChon || {};
  const co = docCoSoDoBatBuoc(svgEl);
  const xem = xemTruocNhieuTrang(svgEl, chuCaoMm, tenKho, nam, dpi);
  if (!xem) throw new Error('Chưa đủ thông tin để xuất (chiều cao chữ, khổ giấy, độ phân giải).');

  kiemTranCanvas(xem.wPx, xem.hPx);

  const toRongDonVi = xem.trangRongMm / xem.mmMoiDonVi;
  const toCaoDonVi  = xem.trangCaoMm  / xem.mmMoiDonVi;

  const coAnhCanPx = Math.ceil(2 * PHOTO.banKinhTrenO * (xem.wPx / toRongDonVi));
  const banDoLon = banDoAnhLon(tree);

  const trang = [];
  for (let h = 0; h < xem.hang; h++) {
    for (let c = 0; c < xem.cot; c++) {
      const blob = await dungBlobPngTuSvg(svgEl, xem.wPx, xem.hPx, 'image/jpeg', {
        vungCat: {
          vbX: co.vbX + c * toRongDonVi,
          vbY: co.vbY + h * toCaoDonVi,
          vbW: toRongDonVi,
          vbH: toCaoDonVi,
        },
        coAnhCanPx,
        banDoLon,
      });
      trang.push(new Uint8Array(await blob.arrayBuffer()));
      if (typeof onTien === 'function') onTien(trang.length, xem.tong);
    }
  }

  return {
    blob: goiNhieuJpegThanhPdf(trang, xem.wPx, xem.hPx, xem.trangRongMm, xem.trangCaoMm),
    tenFile: tenFileAnh(tree, 'pdf',
                        chuCaoMm + 'mm-' + tenKho + (nam ? '-ngang' : '') + '-' + xem.tong + 'trang'),
    tong: xem.tong, cot: xem.cot, hang: xem.hang,
    rongMm: xem.rongMm, caoMm: xem.caoMm,
    trangRongMm: xem.trangRongMm, trangCaoMm: xem.trangCaoMm,
  };
}

export async function inAnhRaster(nguonAnh, rongMm, caoMm) {
  if (!nguonAnh || !(rongMm > 0) || !(caoMm > 0)) return;

  donDauVetIn();

  const khung = document.createElement('div');
  khung.id = ID_KHUNG_ANH_IN;
  khung.style.cssText =
    'position:fixed;left:-99999px;top:0;width:1px;height:1px;overflow:hidden';

  const anh = document.createElement('img');
  anh.alt = 'Sơ đồ gia phả';
  khung.append(anh);
  document.body.append(khung);

  await new Promise((xong) => {
    anh.onload = xong;
    anh.onerror = xong;
    anh.src = nguonAnh;
  });

  const soMm = (n) => n.toFixed(1) + 'mm';
  const cssIn = document.createElement('style');
  cssIn.id = ID_CSS_IN;
  cssIn.textContent =
    '@media print {' +
    'body * { visibility: hidden !important; }' +
    '#' + ID_KHUNG_ANH_IN + ', #' + ID_KHUNG_ANH_IN + ' * { visibility: visible !important; }' +
    '#' + ID_KHUNG_ANH_IN + ' {' +
      'position: absolute !important; inset: 0 !important;' +
      'left: 0 !important; top: 0 !important;' +
      'width: auto !important; height: auto !important;' +
      'overflow: visible !important; margin: 0 !important; padding: 0 !important;' +
    '}' +
    '#' + ID_KHUNG_ANH_IN + ' img {' +
      'display: block !important;' +
      'width: 100% !important; height: 100% !important;' +
      'object-fit: contain !important;' +
      'page-break-inside: avoid;' +
    '}' +
    '@page { size: ' + soMm(rongMm) + ' ' + soMm(caoMm) + '; margin: 0; }' +
    '}';
  document.head.append(cssIn);

  window.print();

  setTimeout(() => { cssIn.remove(); khung.remove(); }, 1000);
}

export function laManHinhMayTinh() {
  return Math.min(window.innerWidth, window.innerHeight) >= 500;
}

export function inSoDo(svgEl, idKhungIn, rongKhoLonMm) {
  if (!svgEl || !idKhungIn) return;

  const vb = svgEl.getAttribute('viewBox');
  if (!vb) return;
  const [, , vbW, vbH] = vb.split(/\s+/).map(Number);
  if (!(vbW > 0) || !(vbH > 0)) return;

  const khoLon = rongKhoLonMm > 0;
  let khoGiayCss, leTrangMm;

  if (khoLon) {
    const caoKhoLonMm = rongKhoLonMm * (vbH / vbW);
    khoGiayCss = rongKhoLonMm.toFixed(1) + 'mm ' + caoKhoLonMm.toFixed(1) + 'mm';
    leTrangMm = 0;
  } else {
    khoGiayCss = 'landscape';
    leTrangMm = LE_TRANG_MM;
  }

  donDauVetIn();

  const cssIn = document.createElement('style');
  cssIn.id = ID_CSS_IN;
  cssIn.textContent =
    '@media print {' +
    'body * { visibility: hidden !important; }' +
    '#' + idKhungIn + ', #' + idKhungIn + ' * { visibility: visible !important; }' +
    '#' + idKhungIn + ' {' +
      'position: absolute !important; inset: 0 !important;' +
      'width: auto !important; height: auto !important;' +
      'overflow: visible !important; padding: 0 !important;' +
      'display: block !important;' +
    '}' +
    '#' + idKhungIn + ' svg {' +
      'width: 100% !important; height: 100% !important;' +
      'page-break-inside: avoid;' +
    '}' +
    '@page { size: ' + khoGiayCss + '; margin: ' + leTrangMm + 'mm; }' +
    '}';
  document.head.append(cssIn);

  window.print();

  setTimeout(() => cssIn.remove(), 1000);
}

function donDauVetIn() {
  const cssCu = document.getElementById(ID_CSS_IN);
  if (cssCu) cssCu.remove();
  const khungCu = document.getElementById(ID_KHUNG_ANH_IN);
  if (khungCu) khungCu.remove();
}

function docCoSoDoBatBuoc(svgEl) {
  if (!svgEl) throw new Error('Chưa có sơ đồ để xuất.');
  const co = docCoSoDo(svgEl);
  if (!co) throw new Error('Sơ đồ chưa vẽ xong, thử lại sau.');
  return co;
}

export function docCoSoDo(svgEl) {
  if (!svgEl) return null;
  const vb = svgEl.getAttribute('viewBox');
  if (!vb) return null;
  const [vbX, vbY, vbW, vbH] = vb.split(/\s+/).map(Number);
  if (!(vbW > 0) || !(vbH > 0)) return null;
  return { vbX, vbY, vbW, vbH };
}

async function dungBlobPngTuSvg(svgEl, w, h, kieu, tuyChon) {
  const { vungCat, coAnhCanPx: coAnhCanPxNgoai, banDoLon } = tuyChon || {};
  const coGoc = docCoSoDoBatBuoc(svgEl);
  const { vbX, vbY, vbW, vbH } = vungCat || coGoc;

  const ban = svgEl.cloneNode(true);
  ban.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH);
  ban.setAttribute('width', String(vbW));
  ban.setAttribute('height', String(vbH));

  const nenNS = 'http://www.w3.org/2000/svg';
  const nen = document.createElementNS(nenNS, 'rect');
  nen.setAttribute('x', String(vbX));
  nen.setAttribute('y', String(vbY));
  nen.setAttribute('width', String(vbW));
  nen.setAttribute('height', String(vbH));
  nen.setAttribute('fill', NEN_SO_DO);
  ban.insertBefore(nen, ban.firstChild);

  await thayAnhBangDataUri(ban, coAnhCanPxNgoai ||
                                Math.ceil(2 * PHOTO.banKinhTrenO * (w / vbW)), banDoLon);

  const chuoiSvg = new XMLSerializer().serializeToString(ban);
  const svgBlob = new Blob([chuoiSvg], { type: 'image/svg+xml;charset=utf-8' });
  const duongSvg = URL.createObjectURL(svgBlob);

  const khung = document.createElement('canvas');
  khung.width = w;
  khung.height = h;
  const but = khung.getContext('2d');
  but.fillStyle = NEN_SO_DO;
  but.fillRect(0, 0, w, h);

  try {
    const anh = await napAnh(duongSvg);
    but.drawImage(anh, 0, 0, w, h);
  } finally {
    URL.revokeObjectURL(duongSvg);
  }

  return new Promise((resolve, reject) => {
    khung.toBlob(
      (b) => (b
        ? resolve(b)
        : reject(new Error('Trình duyệt không tạo được ảnh ' + w + '×' + h +
                           ' điểm ảnh — máy có thể không đủ bộ nhớ. ' +
                           'Hãy giảm độ phân giải hoặc bề ngang khổ giấy.'))),
      kieu || 'image/png',
      kieu === 'image/jpeg' ? 0.95 : undefined,
    );
  });
}

async function thayAnhBangDataUri(svgClone, coAnhCanPx, banDoLon) {
  const anhThat = Array.from(svgClone.querySelectorAll('image')).filter((el) => {
    const href = el.getAttribute('href') || '';
    return href.indexOf('http') === 0;
  });

  await Promise.all(anhThat.map(async (el) => {
    const href = xinBanToHon(el.getAttribute('href'), coAnhCanPx, banDoLon);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const dataUri = await new Promise((resolve, reject) => {
        const doc = new FileReader();
        doc.onloadend = () => resolve(doc.result);
        doc.onerror = () => reject(new Error('Không đọc được ảnh.'));
        doc.readAsDataURL(blob);
      });
      el.setAttribute('href', dataUri);
    } catch (e) {
      el.removeAttribute('href');
    }
  }));
}

function xinBanToHon(href, coAnhCanPx, banDoLon) {
  if (!href) return href;

  let ra = href;
  if (banDoLon && banDoLon.has(href)) {
    ra = banDoLon.get(href);
  } else if (banDoLon) {
    const m = href.match(/[?&]id=([^&]+)/) || href.match(/\/d\/([^=/?]+)/);
    const lon = m && banDoLon.get(decodeURIComponent(m[1]));
    if (lon) ra = ra.replace(m[1], encodeURIComponent(lon));
  }

  if (!(coAnhCanPx > 0)) return ra;
  const xin = Math.min(PHOTO.maxWidthLon, Math.max(200, Math.ceil(coAnhCanPx * 1.2)));
  return ra.replace(/([?&]sz=w)\d+/, '$1' + xin)
           .replace(/(=w)\d+$/, '$1' + xin);
}

function banDoAnhLon(tree) {
  const bang = new Map();
  const ds = tree && Array.isArray(tree.media) ? tree.media : [];
  for (const m of ds) {
    if (m && !m.deleted && m.driveFileId && m.driveFileIdLon) {
      bang.set(driveThumbUrl(m.driveFileId), driveThumbUrl(m.driveFileIdLon));
      bang.set(String(m.driveFileId), String(m.driveFileIdLon));
    }
  }
  return bang;
}

function napAnh(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không dựng được ảnh từ sơ đồ.'));
    img.src = src;
  });
}

function tenFileAnh(tree, duoi, duoiTen) {
  const t = new Date();
  const so = (n) => String(n).padStart(2, '0');
  const ngay = t.getFullYear() + so(t.getMonth() + 1) + so(t.getDate());
  const ten = tree && tree.tree && typeof tree.tree.name === 'string' ? tree.tree.name : '';
  const goc = boDauChoTenFile(ten).slice(0, 60) || 'gia-pha';
  return goc + '-so-do-' + ngay + (duoiTen ? '-' + duoiTen : '') + '.' + duoi;
}

export function veLinkTai(blob, tenFile, chuNut) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tenFile;
  a.textContent = chuNut;
  a.style.cssText =
    'display:block;width:100%;min-height:42px;margin-top:8px;padding:11px 14px;' +
    'box-sizing:border-box;text-align:center;text-decoration:none;font-size:14px;' +
    'font-weight:600;border-radius:9px;background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);' +
    'border:1px solid var(--sd-nut,#2a2622);touch-action:manipulation';
  return a;
}
