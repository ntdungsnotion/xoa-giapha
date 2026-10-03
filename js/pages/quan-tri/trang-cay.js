import {
  layDanhSachGiaPha, dsThanhVien, coTheQuanTri, chonGiaPha,
  doiVaiThanhVien, datTinCayThanhVien, goThanhVien,
  doiChuCay, duyetThanhVien, tuChoiThanhVien, timNguoiTrongCay, timTaiKhoan,
  xoaCay, traLaiCay, duyetXoaCay,
  dsXinDoiVai, duyetXinDoiVai,
} from '../../services/sb.js';
import { duongDan } from './trang-chi-tiet.js';
import { mountTrangNguoi } from './trang-nguoi.js';
import { hoi } from './hop-thoai.js';
import { ganGoiY, dongNguoi, dongTaiKhoan } from './o-goi-y.js';
import {
  TEN_VAI, CHON_VAI, td, span, tenVaPhu, huyHieu, datHuyHieu, nut, nutMo, mucMenu,
  hangNut, menuTuyChon, chuaCo, dongTrong, ngayGio, chepKieu,
} from './o-bang.js';

export const MUC_TRANG_CAY = [
  { ma: 'tong-quan', chu: 'Tổng quan' },
  { ma: 'nguoi', chu: 'Danh sách người', view: 'tree-people' },
  { ma: 'thanh-vien', chu: 'Thành viên & quyền', view: 'tree-members' },
  { ma: 'don-xin-vao', chu: 'Đơn xin vào', view: 'tree-requests' },
  { ma: 'vong-doi', chu: 'Chuyển quyền sở hữu / xóa' },
];

const LY_DO_QUYEN_DE_NGHI =
  'Máy chủ chưa ghi quyền đề nghị vào đơn — duyệt xong đổi vai ở bảng Thành viên (đổi ở b118b).';

export async function mountTrangCay(sec, ctx) {
  const hashLuc = window.location.hash;
  if (ctx.muc === 'nguoi') return mountTrangNguoi(sec, ctx, hashLuc);
  if (ctx.muc === 'thanh-vien') return mountThanhVien(sec, ctx, hashLuc);
  if (ctx.muc === 'don-xin-vao') return mountDonXinVao(sec, ctx, hashLuc);
  return mountChiTiet(sec, ctx, hashLuc);
}

export async function timCay(ctx) {
  const kq = await layDanhSachGiaPha();
  if (!kq.ok) return { loi: kq.loi || 'Máy chủ không trả lời.' };
  const cay = kq.ds.find((c) => c.treeCode === ctx.thamSo);
  if (cay) return { cay };
  return { loi: 'Không thấy gia phả mã ' + ctx.thamSo + ' — gõ nhầm mã, cây đã vào thùng rác, ' +
    'hoặc máy chủ không cho tài khoản này thấy cây ấy.' };
}

export function cayNho(c) {
  return { treeId: c.fileId, ten: c.ten || '', maCay: c.treeCode || '' };
}

export function nhanCay(cay) {
  return [cay.ten, cay.maCay].filter(Boolean).join(' · ') || '(gia phả không tên)';
}

export function cumCay(cay) {
  const n = nhanCay(cay);
  return /^gia\s*phả/i.test(n) ? n : 'gia phả ' + n;
}

export function goiYNguoi(treeId) {
  return (el) => ganGoiY(el, {
    tim: async (chuoi) => (await timNguoiTrongCay(treeId, chuoi)).ds,
    ve: dongNguoi,
    giaTri: (m) => m.maNguoi,
  });
}

export async function moSoDo(cay, phien) {
  if (cay.treeId === phien.treeId) { window.location.href = 'index.html'; return; }
  const kq = await hoi({
    tua: 'Đổi cây hiển thị tại sơ đồ?',
    chu: 'Trang sơ đồ sẽ mở “' + nhanCay(cay) + '” ở chế độ bạn được phép.',
    nutOk: 'Mở sơ đồ',
    lam: () => chonGiaPha(cay.treeId),
  });
  if (kq) window.location.href = 'index.html';
}

function datNguCanh(sec, chu) {
  for (const x of sec.querySelectorAll('[data-tree-context]')) x.textContent = chu;
}

export function wireTabsTrangCay(sec, ctx, maDangMo = ctx.muc) {
  const oTabs = sec.querySelector('.tabs');
  if (!oTabs) return;
  for (const b of sec.querySelectorAll('[data-td-muc]')) {
    const ma = b.dataset.tdMuc;
    if (oTabs.contains(b)) b.classList.toggle('active', ma === maDangMo);
    b.onclick = () => {
      window.location.hash = ma === 'loi-moi'
        ? duongDan('gia-pha', 'moi', ctx.thamSo)
        : duongDan('gia-pha', 'cay', ctx.thamSo, ma === MUC_TRANG_CAY[0].ma ? '' : ma);
    };
  }
}

export function datSoDon(sec, soDon) {
  const b = sec.querySelector('[data-so-don]');
  if (b) b.textContent = soDon ? String(soDon) : '';
}

function demVai(daVao) {
  const phan = [
    [daVao.filter((t) => t.laChuCay).length, 'chủ'],
    [daVao.filter((t) => !t.laChuCay && t.vai === 'quan_tri').length, 'quản trị'],
    [daVao.filter((t) => !t.laChuCay && t.vai === 'sua').length, 'thành viên'],
    [daVao.filter((t) => !t.laChuCay && t.vai === 'xem').length, 'khách'],
  ].filter(([n]) => n).map(([n, chu]) => n + ' ' + chu);
  return [daVao.length + ' người có quyền', ...phan].join(' · ');
}

export async function hoiDoiVai(t, cay, napLai) {
  const kq = await hoi({
    tua: 'Đổi vai trò',
    chu: 'Đổi vai của ' + t.email + ' trong ' + cumCay(cay) + '. Vai chỉ có hiệu lực ' +
      'trong cây này. Quyền cao nhất cấp được cho tài khoản khác là Quản trị gia phả.',
    truong: [{ ma: 'vai', nhan: 'Vai trò mới', chon: CHON_VAI,
      giaTri: CHON_VAI.some(([v]) => v === t.vai) ? t.vai : 'xem' }],
    nutOk: 'Đổi vai',
    lam: (v) => doiVaiThanhVien(cay.treeId, t.userId, v.vai),
  });
  if (kq) napLai();
}

export async function hoiTinCay(t, cay, napLai) {
  const bat = !t.tinCay;
  const kq = await hoi({
    tua: bat ? 'Bật tin cậy' : 'Tắt tin cậy',
    chu: 'Đang ' + (t.tinCay ? 'BẬT' : 'TẮT') + '. Bật là cho ' + t.email + ' ghi thẳng vào ' +
      cumCay(cay) + ': mỗi lần họ bấm Lưu là thành chính thức ngay, không qua hàng chờ ' +
      'kiểm duyệt. Cây khác không đổi theo.',
    nutOk: bat ? 'Bật tin cậy' : 'Tắt tin cậy',
    kieuOk: bat ? 'danger' : 'warm',
    lam: () => datTinCayThanhVien(cay.treeId, t.userId, bat),
  });
  if (kq) napLai();
}

export async function hoiGo(t, cay, napLai) {
  const laLoiMoi = !t.daDuyet;
  const kq = await hoi({
    tua: laLoiMoi ? 'Thu hồi lời mời' : 'Xóa khỏi gia phả',
    chu: laLoiMoi
      ? 'Thu hồi lời mời vào ' + cumCay(cay) + ' đã gửi cho ' + t.email + '?'
      : 'Gỡ ' + t.email + ' khỏi ' + cumCay(cay) + '? Tài khoản của họ vẫn còn, vẫn đăng ' +
        'nhập và xin vào lại được; chân ở những gia phả KHÁC không suy suyển.',
    nutOk: laLoiMoi ? 'Thu hồi' : 'Xóa khỏi gia phả',
    kieuOk: 'danger',
    lam: () => goThanhVien(cay.treeId, t.userId),
  });
  if (kq) napLai();
}

async function hoiBanGiaoCho(t, cay, napLai) {
  const kq = await hoi({
    tua: 'Bàn giao chủ sở hữu',
    chu: t.email + ' thành chủ ' + cumCay(cay) + ' và nhận toàn bộ quyền đổi quyền trong ' +
      'cây ấy. Chủ cũ ở lại làm Quản trị gia phả. Không có đường quay lại từ phía chủ cũ.',
    nutOk: 'Bàn giao', kieuOk: 'danger',
    lam: () => doiChuCay(cay.treeId, t.userId),
  });
  if (kq) napLai();
}

export async function hoiDuyetDon(t, cay, napLai) {
  const kq = await hoi({
    tua: 'Duyệt đơn xin gia nhập',
    chu: 'Duyệt là cấp quyền ĐỌC ' + cumCay(cay) + ' cho ' + t.email + ', và chỉ cây ấy.' +
      (t.loiNhan ? ' Lời nhắn: “' + t.loiNhan + '”.' : '') +
      ' Gắn tài khoản với một người trong sơ đồ là việc riêng, làm sau ở cột Tài khoản ' +
      'của bảng Người.',
    nutOk: 'Duyệt',
    lam: () => duyetThanhVien(cay.treeId, t.email),
  });
  if (kq) napLai();
}

export async function hoiTuChoiDon(t, cay, napLai) {
  const kq = await hoi({
    tua: 'Từ chối đơn',
    chu: 'Từ chối là XOÁ đơn của ' + t.email + ' vào ' + cumCay(cay) +
      ', không phải đánh dấu. Người ấy nộp lại được.',
    nutOk: 'Từ chối', kieuOk: 'danger',
    lam: () => tuChoiThanhVien(cay.treeId, t.email),
  });
  if (kq) napLai();
}

export async function hoiDuyetXinDoiVai(t, xin, cay, napLai) {
  const kq = await hoi({
    tua: 'Duyệt đơn xin đổi quyền',
    chu: t.email + ' xin đổi từ ' + (TEN_VAI[xin.vaiHienTai] || xin.vaiHienTai || '') + ' sang ' +
      (TEN_VAI[xin.xinVai] || xin.xinVai) + ' trong ' + cumCay(cay) +
      (xin.xinVaiLyDo ? '. Lý do: “' + xin.xinVaiLyDo + '”.' : '.'),
    nutOk: 'Duyệt', kieuOk: 'warm',
    lam: () => duyetXinDoiVai(cay.treeId, t.userId, true),
  });
  if (kq) napLai();
}

export async function hoiTuChoiXinDoiVai(t, cay, napLai) {
  const kq = await hoi({
    tua: 'Từ chối đơn xin đổi quyền',
    chu: 'Từ chối là XOÁ đơn của ' + t.email + ', không đổi vai hiện tại. Người ấy xin lại được.',
    nutOk: 'Từ chối', kieuOk: 'danger',
    lam: () => duyetXinDoiVai(cay.treeId, t.userId, false),
  });
  if (kq) napLai();
}

async function mountThanhVien(sec, ctx, hashLuc) {
  wireTabsTrangCay(sec, ctx);
  const tb = sec.querySelector('#tm-tbody');
  const dem = sec.querySelector('#tm-dem');
  const nhac = sec.querySelector('#tm-chi-xem');
  dem.textContent = '';
  nhac.hidden = true;
  datNguCanh(sec, ctx.thamSo);
  dongTrong(tb, 5, 'Đang đọc danh sách…');

  const { cay, loi } = await timCay(ctx);
  if (window.location.hash !== hashLuc) return;
  if (!cay) { datNguCanh(sec, 'Không thấy gia phả mã ' + ctx.thamSo); dongTrong(tb, 5, loi); return; }
  datNguCanh(sec, (cay.ten || '') + ' · ' + cay.treeCode);

  const [kq, duocDoiQuyen, dsXin] = await Promise.all([
    dsThanhVien(cay.fileId), coTheQuanTri(cay.fileId), dsXinDoiVai(cay.fileId),
  ]);
  if (window.location.hash !== hashLuc) return;

  const napLai = () => mountThanhVien(sec, ctx, window.location.hash);
  if (!kq.ok) { dongTrong(tb, 5, kq.loi || 'Không đọc được danh sách tài khoản.', napLai); return; }
  datSoDon(sec, kq.ds.filter((t) => !t.daDuyet && !t.moiLuc).length);

  if (!duocDoiQuyen) {
    nhac.textContent = 'Bạn xem được danh sách này nhưng không đổi được quyền của ai, và ' +
      'không duyệt được đơn xin vào — việc ấy thuộc chủ gia phả và Quản trị hệ thống. ' +
      'Bạn vẫn sửa và duyệt nội dung bình thường.';
    nhac.hidden = false;
  }

  const ds = kq.ds.filter((t) => t.daDuyet);
  dem.textContent = demVai(ds) + (dsXin.length ? ' · ' + dsXin.length + ' đơn xin đổi quyền' : '');
  if (!ds.length) { dongTrong(tb, 5, 'Chưa có ai đã vào gia phả này.'); return; }

  const xinMap = new Map(dsXin.map((x) => [x.userId, x]));
  tb.innerHTML = '';
  const c = cayNho(cay);
  for (const t of ds) tb.append(dongThanhVien(t, c, duocDoiQuyen, napLai, xinMap.get(t.userId)));
}

function dongThanhVien(t, cay, duocDoiQuyen, napLai, xin) {
  const tr = document.createElement('tr');
  if (t.laChinhToi) tr.className = 'current-account';

  const oTen = td(tenVaPhu(t.laChinhToi ? 'Bạn' : (t.hoTen || ''),
    t.maNgan ? 'Mã tài khoản: ' + t.maNgan : ''));

  const oNguoi = td(t.maNguoi
    ? tenVaPhu(t.tenNguoi || t.maNguoi, 'ID: ' + t.maNguoi)
    : span('name', 'Chưa gắn'));

  const saoLuu = t.vai === 'sao_luu'
    ? 'Tài khoản sao lưu tự động — đổi vai hay gỡ nó là bản sao lưu đêm ra file rỗng.' : '';
  const cuaMinh = t.laChinhToi
    ? 'Dòng của chính bạn — không ai đặt quyền cho chính mình được, kể cả Quản trị hệ thống.' : '';
  const khongQuyen = duocDoiQuyen ? '' : 'Chỉ chủ gia phả và Quản trị hệ thống đổi được quyền.';

  const bVai = document.createElement('button');
  bVai.type = 'button';
  bVai.className = 'link';
  bVai.textContent = t.laChuCay ? 'Quản trị · Chủ gia phả' : (TEN_VAI[t.vai] || t.vai);
  const khoaVai = khongQuyen || cuaMinh ||
    (t.laChuCay ? 'Chủ gia phả không hạ vai được — muốn đổi chủ thì Bàn giao chủ sở hữu.' : '') || saoLuu;
  if (khoaVai) { bVai.disabled = true; bVai.title = khoaVai; }
  else bVai.addEventListener('click', () => hoiDoiVai(t, cay, napLai));
  const oVai = td(bVai);
  if (t.tinCay) oVai.append(span('sub', 'Tin cậy — ghi thẳng'));
  if (xin) oVai.append(span('sub', 'Xin đổi sang ' + (TEN_VAI[xin.xinVai] || xin.xinVai).toLowerCase() +
    (xin.xinVaiLyDo ? ' — “' + xin.xinVaiLyDo + '”' : '')));

  let oViec;
  if (!duocDoiQuyen) {
    oViec = nutMo('Xóa người khỏi gia phả', khongQuyen, 'danger');
    if (t.laChinhToi) tr.classList.add('is-disabled-row');
  } else {
    const ds = [
      mucMenu(t.tinCay ? 'Tắt tin cậy (ghi thẳng)' : 'Bật tin cậy (ghi thẳng)', cuaMinh,
        () => hoiTinCay(t, cay, napLai)),
      mucMenu('Bàn giao chủ sở hữu',
        cuaMinh || (t.laChuCay ? 'Người này đang là chủ gia phả.' : '') || saoLuu,
        () => hoiBanGiaoCho(t, cay, napLai)),
    ];
    if (xin) {
      ds.push(
        mucMenu('Duyệt đổi sang ' + (TEN_VAI[xin.xinVai] || xin.xinVai).toLowerCase(), '',
          () => hoiDuyetXinDoiVai(t, xin, cay, napLai), 'warm'),
        mucMenu('Từ chối đơn xin đổi quyền', '', () => hoiTuChoiXinDoiVai(t, cay, napLai), 'danger'),
      );
    }
    ds.push(null, mucMenu('Xóa khỏi gia phả',
      cuaMinh || (t.laChuCay ? 'Không thể xóa chủ sở hữu khi chưa bàn giao' : '') || saoLuu,
      () => hoiGo(t, cay, napLai), 'danger'));
    oViec = menuTuyChon('Chọn hành động', ds);
  }
  const oHanhDong = td(oViec);
  oHanhDong.setAttribute('data-action-cell', '');

  tr.append(oTen, td(t.email), oNguoi, oVai, oHanhDong);
  return tr;
}

async function mountDonXinVao(sec, ctx, hashLuc) {
  wireTabsTrangCay(sec, ctx);
  const tb = sec.querySelector('#tr-tbody');
  const dem = sec.querySelector('#tr-dem');
  dem.textContent = '';
  datNguCanh(sec, ctx.thamSo);
  dongTrong(tb, 7, 'Đang đọc đơn…');

  const { cay, loi } = await timCay(ctx);
  if (window.location.hash !== hashLuc) return;
  if (!cay) { datNguCanh(sec, 'Không thấy gia phả mã ' + ctx.thamSo); dongTrong(tb, 7, loi); return; }
  datNguCanh(sec, (cay.ten || '') + ' · ' + cay.treeCode);

  const [kq, duocDoiQuyen] = await Promise.all([dsThanhVien(cay.fileId), coTheQuanTri(cay.fileId)]);
  if (window.location.hash !== hashLuc) return;

  const napLai = () => mountDonXinVao(sec, ctx, window.location.hash);
  if (!kq.ok) { dongTrong(tb, 7, kq.loi || 'Không đọc được danh sách đơn.', napLai); return; }

  const ds = kq.ds.filter((t) => !t.daDuyet && !t.moiLuc);
  dem.textContent = ds.length + ' đơn';
  datSoDon(sec, ds.length);
  if (!ds.length) { dongTrong(tb, 7, 'Không có đơn xin vào nào đang chờ.'); return; }

  const c = cayNho(cay);
  const lyDo = 'Duyệt đơn là cấp quyền đọc — việc của chủ gia phả và Quản trị hệ thống.';
  tb.innerHTML = '';
  for (const t of ds) {
    const bDuyet = duocDoiQuyen ? nut('Duyệt', 'warm') : nutMo('Duyệt', lyDo, 'warm');
    const bTuChoi = duocDoiQuyen ? nut('Từ chối', 'danger') : nutMo('Từ chối', lyDo, 'danger');
    if (duocDoiQuyen) {
      bDuyet.addEventListener('click', () => hoiDuyetDon(t, c, napLai));
      bTuChoi.addEventListener('click', () => hoiTuChoiDon(t, c, napLai));
    }
    const tr = document.createElement('tr');
    tr.append(
      td(tenVaPhu(t.hoTen || '', t.loiNhan ? '“' + t.loiNhan + '”' : '')),
      td(t.email),
      td(t.maNgan),
      td(''),
      td(chuaCo('Chưa có', LY_DO_QUYEN_DE_NGHI)),
      td(ngayGio(t.xinLuc || t.thamGia)),
      td(bDuyet, ' ', bTuChoi),
    );
    tb.append(tr);
  }
}

async function mountChiTiet(sec, ctx, hashLuc) {
  const $ = (id) => sec.querySelector('#' + id);

  wireTabsTrangCay(sec, ctx);
  sec.querySelector('.tabs').hidden = false;
  datSoDon(sec, 0);

  const tongQuan = $('td-tong-quan');
  const noiMuc = $('td-muc');
  tongQuan.hidden = ctx.muc !== 'tong-quan';
  noiMuc.hidden = ctx.muc === 'tong-quan';
  noiMuc.innerHTML = '';
  $('td-vi-tri').textContent = '/ ' + ctx.thamSo;
  $('td-ten').textContent = 'Đang mở gia phả…';
  $('td-phu').textContent = '';
  $('td-trang-thai').hidden = true;

  const { cay, loi } = await timCay(ctx);
  if (window.location.hash !== hashLuc) return;
  if (!cay) {
    $('td-ten').textContent = 'Không mở được gia phả';
    $('td-phu').textContent = loi;
    sec.querySelector('.tabs').hidden = true;
    tongQuan.hidden = true;
    noiMuc.hidden = true;
    return;
  }

  $('td-vi-tri').textContent = '/ ' + (cay.ten || '') + ' · ' + cay.treeCode;
  $('td-ten').textContent = cay.ten || cay.treeCode;
  $('td-phu').textContent = 'Chi tiết cây' + (cay.emailChu ? ' · Chủ cây: ' + cay.emailChu : '');
  const tt = $('td-trang-thai');
  tt.hidden = false;
  if (cay.daXoaLuc) datHuyHieu(tt, 'Trong thùng rác', 'red');
  else if (cay.xinXoaLuc) datHuyHieu(tt, 'Đang chờ duyệt xoá', 'wait');
  else datHuyHieu(tt, 'Đang hoạt động');

  const napLai = () => mountChiTiet(sec, ctx, window.location.hash);

  if (ctx.muc === 'vong-doi') { veVongDoi(noiMuc, cay, ctx.phien, napLai); }

  const kqTV = await dsThanhVien(cay.fileId);
  if (window.location.hash !== hashLuc) return;
  const ds = kqTV.ok ? kqTV.ds : [];
  const daVao = ds.filter((t) => t.daDuyet);
  const don = ds.filter((t) => !t.daDuyet && !t.moiLuc);
  datSoDon(sec, don.length);

  if (ctx.muc !== 'tong-quan') return;

  $('td-ma').textContent = cay.treeCode;
  $('td-l-ten').textContent = cay.ten || '';
  datHuyHieu($('td-l-la'), cay.choNguoiLaThayTen ? 'Đang bật' : 'Đang tắt',
    cay.choNguoiLaThayTen ? '' : 'wait');
  const dangMo = cay.fileId === ctx.phien.treeId;
  datHuyHieu($('td-l-mac-dinh'), dangMo ? 'Đang bật' : 'Đang tắt', dangMo ? '' : 'wait');

  if (!kqTV.ok) {
    $('td-l-tv').textContent = '';
    $('td-c-tv').textContent = kqTV.loi || 'Không đọc được danh sách tài khoản.';
    $('td-c-don').textContent = '';
    return;
  }
  $('td-l-tv').textContent = daVao.length + ' người';
  const loai = [
    [daVao.some((t) => t.laChuCay), 'Chủ cây'],
    [daVao.some((t) => !t.laChuCay && t.vai === 'quan_tri'), 'Quản trị cây'],
    [daVao.some((t) => !t.laChuCay && t.vai === 'sua'), 'Thành viên'],
    [daVao.some((t) => !t.laChuCay && t.vai === 'xem'), 'Khách'],
  ].filter(([co]) => co).map(([, chu]) => chu);
  $('td-c-tv').textContent = daVao.length + ' người' + (loai.length ? ' · ' + loai.join(', ') : '') + '.';
  $('td-c-don').textContent = (don.length ? don.length + ' đơn đang chờ.' : 'Không có đơn nào đang chờ.') +
    ' Lời mời chưa nhận không tính vào đây.';
}

function khungPanel(tua, phu) {
  const panel = document.createElement('div');
  panel.className = 'panel';
  const dau = document.createElement('div');
  dau.className = 'panel-head';
  const h = document.createElement('h3');
  h.textContent = tua;
  dau.append(h);
  if (phu) dau.append(span('', phu));
  panel.append(dau);
  return panel;
}

function dongList(ul, nhan, phu, ...nutPhai) {
  const li = document.createElement('li');
  const trai = document.createElement('div');
  const s = document.createElement('strong');
  chepKieu(s, 'display:block');
  s.textContent = nhan;
  trai.append(s);
  if (phu) trai.append(span('sub', phu));
  li.append(trai);
  if (nutPhai.length) li.append(hangNut(...nutPhai));
  ul.append(li);
}

function veVongDoi(noi, cay, phien, napLai) {
  const laQT = Boolean(phien.laQuanTriHeThong);
  const duocLam = cay.toiLaChu || laQT;
  const c = cayNho(cay);
  const panel = khungPanel('Chuyển quyền sở hữu & xóa gia phả', 'Bàn giao chủ sở hữu · xoá gia phả');
  const ul = document.createElement('ul');
  ul.className = 'list';
  panel.append(ul);

  const bGiao = duocLam && !cay.daXoaLuc
    ? nut('Bàn giao chủ sở hữu')
    : nutMo('Bàn giao chủ sở hữu', 'Chỉ chủ gia phả và Quản trị hệ thống bàn giao được.');
  bGiao.addEventListener('click', async () => {
    let daChon = null;
    let oEmail = null;
    const kq = await hoi({
      tua: 'Bàn giao chủ sở hữu',
      chu: 'Chuyển quyền đứng tên ' + cumCay(c) + ' cho một tài khoản khác đã có chân trong ' +
        'cây. Gõ vài chữ của tên hoặc email rồi chọn đúng một dòng gợi ý. Chủ cũ ở lại làm ' +
        'Quản trị gia phả — không có đường quay lại từ phía chủ cũ.',
      truong: [{ ma: 'email', nhan: 'Tài khoản nhận', goiY: 'gõ vài chữ của tên hoặc email',
        ganVao: (el) => {
          oEmail = el;
          return ganGoiY(el, {
            tim: async (chuoi) => (await timTaiKhoan(cay.fileId, chuoi)).ds,
            ve: dongTaiKhoan,
            giaTri: (m) => m.email,
            khiChon: (m) => { daChon = m; },
          });
        } }],
      nutOk: 'Bàn giao', kieuOk: 'danger',
      lam: () => (daChon && oEmail && oEmail.value.trim() === daChon.email
        ? doiChuCay(cay.fileId, daChon.userId)
        : { ok: false, loi: 'Chọn đúng một tài khoản trong danh sách gợi ý — không gõ tay trần được.' }),
    });
    if (kq) napLai();
  });
  dongList(ul, 'Chủ gia phả', (cay.emailChu || '') + (cay.toiLaChu ? ' (bạn)' : ''), bGiao);

  if (cay.daXoaLuc) {
    dongList(ul, 'Xóa gia phả', 'Đã ở trong thùng rác — khôi phục hoặc dọn ở Quản trị hệ thống › Thùng rác.');
  } else if (cay.xinXoaLuc) {
    const bTra = laQT ? nut('Trả lại cho chủ') : nutMo('Trả lại cho chủ', 'Chỉ Quản trị hệ thống.');
    bTra.addEventListener('click', async () => {
      const kq = await hoi({ tua: 'Trả lại cho chủ',
        chu: 'Mở lại ' + cumCay(c) + ' cho chủ gia phả — gia phả hết ẩn, dùng bình thường như trước.',
        nutOk: 'Trả lại', lam: () => traLaiCay(cay.fileId) });
      if (kq) napLai();
    });
    const bDuyet = laQT ? nut('Duyệt đưa vào thùng rác', 'danger')
      : nutMo('Duyệt đưa vào thùng rác', 'Chỉ Quản trị hệ thống duyệt xoá.', 'danger');
    bDuyet.addEventListener('click', async () => {
      const kq = await hoi({ tua: 'Duyệt đưa vào thùng rác',
        chu: 'Duyệt xong, ' + cumCay(c) + ' (' + cay.soNguoi + ' người) vào thùng rác, giữ 120 ngày. ' +
          'Khôi phục được trước khi dọn.',
        nutOk: 'Duyệt', kieuOk: 'danger', lam: () => duyetXoaCay(cay.fileId) });
      if (kq) napLai();
    });
    dongList(ul, 'Xóa gia phả', 'Đã bị ' + (cay.emailXinXoa || 'chủ cây') + ' xoá' +
      (cay.xinXoaLyDo ? ' — “' + cay.xinXoaLyDo + '”' : '') +
      '. Gia phả ĐANG ẨN với mọi người trừ Quản trị hệ thống, chờ duyệt.', bTra, bDuyet);
  } else {
    const bXoa = duocLam ? nut('Xóa cây', 'danger')
      : nutMo('Xóa cây', 'Chỉ chủ gia phả và Quản trị hệ thống xoá được gia phả.', 'danger');
    bXoa.addEventListener('click', async () => {
      const kq = await hoi({ tua: 'Xóa cây',
        chu: '⚠️ ' + cumCay(c) + ' sẽ ẨN NGAY với mọi người (trừ Quản trị hệ thống) — không còn ' +
          '"vẫn dùng được trong lúc chờ". Quản trị hệ thống sẽ trả lại cho bạn nếu nhầm, hoặc duyệt ' +
          'đưa hẳn vào thùng rác.',
        oNhap: { nhieuDong: true, goiY: 'Vì sao xoá? Ví dụ: dựng nhầm, đã gộp vào cây khác.' },
        nutOk: 'Xoá ngay', kieuOk: 'danger', lam: (lyDo) => xoaCay(cay.fileId, lyDo) });
      if (kq) napLai();
    });
    dongList(ul, 'Xóa gia phả', 'Đang dùng bình thường.', bXoa);
  }

  noi.append(panel);
}
