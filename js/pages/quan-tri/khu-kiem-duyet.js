import {
  layDanhSachGiaPha, coTheKiemDuyet, dsKiemDuyet, duyetThayDoi, tuChoiThayDoi,
  chiTietKiemDuyet,
} from '../../services/sb.js';
import { bangPhang } from '../../domains/so-sanh.js';
import { duongDan } from './trang-chi-tiet.js';
import { hoi, bao } from './hop-thoai.js';
import {
  td, span, tenVaPhu, huyHieu, datHuyHieu, nut, nutLink, hangNut, dongTrong, ngayGio, chepKieu,
} from './o-bang.js';

const TRANG_THAI = ['cho', 'duyet', 'tu_choi'];
const TBODY = { cho: 'kd-table-cho', duyet: 'kd-table-duyet', tu_choi: 'kd-table-tuchoi' };
const DEM = { cho: 'kd-count-cho', duyet: 'kd-count-duyet', tu_choi: 'kd-count-tuchoi' };
const SO_COT = { cho: 7, duyet: 6, tu_choi: 6 };

let tabDangMo = 'cho';
const daChon = new Map();

export async function mountKhuKiemDuyet(sec) {
  const $ = (id) => sec.querySelector('#' + id);
  ganTab(sec);
  for (const tt of TRANG_THAI) { dongTrong($(TBODY[tt]), SO_COT[tt], 'Đang đọc hàng chờ…'); $(DEM[tt]).textContent = ''; }
  daChon.clear();
  $('kd-hang-loat').hidden = true;
  for (const id of ['stat-tree-count', 'stat-tree-desc', 'stat-author-count', 'stat-author-desc',
    'stat-pending-count', 'kd-filter-summary', 'kd-pane-cho-sub']) $(id).textContent = '';

  const hashLuc = window.location.hash;
  const kq = await napHet();
  if (window.location.hash !== hashLuc) return;

  const napLai = () => mountKhuKiemDuyet(sec);
  if (kq.loi) { for (const tt of TRANG_THAI) dongTrong($(TBODY[tt]), SO_COT[tt], kq.loi, napLai); return; }
  if (!kq.dsCay.length) {
    for (const tt of TRANG_THAI) {
      dongTrong($(TBODY[tt]), SO_COT[tt], 'Bạn không kiểm duyệt gia phả nào — chủ gia phả, Quản trị gia ' +
        'phả và Quản trị hệ thống mới duyệt được nội dung.');
    }
    veThongKe(sec, []);
    return;
  }

  const selCay = $('kd-filter-tree');
  const selNguoi = $('kd-filter-author');
  const cuCay = selCay.value;
  const cuNguoi = selNguoi.value;
  datLuaChon(selCay, [['all', 'Tất cả các cây (' + kq.dsCay.length + ' cây)'],
    ...kq.dsCay.map((c) => [c.fileId, (c.ten || c.treeCode) + ' (' + c.treeCode + ')'])], cuCay);
  const nguoi = [...new Set(kq.ds.map((d) => d.by_email).filter(Boolean))];
  datLuaChon(selNguoi, [['all', 'Tất cả người sửa (' + nguoi.length + ' người)'],
    ...nguoi.map((e) => [e, e])], cuNguoi);

  const ve = () => veBang(sec, kq, napLai);
  selCay.onchange = ve;
  selNguoi.onchange = ve;
  $('kd-filter-reset').onclick = () => { selCay.value = 'all'; selNguoi.value = 'all'; ve(); };
  ve();
}

async function napHet() {
  const kq = await layDanhSachGiaPha();
  if (!kq.ok) return { loi: kq.loi || 'Không đọc được danh sách gia phả.' };
  const cayXem = kq.ds.filter((c) => !c.daXoaLuc && c.coTheXem);
  const duoc = await Promise.all(cayXem.map((c) => coTheKiemDuyet(c.fileId)));
  const dsCay = cayXem.filter((c, i) => duoc[i]);
  const hang = await Promise.all(dsCay.flatMap((c) => TRANG_THAI.map((tt) =>
    dsKiemDuyet(c.fileId, tt).then((ds) => ds.map((d) => ({ ...d, cay: c }))))));
  return { dsCay, ds: hang.flat() };
}

function datLuaChon(sel, ds, giuLai) {
  sel.innerHTML = '';
  for (const [giaTri, chu] of ds) {
    const op = document.createElement('option');
    op.value = giaTri;
    op.textContent = chu;
    sel.append(op);
  }
  sel.value = ds.some(([g]) => g === giuLai) ? giuLai : 'all';
}

function ganTab(sec) {
  const to = () => {
    for (const b of sec.querySelectorAll('[data-kd-tab]')) b.classList.toggle('active', b.dataset.kdTab === tabDangMo);
    for (const p of sec.querySelectorAll('[data-kd-pane]')) p.hidden = p.dataset.kdPane !== tabDangMo;
  };
  for (const b of sec.querySelectorAll('[data-kd-tab]')) b.onclick = () => { tabDangMo = b.dataset.kdTab; to(); };
  to();
}

function veThongKe(sec, cho) {
  const $ = (id) => sec.querySelector('#' + id);
  const cay = [...new Map(cho.map((d) => [d.cay.fileId, d.cay.ten || d.cay.treeCode])).values()];
  const nguoi = [...new Set(cho.map((d) => d.by_email).filter(Boolean))];
  $('stat-tree-count').textContent = cay.length + ' cây';
  $('stat-tree-desc').textContent = cay.length ? cay.join(' · ') : 'Không có cây nào cần duyệt';
  $('stat-author-count').textContent = nguoi.length + ' người';
  $('stat-author-desc').textContent = nguoi.length ? nguoi.join(', ') : 'Không có người gửi';
  $('stat-pending-count').textContent = cho.length + ' lần Lưu';
}

function veBang(sec, kq, napLai) {
  const $ = (id) => sec.querySelector('#' + id);
  const locCay = $('kd-filter-tree').value;
  const locNguoi = $('kd-filter-author').value;
  const khop = (d) => (locCay === 'all' || d.cay.fileId === locCay) &&
    (locNguoi === 'all' || d.by_email === locNguoi);

  const theo = {};
  for (const tt of TRANG_THAI) {
    theo[tt] = kq.ds.filter((d) => d.trang_thai === tt);
    $(DEM[tt]).textContent = String(theo[tt].length);
  }
  veThongKe(sec, theo.cho);

  const choLoc = theo.cho.filter(khop);
  const tomTat = $('kd-filter-summary');
  tomTat.textContent = 'Đang hiển thị ';
  const so = document.createElement('strong');
  so.textContent = choLoc.length + ' / ' + theo.cho.length;
  tomTat.append(so, ' lần Lưu');
  $('kd-pane-cho-sub').textContent = choLoc.length + ' lần Lưu cần xử lý';

  const tbCho = $(TBODY.cho);
  if (!theo.cho.length) dongTrong(tbCho, SO_COT.cho, 'Không có gì đang chờ duyệt.');
  else if (!choLoc.length) {
    const o = dongTrong(tbCho, SO_COT.cho, 'Không có thay đổi nào khớp với bộ lọc đã chọn. ');
    o.append(nutLink('Đặt lại bộ lọc', () => $('kd-filter-reset').click()));
  } else {
    tbCho.innerHTML = '';
    for (const d of choLoc) tbCho.append(dongCho(d, napLai));
  }
  ganHangLoat(sec, choLoc, napLai);

  for (const tt of ['duyet', 'tu_choi']) {
    const tb = $(TBODY[tt]);
    const ds = theo[tt].filter(khop);
    if (!ds.length) { dongTrong(tb, 6, 'Chưa có mục nào trong danh sách này.'); continue; }
    tb.innerHTML = '';
    for (const d of ds) tb.append(dongLichSu(d));
  }
}

function oCay(d) {
  return td(tenVaPhu(d.cay.ten || d.cay.treeCode, d.cay.treeCode));
}

function dongCho(d, napLai) {
  const bXem = nut('Xem trước / sau', 'warm');
  bXem.addEventListener('click', () => {
    window.location.hash = duongDan('kiem-duyet', 'lan-luu', d.cay.treeCode + '-' + d.id);
  });
  const bDuyet = nut('Duyệt');
  bDuyet.addEventListener('click', () => hoiDuyet(d, napLai));
  const bTuChoi = nut('Từ chối', 'danger');
  bTuChoi.addEventListener('click', () => hoiTuChoi(d, napLai));

  const tich = document.createElement('input');
  tich.type = 'checkbox';
  tich.setAttribute('aria-label', 'Chọn lần Lưu #' + d.id);
  const oTich = td(tich);
  oTich.className = 'kd-chon';

  const dung = dungVao(d);
  const tr = document.createElement('tr');
  tr.append(oTich, oCay(d), td(span('sub', ngayGio(d.ts))), td(span('name', d.by_email || '')),
    td(span('name', viecGi(d))), td(dung ? huyHieu(dung) : ''), td(hangNut(bXem, bDuyet, bTuChoi)));
  return tr;
}

function dongLichSu(d) {
  const tr = document.createElement('tr');
  const oCuoi = d.trang_thai === 'tu_choi'
    ? td(d.ly_do_tu_choi || '')
    : td(d.duyet_luc ? span('sub', ngayGio(d.duyet_luc)) : '');
  tr.append(oCay(d), td(span('sub', ngayGio(d.ts))), td(span('name', d.by_email || '')),
    td(viecGi(d)), td(d.duyet_boi ? span('name', d.duyet_boi) : ''), oCuoi);
  return tr;
}

async function hoiDuyet(d, sauKhiXong) {
  const kq = await hoi({
    tua: 'Duyệt thay đổi',
    chu: 'Xác nhận phê duyệt lần lưu “' + viecGi(d) + '” của ' + (d.by_email || 'người sửa') +
      ' (' + (d.cay.ten || d.cay.treeCode) + ' · ' + d.cay.treeCode + ') và đưa vào gia phả chính thức?',
    nutOk: 'Duyệt chính thức', nutHuy: 'Hủy',
    lam: () => duyetThayDoi(d.cay.fileId, d.id),
  });
  if (kq) sauKhiXong();
}

async function hoiTuChoi(d, sauKhiXong) {
  const kq = await hoi({
    tua: 'Từ chối và hoàn tác lần lưu #' + d.id,
    chu: 'Bạn đang từ chối lần sửa “' + viecGi(d) + '” thuộc cây ' + (d.cay.ten || d.cay.treeCode) +
      '. Hệ thống sẽ hoàn tác dữ liệu về trạng thái cũ. Nếu có ai đã sửa tiếp lên cùng dữ liệu, ' +
      'máy chủ sẽ từ chối và nói rõ.',
    oNhap: { nhieuDong: true, goiY: 'Lý do từ chối (tùy chọn nhưng khuyến nghị điền rõ cho người sửa)...' },
    nutOk: 'Xác nhận từ chối & hoàn tác', nutHuy: 'Hủy', kieuOk: 'danger',
    lam: (lyDo) => tuChoiThayDoi(d.cay.fileId, d.id, lyDo),
  });
  if (kq) sauKhiXong();
}

const khoaDong = (d) => d.cay.fileId + ':' + d.id;

function ganHangLoat(sec, choLoc, napLai) {
  const $ = (id) => sec.querySelector('#' + id);
  daChon.clear();
  $('kd-hang-loat').hidden = !choLoc.length;
  const het = $('kd-chon-het');
  het.checked = false;
  het.indeterminate = false;
  het.disabled = !choLoc.length;
  const oTich = [...$(TBODY.cho).querySelectorAll('td.kd-chon input')];

  const capNhat = () => {
    const n = daChon.size;
    het.checked = n > 0 && n === choLoc.length;
    het.indeterminate = n > 0 && n < choLoc.length;
    $('kd-da-chon').textContent = n
      ? 'Đã chọn ' + n + ' / ' + choLoc.length + ' lần Lưu'
      : 'Tích ô đầu dòng để duyệt hoặc từ chối nhiều lần Lưu cùng lúc';
    $('kd-duyet-chon').disabled = !n;
    $('kd-tuchoi-chon').disabled = !n;
  };
  oTich.forEach((o, i) => {
    const d = choLoc[i];
    o.onchange = () => {
      if (o.checked) daChon.set(khoaDong(d), d); else daChon.delete(khoaDong(d));
      capNhat();
    };
  });
  het.onchange = () => {
    oTich.forEach((o, i) => {
      o.checked = het.checked;
      if (het.checked) daChon.set(khoaDong(choLoc[i]), choLoc[i]);
    });
    if (!het.checked) daChon.clear();
    capNhat();
  };
  $('kd-duyet-chon').onclick = () => hoiNhieu('duyet', [...daChon.values()], napLai);
  $('kd-tuchoi-chon').onclick = () => hoiNhieu('tu_choi', [...daChon.values()], napLai);
  capNhat();
}

function theoCay(ds) {
  const dem = new Map();
  for (const d of ds) {
    const ten = d.cay.ten || d.cay.treeCode;
    dem.set(ten, (dem.get(ten) || 0) + 1);
  }
  return [...dem].map(([ten, n]) => ten + ' (' + n + ')').join(' · ');
}

async function hoiNhieu(viec, ds, sauKhiXong) {
  if (!ds.length) return;
  const duyet = viec === 'duyet';
  const kq = await hoi(duyet ? {
    tua: 'Duyệt ' + ds.length + ' lần Lưu',
    chu: 'Xác nhận phê duyệt ' + ds.length + ' lần Lưu đã chọn và đưa vào gia phả chính thức?\n' +
      'Gia phả: ' + theoCay(ds),
    nutOk: 'Duyệt chính thức', nutHuy: 'Hủy',
    lam: () => chayNhieu(viec, ds, ''),
  } : {
    tua: 'Từ chối và hoàn tác ' + ds.length + ' lần Lưu',
    chu: 'Bạn đang từ chối ' + ds.length + ' lần Lưu đã chọn. Hệ thống hoàn tác từng lần, mới ' +
      'trước cũ sau. Lần nào đã có người sửa tiếp lên cùng dữ liệu thì máy chủ từ chối và ' +
      'nói rõ — các lần khác vẫn được xử lý.\nGia phả: ' + theoCay(ds),
    oNhap: { nhieuDong: true, goiY: 'Lý do từ chối — ghi chung cho mọi lần Lưu đã chọn (tùy chọn nhưng khuyến nghị)...' },
    nutOk: 'Xác nhận từ chối & hoàn tác', nutHuy: 'Hủy', kieuOk: 'danger',
    lam: (lyDo) => chayNhieu(viec, ds, lyDo),
  });
  if (!kq) return;
  const { xong, hong } = kq.kq;
  await bao(duyet ? 'Kết quả duyệt' : 'Kết quả từ chối',
    (duyet ? 'Đã duyệt ' : 'Đã từ chối và hoàn tác ') + xong + ' / ' + ds.length + ' lần Lưu.' +
    (hong.length ? '\nMáy chủ không nhận ' + hong.length + ' lần:' + theoLyDo(hong) : ''));
  sauKhiXong();
}

function theoLyDo(hong) {
  const nhom = new Map();
  for (const h of hong) {
    if (!nhom.has(h.loi)) nhom.set(h.loi, []);
    nhom.get(h.loi).push('#' + h.d.id + ' (' + (h.d.cay.ten || h.d.cay.treeCode) + ')');
  }
  return [...nhom].map(([loi, ma]) => '\n\n· ' + ma.join(' · ') + '\n' + loi).join('');
}

async function chayNhieu(viec, ds, lyDo) {
  const thuTu = [...ds].sort((a, b) => (viec === 'tu_choi' ? Number(b.id) - Number(a.id)
    : Number(a.id) - Number(b.id)));
  let xong = 0;
  const hong = [];
  for (const d of thuTu) {
    let r;
    try {
      r = viec === 'duyet' ? await duyetThayDoi(d.cay.fileId, d.id)
        : await tuChoiThayDoi(d.cay.fileId, d.id, lyDo);
    } catch (e) { r = { ok: false, loi: (e && e.message) || 'Lỗi không rõ.' }; }
    if (r && r.ok) xong++;
    else hong.push({ d, loi: (r && (r.loi || r.lyDo)) || 'Máy chủ từ chối.' });
  }
  return { ok: true, xong, hong };
}

export async function mountChiTietKiemDuyet(sec, ctx) {
  const $ = (id) => sec.querySelector('#' + id);
  const tb = $('kd-diff-tbody');
  const banner = $('kd-conflict-banner');
  const bDuyet = $('kd-btn-duyet');
  const bTuChoi = $('kd-btn-tuchoi');
  $('kd-detail-title').textContent = 'Đang mở lần Lưu…';
  $('kd-detail-meta').textContent = '';
  $('kd-detail-badge').hidden = true;
  banner.style.display = 'none';
  bDuyet.disabled = true;
  bTuChoi.disabled = true;
  bDuyet.title = '';
  bTuChoi.title = '';
  dongTrong(tb, 5, 'Đang đọc…');

  const hashLuc = window.location.hash;
  const vach = ctx.thamSo.lastIndexOf('-');
  const ma = ctx.thamSo.slice(0, vach);
  const id = Number(ctx.thamSo.slice(vach + 1));

  const kq = await layDanhSachGiaPha();
  if (window.location.hash !== hashLuc) return;
  const cay = kq.ok && vach > 0 && Number.isInteger(id) ? kq.ds.find((c) => c.treeCode === ma) : null;
  const khongThay = (chu) => {
    $('kd-detail-title').textContent = 'Không thấy lần Lưu ' + ctx.thamSo;
    $('kd-detail-meta').textContent = chu;
    dongTrong(tb, 5, chu);
  };
  if (!cay) {
    khongThay(kq.ok ? 'Địa chỉ phải có dạng #kiem-duyet/lan-luu/<mã cây>-<số lần Lưu>, và mã cây ' +
      'phải có trong danh sách gia phả của tài khoản này.' : (kq.loi || 'Máy chủ không trả lời.'));
    return;
  }

  const [ds, ct] = await Promise.all([dsKiemDuyet(cay.fileId, null), chiTietKiemDuyet(cay.fileId, id)]);
  if (window.location.hash !== hashLuc) return;
  const dong = ds.find((x) => Number(x.id) === id);
  if (!dong) {
    khongThay('Gia phả ' + (cay.ten || cay.treeCode) + ' không có lần Lưu #' + id +
      ', hoặc tài khoản này không kiểm duyệt được cây ấy.');
    return;
  }
  const d = { ...dong, cay };

  $('kd-detail-title').textContent = viecGi(d);
  $('kd-detail-meta').textContent = [d.by_email, 'Gia phả: ' + (cay.ten || '') + ' · ' + cay.treeCode,
    'Lưu lúc ' + ngayGio(d.ts), 'Lần lưu #' + id].filter(Boolean).join(' · ');
  const huy = $('kd-detail-badge');
  huy.hidden = false;
  if (d.trang_thai === 'cho') datHuyHieu(huy, 'Đang chờ duyệt', 'wait');
  else if (d.trang_thai === 'duyet') datHuyHieu(huy, 'Đã nhận chính thức');
  else datHuyHieu(huy, 'Đã từ chối & hoàn tác', 'red');

  if (!ct || !ct.ok) {
    dongTrong(tb, 5, (ct && ct.loi) || 'Không tải được chi tiết.');
  } else {
    const hang = bangPhang(ct.banGhi);
    if (!hang.length) {
      dongTrong(tb, 5, 'Không có bảng đối chiếu chi tiết cho lần lưu này (không ô nào còn khác nhau, ' +
        'hoặc lần Lưu quá cũ không có ảnh chụp để so).');
    } else {
      tb.innerHTML = '';
      for (const r of hang) {
        const loai = chepKieu(span('sub', r.nhanLoai), 'font-weight:700');
        const truong = document.createElement('strong');
        truong.textContent = r.truong;
        const tr = document.createElement('tr');
        tr.append(td(loai), td(span('name', r.nguoi)), td(truong),
          td(span('diff-old', r.truoc)), td(span('diff-new', r.sau)));
        tb.append(tr);
      }
    }
  }

  const biKhoa     = ct && ct.ok && ct.biKhoa;
  const lechSo     = ct && ct.ok && ct.lechSo;
  const truocDoiMa = Boolean(ct && ct.ok && ct.truocDoiMa);
  const canChan    = Boolean(biKhoa) || Boolean(lechSo) || truocDoiMa;

  let coChan = '';
  if (biKhoa) {
    coChan = (biKhoa.byEmail || 'Người khác') + ' đã sửa tiếp lên dữ liệu ' +
      'này lúc ' + ngayGio(biKhoa.ts) + '. Nút "Từ chối và hoàn tác" bị khóa để tránh xóa mất công ' +
      'của người sau. Hãy xử lý thay đổi mới hơn trước, hoặc sửa tay trực tiếp trên sơ đồ.';
  } else if (lechSo) {
    coChan = 'Bản ghi ' + String(lechSo).slice(2) + ' đã được sửa tiếp sau lần Lưu này, ' +
      'có thể từ một gia phả khác cùng chứa nó. Hoàn tác bây giờ là xóa mất công của ' +
      'người sau, nên nút "Từ chối và hoàn tác" bị khóa. Sửa tay trực tiếp trên sơ đồ nếu cần.';
  } else if (truocDoiMa) {
    coChan = 'Lần Lưu này có từ trước khi phần mềm đổi sang mã người dùng chung, nên ảnh ' +
      'chụp dữ liệu cũ của nó mang mã cũ — hoàn tác tự động có thể dán lên người khác. ' +
      'Nút "Từ chối và hoàn tác" bị khóa. Sửa tay trực tiếp trên sơ đồ nếu cần.';
  }
  if (coChan) {
    banner.style.display = 'block';
    $('kd-conflict-text').textContent = coChan;
  }

  const laCho = d.trang_thai === 'cho';
  const daXong = 'Lần Lưu này đã được xử lý.';
  bDuyet.disabled = !laCho;
  bDuyet.title = laCho ? '' : daXong;
  bTuChoi.disabled = !laCho || canChan;
  bTuChoi.title = !laCho ? daXong : canChan ? 'Không hoàn tác được — xem lời cảnh báo ở trên.' : '';
  const veKhu = () => { window.location.hash = 'kiem-duyet'; };
  bDuyet.onclick = () => hoiDuyet(d, veKhu);
  bTuChoi.onclick = () => hoiTuChoi(d, veKhu);
}

function viecGi(d) {
  const n = String(d.note || '').trim();
  if (n) return n;
  return [d.action, d.target].filter(Boolean).join(' ') || '(không ghi chú)';
}

function dungVao(d) {
  const phan = [];
  if (d.so_nguoi)   phan.push(d.so_nguoi + ' người');
  if (d.so_honnhan) phan.push(d.so_honnhan + ' cặp');
  if (d.so_quanhe)  phan.push(d.so_quanhe + ' quan hệ');
  return phan.join(' · ');
}
