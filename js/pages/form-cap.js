import { N, o, KIEU_O, KIEU_NUT_CHON, KIEU_LOP_PHU, KIEU_HOP, closePersonForm,
         canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi, keTenPartner, tenNguoi,
         moTaCap, moHopChon, moHopBao, veNhan, veChan, oChu, oNhieuDong, docO,
         mayDocDuocGi, dangKyDonDep } from './form-nen.js';
import { veKhoiAnh, apThayDoiAnh, keThayDoiAnh } from './form-anh.js';
import { state } from '../state.js';
import { updateUnion, swapPartnerOrder, getPartnerUnions,
         rankCua } from '../domains/union.js';
import { validateAll } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { stampNow } from '../utils/date.js';
import { coGiaTri } from '../utils/text.js';
import { TRANG_THAI_CAP } from '../config.js';

dangKyDonDep(donDepCap);

let capDangSua = null;
let mocDangSua = null;

export function donDepCap() {
  capDangSua = null;
  mocDangSua = null;
}

export function openUnionForm(mocId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(mocId)) return;

  if (xuLy.unionId && index.unionById.has(xuLy.unionId)) {
    moFormCap(xuLy.unionId, xuLy, mocId);
    return;
  }

  const ds = getPartnerUnions(index, mocId);

  if (ds.length === 0) {
    moHopBao('Chưa có cặp nào để sửa',
             tenNguoi(mocId) + ' chưa đứng trong cặp vợ chồng nào, nên chưa có ' +
             'ngày cưới hay thứ bậc nào để ghi. Thêm vợ/chồng hoặc Kết nối ' +
             'trước đã — hai mục ấy nằm ở vòng tròn.', false);
    return;
  }

  if (ds.length === 1) { moFormCap(ds[0].id, xuLy, mocId); return; }

  moHopChon('chon', xuLy, {
    tieuDe: 'Sửa cặp nào?',
    phu:    tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  tenNguoi(mocId) + ' đứng trong ' + ds.length + ' cặp. Mỗi cặp có ' +
            'ngày cưới và thứ bậc riêng:',
    cacMuc: ds.map((u) => ({
      ma:  u.id,
      chu: 'Cặp với ' + keTenPartner(u.id),
      phu: moTaCap(u),
      chay: () => moFormCap(u.id, xuLy, mocId),
    })),
  });
}

function moFormCap(unionId, xuLy, mocId) {
  const u = state.index && state.index.unionById.get(unionId);
  if (!u) return;

  closePersonForm();
  N.xuLyNgoai  = xuLy || {};
  N.cheDo      = 'suaCap';
  capDangSua = unionId;
  mocDangSua = mocId;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-cap';
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sửa cặp';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = keTenPartner(unionId) + '  ·  ' + unionId;
  phu.style.cssText =
    'font-size:12px;color:var(--sd-chu-mo,#b3aaa0);margin-top:3px;letter-spacing:.03em;line-height:1.45';

  hop.append(tieuDe, phu);
  hop.append(...veCacOCap(u, mocId));

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChan(handleSaveUnion, !canTro));

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

function veCacOCap(u, mocId) {
  const ra = [];

  ra.push(veNhan('Ngày cưới'));
  ra.push(oNgayCuoi(u));
  ra.push(oChu('marriagePlace', 'Nơi cưới', (u.marriage || {}).place, 'Làng, xã, tỉnh'));

  ra.push(veNhan('Tình trạng hôn nhân'));
  ra.push(veChonTrangThai(u));

  ra.push(veNhan('Đây là cặp thứ mấy của ' + tenNguoi(mocId) + '?'));
  ra.push(oThuBac(u, mocId));

  ra.push(veNhan('Chỗ đứng trên sơ đồ'));
  ra.push(veDoiChoTraiPhai(u));

  ra.push(veNhan('Ghi chú về cặp này'));
  ra.push(oNhieuDong('note', u.note, 'Cưới ở quê, cụ Bá làm chủ hôn…'));

  ra.push(veNhan('Ảnh của cặp này'));
  ra.push(veKhoiAnh(u.id, null));

  return ra;
}

function oNgayCuoi(u) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const m = (u && typeof u.marriage === 'object' && u.marriage) ? u.marriage : {};
  const input = document.createElement('input');
  input.type = 'text';
  input.value = coGiaTri(m.raw) ? String(m.raw) : '';
  input.placeholder = '1972  ·  12/3/1972  ·  khoảng 1972';
  input.setAttribute('aria-label', 'Ngày cưới');
  input.style.cssText = KIEU_O;
  o.marriage = input;

  const doc = document.createElement('div');
  doc.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';
  const capNhat = () => { doc.textContent = mayDocDuocGi(input.value); };
  input.addEventListener('input', capNhat);
  capNhat();

  boc.append(input, doc);
  return boc;
}

function veChonTrangThai(u) {
  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px;margin-top:6px';

  const CAC = TRANG_THAI_CAP;
  let dangChon = u.status === 'divorced' ? 'divorced' : 'married';
  const cacNut = [];

  const veLai = () => {
    for (const { ma, nut } of cacNut) {
      nut.style.cssText = KIEU_NUT_CHON +
        (ma === dangChon
          ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
          : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
    }
  };

  for (const c of CAC) {
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.textContent = c.chu;
    nut.dataset.trangThai = c.ma;
    nut.addEventListener('click', () => { dangChon = c.ma; veLai(); });
    cacNut.push({ ma: c.ma, nut });
    hang.append(nut);
  }
  veLai();

  o.trangThai = { value: '', doc: () => dangChon };

  const nhac = document.createElement('div');
  nhac.textContent =
    'Ly hôn KHÔNG gỡ ai ra khỏi cặp: hai người vẫn là cha mẹ của những người ' +
    'con đứng dưới, và sơ đồ vẫn vẽ đúng như thế.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';

  const boc = document.createElement('div');
  boc.append(hang, nhac);
  return boc;
}

function oThuBac(u, mocId) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.value = String(rankCua(u, mocId));
  input.setAttribute('aria-label', 'Đây là cặp thứ mấy của ' + tenNguoi(mocId) + '?');
  input.style.cssText = KIEU_O;
  o.thuBac = input;

  const nhac = document.createElement('div');
  nhac.textContent =
    '1 là vợ cả / chồng đầu, 2 là vợ thứ hai… tính riêng theo phía ' +
    tenNguoi(mocId) + '. Đây là thứ bậc trong gia đình, không phải chỗ đứng ' +
    'trái phải trên hình.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';

  boc.append(input, nhac);
  return boc;
}

function veDoiChoTraiPhai(u) {
  const boc = document.createElement('div');

  const ds = (Array.isArray(u.partners) ? u.partners : []).filter(Boolean);
  if (ds.length < 2) {
    const mot = document.createElement('div');
    mot.textContent =
      'Cặp này mới có một người, nên chưa có chỗ trái phải nào để đổi.';
    mot.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
    boc.append(mot);
    o.doiCho = null;
    return boc;
  }

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hopChon = document.createElement('input');
  hopChon.type = 'checkbox';
  hopChon.checked = false;
  hopChon.style.cssText = 'width:18px;height:18px;accent-color:var(--sd-chu,#2a2622)';
  o.doiCho = hopChon;

  const chu = document.createElement('span');
  chu.textContent = 'Đổi chỗ trái ↔ phải trên sơ đồ';

  nhan.append(hopChon, chu);
  boc.append(nhan);

  if (khacGioi(ds)) {
    const canh = document.createElement('div');
    canh.textContent =
      'Hai người này khác giới, mà sơ đồ luôn xếp nam bên trái, nữ bên phải. ' +
      'Đổi thì dữ liệu có đổi thật, nhưng hình sẽ đứng nguyên như cũ.';
    canh.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';
    boc.append(canh);
  }

  return boc;
}

function khacGioi(partnerIds) {
  const gioi = partnerIds
    .map((id) => state.index.personById.get(id))
    .filter(Boolean)
    .map((p) => p.sex);
  return gioi.indexOf('M') >= 0 && gioi.indexOf('F') >= 0;
}

export async function handleSaveUnion() {
  if (N.dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  const u = state.index && state.index.unionById.get(capDangSua);
  if (!u) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  const changes = {
    note: docO('note'),
    marriage: { raw: docO('marriage'), place: docO('marriagePlace') },
  };

  const ttMoi   = o.trangThai ? o.trangThai.doc() : 'married';
  const ttCu    = u.status === 'divorced' ? 'divorced' : (u.status || 'married');
  if (ttMoi !== ttCu) changes.status = ttMoi;

  const bacMoi = Number(String(docO('thuBac')).trim());
  if (Number.isFinite(bacMoi) && bacMoi > 0 && bacMoi !== rankCua(u, mocDangSua)) {
    changes.ranks = { [mocDangSua]: bacMoi };
  }

  const kq = updateUnion(state.tree, capDangSua, changes);
  if (!kq) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  const doiCho = !!(o.doiCho && o.doiCho.checked);
  const kqDoi  = doiCho ? swapPartnerOrder(kq.tree, capDangSua) : null;

  const sauDoi   = kqDoi ? kqDoi.tree  : kq.tree;
  const capCuoi  = kqDoi ? kqDoi.union : kq.union;

  const anh      = apThayDoiAnh(sauDoi, capDangSua, { boi, luc });
  const cayCuoi  = anh ? anh.tree : sauDoi;
  const diffCuoi = Object.assign({}, kq.diff, kqDoi ? kqDoi.diff : null,
                                 anh ? anh.diff : null);

  if (Object.keys(diffCuoi).length === 0) {
    hienNhan('Chưa có gì thay đổi so với bản đang lưu, nên không cần lưu lại.', false);
    return;
  }

  const indexMoi = buildIndex(cayCuoi);
  const raSoat = validateAll(cayCuoi, indexMoi, 'union', { unionId: capDangSua });

  if (!raSoat.canSave) {
    hienNhan('Chưa lưu được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  if (raSoat.warnings.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn lưu';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn lưu" nếu bạn biết là đúng:', false,
             raSoat.warnings.map((m) => m.message));
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const ketQua = await ghiBanGhi(null, [capCuoi], {
    action: 'update',
    target: capDangSua,
    note:   'Sửa cặp ' + keTenPartner(capDangSua) + '.' + keThayDoiAnh(anh),
    diff:   diffCuoi,
  }, anh);

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Cặp này VẪN như cũ.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(capDangSua);
  closePersonForm();
}
