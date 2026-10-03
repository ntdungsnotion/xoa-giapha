import { layPhien, layDanhSachGiaPha, dsChoDuyet, demChoKiemDuyet } from '../../services/sb.js';
import { mountDangNhap } from '../dang-nhap.js';
import { mountKhuKiemDuyet, mountChiTietKiemDuyet } from './khu-kiem-duyet.js';
import { mountKhuGiaPha } from './khu-gia-pha.js';
import { mountKhuTaiKhoan } from './khu-tai-khoan.js';
import { mountKhuQuanTriHeThong, mountChonCayMacDinh } from './khu-quan-tri-he-thong.js';
import { mountTrangCay, MUC_TRANG_CAY } from './trang-cay.js';
import { mountTrangTaiKhoan } from './trang-tai-khoan.js';
import { mountTrangMoi } from './trang-moi.js';
import { mountHoSoNguoi } from './trang-ho-so-nguoi.js';
import { mountCongKhai } from './trang-cong-khai.js';
import { duongDan } from './trang-chi-tiet.js';
import { chuDau } from './o-bang.js';
import { ganNutPhoiMau } from './phoi-mau.js';

const KHU = [
  { ma: 'gia-pha',    chu: 'Gia phả', view: 'gia-pha' },
  { ma: 'thanh-vien', chu: 'Tài khoản', view: 'tai-khoan' },
  { ma: 'kiem-duyet', chu: 'Kiểm duyệt', view: 'kiem-duyet' },
  { ma: 'quan-tri-he-thong', chu: 'Quản trị hệ thống', view: 'quan-tri-he-thong' },
];

const TRANG = [
  { khu: 'gia-pha', ma: 'cay', view: 'tree-detail', mount: mountTrangCay, muc: MUC_TRANG_CAY },
  { khu: 'gia-pha', ma: 'moi', view: 'tree-invite', mount: mountTrangMoi, muc: [] },
  { khu: 'kiem-duyet', ma: 'lan-luu', view: 'kiem-duyet-chitiet', mount: mountChiTietKiemDuyet, muc: [] },
  { khu: 'quan-tri-he-thong', ma: 'tai-khoan', view: 'sys-account-trees', mount: mountTrangTaiKhoan, muc: [] },
  { khu: 'quan-tri-he-thong', ma: 'cay-mac-dinh', view: 'sys-default-tree-selector',
    mount: mountChonCayMacDinh, muc: [] },
  { khu: 'gia-pha', ma: 'nguoi', view: 'person-profile', mount: mountHoSoNguoi, muc: [] },
  { khu: 'thanh-vien', ma: 'nguoi', view: 'person-profile', mount: mountHoSoNguoi, muc: [] },
  { khu: 'quan-tri-he-thong', ma: 'nguoi', view: 'person-profile', mount: mountHoSoNguoi, muc: [] },
  { khu: 'gia-pha', ma: 'cong-khai', view: 'public-info-detail', mount: mountCongKhai, muc: [] },
  { khu: 'thanh-vien', ma: 'cong-khai', view: 'public-info-detail', mount: mountCongKhai, muc: [] },
  { khu: 'quan-tri-he-thong', ma: 'cong-khai', view: 'public-info-detail', mount: mountCongKhai, muc: [] },
];

export async function mountKhung(appEl) {
  appEl.textContent = 'Đang mở trang Quản trị…';

  const phien = await layPhien();
  if (phien.loi) return veCanhBao(appEl, phien.loi);
  if (!phien.daDangNhap) return mountDangNhap(appEl, () => mountKhung(appEl));

  appEl.innerHTML = '';
  const app = document.querySelector('.app');
  app.hidden = false;

  app.querySelector('[data-avatar]').textContent = chuDau(phien.hoTen, phien.email);
  app.querySelector('[data-user-email]').textContent = phien.email || '';

  const nutTheoMa = new Map();
  for (const b of app.querySelectorAll('.nav[data-route]')) {
    const ma = b.dataset.route;
    if (b.hasAttribute('data-system-only')) b.hidden = !phien.laQuanTriHeThong;
    b.addEventListener('click', () => { window.location.hash = ma; });
    nutTheoMa.set(ma, b);
  }

  for (const b of app.querySelectorAll('[data-back]')) {
    b.addEventListener('click', () => { window.location.hash = b.dataset.back; });
  }

  ganKhay(app);
  ganNutPhoiMau(app);

  const veKhuDangMo = () => { dongKhay(); veKhu(app, nutTheoMa, phien); };
  window.addEventListener('hashchange', veKhuDangMo);
  veKhuDangMo();

  napSoDem(phien, nutTheoMa);
}

function ganKhay(app) {
  const nut = app.querySelector('.qt-menu');
  const man = app.querySelector('.qt-man');
  const aside = app.querySelector('aside');
  if (!nut || !man || !aside) return;
  nut.addEventListener('click', () => {
    if (aside.classList.contains('qt-mo')) dongKhay(); else moKhay();
  });
  man.addEventListener('click', dongKhay);
}

function moKhay() {
  const aside = document.querySelector('aside');
  const man = document.querySelector('.qt-man');
  if (aside) aside.classList.add('qt-mo');
  if (man) man.classList.add('qt-mo');
}

function dongKhay() {
  const aside = document.querySelector('aside');
  const man = document.querySelector('.qt-man');
  if (aside) aside.classList.remove('qt-mo');
  if (man) man.classList.remove('qt-mo');
}

function veKhu(app, nutTheoMa, phien) {
  const doan = docHash();
  const khu = KHU.find((k) => k.ma === doan[0]) || KHU[0];
  const trang = khu.ma === doan[0] && doan[2]
    ? TRANG.find((t) => t.khu === khu.ma && t.ma === doan[1]) || null
    : null;
  const muc = trang && trang.muc.length
    ? (trang.muc.find((m) => m.ma === doan[3]) || trang.muc[0])
    : null;
  const hashMuc = (ma) => duongDan(khu.ma, trang.ma, doan[2],
                                   ma === trang.muc[0].ma ? '' : ma);
  const dung = !trang ? khu.ma
    : muc ? hashMuc(muc.ma)
    : duongDan(khu.ma, trang.ma, doan[2]);
  if (window.location.hash.slice(1) !== dung) {
    window.history.replaceState(null, '', '#' + dung);
  }

  for (const [ma, b] of nutTheoMa) {
    const dangMo = ma === khu.ma;
    b.classList.toggle('active', dangMo);
    if (dangMo) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }

  const viewId = trang ? ((muc && muc.view) || trang.view) : khu.view;
  for (const v of app.querySelectorAll('main > .view')) v.hidden = v.id !== viewId;
  const el = document.getElementById(viewId);
  window.scrollTo(0, 0);

  if (trang) {
    trang.mount(el, { phien, thamSo: doan[2], muc: muc ? muc.ma : '',
                      hashQuayVe: khu.ma, chuQuayVe: khu.chu, hashMuc });
    return;
  }

  if (khu.ma === 'gia-pha') mountKhuGiaPha(el, phien);
  else if (khu.ma === 'thanh-vien') mountKhuTaiKhoan(el, phien);
  else if (khu.ma === 'kiem-duyet') mountKhuKiemDuyet(el);
  else if (khu.ma === 'quan-tri-he-thong') mountKhuQuanTriHeThong(el, phien);
}

function docHash() {
  return window.location.hash.slice(1).split('/').map((d) => {
    try { return decodeURIComponent(d); } catch (_) { return ''; }
  });
}

async function napSoDem(phien, nutTheoMa) {
  try {
    const kq = await layDanhSachGiaPha();
    const ds = (kq.ok ? kq.ds || [] : []).filter((c) => !c.daXoaLuc && c.coTheXem
      && (phien.laQuanTriHeThong || c.toiLaChu || c.vaiCuaToi === 'quan_tri'));
    const ket = await Promise.all(ds.map((c) => Promise.all([
      dsChoDuyet(c.fileId),
      demChoKiemDuyet(c.fileId),
    ])));
    let soDon = 0, soKiemDuyet = 0;
    for (const [dsDon, so] of ket) {
      soDon += Array.isArray(dsDon) ? dsDon.length : 0;
      soKiemDuyet += Number(so) || 0;
    }
    themSo(nutTheoMa.get('gia-pha'), soDon, 'đơn chờ duyệt');
    themSo(nutTheoMa.get('kiem-duyet'), soKiemDuyet, 'thay đổi chờ kiểm duyệt');
  } catch (_) {
  }
}

function themSo(nut, so, nghiaLa) {
  if (!nut || !so) return;
  const huy = document.createElement('b');
  huy.textContent = String(so);
  huy.setAttribute('aria-label', so + ' ' + nghiaLa);
  nut.append(huy);
}

function veCanhBao(el, chu) {
  el.innerHTML = '';

  const hop = document.createElement('div');
  hop.className = 'qt-canh-bao';

  const h = document.createElement('h1');
  h.textContent = 'Không mở được trang Quản trị';

  const p = document.createElement('p');
  p.textContent = chu;

  const a = document.createElement('a');
  a.href = 'index.html';
  a.textContent = '← Về sơ đồ gia phả';

  hop.append(h, p, a);
  el.append(hop);
}
