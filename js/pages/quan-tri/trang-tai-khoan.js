import {
  dsTaiKhoanHeThong, dsCayCuaTaiKhoan, layDanhSachGiaPha, moiVaoCay, datHoTenTaiKhoan,
  dsCongKhaiTaiKhoan,
} from '../../services/sb.js';
import { duongDan } from './trang-chi-tiet.js';
import { lienKetCongKhai } from './trang-cong-khai.js';
import { hoi } from './hop-thoai.js';
import { datTabQuanTriHeThong } from './khu-quan-tri-he-thong.js';
import {
  hoiDoiVai, hoiTinCay, hoiGo, hoiDuyetDon, hoiTuChoiDon, moSoDo, cumCay,
} from './trang-cay.js';
import {
  TEN_VAI, CHON_VAI, td, span, huyHieu, nut, mucMenu, menuTuyChon, lienKet,
  dongTrong, ngay,
} from './o-bang.js';

export async function mountTrangTaiKhoan(sec, ctx) {
  datTabQuanTriHeThong('so-tai-khoan');

  const $ = (id) => sec.querySelector('#' + id);
  const tb = $('sat-trees-tbody');
  const bHoTen = $('btn-sat-ho-ten');
  const bThem = $('btn-sat-add-to-tree');
  $('sat-acc-name').textContent = 'Đang mở tài khoản…';
  $('sat-acc-meta').textContent = '';
  $('sat-acc-code').textContent = ctx.thamSo;
  $('sat-tree-count').textContent = '';
  bHoTen.disabled = true;
  bThem.disabled = true;
  dongTrong(tb, 7, 'Đang đọc…');

  const hashLuc = window.location.hash;
  const [kq, kqCay] = await Promise.all([dsTaiKhoanHeThong(), layDanhSachGiaPha()]);
  if (window.location.hash !== hashLuc) return;
  const napLai = () => mountTrangTaiKhoan(sec, ctx);

  if (!kq.ok) {
    $('sat-acc-name').textContent = 'Không mở được tài khoản';
    dongTrong(tb, 7, kq.loi || 'Máy chủ không trả lời.', napLai);
    return;
  }

  const tk = kq.ds.find((t) => t.maNgan === ctx.thamSo);
  if (!tk) {
    const laToi = ctx.phien && ctx.phien.maNgan === ctx.thamSo;
    $('sat-acc-name').textContent = 'Không thấy tài khoản mã ' + ctx.thamSo;
    dongTrong(tb, 7, laToi
      ? 'Đây là mã tài khoản của chính bạn. Trang này chỉ Quản trị hệ thống mở được; thông tin ' +
        'của bạn nằm ở khu Tài khoản.'
      : 'Sổ tài khoản không có mã ấy — hoặc bạn không phải Quản trị hệ thống, và chỉ Quản trị hệ ' +
        'thống xem được tài khoản của người khác.');
    return;
  }

  const quyen = [tk.laQuanTriHeThong ? 'Quản trị hệ thống' : '', tk.duocTaoCay ? 'Được tạo cây' : '']
    .filter(Boolean).join(' · ') || 'Thành viên thông thường';
  $('sat-acc-name').textContent = 'Các gia phả của ' + (tk.hoTen || tk.email);
  const meta = $('sat-acc-meta');
  meta.textContent = ['Mã: ' + tk.maNgan, tk.email, 'Quyền hệ thống: ' + quyen,
    tk.khoaLuc ? 'Trạng thái: Đã khoá' : 'Trạng thái: Hoạt động',
    tk.tenDongHo ? 'Dòng họ: ' + tk.tenDongHo : ''].filter(Boolean).join(' · ');
  meta.append(' · Gắn với: ', tk.maNguoiGan
    ? lienKet((tk.tenNguoiGan || tk.maNguoiGan) + ' (' + tk.maNguoiGan + ')',
      duongDan('quan-tri-he-thong', 'nguoi', tk.maNguoiGan))
    : 'chưa gắn người nào');
  $('sat-acc-code').textContent = tk.maNgan;

  bHoTen.disabled = false;
  bHoTen.onclick = async () => {
    const r = await hoi({
      tua: 'Đổi họ tên tài khoản',
      chu: 'Tên để NHẬN MẶT ' + tk.email + ' trong ô gợi ý — không phải tên người trong sơ đồ gia ' +
        'phả. Bỏ trống thì ô gợi ý chỉ hiện được địa chỉ email.',
      truong: [{ ma: 'ten', nhan: 'Họ tên', goiY: 'Nguyễn Văn Hùng — để trống là xoá tên', giaTri: tk.hoTen || '' }],
      nutOk: 'Lưu họ tên',
      lam: (v) => datHoTenTaiKhoan(tk.userId, v.ten),
    });
    if (r) napLai();
  };

  const dsCay = kqCay.ok ? kqCay.ds.filter((c) => !c.daXoaLuc) : [];
  const moiVao = async () => {
    const r = await hoi({
      tua: 'Thêm tài khoản vào gia phả',
      chu: 'Mời ' + tk.email + ' vào một gia phả. Lời mời là chữ ký thứ nhất — tài khoản này phải ' +
        'tự bấm Nhận thì mới thật sự vào cây. Ô gia phả mở ra ở mục trống, cố ý: lời mời phải nói ' +
        'rõ mời vào cây nào.',
      truong: [
        { ma: 'cay', nhan: 'Gia phả', chon: [['', '— chọn gia phả —'],
          ...dsCay.map((c) => [c.fileId, (c.ten || '') + ' · ' + c.treeCode])], giaTri: '' },
        { ma: 'vai', nhan: 'Quyền khi tham gia', chon: CHON_VAI, giaTri: 'sua' },
      ],
      nutOk: 'Gửi lời mời',
      lam: (v) => (v.cay ? moiVaoCay(v.cay, tk.email, v.vai)
        : { ok: false, loi: 'Chưa chọn gia phả — lời mời phải nói rõ mời vào cây nào.' }),
    });
    if (r) napLai();
  };
  bThem.disabled = tk.laChinhToi || !dsCay.length;
  bThem.title = tk.laChinhToi ? 'Không ai tự mời mình vào cây được.' : '';
  bThem.onclick = moiVao;

  const kqDs = await dsCayCuaTaiKhoan(tk.userId);
  if (window.location.hash !== hashLuc) return;
  if (!kqDs.ok) { dongTrong(tb, 7, kqDs.loi || 'Không đọc được các gia phả của tài khoản này.', napLai); return; }

  const ds = kqDs.ds;
  const soVao = ds.filter((c) => c.daDuyet).length;
  const treo = ds.length - soVao;
  const soChu = ds.filter((c) => c.laChuCay).length;
  $('sat-tree-count').textContent = 'Đang tham gia ' + soVao + ' cây' +
    (soChu ? ' · làm chủ ' + soChu + ' cây' : '') +
    (treo ? ' · ' + treo + ' đơn hoặc lời mời đang chờ' : '');

  if (!ds.length) {
    const o = dongTrong(tb, 7, 'Tài khoản này hiện chưa tham gia cây gia phả nào.');
    if (!bThem.disabled) {
      const b = nut('+ Thêm vào cây', 'warm');
      b.style.marginLeft = '8px';
      b.addEventListener('click', moiVao);
      o.append(b);
    }
    return;
  }

  tb.innerHTML = '';
  const huaCK = dsCongKhaiTaiKhoan(tk.userId);
  for (const c of ds) tb.append(dongCay(c, tk, ctx.phien, napLai, huaCK));
}

function dongCay(c, tk, phien, napLai, huaCK) {
  const tt = c.daDuyet ? 'thanhvien' : c.moiLuc ? 'duocmoi' : 'donxin';
  const cay = { treeId: c.treeId, ten: c.ten, maCay: c.maCay };
  const t = {
    userId: tk.userId, email: tk.email, maNgan: tk.maNgan, laChinhToi: tk.laChinhToi,
    vai: c.vai, daDuyet: c.daDuyet, maNguoi: c.maNguoi, tenNguoi: c.tenNguoi,
    tinCay: c.tinCay, laChuCay: c.laChuCay,
  };

  const maCay = document.createElement('strong');
  maCay.textContent = c.maCay;

  const vaiHien = tt === 'duocmoi' ? (c.moiVai || c.vai) : c.vai;
  const vai = huyHieu(c.laChuCay ? 'Chủ gia phả' : (TEN_VAI[vaiHien] || vaiHien),
    c.laChuCay || vaiHien === 'quan_tri' ? '' : 'wait');

  const trang = td(
    huyHieu(tt === 'thanhvien' ? 'Đã duyệt' : tt === 'duocmoi' ? 'Được mời — chờ họ bấm Nhận' : 'Đơn chờ duyệt',
      tt === 'thanhvien' ? '' : 'wait'),
    c.thamGia ? span('sub', ngay(c.thamGia)) : '');

  const cuaMinh = tk.laChinhToi
    ? 'Tài khoản của chính bạn — không ai đặt quyền cho chính mình được.' : '';
  const saoLuu = c.vai === 'sao_luu'
    ? 'Tài khoản sao lưu tự động — đổi vai hay gỡ nó là bản sao lưu đêm ra file rỗng.' : '';

  const ds = [];
  if (tt === 'thanhvien') {
    ds.push(
      mucMenu('Đổi vai trò trong cây',
        cuaMinh || (c.laChuCay ? 'Chủ gia phả không hạ vai được — bàn giao trước.' : '') || saoLuu,
        () => hoiDoiVai(t, cay, napLai)),
      mucMenu(c.tinCay ? 'Tắt tin cậy (ghi thẳng)' : 'Bật tin cậy (ghi thẳng)', cuaMinh,
        () => hoiTinCay(t, cay, napLai)),
      mucMenu('Gỡ khỏi gia phả',
        cuaMinh || (c.laChuCay ? 'Không thể gỡ chủ sở hữu khi chưa bàn giao.' : '') || saoLuu,
        () => hoiGo(t, cay, napLai), 'danger'),
    );
  } else if (tt === 'donxin') {
    ds.push(
      mucMenu('Duyệt đơn vào ' + cumCay(cay), cuaMinh, () => hoiDuyetDon(t, cay, napLai)),
      mucMenu('Từ chối đơn', cuaMinh, () => hoiTuChoiDon(t, cay, napLai), 'danger'),
    );
  } else {
    ds.push(mucMenu('Thu hồi lời mời', '', () => hoiGo(t, cay, napLai), 'danger'));
  }
  ds.push(null,
    mucMenu('Mở bảng thành viên của cây', '', () => {
      window.location.hash = duongDan('gia-pha', 'cay', c.maCay, 'thanh-vien');
    }),
    mucMenu('Xem sơ đồ', '', () => moSoDo(cay, phien)));

  const tr = document.createElement('tr');
  tr.append(
    td(lienKet(c.ten || c.maCay, duongDan('gia-pha', 'cay', c.maCay)), span('sub', 'Mã: ' + c.maCay)),
    td(maCay),
    td(vai),
    td(...(c.maNguoi
      ? [lienKet(c.tenNguoi || c.maNguoi, duongDan('quan-tri-he-thong', 'nguoi', c.maNguoi)),
        span('sub', 'ID: ' + c.maNguoi)]
      : [span('name', 'Chưa gắn')])),
    td(tt === 'thanhvien'
      ? lienKetCongKhai(duongDan('quan-tri-he-thong', 'cong-khai', tk.maNgan + '~' + c.maCay), huaCK, c.treeId)
      : ''),
    trang,
    td(menuTuyChon('Chọn ▾', ds)),
  );
  return tr;
}
