import {
  layDanhSachGiaPha, datChoNguoiLaThayTen, chonGiaPha, xinVaoCay, taoGiaPhaMoi,
  nhanLoiMoi, tuChoiLoiMoi, rutDonXinVao, roiCay, dsThanhVien,
  xoaCay, traLaiCay, xinDoiVai, demChoKiemDuyet, dsCongKhaiTaiKhoan,
} from '../../services/sb.js';
import { sinhMaCay } from '../../utils/id.js';
import { duongDan } from './trang-chi-tiet.js';
import { veKhuBaoTrung } from './khu-bao-trung.js';
import { lienKetCongKhai } from './trang-cong-khai.js';
import { hoi, bao } from './hop-thoai.js';
import {
  TEN_VAI, td, span, tenVaPhu, huyHieu, nut, nutMo, lienKet, hangNut,
  menuTuyChon, mucMenu, dongTrong, dongLoi,
} from './o-bang.js';

const SO_COT = { manage: 9, member: 7, available: 6 };

const LY_DO_QUYEN_DE_NGHI =
  'Máy chủ chưa ghi quyền đề nghị vào đơn — người duyệt chọn quyền lúc duyệt (đổi ở b118b).';

let chipDangMo = 'manage';

export async function mountKhuGiaPha(sec, phien) {
  ganChip(sec);
  veScope(sec, phien);
  ganTaoMoi(sec, phien);
  veKhuBaoTrung(sec);
  await nap(sec, phien);
}

function ganChip(sec) {
  for (const b of sec.querySelectorAll('[data-family-tab]')) {
    b.onclick = () => { chipDangMo = b.dataset.familyTab; toChip(sec); };
  }
  toChip(sec);
}

function toChip(sec) {
  for (const b of sec.querySelectorAll('[data-family-tab]')) {
    b.classList.toggle('active', b.dataset.familyTab === chipDangMo);
  }
  for (const p of sec.querySelectorAll('[data-family-pane]')) {
    p.hidden = p.dataset.familyPane !== chipDangMo;
  }
}

function veScope(sec, phien) {
  const chu = [phien.tenCay, phien.maCay].filter(Boolean).join(' · ');
  sec.querySelector('[data-scope-cay]').hidden = !chu;
  sec.querySelector('[data-cay-dang-mo]').textContent = chu;
}

async function nap(sec, phien) {
  const tb = {};
  for (const ma of Object.keys(SO_COT)) {
    tb[ma] = sec.querySelector('[data-tbody="' + ma + '"]');
    dongTrong(tb[ma], SO_COT[ma], 'Đang đọc danh sách…');
  }

  const hashLuc = window.location.hash;
  const kq = await layDanhSachGiaPha();
  if (window.location.hash !== hashLuc) return;

  const napLai = () => nap(sec, phien);

  if (!kq.ok) {
    for (const ma of Object.keys(SO_COT)) {
      dongTrong(tb[ma], SO_COT[ma], kq.loi || 'Không đọc được danh sách gia phả.', napLai);
    }
    return;
  }

  const ds = (kq.ds || []).filter((c) => !c.daXoaLuc);

  const dsQuanLy = ds.filter((c) => c.toiLaChu || c.vaiCuaToi === 'quan_tri');
  const dsThanhVien = ds.filter((c) => !dsQuanLy.includes(c) && (c.vaiCuaToi || c.duocMoi));
  const dsXinVao = ds.filter((c) => !c.vaiCuaToi && !c.duocMoi && !c.toiLaChu);

  const huaCK = dsCongKhaiTaiKhoan();
  veBang(tb.manage, SO_COT.manage, dsQuanLy,
    'Bạn chưa quản lý gia phả nào — làm chủ hoặc được phong Quản trị gia phả thì cây ấy hiện ở đây.',
    (c) => dongQuanLy(c, phien, napLai, huaCK));
  veBang(tb.member, SO_COT.member, dsThanhVien,
    'Bạn chưa là thành viên của gia phả nào khác.',
    (c) => dongThanhVien(c, phien, napLai, huaCK));
  veBang(tb.available, SO_COT.available, dsXinVao,
    'Không có gia phả nào khác để xin vào lúc này.',
    (c) => dongXinVao(c, phien, napLai));
}

function veBang(tbody, soCot, ds, chuRong, veDong) {
  if (!ds.length) { dongTrong(tbody, soCot, chuRong); return; }
  tbody.innerHTML = '';
  for (const c of ds) tbody.append(veDong(c));
}

function dongQuanLy(c, phien, napLai, huaCK) {
  const tr = document.createElement('tr');
  const duocDieuHanh = c.toiLaChu || phien.laQuanTriHeThong;

  const oTen = td(lienKet(c.ten || '(chưa đặt tên)', '#' + duongDan('gia-pha', 'cay', c.treeCode)),
    span('sub', 'Mã cây: ' + c.treeCode));

  const oQuyen = td(huyHieu(c.toiLaChu ? 'Chủ gia phả'
    : (TEN_VAI[c.vaiCuaToi] || c.vaiCuaToi || '')));

  const lkTV = lienKet('Xem danh sách →', '#' + duongDan('gia-pha', 'cay', c.treeCode, 'thanh-vien'));
  const phuTV = span('sub', '');
  const oTV = td(lkTV, phuTV);

  const oCongKhai = td(lienKetCongKhai(duongDan('gia-pha', 'cong-khai', c.treeCode), huaCK, c.fileId));
  const oLa = td(oCongTac(c, duocDieuHanh));
  const oHienThi = td(oCayHienThi(c, phien, 'Cây mặc định'));

  const oMoi = td(duocDieuHanh
    ? lienKet('Mời', '#' + duongDan('gia-pha', 'moi', c.treeCode))
    : span('muted', 'Không phải chủ'));

  const lkDon = lienKet('Xem đơn →', '#' + duongDan('gia-pha', 'cay', c.treeCode, 'don-xin-vao'));
  const oDon = td(lkDon);

  const oXoa = td(oXoaCay(c, duocDieuHanh, Boolean(phien.laQuanTriHeThong), napLai));

  tr.append(oTen, oQuyen, oTV, oCongKhai, oLa, oHienThi, oMoi, oDon, oXoa);
  demThanhVien(c, lkTV, phuTV, lkDon);
  demKiemDuyet(c, oTen);
  return tr;
}

async function demKiemDuyet(c, oTen) {
  const so = await demChoKiemDuyet(c.fileId);
  if (!so) return;
  const lk = lienKet('', '#kiem-duyet');
  lk.append(huyHieu(String(so), 'wait'), ' chờ kiểm duyệt');
  oTen.append(lk);
}

async function demThanhVien(c, lkTV, phuTV, lkDon) {
  const kq = await dsThanhVien(c.fileId);
  if (!kq.ok) return;

  const daVao = kq.ds.filter((t) => t.daDuyet);
  const don = kq.ds.filter((t) => !t.daDuyet && !t.moiLuc);

  lkTV.textContent = daVao.length + ' người có quyền';
  const dem = [
    [daVao.filter((t) => t.laChuCay).length, 'chủ'],
    [daVao.filter((t) => !t.laChuCay && t.vai === 'quan_tri').length, 'quản trị'],
    [daVao.filter((t) => !t.laChuCay && t.vai === 'sua').length, 'thành viên'],
    [daVao.filter((t) => !t.laChuCay && t.vai === 'xem').length, 'khách'],
  ].filter(([n]) => n).map(([n, chu]) => n + ' ' + chu);
  phuTV.textContent = dem.join(' · ');

  lkDon.textContent = '';
  if (don.length) lkDon.append(huyHieu(String(don.length), 'wait'), ' người');
  else lkDon.textContent = 'Không có đơn';
}

function oCongTac(c, duocBam) {
  const nhan = document.createElement('label');
  const o = document.createElement('input');
  o.type = 'checkbox';
  o.checked = !!c.choNguoiLaThayTen;
  if (!duocBam) {
    o.disabled = true;
    nhan.title = 'Chỉ chủ gia phả và Quản trị hệ thống bật/tắt được.';
  }
  o.addEventListener('change', async () => {
    o.disabled = true;
    const kq = await datChoNguoiLaThayTen(c.fileId, o.checked);
    o.disabled = false;
    if (kq.ok) { c.choNguoiLaThayTen = o.checked; return; }
    o.checked = !o.checked;
    nhan.after(dongLoi(kq.loi || 'Không đổi được.'));
  });
  nhan.append(o, ' Cho thấy tên');
  return nhan;
}

function oCayHienThi(c, phien, chu) {
  if (!c.coTheXem) return span('muted', c.duocMoi ? 'Chưa nhận lời mời' : 'Chưa xem được');

  const dangMo = c.fileId === phien.treeId;
  const nhan = document.createElement('label');
  const o = document.createElement('input');
  o.type = 'checkbox';
  o.checked = dangMo;

  o.addEventListener('change', async () => {
    if (dangMo) {
      o.checked = true;
      bao('Cây hiển thị tại sơ đồ',
        'Trang sơ đồ luôn mở đúng một gia phả. Muốn đổi thì tích vào gia phả khác.');
      return;
    }
    o.checked = false;
    const kq = await hoi({
      tua: 'Đổi cây hiển thị tại sơ đồ?',
      chu: 'Trang sơ đồ sẽ mở “' + (c.ten || 'gia phả này') + '”. Trang này nạp lại, ' +
           'và từ đó mọi quyền quản trị tính theo gia phả này.',
      nutOk: 'Đổi',
      lam: () => chonGiaPha(c.fileId),
    });
    if (kq) window.location.reload();
  });

  nhan.append(o, ' ' + chu);
  return nhan;
}

function oXoaCay(c, duocDieuHanh, laQT, napLai) {
  if (!duocDieuHanh) return span('muted', 'Không phải chủ');

  if (c.xinXoaLuc) {
    const b = laQT ? nut('Trả lại cho chủ') : nutMo('Trả lại cho chủ', 'Chỉ Quản trị hệ thống.');
    b.addEventListener('click', async () => {
      const kq = await hoi({
        tua: 'Trả lại cho chủ',
        chu: 'Mở lại “' + (c.ten || 'gia phả này') + '” — hết ẩn, dùng bình thường như trước.',
        nutOk: 'Trả lại',
        lam: () => traLaiCay(c.fileId),
      });
      if (kq) napLai();
    });
    const hop = document.createElement('div');
    hop.append(huyHieu('Đang ẨN, chờ Quản trị hệ thống', 'wait'), document.createElement('br'), b);
    return hop;
  }

  const b = nut('Xóa cây', 'danger');
  b.addEventListener('click', async () => {
    const kq = await hoi({
      tua: 'Xóa cây',
      chu: '⚠️ “' + (c.ten || 'gia phả này') + '” sẽ ẨN NGAY với mọi người (trừ Quản trị hệ ' +
           'thống) — không còn "vẫn dùng được trong lúc chờ".',
      oNhap: { nhieuDong: true, goiY: 'Vì sao xoá? Ví dụ: dựng nhầm, đã gộp vào cây khác.' },
      nutOk: 'Xoá ngay',
      kieuOk: 'danger',
      lam: (lyDo) => xoaCay(c.fileId, lyDo),
    });
    if (kq) napLai();
  });
  return b;
}

function dongThanhVien(c, phien, napLai, huaCK) {
  const tr = document.createElement('tr');

  const oQuyen = td(c.duocMoi
    ? huyHieu('Được mời: ' + (TEN_VAI[c.moiVai] || c.moiVai || ''), 'wait')
    : huyHieu(TEN_VAI[c.vaiCuaToi] || c.vaiCuaToi || ''));

  tr.append(
    td(c.duocMoi
      ? span('name', c.ten || '(chưa đặt tên)')
      : lienKet(c.ten || '(chưa đặt tên)', '#' + duongDan('gia-pha', 'cay', c.treeCode))),
    td(c.emailChu ? span('name', c.emailChu) : ''),
    td(c.treeCode),
    oQuyen,
    td(c.duocMoi ? '' : lienKetCongKhai(duongDan('gia-pha', 'cong-khai', c.treeCode), huaCK, c.fileId)),
    td(oCayHienThi(c, phien, 'Đặt mặc định')),
    td(c.duocMoi ? oNhanLoiMoi(c, napLai) : oTuyChonThanhVien(c, napLai)),
  );
  return tr;
}

function oNhanLoiMoi(c, napLai) {
  const bNhan = nut('Nhận', 'warm');
  const bTuChoi = nut('Từ chối', 'danger');
  const hang = hangNut(bNhan, bTuChoi);

  bNhan.addEventListener('click', async () => {
    bNhan.disabled = true; bTuChoi.disabled = true;
    const kq = await nhanLoiMoi(c.fileId);
    if (kq.ok) { napLai(); return; }
    bNhan.disabled = false; bTuChoi.disabled = false;
    hang.append(dongLoi(kq.loi || 'Không nhận được.'));
  });

  bTuChoi.addEventListener('click', async () => {
    const kq = await hoi({
      tua: 'Từ chối lời mời',
      chu: 'Từ chối lời mời vào “' + (c.ten || 'gia phả này') + '”' +
           (c.emailNguoiMoi ? ' của ' + c.emailNguoiMoi : '') + '?',
      nutOk: 'Từ chối', kieuOk: 'danger',
      lam: () => tuChoiLoiMoi(c.fileId),
    });
    if (kq) napLai();
  });

  return hang;
}

async function hoiXinDoiVai(c, vai, napLai) {
  const kq = await hoi({
    tua: 'Xin đổi quyền',
    chu: 'Nộp đơn xin đổi vai của bạn trong “' + (c.ten || 'gia phả này') + '” sang ' +
      (TEN_VAI[vai] || vai).toLowerCase() + '. Chủ gia phả hoặc Quản trị hệ thống sẽ duyệt.',
    oNhap: { goiY: 'Vì sao xin đổi? (không bắt buộc)' },
    nutOk: 'Nộp đơn',
    lam: (lyDo) => xinDoiVai(c.fileId, vai, lyDo),
  });
  if (kq) napLai();
}

function oTuyChonThanhVien(c, napLai) {
  const khac = ['quan_tri', 'sua', 'xem'].filter((v) => v !== c.vaiCuaToi);
  const dsNut = khac.map((v) =>
    mucMenu('Xin đổi sang quyền ' + (TEN_VAI[v] || v).toLowerCase(), '',
      () => hoiXinDoiVai(c, v, napLai)));

  const bThoat = c.toiLaChu
    ? nutMo('Thoát khỏi gia phả', 'Chủ gia phả không tự rời được — bàn giao trước.', 'danger')
    : nut('Thoát khỏi gia phả', 'danger');

  bThoat.addEventListener('click', async () => {
    const kq = await hoi({
      tua: 'Thoát khỏi gia phả',
      chu: 'Bạn có chắc chắn muốn thoát khỏi “' + (c.ten || 'gia phả này') + '” không?',
      nutOk: 'Thoát khỏi gia phả', nutHuy: 'Hủy', kieuOk: 'danger',
      lam: () => roiCay(c.fileId),
    });
    if (kq) napLai();
  });

  return menuTuyChon('Tùy chọn ▾', [...dsNut, null, bThoat]);
}

function dongXinVao(c, phien, napLai) {
  const tr = document.createElement('tr');

  const oTrangThai = td(c.daNopDon
    ? huyHieu('Đã nộp đơn', 'wait')
    : span('sub', 'Chưa nộp đơn'));

  const chon = document.createElement('select');
  chon.className = 'role-select';
  for (const v of ['quan_tri', 'sua', 'xem']) {
    const op = document.createElement('option');
    op.value = v;
    op.textContent = TEN_VAI[v];
    chon.append(op);
  }
  chon.value = 'sua';
  chon.disabled = true;
  chon.title = LY_DO_QUYEN_DE_NGHI;

  const oViec = td();
  if (c.daNopDon) {
    const b = nut('Rút đơn', 'danger');
    b.addEventListener('click', async () => {
      const kq = await hoi({
        tua: 'Rút đơn xin gia nhập',
        chu: 'Bạn có chắc chắn muốn rút đơn xin gia nhập “' + (c.ten || 'gia phả này') + '” không?',
        nutOk: 'Rút đơn', nutHuy: 'Giữ đơn', kieuOk: 'danger',
        lam: () => rutDonXinVao(c.fileId),
      });
      if (kq) napLai();
    });
    oViec.append(b);
  } else {
    const b = nut('Nộp đơn', 'warm');
    b.addEventListener('click', async () => {
      const kq = await hoi({
        tua: 'Nộp đơn xin gia nhập',
        chu: 'Vài lời để người quản lý “' + (c.ten || 'gia phả này') + '” biết bạn là ai.',
        oNhap: { nhieuDong: true, goiY: 'Ví dụ: Tôi là con ông Nguyễn Văn A, chi thứ hai.' },
        nutOk: 'Nộp đơn',
        lam: (loiNhan) => xinVaoCay(loiNhan, c.fileId),
      });
      if (kq) napLai();
    });
    oViec.append(b);
  }

  if (c.coTheXem && c.fileId !== phien.treeId) {
    const bMo = nut('Mở trên sơ đồ');
    bMo.style.marginLeft = '6px';
    bMo.addEventListener('click', async () => {
      const kq = await hoi({
        tua: 'Đổi cây hiển thị tại sơ đồ?',
        chu: 'Trang sơ đồ sẽ mở “' + (c.ten || 'gia phả này') + '” ở chế độ bạn được phép. Trang này nạp lại.',
        nutOk: 'Đổi',
        lam: () => chonGiaPha(c.fileId),
      });
      if (kq) window.location.reload();
    });
    oViec.append(bMo);
  }

  tr.append(
    td(span('name', c.ten || '(chưa đặt tên)')),
    td(c.emailChu ? span('name', c.emailChu) : ''),
    td(c.treeCode),
    oTrangThai,
    td(chon),
    oViec,
  );
  return tr;
}

function ganTaoMoi(sec, phien) {
  const oTen = sec.querySelector('#tao-ten');
  const oGhi = sec.querySelector('#tao-ghi-chu');
  const b = sec.querySelector('#tao-nut');
  const oLoi = sec.querySelector('#tao-loi');

  b.onclick = async () => {
    oLoi.hidden = true;
    const ten = oTen.value.trim();
    if (!ten) { oLoi.textContent = 'Nhập tên gia phả.'; oLoi.hidden = false; return; }

    b.disabled = true;
    const chuCu = b.textContent;
    b.textContent = 'Đang tạo…';
    const kq = await taoGiaPhaMoi(ten, sinhMaCay(ten, ten + Date.now()), oGhi.value);
    b.disabled = false;
    b.textContent = chuCu;

    if (!kq.ok) { oLoi.textContent = kq.loi || 'Không tạo được gia phả.'; oLoi.hidden = false; return; }

    oTen.value = '';
    oGhi.value = '';
    const mo = await hoi({
      tua: 'Đã tạo gia phả',
      chu: '“' + (kq.cay.ten || ten) + '” (mã ' + (kq.cay.maCay || '') + ') nay là gia ' +
           'phả của bạn, và đang rỗng. Mở nó trên trang sơ đồ để thêm người đầu tiên.',
      nutOk: 'Mở gia phả mới', nutHuy: 'Để sau',
      lam: () => chonGiaPha(kq.cay.fileId),
    });
    if (mo) { window.location.href = 'index.html'; return; }
    chipDangMo = 'manage';
    mountKhuGiaPha(sec, phien);
  };
}
