import { state } from '../state.js';
import { suaDuoc } from '../services/repo.js';
import { getAlternateNames } from '../domains/person.js';
import { getParentUnions, rankCua } from '../domains/union.js';
import { getMediaFor } from '../domains/media.js';
import { mauVien } from '../domains/render.js';
import { fullName, coGiaTri, doiSongNguoi, ngayGio } from '../utils/text.js';
import { formatDate, calcAge } from '../utils/date.js';
import { driveThumbUrl } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';
import { veBieuTuongTron } from '../utils/glyph.js';
import { nhanLoaiTenPhu, chuThichQuanHe,
         rongHop, caoHop, leLopPhu } from '../config.js';

let lopPhu = null;

let theDangMo = null;

const GIOI = { M: 'Nam', F: 'Nữ' };

let hienMucTrong = false;

const KIEU_LOP_PHU =
  'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
  'display:flex;align-items:center;justify-content:center;' +
  'padding:' + leLopPhu() + ';' +
  'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

const KIEU_HOP =
  'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
  'width:100%;max-width:' + rongHop(360, 620) + ';' +
  'max-height:' + caoHop(82) + ';overflow:auto;' +
  'box-shadow:0 8px 32px rgba(42,38,34,.28);-webkit-overflow-scrolling:touch;'

export function openPersonDetail(personId, xuLy = {}) {
  closePersonDetail();

  const index = state.index;
  const p = index && index.personById.get(personId);
  if (!p) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const the = document.createElement('div');
  the.id = 'giapha-the-nguoi';
  the.style.cssText = KIEU_HOP;

  theDangMo = { loai: 'nguoi', ma: personId, xuLy };

  the.append(...veDauThe(p), ...veHangThongTin(p));
  the.append(...veDaiAnhThe(personId, p));
  the.append(...veQuanHe(index, p, xuLy));
  the.append(veChanThe(p, xuLy));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonDetail(); });
  lopPhu.append(the);
  document.body.append(lopPhu);
}

export function closePersonDetail() {
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  theDangMo = null;
}

let anhDangXemTren = '';
let anhDangXemCua  = '';

function veDaiAnhThe(subjectId, nguoiNen) {
  const ds = getMediaFor(state.tree, subjectId);
  if (ds.length === 0) return [];

  const boc = document.createElement('div');
  boc.id = 'giapha-dai-anh-the';
  boc.style.cssText = 'margin-top:10px';

  const dai = document.createElement('div');
  dai.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
  for (const m of ds) dai.append(veTamAnhThe(m, nguoiNen, subjectId));
  boc.append(dai);

  const mo = (anhDangXemCua === subjectId)
    ? ds.find((m) => m.id === anhDangXemTren)
    : null;
  if (mo) boc.append(veAnhTo(mo, nguoiNen));

  const nhan = document.createElement('div');
  nhan.textContent = 'Ảnh (' + ds.length + ')';
  nhan.style.cssText =
    'margin-top:14px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078)';

  return [nhan, boc];
}

function veTamAnhThe(m, nguoiNen, subjectId) {
  const co = 56;
  const laMat = laAnhDaiDien(m, subjectId);

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.anh = m.id;
  nut.style.cssText =
    'position:relative;width:' + co + 'px;height:' + co + 'px;padding:0;' +
    'border-radius:10px;overflow:hidden;cursor:pointer;touch-action:manipulation;' +
    'background:var(--sd-nen,#faf8f5);border:2px solid ' +
    (m.id === anhDangXemTren && anhDangXemCua === subjectId
      ? 'var(--sd-vien-dam,#8a8078)'
      : (laMat ? mauVien(nguoiNen) : 'var(--sd-vien,#e6e0d8)')) + ';';

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoiNen && nguoiNen.sex, mauVien(nguoiNen));
  taiAnhVaoThe(im, driveThumbUrl(m.driveFileId, co * 2));
  nut.append(im);

  if (laMat) {
    const dau = document.createElement('span');
    dau.textContent = '✓';
    dau.style.cssText =
      'position:absolute;left:0;bottom:0;min-width:18px;height:18px;' +
      'display:flex;align-items:center;justify-content:center;font-size:12px;' +
      'color:var(--sd-nut-chu,#fffdf9);background:' + mauVien(nguoiNen) + ';border-radius:0 8px 0 8px';
    nut.append(dau);
  }

  if (coGiaTri(m.caption)) nut.title = String(m.caption);

  nut.addEventListener('click', () => {
    const dangMo = anhDangXemTren === m.id && anhDangXemCua === subjectId;
    anhDangXemTren = dangMo ? '' : m.id;
    anhDangXemCua  = dangMo ? '' : subjectId;
    veLaiTheDangMo();
  });
  return nut;
}

function veAnhTo(m, nguoiNen) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:8px';

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText =
    'width:100%;max-height:52vh;object-fit:contain;display:block;' +
    'border-radius:10px;background:var(--sd-nen,#faf8f5)';
  im.src = anhMacDinhUri(nguoiNen && nguoiNen.sex, mauVien(nguoiNen));
  taiAnhVaoThe(im, driveThumbUrl(m.driveFileIdLon || m.driveFileId, 1200));
  boc.append(im);

  if (coGiaTri(m.caption)) {
    const chu = document.createElement('div');
    chu.textContent = String(m.caption);
    chu.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:5px';
    boc.append(chu);
  }
  return boc;
}

function taiAnhVaoThe(im, duong) {
  if (!duong) return;
  const thu = new Image();
  thu.onload = () => {
    if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
  };
  thu.src = duong;
}

function laAnhDaiDien(m, subjectId) {
  const p = state.index && state.index.personById.get(subjectId);
  if (!p) return false;
  const cu = typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  return !!cu && cu === m.driveFileId;
}

function veLaiTheDangMo() {
  if (!theDangMo) return;
  const hop = lopPhu && lopPhu.firstElementChild;
  const cuon = hop ? hop.scrollTop : 0;
  const { loai, ma, xuLy } = theDangMo;
  if (loai === 'nguoi') openPersonDetail(ma, xuLy);
  else openUnionDetail(ma, xuLy);
  const hopMoi = lopPhu && lopPhu.firstElementChild;
  if (hopMoi) hopMoi.scrollTop = cuon;
}

export function openUnionDetail(unionId, xuLy = {}) {
  closePersonDetail();

  const index = state.index;
  const u = index && index.unionById && index.unionById.get(unionId);
  if (!u) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const the = document.createElement('div');
  the.id = 'giapha-the-cap';
  the.style.cssText = KIEU_HOP;

  theDangMo = { loai: 'cap', ma: unionId, xuLy };

  the.append(...veDauTheCap(u));
  the.append(...veDaiAnhThe(unionId, null));
  the.append(...veHangThongTinCap(u));
  the.append(...veNguoiTrongCap(index, u, xuLy));
  the.append(veChanTheCap(u, xuLy));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonDetail(); });
  lopPhu.append(the);
  document.body.append(lopPhu);
}

function veDauTheCap(u) {
  const index = state.index;
  const ds = (Array.isArray(u.partners) ? u.partners : [])
    .map((id) => id && timNguoiThe(index, id))
    .filter(Boolean);

  const dau = document.createElement('div');
  dau.style.cssText = 'display:flex;gap:12px;align-items:flex-start';

  if (ds.length > 0) {
    const cumAnh = document.createElement('div');
    cumAnh.style.cssText = 'flex:0 0 auto;display:flex';
    ds.forEach((p, i) => {
      const a = veAnhTron(p, 52);
      if (i > 0) a.style.marginLeft = '-14px';
      cumAnh.append(a);
    });
    dau.append(cumAnh);
  }

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0';

  const ten = document.createElement('div');
  ten.textContent = ds.length > 0
    ? ds.map(fullName).join('  và  ')
    : '(cặp chưa có ai)';
  ten.style.cssText = 'font-size:18px;font-weight:600;line-height:1.3';
  cot.append(ten);

  const soCon = conKeDuoc(index, u).length;
  if (soCon > 0) {
    const d = document.createElement('div');
    d.textContent = soCon + ' người con';
    d.style.cssText = 'font-size:14px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
    cot.append(d);
  }

  const ma = document.createElement('div');
  ma.textContent = u.id;
  ma.style.cssText = 'font-size:11px;color:var(--sd-chu-mo,#b3aaa0);margin-top:4px;letter-spacing:.05em';
  cot.append(ma);

  dau.append(cot);
  return [dau];
}

function veHangThongTinCap(u) {
  const bang = document.createElement('div');
  bang.style.cssText = 'margin-top:14px;display:flex;flex-direction:column;gap:1px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'margin-top:8px;padding:0;font:inherit;font-size:12px;color:var(--sd-vang,#8a6a3a);' +
    'background:none;border:none;text-decoration:underline;cursor:pointer;' +
    'touch-action:manipulation;align-self:flex-start';

  const veLaiBang = () => {
    bang.innerHTML = '';
    let soTrong = 0;
    const hang = (nhan, giaTri, coTheDai) => {
      if (veHang(bang, nhan, giaTri, coTheDai)) soTrong++;
    };

    const m = (u && typeof u.marriage === 'object' && u.marriage) ? u.marriage : {};
    hang('Ngày cưới', ghepNgayNoi(m));
    hang('Tình trạng hôn nhân', u.status === 'divorced' ? 'Đã ly hôn' : 'Đang là vợ chồng');
    hang('Ghi chú', u.note, true);

    nut.style.display = soTrong === 0 ? 'none' : '';
    nut.textContent = hienMucTrong
      ? 'Ẩn ' + soTrong + ' mục chưa điền'
      : 'Còn ' + soTrong + ' mục chưa điền';
    nut.setAttribute('aria-label',
      (hienMucTrong ? 'Ẩn ' : 'Hiện ') + soTrong + ' mục chưa điền');
  };

  nut.addEventListener('click', () => { hienMucTrong = !hienMucTrong; veLaiBang(); });
  veLaiBang();

  return [bang, nut];
}

function veNguoiTrongCap(index, u, xuLy) {
  const ra = [];

  const banDoi = [];
  for (const id of Array.isArray(u.partners) ? u.partners : []) {
    themNguoi(banDoi, index, id, '');
  }

  const con = conKeDuoc(index, u)
    .sort((a, b) => soThuTu(a) - soThuTu(b));

  const dsCon = [];
  for (const c of con) {
    themNguoi(dsCon, index, c.personId, chuThichQuanHe(c.relation || 'birth', 'con'));
  }

  ra.push(...veNhom('Vợ / chồng', banDoi, xuLy));
  ra.push(...veNhom('Con', dsCon, xuLy,
                    nutThemConVaoCap(u, xuLy), nutSuaConTrongCap(u, xuLy)));

  if (dsCon.length === 0) {
    const trong = document.createElement('div');
    trong.textContent = 'Cặp này chưa có người con nào trong gia phả.';
    trong.style.cssText =
      'margin-top:14px;font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078)';
    ra.push(trong);
    const them = nutThemConVaoCap(u, xuLy);
    if (them) { them.style.marginTop = '6px'; ra.push(them); }
  }

  return ra;
}

function soThuTu(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

function nutThemConVaoCap(u, xuLy) {
  if (!xuLy || !xuLy.onThemCon) return null;
  if (!suaDuoc()) return null;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'them-con';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:9px 11px;font-family:inherit;' +
    'font-size:13px;color:var(--sd-chu-phu,#8a8078);border:1px dashed var(--sd-vien,#e6e0d8);border-radius:8px;' +
    'background:none;cursor:pointer;touch-action:manipulation';
  nut.textContent = 'Thêm một người con vào gia đình này';

  nut.addEventListener('click', () => {
    closePersonDetail();
    xuLy.onThemCon(u.id);
  });
  return nut;
}

function nutSuaConTrongCap(u, xuLy) {
  if (!xuLy || !xuLy.onSuaCon) return null;
  if (!suaDuoc()) return null;

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;
  if (soCon === 0) return null;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'sua-con';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:9px 11px;font-family:inherit;' +
    'font-size:13px;color:var(--sd-chu-phu,#8a8078);border:1px dashed var(--sd-vien,#e6e0d8);border-radius:8px;' +
    'background:none;cursor:pointer;touch-action:manipulation';
  nut.textContent = soCon === 1
    ? 'Sửa người con này — chuyển sang gia đình khác, đổi con đẻ / con nuôi'
    : 'Sửa một người con — chuyển sang gia đình khác, đổi con đẻ / con nuôi';

  nut.addEventListener('click', () => {
    closePersonDetail();
    xuLy.onSuaCon(u.id);
  });
  return nut;
}

function veChanTheCap(u, xuLy) {
  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:16px';

  const mocId = (Array.isArray(u.partners) ? u.partners : [])
    .find((id) => id && state.index.personById.has(id)) || '';

  if (suaDuoc() && xuLy.onSuaCap && mocId) {
    chan.append(nutChan('Sửa gia đình này', true,
      () => { closePersonDetail(); xuLy.onSuaCap(mocId, u.id); }));
  }

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;
  if (suaDuoc() && xuLy.onSapThuTu && soCon >= 2 && mocId) {
    chan.append(nutChan('Sắp thứ tự các con', false,
      () => { closePersonDetail(); xuLy.onSapThuTu(mocId, 'con'); }));
  }

  chan.append(nutChan('Đóng', false, () => closePersonDetail()));

  const boc = document.createElement('div');
  boc.append(chan);
  const xoa = nutXoaCap(u, xuLy);
  if (xoa) boc.append(xoa);
  return boc;
}

function nutXoaCap(u, xuLy) {
  if (!xuLy || !xuLy.onXoaCap) return null;
  if (!suaDuoc()) return null;

  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:14px;border-top:1px solid var(--sd-vien-nhat,#f0ebe4);padding-top:12px';

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;

  const giai = document.createElement('div');
  giai.textContent = soCon > 0
    ? 'Xoá gia đình này KHÔNG xoá ai cả — hai người vẫn nguyên trong gia phả, ' +
      'chỉ thôi làm vợ chồng và thôi làm cha mẹ của ' + soCon + ' người con ' +
      'đứng dưới. Lấy lại được từ thùng rác.'
    : 'Xoá gia đình này KHÔNG xoá ai cả — hai người vẫn nguyên trong gia phả, ' +
      'chỉ thôi làm vợ chồng. Lấy lại được từ thùng rác.';
  giai.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-bottom:8px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'xoa-cap';
  nut.textContent = 'Xoá gia đình này khỏi gia phả';
  nut.style.cssText =
    'display:block;width:100%;min-height:44px;padding:8px 14px;font-size:14px;' +
    'font-family:inherit;text-align:center;border-radius:9px;cursor:pointer;' +
    'touch-action:manipulation;' +
    'background:var(--sd-do-nen,#fbf0ec);color:var(--sd-do,#8a3a2a);border:1px solid var(--sd-do-vien,#f0d8d0);font-weight:600';

  nut.addEventListener('click', () => { closePersonDetail(); xuLy.onXoaCap(u.id); });

  boc.append(giai, nut);
  return boc;
}

function veDauThe(p, coAnh = true) {
  const ra = [];

  const dau = document.createElement('div');
  dau.style.cssText = 'display:flex;gap:12px;align-items:flex-start';

  if (coAnh) dau.append(veAnhTron(p, 60));

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0';

  const ten = document.createElement('div');
  ten.textContent = fullName(p);
  ten.style.cssText = 'font-size:19px;font-weight:600;line-height:1.3';
  cot.append(ten);

  const song = doiSongNguoi(p);
  if (coGiaTri(song)) {
    const d = document.createElement('div');
    d.textContent = song;
    d.style.cssText = 'font-size:14px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
    cot.append(d);
  }

  const ma = document.createElement('div');
  ma.textContent = p.id;
  ma.style.cssText = 'font-size:11px;color:var(--sd-chu-mo,#b3aaa0);margin-top:4px;letter-spacing:.05em';
  cot.append(ma);

  const doiChu = doiCua(p);
  if (doiChu) {
    const doi = document.createElement('div');
    doi.textContent = 'Đời ' + doiChu;
    doi.style.cssText = 'font-size:11px;color:var(--sd-chu-mo,#b3aaa0);margin-top:2px;letter-spacing:.05em';
    cot.append(doi);
  }

  dau.append(cot);
  ra.push(dau);

  return ra;
}

function veAnhTron(p, co) {
  const boc = document.createElement('div');
  boc.style.cssText =
    'flex:0 0 auto;width:' + co + 'px;height:' + co + 'px;border-radius:50%;' +
    'overflow:hidden;box-shadow:0 0 0 1.5px var(--sd-giay,#ffffff), 0 0 0 3px ' + mauVien(p) + '55';

  const im = document.createElement('img');
  im.src = anhMacDinhUri(p && p.sex, mauVien(p));
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  boc.append(im);

  const anhThat = p && typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, co * 2);
    const thu = new Image();
    thu.onload = () => {
      if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
    };
    thu.src = duong;
  }

  return boc;
}

function veHangThongTin(p) {
  const bang = document.createElement('div');
  bang.style.cssText = 'margin-top:14px;display:flex;flex-direction:column;gap:1px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'margin-top:8px;padding:0;font:inherit;font-size:12px;color:var(--sd-vang,#8a6a3a);' +
    'background:none;border:none;text-decoration:underline;cursor:pointer;' +
    'touch-action:manipulation;align-self:flex-start';

  const veLaiBang = () => {
    bang.innerHTML = '';
    const soTrong = doDayBang(bang, p);
    nut.style.display = soTrong === 0 ? 'none' : '';
    nut.textContent = hienMucTrong
      ? 'Ẩn ' + soTrong + ' mục chưa điền'
      : 'Còn ' + soTrong + ' mục chưa điền';
    nut.setAttribute('aria-label',
      (hienMucTrong ? 'Ẩn ' : 'Hiện ') + soTrong + ' mục chưa điền');
  };

  nut.addEventListener('click', () => { hienMucTrong = !hienMucTrong; veLaiBang(); });
  veLaiBang();

  const ra = [bang, nut];

  if (state.daLocNguoiConSong && state.nguoiBiChe && state.nguoiBiChe.has(p.id)) {
    const nhac = document.createElement('div');
    nhac.textContent =
      'Người này còn sống nên máy chủ đã lược bớt chi tiết trước khi gửi về. ' +
      'Đây không phải là gia phả thiếu thông tin.';
    nhac.style.cssText =
      'margin-top:12px;padding:8px 10px;font-size:12px;line-height:1.5;' +
      'color:var(--sd-chu-phu,#8a8078);background:var(--sd-nen,#faf8f5);border-radius:8px';
    ra.push(nhac);
  }

  return ra;
}

function doDayBang(bang, p) {
  let soTrong = 0;
  const hang = (nhan, giaTri, coTheDai) => {
    if (veHang(bang, nhan, giaTri, coTheDai)) soTrong++;
  };

  const tenKhac = getAlternateNames(p)
    .map((n) => n.ten + (coGiaTri(n.loai) ? ' (' + nhanLoaiTenPhu(n.loai) + ')' : ''))
    .join(' · ');

  hang('Tên khác', tenKhac);
  hang('Giới tính', GIOI[p.sex] || '');
  hang('Sinh', ghepNgayNoi(p.birth));
  hang('Mất', ghepNgayNoi(p.death));
  hang('An táng', p.burialPlace);
  hang('Ngày giỗ', ngayGio(p));
  hang(tuoiTho(p).nhan, tuoiTho(p).giaTri);

  hang('Chức tước', p.title);
  hang('Nghề nghiệp', p.occupation);
  hang('Học vấn', p.education);
  hang('Quê quán', p.residence);
  hang('Dân tộc', p.nationality);
  hang('Tôn giáo', p.religion);
  hang('Liên hệ', p.contact);
  hang('Đời', doiCua(p));
  hang('Chi / nhánh', p.vn && p.vn.branch);

  hang('Ghi chú', p.note, true);

  return soTrong;
}

function doiCua(p) {
  const n = p && state.doi ? state.doi.get(p.id) : null;
  return n ? ('thứ ' + n) : '';
}

function ghepNgayNoi(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return '';
  return [formatDate(khoiNgay), khoiNgay.place].filter(coGiaTri).join(' · ');
}

function tuoiTho(p) {
  const t = calcAge(p.birth, p.death, p.living === true);
  if (!t) return { nhan: 'Tuổi', giaTri: '' };
  return {
    nhan: t.denHomNay ? 'Tuổi' : 'Hưởng thọ',
    giaTri: (t.xapXi ? 'khoảng ' : '') + t.tuoi + ' tuổi',
  };
}

function veHang(bang, nhan, giaTri, coTheDai) {
  const trong = !coGiaTri(giaTri);
  if (trong && !hienMucTrong) return true;

  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;gap:10px;align-items:baseline;padding:6px 0;' +
    'border-top:1px solid var(--sd-vien-nhat,#f0ebe4)';

  const n = document.createElement('div');
  n.textContent = nhan;
  n.style.cssText = 'flex:0 0 72px;font-size:12px;line-height:1.35;' +
    (trong ? 'color:var(--sd-chu-mo,#c4bcb2)' : 'color:var(--sd-chu-phu,#8a8078)');

  const g = document.createElement('div');
  g.style.cssText = 'flex:1 1 auto;font-size:14px;line-height:1.45;word-break:break-word' +
    (trong ? ';color:var(--sd-chu-mo,#c4bcb2)' : '');

  if (trong) {
    g.textContent = '—';
  } else {
    const chu = String(giaTri).trim();
    if (coTheDai) thuGonChu(g, chu); else g.textContent = chu;
  }

  hang.append(n, g);
  bang.append(hang);
  return trong;
}

const DAI_TOI_DA = 180;

function thuGonChu(vao, chu) {
  if (chu.length <= DAI_TOI_DA) { vao.textContent = chu; return; }

  let cat = chu.lastIndexOf(' ', DAI_TOI_DA);
  if (cat < DAI_TOI_DA / 2) cat = DAI_TOI_DA;

  const doan = document.createElement('span');
  doan.textContent = chu.slice(0, cat) + '… ';

  const them = document.createElement('button');
  them.type = 'button';
  them.textContent = 'xem thêm';
  them.style.cssText =
    'padding:0;font:inherit;font-size:13px;color:var(--sd-vang,#8a6a3a);background:none;' +
    'border:none;text-decoration:underline;cursor:pointer;touch-action:manipulation';
  them.addEventListener('click', () => {
    vao.textContent = chu;
  });

  vao.append(doan, them);
}

function veQuanHe(index, p, xuLy) {
  const ra = [];
  const chaMe = [];
  const banDoi = [];
  const con = [];

  for (const unionId of index.unionsAsChild.get(p.id) || []) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    const muc = (Array.isArray(u.children) ? u.children : [])
      .find((c) => c && c.personId === p.id);
    const ghiChu = chuThichQuanHe((muc && muc.relation) || 'birth', 'chaMe');
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      themNguoi(chaMe, index, id, ghiChu);
    }
  }

  for (const unionId of index.unionsAsPartner.get(p.id) || []) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (id !== p.id) themNguoi(banDoi, index, id, ghiChuHonNhan(u, p.id));
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      themNguoi(con, index, c && c.personId,
                chuThichQuanHe((c && c.relation) || 'birth', 'con'));
    }
  }

  ra.push(...veNhom('Cha mẹ', chaMe, xuLy));
  ra.push(...veNhom('Vợ/chồng', banDoi, xuLy));
  ra.push(...veNhom('Con', con, xuLy));
  return ra;
}

function ghiChuHonNhan(u, personId) {
  const phan = [];
  if (u.status === 'divorced') phan.push('đã ly hôn');
  const th = rankCua(u, personId);
  if (th > 1) phan.push('thứ ' + th);
  return phan.join(', ');
}

function themNguoi(vao, index, id, ghiChu) {
  if (!id || !timNguoiThe(index, id)) return;
  if (vao.some((m) => m.id === id)) return;
  vao.push({ id, ghiChu: ghiChu || '', bien: !index.personById.has(id) });
}

function timNguoiThe(index, id) {
  return index.personById.get(id) ||
         (index.vanhDaiById && index.vanhDaiById.get(id)) || null;
}

function conKeDuoc(index, u) {
  return (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && timNguoiThe(index, c.personId));
}

function veNhom(tieuDe, danhSach, xuLy, ...cacNutPhu) {
  if (danhSach.length === 0) return [];

  const nhan = document.createElement('div');
  nhan.textContent = tieuDe;
  nhan.style.cssText =
    'margin-top:14px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078)';

  const hop = document.createElement('div');
  hop.style.cssText = 'display:flex;flex-direction:column';

  for (const muc of danhSach) {
    const p = timNguoiThe(state.index, muc.id);
    const song = doiSongNguoi(p);
    const nut = document.createElement(muc.bien ? 'div' : 'button');
    if (!muc.bien) nut.type = 'button';
    nut.style.cssText =
      'display:block;width:100%;box-sizing:border-box;text-align:left;padding:7px 0;' +
      'font-family:inherit;font-size:14px;line-height:1.4;background:none;' +
      'border:none;border-top:1px solid var(--sd-vien-nhat,#f0ebe4);' +
      (muc.bien ? 'color:var(--sd-chu-phu,#8a8078);cursor:default'
                : 'color:var(--sd-chu,#2a2622);cursor:pointer;touch-action:manipulation');

    const ten = document.createElement('div');
    ten.textContent = fullName(p);

    nut.append(ten);
    const phu = [song, muc.ghiChu].filter(coGiaTri).join('  ·  ');
    if (coGiaTri(phu)) {
      const d = document.createElement('div');
      d.textContent = phu;
      d.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
      nut.append(d);
    }

    if (!muc.bien) {
      nut.addEventListener('click', () => {
        closePersonDetail();
        if (xuLy.onChonNguoi) xuLy.onChonNguoi(muc.id);
      });
    }
    hop.append(nut);
  }

  for (const n of cacNutPhu) if (n) hop.append(n);
  return [nhan, hop];
}

function veChanThe(p, xuLy) {
  const boc = document.createElement('div');
  const coQuyen = suaDuoc();

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';

  if (xuLy.onSuaNguoi) {
    chan.append(nutChan(
      coQuyen ? 'Sửa thông tin cá nhân' : 'Sửa thông tin cá nhân — bạn chỉ có quyền xem',
      false,
      () => { closePersonDetail(); xuLy.onSuaNguoi(p.id); },
      !coQuyen,
    ));
  }

  if (xuLy.onSuaGiaDinh) {
    chan.append(nutChan('Sửa thông tin gia đình', false,
      () => { closePersonDetail(); xuLy.onSuaGiaDinh(p.id); }));
  }

  chan.append(nutChan('Các việc khác', false, () => openPersonMenu(p.id, xuLy)));

  chan.append(
    nutChan('Đưa ra giữa sơ đồ', true, () => {
      closePersonDetail();
      if (xuLy.onChonNguoi) xuLy.onChonNguoi(p.id);
    }),
    nutChan('Đóng', false, () => closePersonDetail()),
  );
  boc.append(chan);

  return boc;
}

const TY_LE_KHUNG = '280 / 320';
const RONG_MUC    = 25;
const RONG_TRON   = 18.57;
const RONG_GIUA   = 27.14;
const TREN_GIUA   = 33.13;

const VANH = [
  { x: 50,   top: 0,     bieuTuong: '⬆', chu: '+ Cha mẹ',   viec: 'chaMe'  },
  { x: 86.5, top: 18.44, bieuTuong: '💍', chu: '+ Vợ chồng', viec: 'banDoi' },
  { x: 86.5, top: 55.31, bieuTuong: '🔗', chu: 'Kết nối',    viec: 'ketNoi' },
  { x: 50,   top: 73.75, bieuTuong: '⬇', chu: '+ Con',      viec: 'con'    },
  { x: 13.5, top: 55.31, bieuTuong: '✂', chu: 'Gỡ nối',     viec: 'goNoi', do: true },
  { x: 13.5, top: 18.44, bieuTuong: '🗑', chu: 'Xoá',       viec: 'xoa',   do: true },
];

export function openPersonMenu(personId, xuLy = {}) {
  closePersonDetail();

  const index = state.index;
  const p = index && index.personById.get(personId);
  if (!p) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-menu-nguoi';
  hop.style.cssText = KIEU_HOP + 'max-width:' + rongHop(340, 420, 46) + ';';

  hop.append(...veDauThe(p, false));

  hop.append(renderActionMenu(p, xuLy));

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:14px';
  chan.append(
    nutChan('Đưa ra giữa sơ đồ', true, () => {
      closePersonDetail();
      if (xuLy.onChonNguoi) xuLy.onChonNguoi(p.id);
    }),
    nutChan('Đóng', false, () => closePersonDetail()),
  );
  hop.append(chan);

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonDetail(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

function renderActionMenu(p, xuLy) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:14px';

  const coQuyen = suaDuoc();

  if (!coQuyen) {
    const nhac = document.createElement('div');
    nhac.textContent =
      'Bạn chỉ có quyền xem gia phả, nên sáu việc quanh vòng tròn chưa dùng ' +
      'được — chỉ còn "Thông tin" ở giữa. Cần sửa thật thì nhờ người quản lý ' +
      'đổi quyền trên Google Drive.';
    nhac.style.cssText =
      'margin-bottom:6px;padding:8px 10px;font-size:12px;line-height:1.5;' +
      'color:var(--sd-chu-phu,#8a8078);background:var(--sd-nen,#faf8f5);border-radius:8px';
    boc.append(nhac);
  }

  const vong = document.createElement('div');
  vong.id = 'giapha-vong-tron';
  vong.style.cssText =
    'position:relative;width:100%;max-width:' + rongHop(280, 360, 26) + ';' +
    'margin:0 auto;aspect-ratio:' + TY_LE_KHUNG + ';';

  vong.append(nutTam(p, xuLy));
  for (const m of VANH) vong.append(nutVanh(m, p, xuLy, coQuyen));

  boc.append(vong);
  return boc;
}

function nutTam(p, xuLy) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'thongTin';
  nut.style.cssText =
    'position:absolute;left:50%;top:' + TREN_GIUA + '%;transform:translateX(-50%);' +
    'width:' + RONG_GIUA + '%;padding:0;background:none;border:none;font-family:inherit;' +
    'display:flex;flex-direction:column;align-items:center;gap:3px;' +
    'cursor:pointer;touch-action:manipulation';

  const tron = document.createElement('div');
  tron.style.cssText =
    'width:100%;aspect-ratio:1;border-radius:50%;overflow:hidden;' +
    'box-shadow:0 0 0 2px var(--sd-giay,#ffffff), 0 0 0 3.5px ' + mauVien(p) + '66';

  const im = document.createElement('img');
  im.src = anhMacDinhUri(p && p.sex, mauVien(p));
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  tron.append(im);

  const anhThat = p && typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, 240);
    const thu = new Image();
    thu.onload = () => {
      if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
    };
    thu.src = duong;
  }

  const chu = document.createElement('div');
  chu.textContent = 'Thông tin';
  chu.style.cssText =
    'font-size:11px;line-height:1.2;white-space:nowrap;text-align:center;color:var(--sd-chu-vua,#5c554e)';

  const day = (fullName(p) || '').trim();
  if (day) nut.title = day;

  nut.append(tron, chu);
  nut.addEventListener('click', () => openPersonDetail(p.id, xuLy));
  return nut;
}

function nutVanh(m, p, xuLy, coQuyen) {
  const chay = viecCuaVanh(m.viec, p, xuLy);
  const bat = !!chay && (coQuyen || m.viec === 'thongTin');

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.disabled = !bat;
  nut.dataset.viec = m.viec;
  nut.style.cssText =
    'position:absolute;left:' + m.x + '%;top:' + m.top + '%;transform:translateX(-50%);' +
    'width:' + RONG_MUC + '%;padding:0;background:none;border:none;font-family:inherit;' +
    'display:flex;flex-direction:column;align-items:center;gap:3px;' +
    'touch-action:manipulation;' +
    'cursor:' + (bat ? 'pointer' : 'not-allowed') + ';opacity:' + (bat ? '1' : '.4') + ';';

  const tron = document.createElement('div');
  tron.style.cssText =
    'width:' + (RONG_TRON / RONG_MUC * 100) + '%;aspect-ratio:1;border-radius:50%;' +
    'display:flex;align-items:center;justify-content:center;' +
    'box-sizing:border-box;' +
    (m.do
      ? 'color:var(--sd-do,#8a3a2a);background:var(--sd-do-nen,#fbf0ec);border:1px solid var(--sd-do-vien,#f0d8d0)'
      : 'color:var(--sd-chu,#2a2622);background:var(--sd-giay,#fff);border:1px solid var(--sd-vien,#e6e0d8)');
  tron.append(veBieuTuongTron(m.bieuTuong));

  const chu = document.createElement('div');
  chu.textContent = m.chu;
  chu.style.cssText =
    'font-size:11px;line-height:1.2;white-space:nowrap;text-align:center;' +
    'color:' + (m.do ? 'var(--sd-do,#8a3a2a)' : 'var(--sd-chu-vua,#5c554e)');

  nut.append(tron, chu);
  if (bat) nut.addEventListener('click', chay);
  return nut;
}

function viecCuaVanh(viec, p, xuLy) {
  if (viec === 'chaMe') {
    return xuLy.onThemChaMe
      ? () => { closePersonDetail(); xuLy.onThemChaMe(p.id); } : null;
  }
  if (viec === 'banDoi') {
    return xuLy.onThemBanDoi
      ? () => { closePersonDetail(); xuLy.onThemBanDoi(p.id); } : null;
  }
  if (viec === 'con') {
    return xuLy.onThemCon
      ? () => { closePersonDetail(); xuLy.onThemCon({ mocId: p.id }); } : null;
  }
  if (viec === 'ketNoi') {
    return xuLy.onKetNoi ? () => { closePersonDetail(); xuLy.onKetNoi(p.id); } : null;
  }
  if (viec === 'goNoi') {
    return xuLy.onGoNoi ? () => { closePersonDetail(); xuLy.onGoNoi(p.id); } : null;
  }
  if (viec === 'xoa') {
    return xuLy.onXoaNguoi ? () => { closePersonDetail(); xuLy.onXoaNguoi(p.id); } : null;
  }
  return null;
}

function nutChan(chu, chinh, chay, tat) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.disabled = !!tat;
  nut.style.cssText =
    'flex:' + (chinh ? '1 1 auto' : '0 0 auto') + ';min-height:42px;padding:0 14px;' +
    'font-size:14px;font-family:inherit;border-radius:9px;line-height:1.3;' +
    'touch-action:manipulation;' +
    'cursor:' + (tat ? 'not-allowed' : 'pointer') + ';opacity:' + (tat ? '.45' : '1') + ';' +
    (chinh
      ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
      : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
  if (!tat) nut.addEventListener('click', chay);
  return nut;
}
