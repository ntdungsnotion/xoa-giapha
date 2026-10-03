import { N, hienNhan, dangKyDonDep } from './form-nen.js';
import { state } from '../state.js';
import { attachMedia, detachMedia, setPortrait, clearPortrait,
         getMediaFor, getPortrait } from '../domains/media.js';
import { mauVien } from '../domains/render.js';
import { loaiCua } from '../utils/id.js';
import { suaDuoc, taiAnh } from '../services/repo.js';
import { stampNow } from '../utils/date.js';
import { compressImage, driveThumbUrl, dataUri } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';
import { RONG_NUT_TOI_DA, PHOTO } from '../config.js';

dangKyDonDep(donDepAnh);

let khoiAnh = null;
let khoAnh = [];
let anhDaiDienKhoa = '';
let anhDangXet = '';
let demAnhMoi = 0;

let anhCuaAi = '';
let anhCoDaiDien = true;
let anhDangTai = false;

export function donDepAnh() {
  khoiAnh        = null;
  khoAnh         = [];
  anhCuaAi       = '';
  anhCoDaiDien   = true;
  anhDaiDienKhoa = '';
  anhDangXet     = '';
  demAnhMoi      = 0;
  anhDangTai     = false;
}

export function veKhoiAnh(subjectId, nen) {
  khoiAnh = document.createElement('div');
  anhCuaAi = String(subjectId);
  anhCoDaiDien = loaiCua(anhCuaAi) !== 'U';
  docKhoAnh(nen);
  veLaiKhoiAnh(nen);
  return khoiAnh;
}

function docKhoAnh(nguoi) {
  const cay = state.tree;

  khoAnh = getMediaFor(cay, anhCuaAi).map((m) => ({
    khoa:        m.id,
    mediaId:     m.id,
    driveFileId: m.driveFileId,
    caption:     m.caption || '',
    xemTruoc:    '',
    laMoi:       false,
    laLe:        false,
    boDi:        false,
  }));

  if (!anhCoDaiDien) { anhDangXet = ''; demAnhMoi = 0; anhDaiDienKhoa = ''; return; }

  const dd = getPortrait(cay, anhCuaAi);
  anhDaiDienKhoa = dd ? dd.id : '';

  const conTro = nguoi && typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId.trim() : '';
  if (!dd && conTro) {
    khoAnh.unshift({
      khoa: 'le', mediaId: '', driveFileId: conTro, caption: '',
      xemTruoc: '', laMoi: false, laLe: true, boDi: false,
    });
    anhDaiDienKhoa = 'le';
  }

  anhDangXet = '';
  demAnhMoi  = 0;
}

function veLaiKhoiAnh(nguoi) {
  const khoi = khoiAnh;
  if (!khoi) return;
  khoi.innerHTML = '';

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:12px;align-items:center';

  if (anhCoDaiDien) hang.append(veXemTruocAnh(nguoi));

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px';

  cot.append(nutChonAnh(nguoi));
  if (mucDaiDien()) cot.append(nutBoAnh(nguoi));

  hang.append(cot);
  khoi.append(hang);

  if (khoAnh.length > 0) khoi.append(veDaiAnh(nguoi));

  const loi = document.createElement('div');
  loi.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
  loi.textContent = moTaTrangThaiAnh(nguoi);
  khoi.append(loi);
}

function mucDaiDien() {
  if (!anhCoDaiDien || !anhDaiDienKhoa) return null;
  return khoAnh.find((a) => a.khoa === anhDaiDienKhoa && !a.boDi) || null;
}

function duongXemAnh(muc, co) {
  return muc.xemTruoc ? dataUri(muc.xemTruoc) : driveThumbUrl(muc.driveFileId, co * 2);
}

function veXemTruocAnh(nguoi) {
  const co = 72;
  const boc = document.createElement('div');
  boc.style.cssText =
    'flex:0 0 auto;width:' + co + 'px;height:' + co + 'px;border-radius:50%;' +
    'overflow:hidden;box-shadow:0 0 0 1.5px var(--sd-giay,#fff), 0 0 0 3px ' + mauVien(nguoi) + '55;' +
    'opacity:' + (anhDangTai ? '0.5' : '1');

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoi && nguoi.sex, mauVien(nguoi));
  boc.append(im);

  const dd = mucDaiDien();
  if (dd) datAnhKhiTaiXong(im, duongXemAnh(dd, co));

  return boc;
}

function datAnhKhiTaiXong(im, duong) {
  if (!duong) return;
  if (duong.indexOf('data:') === 0) { im.src = duong; return; }
  const thu = new Image();
  thu.onload = () => {
    if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
  };
  thu.src = duong;
}

function veDaiAnh(nguoi) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:12px';

  const nhan = document.createElement('div');
  nhan.textContent = 'Kho ảnh (' + khoAnh.filter((a) => !a.boDi).length + ')';
  nhan.style.cssText = 'font-size:12px;font-weight:600;color:var(--sd-chu-phu,#8a8078);margin-bottom:6px';
  boc.append(nhan);

  const dai = document.createElement('div');
  dai.id = 'giapha-dai-anh';
  dai.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
  for (const muc of khoAnh) dai.append(veTamAnh(muc, nguoi));
  boc.append(dai);

  const xet = khoAnh.find((a) => a.khoa === anhDangXet);
  if (xet) boc.append(veHangNutAnh(xet, nguoi));

  return boc;
}

function veTamAnh(muc, nguoi) {
  const co = 56;
  const laDD  = muc.khoa === anhDaiDienKhoa && !muc.boDi;
  const laXet = muc.khoa === anhDangXet;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.anh = muc.khoa;
  nut.disabled = anhDangTai || N.dangLuu;
  nut.style.cssText =
    'position:relative;width:' + co + 'px;height:' + co + 'px;padding:0;' +
    'border-radius:10px;overflow:hidden;cursor:pointer;touch-action:manipulation;' +
    'background:var(--sd-nen,#faf8f5);' +
    'border:2px solid ' + (laDD ? mauVien(nguoi) : (laXet ? 'var(--sd-vien-dam,#8a8078)' : 'var(--sd-vien,#e6e0d8)')) + ';' +
    'opacity:' + (muc.boDi ? '.35' : '1') + ';';

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoi && nguoi.sex, mauVien(nguoi));
  datAnhKhiTaiXong(im, duongXemAnh(muc, co));
  nut.append(im);

  if (laDD) nut.append(dauGocAnh('✓', mauVien(nguoi)));
  if (muc.boDi) nut.append(dauGocAnh('✕', 'var(--sd-do-dac,#8a3a2a)'));

  nut.addEventListener('click', () => {
    anhDangXet = (anhDangXet === muc.khoa) ? '' : muc.khoa;
    veLaiKhoiAnh(nguoi);
  });
  return nut;
}

function dauGocAnh(chu, mau) {
  const d = document.createElement('span');
  d.textContent = chu;
  d.style.cssText =
    'position:absolute;left:0;bottom:0;min-width:18px;height:18px;' +
    'display:flex;align-items:center;justify-content:center;font-size:12px;' +
    'color:var(--sd-nut-chu,#fffdf9);background:' + mau + ';border-radius:0 8px 0 8px';
  return d;
}

function veHangNutAnh(muc, nguoi) {
  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;padding:10px;' +
    'background:var(--sd-nen,#faf8f5);border-radius:10px';

  const batDuoc = suaDuoc() && !anhDangTai && !N.dangLuu;

  if (muc.boDi) {
    hang.append(nutNhoAnh('Giữ lại tấm này', batDuoc, false, () => {
      muc.boDi = false;
      veLaiKhoiAnh(nguoi);
    }));
  } else {
    if (anhCoDaiDien && muc.khoa !== anhDaiDienKhoa) {
      hang.append(nutNhoAnh('Đặt làm ảnh đại diện', batDuoc, false, () => {
        anhDaiDienKhoa = muc.khoa;
        veLaiKhoiAnh(nguoi);
      }));
    }
    if (!muc.laLe) {
      hang.append(nutNhoAnh('Gỡ khỏi kho ảnh', batDuoc, true, () => {
        muc.boDi = true;
        if (anhDaiDienKhoa === muc.khoa) anhDaiDienKhoa = '';
        veLaiKhoiAnh(nguoi);
      }));
    }
  }

  hang.append(nutNhoAnh('Thôi', true, false, () => {
    anhDangXet = '';
    veLaiKhoiAnh(nguoi);
  }));

  return hang;
}

function nutNhoAnh(chu, batDuoc, laDo, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'min-height:40px;padding:0 12px;font-size:13px;font-family:inherit;' +
    'border-radius:9px;border:1px solid var(--sd-vien,#e6e0d8);background:var(--sd-giay,#fffdf9);' +
    'color:' + (laDo ? 'var(--sd-do,#8a3a2a)' : 'var(--sd-chu,#2a2622)') + ';' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '.45') + ';touch-action:manipulation';
  if (batDuoc) b.addEventListener('click', chay);
  return b;
}

function nutChonAnh(nguoi) {
  const batDuoc = suaDuoc() && !anhDangTai && !N.dangLuu;

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:block;min-height:40px;padding:10px 12px;box-sizing:border-box;' +
    'font-size:14px;text-align:center;border-radius:9px;border:1px solid var(--sd-vien,#e6e0d8);' +
    'background:var(--sd-nen,#faf8f5);line-height:1.3;max-width:' + RONG_NUT_TOI_DA + ';' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45');
  nhan.textContent = anhDangTai
    ? 'Đang tải lên…'
    : (khoAnh.some((a) => !a.boDi) ? 'Thêm ảnh' : 'Chọn ảnh');

  const oFile = document.createElement('input');
  oFile.type = 'file';
  oFile.accept = 'image/*';
  oFile.disabled = !batDuoc;
  oFile.style.cssText = 'display:none';
  oFile.addEventListener('change', () => {
    const f = oFile.files && oFile.files[0];
    if (f) chonVaTaiAnh(f, nguoi);
  });

  nhan.append(oFile);
  return nhan;
}

function nutBoAnh(nguoi) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Bỏ ảnh đại diện';
  b.disabled = anhDangTai || N.dangLuu;
  b.style.cssText =
    'min-height:36px;padding:7px 12px;font-size:13px;font-family:inherit;' +
    'border-radius:9px;border:1px solid var(--sd-vien,#e6e0d8);background:var(--sd-giay,#fffdf9);color:var(--sd-do,#8a3a2a);' +
    'cursor:pointer;touch-action:manipulation;max-width:' + RONG_NUT_TOI_DA + ';';
  b.addEventListener('click', () => {
    anhDaiDienKhoa = '';
    veLaiKhoiAnh(nguoi);
  });
  return b;
}

function coAnhSauKhiLuu() {
  return !!mucDaiDien();
}

function moTaTrangThaiAnh(nguoi) {
  if (anhDangTai) return 'Đang nén và tải ảnh lên Google Drive…';

  const moi = khoAnh.filter((a) => a.laMoi && !a.boDi).length;
  const bo  = khoAnh.filter((a) => a.boDi && !a.laMoi).length;
  const dd  = mucDaiDien();

  const cau = [];
  if (moi > 0) {
    cau.push(moi === 1
      ? 'Một tấm đã lên Drive nhưng chưa vào gia phả.'
      : moi + ' tấm đã lên Drive nhưng chưa vào gia phả.');
  }
  if (bo > 0) {
    cau.push(bo === 1
      ? 'Một tấm sẽ được gỡ khỏi kho — bản ghi vẫn nằm lại trong file, file ảnh vẫn nằm nguyên trên Drive.'
      : bo + ' tấm sẽ được gỡ khỏi kho — bản ghi vẫn nằm lại trong file, file ảnh vẫn nằm nguyên trên Drive.');
  }
  if (dd && dd.laLe) {
    cau.push('Ảnh đại diện hiện nay không có bản ghi nào trong kho — bản ghi này ' +
             'nhập từ nơi khác, hoặc file đã bị sửa tay ngoài app.');
  }
  if (cau.length > 0) {
    cau.push('Bấm "Lưu" ở cuối form thì những việc trên mới thành thật.');
    return cau.join(' ');
  }

  if (khoAnh.length === 0) {
    return 'Chưa có ảnh. Sơ đồ đang vẽ bóng người theo giới tính. ' +
           'Ảnh được nén nhỏ lại trước khi gửi đi, không tải nguyên file gốc.';
  }
  if (!anhCoDaiDien) {
    return 'Ảnh của cặp này — ảnh cưới, ảnh cả nhà. Một cặp không có ảnh đại ' +
           'diện: sơ đồ vẽ mặt từng người, không vẽ ô nào của riêng cặp.';
  }
  if (!dd) {
    return 'Kho còn ảnh, nhưng không tấm nào đang làm đại diện — sơ đồ vẽ bóng ' +
           'người. Bấm một tấm rồi chọn "Đặt làm ảnh đại diện".';
  }
  return 'Bấm một tấm trong kho để đặt nó làm ảnh đại diện, hoặc gỡ nó ra.';
}

async function chonVaTaiAnh(file, nguoi) {
  anhDangTai = true;
  veLaiKhoiAnh(nguoi);

  try {
    const goc = stampNow().replace(/[^0-9]/g, '');
    const nen = await compressImage(file);
    const ten = 'anh_' + anhCuaAi + '_' + goc + '.jpg';
    const kq  = await taiAnh(nen.blob, ten);

    if (!kq || !kq.ok) {
      throw new Error((kq && kq.loi) ||
        'Máy chủ không nhận ảnh mà không nói rõ vì sao.');
    }

    let fileIdLon = '';
    let loiLon = '';
    try {
      const nenLon = await compressImage(file, {
        maxWidth: PHOTO.maxWidthLon, jpegQuality: PHOTO.jpegQualityLon,
      });
      const kqLon = await taiAnh(nenLon.blob, 'anh_' + anhCuaAi + '_' + goc + '_lon.jpg');
      if (kqLon && kqLon.ok) fileIdLon = kqLon.fileId;
      else loiLon = (kqLon && kqLon.loi) || 'máy chủ không nhận';
    } catch (e) {
      loiLon = e && e.message ? e.message : String(e);
    }

    demAnhMoi += 1;
    const khoa = 'moi-' + demAnhMoi;
    khoAnh.unshift({
      khoa, mediaId: '', driveFileId: kq.fileId, driveFileIdLon: fileIdLon,
      caption: '', xemTruoc: nen.base64, laMoi: true, laLe: false, boDi: false,
    });
    if (anhCoDaiDien) anhDaiDienKhoa = khoa;
    anhDangXet = '';

    anhDangTai = false;
    veLaiKhoiAnh(nguoi);
    if (N.khoiKetQua) N.khoiKetQua.innerHTML = '';
    if (loiLon) {
      hienNhan('Đã tải ảnh lên, nhưng KHÔNG tải được bản lớn dùng để in (' +
               loiLon + '). Ảnh vẫn hiện đủ trên màn hình; in khổ lớn sẽ kém ' +
               'nét. Gỡ tấm này rồi tải lại nếu cần in.', true);
    }
  } catch (e) {
    anhDangTai = false;
    veLaiKhoiAnh(nguoi);
    hienNhan('Chưa tải được ảnh lên: ' + (e && e.message ? e.message : String(e)), true);
  }
}

export function apThayDoiAnh(cay, subjectId, ghiNhan) {
  const personId = subjectId;
  let tree = cay;
  const themVao = [];
  const goRa    = [];
  const diff    = {};
  const maThat  = new Map();

  for (const a of khoAnh) {
    if (!a.laMoi || a.boDi) continue;
    const kq = attachMedia(tree, personId, a.driveFileId, a.caption, ghiNhan,
                           a.driveFileIdLon);
    if (!kq) continue;
    tree = kq.tree;
    themVao.push(kq.media);
    Object.assign(diff, kq.diff);
    maThat.set(a.khoa, kq.media.id);
  }

  for (const a of khoAnh) {
    if (a.laMoi || a.laLe || !a.boDi || !a.mediaId) continue;
    const kq = detachMedia(tree, a.mediaId, ghiNhan);
    if (!kq) continue;
    tree = kq.tree;
    goRa.push(kq.media);
    Object.assign(diff, kq.diff);
  }

  const dd = anhCoDaiDien ? mucDaiDien() : null;
  if (!anhCoDaiDien) {
    if (Object.keys(diff).length === 0) return null;
    return { tree, person: null, themVao, goRa, diff };
  }
  if (dd && dd.laLe) {
  } else if (dd) {
    const ma = dd.laMoi ? maThat.get(dd.khoa) : dd.mediaId;
    const kq = ma ? setPortrait(tree, personId, ma, ghiNhan) : null;
    if (kq) { tree = kq.tree; Object.assign(diff, kq.diff); }
  } else {
    const kq = clearPortrait(tree, personId, ghiNhan);
    if (kq) { tree = kq.tree; Object.assign(diff, kq.diff); }
  }

  if (Object.keys(diff).length === 0) return null;

  const nguoi = (Array.isArray(tree.persons) ? tree.persons : [])
    .find((p) => p && p.id === personId) || null;

  return { tree, person: nguoi, themVao, goRa, diff };
}

export function keThayDoiAnh(anh) {
  if (!anh) return '';
  const phan = [];
  if (anh.themVao.length > 0) phan.push('thêm ' + anh.themVao.length + ' ảnh');
  if (anh.goRa.length > 0)    phan.push('gỡ ' + anh.goRa.length + ' ảnh');
  const doiMat = Object.keys(anh.diff).some((k) => k.endsWith('.photoFileId'));
  if (doiMat) phan.push(coAnhSauKhiLuu() ? 'đổi ảnh đại diện' : 'bỏ ảnh đại diện');
  return phan.length > 0 ? ' Kho ảnh: ' + phan.join(', ') + '.' : '';
}
