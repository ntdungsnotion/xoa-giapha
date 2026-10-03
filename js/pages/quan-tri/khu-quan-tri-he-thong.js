import {
  layDanhSachGiaPha, layCayMacDinh, datCayMacDinh, docTruongCongKhai, datTruongCongKhai,
  dsTaiKhoanHeThong, dsThanhVien,
  duyetXoaCay, traLaiCay, phucHoiCay, donThungRac, xoaAnhThat,
  datQuanTriHeThong, datDuocTaoCay, xoaTaiKhoan, khoaTaiKhoan, moKhoaTaiKhoan,
  coMaySaoLuu,
} from '../../services/sb.js';
import { duongDan } from './trang-chi-tiet.js';
import { hoi, bao } from './hop-thoai.js';
import { veKhuSaoLuu, veLichSuSaoLuu, ganNutKhoiPhuc, ganNutSaoLuuNgay } from './khu-sao-luu.js';
import { veKhuDeNghiQuanHe } from './khu-de-nghi-quan-he.js';
import { veKhuDuyetBaoTrung } from './khu-bao-trung.js';
import { veKhuHoSoDon } from './khu-ho-so-don.js';
import { veKhuNhatKy } from './khu-nhat-ky.js';
import { veKhuTaoTaiKhoan } from './khu-tao-tai-khoan.js';
import { veKhuNguoiDaXoa } from './khu-nguoi-da-xoa.js';
import { veKhuDuLieuMoCoi } from './khu-du-lieu-mo-coi.js';
import {
  td, span, huyHieu, nut, nutNho, nutMo, lienKet, hangNut, dongTrong,
  chepKieu, ngay, ngayGio,
} from './o-bang.js';

const NGAY_THUNG_RAC = 120;

let tabDangMo = 'tong-quan';

export function datTabQuanTriHeThong(ten) {
  tabDangMo = ten;
}

export async function mountKhuQuanTriHeThong(sec, phien) {
  const napLai = () => mountKhuQuanTriHeThong(sec, phien);

  const tabUrl = new URLSearchParams(window.location.search).get('tab');
  if (tabUrl) {
    if (sec.querySelector('[data-sys-pane="' + CSS.escape(tabUrl) + '"]')) tabDangMo = tabUrl;
    history.replaceState(null, '', window.location.pathname + window.location.hash);
  }

  ganTab(sec);
  veChuaCo(sec);
  dongTrong(sec.querySelector('#stk-tbody'), 8, 'Đang đọc sổ tài khoản…');

  const hashLuc = window.location.hash;
  const [kq, cmd, tk] = await Promise.all([
    layDanhSachGiaPha(), layCayMacDinh(), dsTaiKhoanHeThong(),
  ]);
  if (window.location.hash !== hashLuc) return;

  const ds = kq.ok ? (kq.ds || []) : [];
  const dsSong = ds.filter((c) => !c.daXoaLuc);
  veTongQuan(sec, ds, cmd, tk);
  veSoTaiKhoan(sec, tk, napLai);
  veCayMacDinh(sec, dsSong, cmd, napLai);
  veThungRac(sec, kq, napLai);
  veKhuNguoiDaXoa(sec, phien);
  veKhuDuLieuMoCoi(sec, phien);
  veKhuSaoLuu(sec, dsSong);
  veLichSuSaoLuu(sec);
  ganNutKhoiPhuc(sec);
  ganNutSaoLuuNgay(sec);
  veKhuDeNghiQuanHe(sec);
  veKhuDuyetBaoTrung(sec);
  veKhuHoSoDon(sec);
  veKhuNhatKy(sec);
  veKhuTaoTaiKhoan(sec, napLai);
}

function ganTab(sec) {
  const chon = (ten) => { tabDangMo = ten; toTab(sec); };
  for (const b of sec.querySelectorAll('[data-sys-tab]')) b.onclick = () => chon(b.dataset.sysTab);
  for (const b of sec.querySelectorAll('[data-sys-goto]')) b.onclick = () => chon(b.dataset.sysGoto);
  sec.querySelector('#btn-goto-tao-tai-khoan').onclick = () => chon('tao-tai-khoan');
  toTab(sec);
}

function toTab(sec) {
  for (const b of sec.querySelectorAll('[data-sys-tab]')) {
    b.classList.toggle('active', b.dataset.sysTab === tabDangMo);
  }
  for (const p of sec.querySelectorAll('[data-sys-pane]')) {
    p.hidden = p.dataset.sysPane !== tabDangMo;
  }
}

function veChuaCo(sec) {
  const dat = (id, chu) => { sec.querySelector('#' + id).textContent = chu; };
  const mo = (chon, lyDo) => {
    for (const el of sec.querySelectorAll(chon)) { el.disabled = true; el.title = lyDo; }
  };

  const LY_SL = 'Máy sao lưu (Apps Script) chạy mỗi đêm khoảng 2 giờ, hoặc ngay khi bấm "Sao lưu ngay"; ' +
    'mỗi lần chạy tự báo vào bảng Lịch sử dưới đây. File sao lưu và ảnh nằm trong thư mục "Sao luu gia ' +
    'pha (Supabase)" trên Drive. Bảng Đối chiếu dữ liệu đọc SỐNG từ cơ sở dữ liệu. Muốn quay về một bản ' +
    'sao lưu: bấm nút khôi phục ở cuối trang.';
  dat('sl-chua-co', LY_SL);
  if (!coMaySaoLuu()) {
    mo('#btn-sao-luu-ngay', 'Chưa điền địa chỉ máy sao lưu (SAO_LUU_WEB_APP trong js/cau-hinh.js) — ' +
      'chạy hàm saoLuuNgay tại script.google.com.');
  }

  dat('nk-chua-co', 'Máy chủ tự ghi: đăng nhập, tài khoản mới, khoá/mở khoá/xoá tài khoản, cờ Quản ' +
    'trị hệ thống và quyền tạo cây, tạo/xoá/phục hồi/bàn giao gia phả, cây mặc định và trường công khai. Không ghi việc ' +
    'sửa dữ liệu trong cây (xem ở khu Kiểm duyệt). Bản sao lưu đêm tự báo về đây từ khi có SaoLuu.gs 0.6.0.');

  mo('#btn-don-tai-khoan-60ngay', 'Xoá mềm 60 ngày chưa có ở máy chủ — làm ở b118b.');

  dongTrong(sec.querySelector('#stk-cho-xoa-tbody'), 7,
    'Chưa có ở máy chủ — xoá mềm 60 ngày làm ở b118b. Hôm nay Xóa tài khoản là xoá hẳn.');
  dat('stk-cho-xoa-dem', '');
}

function veTongQuan(sec, ds, cmd, tk) {
  const dat = (id, chu) => { sec.querySelector('#' + id).textContent = chu; };

  if (tk.ok) {
    const soQT = tk.ds.filter((t) => t.laQuanTriHeThong).length;
    const soTao = tk.ds.filter((t) => t.duocTaoCay).length;
    dat('tq-tk-so', tk.ds.length + ' tài khoản');
    dat('tq-tk-mo-ta', soQT + ' Quản trị hệ thống · ' + soTao + ' được tạo cây');
  } else {
    dat('tq-tk-so', '');
    dat('tq-tk-mo-ta', tk.loi || 'Không đọc được sổ tài khoản.');
  }

  const moi = tk.ok ? tk.ds.filter((t) => t.qthtMoiLuc && !t.laQuanTriHeThong) : [];
  dat('tq-qtht-so', tk.ok ? moi.length + ' lời mời' : '');
  dat('tq-qtht-mo-ta', !tk.ok ? '' : moi.length
    ? 'Đang chờ ' + moi.map((t) => t.email).join(' · ') + ' tự bấm Chấp nhận.'
    : 'Không có lời mời Quản trị hệ thống nào đang chờ nhận.');

  const cay = ds.find((c) => c.fileId === cmd && !c.daXoaLuc);
  dat('tq-cmd-ten', cay ? (cay.ten || cay.treeCode) : 'Chưa đặt');
  dat('tq-cmd-mo-ta', cay
    ? 'Mã: ' + cay.treeCode + ' · Đang hiển thị cho khách và người chưa có quyền'
    : 'Người chưa có quyền chưa mở được cây nào.');

  const rac = ds.filter((c) => c.daXoaLuc);
  const xin = ds.filter((c) => c.xinXoaLuc && !c.daXoaLuc);
  dat('tq-rac-so', rac.length + ' cây');
  dat('tq-rac-mo-ta', [
    rac[0] ? (rac[0].ten || '') + ' (' + rac[0].treeCode + ') · Còn ' + conLaiNgay(rac[0].daXoaLuc) + ' ngày' : '',
    xin.length ? xin.length + ' yêu cầu xin xóa chờ duyệt' : '',
  ].filter(Boolean).join(' · ') || 'Thùng rác trống, không có đơn xin xoá.');
}

function veSoTaiKhoan(sec, tk, napLai) {
  const tb = sec.querySelector('#stk-tbody');
  const dem = sec.querySelector('#stk-dem');
  if (!tk.ok) { dem.textContent = ''; dongTrong(tb, 8, tk.loi || 'Không đọc được sổ tài khoản.', napLai); return; }

  if (!tk.ds.length) {
    dem.textContent = '';
    dongTrong(tb, 8, 'Máy chủ không trả về tài khoản nào. Danh sách này chỉ Quản trị hệ thống đọc ' +
      'được — nếu bạn vừa được cấp cờ ấy thì đăng xuất rồi đăng nhập lại một lần.');
    return;
  }

  dem.textContent = tk.ds.length + ' tài khoản · Bấm vào tên hoặc cột Số cây để xem chi tiết tài khoản';
  tb.innerHTML = '';
  for (const t of tk.ds) tb.append(dongTaiKhoan(t, tk.ds, napLai));
}

function dongTaiKhoan(t, ds, napLai) {
  const tr = document.createElement('tr');

  const phuTen = [t.maNgan, t.laChinhToi ? 'Bạn' : ''].filter(Boolean).join(' · ');
  const oTen = td(lienKet(t.hoTen || t.email, duongDan('quan-tri-he-thong', 'tai-khoan', t.maNgan)),
    phuTen ? span('sub', phuTen) : '');

  const email = chepKieu(span('name', t.email), 'font-weight:400');
  const xn = chepKieu(huyHieu(t.daXacNhanEmail ? 'Đã xác nhận' : 'Chưa xác nhận',
    t.daXacNhanEmail ? 'ok' : 'wait'), 'font-size:11px;padding:2px 7px');
  const oEmail = td(boc(email), chepKieu(boc(xn), 'margin-top:4px'));

  const oQT = td();
  if (t.laQuanTriHeThong) {
    oQT.append(huyHieu('Là QTHT', 'ok'));
    if (t.laChinhToi) {
      oQT.append(chepKieu(span('sub', 'Chính bạn (không tự gỡ)'), 'display:block;margin-top:2px;font-size:11px'));
    } else {
      const b = nutNho('Hủy quyền', 'danger');
      b.addEventListener('click', () => hoiCoQT(t, false, napLai));
      oQT.append(chepKieu(boc(b), 'margin-top:4px'));
    }
  } else if (t.qthtMoiLuc) {
    oQT.append(chepKieu(huyHieu('Đang chờ nhận lời mời', 'wait'), 'display:block;margin-bottom:3px'));
    oQT.append(chepKieu(span('sub', 'Mời lúc ' + ngayGio(t.qthtMoiLuc) +
      (t.emailQthtMoiBoi ? ' bởi ' + t.emailQthtMoiBoi : '')), 'display:block;margin-bottom:3px'));
    if (!t.laChinhToi) {
      const b = nutNho('Hủy lời mời', 'danger');
      b.addEventListener('click', () => hoiCoQT(t, false, napLai));
      oQT.append(b);
    }
  } else {
    oQT.append(chepKieu(span('sub', 'Chưa có'), 'display:block;margin-bottom:3px'));
    if (!t.laChinhToi) {
      const b = nutNho('Mời làm QTHT', 'warm');
      b.addEventListener('click', () => hoiCoQT(t, true, napLai));
      oQT.append(b);
    }
  }

  const oTao = td();
  if (t.duocTaoCay) {
    oTao.append(huyHieu('Được phép', 'ok'));
    if (!t.laChinhToi) {
      const b = nutNho('Thu hồi');
      b.addEventListener('click', () => hoiTaoCay(t, false, napLai));
      oTao.append(chepKieu(boc(b), 'margin-top:4px'));
    }
  } else {
    oTao.append(chepKieu(span('sub', t.laChinhToi ? 'Không' : 'Chưa có'), 'display:block;margin-bottom:3px'));
    if (!t.laChinhToi) {
      const b = nutNho('Cấp quyền');
      b.addEventListener('click', () => hoiTaoCay(t, true, napLai));
      oTao.append(b);
    }
  }

  const oSo = td(lienKet(t.soCay + ' cây →', duongDan('quan-tri-he-thong', 'tai-khoan', t.maNgan)));
  const treo = [t.soCho ? t.soCho + ' chờ' : '', t.soMoi ? t.soMoi + ' mời' : ''].filter(Boolean).join(' · ');
  if (treo) oSo.append(span('sub', treo));

  const oDn = td(t.dangNhapGanNhat ? ngayGio(t.dangNhapGanNhat) : span('muted', 'Chưa đăng nhập'));

  let oViec;
  if (t.laChinhToi) {
    oViec = td(chepKieu(span('muted', 'Không tự khóa/xóa'), 'font-size:12px'));
  } else {
    const cot = document.createElement('div');
    chepKieu(cot, 'display:flex;flex-direction:column;gap:4px;align-items:flex-start');

    if (t.khoaLuc) {
      cot.append(chepKieu(huyHieu('Đã khoá', 'danger'), 'font-size:11px;padding:2px 7px'));
      cot.append(chepKieu(span('sub', 'Từ ' + ngay(t.khoaLuc) +
        (t.khoaLyDo ? ' — “' + t.khoaLyDo + '”' : '')), 'font-size:11px'));
      const bMo = nutNho('Mở khoá');
      bMo.addEventListener('click', () => hoiMoKhoaTaiKhoan(t, napLai));
      cot.append(bMo);
    } else {
      const bKhoa = nutNho('Khóa tài khoản', 'danger');
      bKhoa.addEventListener('click', () => hoiKhoaTaiKhoan(t, napLai));
      cot.append(bKhoa);
    }

    const bXoa = t.khoaLuc ? nutNho('Xóa tài khoản', 'danger') : nutMo('Xóa tài khoản',
      'Khoá mềm trước — 60 ngày sau mới xoá hẳn được.', 'danger');
    if (t.khoaLuc) bXoa.addEventListener('click', () => hoiXoaTaiKhoan(t, ds, napLai));
    cot.append(bXoa);

    oViec = td(cot);
  }

  const oTrangThai = td(t.khoaLuc ? huyHieu('Đã khoá', 'danger') : huyHieu('Hoạt động'));
  tr.append(oTen, oEmail, oQT, oTao, oTrangThai, oSo, oDn, oViec);
  return tr;
}

function boc(el) {
  const d = document.createElement('div');
  d.append(el);
  return d;
}

async function hoiCoQT(t, bat, napLai) {
  const dangMoi = Boolean(t.qthtMoiLuc);
  const kq = await hoi({
    tua: bat ? 'Mời làm Quản trị hệ thống' : (dangMoi ? 'Hủy lời mời' : 'Hủy quyền Quản trị hệ thống'),
    chu: 'Cờ của tài khoản — cả hệ thống, không chọn cây. ' + (bat
      ? 'Gửi lời mời làm Quản trị hệ thống cho ' + t.email + '. Đây là chữ ký thứ NHẤT — họ chưa có ' +
        'một mẩu quyền nào cho tới khi tự bấm Chấp nhận (chữ ký thứ hai) ở khu Tài khoản. Nhận xong, ' +
        'cờ này cho tài khoản đọc và sửa MỌI gia phả, đổi quyền ở mọi cây, và mời người khác.'
      : dangMoi
        ? 'Hủy lời mời chưa được ' + t.email + ' nhận. Họ vẫn chưa có quyền gì từ lời mời này.'
        : 'Bạn có chắc chắn muốn hủy quyền Quản trị hệ thống của ' + t.email + '? Máy chủ không cho ' +
          'tắt người cuối cùng.'),
    nutOk: bat ? 'Gửi lời mời' : 'Hủy',
    nutHuy: 'Giữ lại',
    kieuOk: bat ? 'warm' : 'danger',
    lam: () => datQuanTriHeThong(t.userId, bat),
  });
  if (kq) napLai();
}

async function hoiTaoCay(t, bat, napLai) {
  const kq = await hoi({
    tua: bat ? 'Cấp quyền tạo cây' : 'Thu hồi quyền tạo cây',
    chu: 'Cờ của tài khoản — cả hệ thống, không riêng cây nào. ' + (bat
      ? 'Cấp quyền Tạo gia phả mới cho tài khoản ' + t.email + '? Cây họ dựng ra là cây của họ. ' +
        'Quyền này TÁCH HẲN khỏi vai Quản trị gia phả.'
      : 'Thu hồi quyền Tạo gia phả của tài khoản ' + t.email + '? Khi thu hồi, người này không thể ' +
        'tạo thêm cây mới, nhưng các cây đã tạo trước đó vẫn giữ nguyên.'),
    nutOk: bat ? 'Cấp quyền' : 'Thu hồi',
    nutHuy: bat ? 'Hủy' : 'Giữ lại',
    lam: () => datDuocTaoCay(t.userId, bat),
  });
  if (kq) napLai();
}

async function hoiKhoaTaiKhoan(t, napLai) {
  const kq = await hoi({
    tua: 'Khóa tài khoản',
    chu: 'Khoá mềm ' + t.email + ' — họ không đăng nhập được nữa cho tới khi mở khoá; nếu đang ' +
      'mở app thì mất quyền ngay và bị đăng xuất trong vòng một giờ. Không chuyển chủ cây nào ' +
      'cả. Đủ 60 ngày mới xoá hẳn được.',
    truong: [{ ma: 'email', nhan: 'Gõ lại email của tài khoản này', goiY: t.email },
      { ma: 'lyDo', nhan: 'Lý do (không bắt buộc)' }],
    nutOk: 'Khóa', nutHuy: 'Hủy', kieuOk: 'danger',
    lam: (v) => khoaTaiKhoan(t.userId, v.email.trim(), v.lyDo || ''),
  });
  if (kq) napLai();
}

async function hoiMoKhoaTaiKhoan(t, napLai) {
  const kq = await hoi({
    tua: 'Mở khoá tài khoản',
    chu: 'Mở khoá ' + t.email + ' — họ đăng nhập và dùng lại bình thường ngay.',
    nutOk: 'Mở khoá',
    lam: () => moKhoaTaiKhoan(t.userId),
  });
  if (kq) napLai();
}

async function hoiXoaTaiKhoan(t, ds, napLai) {
  const truong = [{ ma: 'email', nhan: 'Gõ lại email của tài khoản này', goiY: t.email }];
  if (t.soCayLamChu > 0) {
    truong.push({ ma: 'chuMoi', nhan: 'Ai nhận ' + t.soCayLamChu + ' gia phả tài khoản này đang làm chủ',
      chon: [['', 'Bạn nhận (mặc định)'], ...ds.filter((k) => k.userId !== t.userId).map((k) => [k.userId, k.email])] });
  }
  const kq = await hoi({
    tua: 'Xóa tài khoản',
    chu: '⚠️ Xoá HẲN tài khoản ' + t.email + ' — mất lối đăng nhập, KHÔNG hoàn tác được. ' +
      'Nhật ký ai sửa gì vẫn còn nguyên.',
    truong,
    nutOk: 'Xác nhận xóa', nutHuy: 'Hủy', kieuOk: 'danger',
    lam: (v) => xoaTaiKhoan(t.userId, v.email.trim(), v.chuMoi || ''),
  });
  if (kq) napLai();
}

function veCayMacDinh(sec, ds, cmd, napLai) {
  const cay = ds.find((c) => c.fileId === cmd) || null;

  const bMo = sec.querySelector('#btn-open-tree-selector');
  bMo.textContent = cay
    ? cay.ten + ' · ' + cay.treeCode + ' (Bấm để xem danh sách & chọn cây khác →)'
    : 'Chưa đặt (Bấm để xem danh sách & chọn cây →)';
  bMo.onclick = () => { window.location.hash = duongDan('quan-tri-he-thong', 'cay-mac-dinh', 'chon'); };

  const hang = (id, chu) => {
    const o = sec.querySelector('#' + id);
    o.closest('li').hidden = !cay || !chu;
    o.textContent = chu || '';
    return o;
  };
  hang('cmd-chu', cay && cay.emailChu);
  const oCK = hang('cmd-cong-khai', cay && (cay.choNguoiLaThayTen ? 'Đang bật cho khách' : 'Riêng tư (Chưa bật)'));
  oCK.className = 'badge' + (cay && !cay.choNguoiLaThayTen ? ' wait' : '');
  hang('cmd-so-nguoi', cay && cay.soNguoi + ' người');
  const oTV = hang('cmd-so-tv', cay ? '…' : '');
  if (cay) {
    dsThanhVien(cay.fileId).then((r) => {
      if (r.ok) oTV.textContent = r.ds.filter((t) => t.daDuyet).length + ' người';
      else oTV.closest('li').hidden = true;
    });
  }
  sec.querySelector('#btn-view-default-tree-public-detail').hidden = true;
  veTruongCongKhai(sec, cay, napLai);

  const chon = sec.querySelector('#sys-select-cay-mac-dinh');
  chon.innerHTML = '';
  for (const c of ds) {
    const op = document.createElement('option');
    op.value = c.fileId;
    op.textContent = c.ten + ' · ' + c.treeCode +
      ' (Chủ cây: ' + (c.emailChu || '—') + ' · ' + c.soNguoi + ' người)';
    chon.append(op);
  }
  const khong = document.createElement('option');
  khong.value = '';
  khong.textContent = '-- Không đặt cây mặc định --';
  chon.append(khong);
  chon.value = cay ? cay.fileId : '';

  const oLoi = sec.querySelector('#cmd-loi');
  oLoi.hidden = true;

  sec.querySelector('#btn-save-cay-mac-dinh').onclick = async () => {
    const moi = ds.find((c) => c.fileId === chon.value);
    const kq = await hoi({
      tua: 'Lưu cây mặc định',
      chu: moi
        ? 'Đặt “' + moi.ten + '” làm cây mặc định? Người chưa có quyền sẽ mở được cây này ở chế độ chỉ xem.'
        : 'Bỏ cây mặc định? Người chưa có quyền sẽ không mở được cây nào.',
      nutOk: 'Lưu thay đổi', kieuOk: 'primary',
      lam: () => datCayMacDinh(chon.value || null),
    });
    if (kq) napLai();
  };

  sec.querySelector('#btn-clear-cay-mac-dinh').onclick = async () => {
    const kq = await hoi({
      tua: 'Gỡ bỏ cây mặc định',
      chu: 'Người chưa có quyền sẽ không mở được cây nào nữa. Gỡ bỏ?',
      nutOk: 'Gỡ bỏ', kieuOk: 'danger',
      lam: () => datCayMacDinh(null),
    });
    if (kq) napLai();
  };
}

const TRUONG_CONG_KHAI = [
  ['', 'Họ và tên nhân vật', 'Họ tên và tên khác', ''],
  ['gioi_tinh', 'Giới tính', 'Nam / Nữ', 'Ẩn bảo mật'],
  ['nam_sinh', 'Năm sinh', 'Chỉ năm, ví dụ 1982', 'Ẩn bảo mật'],
  ['ngay_sinh', 'Ngày tháng sinh cụ thể', 'Ngày sinh đầy đủ và nơi sinh', 'Ẩn bảo mật'],
  ['song_mat', 'Tình trạng sinh tử', 'Còn sống / Đã mất', 'Ẩn bảo mật'],
  ['ngay_mat', 'Ngày mất, ngày giỗ & nơi an táng', 'Ngày mất · giỗ · nơi an táng', 'Ẩn bảo mật'],
  ['doi', 'Đời thứ trong tộc', 'Số Đời', 'Ẩn bảo mật'],
  ['que_quan', 'Quê quán', 'Quê quán / nơi ở', 'Ẩn bảo mật'],
  ['anh', 'Ảnh chân dung', 'Ảnh đại diện và ảnh trong hồ sơ', 'Ảnh mặc định'],
  ['tieu_su', 'Tiểu sử & Sự nghiệp', 'Ghi chú, chức danh, nghề, học vấn, tôn giáo, dân tộc', 'Ẩn bảo mật'],
  ['lien_he', 'Số điện thoại & Email liên hệ', 'Ô Liên hệ', 'Ẩn bảo mật'],
];

async function veTruongCongKhai(sec, cay, napLai) {
  const tbody = sec.querySelector('#default-tree-fields-tbody');
  const bLuu = sec.querySelector('#btn-save-default-tree-fields');
  const oDem = sec.querySelector('#cmd-truong-dem');
  const oMoTa = sec.querySelector('#cmd-truong-mo-ta');
  bLuu.disabled = true;
  oDem.hidden = true;
  oMoTa.textContent = '';

  if (!cay) {
    bLuu.title = 'Chưa đặt cây mặc định.';
    dongTrong(tbody, 4, 'Chưa đặt cây mặc định — chọn một cây ở ô dưới trước.');
    return;
  }
  dongTrong(tbody, 4, 'Đang đọc…');
  const hashLuc = window.location.hash;
  const kq = await docTruongCongKhai(cay.fileId);
  if (window.location.hash !== hashLuc) return;
  if (!kq.ok) {
    bLuu.title = kq.loi;
    dongTrong(tbody, 4, kq.loi, () => veTruongCongKhai(sec, cay, napLai));
    return;
  }

  const bat = new Set(kq.ds);
  const oTich = new Map();
  tbody.innerHTML = '';
  for (const [ma, ten, viDu, chuTat] of TRUONG_CONG_KHAI) {
    const tr = document.createElement('tr');
    const oHuy = td();
    const oViDu = td();
    let oCong;
    if (!ma) {
      oCong = chepKieu(td(chepKieu(span('muted', 'Cố định'), 'font-size:11px')), 'text-align:center');
    } else {
      const o = document.createElement('input');
      o.type = 'checkbox';
      o.className = 'def-tree-chk';
      o.checked = bat.has(ma);
      chepKieu(o, 'cursor:pointer;width:16px;height:16px');
      oTich.set(ma, o);
      oCong = chepKieu(td(o), 'text-align:center');
    }
    const oTen = document.createElement('strong');
    oTen.textContent = ten;
    tr.append(td(oTen), oHuy, oViDu, oCong);
    tr._ve = () => {
      const mo = !ma || oTich.get(ma).checked;
      oHuy.replaceChildren(huyHieu(mo ? 'Công khai' : chuTat, mo ? 'ok' : 'wait'));
      oViDu.textContent = mo ? viDu : '-';
      oViDu.className = mo ? '' : 'muted';
      if (mo) chepKieu(oViDu, 'color:var(--ink)'); else oViDu.removeAttribute('style');
    };
    tbody.append(tr);
  }

  const veLai = () => {
    const ns = oTich.get('nam_sinh');
    if (oTich.get('ngay_sinh').checked) { ns.checked = true; ns.disabled = true;
      ns.title = 'Ngày sinh cụ thể đã gồm năm sinh.'; }
    else { ns.disabled = false; ns.title = ''; }
    const nm = oTich.get('ngay_mat');
    if (!oTich.get('song_mat').checked) { nm.checked = false; nm.disabled = true;
      nm.title = 'Tình trạng sinh tử đang tắt — ngày mất cũng phải ẩn.'; }
    else { nm.disabled = false; nm.title = ''; }
    for (const tr of tbody.children) tr._ve();
    const dang = [...oTich].filter(([, o]) => o.checked).map(([m]) => m);
    oDem.textContent = (dang.length + 1) + '/' + TRUONG_CONG_KHAI.length + ' trường công khai';
    oDem.hidden = false;
    oMoTa.textContent = (dang.length + 1) + '/' + TRUONG_CONG_KHAI.length + ' trường cho tài khoản ' +
      'không có chân trong cây. Thành viên và Quản trị hệ thống luôn thấy đủ.';
    return dang;
  };
  for (const o of oTich.values()) o.onchange = veLai;
  veLai();

  bLuu.disabled = false;
  bLuu.title = '';
  bLuu.onclick = async () => {
    const dang = veLai();
    const tat = TRUONG_CONG_KHAI.filter(([m]) => m && !dang.includes(m)).map(([, t]) => t);
    const kqLuu = await hoi({
      tua: 'Lưu thiết lập hiển thị cây mặc định',
      chu: 'Khách xem “' + (cay.ten || cay.treeCode) + '” sẽ ' +
        (tat.length ? 'KHÔNG thấy: ' + tat.join(' · ') + '.' : 'thấy đủ mọi trường.') +
        ' Áp dụng ngay từ lần khách mở cây kế tiếp.',
      nutOk: 'Lưu thiết lập', kieuOk: 'warm',
      lam: () => datTruongCongKhai(cay.fileId, dang),
    });
    if (kqLuu) napLai();
  };
}

export async function mountChonCayMacDinh(sec, ctx) {
  tabDangMo = 'cay-mac-dinh';
  const tbody = sec.querySelector('#dts-tbody');
  const oHienTai = sec.querySelector('#dts-current-badge');
  dongTrong(tbody, 8, 'Đang đọc…');
  oHienTai.textContent = '';

  const hashLuc = window.location.hash;
  const [kq, cmd] = await Promise.all([layDanhSachGiaPha(), layCayMacDinh()]);
  if (window.location.hash !== hashLuc) return;

  const napLai = () => mountChonCayMacDinh(sec, ctx);
  if (!kq.ok) { dongTrong(tbody, 8, kq.loi || 'Không đọc được danh sách gia phả.', napLai); return; }

  const ds = (kq.ds || []).filter((c) => !c.daXoaLuc);
  const hienTai = ds.find((c) => c.fileId === cmd);
  oHienTai.textContent = hienTai ? hienTai.ten + ' · ' + hienTai.treeCode : 'Chưa đặt';

  if (!ds.length) { dongTrong(tbody, 8, 'Chưa có gia phả nào.'); return; }

  tbody.innerHTML = '';
  for (const c of ds) {
    const laMacDinh = c.fileId === cmd;

    const oTV = td('');
    dsThanhVien(c.fileId).then((r) => {
      if (r.ok) oTV.textContent = r.ds.filter((t) => t.daDuyet).length + ' người';
    });

    let oViec;
    if (laMacDinh) {
      oViec = chepKieu(span('muted', 'Cây hiện tại'), 'font-size:12px');
    } else if (!c.choNguoiLaThayTen) {
      oViec = nutMo('Cần bật công khai trước',
        'Cần bật Cho thấy tên (công khai sơ đồ) trước khi chọn làm mặc định');
    } else {
      oViec = nut('Chọn làm mặc định', 'warm');
      oViec.addEventListener('click', async () => {
        const r = await hoi({
          tua: 'Chọn cây mặc định',
          chu: 'Đặt “' + c.ten + '” làm cây mặc định? Người chưa có quyền sẽ mở được cây này ở chế độ chỉ xem.',
          nutOk: 'Chọn làm mặc định',
          lam: () => datCayMacDinh(c.fileId),
        });
        if (r) napLai();
      });
    }

    const tr = document.createElement('tr');
    const oMa = document.createElement('strong');
    oMa.textContent = c.treeCode;
    tr.append(
      td(span('name', c.ten || '(chưa đặt tên)')),
      td(oMa),
      td(c.emailChu || ''),
      td(c.soNguoi + ' người'),
      oTV,
      td(c.choNguoiLaThayTen ? huyHieu('Đang bật cho khách') : huyHieu('Riêng tư (Chưa bật)', 'wait')),
      td(laMacDinh ? huyHieu('Đang là mặc định') : huyHieu('Không', 'wait')),
      td(oViec),
    );
    tbody.append(tr);
  }
}

function conLaiNgay(daXoaLuc) {
  const t = Date.parse(daXoaLuc);
  if (Number.isNaN(t)) return NGAY_THUNG_RAC;
  return Math.max(0, NGAY_THUNG_RAC - Math.floor((Date.now() - t) / 86400000));
}

async function donVaXoaAnh(ids) {
  const kq = await donThungRac(ids);
  if (kq && kq.ok && Array.isArray(kq.dsAnh) && kq.dsAnh.length) await xoaAnhThat(kq.dsAnh);
  return kq;
}

function baoKetQuaDon(r) {
  const kq = r && r.kq;
  if (!kq) return;

  const phan = [];
  if (Number(kq.soNguoiMoCoi) > 0) {
    phan.push(Number(kq.soNguoiMoCoi) + ' người nay không còn thuộc gia phả nào; ' +
      'bản ghi của họ vẫn còn và chỉ Quản trị hệ thống nhìn thấy.');
  }
  if (Number(kq.soAnhRac) > 0) {
    phan.push(Number(kq.soAnhRac) + ' tấm ảnh không còn ai nhận đã bị xoá hẳn.');
  }
  const bo = kq.boQua;
  if (Array.isArray(bo) && bo.length) {
    phan.push('Máy chủ bỏ qua ' + bo.length +
      ' gia phả chưa đủ ' + NGAY_THUNG_RAC + ' ngày trong thùng rác.');
  }
  if (phan.length) bao('Đã dọn thùng rác', phan.join(' '));
}

function veThungRac(sec, kq, napLai) {
  const tbRac = sec.querySelector('#rac-tbody');
  const tbXin = sec.querySelector('#xin-xoa-tbody');
  const bDon = sec.querySelector('#btn-don-thung-rac');
  bDon.textContent = 'Dọn dẹp thùng rác (xóa cây > ' + NGAY_THUNG_RAC + ' ngày)';

  if (!kq.ok) {
    dongTrong(tbRac, 7, kq.loi || 'Không đọc được danh sách gia phả.', napLai);
    dongTrong(tbXin, 6, kq.loi || 'Không đọc được danh sách gia phả.', napLai);
    bDon.disabled = true;
    return;
  }

  const ds = kq.ds || [];
  const rac = ds.filter((c) => c.daXoaLuc);
  const xin = ds.filter((c) => c.xinXoaLuc && !c.daXoaLuc);

  sec.querySelector('#rac-dem').textContent = rac.length + ' cây · máy chủ giữ ' +
    NGAY_THUNG_RAC + ' ngày trước khi dọn được';
  sec.querySelector('#xin-xoa-dem').textContent = xin.length + ' cây chủ đã xoá · ' +
    'cây ẩn với mọi người từ lúc chủ xoá, chờ bạn duyệt vào thùng rác hoặc trả lại';

  const duDon = rac.filter((c) => conLaiNgay(c.daXoaLuc) <= 0);
  bDon.disabled = false;
  bDon.onclick = async () => {
    if (!duDon.length) {
      bao('Chưa có gì để dọn', 'Chưa gia phả nào nằm đủ ' + NGAY_THUNG_RAC + ' ngày trong thùng rác.');
      return;
    }
    const soNguoi = duDon.reduce((t, c) => t + (c.soNguoi || 0), 0);
    const r = await hoi({
      tua: 'Dọn dẹp thùng rác',
      chu: 'Xoá hẳn ' + duDon.length + ' gia phả (' + duDon.map((c) => c.ten).join(' · ') +
           '), đang chứa ' + soNguoi + ' người, cùng nguồn và nhật ký thay đổi của chúng. ' +
           'Người nào CÒN mặt trong một gia phả khác thì bản ghi của họ vẫn ở lại; ' +
           'người không còn ở đâu cả thì chỉ Quản trị hệ thống thấy. ' +
           'Việc này KHÔNG hoàn tác được — sau đây chỉ còn bản sao lưu đêm.',
      nutOk: 'Xoá hẳn', kieuOk: 'danger',
      lam: () => donVaXoaAnh(duDon.map((c) => c.fileId)),
    });
    if (r) { baoKetQuaDon(r); napLai(); }
  };

  if (!rac.length) {
    dongTrong(tbRac, 7, 'Thùng rác trống.');
  } else {
    tbRac.innerHTML = '';
    for (const c of rac) {
      const conLai = conLaiNgay(c.daXoaLuc);

      const bKhoiPhuc = nut('Khôi phục', 'warm');
      bKhoiPhuc.addEventListener('click', async () => {
        const r = await hoi({
          tua: 'Khôi phục gia phả',
          chu: 'Lấy “' + c.ten + '” ra khỏi thùng rác? Mọi người có chân trong cây dùng lại được ngay.',
          nutOk: 'Khôi phục',
          lam: () => phucHoiCay(c.fileId),
        });
        if (r) napLai();
      });

      const bXoa = conLai > 0
        ? nutMo('Xóa vĩnh viễn', 'Còn ' + conLai + ' ngày nữa mới dọn được.', 'danger')
        : nut('Xóa vĩnh viễn', 'danger');
      bXoa.addEventListener('click', async () => {
        const r = await hoi({
          tua: 'Xóa vĩnh viễn',
          chu: 'Xoá hẳn “' + c.ten + '” (đang chứa ' + c.soNguoi + ' người) cùng nguồn và ' +
               'nhật ký thay đổi của nó. Người nào còn mặt ở gia phả khác thì bản ghi của ' +
               'họ vẫn ở lại. KHÔNG hoàn tác được — sau đây chỉ còn bản sao lưu đêm.',
          nutOk: 'Xoá hẳn', kieuOk: 'danger',
          lam: () => donVaXoaAnh([c.fileId]),
        });
        if (r) { baoKetQuaDon(r); napLai(); }
      });

      const tr = document.createElement('tr');
      tr.append(
        td(span('name', c.ten || '(chưa đặt tên)')),
        td(c.treeCode),
        td(c.emailChu || ''),
        td(ngay(c.daXoaLuc)),
        td(''),
        td(conLai > 0 ? huyHieu('Còn ' + conLai + ' ngày', 'wait') : huyHieu('Dọn được', 'red')),
        td(hangNut(bKhoiPhuc, bXoa)),
      );
      tbRac.append(tr);
    }
  }

  if (!xin.length) {
    dongTrong(tbXin, 6, 'Không có đơn xin xoá nào đang chờ.');
    return;
  }
  tbXin.innerHTML = '';
  for (const c of xin) {
    const bDuyet = nut('Duyệt đưa vào thùng rác', 'danger');
    bDuyet.addEventListener('click', async () => {
      const r = await hoi({
        tua: 'Duyệt đưa vào thùng rác',
        chu: 'Duyệt xong, “' + c.ten + '” (' + c.soNguoi + ' người) đóng lại với mọi người và ' +
             'nằm trong thùng rác ' + NGAY_THUNG_RAC + ' ngày. Bản sao lưu đêm vẫn chép nó. ' +
             'Khôi phục được bất cứ lúc nào trước khi dọn.',
        nutOk: 'Duyệt', kieuOk: 'danger',
        lam: () => duyetXoaCay(c.fileId),
      });
      if (r) napLai();
    });

    const bTraLai = nut('Khôi phục lại cho chủ cây', 'warm');
    bTraLai.addEventListener('click', async () => {
      const r = await hoi({
        tua: 'Khôi phục lại cho chủ cây',
        chu: 'Bỏ đơn xin xoá “' + c.ten + '”? Cây giữ nguyên, chủ cây có thể xin lại.',
        nutOk: 'Bỏ đơn',
        lam: () => traLaiCay(c.fileId),
      });
      if (r) napLai();
    });

    const tr = document.createElement('tr');
    tr.append(
      td(span('name', c.ten || '(chưa đặt tên)')),
      td(c.treeCode),
      td(c.emailXinXoa || ''),
      td(ngayGio(c.xinXoaLuc)),
      td(c.xinXoaLyDo || ''),
      td(hangNut(bDuyet, bTraLai)),
    );
    tbXin.append(tr);
  }
}
