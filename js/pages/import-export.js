import { state } from '../state.js';
import { exportGedcom, tenFileGedcom, tomTatXuat, parseGedcom, mergeImported,
         detectDuplicates } from '../domains/gedcom.js';
import { parseExcel } from '../domains/excel.js';
import { openGhepDoi, closeGhepDoi } from './form-ghep-doi.js';
import { chonGiaPha } from '../services/sb.js';
import { taoGiaPhaMoi, khoiTao, luuCay, xinMa } from '../services/repo.js';
import { soMaTrongKho } from '../utils/id.js';
import { formatDate, stampNow } from '../utils/date.js';
import { fullName } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

let lopPhu = null;
let hopKetQua = null;
let duongTam = '';

let lopPhuNhap = null;
let hopXemTruoc = null;
let dangGhi = false;

export function openXuatGedcom() {
  closeXuatGedcom();

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-xuat-gedcom';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Xuất GEDCOM';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  const moDau = document.createElement('div');
  moDau.textContent =
    'GEDCOM là định dạng chung mà hầu hết phần mềm gia phả đọc được. ' +
    'Xuất ra một file .ged là để mang gia phả này sang nơi khác — hoặc ' +
    'giữ một bản ngoài Google Drive.';
  moDau.style.cssText =
    'font-size:13px;line-height:1.55;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
  hop.append(moDau);

  if (state.daLocNguoiConSong) {
    hop.append(veLoiNhan(
      'Máy chủ đang lược bớt chi tiết người còn sống trước khi gửi gia phả ' +
      'về máy này, nên file xuất ra cũng thiếu đúng những chi tiết ấy — kể ' +
      'cả khi bạn bỏ dấu chọn bên dưới.', true));
  }

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:16px;padding:9px 11px;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hopChon = document.createElement('input');
  hopChon.type = 'checkbox';
  hopChon.id = 'giapha-ct-an-con-song';
  hopChon.checked = true;
  hopChon.style.cssText = 'width:18px;height:18px;accent-color:var(--sd-chu,#2a2622)';

  const chu = document.createElement('span');
  chu.textContent = 'Ẩn chi tiết người còn sống';
  nhan.append(hopChon, chu);
  hop.append(nhan);

  const giaiThichAn = document.createElement('div');
  giaiThichAn.style.cssText =
    'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  hop.append(giaiThichAn);

  const tomTat = document.createElement('div');
  tomTat.style.cssText =
    'margin-top:12px;padding:10px 12px;border:1px solid var(--sd-vien,#e6e0d8);' +
    'border-radius:9px;background:var(--sd-nen,#faf8f5);font-size:13px;line-height:1.6';
  hop.append(tomTat);

  function veLaiTomTat() {
    const t = tomTatXuat(state.tree, { anNguoiConSong: hopChon.checked });
    const cau = ['Sẽ xuất ' + t.soNguoi + ' người và ' + t.soCap + ' gia đình.'];
    if (t.soAn > 0) cau.push('Trong đó ' + t.soAn + ' người còn sống chỉ ra tên.');
    if (t.soBoQua > 0) {
      cau.push(t.soBoQua + ' người đang ở Thùng rác không xuất.');
    }
    tomTat.textContent = cau.join(' ');

    giaiThichAn.textContent = hopChon.checked
      ? 'Người còn sống vẫn giữ tên và mối nối gia đình, nhưng bỏ ngày ' +
        'sinh, nơi chốn, nghề nghiệp, liên hệ, ghi chú và ảnh.'
      : 'Bỏ dấu chọn thì file mang đầy đủ ngày tháng và ghi chú của MỌI ' +
        'người, kể cả người còn sống. Chỉ làm vậy khi file này không đi ra ' +
        'khỏi tay bạn.';
  }
  hopChon.addEventListener('change', () => { veLaiTomTat(); xoaKetQua(); });
  veLaiTomTat();

  const nutTao = nut('Tạo file .ged', true, () => taoFile(hopChon.checked));
  nutTao.dataset.viec = 'tao-file-ged';
  nutTao.style.marginTop = '14px';
  hop.append(nutTao);

  hopKetQua = document.createElement('div');
  hop.append(hopKetQua);

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin:18px auto 0;display:block;width:100%;height:42px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);cursor:pointer;' +
    'touch-action:manipulation';
  dong.addEventListener('click', () => closeXuatGedcom());
  hop.append(dong);

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeXuatGedcom(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

export function closeXuatGedcom() {
  thuHoiDuongTam();
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  hopKetQua = null;
}

function taoFile(anNguoiConSong) {
  xoaKetQua();
  if (!hopKetQua) return;

  const luc = new Date();
  const ten = tenFileGedcom(state.tree, luc);
  let chuoi;
  try {
    chuoi = exportGedcom(state.tree, { anNguoiConSong, luc, tenFile: ten });
  } catch (e) {
    hopKetQua.append(veLoiNhan(
      'Không dựng được file: ' + (e && e.message ? e.message : String(e)), true));
    return;
  }

  const blob = new Blob(['\uFEFF', chuoi], { type: 'text/plain;charset=utf-8' });
  duongTam = URL.createObjectURL(blob);

  hopKetQua.append(veNhanKhoi('Đã tạo xong'));

  const soDong = chuoi.split('\r\n').length - 1;
  const doLon = document.createElement('div');
  doLon.textContent = ten + '  ·  ' + soDong + ' dòng  ·  ' +
                      Math.max(1, Math.round(blob.size / 1024)) + ' KB';
  doLon.style.cssText =
    'font-size:13px;line-height:1.6;word-break:break-all;' +
    'padding:9px 11px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;background:var(--sd-nen,#faf8f5)';
  hopKetQua.append(doLon);

  const tai = document.createElement('a');
  tai.href = duongTam;
  tai.download = ten;
  tai.textContent = 'Tải file .ged về máy';
  tai.style.cssText =
    'display:block;width:100%;min-height:42px;margin-top:10px;padding:11px 14px;' +
    'box-sizing:border-box;text-align:center;text-decoration:none;font-size:14px;' +
    'font-weight:600;border-radius:9px;background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);' +
    'border:1px solid var(--sd-nut,#2a2622);touch-action:manipulation';
  hopKetQua.append(tai);

  hopKetQua.append(veChepTay(chuoi, ten));
}

function veChepTay(chuoi, ten) {
  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:12px';

  const moRa = document.createElement('button');
  moRa.type = 'button';
  moRa.dataset.viec = 'mo-chep-tay';
  moRa.textContent = 'Không tải được file?';
  moRa.style.cssText =
    'display:block;width:100%;padding:9px 4px;font-size:13px;font-family:inherit;' +
    'color:var(--sd-chu-phu,#8a8078);background:none;border:0;text-align:left;cursor:pointer;' +
    'text-decoration:underline;text-underline-offset:3px;touch-action:manipulation';

  const ruot = document.createElement('div');
  ruot.hidden = true;

  const buoc = document.createElement('div');
  buoc.style.cssText = 'font-size:13px;line-height:1.7;color:var(--sd-chu-phu,#8a8078)';
  buoc.append(
    dongChu('1. Bấm nút "Chép toàn bộ nội dung" bên dưới.'),
    dongChu('2. Mở Notepad (bấm nút Start, gõ chữ notepad, bấm Enter).'),
    dongChu('3. Bấm Ctrl + V để dán vào.'),
    dongChu('4. Bấm Ctrl + S. Ở ô "File name" gõ đúng tên: ' + ten),
    dongChu('5. Ở ô "Save as type" chọn "All files", ở ô "Encoding" ' +
            'chọn "UTF-8". Rồi bấm Save.'),
  );
  ruot.append(buoc);

  const o = document.createElement('textarea');
  o.readOnly = true;
  o.value = chuoi;
  o.style.cssText =
    'width:100%;height:120px;margin-top:10px;box-sizing:border-box;padding:8px;' +
    'font-family:ui-monospace,Consolas,monospace;font-size:11px;line-height:1.4;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);' +
    'white-space:pre;resize:vertical';
  ruot.append(o);

  const bao = document.createElement('div');
  bao.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-top:6px';

  const b = nut('Chép toàn bộ nội dung', false, async () => {
    o.focus();
    o.select();
    let xong = false;
    try {
      await navigator.clipboard.writeText(chuoi);
      xong = true;
    } catch (e) {
      try { xong = document.execCommand('copy'); } catch (e2) { xong = false; }
    }
    bao.textContent = xong
      ? 'Đã chép. Giờ mở Notepad và bấm Ctrl + V.'
      : 'Trình duyệt không cho chép tự động. Chữ trong ô đã được bôi đen sẵn — ' +
        'bấm Ctrl + C để chép.';
  });
  b.style.marginTop = '8px';
  ruot.append(b, bao);

  moRa.addEventListener('click', () => {
    ruot.hidden = !ruot.hidden;
    moRa.textContent = ruot.hidden ? 'Không tải được file?' : 'Ẩn cách chép tay';
  });

  khoi.append(moRa, ruot);
  return khoi;
}

function xoaKetQua() {
  thuHoiDuongTam();
  if (hopKetQua) hopKetQua.innerHTML = '';
}

function thuHoiDuongTam() {
  if (duongTam) URL.revokeObjectURL(duongTam);
  duongTam = '';
}

export function openNhapGedcom() {
  closeNhapGedcom();

  lopPhuNhap = document.createElement('div');
  lopPhuNhap.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-nhap-gedcom';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Nhập GEDCOM / Excel';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  const moDau = document.createElement('div');
  moDau.textContent =
    'Chọn một file .ged, hoặc một file Excel (.xlsx/.xlsb) — khuôn nhập mẫu, ' +
    'hoặc file Xuất Excel dạng Bảng phẳng — để xem trước rồi lưu thành một gia phả mới.';
  moDau.style.cssText =
    'font-size:13px;line-height:1.55;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
  hop.append(moDau);

  const nhanFile = document.createElement('label');
  nhanFile.style.cssText =
    'display:block;margin-top:16px;font-size:14px;font-weight:600';
  nhanFile.textContent = 'Chọn file .ged hoặc file Excel';
  hop.append(nhanFile);

  const oFile = document.createElement('input');
  oFile.type = 'file';
  oFile.accept = '.ged,.GED,.xlsx,.XLSX,.xlsb,.XLSB,text/plain';
  oFile.id = 'giapha-o-chon-ged';
  oFile.style.cssText =
    'display:block;width:100%;margin-top:6px;padding:9px;box-sizing:border-box;' +
    'font-size:13px;font-family:inherit;border:1px solid var(--sd-vien,#e6e0d8);' +
    'border-radius:9px;background:var(--sd-nen,#faf8f5)';
  oFile.addEventListener('change', () => {
    const f = oFile.files && oFile.files[0];
    if (!f) return;
    docFile(f);
  });
  hop.append(oFile);

  hop.append(veDanChu());

  hopXemTruoc = document.createElement('div');
  hop.append(hopXemTruoc);

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin:18px auto 0;display:block;width:100%;height:42px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);cursor:pointer;' +
    'touch-action:manipulation';
  dong.addEventListener('click', () => closeNhapGedcom());
  hop.append(dong);

  lopPhuNhap.addEventListener('click', (e) => {
    if (e.target === lopPhuNhap) closeNhapGedcom();
  });
  lopPhuNhap.append(hop);
  document.body.append(lopPhuNhap);
}

export function closeNhapGedcom() {
  closeGhepDoi();
  if (lopPhuNhap) lopPhuNhap.remove();
  lopPhuNhap = null;
  hopXemTruoc = null;
}

function veDanChu() {
  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:10px';

  const moRa = document.createElement('button');
  moRa.type = 'button';
  moRa.dataset.viec = 'mo-dan-ged';
  moRa.textContent = 'Không chọn được file?';
  moRa.style.cssText =
    'display:block;width:100%;padding:9px 4px;font-size:13px;font-family:inherit;' +
    'color:var(--sd-chu-phu,#8a8078);background:none;border:0;text-align:left;cursor:pointer;' +
    'text-decoration:underline;text-underline-offset:3px;touch-action:manipulation';

  const ruot = document.createElement('div');
  ruot.hidden = true;

  const buoc = document.createElement('div');
  buoc.style.cssText = 'font-size:13px;line-height:1.7;color:var(--sd-chu-phu,#8a8078)';
  buoc.append(
    dongChu('1. Mở file .ged bằng Notepad (bấm phải vào file, chọn Open with, ' +
            'chọn Notepad).'),
    dongChu('2. Bấm Ctrl + A rồi Ctrl + C để chép hết.'),
    dongChu('3. Bấm vào ô bên dưới, bấm Ctrl + V để dán vào.'),
  );
  ruot.append(buoc);

  const o = document.createElement('textarea');
  o.id = 'giapha-o-dan-ged';
  o.placeholder = '0 HEAD…';
  o.style.cssText =
    'width:100%;height:110px;margin-top:10px;box-sizing:border-box;padding:8px;' +
    'font-family:ui-monospace,Consolas,monospace;font-size:11px;line-height:1.4;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);' +
    'white-space:pre;resize:vertical';
  ruot.append(o);

  const b = nut('Xem trước nội dung đã dán', false, () => xemTruoc(o.value, 'chữ đã dán'));
  b.dataset.viec = 'xem-truoc-dan';
  b.style.marginTop = '8px';
  ruot.append(b);

  moRa.addEventListener('click', () => {
    ruot.hidden = !ruot.hidden;
    moRa.textContent = ruot.hidden ? 'Không chọn được file?' : 'Ẩn cách dán chữ';
  });

  khoi.append(moRa, ruot);
  return khoi;
}

function docFile(f) {
  if (!hopXemTruoc) return;
  hopXemTruoc.innerHTML = '';
  hopXemTruoc.append(veNhanKhoi('Đang đọc'));

  const laExcel = /\.(xlsx|xlsb)$/i.test(f.name || '');
  const doc = new FileReader();
  doc.onerror = () => {
    hopXemTruoc.innerHTML = '';
    hopXemTruoc.append(veLoiNhan('Không đọc được file này. ' +
      (laExcel ? '' : 'Thử cách dán chữ bên trên.'), true));
  };

  if (laExcel) {
    doc.onload = () => xemTruocExcel(doc.result, f.name);
    doc.readAsArrayBuffer(f);
  } else {
    doc.onload = () => xemTruoc(String(doc.result || ''), f.name);
    doc.readAsText(f, 'utf-8');
  }
}

function xemTruoc(chuoi, tenNguon) {
  if (!hopXemTruoc) return;
  hopXemTruoc.innerHTML = '';

  if (String(chuoi).trim() === '') {
    hopXemTruoc.append(veLoiNhan('Chưa có nội dung nào để đọc.', true));
    return;
  }

  let kq;
  try {
    kq = parseGedcom(chuoi);
  } catch (e) {
    hopXemTruoc.append(veLoiNhan(
      'Không đọc được file: ' + (e && e.message ? e.message : String(e)), true));
    return;
  }

  hienThiXemTruoc(kq, tenNguon);
}

async function xemTruocExcel(arrayBuffer, tenNguon) {
  if (!hopXemTruoc) return;
  hopXemTruoc.innerHTML = '';
  hopXemTruoc.append(veNhanKhoi('Đang đọc'));

  let kq;
  try {
    kq = await parseExcel(arrayBuffer);
  } catch (e) {
    if (!hopXemTruoc) return;
    hopXemTruoc.innerHTML = '';
    hopXemTruoc.append(veLoiNhan(
      'Không đọc được file: ' + (e && e.message ? e.message : String(e)), true));
    return;
  }
  if (!hopXemTruoc) return;
  hopXemTruoc.innerHTML = '';

  if (kq.persons.length === 0 && kq.canhBao.some((c) => c.muc === 'nang')) {
    hopXemTruoc.append(veLoiNhan(kq.canhBao[0].chu, true));
    return;
  }

  hienThiXemTruoc(kq, tenNguon);
}

function hienThiXemTruoc(kq, tenNguon) {
  hopXemTruoc.append(veNhanKhoi('Đọc được gì từ ' + tenNguon));

  const dsNguon = [];
  if (kq.tenCay) dsNguon.push('Tên gia phả trong file: ' + kq.tenCay);
  if (kq.nguonXuat) dsNguon.push('Do phần mềm "' + kq.nguonXuat + '" xuất ra');
  if (dsNguon.length > 0) {
    const kNguon = document.createElement('div');
    kNguon.style.cssText =
      'font-size:12px;line-height:1.6;color:var(--sd-chu-phu,#8a8078);margin-bottom:8px';
    for (const c of dsNguon) kNguon.append(dongChu(c));
    hopXemTruoc.append(kNguon);
  }

  const t = kq.thongKe;
  const so = document.createElement('div');
  so.dataset.viec = 'tom-tat-nhap';
  so.style.cssText =
    'padding:10px 12px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;' +
    'background:var(--sd-nen,#faf8f5);font-size:13px;line-height:1.6';
  const cau = [t.soNguoi + ' người', t.soCap + ' gia đình'];
  if (t.soNguon > 0) cau.push(t.soNguon + ' nguồn dẫn');
  so.textContent = cau.join(' · ');
  hopXemTruoc.append(so);

  if (kq.canhBao.length > 0) {
    hopXemTruoc.append(veNhanKhoi('Những gì sẽ mất, hoặc cần biết trước'));
    for (const c of kq.canhBao) {
      hopXemTruoc.append(veLoiNhan(c.chu, c.muc === 'nang'));
    }
  }

  if (kq.theLa.length > 0) {
    const bang = document.createElement('div');
    bang.style.cssText =
      'margin-top:10px;padding:9px 11px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
      'background:var(--sd-nen,#faf8f5);font-size:12px;line-height:1.7;color:var(--sd-chu-phu,#8a8078)';
    bang.append(dongChu('Từng loại thẻ bị bỏ:'));
    for (const x of kq.theLa) bang.append(dongChu('· ' + x.the + ' — ' + x.so + ' dòng'));
    hopXemTruoc.append(bang);
  }

  if (kq.persons.length > 0) {
    hopXemTruoc.append(veNhanKhoi('Mười người đầu tiên'));
    const ds = document.createElement('div');
    ds.dataset.viec = 'xem-truoc-nguoi';
    ds.style.cssText =
      'padding:9px 11px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
      'background:var(--sd-nen,#faf8f5);font-size:12px;line-height:1.7';
    for (const p of kq.persons.slice(0, 10)) ds.append(dongChu(motDongNguoi(p)));
    if (kq.persons.length > 10) {
      const them = dongChu('… và ' + (kq.persons.length - 10) + ' người nữa.');
      them.style.color = 'var(--sd-chu-phu,#8a8078)';
      ds.append(them);
    }
    hopXemTruoc.append(ds);
  }

  hopXemTruoc.append(veKhoiGhi(kq, tenNguon));
}

function motDongNguoi(p) {
  const ten = fullName((p.names || [])[0]) || '(chưa có tên)';
  const sinh = formatDate(p.birth);
  const mat = formatDate(p.death);
  const phan = [ten];
  if (sinh !== '' || mat !== '') phan.push(sinh + ' – ' + mat);
  phan.push(p.id);
  return phan.join('  ·  ');
}

function veKhoiGhi(kq, tenNguon) {
  const khoi = document.createElement('div');
  khoi.dataset.viec = 'khoi-ghi-that';

  khoi.append(veNhanKhoi('Ghi vào đâu'));

  const nhac = document.createElement('div');
  nhac.style.cssText =
    'padding:10px 12px;border:1px solid var(--sd-do-vien,#f0d8d0);border-radius:9px;' +
    'background:var(--sd-do-nen,#fbf0ec);color:var(--sd-do,#8a3a2a);font-size:12px;line-height:1.6';
  const taiKhoan = (state.phien && state.phien.email) || 'tài khoản của bạn';
  nhac.append(
    dongChu('· Lưu vào máy chủ, dưới tài khoản ' + taiKhoan + '.'),
    dongChu('· Ghi xong KHÔNG có nút hoàn tác.'),
  );
  khoi.append(nhac);

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:block;margin-top:14px;font-size:14px;font-weight:600';
  nhan.textContent = 'Tên gia phả mới';
  khoi.append(nhan);

  const o = document.createElement('input');
  o.type = 'text';
  o.id = 'giapha-ten-cay-nhap';
  o.value = kq.tenCay || '';
  o.placeholder = 'Ví dụ: Họ Nguyễn Trọng — chi Bắc';
  o.style.cssText =
    'display:block;width:100%;margin-top:6px;padding:10px;box-sizing:border-box;' +
    'font-size:14px;font-family:inherit;border:1px solid var(--sd-vien,#e6e0d8);' +
    'border-radius:9px;background:var(--sd-nen,#faf8f5)';
  khoi.append(o);

  const tin = document.createElement('div');
  tin.dataset.viec = 'tin-ghi-that';
  khoi.append(tin);

  const nutGhi = document.createElement('button');
  nutGhi.type = 'button';
  nutGhi.dataset.viec = 'ghi-vao-cay-moi';
  nutGhi.textContent = 'Tạo gia phả mới và ghi vào đó';
  nutGhi.style.cssText =
    'display:block;width:100%;margin:14px auto 0;min-height:44px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;line-height:1.35;border-radius:9px;cursor:pointer;' +
    'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);' +
    'touch-action:manipulation';
  nutGhi.addEventListener('click', () => chayGhiVaoCayMoi(kq, o, nutGhi, tin, tenNguon));
  khoi.append(nutGhi);

  khoi.append(veNhanKhoi('Hoặc bổ sung vào gia phả đang mở'));

  const coCay = !!(state.tree && Array.isArray(state.tree.persons) &&
                   state.tree.persons.length > 0);

  const giaiThich = document.createElement('div');
  giaiThich.style.cssText =
    'font-size:12px;line-height:1.6;color:var(--sd-chu-phu,#8a8078);margin-bottom:8px';
  giaiThich.textContent = coCay
    ? 'Bạn sẽ tự chỉ ra ai trong file là ai trong cây, rồi mới ghi. Ghi xong ' +
      'KHÔNG có nút hoàn tác.'
    : 'Chưa mở gia phả nào có người, nên chưa có ai để ghép. Dùng đường tạo ' +
      'gia phả mới bên trên.';
  khoi.append(giaiThich);

  const nutBoSung = nut('Bổ sung vào gia phả đang mở', false,
                        () => openGhepDoi(kq, (tuyChon, thongKe) =>
                          chayTronBoSung(kq, tenNguon, tuyChon, thongKe)));
  nutBoSung.dataset.viec = 'mo-ghep-doi';
  nutBoSung.disabled = !coCay;
  if (!coCay) {
    nutBoSung.style.opacity = '.45';
    nutBoSung.style.cursor = 'default';
  }
  khoi.append(nutBoSung);

  return khoi;
}

async function chayGhiVaoCayMoi(kq, o, nutGhi, tin, tenNguon) {
  if (dangGhi) return;

  const ten = String(o.value || '').trim();
  if (!ten) {
    tin.innerHTML = '';
    tin.append(veLoiNhan('Chưa gõ tên gia phả mới.', true));
    try { o.focus(); } catch (e) {}
    return;
  }

  dangGhi = true;
  nutGhi.disabled = true;
  nutGhi.style.opacity = '.45';
  o.disabled = true;
  const noi = (chu_) => {
    if (!lopPhuNhap || !tin.isConnected) return;
    tin.innerHTML = '';
    const d = document.createElement('div');
    d.textContent = chu_;
    d.style.cssText = 'margin-top:10px;font-size:13px;line-height:1.6;color:var(--sd-chu-phu,#8a8078)';
    tin.append(d);
  };
  const thua = (chu_) => {
    dangGhi = false;
    if (!lopPhuNhap || !tin.isConnected) return;
    tin.innerHTML = '';
    tin.append(veLoiNhan(chu_, true));
    nutGhi.disabled = false;
    nutGhi.style.opacity = '1';
    o.disabled = false;
  };

  noi('Đang xin mã mới cho ' + kq.persons.length + ' người…');
  const du = await xinMaChoCayMoi(kq);
  if (!lopPhuNhap) { dangGhi = false; return; }
  if (!du.ok) return thua(du.loi);

  noi('Đang dựng "' + ten + '" trên máy chủ…');
  const daTao = await taoGiaPhaMoi(ten, { conSong: () => !!lopPhuNhap });
  if (!lopPhuNhap) { dangGhi = false; return; }
  if (!daTao.ok) {
    if (daTao.lyDo === 'daDong') { dangGhi = false; return; }
    return thua(daTao.loi);
  }

  noi('Đã dựng xong. Đang chuyển sang gia phả mới…');
  let doi;
  try {
    doi = await chonGiaPha(daTao.moi.fileId);
  } catch (e) {
    return thua('Đã dựng được gia phả mới nhưng không chuyển sang được: ' +
                (e && e.message ? e.message : String(e)) +
                ' — cây cũ vẫn nguyên vẹn.');
  }
  if (!doi || !doi.ok) {
    return thua('Đã dựng được gia phả mới nhưng không chuyển sang được: ' +
                ((doi && doi.loi) || 'máy chủ không nói lý do') +
                ' — cây cũ vẫn nguyên vẹn.');
  }

  noi('Đang nạp gia phả mới…');
  try {
    await khoiTao();
  } catch (e) {
    return thua(daChuyenRoi('không nạp được cây mới: ' +
                            (e && e.message ? e.message : String(e))));
  }

  const dung = mergeImported(state.tree, kq, {
    che: 'moi',
    luc: stampNow(),
    nguoiGhi: (state.phien && state.phien.email) || '',
    tenFile: tenNguon || '',
  });
  if (!dung.ok) return thua(daChuyenRoi(dung.loi));

  noi('Đang ghi ' + dung.tomTat.soNguoi + ' người vào gia phả mới…');
  const luu = await luuCay((banNhap) => {
    banNhap.persons = dung.cay.persons;
    banNhap.unions = dung.cay.unions;
    banNhap.sources = dung.cay.sources;
    banNhap.media = [];
    banNhap.imports = dung.cay.imports;
    banNhap.tree.rootPersonId = dung.cay.tree.rootPersonId;
  }, {
    action: 'nhapGedcom',
    target: daTao.moi.fileId,
    note: 'Nhập từ file GEDCOM: ' + dung.tomTat.soNguoi + ' người, ' +
          dung.tomTat.soCap + ' gia đình.',
  });
  if (!luu || !luu.ok) {
    return thua(daChuyenRoi((luu && luu.loi) || 'máy chủ không nói lý do'));
  }

  dangGhi = false;
  veHopDaGhi(daTao.moi, dung.tomTat);
}

async function xinMaChoLanNhap(kq, tuyChon) {
  const d = detectDuplicates(state.tree, kq, {
    diemNeoTay: (tuyChon && tuyChon.diemNeoTay) || [],
    khaiMoi: (tuyChon && tuyChon.khaiMoi) || [],
  });
  if (!d.ok || !d.duocTron) return { ok: true, loi: '' };
  return xinDuMa({ P: d.nguoiMoi.length, U: d.capMoi.length });
}

function xinMaChoCayMoi(kq) {
  const dem = (ds) => (Array.isArray(ds) ? ds.filter((x) => x && x.id).length : 0);
  return xinDuMa({ P: dem(kq.persons), U: dem(kq.unions) });
}

async function xinDuMa(can) {
  for (const loai of Object.keys(can)) {
    const thieu = can[loai] - soMaTrongKho(loai);
    if (thieu <= 0) continue;
    const x = await xinMa(loai, thieu);
    if (!x.ok) {
      return { ok: false, loi: 'Chưa xin được mã mới của máy chủ (' + loai + ', ' +
                               thieu + ' mã): ' + (x.loi || 'không rõ lý do') +
                               '. Chưa ghi gì — cây vẫn nguyên.' };
    }
  }
  return { ok: true, loi: '' };
}

async function chayTronBoSung(kq, tenNguon, tuyChon, thongKe) {
  if (dangGhi) return { ok: false, loi: 'Đang ghi dở một việc khác.' };
  dangGhi = true;

  try {
    const du = await xinMaChoLanNhap(kq, tuyChon);
    if (!du.ok) return { ok: false, loi: du.loi };

    const dung = mergeImported(state.tree, kq, {
      che: 'bosung',
      diemNeoTay: (tuyChon && tuyChon.diemNeoTay) || [],
      khaiMoi: (tuyChon && tuyChon.khaiMoi) || [],
      luc: stampNow(),
      nguoiGhi: (state.phien && state.phien.email) || '',
      tenFile: tenNguon || '',
    });
    if (!dung.ok) return { ok: false, loi: dung.loi };

    const t = dung.tomTat;

    const coDoi = (t.themNguoi + t.themCap + t.themNguon +
                   t.suaNguoi + t.suaCap) > 0;

    const luu = await luuCay((banNhap) => {
      banNhap.persons = dung.cay.persons;
      banNhap.unions  = dung.cay.unions;
      banNhap.sources = dung.cay.sources;
      banNhap.imports = dung.cay.imports;
    }, {
      action: 'nhapBoSung',
      target: (state.tree && state.tree.tree && state.tree.tree.id) || '',
      note: 'Bổ sung từ file GEDCOM' + (tenNguon ? ' "' + tenNguon + '"' : '') +
            (coDoi
              ? ': thêm ' + t.themNguoi + ' người, ' + t.themCap + ' gia đình; ' +
                'bổ sung chi tiết cho ' + t.suaNguoi + ' người, ' + t.suaCap +
                ' gia đình.'
              : ': KHÔNG thêm và KHÔNG sửa bản ghi nào — mọi bản ghi trong ' +
                'file đều đã có trong cây. Lần ghi này chỉ cất bảng ghép đôi ' +
                'vào sổ nhập.'),
    });
    if (!luu || !luu.ok) {
      return {
        ok: false,
        loi: 'Chưa ghi được nên gia phả vẫn y nguyên: ' +
             ((luu && luu.loi) || 'máy chủ không nói lý do'),
      };
    }

    closeGhepDoi();
    veHopDaTron(t, dung.boQua, tenNguon, coDoi);
    return { ok: true, loi: '' };
  } finally {
    dangGhi = false;
  }
}

function veHopDaTron(t, boQua, tenNguon, coDoi) {
  const hop = lopPhuNhap && lopPhuNhap.querySelector('#giapha-nhap-gedcom');
  if (!hop) return;

  hop.innerHTML = '';
  hopXemTruoc = null;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = coDoi
    ? 'Đã hợp nhất xong'
    : 'KHÔNG thêm được ai — gia phả giữ nguyên';
  tieuDe.dataset.viec = coDoi ? 'da-tron-xong' : 'khong-doi-gi';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600' +
    (coDoi ? '' : ';color:var(--sd-do,#8a3a2a)');
  hop.append(tieuDe);

  if (!coDoi) {
    hop.append(veLoiNhan(
      'Mọi bản ghi trong file đều đã có sẵn trong gia phả, và không ô nào ' +
      'đang trống được điền thêm. Nên lần này KHÔNG có người mới, KHÔNG có ' +
      'gia đình mới, và không một ô nào đổi giá trị — tải lại trang cũng sẽ ' +
      'không thấy gì mới, đó là đúng chứ không phải hỏng.', false));
  }

  const so = document.createElement('div');
  so.dataset.viec = 'tom-tat-da-tron';
  so.style.cssText =
    'margin-top:10px;padding:10px 12px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;' +
    'background:var(--sd-nen,#faf8f5);font-size:13px;line-height:1.7';
  so.append(
    dongChu('· Thêm mới: ' + t.themNguoi + ' người · ' + t.themCap + ' gia đình'),
    dongChu('· Bổ sung chi tiết: ' + t.suaNguoi + ' người · ' + t.suaCap +
            ' gia đình (' + t.soBoSung + ' ô đang trống được điền)'),
    dongChu('· Gia phả nay có ' + t.soNguoi + ' người · ' + t.soCap + ' gia đình'),
  );
  hop.append(so);

  if (t.soGiu > 0) {
    hop.append(veLoiNhan(
      'Có ' + t.soGiu + ' chỗ hai bên nói khác nhau. App GIỮ nguyên của gia ' +
      'phả, không lấy của file. Muốn đổi thì sửa tay từng người.', false));
  }

  if (Array.isArray(boQua) && boQua.length > 0) {
    hop.append(veNhanKhoi('Mấy chỗ file có nói mà app chưa ghi được'));
    const k = document.createElement('div');
    k.dataset.viec = 'bo-qua-khi-tron';
    k.style.cssText =
      'padding:9px 11px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
      'background:var(--sd-nen,#faf8f5);font-size:12px;line-height:1.7;color:#6a4a40';
    for (const b of boQua.slice(0, 20)) {
      k.append(dongChu('· ' + b.id + ' — ' + b.nhan + ': ' + b.vi));
    }
    if (boQua.length > 20) {
      k.append(dongChu('… và ' + (boQua.length - 20) + ' chỗ nữa.'));
    }
    hop.append(k);
  }

  const nhac = document.createElement('div');
  nhac.style.cssText =
    'margin-top:12px;font-size:12px;line-height:1.7;color:var(--sd-chu-phu,#8a8078)';
  nhac.append(
    dongChu('· Ảnh không nằm trong file .ged nên lần hợp nhất này không mang ảnh nào sang.'),
    dongChu('· App đã ghi lại "dòng nào trong file là ai trong cây". Lần sau ' +
            'nhập tiếp từ ' + (tenNguon || 'cùng nguồn ấy') + ', bạn không ' +
            'phải ghép lại những người đã ghép hôm nay.'),
  );
  hop.append(nhac);

  const nutDong = document.createElement('button');
  nutDong.type = 'button';
  nutDong.dataset.viec = 'dong-sau-tron';
  nutDong.textContent = 'Xong';
  nutDong.style.cssText =
    'display:block;width:100%;margin:16px auto 0;height:44px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;border-radius:9px;cursor:pointer;' +
    'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);' +
    'touch-action:manipulation';
  nutDong.addEventListener('click', () => closeNhapGedcom());
  hop.append(nutDong);
}

function daChuyenRoi(cau) {
  return 'App đã chuyển sang gia phả mới nhưng chưa ghi được gì vào đó: ' +
         cau + ' Gia phả cũ của bạn vẫn nguyên vẹn — vào Cài đặt → Chọn gia ' +
         'phả để quay về.';
}

function veHopDaGhi(moi, tomTat) {
  const hop = lopPhuNhap && lopPhuNhap.querySelector('#giapha-nhap-gedcom');
  if (!hop) return;

  hop.innerHTML = '';
  hopXemTruoc = null;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Đã ghi xong';
  tieuDe.dataset.viec = 'da-ghi-xong';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  const so = document.createElement('div');
  so.style.cssText =
    'margin-top:10px;padding:10px 12px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;' +
    'background:var(--sd-nen,#faf8f5);font-size:13px;line-height:1.6';
  so.textContent = moi.ten + '  ·  ' + tomTat.soNguoi + ' người · ' +
                   tomTat.soCap + ' gia đình';
  hop.append(so);

  const nhac = document.createElement('div');
  nhac.style.cssText =
    'margin-top:12px;font-size:12px;line-height:1.7;color:var(--sd-chu-phu,#8a8078)';
  nhac.append(
    dongChu('· App nay mở gia phả mới này. Muốn quay về cây cũ thì vào Cài ' +
            'đặt → Chọn gia phả.'),
    dongChu('· Ảnh không nằm trong file .ged nên gia phả mới chưa có ảnh nào.'),
    dongChu('· Muốn người trong họ xem được thì vào Google Drive chia sẻ HAI ' +
            'thứ, từng cái một: file "' + moi.tenFile + '", và thư mục "Anh" ' +
            'bên cạnh nó. ĐỪNG chia sẻ thư mục mẹ — làm thế là trao luôn ' +
            'thư mục "Sao_luu", tức quyền ghi đè cả gia phả.'),
  );
  hop.append(nhac);

  const nutTai = document.createElement('button');
  nutTai.type = 'button';
  nutTai.dataset.viec = 'tai-lai-sau-nhap';
  nutTai.textContent = 'Tải lại trang';
  nutTai.style.cssText =
    'display:block;width:100%;margin:16px auto 0;height:44px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;border-radius:9px;cursor:pointer;' +
    'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);' +
    'touch-action:manipulation';
  nutTai.addEventListener('click', () => location.reload());
  hop.append(nutTai);
}

export async function exportPng() {   }

export async function exportPdf() {   }

function veNhanKhoi(chu_) {
  const n = document.createElement('div');
  n.textContent = chu_;
  n.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078);' +
    'margin:16px 0 6px';
  return n;
}

function dongChu(chu_) {
  const d = document.createElement('div');
  d.textContent = chu_;
  return d;
}

function nut(chu_, chinh, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu_;
  b.style.cssText =
    'width:100%;min-height:42px;padding:8px 14px;font-size:14px;font-family:inherit;' +
    'border-radius:9px;touch-action:manipulation;line-height:1.35;cursor:pointer;' +
    (chinh
      ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
      : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
  b.addEventListener('click', chay);
  return b;
}

function veLoiNhan(chu_, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu_;
  d.style.cssText =
    'margin-top:10px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:var(--sd-do,#8a3a2a);background:var(--sd-do-nen,#fbf0ec);border:1px solid var(--sd-do-vien,#f0d8d0)'
      : 'color:var(--sd-chu-phu,#8a8078);background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4)');
  return d;
}
