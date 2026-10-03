import { PHOTO } from '../config.js';
import { SUPABASE_URL, KHO_ANH } from '../cau-hinh.js';

export async function compressImage(file, tuyChon = {}) {
  if (!file) throw new Error('Chưa chọn file ảnh nào.');

  const maxWidth = so(tuyChon.maxWidth, PHOTO.maxWidth);
  const chatLuong = so(tuyChon.jpegQuality, PHOTO.jpegQuality);

  const anh = await doAnh(file);
  const { rong, cao } = coSauKhiThuNho(anh.rong, anh.cao, maxWidth);

  const khung = document.createElement('canvas');
  khung.width = rong;
  khung.height = cao;

  const but = khung.getContext('2d');
  but.fillStyle = '#ffffff';
  but.fillRect(0, 0, rong, cao);
  but.drawImage(anh.nguon, 0, 0, rong, cao);

  if (typeof anh.donDep === 'function') anh.donDep();

  const base64 = khung.toDataURL('image/jpeg', chatLuong);
  const phan = boTienTo(base64);
  const blob = await new Promise((xong) => khung.toBlob(xong, 'image/jpeg', chatLuong));
  if (!blob) throw new Error('Trình duyệt không nén được tấm ảnh này.');

  return {
    blob,
    base64: phan,
    mime: 'image/jpeg',
    rong,
    cao,
    byteGoc: typeof file.size === 'number' ? file.size : 0,
    byteNen: soByteCuaBase64(phan),
    daiBase64: phan.length,
  };
}

export function driveThumbUrl(duongDan, size = PHOTO.thumbSize) {
  if (!duongDan) return '';
  const ky = CHU_KY.get(String(duongDan));
  if (ky) return ky;
  return SUPABASE_URL.replace(/\/$/, '') +
    '/storage/v1/object/public/' + KHO_ANH + '/' +
    String(duongDan).split('/').map(encodeURIComponent).join('/');
}

const CHU_KY = new Map();

export function ghiChuKy(bang) {
  if (!bang) return;
  for (const [duong, url] of bang) if (duong && url) CHU_KY.set(duong, url);
}

export function thieuChuKy(dsDuongDan) {
  return (dsDuongDan || []).filter((d) => d && !CHU_KY.has(String(d)));
}

export function driveLh3Url(duongDan, size = PHOTO.thumbSize) {
  return driveThumbUrl(duongDan, size);
}

export function dataUri(base64, mime = 'image/jpeg') {
  if (!base64) return '';
  return 'data:' + mime + ';base64,' + base64;
}

export function moTaCo(soByte) {
  const n = Number(soByte);
  if (!isFinite(n) || n <= 0) return '0 KB';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
}

async function doAnh(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bm = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        nguon: bm,
        rong: bm.width,
        cao: bm.height,
        donDep: () => { if (typeof bm.close === 'function') bm.close(); },
      };
    } catch (e) {
    }
  }
  return doAnhBangThe(file);
}

function doAnhBangThe(file) {
  return new Promise((thanhCong, thatBai) => {
    const duong = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => thanhCong({
      nguon: im,
      rong: im.naturalWidth,
      cao: im.naturalHeight,
      donDep: () => URL.revokeObjectURL(duong),
    });
    im.onerror = () => {
      URL.revokeObjectURL(duong);
      thatBai(new Error(
        'Trình duyệt không mở được file này như một tấm ảnh. ' +
        'Ảnh iPhone định dạng HEIC thường gặp lỗi này — chọn lại bằng ' +
        'định dạng JPG hoặc PNG.'
      ));
    };
    im.src = duong;
  });
}

function coSauKhiThuNho(rong, cao, maxWidth) {
  const canhDai = Math.max(rong, cao);
  if (!canhDai || canhDai <= maxWidth) {
    return { rong: Math.max(1, rong), cao: Math.max(1, cao) };
  }
  const ti = maxWidth / canhDai;
  return {
    rong: Math.max(1, Math.round(rong * ti)),
    cao: Math.max(1, Math.round(cao * ti)),
  };
}

function boTienTo(chuoi) {
  const s = String(chuoi || '');
  const dau = s.indexOf(',');
  return dau === -1 ? s : s.slice(dau + 1);
}

function soByteCuaBase64(chuoi) {
  const s = String(chuoi || '');
  if (!s.length) return 0;
  let dem = 0;
  if (s.endsWith('==')) dem = 2;
  else if (s.endsWith('=')) dem = 1;
  return Math.max(0, Math.floor(s.length * 3 / 4) - dem);
}

function so(giaTri, macDinh) {
  const n = Number(giaTri);
  return isFinite(n) && n > 0 ? n : macDinh;
}
