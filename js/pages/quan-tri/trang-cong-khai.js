import {
  docCongKhaiTaiKhoan, datCongKhaiTaiKhoan, layDanhSachGiaPha, dsTaiKhoanHeThong,
  dsCayCuaTaiKhoan,
} from '../../services/sb.js';
import { rapMotNguoi } from '../../services/hinh-dang.js';
import { fullName, coGiaTri } from '../../utils/text.js';
import { formatDate } from '../../utils/date.js';
import { duongDan } from './trang-chi-tiet.js';
import { bao } from './hop-thoai.js';
import { datTabQuanTriHeThong } from './khu-quan-tri-he-thong.js';
import { td, span, huyHieu, chepKieu, dongTrong, lienKet } from './o-bang.js';

const SO_COT = 5;
const GIOI = { M: 'Nam', F: 'Nữ' };

export const NHOM_CONG_KHAI = [
  ['gioi_tinh', 'Giới tính'],
  ['nam_sinh', 'Năm sinh'],
  ['ngay_sinh', 'Ngày tháng năm sinh đầy đủ'],
  ['song_mat', 'Tình trạng sinh tử (Còn sống / Đã mất)'],
  ['ngay_mat', 'Ngày mất, ngày giỗ & nơi an táng'],
  ['doi', 'Đời thứ trong tộc'],
  ['anh', 'Ảnh chân dung đại diện'],
  ['que_quan', 'Quê quán / Nguyên quán'],
  ['tieu_su', 'Tiểu sử & ghi chú cá nhân'],
  ['lien_he', 'Số điện thoại & Email liên hệ'],
];

export function lienKetCongKhai(hash, hua, treeId) {
  const a = lienKet('Xem →', hash);
  hua.then((kq) => {
    if (!kq.ok || !kq.theoCay.has(treeId)) return;
    const t = kq.theoCay.get(treeId);
    a.textContent = (1 + (Array.isArray(t) ? t.length : NHOM_CONG_KHAI.length)) + ' thông tin →';
  });
  return a;
}

export async function mountCongKhai(sec, ctx) {
  const $ = (id) => sec.querySelector('#' + id);
  const tuQTHT = ctx.hashQuayVe === 'quan-tri-he-thong';
  const [maTk, maCay] = tuQTHT ? String(ctx.thamSo).split('~') : ['', ctx.thamSo];
  const hashVe = tuQTHT ? duongDan('quan-tri-he-thong', 'tai-khoan', maTk) : ctx.hashQuayVe;
  const ve = () => { window.location.hash = hashVe; };
  if (tuQTHT) datTabQuanTriHeThong('so-tai-khoan');

  const tb = $('pid-fields-tbody');
  const bLuu = $('pid-btn-save');
  $('pid-title').textContent = 'Thông tin công khai · ' + (maCay || '');
  $('pid-meta').textContent = '';
  $('pid-count-badge').textContent = '';
  dongTrong(tb, SO_COT, 'Đang đọc…');
  for (const id of ['pid-back-btn', 'pid-btn-back-bottom', 'pid-btn-cancel']) $(id).onclick = ve;
  bLuu.disabled = true;

  const hashLuc = window.location.hash;
  const napLai = () => mountCongKhai(sec, ctx);
  const lo = (chu) => { if (window.location.hash === hashLuc) dongTrong(tb, SO_COT, chu, napLai); };

  let treeId = null, userId = null, tenTk = '';
  if (tuQTHT) {
    const kq = await dsTaiKhoanHeThong();
    const tk = kq.ok && kq.ds.find((t) => t.maNgan === maTk);
    if (!tk) { lo(kq.ok ? 'Không thấy tài khoản mã ' + maTk + '.' : kq.loi); return; }
    const kqCay = await dsCayCuaTaiKhoan(tk.userId);
    const c = kqCay.ok && kqCay.ds.find((x) => x.maCay === maCay);
    if (!c) { lo(kqCay.ok ? 'Tài khoản ' + maTk + ' không ở gia phả ' + maCay + '.' : kqCay.loi); return; }
    treeId = c.treeId; userId = tk.userId; tenTk = (tk.hoTen || tk.email) + ' (' + tk.maNgan + ')';
  } else {
    const kq = await layDanhSachGiaPha();
    const c = kq.ok && kq.ds.find((x) => x.treeCode === maCay);
    if (!c) { lo(kq.ok ? 'Không thấy gia phả mã ' + maCay + ' trong danh sách của bạn.' : kq.loi); return; }
    treeId = c.fileId;
    const p = ctx.phien || {};
    tenTk = (p.hoTen || p.email || '') + (p.maNgan ? ' (' + p.maNgan + ')' : '');
  }

  const d = await docCongKhaiTaiKhoan(treeId, userId);
  if (window.location.hash !== hashLuc) return;
  if (!d.ok) { lo(d.loi); return; }

  const nguoi = rapMotNguoi(d.nguoi);
  const tenCay = (d.ten || '') + ' (' + (d.maCay || maCay) + ')';
  const tenNguoi = nguoi ? fullName(nguoi) + ' (ID: ' + nguoi.id + ')' : 'Chưa gắn người';
  $('pid-title').textContent = 'Thông tin công khai · ' + tenCay;
  $('pid-meta').textContent = tuQTHT
    ? '[Quản trị hệ thống] Tài khoản: ' + tenTk + ' · Nhân vật trong sơ đồ: ' + tenNguoi
    : '[Tài khoản của bạn] Bạn: ' + tenTk + ' · Nhân vật của bạn: ' + tenNguoi;
  $('pid-breadcrumb').textContent = tuQTHT
    ? '/ Sổ tài khoản / Các gia phả của ' + tenTk + ' / Thông tin công khai'
    : '/ ' + ctx.chuQuayVe + ' / Thông tin công khai của tôi trong ' + tenCay;
  $('pid-back-btn').textContent = tuQTHT ? '← Quay lại Các gia phả của ' + tenTk : '← Quay lại ' + ctx.chuQuayVe;

  const bat = new Set(Array.isArray(d.truong) ? d.truong : NHOM_CONG_KHAI.map(([ma]) => ma));
  const cay = new Set(Array.isArray(d.truongCay) ? d.truongCay : []);
  const ve_ = () => veBang($, nguoi, d.doi, bat, cay);
  ve_();

  $('pid-btn-check-all').onclick = () => { for (const [ma] of NHOM_CONG_KHAI) bat.add(ma); ve_(); };
  $('pid-btn-uncheck-all').onclick = () => { bat.clear(); ve_(); };
  bLuu.disabled = false;
  bLuu.onclick = async () => {
    bLuu.disabled = true;
    const kq = await datCongKhaiTaiKhoan(treeId, userId, [...bat]);
    bLuu.disabled = false;
    if (!kq.ok) { await bao('Không lưu được', kq.loi); return; }
    await bao(tuQTHT ? 'Quản trị hệ thống đã lưu' : 'Lưu thành công',
      'Đã lưu thiết lập thông tin công khai trong gia phả "' + tenCay + '". Hiện có ' +
      (1 + bat.size) + '/' + (1 + NHOM_CONG_KHAI.length) +
      ' trường được phép hiển thị cho khách và thành viên chỉ có quyền Xem.');
    ve();
  };
}

function veBang($, nguoi, doi, bat, cay) {
  const tb = $('pid-fields-tbody');
  tb.innerHTML = '';
  const gt = giaTri(nguoi, doi);
  if (!bat.has('song_mat')) bat.delete('ngay_mat');

  tb.append(dong('Họ và tên nhân vật', gt.ten, true, gt.ten,
    chepKieu(span('muted', 'Cố định'), 'font-size:11px'), 'Bắt buộc công khai để nhận diện sơ đồ'));

  const mo = (m) => bat.has(m) && cay.has(m);
  for (const [ma, chu] of NHOM_CONG_KHAI) {
    const moNguoi = bat.has(ma);
    const moThat = ma === 'nam_sinh' ? mo('nam_sinh') || mo('ngay_sinh')
      : ma === 'ngay_mat' ? mo('ngay_mat') && mo('song_mat')
      : mo(ma);
    const lbl = chepKieu(document.createElement('label'), 'cursor:pointer;display:inline-flex;align-items:center;gap:4px');
    const o = chepKieu(document.createElement('input'), 'cursor:pointer;width:16px;height:16px');
    o.type = 'checkbox';
    o.checked = moNguoi;
    if (ma === 'ngay_mat' && !bat.has('song_mat')) {
      o.disabled = true;
      lbl.title = 'Tình trạng sinh tử đang tắt — ngày mất cũng phải ẩn.';
    }
    o.onchange = () => { if (o.checked) bat.add(ma); else bat.delete(ma); veBang($, nguoi, doi, bat, cay); };
    lbl.append(o, chepKieu(span('', moNguoi ? 'Bật' : 'Tắt'), 'font-size:12px'));
    const vi = !moThat && moNguoi && !cay.has(ma) ? 'Gia phả này đang tắt trường ấy với mọi khách' : '';
    tb.append(dong(chu, gt[ma], moNguoi, moThat ? gt[ma] : '-', lbl, vi));
  }

  const n = 1 + bat.size;
  $('pid-count-badge').textContent = n + ' / ' + (1 + NHOM_CONG_KHAI.length) + ' trường công khai';
}

function dong(ten, giaTriNhap, laCongKhai, khachThay, oCuoi, viSao) {
  const tr = document.createElement('tr');
  const oKhach = chepKieu(td(chepKieu(span('muted', khachThay || '-'), 'font-family:monospace;font-size:12px')),
    'text-align:center');
  if (viSao) oKhach.title = viSao;
  const oTen = document.createElement('strong');
  oTen.textContent = ten;
  tr.append(
    td(oTen),
    td(chepKieu(span('', giaTriNhap || '—'), 'color:var(--ink)')),
    td(huyHieu(laCongKhai ? 'Công khai' : 'Riêng tư', laCongKhai ? '' : 'wait')),
    oKhach,
    chepKieu(td(oCuoi), 'text-align:center'),
  );
  return tr;
}

function giaTri(p, doi) {
  if (!p) return { ten: '— (Chưa gắn người)' };
  const soDoi = coGiaTri(doi) ? doi : (p.vn && p.vn.generation);
  const nam = (p.birth && (String(p.birth.iso || '').slice(0, 4) ||
    (String(p.birth.raw || '').match(/\d{4}/) || [''])[0])) || '';
  const noi = (x) => [formatDate(x), x && x.place].filter(coGiaTri).join(' · ');
  const mat = [noi(p.death), p.vn && p.vn.gio ? 'Giỗ ' + p.vn.gio : '',
    p.burialPlace ? 'An táng: ' + p.burialPlace : ''].filter(coGiaTri).join(' · ');
  const tieuSu = [p.note, p.title, p.occupation, p.education, p.religion, p.nationality]
    .filter(coGiaTri).join(' · ');
  return {
    ten: fullName(p) || p.id,
    gioi_tinh: GIOI[p.sex] || '',
    nam_sinh: nam,
    ngay_sinh: noi(p.birth),
    song_mat: p.living === false ? 'Đã mất' : 'Còn sống',
    ngay_mat: mat,
    doi: coGiaTri(soDoi) ? 'Đời ' + soDoi : '',
    anh: p.photoFileId ? 'Có ảnh (' + p.photoFileId + ')' : '',
    que_quan: p.residence || '',
    tieu_su: tieuSu.length > 80 ? tieuSu.slice(0, 80) + '…' : tieuSu,
    lien_he: p.contact || '',
  };
}
