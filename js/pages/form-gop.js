import { N, KIEU_NUT_CHON, KIEU_NUT_CHAN, KIEU_LOP_PHU, KIEU_HOP,
         closePersonForm, canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi,
         keTenPartner, tenNguoi, veNhan, moHopBao, dangKyDonDep } from './form-nen.js';
import { state } from '../state.js';
import { timCapTrung, timXungDotGop, mergeUnions, rankCua } from '../domains/union.js';
import { validateAll } from '../domains/validate.js';
import { getMediaFor } from '../domains/media.js';
import { buildIndex } from '../utils/graph.js';
import { coGiaTri } from '../utils/text.js';
import { nhanTrangThaiCap, RONG_NUT_TOI_DA } from '../config.js';

dangKyDonDep(donDepGop);

let gopCtx = null;

export function donDepGop() {
  gopCtx = null;
}

export function openMergeForm(unionIdA, unionIdB, xuLy = {}) {
  if (!state.tree || !state.index) return;

  const muc = timCapTrung(state.tree).find(
    (x) => (x.unionA === unionIdA && x.unionB === unionIdB) ||
           (x.unionA === unionIdB && x.unionB === unionIdA));

  if (!muc) {
    moHopBao('Hai cặp này không còn trùng nhau',
             'Có thể một trong hai cặp vừa được sửa hoặc vừa vào thùng rác. Mở ' +
             'lại Rà soát để xem bản mới nhất.', false);
    return;
  }

  const uGiu  = state.index.unionById.get(muc.unionA);
  const uBoDi = state.index.unionById.get(muc.unionB);
  if (!uGiu || !uBoDi) return;

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'gopCap';

  gopCtx = {
    giu:   muc.unionA,
    boDi:  muc.unionB,
    loai:  muc.loai,
    chon:  moTapChonMacDinh(uGiu, uBoDi),
    dsAnh: getMediaFor(state.tree, muc.unionB),
  };
  if (gopCtx.dsAnh.length > 0) gopCtx.chon.media = 'chuyen';

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-gop';
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Gộp hai cặp trùng';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = gopCtx.giu + '  +  ' + gopCtx.boDi;
  phu.style.cssText =
    'font-size:12px;color:var(--sd-chu-mo,#b3aaa0);margin-top:3px;letter-spacing:.03em;line-height:1.45';

  const than = document.createElement('div');
  than.id = 'giapha-gop-than';

  hop.append(tieuDe, phu, than);

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChanGop(!canTro));

  veThan(than);

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

function moTapChonMacDinh(uGiu, uBoDi) {
  const xd = timXungDotGop(uGiu, uBoDi);
  const chon = {};
  if (xd.status)        chon.status        = maTrangThai(uGiu);
  if (xd.note)          chon.note          = String(uGiu.note || '');
  if (xd.marriageRaw)   chon.marriageRaw   = String((uGiu.marriage || {}).raw || '');
  if (xd.marriagePlace) chon.marriagePlace = String((uGiu.marriage || {}).place || '');
  for (const id of xd.ranks) chon['rank:' + id] = rankCua(uGiu, id);
  return chon;
}

function veThan(than) {
  const uGiu  = state.index.unionById.get(gopCtx.giu);
  const uBoDi = state.index.unionById.get(gopCtx.boDi);
  if (!uGiu || !uBoDi) return;

  than.innerHTML = '';
  than.append(loiMo(uGiu, uBoDi));

  const xd = timXungDotGop(uGiu, uBoDi);

  if (xd.status) {
    than.append(...veCauHoi('Tình trạng hôn nhân', 'status',
      [maTrangThai(uGiu), maTrangThai(uBoDi)].map((ma) => ({
        gt: ma, chu: nhanTrangThaiCap(ma),
      })), than));
  }

  if (xd.marriageRaw) {
    than.append(...veCauHoi('Ngày cưới', 'marriageRaw',
      [(uGiu.marriage || {}).raw, (uBoDi.marriage || {}).raw]
        .map((v) => ({ gt: String(v || ''), chu: String(v || '') })), than));
  }

  if (xd.marriagePlace) {
    than.append(...veCauHoi('Nơi cưới', 'marriagePlace',
      [(uGiu.marriage || {}).place, (uBoDi.marriage || {}).place]
        .map((v) => ({ gt: String(v || ''), chu: String(v || '') })), than));
  }

  for (const id of xd.ranks) {
    than.append(...veCauHoi('Đây là cặp thứ mấy của ' + tenNguoi(id) + '?',
      'rank:' + id,
      [rankCua(uGiu, id), rankCua(uBoDi, id)].map((n) => ({
        gt: n, chu: 'Thứ ' + n,
      })), than));
  }

  if (xd.note) {
    than.append(...veCauHoi('Ghi chú về cặp này', 'note',
      [uGiu.note, uBoDi.note].map((v) => ({
        gt: String(v || ''), chu: String(v || ''),
      })), than));
  }

  if (gopCtx.dsAnh.length > 0) {
    than.append(...veCauHoi(
      'Ảnh của cặp ' + gopCtx.boDi + ' (' + gopCtx.dsAnh.length + ' tấm)', 'media',
      [{ gt: 'chuyen',     chu: 'Chuyển sang cặp giữ lại' },
       { gt: 'giu-nguyen', chu: 'Để nguyên ở cặp bị xoá' }], than));
  }

  than.append(khoiXemTruoc());
}

function loiMo(uGiu, uBoDi) {
  const d = document.createElement('div');
  d.style.cssText =
    'margin-top:12px;padding:9px 11px;font-size:12px;line-height:1.55;' +
    'border-radius:8px;background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4);color:var(--sd-chu-vua,#5c554e)';

  const c1 = document.createElement('div');
  c1.textContent = 'Giữ lại ' + gopCtx.giu + ' — ' + keTenPartner(gopCtx.giu) +
                   ' (mã cũ hơn). Cặp ' + gopCtx.boDi + ' vào thùng rác.';

  const c2 = document.createElement('div');
  c2.style.cssText = 'margin-top:5px';
  c2.textContent = 'Con cái và người của cả hai cặp đều dồn về cặp giữ lại; ' +
                   'trường nào một bên bỏ trống thì tự lấy bên kia. Lấy lại được ' +
                   'từ thùng rác nếu gộp nhầm.';

  d.append(c1, c2);
  return d;
}

function veCauHoi(nhan, khoa, cacMuc, than) {
  const khoi = document.createElement('div');
  khoi.dataset.hoi = khoa;
  khoi.style.cssText = 'display:flex;gap:8px;margin-top:2px';

  for (const muc of cacMuc) {
    const dangChon = String(gopCtx.chon[khoa]) === String(muc.gt);
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.dataset.chon = String(muc.gt);
    nut.style.cssText = KIEU_NUT_CHON +
      'min-height:44px;padding:8px 10px;text-align:left;line-height:1.4;' +
      (dangChon
        ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
        : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
    nut.textContent = coGiaTri(muc.chu) ? muc.chu : '(để trống)';
    nut.addEventListener('click', () => {
      gopCtx.chon[khoa] = muc.gt;
      veThan(than);
    });
    khoi.append(nut);
  }

  return [veNhan(nhan), khoi];
}

function khoiXemTruoc() {
  const boc = document.createElement('div');
  const thu = mergeUnions(state.tree, gopCtx.giu, gopCtx.boDi, luaChonChoDomain());
  if (!thu) return boc;

  const u = thu.union;
  const soNguoi = (u.partners || []).length;
  const soCon   = (u.children || []).length;
  const m       = u.marriage || {};

  boc.append(veNhan('Sau khi gộp, cặp ' + gopCtx.giu + ' sẽ là'));

  const bang = document.createElement('div');
  bang.id = 'giapha-gop-xem-truoc';
  bang.style.cssText = 'display:flex;flex-direction:column;gap:1px';

  hangXem(bang, 'Người trong cặp', keTenPartner(gopCtx.giu) === '' ? soNguoi + ' người'
                                   : soNguoi + ' người · ' + keTenPartner(gopCtx.giu));
  hangXem(bang, 'Con', soCon === 0 ? 'chưa có' : soCon + ' người con');
  hangXem(bang, 'Tình trạng hôn nhân', nhanTrangThaiCap(maTrangThai(u)));
  hangXem(bang, 'Ngày cưới', m.raw);
  hangXem(bang, 'Nơi cưới', m.place);
  hangXem(bang, 'Ghi chú', u.note);

  boc.append(bang);
  return boc;
}

function hangXem(bang, nhan, giaTri) {
  if (!coGiaTri(giaTri)) return;

  const hang = document.createElement('div');
  hang.dataset.xem = nhan;
  hang.style.cssText =
    'display:flex;gap:10px;align-items:baseline;padding:6px 0;' +
    'border-top:1px solid var(--sd-vien-nhat,#f0ebe4)';

  const n = document.createElement('div');
  n.textContent = nhan;
  n.style.cssText = 'flex:0 0 72px;font-size:12px;line-height:1.35;color:var(--sd-chu-phu,#8a8078)';

  const g = document.createElement('div');
  g.textContent = String(giaTri);
  g.style.cssText = 'flex:1 1 auto;font-size:14px;line-height:1.45;word-break:break-word';

  hang.append(n, g);
  bang.append(hang);
}

function luaChonChoDomain() {
  const c  = gopCtx.chon;
  const lc = {};

  if (c.status !== undefined) lc.status = c.status;
  if (c.note   !== undefined) lc.note   = c.note;

  if (c.marriageRaw !== undefined || c.marriagePlace !== undefined) {
    lc.marriage = {};
    if (c.marriageRaw   !== undefined) lc.marriage.raw   = c.marriageRaw;
    if (c.marriagePlace !== undefined) lc.marriage.place = c.marriagePlace;
  }

  const ranks = {};
  for (const khoa of Object.keys(c)) {
    if (khoa.indexOf('rank:') === 0) ranks[khoa.slice(5)] = c[khoa];
  }
  if (Object.keys(ranks).length > 0) lc.ranks = ranks;

  if (c.media !== undefined) lc.media = c.media;

  return lc;
}

function veChanGop(luuDuoc) {
  const chan = document.createElement('div');
  chan.style.cssText =
    'display:flex;gap:8px;margin-top:18px;position:sticky;bottom:-18px;' +
    'padding:10px 0;background:var(--sd-giay,#fffdf9);justify-content:center';

  N.nutLuu = document.createElement('button');
  N.nutLuu.type = 'button';
  N.nutLuu.textContent = 'Gộp hai cặp';
  N.nutLuu.disabled = !luuDuoc;
  N.nutLuu.style.cssText = KIEU_NUT_CHAN +
    'flex:1 1 auto;max-width:' + RONG_NUT_TOI_DA + ';' +
    'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600' +
    (luuDuoc ? '' : ';opacity:.45;cursor:not-allowed');
  if (luuDuoc) N.nutLuu.addEventListener('click', () => chayGop());

  const huy = document.createElement('button');
  huy.type = 'button';
  huy.textContent = 'Huỷ';
  huy.style.cssText = KIEU_NUT_CHAN +
    'flex:0 0 auto;background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)';
  huy.addEventListener('click', () => closePersonForm());

  chan.append(N.nutLuu, huy);
  return chan;
}

async function chayGop() {
  if (!gopCtx || N.dangLuu) return;

  const canTro = canTroLuu();
  if (canTro) { hienNhan(canTro, true); return; }

  const kq = mergeUnions(state.tree, gopCtx.giu, gopCtx.boDi, luaChonChoDomain());
  if (!kq) {
    hienNhan('Không gộp được — hai cặp này không còn trùng nhau nữa. Đóng lại, ' +
             'chạy Rà soát một lần rồi thử lại.', true);
    return;
  }

  const capXoa = kq.tree.unions.find((u) => u && u.id === kq.unionXoa);

  let anh = null;
  if (gopCtx.chon.media === 'chuyen' && gopCtx.dsAnh.length > 0) {
    const maAnh = new Set(gopCtx.dsAnh.map((m) => m.id));
    anh = {
      themVao: [],
      goRa: (kq.tree.media || []).filter((m) => m && maAnh.has(m.id)),
    };
  }

  const indexMoi = buildIndex(kq.tree);
  const raSoat   = validateAll(kq.tree, indexMoi, 'union', { unionId: gopCtx.giu });

  if (!raSoat.canSave) {
    hienNhan('Chưa gộp được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  if (raSoat.warnings.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn gộp';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn gộp" nếu bạn biết là đúng:', false,
             raSoat.warnings.map((m) => m.message));
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang gộp…', false);

  const soAnh = anh ? anh.goRa.length : 0;
  const ketQua = await ghiBanGhi(null, [kq.union, capXoa], {
    action: 'merge',
    target: gopCtx.giu,
    note:   'Gộp cặp ' + gopCtx.boDi + ' vào ' + gopCtx.giu + ' — ' +
            keTenPartner(gopCtx.giu) + '.' +
            (soAnh > 0 ? ' Chuyển ' + soAnh + ' ảnh sang cặp giữ lại.' : ''),
    diff:   kq.diff,
  }, anh);

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hai cặp VẪN như cũ, chưa cặp nào bị đụng vào.');
    return;
  }

  const giu = gopCtx.giu;
  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(giu);
  closePersonForm();
}

function maTrangThai(u) {
  return (u && u.status === 'divorced') ? 'divorced' : ((u && u.status) || 'married');
}
