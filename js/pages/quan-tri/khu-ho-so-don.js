import {
  dsDeXuatGan, duyetDeXuatGan, tuChoiDeXuatGan,
  dsDeXuatDongHo, duyetDeXuatDongHo, tuChoiDeXuatDongHo,
} from '../../services/sb.js';
import { hoi } from './hop-thoai.js';
import { td, span, tenVaPhu, huyHieu, nut, nutMo, hangNut, dongTrong, ngayGio } from './o-bang.js';

const SO_COT_GAN = 5;
const SO_COT_DONGHO = 5;

export async function veKhuHoSoDon(sec) {
  const napLai = () => veKhuHoSoDon(sec);
  const tbGan = sec.querySelector('#hsd-gan-tbody');
  const tbDongHo = sec.querySelector('#hsd-dongho-tbody');
  dongTrong(tbGan, SO_COT_GAN, 'Đang đọc…');
  dongTrong(tbDongHo, SO_COT_DONGHO, 'Đang đọc…');

  const [dsGan, dsDongHo] = await Promise.all([
    dsDeXuatGan().catch(() => []), dsDeXuatDongHo().catch(() => []),
  ]);

  veBangGan(sec, dsGan, napLai);
  veBangDongHo(sec, dsDongHo, napLai);
}

function veBangGan(sec, ds, napLai) {
  const tb = sec.querySelector('#hsd-gan-tbody');
  sec.querySelector('#hsd-gan-dem').textContent = ds.length ? ds.length + ' đơn đang chờ' : '';
  if (!ds.length) { dongTrong(tb, SO_COT_GAN, 'Không có đơn gắn mã người nào đang chờ.'); return; }

  const LY_TU = 'Đơn của chính bạn — xét ở Hồ sơ cá nhân (khu Tài khoản), có thể có khe tự duyệt.';
  tb.innerHTML = '';
  for (const d of ds) {
    const laGo = d.loai === 'go';
    const bDuyet = d.laCuaToi ? nutMo('Duyệt', LY_TU, 'warm') : nut('Duyệt', 'warm');
    bDuyet.addEventListener('click', async () => {
      const kq = await hoi({
        tua: laGo ? 'Duyệt đề xuất GỠ liên kết' : 'Duyệt đề xuất gắn mã',
        chu: laGo
          ? 'Gỡ ' + d.email + ' khỏi ' + d.maNguoi + ' — tài khoản này mất quyền sửa theo trực hệ ' +
            'của người ấy ở MỌI gia phả, có hiệu lực ngay.'
          : 'Gắn ' + d.maNguoi + ' cho ' + d.email + ' — mở quyền sửa bản thân, tổ tiên đường ' +
            'thẳng và toàn bộ con cháu của người ấy, ở MỌI gia phả tài khoản này tham gia.',
        nutOk: 'Duyệt', kieuOk: 'warm', lam: () => duyetDeXuatGan(d.id),
      });
      if (kq) napLai();
    });
    const bTuChoi = d.laCuaToi ? nutMo('Từ chối', LY_TU, 'danger') : nut('Từ chối', 'danger');
    bTuChoi.addEventListener('click', async () => {
      const kq = await hoi({
        tua: laGo ? 'Từ chối đề xuất gỡ' : 'Từ chối đề xuất gắn mã',
        chu: 'Người nộp đọc lại được câu lý do này — bắt buộc ghi.',
        oNhap: { nhieuDong: true, goiY: 'Lý do từ chối' },
        nutOk: 'Từ chối', kieuOk: 'danger', lam: (lyDo) => tuChoiDeXuatGan(d.id, lyDo),
      });
      if (kq) napLai();
    });

    const oTk = td(tenVaPhu(d.email, d.maNgan ? 'Mã tài khoản: ' + d.maNgan : ''));
    if (d.laCuaToi) oTk.append(huyHieu('Đơn của bạn', 'wait'));
    if (d.emailNopBoi) oTk.append(span('sub', 'Người đề xuất: ' + d.emailNopBoi));
    const oLyDo = td(d.lyDo ? '“' + d.lyDo + '”' : '');
    if (d.maDangCo && !laGo) oLyDo.append(span('sub', 'Tài khoản này đang gắn ' + d.maDangCo + '.'));

    const oNguoi = td(tenVaPhu(d.tenNguoi || d.maNguoi, 'ID: ' + d.maNguoi));
    if (laGo) oNguoi.append(huyHieu('Đề xuất GỠ', 'red'));

    const tr = document.createElement('tr');
    tr.append(
      oTk,
      oNguoi,
      oLyDo,
      td(ngayGio(d.taoLuc)),
      td(hangNut(bDuyet, bTuChoi)),
    );
    tb.append(tr);
  }
}

function veBangDongHo(sec, ds, napLai) {
  const tb = sec.querySelector('#hsd-dongho-tbody');
  sec.querySelector('#hsd-dongho-dem').textContent = ds.length ? ds.length + ' đơn đang chờ' : '';
  if (!ds.length) { dongTrong(tb, SO_COT_DONGHO, 'Không có đơn dòng họ nào đang chờ.'); return; }

  const LY_TU = 'Đơn của chính bạn — dòng họ không có khe tự duyệt; nhờ một Quản trị hệ thống khác.';
  tb.innerHTML = '';
  for (const d of ds) {
    const bDuyet = d.laCuaToi ? nutMo('Duyệt', LY_TU, 'warm') : nut('Duyệt', 'warm');
    bDuyet.addEventListener('click', async () => {
      const kq = await hoi({
        tua: 'Duyệt đề xuất dòng họ',
        chu: 'Đặt “' + d.tenCay + '” làm dòng họ của ' + d.email + '?',
        nutOk: 'Duyệt', kieuOk: 'warm', lam: () => duyetDeXuatDongHo(d.id),
      });
      if (kq) napLai();
    });
    const bTuChoi = d.laCuaToi ? nutMo('Từ chối', LY_TU, 'danger') : nut('Từ chối', 'danger');
    bTuChoi.addEventListener('click', async () => {
      const kq = await hoi({
        tua: 'Từ chối đề xuất dòng họ',
        chu: 'Người nộp đọc lại được câu lý do này — bắt buộc ghi.',
        oNhap: { nhieuDong: true, goiY: 'Lý do từ chối' },
        nutOk: 'Từ chối', kieuOk: 'danger', lam: (lyDo) => tuChoiDeXuatDongHo(d.id, lyDo),
      });
      if (kq) napLai();
    });

    const oTk = td(tenVaPhu(d.email, d.maNgan ? 'Mã tài khoản: ' + d.maNgan : ''));
    if (d.laCuaToi) oTk.append(huyHieu('Đơn của bạn', 'wait'));

    const tr = document.createElement('tr');
    tr.append(
      oTk,
      td(tenVaPhu(d.tenCay, '')),
      td(d.dongHoHien ? span('sub', 'Hiện: ' + d.dongHoHien) : ''),
      td(ngayGio(d.taoLuc)),
      td(hangNut(bDuyet, bTuChoi)),
    );
    tb.append(tr);
  }
}
