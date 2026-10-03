import {
  demDuLieu, dsNhatKyHeThong, xemTruocKhoiPhuc, khoiPhucBanSao,
  coMaySaoLuu, dsBanSaoLuuDrive, taiBanSaoLuuDrive, khoiPhucAnhDrive, saoLuuNgayDrive,
} from '../../services/sb.js';
import { td, span, huyHieu, datHuyHieu, dongTrong, ngayGio } from './o-bang.js';
import { hoi, bao } from './hop-thoai.js';

const KET_QUA = {
  sao_luu_dem: ['Đạt', ''],
  sao_luu_canh_bao: ['Đã ghi — có cảnh báo', 'wait'],
  sao_luu_hong: ['HỎNG', 'red'],
};

function kichCo(n) {
  if (typeof n !== 'number') return '';
  if (n < 1024) return n + ' byte';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

function cauAnh(c) {
  const d = c.dem || {};
  if (typeof d.anh_chua_chep !== 'number') return '';
  return d.anh_chua_chep
    ? 'Ảnh: còn ' + d.anh_chua_chep + ' tấm chưa chép sang Drive'
    : 'Ảnh: đủ trên Drive' + (typeof d.anh === 'number' ? ' (' + d.anh + ' tấm)' : '');
}

function cauPhu(c) {
  const chu = c.loi || c.thieu || c.canh_bao || '';
  return chu.length > 180 ? chu.slice(0, 180) + '…' : chu;
}

export async function veLichSuSaoLuu(sec) {
  const tb = sec.querySelector('#sl-lich-su-tbody');
  const lanGan = sec.querySelector('#sl-lan-gan');
  dongTrong(tb, 5, 'Đang đọc…');
  const kq = await dsNhatKyHeThong({ loai: 'backup', gioiHan: 300 });
  const ds = kq.ok ? kq.ds.filter((d) => KET_QUA[d.suKien]).slice(0, 30) : [];
  veTheTongQuan(sec, kq, ds[0]);

  if (!kq.ok) { lanGan.hidden = true; dongTrong(tb, 5, kq.loi || 'Không đọc được nhật ký.'); return; }
  if (!ds.length) {
    lanGan.hidden = true;
    dongTrong(tb, 5, 'Chưa có lần sao lưu nào báo về. Cần dán luoc-do/49 và chép SaoLuu.gs 0.6.0 ' +
      'vào dự án Apps Script sao lưu; trước đó xem tại script.google.com → Executions.');
    return;
  }
  const [chuGan, kieuGan] = KET_QUA[ds[0].suKien];
  datHuyHieu(lanGan, 'Gần nhất: ' + ngayGio(ds[0].luc) + ' · ' + chuGan, kieuGan);
  lanGan.hidden = false;

  tb.innerHTML = '';
  for (const d of ds) {
    const c = d.chiTiet || {};
    const [chu, kieu] = KET_QUA[d.suKien];
    const phu = cauPhu(c);
    const tr = document.createElement('tr');
    tr.append(
      td(span('name', ngayGio(d.luc))),
      td(huyHieu(chu, kieu), phu ? span('sub', phu) : ''),
      td(span('sub', d.doiTuong)),
      td(span('sub', kichCo(c.so_byte)), cauAnh(c) ? span('sub', cauAnh(c)) : ''),
      td(),
    );
    tb.append(tr);
  }
}

function veTheTongQuan(sec, kq, gan) {
  const dat = (id, chu) => { const el = sec.querySelector('#' + id); if (el) el.textContent = chu; };
  if (!kq.ok || !gan) {
    dat('tq-sl-luc', 'Chưa có');
    dat('tq-sl-mo-ta', !kq.ok ? (kq.loi || 'Không đọc được nhật ký.')
      : 'Máy sao lưu đêm chưa báo lần nào về nhật ký (cần luoc-do/49 + SaoLuu.gs 0.6.0).');
    return;
  }
  const c = gan.chiTiet || {};
  dat('tq-sl-luc', ngayGio(gan.luc));
  dat('tq-sl-mo-ta', gan.suKien === 'sao_luu_hong'
    ? 'Lần gần nhất HỎNG: ' + cauPhu(c)
    : KET_QUA[gan.suKien][0] + ' · ' + [gan.doiTuong, kichCo(c.so_byte)].filter(Boolean).join(' · ') +
      (gan.suKien === 'sao_luu_canh_bao' ? ' — ' + cauPhu(c) : ''));
}

const BANG_XAC_NHAN = [
  ['trees', 'gia phả'], ['persons', 'người'], ['unions', 'hôn nhân'],
  ['union_children', 'quan hệ cha/mẹ–con'], ['tree_members', 'thành viên'],
  ['change_log', 'lần sửa (nhật ký)'],
];
const CHU_XAC_NHAN = 'KHÔI PHỤC';
const NHAC_ANH = 'Ảnh không nằm trong file sao lưu. Khôi phục xong thì chạy hàm khoiPhucAnh ' +
  'trong dự án Apps Script sao lưu (hướng dẫn: mục "Khôi phục ảnh").';

const NHAC_ANH_WEB = 'Ảnh không nằm trong file sao lưu: đổ dữ liệu xong, bấm "Khôi phục ảnh" ' +
  'để máy sao lưu lấy lại ảnh thiếu từ Drive.';

export function ganNutKhoiPhuc(sec) {
  const nut = sec.querySelector('#btn-khoi-phuc');
  const chon = sec.querySelector('#kp-chon-file');
  if (!nut || !chon) return;
  const moChonFile = () => { chon.value = ''; chon.click(); };

  nut.onclick = async () => {
    if (!coMaySaoLuu()) { moChonFile(); return; }
    const ds = await banRon(nut, 'Đang hỏi máy sao lưu…', dsBanSaoLuuDrive);
    if (!ds.ok || !(ds.ds || []).length) {
      const k = await hoi({
        tua: 'Không lấy được danh sách trên Drive',
        chu: (ds.loi || 'Thư mục sao lưu trên Drive chưa có bản nào.') +
          '\n\nVẫn chọn được file trong máy (ổ Google Drive).',
        nutOk: 'Chọn file trong máy…', kieuOk: 'primary',
      });
      if (k) moChonFile();
      return;
    }
    const kq = await hoi({
      tua: 'Chọn bản sao lưu',
      chu: 'Mọi bản đang có trên Drive (30 bản gần nhất và mỗi tháng một bản), mới nhất trước.',
      truong: [{ ma: 'id', chon: ds.ds.map((f) => [f.id, tenDeDoc(f)]) }],
      nutOk: 'Tiếp', kieuOk: 'warm',
      nutThem: { chu: 'Chọn file trong máy…', lam: null },
      lam: (v) => taiBanSaoLuuDrive(v.id),
    });
    if (!kq) return;
    if (kq.nut === 'them') { moChonFile(); return; }
    await quyTrinh(nut, kq.kq.noiDung);
  };
  chon.onchange = async () => {
    const f = chon.files && chon.files[0];
    if (f) await quyTrinh(nut, await f.text());
  };
}

export function ganNutSaoLuuNgay(sec) {
  const nut = sec.querySelector('#btn-sao-luu-ngay');
  if (!nut || !coMaySaoLuu()) return;
  nut.onclick = async () => {
    const kq = await banRon(nut, 'Đang sao lưu… (1–5 phút)', saoLuuNgayDrive);
    await bao(kq.ok ? 'Đã sao lưu' : 'Sao lưu không chạy được',
              kq.ok ? kq.cau : kq.loi || 'Máy sao lưu không trả lời.');
    veLichSuSaoLuu(sec);
  };
}

function tenDeDoc(f) {
  const m = /(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/.exec(f.ten || '');
  return (m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : f.ten) +
    (typeof f.byte === 'number' ? ' · ' + kichCo(f.byte) : '');
}

async function banRon(nut, chu, viec) {
  const chuNut = nut.textContent;
  nut.disabled = true;
  nut.textContent = chu;
  try { return await viec(); } finally { nut.disabled = false; nut.textContent = chuNut; }
}

async function quyTrinh(nut, noiDung) {
  const xt = await banRon(nut, 'Đang kiểm file…', () => xemTruocKhoiPhuc(noiDung));
  if (!xt.ok) { await bao('Không khôi phục được từ file này', xt.loi); return; }

  const kq = await hoi({
    tua: 'Khôi phục toàn bộ về lúc ' + (xt.taoLucVn || '?') + '?',
    chu: cauXacNhan(xt),
    nutOk: 'Khôi phục', kieuOk: 'danger',
    truong: [{ ma: 'go', nhan: 'Gõ chữ ' + CHU_XAC_NHAN + ' để xác nhận', goiY: CHU_XAC_NHAN }],
    lam: async (v) => {
      const go = String(v.go || '').normalize('NFC').trim().toUpperCase();
      if (go !== CHU_XAC_NHAN.normalize('NFC')) {
        return { ok: false, loi: 'Gõ đúng chữ ' + CHU_XAC_NHAN + ' (có dấu) rồi bấm lại.' };
      }
      return khoiPhucBanSao(noiDung);
    },
  });
  if (!kq) return;

  if (coMaySaoLuu()) {
    let chu = cauKetQua(kq.kq) + '\n\nBước cuối: lấy lại ảnh thiếu từ Drive (có thể mất vài phút).';
    for (;;) {
      const a = await hoi({ tua: 'Khôi phục ảnh', chu, nutOk: 'Khôi phục ảnh', kieuOk: 'warm',
                            nutHuy: 'Để sau', lam: () => khoiPhucAnhDrive() });
      if (!a) break;
      if (!a.kq.conLai) { await bao('Xong', a.kq.cau + '\n\nBấm Đóng để nạp lại trang.'); break; }
      chu = a.kq.cau + '\n\nCòn ảnh chưa tải vì hết giờ một lượt — bấm tiếp.';
    }
  } else {
    await bao('Đã khôi phục', cauKetQua(kq.kq) + '\n\n' + NHAC_ANH + '\n\nBấm Đóng để nạp lại trang.');
  }
  window.location.reload();
}

function cauXacNhan(xt) {
  const dong = BANG_XAC_NHAN.map(([ma, ten]) =>
    '· ' + ten + ': trong file ' + (xt.dem[ma] ?? '?') + ' · hiện nay ' + (xt.demHienTai[ma] ?? '?'));
  return 'File: ' + xt.tenFile + '\n' + dong.join('\n') + '\n\n' +
    '⚠ Mọi gia phả, mọi tài khoản sẽ quay về đúng lúc chụp. Mọi thay đổi SAU lúc ấy sẽ MẤT ' +
    'và không lấy lại được bằng nút nào. Hỏng giữa chừng thì không gì bị đổi.\n\n' +
    (coMaySaoLuu() ? NHAC_ANH_WEB : NHAC_ANH);
}

function cauKetQua(kq) {
  const bc = (kq && kq.baoCao) || [];
  const dat = bc.filter((d) => d.ket_qua === 'ĐẠT' && d.muc !== 'trigger').length;
  const luuY = bc.filter((d) => d.ket_qua === 'LƯU Ý').map((d) => '· ' + d.muc + ' — ' + d.chi_tiet);
  return 'Đã đổ lại từ ' + kq.tenFile + ' (chụp lúc ' + (kq.taoLucVn || '?') + '): ' + dat +
    ' bảng, so từng dòng đều khớp.' + (luuY.length ? '\n\nLưu ý:\n' + luuY.join('\n') : '');
}

const TEN_BANG = [
  ['persons', 'persons — người'],
  ['unions', 'unions — hôn nhân'],
  ['unionChildren', 'union_children — quan hệ cha/mẹ-con'],
  ['treeMembers', 'tree_members — tài khoản có chân'],
  ['changeLog', 'change_log — nhật ký sửa đổi'],
];

export async function veKhuSaoLuu(sec, ds) {
  const tb = sec.querySelector('#sl-doi-chieu-tbody');
  if (!ds.length) { dongRong(tb, 'Chưa có gia phả nào.'); return; }

  dongRong(tb, 'Đang đọc số đếm…');
  const ket = await Promise.all(ds.map((c) => demDuLieu(c.fileId)));

  tb.innerHTML = '';
  ds.forEach((c, i) => {
    const kq = ket[i];
    tb.append(dongTieuDe(c));
    if (!kq.ok) {
      tb.append(dongLoi(kq.loi || 'Không đọc được số đếm.'));
      return;
    }
    if (!kq.dem) {
      tb.append(dongLoi('Máy chủ không trả số cho gia phả này — chỉ Quản trị hệ thống đọc được.'));
      return;
    }
    for (const [ma, nhan] of TEN_BANG) tb.append(dongSo(nhan, kq.dem[ma]));
  });
}

function dongRong(tb, chu) {
  tb.innerHTML = '';
  const tr = document.createElement('tr');
  const o = td(span('muted', chu));
  o.colSpan = 5;
  tr.append(o);
  tb.append(tr);
}

function dongTieuDe(c) {
  const tr = document.createElement('tr');
  const ten = document.createElement('strong');
  ten.textContent = (c.ten || '(chưa đặt tên)') + ' · ' + c.treeCode;
  const o = td(ten);
  o.colSpan = 5;
  tr.append(o);
  return tr;
}

function dongLoi(chu) {
  const tr = document.createElement('tr');
  const o = td(span('muted', chu));
  o.colSpan = 5;
  tr.append(o);
  return tr;
}

function dongSo(nhan, soHienTai) {
  const tr = document.createElement('tr');
  tr.append(
    td(nhan),
    td(span('muted', '—')),
    td(String(soHienTai)),
    td(span('muted', '—')),
    td(span('muted', '')),
  );
  return tr;
}
