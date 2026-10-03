import { N, TEN_QUAN_HE, closePersonForm, canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi,
         keTenPartner, tenNguoi, moTaCap, moHopTrang, moHopChon, moHopBao,
         nutChon, nutChanXoa, dangKyDonDep } from './form-nen.js';
import { state } from '../state.js';
import { removeChild, removePartner, softDeleteUnion, conLyDoTonTai,
         getParentUnions, getSpouses, getChildren } from '../domains/union.js';
import { checkOrphanNode } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { chuThichQuanHe } from '../config.js';

dangKyDonDep(donDepGoNoi);

let goHT = null;

export function donDepGoNoi() {
  goHT = null;
}

export function goNoiNguoi(personId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;

  const cacMuc = [];

  for (const u of getParentUnions(index, personId)) {
    cacMuc.push({
      ma: 'parent:' + u.id,
      chu: 'Cha mẹ: ' + keTenPartner(u.id),
      phu: 'Gỡ khỏi CẢ CẶP — không tách riêng cha hay mẹ được  ·  ' + u.id,
      nguyHiem: true,
      chay: () => unlink(personId, '', 'parent', Object.assign({ unionId: u.id }, xuLy)),
    });
  }

  for (const m of getSpouses(index, personId)) {
    cacMuc.push({
      ma: 'spouse:' + m.personId,
      chu: 'Vợ / chồng: ' + tenNguoi(m.personId),
      phu: moTaCap(index.unionById.get(m.unionId) || {}),
      nguyHiem: true,
      chay: () => unlink(personId, m.personId, 'spouse',
                         Object.assign({ unionId: m.unionId }, xuLy)),
    });
  }

  for (const m of getChildren(index, personId)) {
    const chuThich = chuThichQuanHe(m.relation, 'con');
    cacMuc.push({
      ma: 'child:' + m.personId,
      chu: 'Con: ' + tenNguoi(m.personId),
      phu: (chuThich ? chuThich + '  ·  ' : '') + m.unionId,
      nguyHiem: true,
      chay: () => unlink(personId, m.personId, 'child',
                         Object.assign({ unionId: m.unionId }, xuLy)),
    });
  }

  if (cacMuc.length === 0) {
    moHopBao('Gỡ nối', tenNguoi(personId) + ' chưa nối với ai trong gia phả, nên ' +
             'không có mối nối nào để gỡ.', false,
             ['Muốn nối họ vào gia phả thì dùng "Kết nối" trong menu.']);
    return;
  }

  moHopChon('chon', xuLy, {
    tieuDe: 'Gỡ nối',
    phu:    tenNguoi(personId) + '  ·  ' + personId,
    cauMo:  'Bỏ mối nối nào? Không ai bị xoá khỏi gia phả — chỉ mối nối mất đi.',
    cacMuc,
  });
}

export function unlink(personId, targetId, relationType, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;
  if (!TEN_QUAN_HE[relationType]) return;

  const hop = capKhopVoi(personId, targetId, relationType);

  if (hop.length === 0) {
    moHopBao('Gỡ nối', 'Không tìm thấy mối nối này nữa. Có thể gia phả vừa thay ' +
             'đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  const daChon = xuLy.unionId && hop.indexOf(xuLy.unionId) >= 0 ? xuLy.unionId
               : (hop.length === 1 ? hop[0] : '');

  if (!daChon) {
    moHopChon('chon', xuLy, {
      tieuDe: 'Gỡ nối',
      phu:    tenNguoi(personId) + '  ·  ' + personId,
      cauMo:  'Mối nối này có ở ' + hop.length + ' cặp. Gỡ khỏi cặp nào?',
      cacMuc: hop.map((uid) => ({
        ma: uid,
        chu: keTenPartner(uid),
        phu: moTaCap(index.unionById.get(uid) || {}),
        nguyHiem: true,
        chay: () => unlink(personId, targetId, relationType,
                           Object.assign({}, xuLy, { unionId: uid })),
      })),
    });
    return;
  }

  moHopXacNhanGo(personId, targetId, relationType, daChon, xuLy);
}

function capKhopVoi(personId, targetId, loai) {
  const index = state.index;
  const ra = [];

  if (loai === 'parent') {
    for (const u of getParentUnions(index, personId)) ra.push(u.id);
  } else if (loai === 'spouse') {
    for (const m of getSpouses(index, personId)) if (m.personId === targetId) ra.push(m.unionId);
  } else {
    for (const m of getChildren(index, personId)) if (m.personId === targetId) ra.push(m.unionId);
  }
  return ra.filter((id, i) => ra.indexOf(id) === i);
}

function moHopXacNhanGo(personId, targetId, loai, unionId, xuLy) {
  const chan = moHopTrang('go', xuLy, 'Gỡ nối',
                          tenNguoi(personId) + '  ·  ' + personId);

  goHT = doHauQuaGoNoi(personId, targetId, loai, unionId);

  const canTro = canTroLuu();
  if (canTro || !goHT) {
    hienNhan(canTro || 'Không dựng được bản ghi đã gỡ. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Gỡ xong thì:', false, cauKeHauQuaGoNoi(personId, targetId, loai, unionId));

  N.nutLuu = nutChanXoa('Gỡ mối nối này', true, () => chayGoNoi(personId, targetId, loai));
  chan.append(N.nutLuu, nutChanXoa('Không gỡ', false, () => closePersonForm()));
}

function doHauQuaGoNoi(personId, targetId, loai, unionId) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu = index.unionById.get(unionId);
  if (!cu) return null;
  const banCu = JSON.parse(JSON.stringify(cu));

  const kq = (loai === 'spouse')
    ? removePartner(state.tree, unionId, targetId)
    : removeChild(state.tree, unionId, loai === 'child' ? targetId : personId);
  if (!kq) return null;

  let tree  = kq.tree;
  let union = kq.union;
  const diff = Object.assign({}, kq.diff);

  let capChet = false;
  if (!conLyDoTonTai(union)) {
    const kqX = softDeleteUnion(tree, unionId);
    if (kqX) {
      tree = kqX.tree; union = kqX.union; capChet = true;
      Object.assign(diff, kqX.diff);
    }
  }

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;
  }

  const lienQuan = new Set([personId, targetId]);
  for (const id of (Array.isArray(banCu.partners) ? banCu.partners : [])) {
    if (id) lienQuan.add(id);
  }
  for (const c of (Array.isArray(banCu.children) ? banCu.children : [])) {
    if (c && c.personId) lienQuan.add(c.personId);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  const conMatChaMe = (loai === 'spouse')
    ? (Array.isArray(banCu.children) ? banCu.children : [])
        .map((c) => c && c.personId)
        .filter((id) => id && index.personById.has(id))
    : [];

  return { tree, union, banCu, diff, capChet, thanhLe, conMatChaMe };
}

function cauKeHauQuaGoNoi(personId, targetId, loai, unionId) {
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);
  const dong = [];

  if (loai === 'spouse') {
    dong.push(B + ' và ' + A + ' thôi là vợ chồng. Hai bản ghi người vẫn còn ' +
              'nguyên trong gia phả, không ai bị xoá.');
    if (goHT.conMatChaMe.length > 0) {
      dong.push('⚠ ' + B + ' đồng thời thôi làm cha/mẹ của ' +
                goHT.conMatChaMe.map(tenNguoi).join(' · ') +
                '. Trong gia phả này quan hệ cha mẹ – con đi QUA cặp, nên không ' +
                'tách riêng được. Nếu bạn chỉ muốn ghi là hai người đã ly hôn mà ' +
                'vẫn giữ quan hệ cha con thì ĐỪNG gỡ nối ở đây.');
    }
  } else if (loai === 'child') {
    dong.push(B + ' thôi là con của ' + keTenPartner(unionId) + '. Bản ghi của ' +
              B + ' vẫn còn nguyên, không bị xoá.');
  } else {
    dong.push(A + ' thôi là con của ' + keTenPartner(unionId) + ' — CẢ CẶP, ' +
              'không tách riêng cha hay mẹ được.');
  }

  if (goHT.capChet) {
    dong.push('Cặp ' + unionId + ' sau đó không còn nói lên điều gì nữa (không ' +
              'còn đủ hai vợ chồng, cũng không còn quan hệ cha mẹ – con nào), ' +
              'nên app xoá luôn cặp ấy. Bản ghi cặp vẫn nằm trong file, mang dấu ' +
              '"đã xoá", và "Hoàn tác" đưa lại được nguyên vẹn.');
  }

  for (const id of goHT.thanhLe) {
    dong.push('⚠ ' + tenNguoi(id) + ' sẽ MẤT ĐƯỜNG VỀ. Sau khi gỡ, không sơ đồ ' +
              'nào còn vẽ ra họ nữa. Bản ghi vẫn nguyên vẹn, và tìm lại được ' +
              'bằng nút 🔍 ở góc trên phải rồi nối lại bằng "Kết nối" — nhưng ' +
              'nếu bạn không định làm thế thì cân nhắc nối họ vào chỗ khác trước.');
  }

  dong.push('Bấm "Hoàn tác" ngay sau đó là trả lại mối nối cũ, nguyên vẹn.');
  return dong;
}

async function chayGoNoi(personId, targetId, loai) {
  if (N.dangLuu || !goHT) return;

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang gỡ…', false);

  const unionId = goHT.union.id;
  const banCu   = goHT.banCu;
  const cau     = (loai === 'spouse')
    ? 'Gỡ ' + tenNguoi(targetId) + ' khỏi hàng vợ/chồng của ' + unionId
    : (loai === 'child'
      ? 'Gỡ ' + tenNguoi(targetId) + ' khỏi hàng con của ' + unionId
      : 'Gỡ ' + tenNguoi(personId) + ' khỏi hàng con của ' + unionId);

  const ketQua = await ghiBanGhi(null, [goHT.union], {
    action: 'update',
    target: unionId,
    note:   cau + (goHT.capChet ? ', và xoá mềm cặp ấy vì nó không còn nói lên gì.' : '.'),
    diff:   goHT.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Mối nối này CHƯA bị gỡ.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(personId);

  N.nutLuu = null;
  hienNhan('Đã gỡ mối nối.', false,
           goHT.capChet
             ? ['Cặp ' + unionId + ' cũng đã được xoá mềm cùng lúc.']
             : []);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — nối lại như cũ', true, () => chayHoanTacGoNoi(personId, banCu)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  N.khoiKetQua.append(hang);
}

async function chayHoanTacGoNoi(personId, banCu) {
  if (N.dangLuu) return;
  N.dangLuu = true;
  hienNhan('Đang nối lại…', false);

  const ketQua = await ghiBanGhi(null, [banCu], {
    action: 'restore',
    target: banCu.id,
    note:   'Hoàn tác: trả lại nguyên trạng cặp ' + banCu.id + '.',
    diff:   {},
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Mối nối VẪN đang bị gỡ.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(personId);

  hienNhan('Đã nối lại như cũ.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}
