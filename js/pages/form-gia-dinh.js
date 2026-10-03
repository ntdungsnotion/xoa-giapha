import { N, KIEU_O, KIEU_LOP_PHU, KIEU_HOP, closePersonForm, canTroLuu,
         ghiBanGhi, hienNhan, hienLoiGhi, keTenPartner, tenNguoi, thuTuCon,
         maTrangThaiCap, moHopTrang, moHopChon, moHopBao, gaiTruocChan,
         nutChon, nutChanXoa, gopRaSoat, khoiHoiThuBac, docThuBacNhap,
         loiThuBacGoSai, dangKyDonDep } from './form-nen.js';
import { moHopViecCon } from './form-sua-con.js';
import { unlink } from './form-go-noi.js';
import { state } from '../state.js';
import { addPartner, removePartner, updateUnion,
         getParentUnions, getPartnerUnions } from '../domains/union.js';
import { validateAll, checkOrphanNode, checkNoAncestorCycle,
         checkParentAge } from '../domains/validate.js';
import { suaDuoc } from '../services/repo.js';
import { buildIndex } from '../utils/graph.js';
import { fullName, coGiaTri, removeDiacritics, doiSongNguoi } from '../utils/text.js';
import { nhanQuanHeCon, chuThichQuanHe, TRANG_THAI_CAP,
         nhanTrangThaiCap } from '../config.js';

dangKyDonDep(donDepGiaDinh);

let giaDinhCua = null;
let doiHT      = null;

export function donDepGiaDinh() {
  giaDinhCua = null;
  doiHT      = null;
}

export function openFamilyForm(personId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'giaDinh';
  giaDinhCua = personId;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-gia-dinh';
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sửa thông tin gia đình';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = tenNguoi(personId) + '  ·  ' + personId;
  phu.style.cssText =
    'font-size:12px;color:var(--sd-chu-mo,#b3aaa0);margin-top:3px;letter-spacing:.03em;line-height:1.45';

  hop.append(tieuDe, phu);

  const capChaMe = getParentUnions(index, personId);
  const capVo    = getPartnerUnions(index, personId);

  for (const u of capChaMe) hop.append(veKhoiChaMe(u, personId, xuLy));
  for (const u of capVo)    hop.append(veKhoiVoChong(u, personId, xuLy));

  if (capChaMe.length === 0) hop.append(veKhoiChuaCoChaMe(personId, xuLy));
  if (capVo.length === 0)    hop.append(veKhoiChuaCoVoChong(personId, xuLy));

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  chan.append(nutChon('Xong', true, () => closePersonForm()));
  hop.append(chan);

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

function moLaiFormGiaDinh(personId, xuLy) {
  closePersonForm();
  openFamilyForm(personId, xuLy);
}

function veNhanKhoiGD(chu, phu) {
  const nhan = document.createElement('div');
  nhan.style.cssText =
    'margin-top:18px;margin-bottom:6px;padding-bottom:4px;' +
    'border-bottom:1px solid var(--sd-vien-nhat,#f0ebe4)';

  const t = document.createElement('div');
  t.textContent = chu;
  t.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078)';
  nhan.append(t);

  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText = 'font-size:11px;color:var(--sd-chu-mo,#b3aaa0);margin-top:2px';
    nhan.append(d);
  }
  return nhan;
}

function veDongNguoi(vai, id, ghiChu, chay, chuChinh) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.vai = vai;
  nut.dataset.nguoi = id || '';
  nut.style.cssText =
    'display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;' +
    'padding:9px 11px;margin-top:6px;font-family:inherit;font-size:14px;' +
    'border-radius:8px;cursor:pointer;touch-action:manipulation;' +
    (id || coGiaTri(chuChinh)
      ? 'color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8);background:var(--sd-giay,#fff)'
      : 'color:var(--sd-chu-phu,#8a8078);border:1px dashed var(--sd-vien,#e6e0d8);background:none');

  const nhan = document.createElement('span');
  nhan.textContent = vai;
  nhan.style.cssText =
    'flex:0 0 78px;font-size:12px;line-height:1.35;color:var(--sd-chu-phu,#8a8078);letter-spacing:.03em';
  nut.append(nhan);

  const cot = document.createElement('span');
  cot.style.cssText = 'flex:1 1 auto;min-width:0';

  const ten = document.createElement('span');
  ten.style.cssText = 'display:block';
  ten.textContent = coGiaTri(chuChinh) ? chuChinh
    : (id ? tenNguoi(id) : '(chưa có — bấm để chọn)');
  cot.append(ten);

  if (coGiaTri(ghiChu)) {
    const d = document.createElement('span');
    d.textContent = ghiChu;
    d.style.cssText = 'display:block;font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
    cot.append(d);
  }

  nut.append(cot);
  nut.addEventListener('click', chay);
  return nut;
}

function nutGachDut(chu, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:9px 11px;margin-top:6px;' +
    'font-family:inherit;font-size:13px;color:var(--sd-chu-phu,#8a8078);border:1px dashed var(--sd-vien,#e6e0d8);' +
    'border-radius:8px;background:none;cursor:pointer;touch-action:manipulation';
  nut.textContent = chu;
  nut.addEventListener('click', chay);
  return nut;
}

function veKhoiChaMe(u, personId, xuLy) {
  const index = state.index;
  const boc = document.createElement('div');

  const cacChaMe = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && index.personById.has(id));

  boc.append(veNhanKhoiGD('LÀ CON của', keTenPartner(u.id) + '  ·  ' + u.id));

  for (const id of cacChaMe) {
    boc.append(veDongNguoi(vaiChaMe(id), id, doiSongNguoi(index.personById.get(id)),
      () => moHopViecNguoiTrongCap(u.id, id, personId, xuLy)));
  }

  if (cacChaMe.length < 2) {
    boc.append(veDongNguoi(vaiConThieu(cacChaMe), '', '',
      () => moHopChonNguoiVaoCap(u.id, '', personId, xuLy)));
  }

  boc.append(...veDongTrangThai(u, personId, xuLy));

  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === personId);
  const qh = (muc && muc.relation) || 'birth';
  boc.append(veDongNguoi('Quan hệ', personId, '',
    () => moHopViecCon(u.id, personId, xuLyCon(personId, xuLy)),
    nhanQuanHeCon(qh, 'con')));

  const anhEm = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && c.personId !== personId &&
                   index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  for (const c of anhEm) {
    boc.append(veDongNguoi('Anh / em', c.personId,
      [chuThichQuanHe(c.relation || 'birth', 'con'),
       doiSongNguoi(index.personById.get(c.personId))].filter(coGiaTri).join('  ·  '),
      () => moHopViecCon(u.id, c.personId, xuLyCon(personId, xuLy))));
  }

  boc.append(...nutTheCap(u, xuLy));
  return boc;
}

function veKhoiVoChong(u, personId, xuLy) {
  const index = state.index;
  const boc = document.createElement('div');

  const kia = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== personId && index.personById.has(id));

  boc.append(veNhanKhoiGD('LÀ ' + vaiCuaMinh(personId).toUpperCase() + ' trong',
                          keTenPartner(u.id) + '  ·  ' + u.id));

  for (const id of kia) {
    boc.append(veDongNguoi(vaiBanDoi(id), id, doiSongNguoi(index.personById.get(id)),
      () => moHopViecNguoiTrongCap(u.id, id, personId, xuLy)));
  }

  if (kia.length === 0) {
    boc.append(veDongNguoi(vaiBanDoiThieu(personId), '', '',
      () => moHopChonNguoiVaoCap(u.id, '', personId, xuLy)));
  }

  boc.append(...veDongTrangThai(u, personId, xuLy));

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  for (const c of cacCon) {
    boc.append(veDongNguoi('Con', c.personId,
      [chuThichQuanHe(c.relation || 'birth', 'con'),
       doiSongNguoi(index.personById.get(c.personId))].filter(coGiaTri).join('  ·  '),
      () => moHopViecCon(u.id, c.personId, xuLyCon(personId, xuLy))));
  }

  if (suaDuoc() && xuLy.onThemCon) {
    boc.append(nutGachDut('+ Thêm một người con vào gia đình này',
      () => { closePersonForm(); xuLy.onThemCon(u.id); }));
  }

  boc.append(...nutTheCap(u, xuLy));
  return boc;
}

function nutTheCap(u, xuLy) {
  if (!xuLy || !xuLy.onXemCap) return [];

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;

  return [nutGachDut(
    soCon >= 2
      ? 'Ngày cưới · ảnh cưới · sắp thứ tự các con →'
      : 'Ngày cưới · ảnh cưới · ghi chú của gia đình này →',
    () => { closePersonForm(); xuLy.onXemCap(u.id); })];
}

function veDongTrangThai(u, personId, xuLy) {
  const index = state.index;
  const cacNguoi = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && index.personById.has(id));
  if (cacNguoi.length < 2) return [];

  const ma   = maTrangThaiCap(u);
  const dong = veDongNguoi('Tình trạng hôn nhân', '', '',
    () => moHopTrangThaiCap(u.id, personId, xuLy), nhanTrangThaiCap(ma));
  dong.dataset.trangThai = ma;
  dong.dataset.cap       = u.id;

  if (ma !== 'married') {
    const chuLon = dong.lastElementChild && dong.lastElementChild.firstElementChild;
    if (chuLon) chuLon.style.fontWeight = '600';
  }

  return [dong];
}

function moHopTrangThaiCap(unionId, personId, xuLy) {
  const u = state.index && state.index.unionById.get(unionId);
  if (!u) return;

  const dang   = maTrangThaiCap(u);
  const dangLa = 'Đang ghi: ' + nhanTrangThaiCap(dang) + '.';
  const nhacLyHon =
    'Ly hôn KHÔNG gỡ ai ra khỏi cặp: hai người vẫn là cha mẹ của những người ' +
    'con đứng dưới, và sơ đồ vẫn vẽ đúng như thế.';

  if (!suaDuoc()) {
    moHopBao('Tình trạng hôn nhân', 'Bạn chỉ có quyền xem gia phả nên chưa sửa được ' +
             'gì ở đây.', false, [dangLa, nhacLyHon]);
    return;
  }

  moHopChon('chon', xuLy, {
    tieuDe: 'Tình trạng hôn nhân',
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  dangLa,
    cacDong: [nhacLyHon],
    cacMuc: TRANG_THAI_CAP.map((x) => ({
      ma:  x.ma,
      chu: x.chu + (x.ma === dang ? '   ← đang ghi' : ''),
      chay: () => chayDoiTrangThai(unionId, x.ma, personId, xuLy),
    })),
  });
}

async function chayDoiTrangThai(unionId, maMoi, personId, xuLy) {
  const ten = keTenPartner(unionId);
  const kq  = updateUnion(state.tree, unionId, { status: maMoi });

  if (!kq) {
    moHopBao('Không đổi được',
             'Không tìm thấy cặp ' + unionId + ' nữa. Có thể gia phả vừa thay ' +
             'đổi trong lúc hộp đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    moHopBao('Không có gì đổi',
             ten + ' vốn đã được ghi là ' + nhanTrangThaiCap(maMoi).toLowerCase() +
             '.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Tình trạng hôn nhân', ten + '  ·  ' + unionId);

  const canTro = canTroLuu();
  if (canTro) {
    hienNhan(canTro, true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang ghi…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'update',
    target: unionId,
    note:   'Ghi cặp ' + ten + ' là ' + nhanTrangThaiCap(maMoi).toLowerCase() + '.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Cặp này VẪN như cũ.');
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  veLaiSauKhiGhi(personId, xuLy)(personId);
  hienNhan('Đã ghi: ' + ten + ' — ' + nhanTrangThaiCap(maMoi).toLowerCase() + '.', false);
}

function veKhoiChuaCoChaMe(personId, xuLy) {
  const boc = document.createElement('div');
  boc.append(veNhanKhoiGD('LÀ CON của', 'chưa nối với cha mẹ nào'));

  const d = document.createElement('div');
  d.textContent = tenNguoi(personId) + ' chưa có cha mẹ trong gia phả.';
  d.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  boc.append(d);

  if (suaDuoc() && xuLy.onKetNoi) {
    boc.append(nutGachDut('+ Chọn cha mẹ cho ' + tenNguoi(personId),
      () => { closePersonForm(); xuLy.onKetNoi(personId); }));
  }
  return boc;
}

function veKhoiChuaCoVoChong(personId, xuLy) {
  const boc = document.createElement('div');
  boc.append(veNhanKhoiGD('GIA ĐÌNH RIÊNG', 'chưa lập gia đình nào'));

  const d = document.createElement('div');
  d.textContent = tenNguoi(personId) + ' chưa đứng trong cặp vợ chồng nào, nên ' +
                  'chưa có nhà riêng để ghi con cái.';
  d.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  boc.append(d);

  if (suaDuoc() && xuLy.onKetNoi) {
    boc.append(nutGachDut('+ Chọn vợ / chồng cho ' + tenNguoi(personId),
      () => { closePersonForm(); xuLy.onKetNoi(personId); }));
  }
  return boc;
}

function xuLyCon(personId, xuLy) {
  return Object.assign({}, xuLy, {
    onDaLuu: (id) => {
      if (xuLy.onDaLuu) xuLy.onDaLuu(id);
      moLaiFormGiaDinh(personId, xuLy);
    },
  });
}

function vaiChaMe(id) {
  const p = state.index && state.index.personById.get(id);
  const s = p && p.sex;
  return s === 'M' ? 'Cha' : (s === 'F' ? 'Mẹ' : 'Cha / mẹ');
}

function vaiBanDoi(id) {
  const p = state.index && state.index.personById.get(id);
  const s = p && p.sex;
  return s === 'M' ? 'Chồng' : (s === 'F' ? 'Vợ' : 'Vợ / chồng');
}

function vaiCuaMinh(personId) {
  const p = state.index && state.index.personById.get(personId);
  const s = p && p.sex;
  return s === 'M' ? 'Chồng' : (s === 'F' ? 'Vợ' : 'Vợ / chồng');
}

function vaiConThieu(daCo) {
  if (daCo.length === 0) return 'Cha / mẹ';
  const p = state.index.personById.get(daCo[0]);
  const s = p && p.sex;
  return s === 'M' ? 'Mẹ' : (s === 'F' ? 'Cha' : 'Cha / mẹ');
}

function vaiBanDoiThieu(personId) {
  const p = state.index && state.index.personById.get(personId);
  const s = p && p.sex;
  return s === 'M' ? 'Vợ' : (s === 'F' ? 'Chồng' : 'Vợ / chồng');
}

function moHopViecNguoiTrongCap(unionId, nguoiId, personId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u || !index.personById.has(nguoiId)) return;

  const laChaMe = (Array.isArray(u.children) ? u.children : [])
    .some((c) => c && c.personId === personId);
  const vai = laChaMe ? vaiChaMe(nguoiId) : vaiBanDoi(nguoiId);

  const cacMuc = [];

  if (suaDuoc()) {
    cacMuc.push({
      ma:  'doi',
      chu: 'Đổi sang người khác',
      phu: 'Bỏ ' + tenNguoi(nguoiId) + ' ra và đưa người khác vào đúng chỗ ấy, ' +
           'trong CÙNG một lần lưu.',
      chay: () => moHopChonNguoiVaoCap(unionId, nguoiId, personId, xuLy),
    });
  }

  if (xuLy.onSuaNguoi) {
    cacMuc.push({
      ma:  'ho-so',
      chu: 'Mở hồ sơ của ' + tenNguoi(nguoiId),
      phu: 'Sửa tên, ngày sinh, ảnh — những thứ của riêng một con người.',
      chay: () => { closePersonForm(); xuLy.onSuaNguoi(nguoiId); },
    });
  }

  if (suaDuoc()) {
    const conLai = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => id && id !== nguoiId && index.personById.has(id));

    cacMuc.push({
      ma:  'bo',
      chu: 'Bỏ ' + tenNguoi(nguoiId) + ' khỏi gia đình này',
      phu: tenNguoi(nguoiId) + ' KHÔNG bị xoá khỏi gia phả — chỉ thôi đứng ở ' +
           'gia đình này.',
      nguyHiem: true,
      chay: () => (conLai.length > 0
        ? unlink(conLai[0], nguoiId, 'spouse',
                 Object.assign({}, xuLy, { unionId, onDaLuu: veLaiSauKhiGhi(personId, xuLy) }))
        : unlink(personId, '', 'parent',
                 Object.assign({}, xuLy, { unionId, onDaLuu: veLaiSauKhiGhi(personId, xuLy) }))),
    });
  }

  if (cacMuc.length === 0) {
    moHopBao(vai + ': ' + tenNguoi(nguoiId),
             'Bạn chỉ có quyền xem gia phả nên chưa sửa được gì ở đây.', false);
    return;
  }

  moHopChon('chon', xuLy, {
    tieuDe: vai + ': ' + tenNguoi(nguoiId),
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Làm gì với ' + tenNguoi(nguoiId) + ' trong gia đình này?',
    cacMuc,
  });
}

function veLaiSauKhiGhi(personId, xuLy) {
  return (id) => {
    if (xuLy.onDaLuu) xuLy.onDaLuu(id);
    moLaiFormGiaDinh(personId, xuLy);
  };
}

function xetNguoiVaoCap(unionId, ungVienId, boQuaId) {
  const index = state.index;
  const ra = { muc: 'duoc', lyDo: [] };
  const u = index && index.unionById.get(unionId);
  if (!u) return { muc: 'khoa', lyDo: ['Không tìm thấy gia đình này nữa.'] };

  const khoa    = (chu) => { ra.muc = 'khoa'; ra.lyDo.push(chu); };
  const canhBao = (chu) => { if (ra.muc !== 'khoa') ra.muc = 'canhbao'; ra.lyDo.push(chu); };

  const dangCo = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== boQuaId && index.personById.has(id));

  if (dangCo.indexOf(ungVienId) >= 0) {
    khoa(tenNguoi(ungVienId) + ' đã đứng sẵn trong gia đình này.');
  }
  if (dangCo.length >= 2) {
    khoa('Gia đình này đã đủ hai người. Trong gia phả này một người có nhiều ' +
         'đời vợ là NHIỀU GIA ĐÌNH, không phải một nhà ba người.');
  }

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .map((c) => c && c.personId)
    .filter((id) => id && index.personById.has(id));

  if (cacCon.indexOf(ungVienId) >= 0) {
    khoa(tenNguoi(ungVienId) + ' đang là CON của chính gia đình này — không ai ' +
         'vừa là con vừa là cha mẹ của một nhà.');
  }

  for (const conId of cacCon) {
    if (conId === ungVienId) continue;

    const v = checkNoAncestorCycle(index, conId, ungVienId);
    if (v && v.level === 'error') khoa(v.message);

    const t = checkParentAge(index, ungVienId, conId);
    if (t && t.level === 'error') khoa(t.message);
    else if (t && t.level === 'warning') canhBao(t.message);
  }

  return ra;
}

function moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const chan = moHopTrang('chonNguoi', xuLy,
    nguoiCuId ? 'Đổi sang người khác' : 'Chọn người vào gia đình này',
    keTenPartner(unionId) + '  ·  ' + unionId);

  const dan = document.createElement('div');
  dan.textContent = nguoiCuId
    ? 'Ai vào thay ' + tenNguoi(nguoiCuId) + '?'
    : 'Ai đứng vào chỗ còn trống của gia đình này?';
  dan.style.cssText =
    'margin-top:14px;padding:9px 11px;font-size:12px;line-height:1.5;' +
    'border-radius:8px;color:var(--sd-chu-phu,#8a8078);background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4)';
  N.khoiKetQua.append(dan);

  const nhac = document.createElement('div');
  nhac.textContent =
    '⛔ là không nối được — nối vào thì gia phả nói ra một điều không thể có ' +
    'thật. ⚠ là đáng xem lại, nhưng vẫn nối được: gia phả cũ có chuyện thật mà ' +
    'nghe như lỗi.';
  nhac.style.cssText =
    'margin-top:6px;padding:7px 10px;font-size:11px;line-height:1.5;' +
    'border-radius:8px;color:var(--sd-chu-vua,#5c554e);background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4)';
  N.khoiKetQua.append(nhac);

  const oTim = document.createElement('input');
  oTim.type = 'text';
  oTim.placeholder = 'Gõ tên để tìm…';
  oTim.setAttribute('aria-label', 'Tìm người');
  oTim.dataset.viec = 'tim-nguoi';
  oTim.style.cssText = KIEU_O + 'margin-top:10px';
  N.khoiKetQua.append(oTim);

  const day = document.createElement('div');
  day.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px';
  N.khoiKetQua.append(day);

  const demDong = document.createElement('div');
  demDong.style.cssText = 'font-size:11px;color:var(--sd-chu-mo,#b3aaa0);margin-top:8px';
  N.khoiKetQua.append(demDong);

  const tatCa = [];
  for (const p of index.personById.values()) {
    if (!p || p.id === personId) continue;
    tatCa.push({
      id:  p.id,
      ten: fullName(p),
      tim: removeDiacritics(fullName(p)).toLowerCase(),
      doi: doiSongNguoi(p),
      xet: xetNguoiVaoCap(unionId, p.id, nguoiCuId),
    });
  }
  tatCa.sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));

  const veLaiDay = () => {
    day.innerHTML = '';
    const chu = removeDiacritics(oTim.value || '').toLowerCase().trim();
    const hop = chu === '' ? tatCa : tatCa.filter((m) => m.tim.indexOf(chu) >= 0);

    const CAT = chu === '' ? 40 : hop.length;

    for (const m of hop.slice(0, CAT)) day.append(veDongUngVien(m, () => {
      if (m.xet.muc === 'khoa') { moHopVaoLoi(unionId, nguoiCuId, personId, m, xuLy); return; }
      moHopXacNhanDoiNguoi(unionId, nguoiCuId, m.id, personId, xuLy);
    }));

    demDong.textContent = hop.length === 0
      ? 'Không có ai tên như thế trong gia phả.'
      : (hop.length > CAT
          ? 'Đang hiện ' + CAT + ' người đầu trong ' + hop.length +
            '. Gõ tên vào ô trên để tìm đúng người bạn cần.'
          : hop.length + ' người');
  };

  oTim.addEventListener('input', veLaiDay);
  veLaiDay();

  chan.append(nutChanXoa('Huỷ', false, () => closePersonForm()));
}

function veDongUngVien(m, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.muc = m.id;
  nut.dataset.xet = m.xet.muc;
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 12px;font-family:inherit;' +
    'font-size:14px;border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (m.xet.muc === 'khoa'
      ? 'color:var(--sd-do,#8a3a2a);border:1px solid var(--sd-do-vien,#f0d8d0);background:var(--sd-do-nen,#fbf0ec)'
      : (m.xet.muc === 'canhbao'
          ? 'color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vang-vien,#e8dcc4);background:var(--sd-giay,#fdfaf2)'
          : 'color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8);background:var(--sd-giay,#fff)'));

  const d1 = document.createElement('div');
  d1.textContent = (m.xet.muc === 'khoa' ? '⛔  ' : (m.xet.muc === 'canhbao' ? '⚠  ' : '')) + m.ten;
  nut.append(d1);

  const phu = [m.doi, m.xet.muc === 'khoa' ? (m.xet.lyDo[0] || '') : '']
    .filter(coGiaTri).join('  ·  ');
  if (coGiaTri(phu)) {
    const d2 = document.createElement('div');
    d2.textContent = phu;
    d2.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:2px;line-height:1.4';
    nut.append(d2);
  }

  nut.addEventListener('click', chay);
  return nut;
}

function moHopVaoLoi(unionId, nguoiCuId, personId, m, xuLy) {
  const chan = moHopTrang('chon', xuLy, 'Không nối được',
                          m.ten + '  ·  ' + m.id);
  hienNhan('Không đưa ' + m.ten + ' vào ' + keTenPartner(unionId) + ' được:',
           true, m.xet.lyDo);
  chan.append(
    nutChanXoa('Chọn người khác', true,
               () => moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy)),
    nutChanXoa('Đóng', false, () => closePersonForm()));
}

function moHopXacNhanDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy) {
  const chan = moHopTrang('doiNguoi', xuLy,
    nguoiCuId ? 'Đổi sang người khác' : 'Thêm người vào gia đình',
    tenNguoi(ungVienId) + '  ·  ' + ungVienId);

  doiHT = doHauQuaDoiNguoi(unionId, nguoiCuId, ungVienId);

  const canTro = canTroLuu();
  if (canTro || !doiHT) {
    hienNhan(canTro || 'Không dựng được bản ghi sau khi đổi. Có thể gia phả vừa ' +
             'thay đổi. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (!doiHT.raSoat.canSave) {
    hienNhan('Chưa nối được — có chỗ không thể đúng được:', true,
             doiHT.raSoat.errors.map((x) => x.message));
    chan.append(
      nutChanXoa('Chọn người khác', true,
                 () => moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy)),
      nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Đổi xong thì:', false,
           cauKeDoiNguoi(unionId, nguoiCuId, ungVienId));

  gaiTruocChan(chan, khoiHoiThuBac(ungVienId, unionId));

  N.nutLuu = nutChanXoa(nguoiCuId ? 'Đổi người' : 'Thêm vào gia đình', true,
    () => chayDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy, chan));
  chan.append(N.nutLuu, nutChanXoa('Thôi', false, () => closePersonForm()));
}

function doHauQuaDoiNguoi(unionId, nguoiCuId, ungVienId) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu = index.unionById.get(unionId);
  if (!cu) return null;
  const banCu = JSON.parse(JSON.stringify(cu));

  let tree = state.tree;
  const diff = {};

  if (nguoiCuId) {
    const kqG = removePartner(tree, unionId, nguoiCuId);
    if (!kqG) return null;
    tree = kqG.tree;
    Object.assign(diff, kqG.diff);
  }

  const kqT = addPartner(tree, unionId, ungVienId);
  if (!kqT) return null;
  tree = kqT.tree;
  Object.assign(diff, kqT.diff);

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;
  }

  const cacCon = (Array.isArray(banCu.children) ? banCu.children : [])
    .map((c) => c && c.personId)
    .filter((id) => id && indexMoi.personById.has(id));

  let raSoat = validateAll(tree, indexMoi, 'union', { unionId });
  for (const conId of cacCon) {
    raSoat = gopRaSoat(raSoat,
      validateAll(tree, indexMoi, 'child', { childId: conId, unionId }));
  }

  const lienQuan = new Set([ungVienId]);
  if (nguoiCuId) lienQuan.add(nguoiCuId);
  for (const id of (Array.isArray(banCu.partners) ? banCu.partners : [])) {
    if (id) lienQuan.add(id);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  return { tree, union: kqT.union, diff, raSoat, thanhLe, cacCon };
}

function cauKeDoiNguoi(unionId, nguoiCuId, ungVienId) {
  const B = tenNguoi(ungVienId);
  const dong = [];

  if (nguoiCuId) {
    dong.push(tenNguoi(nguoiCuId) + ' thôi đứng trong ' + keTenPartner(unionId) +
              '  ·  ' + unionId + ', và ' + B + ' đứng vào đúng chỗ ấy. Cả hai ' +
              'bản ghi người vẫn còn nguyên, không ai bị xoá.');
  } else {
    dong.push(B + ' đứng vào chỗ còn trống của ' + keTenPartner(unionId) +
              '  ·  ' + unionId + '.');
  }

  if (doiHT.cacCon.length > 0) {
    dong.push('⚠ Gia đình này đang có ' + doiHT.cacCon.length + ' người con (' +
              doiHT.cacCon.map(tenNguoi).join(' · ') + '), nên ' + B +
              ' ĐỒNG THỜI thành cha/mẹ của họ. Trong gia phả này quan hệ cha mẹ ' +
              '– con đi QUA cặp, không nối thẳng người với người.');
    if (nguoiCuId) {
      dong.push('⚠ Và ' + tenNguoi(nguoiCuId) + ' đồng thời THÔI làm cha/mẹ của ' +
                'những người con ấy, cùng một lý do.');
    }
  }

  if (doiHT.thanhLe.length > 0) {
    dong.push('⚠ Sau việc này ' + doiHT.thanhLe.map(tenNguoi).join(' · ') +
              ' không còn nối với ai trong gia phả. Họ vẫn còn nguyên trong sổ, ' +
              'nhưng sơ đồ vẽ họ đứng lẻ một mình.');
  }

  for (const m of doiHT.raSoat.warnings) dong.push('⚠ ' + m.message);

  dong.push('Không ai bị xoá khỏi gia phả. Đổi nhầm thì đổi ngược lại.');
  return dong;
}

async function chayDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy, chan) {
  if (N.dangLuu || !doiHT) return;

  const B = tenNguoi(ungVienId);

  const loiBac = loiThuBacGoSai();
  if (loiBac.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    if (N.nutLuu) N.nutLuu.textContent = nguoiCuId ? 'Vẫn đổi' : 'Vẫn thêm';
    hienNhan('Có chỗ đáng xem lại:', false, loiBac);
    return;
  }

  let banGhi = doiHT.union;
  let ghiDiff = doiHT.diff;
  const bac = docThuBacNhap();
  if (Object.keys(bac).length > 0) {
    const kqR = updateUnion(doiHT.tree, unionId, { ranks: bac });
    if (kqR) {
      banGhi  = kqR.union;
      ghiDiff = Object.assign({}, ghiDiff, kqR.diff);
    }
  }

  N.dangLuu = true;
  if (N.nutLuu) { N.nutLuu.disabled = true; N.nutLuu.style.opacity = '.45'; }
  hienNhan('Đang ghi…', false);

  const ketQua = await ghiBanGhi(null, [banGhi], {
    action: 'update',
    target: unionId,
    note:   (nguoiCuId
              ? 'Đổi ' + tenNguoi(nguoiCuId) + ' thành ' + B + ' trong cặp ' + unionId
              : 'Thêm ' + B + ' vào cặp ' + unionId) + '.',
    diff:   ghiDiff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    if (N.nutLuu) { N.nutLuu.disabled = false; N.nutLuu.style.opacity = '1'; }
    hienLoiGhi(ketQua, 'Gia đình này VẪN như cũ.');
    return;
  }

  doiHT  = null;
  N.nutLuu = null;
  chan.innerHTML = '';

  if (xuLy.onDaLuu) xuLy.onDaLuu(personId);

  hienNhan('Xong. ' + B + ' nay đứng trong ' + keTenPartner(unionId) + '.', false);
  chan.append(nutChon('Về màn hình gia đình', true,
                      () => moLaiFormGiaDinh(personId, xuLy)));
}
