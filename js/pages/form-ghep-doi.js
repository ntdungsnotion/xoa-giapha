import { state } from '../state.js';
import { detectDuplicates, goiYCapTheoNguoi, lanTheoQuanHe }
  from '../domains/gedcom.js';
import { fullName, doiSongNguoi, removeDiacritics } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

const MOI = '#moi';

const NGUONG_O_LOC = 12;

const LAN = 'lan';

let lopPhu = null;
let ctx = null;

export function openGhepDoi(imported, khiTron) {
  closeGhepDoi();
  if (!imported || !Array.isArray(imported.persons)) return;

  ctx = {
    imported,
    khiTron: typeof khiTron === 'function' ? khiTron : null,
    chon: new Map(),
    nguon: new Map(),
    hang: [],
    tuyChon: null,
    banDoDaChot: new Map(),
    khaiMoiHienTai: [],
    duongDi: new Map(),
    daBamDeXuat: false,
    oTinh: null,
    oDeXuat: null,
    oKetQua: null,
    nutTron: null,
    dsCay: nguoiTrongCay(),
  };
  for (const p of imported.persons) if (p && p.id) ctx.chon.set(p.id, '');

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:31;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-ghep-doi';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 700) + ';' +
    'max-height:' + caoHop(86) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Ghép người trong file với người trong cây';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600;line-height:1.35';
  hop.append(tieuDe);

  const moDau = document.createElement('div');
  moDau.style.cssText =
    'font-size:13px;line-height:1.55;color:var(--sd-chu-phu,#8a8078);margin-top:8px';
  moDau.append(
    dongChu('Cột phải để trống cho tới khi bạn chỉ ra người đầu tiên. Hãy ' +
            'tìm một người bạn CHẮC CHẮN đã có trong gia phả đang mở, rồi ' +
            'chọn đúng người ấy ở cột phải.'),
    dongChu('App không tự chọn người đầu tiên thay bạn.'),
  );
  hop.append(moDau);

  ctx.oTinh = document.createElement('div');
  ctx.oTinh.dataset.viec = 'dem-ghep-doi';
  ctx.oTinh.style.cssText =
    'margin-top:12px;padding:9px 11px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;' +
    'background:var(--sd-nen,#faf8f5);font-size:13px;line-height:1.6';
  hop.append(ctx.oTinh);

  hop.append(veNhanKhoi('Từng người trong file'));
  const than = document.createElement('div');
  than.dataset.viec = 'bang-ghep-doi';
  for (const p of imported.persons) if (p && p.id) than.append(veHang(p));
  hop.append(than);

  ctx.oDeXuat = document.createElement('div');
  hop.append(ctx.oDeXuat);

  const hangLoat = nut('Những dòng còn trống: đều CHƯA CÓ trong cây', false, () => {
    for (const [id, v] of ctx.chon) if (v === '') datChon(id, MOI, 'tay');
    tinhLai();
  });
  hangLoat.dataset.viec = 'con-lai-la-moi';
  hangLoat.style.marginTop = '12px';
  hop.append(hangLoat);

  ctx.oKetQua = document.createElement('div');
  hop.append(ctx.oKetQua);

  const dong = nut('Đóng', false, () => closeGhepDoi());
  dong.style.marginTop = '18px';
  hop.append(dong);

  lopPhu.addEventListener('click', (e) => {
    if (e.target === lopPhu) closeGhepDoi();
  });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  tinhLai();
}

export function closeGhepDoi() {
  dongTamChon();
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  ctx = null;
}

function veHang(p) {
  const hang = document.createElement('div');
  hang.dataset.viec = 'hang-ghep';
  hang.dataset.ma = p.id;
  hang.style.cssText =
    'display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;' +
    'padding:9px 0;border-top:1px solid var(--sd-vien,#e6e0d8)';

  const trai = document.createElement('div');
  trai.style.cssText = 'flex:1 1 140px;min-width:0;font-size:13px;line-height:1.45';
  const ten = document.createElement('div');
  ten.textContent = fullName(p) || '(chưa có tên)';
  const phu = document.createElement('div');
  phu.style.cssText = 'font-size:11px;color:var(--sd-chu-phu,#8a8078)';
  phu.textContent = [doiSongNguoi(p), p.id].filter((x) => x !== '').join('  ·  ');
  trai.append(ten, phu);

  const phai = document.createElement('div');
  phai.style.cssText = 'flex:1 1 170px;min-width:0';

  const nhanCot = document.createElement('div');
  nhanCot.textContent = 'trong cây';
  nhanCot.style.cssText = 'font-size:11px;color:var(--sd-chu-phu,#8a8078);margin-bottom:2px';
  phai.append(nhanCot);

  const o = document.createElement('button');
  o.type = 'button';
  o.dataset.viec = 'o-chon';
  o.style.cssText =
    'display:block;width:100%;box-sizing:border-box;text-align:left;' +
    'min-height:40px;padding:8px 10px;font-size:13px;font-family:inherit;' +
    'line-height:1.4;border:1px solid var(--sd-vien,#e6e0d8);border-radius:8px;' +
    'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);cursor:pointer;touch-action:manipulation';
  o.addEventListener('click', () => moTamChon(p));

  const nhan = document.createElement('div');
  nhan.dataset.viec = 'nhan-nguon';
  nhan.style.cssText = 'font-size:11px;line-height:1.5;margin-top:3px;min-height:1px';
  phai.append(o, nhan);

  hang.append(trai, phai);
  const h = { id: p.id, o, nhan, el: hang };
  ctx.hang.push(h);
  matNut(h);
  return hang;
}

function matNut(h) {
  const v = ctx.chon.get(h.id) || '';
  h.el.dataset.chon = v;
  h.o.style.color = v === '' ? 'var(--sd-chu-phu,#8a8078)' : 'var(--sd-chu,#2a2622)';
  h.o.textContent = v === ''
    ? '— chưa quyết —'
    : (v === MOI ? 'Chưa có trong cây — thêm mới' : nhanTrongCay(v));
  h.o.setAttribute('aria-label',
    'Người trong cây ứng với ' + tenFile(h.id) + ': ' + h.o.textContent +
    '. Bấm để chọn lại.');
}

function nhanTrongCay(id) {
  const x = ctx.dsCay.find((y) => y.id === id);
  return x ? x.nhan : String(id || '');
}

const CAT_KHI_TRONG = 200;

let lopChon = null;
let ngheEsc = null;

function moTamChon(p) {
  dongTamChon();
  if (!ctx) return;
  const h = ctx.hang.find((x) => x.id === p.id);
  if (!h) return;

  lopChon = document.createElement('div');
  lopChon.dataset.viec = 'tam-chon';
  lopChon.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.45);z-index:33;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622)';

  const hop = document.createElement('div');
  hop.id = 'giapha-tam-chon';
  hop.style.cssText =
    'background:var(--sd-giay,#fffdf9);border-radius:14px;padding:14px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(360, 560) + ';' +
    'max-height:' + caoHop(88) + ';display:flex;flex-direction:column;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28)';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Ai trong cây là ' + (fullName(p) || '(chưa có tên)') + '?';
  tieuDe.style.cssText = 'flex:0 0 auto;font-size:17px;font-weight:600;line-height:1.35';
  const phu = document.createElement('div');
  phu.style.cssText = 'flex:0 0 auto;font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:3px';
  phu.textContent = 'dòng của file  ·  ' +
    [doiSongNguoi(p), p.id].filter((x) => x !== '').join('  ·  ');
  hop.append(tieuDe, phu);

  let oTim = null;
  if (ctx.dsCay.length > NGUONG_O_LOC) {
    oTim = document.createElement('input');
    oTim.type = 'search';
    oTim.dataset.viec = 'tim-trong-cay';
    oTim.style.cssText =
      'flex:0 0 auto;box-sizing:border-box;width:100%;height:38px;' +
      'margin-top:10px;padding:0 10px;font-size:16px;font-family:inherit;' +
      'color:inherit;border:1px solid var(--sd-vien,#d8d0c6);border-radius:8px;background:var(--sd-giay,#fff)';
    oTim.placeholder = 'Gõ tên hoặc mã để tìm…';
    oTim.setAttribute('aria-label', 'Tìm người trong cây');
    oTim.autocomplete = 'off';
    hop.append(oTim);
  }

  const dem = document.createElement('div');
  dem.dataset.viec = 'dem-loc';
  dem.style.cssText = 'flex:0 0 auto;font-size:11px;color:var(--sd-chu-phu,#8a8078);margin-top:6px';
  hop.append(dem);

  const day = document.createElement('div');
  day.dataset.viec = 'day-chon';
  day.style.cssText =
    'flex:1 1 auto;overflow:auto;overscroll-behavior:contain;margin-top:6px;' +
    'display:flex;flex-direction:column;gap:6px;-webkit-overflow-scrolling:touch';
  hop.append(day);

  const chon = (giaTri) => {
    datChon(p.id, giaTri, 'tay');
    dongTamChon();
    tinhLai();
  };

  const veLai = () => {
    day.textContent = '';
    const dangChon = ctx.chon.get(p.id) || '';
    const chu = oTim ? oTim.value : '';
    const con = locDs(ctx.dsCay, chu);

    day.append(veMucChon('', '— chưa quyết —', dangChon, chon));
    day.append(veMucChon(MOI, 'Chưa có trong cây — thêm mới', dangChon, chon));

    const daBay = new Set();
    if (dangChon && dangChon !== MOI && !con.some((x) => x.id === dangChon)) {
      day.append(veMucChon(dangChon, nhanTrongCay(dangChon), dangChon, chon));
      daBay.add(dangChon);
    }

    const cat = chu.trim() === '' ? CAT_KHI_TRONG : con.length;
    let n = 0;
    for (const x of con) {
      if (daBay.has(x.id)) continue;
      if (n >= cat) break;
      day.append(veMucChon(x.id, x.nhan, dangChon, chon));
      n++;
    }

    dem.textContent = chu.trim() !== ''
      ? (con.length === 0
          ? 'Không ai khớp — thử gõ ít chữ hơn'
          : 'còn ' + con.length + ' / ' + ctx.dsCay.length + ' người')
      : (con.length > cat
          ? 'Đang hiện ' + cat + ' người đầu trong ' + con.length +
            '. Gõ tên hoặc mã vào ô trên để tìm đúng người bạn cần.'
          : con.length + ' người trong cây');
  };

  if (oTim) {
    oTim.addEventListener('input', veLai);
    oTim.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const con = locDs(ctx.dsCay, oTim.value);
      if (con.length === 1) chon(con[0].id);
    });
  }
  veLai();

  const huy = nut('Huỷ — giữ nguyên lời khai cũ', false, () => dongTamChon());
  huy.dataset.viec = 'huy-tam-chon';
  huy.style.cssText += ';flex:0 0 auto;margin-top:10px';
  hop.append(huy);

  lopChon.addEventListener('click', (e) => {
    if (e.target === lopChon) dongTamChon();
  });
  ngheEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); dongTamChon(); } };
  document.addEventListener('keydown', ngheEsc);

  lopChon.append(hop);
  document.body.append(lopChon);
  if (oTim) oTim.focus();
}

function veMucChon(giaTri, chu_, dangChon, chon) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.muc = giaTri;
  const dang = giaTri !== '' && giaTri === dangChon;
  b.style.cssText =
    'display:block;width:100%;box-sizing:border-box;text-align:left;flex:0 0 auto;' +
    'min-height:42px;padding:10px 12px;font-size:14px;font-family:inherit;' +
    'line-height:1.4;border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (dang
      ? 'border:2px solid var(--sd-xanh,#2a6a4a);background:var(--sd-xanh-nen,#f2f8f4);color:var(--sd-chu,#2a2622);font-weight:600'
      : 'border:1px solid var(--sd-vien,#e6e0d8);background:var(--sd-giay,#fff);color:var(--sd-chu,#2a2622)');
  b.textContent = (dang ? '✓  ' : '') + chu_;
  if (dang) b.setAttribute('aria-current', 'true');
  b.addEventListener('click', () => chon(giaTri));
  return b;
}

function dongTamChon() {
  if (ngheEsc) { document.removeEventListener('keydown', ngheEsc); ngheEsc = null; }
  if (!lopChon) return;
  lopChon.remove();
  lopChon = null;
}

function locDs(ds, tuKhoa) {
  const kim = removeDiacritics(String(tuKhoa || '')).trim();
  if (kim === '') return ds;
  return ds.filter((x) => x.tim.indexOf(kim) !== -1);
}

function nguoiTrongCay() {
  const cay = state.tree;
  const ds = [];
  for (const p of (cay && Array.isArray(cay.persons) ? cay.persons : [])) {
    if (!p || !p.id || p.deleted === true) continue;
    const ten = fullName(p) || '(chưa có tên)';
    const nam = doiSongNguoi(p);
    ds.push({
      id: p.id,
      ten,
      nhan: ten + (nam ? '  ·  ' + nam : '') + '  ·  ' + p.id,
      tim: removeDiacritics(ten + ' ' + p.id),
    });
  }
  ds.sort((a, b) => a.ten.localeCompare(b.ten, 'vi') || a.id.localeCompare(b.id));
  return ds;
}

function datChon(id, giaTri, nguon) {
  ctx.chon.set(id, giaTri);
  if (giaTri === '') ctx.nguon.delete(id);
  else ctx.nguon.set(id, nguon);

  const h = ctx.hang.find((x) => x.id === id);
  if (h) matNut(h);
}

function tinhLai() {
  if (!ctx || !lopPhu) return;
  const cay = state.tree;
  const imported = ctx.imported;

  const neoTay = [];
  const khaiMoi = [];
  const banDo = new Map();
  let soKhaiTay = 0;
  for (const [id, v] of ctx.chon) {
    const ng = ctx.nguon.get(id);
    if (v === MOI) { khaiMoi.push(id); continue; }
    if (v === '') continue;
    banDo.set(id, v);
    if (ng === 'tay' || ng === LAN) neoTay.push({ trongFile: id, trongCay: v });
    if (ng === 'tay') soKhaiTay++;
  }

  const vong1 = detectDuplicates(cay, imported, { diemNeoTay: neoTay, khaiMoi });

  const coTheSuyCap = vong1.duocTron && soKhaiTay > 0;

  let kq = vong1;
  ctx.tuyChon = { diemNeoTay: neoTay.slice(), khaiMoi: khaiMoi.slice() };
  if (coTheSuyCap) {
    for (const ca of vong1.caTrung) {
      if (ca.kieu === 'nguoi') banDo.set(ca.idTrongFile, ca.id);
    }
    const capSuyRa = goiYCapTheoNguoi(cay, imported, banDo);
    const daSuy = new Set(capSuyRa.map((x) => x.trongFile));
    const daQuyet = (id) => banDo.has(id) || khaiMoi.includes(id);

    const capMoi = [];
    for (const u of (Array.isArray(imported.unions) ? imported.unions : [])) {
      if (!u || !u.id || daSuy.has(u.id)) continue;
      const bd = Array.isArray(u.partners) ? u.partners : [];
      if (bd.every(daQuyet)) capMoi.push(u.id);
    }

    ctx.tuyChon = {
      diemNeoTay: neoTay.concat(capSuyRa),
      khaiMoi: khaiMoi.concat(capMoi),
    };
    kq = detectDuplicates(cay, imported, ctx.tuyChon);
  }

  ctx.banDoDaChot = new Map(banDo);
  for (const ca of kq.caTrung) {
    if (ca.kieu === 'nguoi') ctx.banDoDaChot.set(ca.idTrongFile, ca.id);
  }
  ctx.khaiMoiHienTai = khaiMoi.slice();

  hienDeXuat(kq);
  hienDem();
  hienNutDeXuat();
  hienKetQua(kq);
}

function chayDeXuat() {
  if (!ctx) return;
  const ds = lanTheoQuanHe(state.tree, ctx.imported,
    ctx.banDoDaChot || new Map(), ctx.khaiMoiHienTai || []);
  ctx.duongDi = new Map();
  for (const x of ds) {
    if (ctx.chon.get(x.trongFile) !== '') continue;
    datChon(x.trongFile, x.trongCay, LAN);
    ctx.duongDi.set(x.trongFile, x);
  }
  for (const [id, v] of [...ctx.chon]) {
    if (v === '') datChon(id, MOI, LAN);
  }
  ctx.daBamDeXuat = true;
  tinhLai();
}

function xoaDeXuat() {
  if (!ctx) return false;
  let co = false;
  for (const [id, ng] of [...ctx.nguon]) {
    if (ng !== LAN) continue;
    ctx.chon.set(id, '');
    ctx.nguon.delete(id);
    const h = ctx.hang.find((x) => x.id === id);
    if (h) matNut(h);
    co = true;
  }
  if (ctx.duongDi) ctx.duongDi.clear();
  ctx.daBamDeXuat = false;
  return co;
}

function demDeXuat() {
  let n = 0;
  for (const ng of ctx.nguon.values()) if (ng === LAN) n++;
  return n;
}

function hienNutDeXuat() {
  const o = ctx.oDeXuat;
  o.innerHTML = '';

  const soLan = demDeXuat();
  if (soLan > 0) {
    let soNoi = 0;
    for (const [id, ng] of ctx.nguon) {
      if (ng === LAN && ctx.chon.get(id) !== MOI) soNoi++;
    }
    const hop = document.createElement('div');
    hop.dataset.viec = 'khoi-de-xuat';
    hop.style.cssText =
      'margin-top:12px;padding:10px 12px;border:1px dashed var(--sd-vang-vien,#b8a888);' +
      'border-radius:9px;background:var(--sd-giay,#fdfaf2);font-size:13px;line-height:1.6';
    hop.append(
      dongChu('App đã tự chọn ' + soLan + ' dòng: ' + soNoi + ' dòng nối vào ' +
              'người có sẵn, ' + (soLan - soNoi) + ' dòng để là người mới.'),
      dongChu('Hãy RÀ LẠI những dòng nét đứt. Thấy dòng nào sai thì tự chọn ' +
              'lại ở cột phải — chọn tay thì dòng ấy hết nét đứt.'));

    const ke = document.createElement('div');
    ke.dataset.viec = 'ke-de-xuat';
    ke.style.cssText = 'margin-top:6px;font-size:12px;color:var(--sd-chu-vua,#6a6058)';
    for (const [id, x] of (ctx.duongDi || new Map())) {
      if (ctx.nguon.get(id) !== LAN) continue;
      ke.append(dongChu('· ' + tenFile(id) + ' → ' + tenCay(x.trongCay)
        + '   (suy từ ' + x.qua + ' của ' + tenFile(x.tuNguoi) + ')'));
    }
    hop.append(ke);

    const bo = nut('Bỏ hết, tự chọn lại từ đầu', false,
      () => { xoaDeXuat(); tinhLai(); });
    bo.dataset.viec = 'bo-de-xuat';
    bo.style.marginTop = '10px';
    hop.append(bo);
    o.append(hop);
    return;
  }

  let conTrong = 0;
  for (const v of ctx.chon.values()) if (v === '') conTrong++;
  if (conTrong === 0) return;

  const coNeo = (ctx.banDoDaChot && ctx.banDoDaChot.size > 0);
  const b = nut('Để app chọn nốt ' + conTrong + ' dòng còn lại', false,
    () => { if (coNeo) chayDeXuat(); });
  b.dataset.viec = 'de-xuat-ket-noi';
  b.disabled = !coNeo;
  b.style.marginTop = '12px';
  if (!coNeo) {
    b.style.cursor = 'default';
    b.style.background = 'var(--sd-nen-nhat,#eae4dc)';
    b.style.color = 'var(--sd-chu-phu,#8a8078)';
  }
  o.append(b);

  const chu_ = document.createElement('div');
  chu_.dataset.viec = 'chu-duoi-de-xuat';
  chu_.style.cssText = 'margin-top:6px;font-size:12px;line-height:1.6;color:var(--sd-chu-phu,#8a8078)';
  chu_.textContent = coNeo
    ? 'App đi theo bố mẹ · vợ chồng · con từ những người bạn đã khai. Ai còn ' +
      'đúng một người khớp thì nối vào người ấy; ai không thì để là người mới. ' +
      'Chọn xong bạn rà lại một lượt rồi mới bấm Hợp nhất.'
    : 'Khai đúng một người ở cột phải trước đã. Chưa có điểm neo nào thì app ' +
      'không có chỗ nào để bắt đầu lan.';
  o.append(chu_);
}

function tenFile(id) {
  const p = ctx.imported.persons.find((x) => x && x.id === id);
  return p ? (fullName(p) || '(chưa có tên)') : String(id || '');
}

function tenCay(id) {
  const cay = state.tree;
  const ds = (cay && Array.isArray(cay.persons)) ? cay.persons : [];
  const p = ds.find((x) => x && x.id === id);
  return p ? (fullName(p) || '(chưa có tên)') + ' (' + id + ')' : String(id || '');
}

function hienDeXuat(kq) {
  const deXuat = new Map();
  for (const ca of kq.caTrung) {
    if (ca.kieu === 'nguoi' && ca.neo !== 'tay') deXuat.set(ca.idTrongFile, ca.id);
  }
  for (const id of kq.nguoiMoi) if (!deXuat.has(id)) deXuat.set(id, MOI);

  for (const h of ctx.hang) {
    const ng = ctx.nguon.get(h.id);
    const giuNguyen = (ng === 'tay' || ng === LAN);
    if (!giuNguyen) {
      const g = deXuat.get(h.id);
      if (g === undefined) datChon(h.id, '', 'may');
      else datChon(h.id, g, 'may');
    }
    veDangHang(h);
  }
}

function veDangHang(h) {
  const ng = ctx.nguon.get(h.id);
  const trong = ctx.chon.get(h.id) === '';
  const laLan = ng === LAN;

  h.el.style.borderLeft = laLan ? '3px dashed #b8a888' : '';
  h.el.style.paddingLeft = laLan ? '8px' : '';
  h.el.style.background = laLan ? 'var(--sd-vang-nen,#fdfaf2)' : '';
  h.o.style.borderStyle = laLan ? 'dashed' : 'solid';
  h.o.style.borderColor = laLan ? 'var(--sd-vang-vien,#b8a888)' : 'var(--sd-vien,#e6e0d8)';

  if (trong) { h.nhan.textContent = ''; return; }
  if (laLan) {
    h.nhan.textContent = 'app tự chọn — hãy rà lại';
    h.nhan.style.color = 'var(--sd-vang,#8a6a2a)';
    return;
  }
  const tay = ng === 'tay';
  h.nhan.textContent = tay ? 'bạn khai' : 'app nhận ra';
  h.nhan.style.color = tay ? 'var(--sd-xanh,#2a6a4a)' : 'var(--sd-chu-phu,#8a8078)';
}

function moTaFile(id) {
  const p = ctx.imported.persons.find((x) => x && x.id === id);
  if (p) return (fullName(p) || '(chưa có tên)') + ' (' + id + ')';
  const u = (Array.isArray(ctx.imported.unions) ? ctx.imported.unions : [])
    .find((x) => x && x.id === id);
  return u ? 'gia đình ' + id : String(id || '(dòng trống)');
}

function hienDem() {
  let tay = 0;
  let may = 0;
  let lan = 0;
  let trong = 0;
  for (const [id, v] of ctx.chon) {
    const ng = ctx.nguon.get(id);
    if (ng === LAN) { lan++; continue; }
    if (v === '') trong++;
    else if (ng === 'tay') tay++;
    else may++;
  }
  ctx.oTinh.innerHTML = '';
  ctx.oTinh.append(dongChu(
    'Bạn khai: ' + tay + ' · App nhận ra: ' + may + ' · Chưa quyết: ' + trong));
  if (lan > 0) {
    const d = dongChu('App tự chọn, cần bạn rà lại: ' + lan);
    d.style.color = 'var(--sd-vang,#8a6a2a)';
    ctx.oTinh.append(d);
  }
}

const LY_DO_CHAN = {
  cayRong:
    'Gia phả đang mở chưa có ai, nên không có người nào để khai điểm neo. ' +
    'Đường đúng của ca này là nút “Tạo gia phả mới và ghi vào đó” ở màn ' +
    'Nhập GEDCOM/Excel.',
  chuaKhaiDiemNeo:
    'Chưa khai điểm neo nào. Chọn ở cột phải đúng một người mà bạn chắc chắn ' +
    'là cùng một con người với dòng bên trái. Nếu file này KHÔNG có ai đã ' +
    'nằm trong gia phả — một nhánh hoàn toàn mới — thì bổ sung là sai cửa: ' +
    'hãy đóng bảng này và dùng nút “Tạo gia phả mới và ghi vào đó”.',
  neoSai:
    'Có dòng khai chưa dùng được. Sai một dòng thì chặn cả lần nhập — khai ' +
    'bốn dòng mà chỉ ba dòng được dùng là điều bạn cần biết TRƯỚC khi ghi.',
  neoMauThuan:
    'Bạn và app đang chỉ vào hai người khác nhau. Một trong hai bên sai, và ' +
    'app KHÔNG tự chọn bên nào.',
  neoVoLy:
    'Bộ điểm neo bạn vừa khai KHÔNG THỂ đúng: nó mâu thuẫn với quan hệ gia ' +
    'đình đang có trong cây. Từng dòng sai được kể ngay dưới đây — sửa lại ' +
    'ở cột phải rồi app tự kiểm lại.',
};

function khongDoiGiCa(t) {
  return !!t && t.soNguoiMoi === 0 && t.soCapMoi === 0 && t.soBoSung === 0;
}

function hienKetQua(kq) {
  const o = ctx.oKetQua;
  o.innerHTML = '';

  if (!kq.duocTron) {
    o.append(veLoiNhan(LY_DO_CHAN[kq.lyDoChan] || kq.loi ||
                       'Chưa hợp nhất được.',
                       kq.lyDoChan === 'neoMauThuan' || kq.lyDoChan === 'neoVoLy'));
    for (const l of kq.loiNeoTay) {
      o.append(veLoiNhan('· ' + moTaFile(l.trongFile) + ': ' + l.vi, true));
    }
    veNutTron(o, false);
    return;
  }

  o.append(veNhanKhoi('Nếu hợp nhất bây giờ'));

  const t = kq.thongKe;
  const so = document.createElement('div');
  so.dataset.viec = 'tom-tat-ghep';
  so.style.cssText =
    'padding:10px 12px;border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;' +
    'background:var(--sd-nen,#faf8f5);font-size:13px;line-height:1.7';
  so.append(
    dongChu('· ' + t.soCaNguoi + ' người đã có sẵn — bổ sung thêm chi tiết'),
    dongChu('· ' + t.soCaCap + ' gia đình đã có sẵn'),
    dongChu('· ' + t.soNguoiMoi + ' người mới · ' + t.soCapMoi + ' gia đình mới'),
  );
  o.append(so);

  if (khongDoiGiCa(t)) {
    const nhac = veLoiNhan(
      'Bấm nút bên dưới cũng KHÔNG thêm được ai: cả ' + t.soCaTrung +
      ' bản ghi trong file đều đã có trong gia phả, và không ô nào đang ' +
      'trống được điền thêm. Gia phả sẽ y nguyên. Bấm chỉ để ghi lại bảng ' +
      'ghép đôi này cho lần nhập sau.', false);
    nhac.dataset.viec = 'khong-them-duoc-gi';
    o.append(nhac);
  }

  const xung = kq.caTrung.filter((c) => c.mauThuan.length > 0);
  if (xung.length > 0) {
    o.append(veNhanKhoi('Chỗ hai bên nói khác nhau'));
    const k = document.createElement('div');
    k.dataset.viec = 'mau-thuan-ghep';
    k.style.cssText =
      'padding:9px 11px;border:1px solid var(--sd-do-vien,#f0d8d0);border-radius:8px;' +
      'background:var(--sd-do-nen,#fbf0ec);color:var(--sd-do,#8a3a2a);font-size:12px;line-height:1.7';
    for (const c of xung) {
      k.append(dongChu(c.tenDangCo + ' (' + c.id + ')'));
      for (const m of c.mauThuan) {
        const d = dongChu('    · ' + m.nhan + ': đang có “' + m.dangCo +
                          '” · file ghi “' + m.trongFile + '”');
        d.style.color = '#6a4a40';
        k.append(d);
      }
    }
    o.append(k);
  }

  if (Array.isArray(kq.ngo) && kq.ngo.length > 0) {
    o.append(veNhanKhoi('Đáng ngó lại — không chặn'));
    const n = document.createElement('div');
    n.dataset.viec = 'ngo-ghep';
    n.style.cssText =
      'padding:9px 11px;border:1px solid var(--sd-vang-vien,#ede0c8);border-radius:8px;' +
      'background:var(--sd-vang-nen,#fdf8ec);color:var(--sd-vang,#7a5f2a);font-size:12px;line-height:1.7';
    for (const x of kq.ngo) {
      n.append(dongChu('· ' + moTaFile(x.trongFile) + ': ' + x.vi));
    }
    o.append(n);
  }

  if (t.soChuaNeo > 0) {
    o.append(veLoiNhan('Còn ' + t.soChuaNeo + ' bản ghi chưa quyết. Mỗi dòng ' +
      'bên trái phải có một câu trả lời thì mới hợp nhất được.', false));
  }
  veNutTron(o, t.soChuaNeo === 0, t);
}

function veNutTron(o, sanSang, thongKe) {
  const chay = sanSang && !!ctx.khiTron;
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.viec = 'tron-vao-cay';
  b.disabled = !chay;
  b.textContent = 'Hợp nhất vào gia phả đang mở';
  b.style.cssText =
    'display:block;width:100%;margin:14px auto 0;min-height:44px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;line-height:1.35;border-radius:9px;' +
    'touch-action:manipulation;' +
    (chay
      ? 'cursor:pointer;background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622)'
      : 'cursor:default;background:var(--sd-nen-nhat,#eae4dc);color:var(--sd-chu-phu,#8a8078);border:1px solid var(--sd-vien,#e6e0d8)');
  if (chay) {
    b.addEventListener('click', () => {
      if (b.disabled) return;
      b.disabled = true;
      b.textContent = 'Đang hợp nhất…';
      oLoi.textContent = '';
      oLoi.style.display = 'none';

      Promise.resolve(ctx.khiTron(ctx.tuyChon, thongKe)).then((kq2) => {
        if (!ctx || !lopPhu || !b.isConnected) return;
        if (kq2 && kq2.ok) return;
        b.disabled = false;
        b.textContent = 'Hợp nhất vào gia phả đang mở';
        oLoi.textContent = (kq2 && kq2.loi) || 'Chưa hợp nhất được, và chưa ghi gì.';
        oLoi.style.display = '';
      });
    });
  }
  o.append(b);

  const oLoi = veLoiNhan('', true);
  oLoi.dataset.viec = 'loi-tron';
  oLoi.style.display = 'none';
  o.append(oLoi);

  const chu_ = document.createElement('div');
  chu_.dataset.viec = 'chu-duoi-nut-tron';
  chu_.style.cssText =
    'margin-top:8px;font-size:12px;line-height:1.6;color:var(--sd-chu-phu,#8a8078)';
  chu_.textContent = !chay
    ? 'Ghép xong cả bảng thì đây là chỗ ghi thật.'
    : khongDoiGiCa(thongKe)
      ? 'Lần bấm này không thêm ai và không sửa ô nào — nó chỉ cất bảng ghép ' +
        'đôi vào sổ nhập. Gia phả giữ nguyên.'
      : 'Bấm là ghi thật, và KHÔNG có nút hoàn tác. Chỗ nào hai bên nói khác ' +
        'nhau thì giữ nguyên của gia phả đang mở — nhập chỉ điền vào ô còn trống.';
  o.append(chu_);
  ctx.nutTron = b;
}

function veNhanKhoi(chu_) {
  const d = document.createElement('div');
  d.textContent = chu_;
  d.style.cssText =
    'margin-top:16px;margin-bottom:6px;font-size:14px;font-weight:600';
  return d;
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
    'display:block;width:100%;margin-left:auto;margin-right:auto;min-height:42px;' +
    'padding:8px 14px;max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;' +
    'font-family:inherit;line-height:1.35;border-radius:9px;cursor:pointer;' +
    'touch-action:manipulation;' +
    (chinh ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
           : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
  b.addEventListener('click', chay);
  return b;
}

function veLoiNhan(chu_, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu_;
  d.style.cssText =
    'margin-top:10px;padding:10px 12px;border-radius:9px;font-size:12px;' +
    'line-height:1.6;border:1px solid ' + (laLoi ? 'var(--sd-do-vien,#f0d8d0)' : 'var(--sd-vien,#e6e0d8)') + ';' +
    'background:' + (laLoi ? 'var(--sd-do-nen,#fbf0ec)' : 'var(--sd-nen,#faf8f5)') + ';' +
    'color:' + (laLoi ? 'var(--sd-do,#8a3a2a)' : 'var(--sd-chu-phu,#8a8078)');
  return d;
}
