import {
  layDanhSachGiaPha, doiMatKhau, dangXuat, nguoiDangNhap,
  loiMoiQthtCuaToi, nhanQuyenQtht, tuChoiQuyenQtht,
  deXuatGanCuaToi, nopDeXuatGan, rutDeXuatGan, duyetDeXuatGan, goGanTaiKhoanCuaToi,
  deXuatDongHoCuaToi, nopDeXuatDongHo, rutDeXuatDongHo, datDongHoQtht, dsCayCoNguoi,
  dsCongKhaiTaiKhoan,
} from '../../services/sb.js';
import { hoi, bao } from './hop-thoai.js';
import { goiYNguoi, moSoDo } from './trang-cay.js';
import { duongDan } from './trang-chi-tiet.js';
import { lienKetCongKhai } from './trang-cong-khai.js';
import {
  TEN_VAI, td, span, huyHieu, datHuyHieu, nut, nutLink, lienKet,
  hangNut, dongTrong, chuDau, ngay, ngayGio,
} from './o-bang.js';

const SO_HIEN_TRUOC = 5;

let moRong = false;

export async function mountKhuTaiKhoan(sec, phien) {
  const $ = (id) => sec.querySelector('#' + id);
  const napLai = () => mountKhuTaiKhoan(sec, phien);
  veHoSo(sec, phien, null);
  veQuyenHeThong(sec, phien, {});
  ganMatKhau(sec);
  ganQuyenHeThong(sec);

  $('gia-pha-extra').innerHTML = '';
  $('gia-pha-extra').hidden = true;
  $('tk-xem-them').hidden = true;
  $('tk-cay-dem').textContent = '';
  dongTrong($('tk-cay-tbody'), 7, 'Đang đọc các gia phả của bạn…');

  const hashLuc = window.location.hash;
  const [nguoi, kqCay, moiQtht, donGan, donDongHo, coMat] = await Promise.all([
    nguoiDangNhap().catch(() => null), layDanhSachGiaPha(),
    loiMoiQthtCuaToi().catch(() => ({})),
    deXuatGanCuaToi().catch(() => ({ coDon: false })),
    deXuatDongHoCuaToi().catch(() => ({ coDon: false })),
    phien.maNguoiGan ? dsCayCoNguoi(phien.maNguoiGan).catch(() => ({ ok: false }))
      : Promise.resolve({ ok: true, treeIds: new Set() }),
  ]);
  if (window.location.hash !== hashLuc) return;

  veHoSo(sec, phien, nguoi);
  veQuyenHeThong(sec, phien, moiQtht);
  veHoSoDon(sec, phien, donGan, donDongHo, kqCay, napLai);
  veBangCay(sec, phien, kqCay, coMat, () => mountKhuTaiKhoan(sec, phien));
}

function veHoSo(sec, phien, nguoi) {
  const dat = (id, chu) => {
    const o = sec.querySelector('#' + id);
    o.textContent = chu || '';
    const li = o.closest('li');
    if (li) li.hidden = !chu;
  };
  sec.querySelector('#tk-avatar').textContent = chuDau(phien.hoTen, phien.email);
  dat('tk-ten', phien.hoTen);
  dat('tk-email', phien.email);
  dat('tk-ma', phien.maNgan);
  dat('tk-ngay-dk', nguoi && ngay(nguoi.created_at));
  dat('tk-dang-nhap', nguoi && ngayGio(nguoi.last_sign_in_at));

  const xacMinh = nguoi ? Boolean(nguoi.email_confirmed_at) : null;
  const b = sec.querySelector('#tk-xac-minh');
  b.hidden = xacMinh === null;
  datHuyHieu(b, xacMinh ? 'Đã xác minh' : 'Chưa xác minh email', xacMinh ? '' : 'wait');
  sec.querySelector('#tk-trang-thai').textContent = 'Đang hoạt động' +
    (xacMinh === null ? '' : xacMinh ? ' · Đã xác minh' : ' · Chưa xác minh email');
}

function veQuyenHeThong(sec, phien, moi) {
  const laQT = Boolean(phien.laQuanTriHeThong);
  const badge = sec.querySelector('#my-sys-qtht-badge');
  const sub = sec.querySelector('#my-sys-qtht-sub');
  const actions = sec.querySelector('#my-sys-qtht-actions');

  if (laQT) {
    datHuyHieu(badge, 'Có (Quản trị hệ thống)');
    sub.textContent = 'Quyền quản lý toàn bộ hệ thống phần mềm';
    actions.hidden = true;
  } else if (moi && moi.coLoiMoi) {
    datHuyHieu(badge, 'Có lời mời đang chờ', 'wait');
    sub.textContent = (moi.emailNguoiMoi ? moi.emailNguoiMoi + ' mời bạn' : 'Bạn được mời') +
      (moi.moiLuc ? ' lúc ' + ngayGio(moi.moiLuc) : '') + '. Bấm Chấp nhận để có cờ ngay.';
    actions.hidden = false;
  } else {
    datHuyHieu(badge, 'Không');
    sub.textContent = 'Chỉ một Quản trị hệ thống khác mời được.';
    actions.hidden = true;
  }
  datHuyHieu(sec.querySelector('#tk-tao-cay'), phien.duocTaoCay ? 'Có' : 'Không');
}

function ganQuyenHeThong(sec) {
  sec.querySelector('#btn-my-accept-qtht').onclick = async () => {
    const kq = await hoi({
      tua: 'Chấp nhận làm Quản trị hệ thống',
      chu: 'Nhận cờ Quản trị hệ thống — đọc và sửa được MỌI gia phả, đổi quyền ở mọi cây, và mời ' +
        'người khác. Đây là chữ ký thứ hai; lời mời do một Quản trị hệ thống khác gửi.',
      nutOk: 'Chấp nhận', kieuOk: 'warm',
      lam: () => nhanQuyenQtht(),
    });
    if (kq) window.location.reload();
  };

  sec.querySelector('#btn-my-decline-qtht').onclick = async () => {
    const kq = await hoi({
      tua: 'Từ chối lời mời',
      chu: 'Từ chối lời mời làm Quản trị hệ thống? Xoá lời mời, không đánh dấu — mời lại được.',
      nutOk: 'Từ chối', kieuOk: 'danger',
      lam: () => tuChoiQuyenQtht(),
    });
    if (kq) window.location.reload();
  };
}

function dsCayThanhVien(kqCay) {
  return kqCay.ok ? kqCay.ds.filter((c) => !c.daXoaLuc && (c.vaiCuaToi || c.toiLaChu)) : [];
}

function veHoSoDon(sec, phien, donGan, donDongHo, kqCay, napLai) {
  veHoSoGan(sec, phien, donGan, kqCay, napLai);
  veHoSoDongHo(sec, phien, donDongHo, kqCay, napLai);
}

function veHoSoGan(sec, phien, don, kqCay, napLai) {
  const sub = sec.querySelector('#hs-gan-sub');
  const badge = sec.querySelector('#hs-gan-badge');
  const actions = sec.querySelector('#hs-gan-actions');
  actions.innerHTML = '';

  const laChuMotCay = dsCayThanhVien(kqCay).some((c) => c.toiLaChu);
  const treeGoiY = (dsCayThanhVien(kqCay)[0] || {}).fileId || null;

  if (phien.maNguoiGan) {
    datHuyHieu(badge, 'Đã gắn', 'ok');
    sub.textContent = (phien.tenNguoiGan || phien.maNguoiGan) + ' — mã ' + phien.maNguoiGan;
    if (don.coDon && don.loai === 'go') {
      datHuyHieu(badge, 'Có đề xuất gỡ', 'wait');
      sub.textContent += ' · ' + (don.nopBoi || 'Ai đó') + ' đề xuất GỠ liên kết này' +
        (don.lyDo ? ': “' + don.lyDo + '”' : '') + '.';
      actions.append(nutDuyetDon(don, 'Đồng ý gỡ', 'Gỡ liên kết của bạn với ' + phien.maNguoiGan +
        ' — có hiệu lực ngay, bạn mất quyền sửa theo trực hệ của người này ở mọi gia phả.', napLai),
      nutKhongDongY(don, napLai));
      return;
    }
    const b = nut('Đề xuất đổi mã');
    b.addEventListener('click', () => hoiGanMa(phien, don, treeGoiY, laChuMotCay, napLai));
    const bGo = nut('Gỡ liên kết của tôi', 'danger');
    bGo.addEventListener('click', async () => {
      const kq = await hoi({
        tua: 'Gỡ liên kết của tôi',
        chu: 'Tài khoản của bạn thôi gắn với ' + (phien.tenNguoiGan || phien.maNguoiGan) + ' (' +
          phien.maNguoiGan + ') — có hiệu lực ngay, không cần ai duyệt. Bạn mất quyền sửa theo ' +
          'trực hệ của người này ở MỌI gia phả; muốn gắn lại phải đề xuất.',
        nutOk: 'Gỡ', kieuOk: 'danger', lam: () => goGanTaiKhoanCuaToi(),
      });
      if (kq) window.location.reload();
    });
    actions.append(b, bGo);
    return;
  }

  if (don.coDon && don.nopBoi) {
    datHuyHieu(badge, 'Có đề xuất gắn', 'wait');
    sub.textContent = don.nopBoi + ' đề xuất gắn bạn với ' + don.maNguoi +
      (don.tenNguoi && don.tenNguoi !== don.maNguoi ? ' — ' + don.tenNguoi : '') +
      (don.taoLuc ? ' (' + ngayGio(don.taoLuc) + ')' : '') +
      '. Quản trị hệ thống sẽ xét' + (laChuMotCay ? ', hoặc bạn tự duyệt nếu đây là lần gắn đầu và mã còn trống.' : '.');
    if (laChuMotCay) {
      actions.append(nutDuyetDon(don, 'Tự duyệt (nếu đủ điều kiện)', 'Chỉ thành công khi đây là lần gắn ' +
        'ĐẦU TIÊN của bạn và mã ' + don.maNguoi + ' chưa ai giữ.', napLai));
    }
    actions.append(nutKhongDongY(don, napLai));
    return;
  }

  if (don.coDon) {
    datHuyHieu(badge, 'Đang chờ duyệt', 'wait');
    sub.textContent = 'Bạn đề xuất: ' + don.maNguoi +
      (don.tenNguoi && don.tenNguoi !== don.maNguoi ? ' — ' + don.tenNguoi : '') +
      (don.taoLuc ? ' (nộp ' + ngayGio(don.taoLuc) + ')' : '');
    const bSua = nut('Sửa đề xuất');
    bSua.addEventListener('click', () => hoiGanMa(phien, don, treeGoiY, laChuMotCay, napLai));
    const bRut = nut('Rút đơn', 'danger');
    bRut.addEventListener('click', async () => {
      const kq = await hoi({ tua: 'Rút đơn', chu: 'Rút đơn đề xuất mã ' + don.maNguoi + ' của bạn?',
        nutOk: 'Rút đơn', kieuOk: 'danger', lam: () => rutDeXuatGan(don.id) });
      if (kq) napLai();
    });
    actions.append(bSua, bRut);
    if (laChuMotCay) {
      const bTu = nut('Tự duyệt (nếu đủ điều kiện)', 'warm');
      bTu.addEventListener('click', async () => {
        const kq = await hoi({
          tua: 'Tự duyệt đơn gắn mã',
          chu: 'Chỉ thành công khi đây là lần gắn ĐẦU TIÊN của bạn và mã ' + don.maNguoi +
            ' chưa ai giữ. Ca khác thì máy chủ từ chối, nhờ một Quản trị hệ thống khác duyệt.',
          nutOk: 'Tự duyệt', kieuOk: 'warm', lam: () => duyetDeXuatGan(don.id),
        });
        if (kq) napLai();
      });
      actions.append(bTu);
    }
    return;
  }

  datHuyHieu(badge, 'Chưa gắn', 'wait');
  sub.textContent = 'Mã người quyết định bạn sửa được những ai trong sơ đồ — bản thân, tổ tiên, con cháu, vợ/chồng.';
  const b = nut('Đề xuất mã người');
  b.addEventListener('click', () => hoiGanMa(phien, don, treeGoiY, laChuMotCay, napLai));
  actions.append(b);
}

function nutDuyetDon(don, chuNut, chuHoi, napLai) {
  const b = nut(chuNut, 'warm');
  b.addEventListener('click', async () => {
    const kq = await hoi({ tua: chuNut, chu: chuHoi, nutOk: chuNut, kieuOk: 'warm',
      lam: () => duyetDeXuatGan(don.id) });
    if (kq) window.location.reload();
    else napLai();
  });
  return b;
}

function nutKhongDongY(don, napLai) {
  const b = nut('Không đồng ý', 'danger');
  b.addEventListener('click', async () => {
    const kq = await hoi({ tua: 'Không đồng ý đề xuất',
      chu: 'Xoá đề xuất ' + (don.loai === 'go' ? 'gỡ' : 'gắn') + ' này? Người đề xuất có thể gửi lại.',
      nutOk: 'Xoá đề xuất', kieuOk: 'danger', lam: () => rutDeXuatGan(don.id) });
    if (kq) napLai();
  });
  return b;
}

async function hoiGanMa(phien, don, treeGoiY, laChuMotCay, napLai) {
  const kq = await hoi({
    tua: don.coDon ? 'Sửa đề xuất mã người' : 'Đề xuất mã người trong sơ đồ',
    chu: 'Mã này quyết định bạn sửa được những ai TRONG MỌI gia phả bạn tham gia: bản thân, tổ ' +
      'tiên đường thẳng, toàn bộ con cháu, cộng vợ/chồng. Một Quản trị hệ thống KHÁC xét đơn' +
      (laChuMotCay ? ' — trừ khi đây là lần gắn ĐẦU TIÊN và mã ấy chưa ai giữ, bạn tự duyệt được vì đang là chủ một gia phả.' : '.'),
    truong: [
      { ma: 'ma', nhan: 'Mã người trong sơ đồ', goiY: 'gõ tên hoặc mã người — ví dụ P0012',
        giaTri: don.coDon ? don.maNguoi : (phien.maNguoiGan || ''), ganVao: goiYNguoi(treeGoiY) },
      { ma: 'lyDo', nhan: 'Vì sao bạn là người này', goiY: 'không bắt buộc',
        giaTri: don.coDon ? (don.lyDo || '') : '' },
    ],
    nutOk: don.coDon ? 'Sửa đề xuất' : 'Nộp đề xuất',
    nutThem: don.coDon ? { chu: 'Rút đơn', kieu: 'danger', lam: () => rutDeXuatGan(don.id) } : null,
    lam: (v) => nopDeXuatGan(v.ma, v.lyDo),
  });
  if (kq) napLai();
}

function veHoSoDongHo(sec, phien, don, kqCay, napLai) {
  const sub = sec.querySelector('#hs-dongho-sub');
  const badge = sec.querySelector('#hs-dongho-badge');
  const actions = sec.querySelector('#hs-dongho-actions');
  actions.innerHTML = '';
  const dsCay = dsCayThanhVien(kqCay);

  if (phien.laQuanTriHeThong) {
    datHuyHieu(badge, phien.tenDongHo ? 'Đã chọn' : 'Chưa chọn', phien.tenDongHo ? 'ok' : 'wait');
    sub.textContent = phien.tenDongHo || 'Quản trị hệ thống tự chọn, không cần ai duyệt.';
    if (!dsCay.length) { sub.textContent += ' Chưa là thành viên đã duyệt của gia phả nào.'; return; }
    const b = nut(phien.tenDongHo ? 'Đổi dòng họ' : 'Chọn dòng họ');
    b.addEventListener('click', () => hoiChonDongHo(phien, { coDon: false }, dsCay, true, napLai));
    actions.append(b);
    return;
  }

  if (phien.tenDongHo) {
    datHuyHieu(badge, 'Đã chọn', 'ok');
    sub.textContent = phien.tenDongHo;
    if (dsCay.length) {
      const b = nut('Đề xuất đổi dòng họ');
      b.addEventListener('click', () => hoiChonDongHo(phien, don, dsCay, false, napLai));
      actions.append(b);
    }
    return;
  }

  if (don.coDon) {
    datHuyHieu(badge, 'Đang chờ duyệt', 'wait');
    sub.textContent = 'Bạn đề xuất: ' + don.tenCay + (don.taoLuc ? ' (nộp ' + ngayGio(don.taoLuc) + ')' : '');
    const bSua = nut('Sửa đề xuất');
    bSua.addEventListener('click', () => hoiChonDongHo(phien, don, dsCay, false, napLai));
    const bRut = nut('Rút đơn', 'danger');
    bRut.addEventListener('click', async () => {
      const kq = await hoi({ tua: 'Rút đơn', chu: 'Rút đơn đề xuất dòng họ ' + don.tenCay + '?',
        nutOk: 'Rút đơn', kieuOk: 'danger', lam: () => rutDeXuatDongHo(don.id) });
      if (kq) napLai();
    });
    actions.append(bSua, bRut);
    return;
  }

  datHuyHieu(badge, 'Chưa chọn', 'wait');
  if (!dsCay.length) {
    sub.textContent = 'Chọn trong các gia phả bạn là thành viên đã duyệt — chưa có cây nào.';
    return;
  }
  sub.textContent = 'Cây bạn tự nhận là dòng họ chính của mình. Một Quản trị hệ thống xét đơn.';
  const b = nut('Chọn dòng họ');
  b.addEventListener('click', () => hoiChonDongHo(phien, don, dsCay, false, napLai));
  actions.append(b);
}

async function hoiChonDongHo(phien, don, dsCay, truc, napLai) {
  const truong = [{ ma: 'cay', nhan: 'Gia phả', chon: dsCay.map((c) => [c.fileId, (c.ten || c.treeCode) + ' · ' + c.treeCode]),
    giaTri: don.coDon ? don.treeId : (phien.cayChinhId || dsCay[0].fileId) }];
  if (!truc) {
    truong.push({ ma: 'lyDo', nhan: 'Vì sao chọn cây này', goiY: 'không bắt buộc',
      giaTri: don.coDon ? (don.lyDo || '') : '' });
  }
  const kq = await hoi({
    tua: truc ? 'Chọn dòng họ' : (don.coDon ? 'Sửa đề xuất dòng họ' : 'Đề xuất dòng họ'),
    chu: truc
      ? 'Quản trị hệ thống tự chọn cho mình, có hiệu lực ngay — không qua đơn.'
      : 'Cây bạn tự nhận là dòng họ chính của mình. Một Quản trị hệ thống xét đơn — không có khe tự duyệt.',
    truong,
    nutOk: truc ? 'Chọn dòng họ' : (don.coDon ? 'Sửa đề xuất' : 'Nộp đề xuất'),
    nutThem: (!truc && don.coDon) ? { chu: 'Rút đơn', kieu: 'danger', lam: () => rutDeXuatDongHo(don.id) } : null,
    lam: (v) => (truc ? datDongHoQtht(v.cay) : nopDeXuatDongHo(v.cay, v.lyDo)),
  });
  if (kq) napLai();
}

function trangThaiCuaToi(c) {
  if (c.duocMoi) return 'duocmoi';
  if (c.vaiCuaToi || c.toiLaChu) return 'thanhvien';
  if (c.daNopDon) return 'donxin';
  return null;
}

function veBangCay(sec, phien, kqCay, coMat, napLai) {
  const $ = (id) => sec.querySelector('#' + id);
  const tbA = $('tk-cay-tbody');
  const tbB = $('gia-pha-extra');

  if (!kqCay.ok) { dongTrong(tbA, 7, kqCay.loi || 'Không đọc được danh sách gia phả.', napLai); return; }

  const ds = kqCay.ds.filter((c) => !c.daXoaLuc && trangThaiCuaToi(c));

  $('tk-cay-dem').textContent = ds.length + ' cây · Quyền của bạn trong từng sơ đồ';

  if (!ds.length) {
    const o = dongTrong(tbA, 7, 'Bạn chưa có chân trong gia phả nào. Xin vào một gia phả, hoặc nhận lời mời, ở khu Gia phả. ');
    o.append(lienKet('Mở khu Gia phả →', 'gia-pha'));
    return;
  }

  tbA.innerHTML = '';
  const huaCK = dsCongKhaiTaiKhoan();
  ds.forEach((c, i) => (i < SO_HIEN_TRUOC ? tbA : tbB).append(dongCay(c, phien, coMat, huaCK)));

  const them = ds.length - SO_HIEN_TRUOC;
  if (them <= 0) return;
  const bThem = $('btn-xem-them-cay');
  const chu = $('tk-hien-thi');
  const ve = () => {
    tbB.hidden = !moRong;
    bThem.textContent = moRong ? 'Thu gọn ▴' : 'Xem thêm (' + them + ' cây) ▾';
    chu.textContent = moRong ? 'Đang hiển thị tất cả ' + ds.length + ' cây'
      : 'Đang hiển thị ' + SO_HIEN_TRUOC + ' / ' + ds.length + ' cây';
  };
  bThem.onclick = () => { moRong = !moRong; ve(); };
  $('tk-xem-them').hidden = false;
  ve();
}

function lienKetNguoi(ten, ma) {
  const f = document.createDocumentFragment();
  f.append(lienKet(ten, duongDan('thanh-vien', 'nguoi', ma)), span('sub', 'Mã: ' + ma));
  return f;
}

function dongCay(c, phien, coMat, huaCK) {
  const trangThai = trangThaiCuaToi(c);
  const cay = { treeId: c.fileId, ten: c.ten || '', maCay: c.treeCode };

  const vai = c.toiLaChu ? huyHieu('Chủ gia phả')
    : trangThai === 'duocmoi' ? huyHieu('Được mời: ' + (TEN_VAI[c.moiVai] || c.moiVai || ''), 'wait')
    : trangThai === 'donxin' ? huyHieu('Đơn xin vào', 'wait')
    : huyHieu(TEN_VAI[c.vaiCuaToi] || c.vaiCuaToi || '');

  let gan = '';
  if (trangThai === 'thanhvien') {
    gan = !phien.maNguoiGan ? span('muted', 'Chưa gắn người')
      : !coMat.ok ? span('muted', 'Không đọc được')
      : !coMat.treeIds.has(c.fileId) ? span('muted', 'Không có trong sơ đồ này')
      : lienKetNguoi(phien.tenNguoiGan || phien.maNguoiGan, phien.maNguoiGan);
  }

  const trang = trangThai === 'thanhvien' ? huyHieu('Đã duyệt')
    : trangThai === 'duocmoi' ? huyHieu('Chờ bạn nhận lời', 'wait')
    : huyHieu('Chờ duyệt', 'wait');

  const viec = [];
  if (c.coTheXem) viec.push(nutLink('Xem sơ đồ →', () => moSoDo(cay, phien)));
  if (trangThai === 'duocmoi') viec.push(lienKet('Nhận lời ở khu Gia phả →', 'gia-pha'));

  const tr = document.createElement('tr');
  tr.append(
    td(span('name', c.ten || c.treeCode)),
    td(c.treeCode),
    td(vai),
    td(gan),
    td(trangThai === 'thanhvien'
      ? lienKetCongKhai(duongDan('thanh-vien', 'cong-khai', c.treeCode), huaCK, c.fileId) : ''),
    td(trang),
    td(viec.length > 1 ? hangNut(...viec) : (viec[0] || '')),
  );
  return tr;
}

function ganMatKhau(sec) {
  const oCu = sec.querySelector('#pass-current');
  const oMoi = sec.querySelector('#pass-new');
  const oLai = sec.querySelector('#pass-confirm');
  oCu.autocomplete = 'current-password';
  oMoi.autocomplete = 'new-password';
  oLai.autocomplete = 'new-password';

  const bDoi = sec.querySelector('#btn-doi-mat-khau');
  bDoi.onclick = async () => {
    if (!oCu.value || !oMoi.value) { bao('Đổi mật khẩu', 'Gõ đủ mật khẩu hiện tại và mật khẩu mới.'); return; }
    if (oMoi.value !== oLai.value) { bao('Lỗi nhập liệu', 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.'); return; }
    if (oMoi.value === oCu.value) { bao('Đổi mật khẩu', 'Mật khẩu mới trùng mật khẩu hiện tại.'); return; }
    bDoi.disabled = true;
    const kq = await doiMatKhau(oCu.value, oMoi.value);
    bDoi.disabled = false;
    if (!kq.ok) { bao('Không đổi được mật khẩu', kq.loi || 'Máy chủ từ chối.'); return; }
    oCu.value = ''; oMoi.value = ''; oLai.value = '';
    bao('Thành công', 'Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.');
  };

  sec.querySelector('#btn-dang-xuat').onclick = async () => {
    const kq = await hoi({
      tua: 'Đăng xuất',
      chu: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?',
      nutOk: 'Đăng xuất', nutHuy: 'Ở lại', kieuOk: 'danger',
      lam: () => dangXuat(),
    });
    if (kq) window.location.reload();
  };
}
