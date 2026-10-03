import { N, KIEU_LOP_PHU, KIEU_HOP, closePersonForm, canTroLuu, ghiMotNguoi,
         hienNhan, hienLoiGhi, nutChon, nutChanXoa, tenNguoi,
         tenTrongCay, dangKyDonDep } from './form-nen.js';
import { state } from '../state.js';
import { updatePerson, softDeletePerson, restorePerson } from '../domains/person.js';
import { checkOrphanNode } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { stampNow } from '../utils/date.js';

dangKyDonDep(donDepXoa);

let xoaHT = null;

export function donDepXoa() {
  xoaHT = null;
}

export function xoaNguoi(personId, xuLy = {}) {
  const nguoi = personId && state.index && state.index.personById.get(personId);
  if (!nguoi) return;

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'xoa';

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  xoaHT = doHauQuaXoa(personId, { boi, luc });

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Xoá khỏi gia phả';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const ten = document.createElement('div');
  ten.textContent = tenNguoi(personId) + '  ·  ' + personId;
  ten.style.cssText = 'font-size:12px;color:var(--sd-chu-mo,#b3aaa0);margin-top:3px;letter-spacing:.03em';

  hop.append(tieuDe, ten);

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  hop.append(chan);

  const canTro = canTroLuu();
  if (canTro || !xoaHT) {
    hienNhan(canTro || 'Không dựng được bản ghi đã xoá. Tải lại trang rồi thử lại.', true);
  } else {
    hienNhan('Xoá xong thì:', false, cauKeHauQua(personId));

    N.nutLuu = nutChanXoa('Xoá người này', true, () => chayXoa(personId));
    chan.append(N.nutLuu);

    if (xoaHT.thanhLe.length > 0) {
      chan.append(nutChanXoa('Giữ lại làm mắt xích không tên', false,
                             () => chayGiuMatXich(personId)));
    }
  }
  chan.append(nutChanXoa('Không xoá', false, () => closePersonForm()));

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

function doHauQuaXoa(personId, ghiNhan) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const kq = softDeletePerson(state.tree, personId, ghiNhan);
  if (!kq) return null;

  let indexMoi;
  try {
    indexMoi = buildIndex(kq.tree);
  } catch (e) {
    return null;
  }

  const cacUnion = (index.unionsAsPartner.get(personId) || [])
    .concat(index.unionsAsChild.get(personId) || []);

  const hangXom = new Set();
  for (const uid of cacUnion) {
    const u = index.unionById.get(uid);
    if (!u) continue;
    for (const pid of Array.isArray(u.partners) ? u.partners : []) {
      if (pid && pid !== personId && index.personById.has(pid)) hangXom.add(pid);
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      const cid = c && c.personId;
      if (cid && cid !== personId && index.personById.has(cid)) hangXom.add(cid);
    }
  }

  const thanhLe = [];
  for (const id of hangXom) {
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  const mocCoi = [];
  for (const uid of index.unionsAsPartner.get(personId) || []) {
    const u = indexMoi.unionById.get(uid);
    if (!u) continue;
    const conSong = (Array.isArray(u.partners) ? u.partners : [])
      .filter((pid) => pid && indexMoi.personById.has(pid));
    const cacCon = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && c.personId && indexMoi.personById.has(c.personId))
      .map((c) => c.personId);
    if (conSong.length === 0 && cacCon.length > 0) mocCoi.push({ unionId: uid, cacCon });
  }

  return { kq, indexMoi, soHangXom: hangXom.size, thanhLe, mocCoi };
}

function cauKeHauQua(personId) {
  const dong = [];

  dong.push('Bản ghi KHÔNG mất khỏi file. Nó chỉ mang thêm một dấu "đã xoá" và ' +
            'biến mất khỏi sơ đồ. Bấm "Hoàn tác" ngay sau đó là đưa lại được.');

  if (xoaHT.soHangXom > 0) {
    dong.push('Người này đang nối với ' + xoaHT.soHangXom + ' người. KHÔNG ai ' +
              'trong số họ bị xoá theo — con cháu vẫn còn nguyên.');
  }

  const daKe = new Set(xoaHT.thanhLe);

  for (const id of xoaHT.thanhLe) {
    dong.push('⚠ ' + tenNguoi(id) + ' sẽ MẤT ĐƯỜNG VỀ. Sau khi xoá, không sơ đồ ' +
              'nào còn vẽ ra họ nữa, kể cả sơ đồ của chính họ hàng gần nhất. Bản ' +
              'ghi vẫn nguyên vẹn trong file: tìm lại bằng nút 🔍 ở góc trên phải, ' +
              'rồi nối lại bằng "Kết nối" trong menu. Cân nhắc nối họ vào chỗ khác ' +
              'trước, rồi hãy xoá.');
  }

  if (xoaHT.thanhLe.length > 0) {
    dong.push('CÓ LỐI KHÁC: nút "Giữ lại làm mắt xích không tên" xoá sạch tên, ' +
              'ngày và ghi chú của người này, nhưng GIỮ bản ghi cùng mọi mối nối. ' +
              'Sơ đồ còn lại một ô trống mang mã ' + personId + ', và ' +
              xoaHT.thanhLe.map(tenNguoi).join(' · ') + ' vẫn về được với ông bà. ' +
              'Dùng khi bạn tin là CÓ một người ở chỗ này, chỉ chưa biết là ai. ' +
              '(Giới tính và tình trạng còn sống giữ nguyên — đó là thuộc tính, ' +
              'không phải danh tính, và giới tính quyết định chỗ đứng trái/phải.)');
  }

  for (const m of xoaHT.mocCoi) {
    const conKhac = m.cacCon.filter((id) => !daKe.has(id));
    if (conKhac.length === 0) continue;
    dong.push(conKhac.map(tenNguoi).join(' · ') + ' sẽ không còn cha mẹ nào hiện ' +
              'trên sơ đồ (cặp ' + m.unionId + '). Họ vẫn nối được với người khác ' +
              'nên vẫn tìm tới được, chỉ là phía trên đầu họ trống.');
  }

  if (state.focusPersonId === personId) {
    const thay = N.xuLyNgoai.nguoiThayThe;
    dong.push('Đây đang là người đứng giữa sơ đồ, nên xoá xong app sẽ chuyển sang ' +
              (thay ? tenNguoi(thay) : 'một người khác') + '.');
  }

  if (state.phien && state.phien.nguoiTrungTamMacDinh === personId) {
    dong.push('Đây còn đang là người trung tâm mặc định của bạn. Sau khi xoá, màn ' +
              'hình Cài đặt sẽ báo mã này không còn ai mang — vào đó đặt lại một ' +
              'người khác.');
  }

  return dong;
}

async function chayXoa(personId) {
  if (N.dangLuu || !xoaHT) return;

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang xoá…', false);

  const nguoiMoi = xoaHT.kq.person;
  const ten = tenNguoi(personId);

  const ketQua = await ghiMotNguoi(nguoiMoi, {
    action: 'delete',
    target: personId,
    note:   'Xoá mềm ' + ten + ' khỏi gia phả.',
    diff:   xoaHT.kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Người này CHƯA bị xoá.');
    return;
  }

  if (N.xuLyNgoai.onDaXoa) N.xuLyNgoai.onDaXoa(personId);

  N.nutLuu = null;
  hienNhan('Đã xoá ' + ten + ' khỏi sơ đồ.', false,
           ['Bản ghi vẫn nằm trong file gia phả, mang dấu "đã xoá".']);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — đưa ' + ten + ' trở lại', true, () => chayHoanTac(personId)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  N.khoiKetQua.append(hang);
}

async function chayGiuMatXich(personId) {
  if (N.dangLuu) return;

  const cu = state.index && state.index.personById.get(personId);
  if (!cu) {
    hienNhan('Không tìm thấy bản ghi này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }
  const banCu = JSON.parse(JSON.stringify(cu));

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  const kq = updatePerson(state.tree, personId, {
    name:        { surname: '', middle: '', given: '' },
    burialPlace: '',
    note:        '',
    birth:       { raw: '', place: '' },
    death:       { raw: '', place: '' },
  }, { boi, luc });

  if (!kq) {
    hienNhan('Không sửa được bản ghi này. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    hienNhan('Hồ sơ này vốn đã trống sẵn — nó đang là một mắt xích không tên rồi.', false);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang xoá thông tin…', false);

  const tenCu = tenNguoi(personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'update',
    target: personId,
    note:   'Xoá danh tính của ' + tenCu + ', giữ lại làm mắt xích không tên.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hồ sơ này CHƯA bị đụng tới.');
    return;
  }

  if (N.xuLyNgoai.onDaDoi) N.xuLyNgoai.onDaDoi(personId);

  N.nutLuu = null;
  hienNhan('Đã xoá thông tin của ' + tenCu + '. Ô ' + personId +
           ' nay là một mắt xích không tên.', false,
           ['Con cháu phía dưới vẫn nối được lên ông bà qua ô này.',
            'Mai kia nhớ ra tên thì mở thẻ thông tin của ô ấy, bấm "Sửa hồ sơ".']);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — trả lại hồ sơ cũ', true, () => chayTraLaiHoSo(personId, banCu, tenCu)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  N.khoiKetQua.append(hang);
}

async function chayTraLaiHoSo(personId, banCu, tenCu) {
  if (N.dangLuu) return;
  N.dangLuu = true;
  hienNhan('Đang trả lại hồ sơ cũ…', false);

  const ketQua = await ghiMotNguoi(banCu, {
    action: 'restore',
    target: personId,
    note:   'Hoàn tác: trả lại hồ sơ của ' + tenCu + '.',
    diff:   {},
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Hồ sơ VẪN đang trống.');
    return;
  }

  if (N.xuLyNgoai.onDaDoi) N.xuLyNgoai.onDaDoi(personId);

  hienNhan('Đã trả lại hồ sơ của ' + tenCu + '.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}

async function chayHoanTac(personId) {
  if (N.dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';
  const kq  = restorePerson(state.tree, personId, { boi, luc });

  if (!kq) {
    hienNhan('Không tìm thấy bản ghi để đưa trở lại. Tải lại trang rồi kiểm lại.', true);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ten = tenTrongCay(kq.tree, personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'restore',
    target: personId,
    note:   'Hoàn tác: đưa ' + ten + ' trở lại gia phả.',
    diff:   kq.diff,
  });
  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Người này VẪN đang bị xoá.');
    return;
  }

  if (N.xuLyNgoai.onDaHoanTac) N.xuLyNgoai.onDaHoanTac(personId);

  hienNhan('Đã đưa ' + ten + ' trở lại gia phả.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}
