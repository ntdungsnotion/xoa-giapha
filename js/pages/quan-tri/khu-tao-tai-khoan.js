import {
  taoTaiKhoan, datHoTenTaiKhoan, datDuocTaoCay, datQuanTriHeThong,
} from '../../services/sb.js';
import { hoi, bao } from './hop-thoai.js';

const LY_MO_LIEN_KET = 'Chưa làm được: app chưa có màn hình đặt mật khẩu khi bấm liên kết trong thư, ' +
  'và thư của Supabase mặc định chỉ gửi tới email thành viên dự án.';

export function veKhuTaoTaiKhoan(sec, napLai) {
  const $ = (id) => sec.querySelector('#' + id);
  const oTen = $('new-acc-name');
  const oEmail = $('new-acc-email');
  const oMa = $('new-acc-code');
  const oKieu = $('new-acc-pass-type');
  const oTaoCay = $('new-acc-perm-create-tree');
  const oQtht = $('new-acc-perm-qtht');

  $('ttk-chua-co').textContent = 'Máy chủ sinh một mật khẩu tạm 10 ký tự, hiện MỘT lần sau khi tạo — ' +
    'chép lại và đưa tận tay người nhận. Họ đăng nhập được ngay, rồi tự đổi ở khu Tài khoản → Đổi mật khẩu.';

  const lienKet = oKieu.querySelector('option[value="invite_link"]');
  lienKet.disabled = true;
  lienKet.title = LY_MO_LIEN_KET;
  oKieu.value = 'temp_pass';
  oKieu.title = LY_MO_LIEN_KET;
  oMa.placeholder = 'Máy chủ sinh sau khi tạo';

  const datLai = () => {
    oTen.value = '';
    oEmail.value = '';
    oMa.value = '';
    oTaoCay.checked = false;
    oQtht.checked = false;
  };
  $('btn-reset-form-tao-tk').onclick = datLai;
  $('btn-submit-tao-tk').onclick = () => hoiTao(
    { hoTen: oTen.value.trim(), email: oEmail.value.trim(), taoCay: oTaoCay.checked, qtht: oQtht.checked },
    (ma) => { datLai(); oMa.value = ma; napLai(); });
}

async function hoiTao(v, xong) {
  if (!v.hoTen) { await bao('Thiếu họ tên', 'Điền Họ và tên người dùng trước.'); return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) {
    await bao('Email chưa đúng', 'Điền một địa chỉ email đúng khuôn, ví dụ giang@email.vn.');
    return;
  }

  const quyen = [v.taoCay ? 'quyền Tạo gia phả mới' : '', v.qtht ? 'lời mời Quản trị hệ thống' : '']
    .filter(Boolean);
  const kq = await hoi({
    tua: 'Tạo tài khoản mới',
    chu: 'Tạo tài khoản ' + v.email + ' (' + v.hoTen + ')' +
      (quyen.length ? ', kèm ' + quyen.join(' và ') : '') + '? Tài khoản đăng nhập được ngay ' +
      'bằng mật khẩu tạm máy chủ sinh ra.',
    nutOk: 'Tạo tài khoản',
    nutHuy: 'Hủy',
    kieuOk: 'warm',
    lam: () => chayChuoi(v),
  });
  if (!kq) return;

  const r = kq.kq;
  await bao('Đã tạo tài khoản', 'Email: ' + r.email + '\nMật khẩu tạm: ' + r.matKhau +
    (r.maNgan ? '\nMã tài khoản: ' + r.maNgan : '') +
    '\n\nChép mật khẩu ngay — đóng hộp này là không xem lại được.' +
    (r.hong.length ? '\n\n⚠ Tài khoản đã có, nhưng mấy bước sau chưa xong — làm tay ở Sổ tài khoản:\n• ' +
      r.hong.join('\n• ') : ''));
  xong(r.maNgan);
}

async function chayChuoi(v) {
  const tk = await taoTaiKhoan(v.email);
  if (!tk.ok) return tk;

  const hong = [];
  const buoc = async (ten, lam) => {
    const k = await lam();
    if (!k.ok) hong.push(ten + ': ' + (k.loi || 'máy chủ từ chối'));
  };
  await buoc('Họ tên', () => datHoTenTaiKhoan(tk.userId, v.hoTen));
  if (v.taoCay) await buoc('Quyền tạo cây', () => datDuocTaoCay(tk.userId, true));
  if (v.qtht) await buoc('Lời mời Quản trị hệ thống', () => datQuanTriHeThong(tk.userId, true));
  return { ...tk, hong };
}
