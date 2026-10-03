import { layDanhSachGiaPha, dsNguoiMoCoi, dsAnhMatChu, dsFileThua, duongDanAnh,
         donMoCoiHeThong, xoaAnhThat } from '../../services/sb.js';
import { napCayRieng } from '../../services/repo.js';
import { checkOrphanNode, checkUnionPointless, coNoiVanhDai } from '../../domains/validate.js';
import { softDeletePerson, getDisplayName } from '../../domains/person.js';
import { softDeleteUnion } from '../../domains/union.js';
import { applyPurge } from '../../domains/purge.js';
import { buildIndex } from '../../utils/graph.js';
import { stampNow } from '../../utils/date.js';
import { hoi, bao } from './hop-thoai.js';
import { td, span, dongTrong, ngayGio } from './o-bang.js';
import { theoCay, chayTheoCay, baoKetQua, veKhuNguoiDaXoa } from './khu-nguoi-da-xoa.js';

const NAM = /\d{4}/;
const nam = (d) => (d && ((d.iso || '').slice(0, 4) || ((d.raw || '').match(NAM) || [''])[0])) || '';

export function veKhuDuLieuMoCoi(sec, phien) {
  const b = sec.querySelector('#btn-mc-quet');
  if (!b) return;
  const bang = {
    nguoi: taoBang(sec, 'nguoi', 6, 'Chưa quét.'),
    cap: taoBang(sec, 'cap', 5, 'Chưa quét.'),
    anh: taoBang(sec, 'anh', 6, 'Chưa quét.'),
  };
  b.onclick = () => quet(sec, phien, bang);
}

async function quet(sec, phien, bang) {
  const nut = sec.querySelector('#btn-mc-quet');
  const tt = sec.querySelector('#mc-trang-thai');
  nut.disabled = true;
  for (const k of Object.keys(bang)) bang[k].dat([], 'Đang quét…');

  const [kqCay, kqNgoai, kqMatChu, kqThua] = await Promise.all([
    layDanhSachGiaPha(), dsNguoiMoCoi(), dsAnhMatChu(), dsFileThua(),
  ]);
  const cacCay = (kqCay.ok ? kqCay.ds || [] : []).filter((c) => !c.daXoaLuc && !c.xinXoaLuc);

  const nguoi = [], cap = [], loiCay = [];
  let i = 0;
  for (const c of cacCay) {
    tt.textContent = 'Đang đọc ' + c.ten + ' (' + (++i) + '/' + cacCay.length + ')…';
    const nap = await napCayRieng(c.fileId);
    if (!nap.ok) { loiCay.push(c.ten + ': ' + nap.loi); continue; }
    const index = buildIndex(nap.cay);
    for (const [id, p] of index.personById) {
      if (checkOrphanNode(index, id).ok || coNoiVanhDai(index, id)) continue;
      nguoi.push({ loai: 'cay', treeId: c.fileId, tenCay: c.ten, maCay: c.treeCode, maNguoi: id,
                   ten: getDisplayName(p) || id, namSinh: nam(p.birth), namMat: nam(p.death) });
    }
    for (const [id, u] of index.unionById) {
      const r = checkUnionPointless(index, id);
      if (r.ok) continue;
      const ten = (Array.isArray(u.partners) ? u.partners : [])
        .map((pid) => { const p = index.personById.get(pid); return p ? getDisplayName(p) : pid; });
      cap.push({ treeId: c.fileId, tenCay: c.ten, maCay: c.treeCode, maCap: id,
                 nguoi: ten.join(' · '), lyDo: r.message });
    }
  }

  for (const p of kqNgoai.ok ? kqNgoai.ds : []) {
    const khoaChon = p.soHonNhan > 0;
    nguoi.push({ loai: 'ngoai', treeId: null, tenCay: '', maCay: '', maNguoi: p.maNguoi, ten: p.ten,
                 namSinh: p.namSinh, namMat: p.namMat, daXoa: p.daXoa, khoaChon,
                 lyDoKhoa: khoaChon ? 'Còn đứng trong ' + p.soHonNhan + ' cặp với người thuộc một cây — xoá là đổi gia phả ấy, máy chủ không làm.' : '' });
  }
  const anh = [];
  for (const a of kqMatChu.ok ? kqMatChu.ds : []) {
    anh.push({ loai: 'matChu', khoa: 'M:' + a.maAnh, maAnh: a.maAnh, duongDan: a.duongDan,
               tenCay: a.tenCay, ghiChu: 'Chủ ' + a.maChu + ' không còn' + (a.chuThich ? ' · ' + a.chuThich : '') });
  }
  for (const f of kqThua.ok ? kqThua.ds : []) {
    anh.push({ loai: 'thua', khoa: 'F:' + f.duongDan, duongDan: f.duongDan, tenCay: f.tenCay,
               ghiChu: 'Tải lên ' + (ngayGio(f.taoLuc) || '') + ' · không bản ghi nào trỏ tới' });
  }

  const loiMayChu = [kqCay, kqNgoai, kqMatChu, kqThua].filter((k) => !k.ok).map((k) => k.loi);
  const loi = [...new Set(loiMayChu)].concat(loiCay);
  tt.textContent = 'Quét lúc ' + stampNow() + ' · ' + cacCay.length + ' gia phả · ' +
    nguoi.length + ' người · ' + cap.length + ' gia đình · ' + anh.length + ' ảnh mồ côi' +
    (loi.length ? ' · ⚠ ' + loi.join(' · ') : '');
  nut.disabled = false;
  nut.textContent = 'Quét lại';

  const quetLai = () => quet(sec, phien, bang);
  bang.nguoi.dat(nguoi, 'Không có người mồ côi.', veDongNguoi);
  bang.cap.dat(cap, 'Không có gia đình mồ côi.', veDongCap);
  bang.anh.dat(anh, 'Không có ảnh mồ côi.', veDongAnh);

  const bRac = sec.querySelector('#btn-mc-nguoi-rac');
  const bXoaNguoi = sec.querySelector('#btn-mc-nguoi-xoa');
  bang.nguoi.khiChon = (ds) => {
    const trong = ds.filter((r) => r.loai === 'cay'), ngoai = ds.filter((r) => r.loai === 'ngoai');
    bRac.textContent = 'Cho vào thùng rác (' + trong.length + ')'; bRac.disabled = !trong.length;
    bXoaNguoi.textContent = 'Xoá vĩnh viễn (' + ngoai.length + ')'; bXoaNguoi.disabled = !ngoai.length;
  };
  bang.nguoi.khiChon([]);
  bRac.onclick = () => hoiChoVaoThungRac(bang.nguoi.daChon().filter((r) => r.loai === 'cay'),
    phien, () => { veKhuNguoiDaXoa(sec, phien); quetLai(); });
  bXoaNguoi.onclick = () => hoiXoaHeThong(bang.nguoi.daChon().filter((r) => r.loai === 'ngoai'), [], [], quetLai);

  const bCap = sec.querySelector('#btn-mc-cap-xoa');
  bang.cap.khiChon = (ds) => { bCap.textContent = 'Xoá vĩnh viễn (' + ds.length + ')'; bCap.disabled = !ds.length; };
  bang.cap.khiChon([]);
  bCap.onclick = () => hoiXoaCap(bang.cap.daChon(), quetLai);

  const bAnh = sec.querySelector('#btn-mc-anh-xoa');
  bang.anh.khiChon = (ds) => { bAnh.textContent = 'Xoá vĩnh viễn (' + ds.length + ')'; bAnh.disabled = !ds.length; };
  bang.anh.khiChon([]);
  bAnh.onclick = () => {
    const ds = bang.anh.daChon();
    hoiXoaHeThong([], ds.filter((r) => r.loai === 'matChu'), ds.filter((r) => r.loai === 'thua'), quetLai);
  };
}

function taoBang(sec, ten, soCot, chuTrong) {
  const tb = sec.querySelector('#mc-' + ten + '-tbody');
  const chonHet = sec.querySelector('#mc-' + ten + '-chon-het');
  const khoa = (r) => r.khoa || ((r.treeId || '-') + '|' + (r.maNguoi || r.maCap));
  const chon = new Set();
  const b = { ds: [], khiChon: () => {} };
  b.daChon = () => b.ds.filter((r) => chon.has(khoa(r)));

  function ve(chuRong, veDong) {
    chonHet.checked = false;
    if (!b.ds.length) { dongTrong(tb, soCot, chuRong); b.khiChon([]); return; }
    tb.innerHTML = '';
    for (const r of b.ds) {
      const o = document.createElement('input');
      o.type = 'checkbox';
      o.disabled = r.khoaChon === true;
      if (r.khoaChon) o.title = r.lyDoKhoa || '';
      o.setAttribute('aria-label', 'Chọn ' + (r.ten || r.maCap || r.duongDan));
      o.checked = chon.has(khoa(r));
      o.addEventListener('change', () => {
        if (o.checked) chon.add(khoa(r)); else chon.delete(khoa(r));
        b.khiChon(b.daChon());
      });
      const tr = document.createElement('tr');
      tr.append(td(o), ...veDong(r));
      tb.append(tr);
    }
    b.khiChon(b.daChon());
  }

  b.dat = (ds, chuRong, veDong) => {
    b.ds = ds; chon.clear();
    if (!veDong) { dongTrong(tb, soCot, chuRong); return; }
    ve(chuRong, veDong);
    chonHet.onchange = () => {
      for (const r of b.ds) if (!r.khoaChon) { if (chonHet.checked) chon.add(khoa(r)); else chon.delete(khoa(r)); }
      ve(chuRong, veDong);
      chonHet.checked = b.ds.some((r) => !r.khoaChon) && b.ds.every((r) => r.khoaChon || chon.has(khoa(r)));
    };
  };
  dongTrong(tb, soCot, chuTrong);
  return b;
}

function veDongNguoi(r) {
  const tinhTrang = r.loai === 'cay' ? 'Chưa nối với ai trong cây'
    : 'Không thuộc cây nào' + (r.daXoa ? ' · đã mang cờ xoá' : '') + (r.khoaChon ? ' · ' + r.lyDoKhoa : '');
  return [td(span('', r.ten)), td(span('sub', r.maNguoi)),
    td(r.tenCay ? span('', r.tenCay) : span('sub', '—')),
    td([r.namSinh, r.namMat].filter(Boolean).join(' – ')), td(span('sub', tinhTrang))];
}

function veDongCap(r) {
  return [td(span('', r.maCap)), td(r.nguoi ? span('', r.nguoi) : span('sub', 'không còn ai')),
    td(span('', r.tenCay)), td(span('sub', r.lyDo))];
}

function veDongAnh(r) {
  const img = document.createElement('img');
  img.className = 'mc-anh';
  img.alt = '';
  img.loading = 'lazy';
  duongDanAnh(r.duongDan).then((u) => { if (u) img.src = u; });
  return [td(img), td(span('', r.loai === 'matChu' ? 'Ảnh mất chủ' : 'File thừa trong kho')),
    td(span('sub', r.duongDan)), td(r.tenCay ? span('', r.tenCay) : span('sub', '—')),
    td(span('sub', r.ghiChu))];
}

function keTen(ds, lay) {
  return ds.slice(0, 4).map(lay).join(', ') + (ds.length > 4 ? ' và ' + (ds.length - 4) + ' nữa' : '');
}

async function hoiChoVaoThungRac(ds, phien, xong) {
  if (!ds.length) return;
  const nhom = theoCay(ds);
  const gn = { boi: (phien && phien.email) || '', luc: stampNow() };
  const kq = await hoi({
    tua: 'Cho ' + ds.length + ' người vào thùng rác',
    chu: keTen(ds, (r) => r.ten) + '. Người mồ côi thường là người thật vừa thêm mà quên nối — ' +
         'họ vào thùng rác, KHÔNG mất hẳn: khôi phục được ở tab Thùng rác → Người đã xoá.',
    nutOk: 'Cho vào thùng rác', kieuOk: 'warm',
    lam: () => chayTheoCay(nhom, (cay, ma) => {
      let t = cay;
      for (const id of ma) { const r = softDeletePerson(t, id, gn); if (r) t = r.tree; }
      cay.persons = t.persons;
    }, (ma, ten) => ({ action: 'delete', target: ma.length === 1 ? ma[0] : '',
      note: 'Quản trị hệ thống — dữ liệu mồ côi: cho ' + ma.length + ' người chưa nối với ai vào thùng rác (' + ten + ').' })),
  });
  if (kq) { baoKetQua('Đã cho vào thùng rác', kq.kq); xong(); }
}

async function hoiXoaCap(ds, xong) {
  if (!ds.length) return;
  const nhom = theoCay(ds, (r) => r.maCap);
  const kq = await hoi({
    tua: 'Xoá vĩnh viễn ' + ds.length + ' gia đình mồ côi',
    chu: keTen(ds, (r) => r.maCap) + '. Các cặp này không còn khẳng định điều gì — xoá đi không mất ' +
         'mối nối nào. Ảnh gắn riêng cho cặp (nếu có) bị xoá theo. KHÔNG hoàn tác được từ trong app.',
    nutOk: 'Xoá vĩnh viễn', kieuOk: 'danger',
    lam: () => chayTheoCay(nhom, (cay, ma, sauLuu) => {
      let t = cay;
      for (const id of ma) { const r = softDeleteUnion(t, id); if (r) t = r.tree; }
      const k = applyPurge(t, ma);
      if (!k) throw new Error('Các cặp vừa chọn không còn — có thể người khác vừa sửa. Quét lại.');
      cay.persons = k.tree.persons; cay.unions = k.tree.unions; cay.media = k.tree.media;
      sauLuu.fileIds = k.ke.fileIds;
    }, (ma, ten) => ({ action: 'purge', target: '',
      note: 'Quản trị hệ thống — dữ liệu mồ côi: xoá vĩnh viễn ' + ma.length + ' cặp thừa (' + ten + ').' }),
    true, 'cặp'),
  });
  if (kq) { baoKetQua('Đã xoá gia đình mồ côi', kq.kq); xong(); }
}

async function hoiXoaHeThong(nguoi, matChu, thua, xong) {
  const tong = nguoi.length + matChu.length + thua.length;
  if (!tong) return;
  const phan = [];
  if (nguoi.length) phan.push(nguoi.length + ' người không thuộc cây nào (' + keTen(nguoi, (r) => r.ten) + ') cùng ảnh của họ');
  if (matChu.length) phan.push(matChu.length + ' ảnh mất chủ');
  if (thua.length) phan.push(thua.length + ' file thừa trong kho');
  const kq = await hoi({
    tua: 'Xoá vĩnh viễn',
    chu: 'Xoá hẳn ' + phan.join(', ') + '. Máy chủ kiểm lại từng mục — mục nào vừa có lại chủ ' +
         'thì bỏ qua. KHÔNG hoàn tác được; đường lùi là bản sao lưu đêm gần nhất.',
    nutOk: 'Xoá vĩnh viễn', kieuOk: 'danger',
    lam: async () => {
      let kqMc = { ok: true, nguoi: [], anh: [], file: [], boQua: [] };
      if (nguoi.length || matChu.length) {
        kqMc = await donMoCoiHeThong(nguoi.map((r) => r.maNguoi), matChu.map((r) => r.maAnh));
        if (!kqMc.ok) return kqMc;
      }
      const file = [...new Set(kqMc.file.concat(thua.map((r) => r.duongDan)))];
      const a = file.length ? await xoaAnhThat(file) : { soXoa: 0, soHong: 0 };
      return { ok: true, ...kqMc, soXoa: (a && a.soXoa) || 0, soHong: (a && a.soHong) || 0 };
    },
  });
  if (!kq) return;
  const r = kq.kq;
  const cau = [];
  if (r.nguoi.length) cau.push('Đã xoá ' + r.nguoi.length + ' người.');
  if ((r.honNhan || []).length) cau.push('Đã xoá ' + r.honNhan.length + ' cặp không còn ai thuộc cây nào.');
  if (r.anh.length) cau.push('Đã xoá ' + r.anh.length + ' bản ghi ảnh.');
  if (r.soXoa) cau.push(r.soXoa + ' file đã xoá khỏi kho.');
  if (r.soHong) cau.push(r.soHong + ' file không xoá được (còn bản ghi trỏ tới, hoặc máy chủ chưa dán luoc-do/61, hoặc file đã mất từ trước).');
  if (r.boQua.length) cau.push('Bỏ qua ' + r.boQua.length + ' mục không còn là mồ côi: ' + r.boQua.join(', ') + '.');
  bao('Đã dọn', cau.join(' ') || 'Không có gì để xoá.');
  xong();
}
