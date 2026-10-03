import { N, closePersonForm, moHopTrang, moHopBao, hienNhan, hienLoiGhi,
         nutChon, nutChanXoa, nutChanDam, ghiBanGhi, ghiMotNguoi,
         tenTrongCay, timNguoiTrongCay, timCapTrongCay } from './form-nen.js';
import { state } from '../state.js';
import { restorePerson, softDeletePerson } from '../domains/person.js';
import { restoreUnion, softDeleteUnion } from '../domains/union.js';
import { planPurge, applyPurge, moTaKePurge } from '../domains/purge.js';
import { luuCay } from '../services/repo.js';
import { xoaAnhThat } from '../services/sb.js';
import { stampNow } from '../utils/date.js';

export function khoiPhucNguoi(personId, xuLy = {}) {
  const nguoi = timNguoiTrongCay(personId);
  if (!nguoi) {
    moHopBao('Không tìm thấy bản ghi',
             'Không còn ai mang mã ' + personId + ' trong gia phả. Tải lại ' +
             'trang rồi mở lại thùng rác.', true);
    return;
  }
  if (nguoi.deleted !== true) {
    moHopBao('Người này đang ở trong gia phả',
             tenTrongCay(state.tree, personId) + ' không nằm trong thùng rác ' +
             'nữa — có thể người khác vừa đưa họ trở lại. Tải lại trang để thấy ' +
             'bản mới nhất.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Đưa trở lại gia phả',
                          tenTrongCay(state.tree, personId) + '  ·  ' + personId);
  hienNhan('Người này sẽ hiện lại trên sơ đồ, đúng chỗ cũ — xoá mềm không gỡ ' +
           'một mối nối nào, nên không có gì phải nối lại.',
           false, cauKeKhiTroLai(personId));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayKhoiPhucNguoi(personId)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

function cauKeKhiTroLai(personId) {
  const cacCap = (Array.isArray(state.tree.unions) ? state.tree.unions : [])
    .filter((u) => u && coMatTrongCap(u, personId));
  if (cacCap.length === 0) {
    return ['Người này không đứng trong cặp nào, nên sau khi trở lại vẫn chưa ' +
            'nối với ai. Tìm họ ở màn hình Danh sách người.'];
  }

  const capXoa = cacCap.filter((u) => u.deleted === true);
  if (capXoa.length === cacCap.length) {
    return ['Mọi cặp của người này cũng đang nằm trong thùng rác (' +
            capXoa.map((u) => u.id).join(', ') + '), nên sơ đồ vẫn chưa vẽ ra ' +
            'họ. Đưa nốt mấy cặp ấy trở lại thì mối nối mới sống lại.'];
  }
  return [];
}

function coMatTrongCap(u, personId) {
  const laPartner = (Array.isArray(u.partners) ? u.partners : []).indexOf(personId) >= 0;
  const laCon = (Array.isArray(u.children) ? u.children : [])
    .some((c) => c && c.personId === personId);
  return laPartner || laCon;
}

async function chayKhoiPhucNguoi(personId) {
  if (N.dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';
  const kq  = restorePerson(state.tree, personId, { boi, luc });
  if (!kq) {
    hienNhan('Không đưa trở lại được — bản ghi vừa đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ten = tenTrongCay(kq.tree, personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'restore',
    target: personId,
    note:   'Đưa ' + ten + ' trở lại gia phả từ thùng rác.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Người này VẪN đang trong thùng rác.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(personId);
  baoXongMotViec('Đã đưa ' + ten + ' trở lại gia phả.');
}

export function khoiPhucCap(unionId, xuLy = {}) {
  const u = timCapTrongCay(unionId);
  if (!u) {
    moHopBao('Không tìm thấy cặp',
             'Không còn cặp nào mang mã ' + unionId + '. Tải lại trang rồi mở ' +
             'lại thùng rác.', true);
    return;
  }
  if (u.deleted !== true) {
    moHopBao('Cặp này đang ở trong gia phả',
             'Cặp ' + unionId + ' không nằm trong thùng rác nữa — có thể người ' +
             'khác vừa đưa nó trở lại. Tải lại trang để thấy bản mới nhất.', false);
    return;
  }

  const ten = (Array.isArray(u.partners) ? u.partners : [])
    .filter(Boolean).map((id) => tenTrongCay(state.tree, id));

  const chan = moHopTrang('chon', xuLy, 'Đưa cặp trở lại',
                          (ten.length > 0 ? ten.join('  ↔  ') : 'Cặp chưa có ai') +
                          '  ·  ' + unionId);
  hienNhan('Cặp trở lại là mọi mối nối của nó trở lại cùng một lúc: vợ chồng, ' +
           'và cả quan hệ cha mẹ – con của những người con đứng dưới.',
           false, cauKeKhiCapTroLai(u));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayKhoiPhucCap(unionId)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

function cauKeKhiCapTroLai(u) {
  const ra = [];

  const conXoa = (Array.isArray(u.partners) ? u.partners : [])
    .filter(Boolean)
    .filter((id) => {
      const p = timNguoiTrongCay(id);
      return p && p.deleted === true;
    });

  if (conXoa.length > 0) {
    ra.push('Vẫn còn ' + conXoa.map((id) => tenTrongCay(state.tree, id)).join(', ') +
            ' đang nằm trong thùng rác, nên sơ đồ chưa vẽ ra cặp này. Đưa nốt ' +
            'họ trở lại thì mới thấy.');
  }

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId).length;
  if (soCon > 0) {
    ra.push(soCon + ' người con sẽ có lại cha mẹ trên sơ đồ.');
  }
  return ra;
}

async function chayKhoiPhucCap(unionId) {
  if (N.dangLuu) return;

  const kq = restoreUnion(state.tree, unionId);
  if (!kq) {
    hienNhan('Không đưa trở lại được — cặp vừa đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'restore',
    target: unionId,
    note:   'Đưa cặp ' + unionId + ' trở lại gia phả từ thùng rác.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Cặp này VẪN đang trong thùng rác.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(unionId);
  baoXongMotViec('Đã đưa cặp ' + unionId + ' trở lại gia phả.');
}

export function donThungRac(xuLy = {}, chiNhung = null) {
  if (!state.tree) {
    moHopBao('Chưa mở được gia phả',
             'Chưa nạp được gia phả nên chưa dọn được gì. Tải lại trang rồi thử lại.',
             true);
    return;
  }

  const ke = planPurge(state.tree, chiNhung);
  if (ke.trong) {
    moHopBao('Không có gì để xoá',
             Array.isArray(chiNhung)
               ? 'Những dòng vừa chọn không còn nằm trong thùng rác — có thể ' +
                 'người khác vừa dọn. Tải lại trang rồi mở lại thùng rác.'
               : 'Thùng rác trống. Nó chỉ chứa thứ đã bị xoá, mà hiện chưa có ' +
                 'bản ghi nào mang cờ ấy.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy,
                          Array.isArray(chiNhung) ? 'Xoá vĩnh viễn' : 'Dọn cả thùng rác',
                          'Xoá vĩnh viễn  ·  ' + moTaKePurge(ke));
  hienNhan('Xoá vĩnh viễn ' + moTaKePurge(ke) + '. KHÔNG hoàn tác được từ ' +
           'trong app — trừ khi lần dọn phải chờ duyệt: bị từ chối thì mọi thứ về lại.',
           true, cauKeKhiDonRac(ke));

  chan.append(
    nutChanXoa('Xoá vĩnh viễn', true, () => chayDonThungRac(xuLy, chiNhung)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

function cauKeKhiDonRac(ke) {
  const ra = [];

  if (ke.personIds.length > 0) {
    const ten = ke.personIds.slice(0, 4)
      .map((id) => tenTrongCay(state.tree, id) || id);
    ra.push(ten.join(', ') +
            (ke.personIds.length > 4 ? ' và ' + (ke.personIds.length - 4) + ' người nữa' : '') +
            '.');
  }

  if (ke.capPhaiGo.length > 0) {
    ra.push(ke.capPhaiGo.length + ' cặp còn trong gia phả đang giữ mã của họ; ' +
            'mã ấy được gỡ đi, sơ đồ không đổi.' +
            (ke.capHetLyDo.length > 0
              ? ' ' + ke.capHetLyDo.length + ' cặp thành cặp thừa (' +
                ke.capHetLyDo.join(', ') + ') — dọn nốt ở màn hình Rà soát.'
              : ''));
  }

  if (ke.fileIds.length > 0) {
    ra.push(ke.fileIds.length + ' file ảnh bị xoá khỏi kho — chỉ còn ở bản sao lưu đêm.' +
            (ke.anhLacChu.length > 0
              ? ' ' + ke.anhLacChu.length + ' tấm mất theo chủ, dù chưa ai gỡ.'
              : ''));
  }

  ra.push('Không có bản sao lưu riêng cho lần dọn này; đường lùi là bản sao lưu đêm gần nhất (Quản trị → Sao lưu).');
  return ra;
}

async function chayDonThungRac(xuLy, chiNhung) {
  if (N.dangLuu) return;

  const ke = planPurge(state.tree, chiNhung);
  if (ke.trong) {
    hienNhan('Thùng rác vừa trống — có thể người khác đã dọn. Không còn gì để làm.',
             false);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang sao lưu rồi dọn…', false);

  let ketQua;
  try {
    ketQua = await luuCay((cay) => {
      const kq = applyPurge(cay, chiNhung);
      if (!kq) {
        throw new Error('Bản trên Drive không còn thứ nào trong số vừa chọn. ' +
                        'Tải lại trang rồi mở lại thùng rác.');
      }
      cay.persons = kq.tree.persons;
      cay.unions  = kq.tree.unions;
      cay.media   = kq.tree.media;
    }, {
      action: 'purge',
      target: '',
      note:   (Array.isArray(chiNhung) ? 'Thùng rác: xoá vĩnh viễn '
                                       : 'Dọn cả thùng rác: xoá vĩnh viễn ') +
              moTaKePurge(ke) + '.',
      diff:   { persons: [state.tree.persons.length, state.tree.persons.length - ke.personIds.length],
                unions:  [state.tree.unions.length,  state.tree.unions.length  - ke.unionIds.length] },
    });
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'CHƯA xoá gì cả — mọi thứ vẫn nằm nguyên trong thùng rác.');
    return;
  }

  const choDuyet = ketQua.trangThai === 'cho';
  const anh = choDuyet ? null : await donAnhTrenDrive(ke.fileIds);

  if (xuLy && xuLy.onDaLuu) xuLy.onDaLuu();
  if (!N.lopPhu) return;

  const cau = cauKetQuaDonRac(ketQua, ke, anh);
  if (choDuyet) {
    cau.unshift('Lần dọn đang chờ người quản lý duyệt. Ảnh giữ nguyên trong kho tới lúc ấy; ' +
                'bị từ chối thì mọi thứ về lại như cũ.');
  }
  baoXongMotViec((choDuyet ? 'Đã gửi xoá vĩnh viễn ' : 'Đã xoá vĩnh viễn ') + moTaKePurge(ke) + '.', cau);
}

async function donAnhTrenDrive(fileIds) {
  if (!fileIds || fileIds.length === 0) return null;
  try {
    return await xoaAnhThat(fileIds);
  } catch (e) {
    return { ok: false, soXoa: 0, soHong: fileIds.length,
             loi: e && e.message ? e.message : String(e) };
  }
}

function cauKetQuaDonRac(ketQua, ke, anh) {
  const ra = [];

  if (ketQua && ketQua.saoLuu) {
    ra.push('Bản sao lưu trước khi xoá: ' + ketQua.saoLuu +
            ' — nằm trong thư mục Sao_luu trên Drive.');
  }

  if (anh === null) {
  } else if (anh && anh.soHong === 0) {
    ra.push(anh.soXoa + ' file ảnh đã xoá khỏi kho.');
  } else if (anh) {
    ra.push(anh.soXoa + ' file ảnh đã xoá khỏi kho; ' + anh.soHong +
            ' file không xoá được (có thể đã bị xoá tay từ trước). Bản ghi ' +
            'trong gia phả thì đã sạch — chỗ này chỉ còn là file thừa trong kho.');
  }

  if (ke.capHetLyDo.length > 0) {
    ra.push('Còn ' + ke.capHetLyDo.length + ' cặp không còn lý do tồn tại. ' +
            'Mở Danh sách người → Rà soát để dọn nốt.');
  }
  return ra;
}

export function khoiPhucNhieu(ids, xuLy = {}) {
  const ds = locMaDaXoa(ids);
  if (ds.length === 0) {
    moHopBao('Không còn gì để đưa trở lại',
             'Những dòng vừa chọn không còn nằm trong thùng rác. Tải lại trang ' +
             'rồi mở lại thùng rác.', false);
    return;
  }

  if (ds.length === 1) {
    if (ds[0][0] === 'U') khoiPhucCap(ds[0], xuLy);
    else                  khoiPhucNguoi(ds[0], xuLy);
    return;
  }

  const soNguoi = ds.filter((id) => id[0] !== 'U').length;
  const soCap   = ds.length - soNguoi;

  const chan = moHopTrang('chon', xuLy, 'Đưa trở lại gia phả', moTaSoLuong(soNguoi, soCap));
  hienNhan('Cả ' + ds.length + ' bản ghi sẽ hiện lại đúng chỗ cũ — xoá mềm ' +
           'không gỡ một mối nối nào, nên không có gì phải nối lại.',
           false, keTenVaiDong(ds));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayNhieuBanGhi(ds, xuLy, false)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

export function chuyenVaoThungRac(ids, xuLy = {}) {
  const ds = locMaConSong(ids);
  if (ds.length === 0) {
    moHopBao('Không còn gì để cho vào thùng rác',
             'Những dòng vừa chọn đã nằm trong thùng rác, hoặc không còn trong ' +
             'gia phả. Bấm *Rà lại* để xem bản mới nhất.', false);
    return;
  }

  const soNguoi = ds.filter((id) => id[0] !== 'U').length;
  const soCap   = ds.length - soNguoi;

  const chan = moHopTrang('chon', xuLy, 'Cho vào thùng rác', moTaSoLuong(soNguoi, soCap));
  hienNhan('Xoá mềm: bản ghi vẫn nằm nguyên trong file, chỉ mang thêm một cái ' +
           'cờ, và sơ đồ thôi vẽ ra chúng. Lấy lại được bất cứ lúc nào từ ' +
           'thùng rác.', false,
           keTenVaiDong(ds).concat([
             'Muốn xoá hẳn thì vào thùng rác chọn rồi bấm Xoá vĩnh viễn — đó là ' +
             'cửa duy nhất xoá được thật.',
           ]));

  chan.append(
    nutChanDam('Cho vào thùng rác', () => chayNhieuBanGhi(ds, xuLy, true)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

async function chayNhieuBanGhi(ds, xuLy, vaoThungRac) {
  if (N.dangLuu) return;

  N.dangLuu = true;
  hienNhan(vaoThungRac ? 'Đang cho vào thùng rác…' : 'Đang đưa trở lại…', false);

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  let ketQua;
  try {
    ketQua = await luuCay((cay) => {
      let t = cay;
      let daLam = 0;
      for (const id of ds) {
        const kq = id[0] === 'U'
          ? (vaoThungRac ? softDeleteUnion(t, id)  : restoreUnion(t, id))
          : (vaoThungRac ? softDeletePerson(t, id, { boi, luc })
                         : restorePerson(t, id, { boi, luc }));
        if (kq) { t = kq.tree; daLam++; }
      }
      if (daLam === 0) {
        throw new Error('Bản trên Drive không còn bản ghi nào trong số vừa chọn ' +
                        'ở đúng trạng thái ấy. Tải lại trang rồi làm lại.');
      }
      cay.persons = t.persons;
      cay.unions  = t.unions;
    }, {
      action: vaoThungRac ? 'delete' : 'restore',
      target: '',
      note:   (vaoThungRac ? 'Cho vào thùng rác ' : 'Đưa trở lại từ thùng rác ') +
              ds.length + ' bản ghi: ' + ds.join(' ') + '.',
      diff:   {},
    });
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, vaoThungRac
      ? 'CHƯA cho gì vào thùng rác cả.'
      : 'Mọi thứ VẪN đang nằm trong thùng rác.');
    return;
  }

  if (xuLy && xuLy.onDaLuu) xuLy.onDaLuu();
  baoXongMotViec(vaoThungRac
    ? 'Đã cho ' + ds.length + ' bản ghi vào thùng rác.'
    : 'Đã đưa ' + ds.length + ' bản ghi trở lại gia phả.');
}

function locMaDaXoa(ids) {
  return locMa(ids, true);
}

function locMaConSong(ids) {
  return locMa(ids, false);
}

function locMa(ids, mongDaXoa) {
  const ds = Array.isArray(ids) ? ids : [];
  return ds.filter((id) => {
    const x = id && id[0] === 'U' ? timCapTrongCay(id) : timNguoiTrongCay(id);
    return !!x && (x.deleted === true) === mongDaXoa;
  });
}

function moTaSoLuong(soNguoi, soCap) {
  const phan = [];
  if (soNguoi > 0) phan.push(soNguoi + ' người');
  if (soCap > 0)   phan.push(soCap + ' cặp');
  return phan.join(' và ');
}

function keTenVaiDong(ds) {
  const ten = ds.slice(0, 4).map((id) => (id[0] === 'U'
    ? 'Cặp ' + id
    : (tenTrongCay(state.tree, id) || id)));
  return [ten.join(', ') +
          (ds.length > 4 ? ' và ' + (ds.length - 4) + ' bản ghi nữa' : '') + '.'];
}

function baoXongMotViec(cau, dong) {
  hienNhan(cau, false, dong);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}
