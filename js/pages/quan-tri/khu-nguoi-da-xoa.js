import { dsNguoiDaXoa, xoaAnhThat } from '../../services/sb.js';
import { napCayRieng, luuCayRieng } from '../../services/repo.js';
import { restorePerson } from '../../domains/person.js';
import { planPurge, applyPurge, moTaKePurge } from '../../domains/purge.js';
import { stampNow } from '../../utils/date.js';
import { hoi, bao } from './hop-thoai.js';
import { td, span, dongTrong, ngayGio } from './o-bang.js';

const SO_COT = 7;
const khoa = (r) => r.treeId + '|' + r.maNguoi;

export async function veKhuNguoiDaXoa(sec, phien) {
  const tb = sec.querySelector('#nguoi-rac-tbody');
  if (!tb) return;
  const dem = sec.querySelector('#nguoi-rac-dem');
  const loc = sec.querySelector('#nguoi-rac-loc');
  const chonHet = sec.querySelector('#nguoi-rac-chon-het');
  const bKp = sec.querySelector('#btn-nguoi-rac-khoi-phuc');
  const bXoa = sec.querySelector('#btn-nguoi-rac-xoa');
  const napLai = () => veKhuNguoiDaXoa(sec, phien);

  bKp.disabled = true; bXoa.disabled = true; chonHet.checked = false;
  dongTrong(tb, SO_COT, 'Đang đọc thùng rác người…');
  dem.textContent = '';

  const kq = await dsNguoiDaXoa();
  if (!kq.ok) { dongTrong(tb, SO_COT, kq.loi, kq.chuaDan ? null : napLai); return; }

  const ds = kq.ds;
  const chon = new Set();

  const cu = loc.value;
  const cacCay = new Map();
  for (const r of ds) if (!cacCay.has(r.treeId)) cacCay.set(r.treeId, r.tenCay || r.maCay);
  const luaChon = (chu, giaTri) => {
    const op = document.createElement('option');
    op.value = giaTri;
    op.textContent = chu;
    return op;
  };
  loc.innerHTML = '';
  loc.append(luaChon('Tất cả các cây (' + ds.length + ')', 'all'));
  for (const [id, ten] of cacCay) {
    loc.append(luaChon(ten + ' (' + ds.filter((r) => r.treeId === id).length + ')', id));
  }
  loc.value = cacCay.has(cu) ? cu : 'all';

  const dangHien = () => ds.filter((r) => loc.value === 'all' || r.treeId === loc.value);

  function capNhatNut() {
    const n = chon.size;
    bKp.textContent = 'Khôi phục (' + n + ')';
    bXoa.textContent = 'Xoá vĩnh viễn (' + n + ')';
    bKp.disabled = n === 0;
    bXoa.disabled = n === 0;
    const hien = dangHien();
    chonHet.checked = hien.length > 0 && hien.every((r) => chon.has(khoa(r)));
  }

  function ve() {
    const hien = dangHien();
    dem.textContent = ds.length + ' người · mọi gia phả' +
      (cacCay.size ? ' · ' + cacCay.size + ' cây' : '');
    if (!hien.length) {
      dongTrong(tb, SO_COT, ds.length ? 'Cây này không có ai trong thùng rác.'
                                      : 'Thùng rác không có người nào.');
      capNhatNut();
      return;
    }
    tb.innerHTML = '';
    for (const r of hien) {
      const o = document.createElement('input');
      o.type = 'checkbox';
      o.checked = chon.has(khoa(r));
      o.setAttribute('aria-label', 'Chọn ' + r.ten);
      o.addEventListener('change', () => {
        if (o.checked) chon.add(khoa(r)); else chon.delete(khoa(r));
        capNhatNut();
      });
      const oChon = td(o);
      const nam = [r.namSinh, r.namMat].filter(Boolean).join(' – ');
      const tr = document.createElement('tr');
      tr.append(oChon, td(span('', r.ten)), td(span('sub', r.maNguoi)),
        td(span('', r.tenCay), document.createElement('br'), span('sub', r.maCay)),
        td(nam), td(ngayGio(r.xoaLuc) || r.xoaLuc), td(span('sub', r.xoaBoi)));
      tb.append(tr);
    }
    capNhatNut();
  }

  loc.onchange = () => { chon.clear(); ve(); };
  chonHet.onchange = () => {
    for (const r of dangHien()) { if (chonHet.checked) chon.add(khoa(r)); else chon.delete(khoa(r)); }
    ve();
  };
  bKp.onclick = () => hoiKhoiPhuc(ds.filter((r) => chon.has(khoa(r))), phien, napLai);
  bXoa.onclick = () => hoiXoaVinhVien(ds.filter((r) => chon.has(khoa(r))), napLai);
  ve();
}

export function theoCay(dong, layMa = (r) => r.maNguoi) {
  const m = new Map();
  for (const r of dong) {
    if (!m.has(r.treeId)) m.set(r.treeId, { ten: r.tenCay || r.maCay, dong: [], ma: [] });
    m.get(r.treeId).dong.push(r);
    m.get(r.treeId).ma.push(layMa(r));
  }
  return m;
}

function keTen(dong) {
  const ten = dong.slice(0, 4).map((r) => r.ten);
  return ten.join(', ') + (dong.length > 4 ? ' và ' + (dong.length - 4) + ' người nữa' : '');
}

async function hoiKhoiPhuc(dong, phien, napLai) {
  if (!dong.length) return;
  const nhom = theoCay(dong);
  const kq = await hoi({
    tua: 'Đưa trở lại gia phả',
    chu: keTen(dong) + '. Họ hiện lại trên sơ đồ đúng chỗ cũ — xoá mềm không gỡ ' +
         'mối nối nào. Người có cặp cũng đang trong thùng rác thì vẫn chưa nối với ai ' +
         'cho tới khi cặp ấy được đưa trở lại (ở Danh sách người của cây).',
    nutOk: 'Khôi phục ' + dong.length + ' người', kieuOk: 'primary',
    lam: () => chayTheoCay(nhom, (cay, ma) => khoiPhucTrongCay(cay, ma, phien),
      (ma, ten) => ({ action: 'restore', target: ma.length === 1 ? ma[0] : '',
                      note: 'Quản trị hệ thống: đưa ' + ma.length + ' người trở lại từ thùng rác (' + ten + ').' })),
  });
  if (kq) { baoKetQua('Đã khôi phục', kq.kq); napLai(); }
}

function khoiPhucTrongCay(cay, dsMa, phien) {
  const gn = { boi: (phien && phien.email) || '', luc: stampNow() };
  let t = cay;
  for (const ma of dsMa) { const r = restorePerson(t, ma, gn); if (r) t = r.tree; }
  cay.persons = t.persons;
}

async function hoiXoaVinhVien(dong, napLai) {
  if (!dong.length) return;
  const nhom = theoCay(dong);

  const ke = [];
  for (const [treeId, n] of nhom) {
    const nap = await napCayRieng(treeId);
    if (!nap.ok) { bao('Không đọc được gia phả', n.ten + ': ' + nap.loi); return; }
    ke.push(planPurge(nap.cay, n.ma));
  }
  const tong = {
    personIds: ke.flatMap((k) => k.personIds), unionIds: ke.flatMap((k) => k.unionIds),
    mediaIds: ke.flatMap((k) => k.mediaIds),
  };
  const capGo = ke.reduce((s, k) => s + k.capPhaiGo.length, 0);
  const soFile = ke.reduce((s, k) => s + k.fileIds.length, 0);
  const cau = [keTen(dong) + '.'];
  if (capGo) cau.push(capGo + ' cặp còn trong gia phả đang giữ mã của họ sẽ bị gỡ mã ấy.');
  if (soFile) cau.push(soFile + ' file ảnh bị xoá khỏi kho — chỉ còn ở bản sao lưu đêm.');
  cau.push('KHÔNG hoàn tác được từ trong app; đường lùi là bản sao lưu đêm gần nhất (tab Sao lưu).');

  const kq = await hoi({
    tua: 'Xoá vĩnh viễn · ' + moTaKePurge(tong),
    chu: cau.join(' '),
    nutOk: 'Xoá vĩnh viễn', kieuOk: 'danger',
    lam: () => chayTheoCay(nhom, (cay, ma, sauLuu) => {
      const k = applyPurge(cay, ma);
      if (!k) throw new Error('Những người vừa chọn không còn trong thùng rác — có thể người khác vừa dọn.');
      cay.persons = k.tree.persons; cay.unions = k.tree.unions; cay.media = k.tree.media;
      sauLuu.fileIds = k.ke.fileIds;
      sauLuu.moTa = moTaKePurge(k.ke);
    }, (ma, ten, sauLuu) => ({ action: 'purge', target: '',
      note: 'Quản trị hệ thống — thùng rác: xoá vĩnh viễn ' + (sauLuu.moTa || ma.length + ' người') + ' (' + ten + ').' }),
    true),
  });
  if (kq) { baoKetQua('Đã xoá vĩnh viễn', kq.kq); napLai(); }
}

export async function chayTheoCay(nhom, apDung, moTa, donAnh = false, donVi = 'người') {
  const xong = [], hong = [];
  let anhXoa = 0, anhHong = 0;
  for (const [treeId, n] of nhom) {
    const ma = n.ma;
    const nap = await napCayRieng(treeId);
    if (!nap.ok) { hong.push(n.ten + ': ' + nap.loi); continue; }
    const sauLuu = {};
    let kq;
    try {
      kq = await luuCayRieng(treeId, nap.cay, (c) => apDung(c, ma, sauLuu),
        () => moTa(ma, n.ten, sauLuu));
    } catch (e) {
      kq = { ok: false, loi: e && e.message ? e.message : String(e) };
    }
    if (!kq || !kq.ok) { hong.push(n.ten + ': ' + ((kq && kq.loi) || 'máy chủ từ chối.')); continue; }
    xong.push(n.ten + ' (' + ma.length + ' ' + donVi + ')');
    if (donAnh && sauLuu.fileIds && sauLuu.fileIds.length) {
      try {
        const a = await xoaAnhThat(sauLuu.fileIds);
        anhXoa += (a && a.soXoa) || 0; anhHong += (a && a.soHong) || 0;
      } catch { anhHong += sauLuu.fileIds.length; }
    }
  }
  if (!xong.length) return { ok: false, loi: 'CHƯA làm gì cả. ' + hong.join(' · ') };
  return { ok: true, xong, hong, anhXoa, anhHong };
}

export function baoKetQua(tua, kq) {
  if (!kq) return;
  const cau = ['Xong: ' + kq.xong.join(', ') + '.'];
  if (kq.anhXoa) cau.push(kq.anhXoa + ' file ảnh đã xoá khỏi kho.');
  if (kq.anhHong) cau.push(kq.anhHong + ' file ảnh không xoá được (có thể đã bị xoá tay từ trước) — chỉ còn là file thừa trong kho.');
  if (kq.hong.length) cau.push('CHƯA làm được: ' + kq.hong.join(' · ') + '. Tải lại rồi thử lại cây ấy.');
  bao(tua, cau.join(' '));
}
