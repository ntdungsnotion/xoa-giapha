import { N, KIEU_LOP_PHU, KIEU_HOP, closePersonForm, canTroLuu, ghiBanGhi,
         hienNhan, hienLoiGhi, moHopBao, moHopChon, nutChon, nutChanXoa,
         nutChanDam, tenNguoi, keTenPartner, timNguoiTrongCay, timCapTrongCay, dangKyDonDep }
  from './form-nen.js';
import { state } from '../state.js';
import { reorderChildren, thuTuConTheoTuoi, getParentUnions,
         getPartnerUnions } from '../domains/union.js';
import { mauVien } from '../domains/render.js';
import { fullName, coGiaTri } from '../utils/text.js';
import { mocNgay } from '../utils/date.js';
import { driveThumbUrl } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';

dangKyDonDep(donDepSapThuTu);

let sapCtx = null;
let sapDay = null;
let sapKeo = null;

export function donDepSapThuTu() {
  sapCtx = null;
  sapDay = null;
  sapKeo = null;
}

export function openSapThuTu(mocId, vai, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(mocId)) return;

  const laCon = vai === 'con';
  const tatCa = laCon ? getPartnerUnions(index, mocId) : getParentUnions(index, mocId);
  const sapDuoc = tatCa.filter((u) => soConConLai(u) >= 2);

  if (sapDuoc.length === 0) { baoKhongCoGiDeSap(mocId, laCon, tatCa); return; }
  if (sapDuoc.length === 1) { moManSap(sapDuoc[0].id, mocId, laCon, xuLy); return; }

  moHopChon('chon', xuLy, {
    tieuDe: laCon ? 'Sắp thứ tự con của cặp nào?' : 'Sắp trong cặp cha mẹ nào?',
    phu:    tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  laCon
      ? tenNguoi(mocId) + ' có ' + sapDuoc.length + ' cặp có từ hai người con ' +
        'trở lên. Mỗi cặp giữ một thứ tự riêng:'
      : tenNguoi(mocId) + ' có ' + sapDuoc.length + ' bộ cha mẹ, và thứ tự anh ' +
        'chị em được ghi trong TỪNG cặp. Chọn cặp:',
    cacMuc: sapDuoc.map((u) => ({
      ma:  u.id,
      chu: 'Con của ' + keTenPartner(u.id),
      phu: soConConLai(u) + ' người con  ·  ' + u.id,
      chay: () => moManSap(u.id, mocId, laCon, xuLy),
    })),
  });
}

function baoKhongCoGiDeSap(mocId, laCon, tatCa) {
  const ten = tenNguoi(mocId);

  if (tatCa.length === 0) {
    moHopBao('Chưa có hàng nào để sắp',
      laCon
        ? ten + ' chưa đứng trong cặp vợ chồng nào, nên chưa có người con nào ' +
          'để sắp thứ tự.'
        : ten + ' chưa nối với cha mẹ nào, nên chưa có hàng anh chị em nào để ' +
          'sắp thứ tự. Muốn nối thì bấm nút ⓘ ở góc dưới phải rồi chọn ' +
          '"+ Cha mẹ".', false);
    return;
  }

  const dong = tatCa.map((u) =>
    'Cặp ' + keTenPartner(u.id) + ' (' + u.id + ') mới có ' + soConConLai(u) +
    ' người con trong gia phả.');

  moHopBao('Chỉ có một mình, không có thứ tự nào để sắp',
    laCon
      ? ten + ' mới có một người con, nên chưa có thứ tự nào để sắp. Thêm con ' +
        'thì bấm nút ⓘ rồi chọn "+ Con".'
      : ten + ' là con một, nên không có ai để đứng trước hay đứng sau. Thứ tự ' +
        'anh chị em chỉ sắp được khi cặp cha mẹ có từ hai người con trở lên.',
    false, dong);
}

function soConConLai(u) {
  const index = state.index;
  return (Array.isArray(u && u.children) ? u.children : [])
    .filter((c) => c && c.personId && index && index.personById.has(c.personId))
    .length;
}

function thuTuDangCo(u) {
  return (Array.isArray(u && u.children) ? u.children : [])
    .filter((c) => c && c.personId)
    .slice()
    .sort((a, b) => (soThuTuCon(a) - soThuTuCon(b)) || (a.personId < b.personId ? -1 : 1))
    .map((c) => c.personId);
}

function ngoaiCay(id) {
  return !!(state.index && state.index.vanhDaiById && state.index.vanhDaiById.has(id));
}

function ghepThuTuDu(dayDu, trongCay) {
  let i = 0;
  return dayDu.map((id) => (ngoaiCay(id) ? id : trongCay[i++]));
}

function soThuTuCon(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

function moManSap(unionId, mocId, laCon, xuLy) {
  const u = timCapTrongCay(unionId);
  if (!u) return;

  const voChongNgoai = (Array.isArray(u.partners) ? u.partners : []).find(ngoaiCay);
  if (voChongNgoai) {
    const p = state.index.vanhDaiById.get(voChongNgoai);
    moHopBao('Không sắp được từ gia phả này',
      'Cặp này có ' + ((p && fullName(p)) || voChongNgoai) + ' (' + voChongNgoai +
      ') — người không thuộc gia phả đang mở. Thứ tự con của cặp ấy chỉ sắp ' +
      'được ở gia phả có cả hai vợ chồng.', false);
    return;
  }

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'sapThuTu';
  sapCtx    = { unionId, mocId, laCon, thuTu: thuTuDangCo(u).filter((id) => !ngoaiCay(id)) };

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-sap-thu-tu';
  hop.style.cssText = KIEU_HOP;

  const t = document.createElement('div');
  t.textContent = laCon ? 'Sắp thứ tự các con' : 'Sắp thứ tự anh chị em';
  t.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = 'Con của ' + keTenPartner(unionId) + '  ·  ' + unionId;
  phu.style.cssText =
    'font-size:12px;color:var(--sd-chu-mo,#b3aaa0);margin-top:3px;letter-spacing:.03em;line-height:1.45';

  const chiDan = document.createElement('div');
  chiDan.textContent =
    'Số 1 là anh/chị cả, số cuối cùng là em út. Kéo một thẻ sang chỗ khác, ' +
    'hoặc bấm ◀ ▶ để dịch từng nấc. Chưa có gì được ghi cho tới lúc bấm Xong.';
  chiDan.style.cssText = 'margin-top:12px;font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078)';

  sapDay = document.createElement('div');
  sapDay.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
  sapDay.addEventListener('pointermove',   keoDi);
  sapDay.addEventListener('pointerup',     keoLen);
  sapDay.addEventListener('pointercancel', keoLen);

  hop.append(t, phu, chiDan, sapDay);
  veDayCon();

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const hangPhu = document.createElement('div');
  hangPhu.style.cssText = 'margin-top:14px';
  hangPhu.append(nutChon('Xếp theo tuổi', false, sapTheoTuoi));
  hop.append(hangPhu);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
  N.nutLuu = nutChanDam('Xong', () => handleSaveThuTu());
  if (canTro) { N.nutLuu.disabled = true; N.nutLuu.style.opacity = '.45'; }
  chan.append(N.nutLuu, nutChanXoa('Huỷ', false, () => closePersonForm()));
  hop.append(chan);

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

function veDayCon() {
  if (!sapDay || !sapCtx) return;
  sapDay.innerHTML = '';
  sapCtx.thuTu.forEach((id, i) => sapDay.append(veTheCon(id, i)));
}

function veTheCon(id, i) {
  const p = timNguoiTrongCay(id);
  const conTrong = !!(state.index && state.index.personById.has(id));
  const dangKeo  = !!(sapKeo && sapKeo.tu === i);

  const the = document.createElement('div');
  the.dataset.ma    = id;
  the.dataset.viTri = String(i);
  the.style.cssText =
    'flex:0 0 78px;box-sizing:border-box;padding:6px 4px 5px;border-radius:10px;' +
    'display:flex;flex-direction:column;align-items:center;gap:2px;' +
    'touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;' +
    (id === sapCtx.mocId
      ? 'background:var(--sd-vang-nen,#fdf6ec);border:1.5px solid #c07a3e;'
      : 'background:var(--sd-giay,#fff);border:1px solid var(--sd-vien,#e6e0d8);') +
    (conTrong ? '' : 'opacity:.45;') +
    (dangKeo ? 'opacity:.4;' : '');

  const so = document.createElement('div');
  so.textContent = String(i + 1);
  so.style.cssText =
    'font-size:11px;font-weight:600;color:var(--sd-chu-phu,#8a8078);line-height:1';
  the.append(so);

  const tron = document.createElement('div');
  tron.style.cssText =
    'width:38px;height:38px;border-radius:50%;overflow:hidden;' +
    'box-shadow:0 0 0 2px var(--sd-giay,#ffffff), 0 0 0 3px ' + mauVien(p) + '66';
  const im = document.createElement('img');
  im.src = anhMacDinhUri(p && p.sex, mauVien(p));
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  tron.append(im);
  const anhThat = p && typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, 120);
    const thu = new Image();
    thu.onload = () => { if (thu.naturalWidth > 0) im.src = duong; };
    thu.src = duong;
  }
  the.append(tron);

  const ten = document.createElement('div');
  ten.textContent = p ? (fullName(p) || id) : id;
  ten.style.cssText =
    'font-size:11px;line-height:1.25;text-align:center;color:var(--sd-chu,#2a2622);' +
    'word-break:break-word';
  the.append(ten);

  const phu = conTrong ? namSinhNgan(p) : 'trong thùng rác';
  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText = 'font-size:10px;line-height:1.2;color:var(--sd-chu-phu,#8a8078);text-align:center';
    the.append(d);
  }

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:3px;margin-top:3px';
  hang.append(nutDich('◀', 'trai', i > 0, () => dichCho(i, -1)));
  hang.append(nutDich('▶', 'phai', i < sapCtx.thuTu.length - 1, () => dichCho(i, 1)));
  the.append(hang);

  the.addEventListener('pointerdown', (e) => keoXuong(e, i));
  return the;
}

function nutDich(chu, huong, bat, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.dataset.dich = huong;
  nut.disabled = !bat;
  nut.style.cssText =
    'width:30px;height:26px;padding:0;font-size:11px;font-family:inherit;' +
    'border-radius:6px;border:1px solid var(--sd-vien,#e6e0d8);background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);' +
    'touch-action:manipulation;' +
    'cursor:' + (bat ? 'pointer' : 'not-allowed') + ';opacity:' + (bat ? '1' : '.35') + ';';
  if (bat) nut.addEventListener('click', chay);
  return nut;
}

function namSinhNgan(p) {
  const moc = p ? mocNgay(p.birth) : null;
  return (moc && Number.isFinite(Number(moc.nam))) ? String(moc.nam) : '';
}

function keoXuong(e, i) {
  if (e.target && e.target.closest && e.target.closest('button')) return;
  if (!sapCtx || sapCtx.thuTu.length < 2) return;

  sapKeo = { tu: i };
  try { sapDay.setPointerCapture(e.pointerId); } catch (loi) {   }
  veDayCon();
  e.preventDefault();
}

function keoDi(e) {
  if (!sapKeo || !sapCtx) return;
  const den = theGanNhat(e.clientX, e.clientY);
  if (den < 0 || den === sapKeo.tu) return;

  const ds = sapCtx.thuTu;
  ds.splice(den, 0, ds.splice(sapKeo.tu, 1)[0]);
  sapKeo.tu = den;
  veDayCon();
}

function keoLen(e) {
  if (!sapKeo) return;
  sapKeo = null;
  try { sapDay.releasePointerCapture(e.pointerId); } catch (loi) {   }
  veDayCon();
}

function theGanNhat(x, y) {
  if (!sapDay) return -1;
  let tot = -1;
  let gan = Infinity;
  const cac = sapDay.children;
  for (let i = 0; i < cac.length; i += 1) {
    const r = cac[i].getBoundingClientRect();
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (d < gan) { gan = d; tot = i; }
  }
  return tot;
}

function dichCho(i, buoc) {
  if (!sapCtx) return;
  const j = i + buoc;
  if (j < 0 || j >= sapCtx.thuTu.length) return;
  const ds = sapCtx.thuTu;
  const tam = ds[i]; ds[i] = ds[j]; ds[j] = tam;
  veDayCon();
}

function sapTheoTuoi() {
  if (!sapCtx) return;

  const kq = thuTuConTheoTuoi(state.tree, sapCtx.unionId);
  if (!kq) {
    hienNhan('Chưa xếp theo tuổi được: cặp này có chưa tới hai người con còn ' +
             'ghi năm sinh. Kéo tay hoặc bấm ◀ ▶ để sắp.', false);
    return;
  }
  if (kq.hopLe) {
    hienNhan('Thứ tự đang LƯU đã đúng theo tuổi rồi, nên phép này không đổi ' +
             'được chỗ nào.', false);
    return;
  }

  sapCtx.thuTu = kq.thuTuMoi.filter((id) => !ngoaiCay(id));
  veDayCon();
  hienNhan('Đã xếp thử theo tuổi. Người thiếu năm sinh giữ nguyên chỗ cũ. ' +
           'Phép này tính từ thứ tự ĐANG LƯU nên nó bỏ qua những gì bạn vừa ' +
           'kéo bằng tay. Xem lại rồi bấm Xong mới ghi.', false);
}

async function handleSaveThuTu() {
  if (N.dangLuu || !sapCtx) return;

  const unionId = sapCtx.unionId;
  const cu = timCapTrongCay(unionId);
  if (!cu) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  const dayDu = thuTuDangCo(cu);
  const thuTuMoi = ghepThuTuDu(dayDu, sapCtx.thuTu);
  if (dayDu.join('|') === thuTuMoi.join('|')) {
    hienNhan('Chưa đổi chỗ ai cả, nên không có gì để lưu.', false);
    return;
  }

  const kq = reorderChildren(state.tree, unionId, thuTuMoi);
  if (kq) {
    kq.union.children = kq.union.children.map((c) => (ngoaiCay(c.personId)
      ? Object.assign({}, cu.children.find((x) => x && x.personId === c.personId))
      : c));
  }
  if (!kq) {
    hienNhan('Không ghi được thứ tự này — danh sách người con vừa đổi ở nơi ' +
             'khác. Tải lại trang rồi sắp lại.', true);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'update',
    target: unionId,
    note:   'Sắp lại thứ tự anh chị em trong cặp ' + keTenPartner(unionId) + '.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Thứ tự anh chị em VẪN như cũ.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(unionId);
  closePersonForm();
}
