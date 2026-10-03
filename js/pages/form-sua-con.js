import { N, closePersonForm, canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi,
         keTenPartner, tenNguoi, moTaCap, moHopTrang, moHopChon, moHopBao,
         nutChon, nutChanXoa, gopRaSoat, thuTuCon, dangKyDonDep } from './form-nen.js';
import { unlink } from './form-go-noi.js';
import { state } from '../state.js';
import { coGiaTri } from '../utils/text.js';
import { addChild, removeChild, softDeleteUnion, conLyDoTonTai,
         updateChildRelation } from '../domains/union.js';
import { validateAll, checkOrphanNode } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { QUAN_HE_CON_NHAN, nhanQuanHeCon, chuThichQuanHe } from '../config.js';

dangKyDonDep(donDepSuaCon);

let chuyenHT = null;

export function donDepSuaCon() {
  chuyenHT = null;
}

export function openSuaCon(unionId, xuLy = {}) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  if (cacCon.length === 0) {
    moHopBao('Sửa người con',
             keTenPartner(unionId) + ' chưa có người con nào trong gia phả, nên ' +
             'chưa có ai để sửa.', false,
             ['Thêm con thì dùng nút "Thêm một người con vào gia đình này" ngay ' +
              'trên thẻ gia đình.']);
    return;
  }

  if (cacCon.length === 1) { moHopViecCon(unionId, cacCon[0].personId, xuLy); return; }

  moHopChon('chon', xuLy, {
    tieuDe: 'Sửa người con nào?',
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Gia đình này có ' + cacCon.length + ' người con. Chọn một người:',
    cacMuc: cacCon.map((c) => ({
      ma:  c.personId,
      chu: tenNguoi(c.personId),
      phu: [chuThichQuanHe(c.relation || 'birth', 'con'), c.personId]
             .filter(coGiaTri).join('  ·  '),
      chay: () => moHopViecCon(unionId, c.personId, xuLy),
    })),
  });
}

export function moHopViecCon(unionId, conId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u || !index.personById.has(conId)) return;

  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === conId);
  const qh = (muc && muc.relation) || 'birth';

  const cacMuc = [];

  cacMuc.push({
    ma:  'quan-he',
    chu: 'Đổi quan hệ với cha mẹ',
    phu: 'Đang ghi: ' + nhanQuanHeCon(qh, 'con') + '. Ở đây đổi được cả NĂM mức, ' +
         'không riêng con nuôi như ô tích của hộp Kết nối.',
    chay: () => moHopDoiQuanHe(unionId, conId, xuLy),
  });

  const dich = capChuyenDuoc(unionId, conId);
  cacMuc.push({
    ma:  'chuyen',
    chu: 'Chuyển sang gia đình khác',
    phu: dich.length > 0
      ? 'Có ' + dich.length + ' gia đình nhận được. Gỡ khỏi cặp này và nối vào ' +
        'cặp kia trong CÙNG một lần lưu.'
      : 'Chưa có gia đình nào khác nhận được — bấm vào để nghe vì sao.',
    chay: () => moHopChonCapDich(unionId, conId, xuLy),
  });

  const moc = mocCuaCap(unionId);
  if (moc) {
    cacMuc.push({
      ma:  'go',
      chu: 'Gỡ khỏi gia đình này',
      phu: tenNguoi(conId) + ' thôi là con của cặp này. KHÔNG bị xoá khỏi gia phả.',
      nguyHiem: true,
      chay: () => unlink(moc, conId, 'child', Object.assign({}, xuLy, { unionId })),
    });
  }

  moHopChon('chon', xuLy, {
    tieuDe: 'Người con: ' + tenNguoi(conId),
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Làm gì với ' + tenNguoi(conId) + ' trong gia đình này?',
    cacMuc,
  });
}

function mocCuaCap(unionId) {
  const u = state.index && state.index.unionById.get(unionId);
  const cac = (Array.isArray(u && u.partners) ? u.partners : [])
    .filter((id) => id && state.index.personById.has(id));
  return cac.length > 0 ? cac[0] : '';
}

function moHopDoiQuanHe(unionId, conId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === conId);
  const dang = (muc && muc.relation) || 'birth';

  moHopChon('chon', xuLy, {
    tieuDe: 'Đổi quan hệ',
    phu:    tenNguoi(conId) + '  ·  ' + conId,
    cauMo:  tenNguoi(conId) + ' là gì của ' + keTenPartner(unionId) + '?',
    cacDong: [
      'Đang ghi: ' + nhanQuanHeCon(dang, 'con') + '.',
      '⚠ Ghi một người CON ĐẺ thành con nuôi thì app THÔI rà tuổi sinh học của ' +
      'cạnh này — không có lời báo nào cả, mấy phép rà chỉ lặng đi. Chọn đúng ' +
      'thứ gia phả chép, đừng chọn cho xong.',
    ],
    cacMuc: QUAN_HE_CON_NHAN.map((x) => ({
      ma:  x.ma,
      chu: x.con + (x.ma === dang ? '   ← đang ghi' : ''),
      phu: 'Đọc từ phía cha mẹ: ' + x.chaMe,
      chay: () => chayDoiQuanHe(unionId, conId, x.ma, xuLy),
    })),
  });
}

async function chayDoiQuanHe(unionId, conId, maMoi, xuLy) {
  const kq = updateChildRelation(state.tree, unionId, conId, maMoi);

  if (!kq) {
    moHopBao('Không đổi được',
             'Không tìm thấy ' + tenNguoi(conId) + ' trong cặp này nữa. Có thể gia ' +
             'phả vừa thay đổi trong lúc hộp đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    moHopBao('Không có gì đổi',
             tenNguoi(conId) + ' vốn đã được ghi là ' + nhanQuanHeCon(maMoi, 'con') +
             ' của ' + keTenPartner(unionId) + '.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Đổi quan hệ',
                          tenNguoi(conId) + '  ·  ' + conId);

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
    note:   'Ghi ' + tenNguoi(conId) + ' là ' + nhanQuanHeCon(maMoi, 'con') +
            ' của ' + keTenPartner(unionId) + '.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Quan hệ VẪN như cũ.');
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (xuLy.onDaLuu) xuLy.onDaLuu(conId);

  hienNhan('Đã ghi ' + tenNguoi(conId) + ' là ' + nhanQuanHeCon(maMoi, 'con') + '.', false);
  chan.append(nutChon('Xong', true, () => closePersonForm()));
}

function capChuyenDuoc(unionId, conId) {
  const index = state.index;
  const ra = [];
  if (!index) return ra;

  const goc = index.unionById.get(unionId);
  const nguoiGoc = new Set(
    (Array.isArray(goc && goc.partners) ? goc.partners : []).filter(Boolean));

  for (const u of index.unionById.values()) {
    if (!u || u.id === unionId || u.deleted) continue;

    const cac = Array.isArray(u.partners) ? u.partners : [];
    if (cac.indexOf(conId) >= 0) continue;

    const daLaCon = (Array.isArray(u.children) ? u.children : [])
      .some((c) => c && c.personId === conId);
    if (daLaCon) continue;

    ra.push({ union: u, chung: cac.filter((id) => id && nguoiGoc.has(id)) });
  }

  ra.sort((a, b) => b.chung.length - a.chung.length);
  return ra;
}

function moHopChonCapDich(unionId, conId, xuLy, caDanhSach) {
  const dich = capChuyenDuoc(unionId, conId);

  if (dich.length === 0) {
    moHopBao('Chưa chuyển được',
             'Gia phả chưa có gia đình nào khác nhận được ' + tenNguoi(conId) + '. ' +
             'Chuyển con là dời từ một cặp ĐÃ CÓ sang một cặp ĐÃ CÓ — muốn dựng ' +
             'một gia đình mới thì phải có cha hoặc mẹ trước đã.', false,
             ['Cách làm: mở thẻ của ' + tenNguoi(conId) + ' → "Kết nối" → chọn ' +
              'người cha hoặc mẹ mới. App tự dựng cặp cho họ.']);
    return;
  }

  const gan = dich.filter((m) => m.chung.length > 0);
  const bung = !!caDanhSach || gan.length === 0;
  const hien = bung ? dich : gan;
  const conLai = bung ? 0 : dich.length - gan.length;

  const cacMuc = hien.map((m) => ({
    ma:  m.union.id,
    chu: keTenPartner(m.union.id),
    phu: [m.chung.length > 0
            ? 'Cùng ' + m.chung.map(tenNguoi).join(' và ') + ' với gia đình hiện nay'
            : '',
          moTaCap(m.union)].filter(coGiaTri).join('  ·  '),
    chay: () => moHopXacNhanChuyen(unionId, conId, m.union.id, xuLy),
  }));

  if (conLai > 0) {
    cacMuc.push({
      ma:  'ca-danh-sach',
      chu: 'Xem cả ' + conLai + ' gia đình khác',
      phu: 'Những gia đình không chung ai với gia đình hiện nay.',
      chay: () => moHopChonCapDich(unionId, conId, xuLy, true),
    });
  }

  const cacDong = ['Cặp cũ và cặp mới cùng đổi trong MỘT lần lưu — không có lúc ' +
                   'nào ' + tenNguoi(conId) + ' bị treo giữa hai nhà.'];

  moHopChon('chon', xuLy, {
    tieuDe: 'Chuyển sang gia đình nào?',
    phu:    tenNguoi(conId) + '  ·  ' + conId,
    cauMo:  tenNguoi(conId) + ' đang là con của ' + keTenPartner(unionId) +
            (bung
              ? '. Chọn gia đình nhận:'
              : '. Những gia đình CHUNG NGƯỜI với gia đình hiện nay — gần như ' +
                'lúc nào cũng là một trong số này:'),
    cacDong,
    cacMuc,
  });
}

function moHopXacNhanChuyen(unionId, conId, capMoi, xuLy) {
  const chan = moHopTrang('chuyenCon', xuLy, 'Chuyển sang gia đình khác',
                          tenNguoi(conId) + '  ·  ' + conId);

  chuyenHT = doHauQuaChuyenCon(unionId, conId, capMoi);

  const canTro = canTroLuu();
  if (canTro || !chuyenHT) {
    hienNhan(canTro || 'Không dựng được bản ghi sau khi chuyển. Có thể gia phả ' +
             'vừa thay đổi. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (!chuyenHT.raSoat.canSave) {
    hienNhan('Chưa chuyển được — có chỗ không thể đúng được:', true,
             chuyenHT.raSoat.errors.map((m) => m.message));
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Chuyển xong thì:', false, cauKeChuyenCon(unionId, conId, capMoi));

  N.nutLuu = nutChanXoa('Chuyển sang gia đình này', true,
                      () => chayChuyenCon(unionId, conId, capMoi, xuLy, chan));
  chan.append(N.nutLuu, nutChanXoa('Không chuyển', false, () => closePersonForm()));
}

function doHauQuaChuyenCon(unionId, conId, capMoi) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu  = index.unionById.get(unionId);
  const moi = index.unionById.get(capMoi);
  if (!cu || !moi) return null;

  const mucCon = (Array.isArray(cu.children) ? cu.children : [])
    .find((c) => c && c.personId === conId);
  if (!mucCon) return null;
  const quanHe = mucCon.relation || 'birth';

  const banCuNguon = JSON.parse(JSON.stringify(cu));

  const kqGo = removeChild(state.tree, unionId, conId);
  if (!kqGo) return null;
  let tree = kqGo.tree;
  let unionNguon = kqGo.union;
  const diff = Object.assign({}, kqGo.diff);

  let nguonChet = false;
  if (!conLyDoTonTai(unionNguon)) {
    const kqX = softDeleteUnion(tree, unionId);
    if (kqX) {
      tree = kqX.tree; unionNguon = kqX.union; nguonChet = true;
      Object.assign(diff, kqX.diff);
    }
  }

  const kqThem = addChild(tree, capMoi, conId, quanHe);
  if (!kqThem) return null;
  tree = kqThem.tree;
  Object.assign(diff, kqThem.diff);

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;
  }

  let raSoat = validateAll(tree, indexMoi, 'union', { unionId: capMoi });
  raSoat = gopRaSoat(raSoat, validateAll(tree, indexMoi, 'child',
    { childId: conId, unionId: capMoi }));
  if (!nguonChet) {
    raSoat = gopRaSoat(raSoat, validateAll(tree, indexMoi, 'union', { unionId }));
  }

  const lienQuan = new Set([conId]);
  for (const id of (Array.isArray(banCuNguon.partners) ? banCuNguon.partners : [])) {
    if (id) lienQuan.add(id);
  }
  for (const c of (Array.isArray(banCuNguon.children) ? banCuNguon.children : [])) {
    if (c && c.personId) lienQuan.add(c.personId);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  return { tree, quanHe, unionNguon, unionDich: kqThem.union,
           diff, nguonChet, thanhLe, raSoat };
}

function cauKeChuyenCon(unionId, conId, capMoi) {
  const A = tenNguoi(conId);
  const dong = [];

  dong.push(A + ' thôi là con của ' + keTenPartner(unionId) + '  ·  ' + unionId +
            ', và thành con của ' + keTenPartner(capMoi) + '  ·  ' + capMoi + '.');

  dong.push('Quan hệ GIỮ NGUYÊN: ' + A + ' vẫn được ghi là ' +
            nhanQuanHeCon(chuyenHT.quanHe, 'con') + ' ở gia đình mới. Muốn đổi ' +
            'thì dùng mục "Đổi quan hệ với cha mẹ".');

  dong.push(A + ' xuống CUỐI hàng anh chị em của gia đình mới. Muốn xếp lại thì ' +
            'mở thẻ gia đình ấy rồi bấm "Sắp thứ tự các con".');

  if (chuyenHT.nguonChet) {
    dong.push('⚠ ' + keTenPartner(unionId) + '  ·  ' + unionId + ' hết lý do tồn ' +
              'tại sau khi ' + A + ' đi, nên CẶP ẤY VÀO THÙNG RÁC. Không ai bị ' +
              'xoá — chỉ cái cặp mất đi, và lấy lại được ở Thùng rác.');
  }

  if (chuyenHT.thanhLe.length > 0) {
    dong.push('⚠ Sau việc này ' + chuyenHT.thanhLe.map(tenNguoi).join(' · ') +
              ' không còn nối với ai trong gia phả. Họ vẫn còn nguyên trong sổ, ' +
              'nhưng sơ đồ vẽ họ đứng lẻ một mình.');
  }

  for (const m of chuyenHT.raSoat.warnings) dong.push('⚠ ' + m.message);

  dong.push('Không ai bị xoá khỏi gia phả. Chuyển nhầm thì chuyển ngược lại, và ' +
            'nếu cặp cũ đã vào thùng rác thì lấy nó ra trước.');
  return dong;
}

async function chayChuyenCon(unionId, conId, capMoi, xuLy, chan) {
  if (N.dangLuu || !chuyenHT) return;

  const tenCon = tenNguoi(conId);
  const tenMoi = keTenPartner(capMoi);

  N.dangLuu = true;
  if (N.nutLuu) { N.nutLuu.disabled = true; N.nutLuu.style.opacity = '.45'; }
  hienNhan('Đang chuyển…', false);

  const ketQua = await ghiBanGhi(null, [chuyenHT.unionNguon, chuyenHT.unionDich], {
    action: 'update',
    target: capMoi,
    note:   'Chuyển ' + tenCon + ' từ cặp ' + unionId + ' sang cặp ' + capMoi +
            (chuyenHT.nguonChet
              ? ' (cặp ' + unionId + ' hết lý do tồn tại, vào thùng rác)' : '') + '.',
    diff:   chuyenHT.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    if (N.nutLuu) { N.nutLuu.disabled = false; N.nutLuu.style.opacity = '1'; }
    hienLoiGhi(ketQua, tenCon + ' VẪN là con của cặp cũ.');
    return;
  }

  chuyenHT = null;
  N.nutLuu   = null;
  chan.innerHTML = '';

  if (xuLy.onDaLuu) xuLy.onDaLuu(conId);

  hienNhan('Đã chuyển ' + tenCon + ' sang gia đình của ' + tenMoi + '.', false);
  chan.append(nutChon('Xong', true, () => closePersonForm()));
}
