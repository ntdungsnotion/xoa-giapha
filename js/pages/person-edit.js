import { N, o, KIEU_O, KIEU_NUT_CHON, KIEU_NUT_CHAN, KIEU_LOP_PHU, KIEU_HOP,
         TEN_QUAN_HE, closePersonForm, canTroLuu, moHopTrang, moHopChon, moHopBao,
         hienNhan, hienLoiGhi, nutChon, nutChanXoa, gaiTruocChan, veNhan, veNhanO, oChu,
         oNhieuDong, oNgay, khoiNgayCua, docO, veChan, gopRaSoat, ghiBanGhi, tenNguoi, tenTrongCay,
         keTenPartner, tenBanDoiTrongCap, soPartner, moTaCap, maTrangThaiCap, chonCap,
         khoiHoiThuBac, docThuBacNhap, loiThuBacGoSai, xoaThuBacNhap, dangKyDonDep }
         from './form-nen.js';
import { unlink } from './form-go-noi.js';
import { xoaNguoi } from './form-xoa.js';
import { veKhoiAnh, apThayDoiAnh, keThayDoiAnh } from './form-anh.js';
import { state } from '../state.js';
import { updatePerson, createPerson } from '../domains/person.js';
import { createUnion, addChild, addPartner, reorderChildren, thuTuConTheoTuoi,
         updateUnion, updateChildRelation, getParentUnions, getPartnerUnions,
         getSpouses, getChildren, rankCua, timCapTrung } from '../domains/union.js';
import { validateAll } from '../domains/validate.js';
import { luuCay, suaDuoc, timNguoiMoiCay, docNguoiTheoMa,
         nopDeNghiQuanHe } from '../services/repo.js';
import { ganGoiY, dongNguoiCayKhac } from './quan-tri/o-goi-y.js';
import { buildIndex } from '../utils/graph.js';
import { fullName, coGiaTri, matchesSearch } from '../utils/text.js';
import { parseLooseDate, stampNow } from '../utils/date.js';
import { LOAI_TEN_PHU, nhanLoaiTenPhu, QUAN_HE_CON_NHAN, nhanQuanHeCon, TRANG_THAI_CAP,
         nhanTrangThaiCap } from '../config.js';

let noiVao     = null;
let daXemThuTu = false;
let sapXepLai  = false;
let noiCtx     = null;

const CAN_KEO_NGUOI_XUYEN_CAY = true;
let nguoiCoSanChon = null;
let bocCaNhanKhoa  = null;
let khoaGioiGoc    = false;
let gioiGoc        = null;

let tenPhu    = [];
let khoiTenPhu = null;

let quanHe    = null;

let chonChaMe  = null;
let khoiThuBac = null;
let khoiHon    = null;
let conSanCo   = [];

function donDepNguoi() {
  noiVao         = null;
  daXemThuTu     = false;
  sapXepLai      = false;
  noiCtx         = null;
  tenPhu         = [];
  khoiTenPhu     = null;
  quanHe         = null;
  chonChaMe      = null;
  khoiThuBac     = null;
  khoiHon        = null;
  conSanCo       = [];
  nguoiCoSanChon = null;
  bocCaNhanKhoa  = null;
  khoaGioiGoc    = false;
  gioiGoc        = null;
}
dangKyDonDep(donDepNguoi);

const NGUOI_TRONG = {
  names: [], sex: 'U',
  birth: { iso: null, raw: '', place: '' },
  death: { iso: null, raw: '', place: '' },
  burialPlace: '', living: true, note: '',
};

const GIOI = [
  { ma: 'M', chu: 'Nam' },
  { ma: 'F', chu: 'Nữ' },
  { ma: 'U', chu: 'Chưa rõ' },
];

export function openPersonForm(personId, xuLy = {}) {
  const nguoi = personId && state.index && state.index.personById.get(personId);
  if (!nguoi) return;
  moForm('sua', nguoi, null, xuLy);
}

export function quickAddChild(vao, xuLy = {}) {
  const nv = chuanNoiVao(vao);
  if (!nv) return;
  moForm('themCon', NGUOI_TRONG, nv, xuLy);
}

export function themNguoiDauTien(xuLy = {}) {
  moForm('themDauTien', NGUOI_TRONG, null, xuLy);
}

function chuanNoiVao(vao) {
  const index = state.index;
  if (!index) return null;

  const v = (typeof vao === 'string') ? { unionId: vao } : (vao || {});
  if (v.unionId && index.unionById.has(v.unionId)) return { unionId: v.unionId };
  if (v.chaMeId && index.personById.has(v.chaMeId)) return { chaMeId: v.chaMeId };

  if (v.mocId && index.personById.has(v.mocId)) {
    const ds = getPartnerUnions(index, v.mocId).filter((u) => !capCoNguoiNgoaiCay(u));
    return ds.length === 0
      ? { mocId: v.mocId, chaMeId: v.mocId }
      : { mocId: v.mocId, unionId: ds[0].id };
  }
  return null;
}

function moForm(che, nguoi, chonNoi, xuLy) {
  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = che;
  noiVao    = chonNoi;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-nguoi';
  hop.style.cssText = KIEU_HOP;

  hop.append(veDauForm(nguoi));
  hop.append(...veCacO(nguoi));

  hop.append(...veKhoiXoaNguoi(nguoi));

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChan(() => luuForm(nguoi), !canTro, laCheDoThem() ? tieuDeForm() : 'Lưu'));

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

function luuForm(nguoi) {
  if (N.cheDo === 'themCon') handleAddChild();
  else if (N.cheDo === 'themChaMe' || N.cheDo === 'themBanDoi') handleAddNguoiThan();
  else if (N.cheDo === 'themDauTien') handleAddDauTien();
  else handleSave(nguoi);
}

function laCheDoThem() {
  return N.cheDo === 'themCon' || N.cheDo === 'themChaMe' ||
         N.cheDo === 'themBanDoi' || N.cheDo === 'themDauTien';
}

function tieuDeForm() {
  if (N.cheDo === 'themCon')     return 'Thêm người con';
  if (N.cheDo === 'themBanDoi')  return 'Thêm vợ / chồng';
  if (N.cheDo === 'themDauTien') return 'Thêm người đầu tiên';
  if (N.cheDo === 'themChaMe') return 'Thêm cha / mẹ';
  return 'Sửa hồ sơ';
}

function veDauForm(nguoi) {
  const dau = document.createElement('div');
  const them = laCheDoThem();

  const tieuDe = document.createElement('div');
  tieuDe.textContent = tieuDeForm();
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const ten = document.createElement('div');
  ten.textContent = them ? moTaChoNoi() : (fullName(nguoi) + '  ·  ' + nguoi.id);
  ten.style.cssText = 'font-size:12px;color:var(--sd-chu-mo,#b3aaa0);margin-top:3px;letter-spacing:.03em;line-height:1.45';

  dau.append(tieuDe, ten);
  return dau;
}

function moTaChoNoi() {
  const index = state.index;

  if (N.cheDo === 'themDauTien') {
    return 'Gia phả này chưa có ai. Người vừa nhập sẽ đứng giữa sơ đồ, và ' +
           'mọi người sau đó nối vào từ chính họ.';
  }

  if (!noiVao || !index) return '';

  if (N.cheDo === 'themChaMe') {
    if (!noiVao.unionId) {
      return 'Cha / mẹ của ' + tenNguoi(noiVao.childId) +
             ' — app sẽ tạo thêm một cặp cha mẹ mới rồi nối ' +
             tenNguoi(noiVao.childId) + ' vào đó làm con.';
    }
    return 'Cha / mẹ của ' + tenNguoi(noiVao.childId) +
           ' — đứng chung cặp với ' + keTenPartner(noiVao.unionId) +
           '  ·  ' + noiVao.unionId;
  }

  if (N.cheDo === 'themBanDoi') {
    return 'Vợ / chồng của ' + tenNguoi(noiVao.banDoiId) + '.';
  }

  if (noiVao.mocId) return 'Con của ' + tenNguoi(noiVao.mocId) + '.';

  if (noiVao.chaMeId) {
    return 'Con của ' + tenNguoi(noiVao.chaMeId) +
           ' — người này chưa có vợ/chồng nào trong gia phả, nên app sẽ tạo ' +
           'thêm một cặp mới cho riêng họ.';
  }

  return 'Con của ' + keTenPartner(noiVao.unionId) + '  ·  ' + noiVao.unionId;
}

function veCacO(nguoi) {
  const ra = [];
  const ten = mucTenChinh(nguoi);

  const coODaCo = CAN_KEO_NGUOI_XUYEN_CAY && laCheDoThem();
  if (coODaCo && N.cheDo !== 'themCon') ra.push(...khoiTimNguoiCoSan());

  if (N.cheDo === 'themCon') {
    ra.push(...khoiChonChaMe());
    if (coODaCo) ra.push(...khoiTimNguoiCoSan());
    ra.push(veNhan('Quan hệ với cặp này'));
    ra.push(oQuanHeMoi('Quan hệ của người con với cặp này', 'con'));
  }
  if (N.cheDo === 'themChaMe' && !noiVao.unionId) {
    ra.push(veNhan('Quan hệ với ' + tenNguoi(noiVao.childId)));
    ra.push(oQuanHeMoi('Quan hệ của cha / mẹ này với ' + tenNguoi(noiVao.childId),
                       'chaMe'));
  }

  if (N.cheDo === 'themBanDoi') {
    ra.push(...khoiConSanCo());
    khoiThuBac = document.createElement('div');
    veLaiThuBac();
    ra.push(khoiThuBac);
    ra.push(...khoiHonNhan());
  }

  if (N.cheDo === 'sua') {
    ra.push(veNhan('Ảnh'));
    ra.push(veKhoiAnh(nguoi.id, nguoi));
  }

  const chiSoCaNhanBatDau = ra.length;

  ra.push(veNhan('Tên'));
  const hangTen = document.createElement('div');
  hangTen.style.cssText = 'display:flex;gap:6px';
  hangTen.append(
    oChu('surname', 'Họ',  ten.surname, 'Họ',  1),
    oChu('middle',  'Đệm', ten.middle,  'Đệm', 1),
    oChu('given',   'Tên', ten.given,   'Tên', 1.2),
  );
  ra.push(hangTen);

  ra.push(veNhan('Tên khác'));
  ra.push(veKhoiTenPhu(nguoi));

  ra.push(veNhan('Giới tính'));
  const khoaGioi = N.cheDo === 'themBanDoi' && !!(noiVao && noiVao.gioiNguoc);
  khoaGioiGoc = khoaGioi;
  gioiGoc     = nguoi.sex;
  ra.push(veChonGioi(nguoi.sex, khoaGioi));
  if (khoaGioi) ra.push(veDongGioi(noiVao.gioiMoc, noiVao.gioiNguoc, tenNguoi(noiVao.banDoiId)));

  ra.push(veNhan('Sinh'));
  ra.push(oNgay('birth', nguoi.birth));
  ra.push(oChu('birthPlace', 'Nơi sinh', khoiNgayCua(nguoi.birth).place, 'Làng Vân, Hà Nam'));

  ra.push(veNhan('Mất'));
  ra.push(oNgay('death', nguoi.death));
  ra.push(oChu('deathPlace', 'Nơi mất', khoiNgayCua(nguoi.death).place, ''));
  ra.push(oChu('burialPlace', 'Nơi an táng', nguoi.burialPlace, ''));
  ra.push(oChu('gio', 'Ngày giỗ (âm lịch)',
               (nguoi.vn && nguoi.vn.gio) || '', '20 tháng Chạp'));
  ra.push(veConSong(nguoi.living === true));

  ra.push(veNhan('Chi'));
  ra.push(oChu('chi', 'Chi / nhánh',
               (nguoi.vn && nguoi.vn.branch) || '', 'Chi Giáp'));

  ra.push(veNhan('Cuộc đời'));
  ra.push(oChu('title',      'Chức tước, phẩm hàm', nguoi.title,      'Cử nhân, Chánh tổng'));
  ra.push(oChu('occupation', 'Nghề nghiệp',         nguoi.occupation, 'Làm ruộng, dạy học'));
  ra.push(oChu('education',  'Học vấn',             nguoi.education,  'Tú tài'));
  ra.push(oChu('religion',   'Tôn giáo',            nguoi.religion,   'Thờ cúng tổ tiên'));
  ra.push(oChu('residence',  'Quê quán / nơi ở (khác nơi sinh)', nguoi.residence,
               'Hà Nam — nơi sống lâu nhất'));
  ra.push(oChu('nationality', 'Dân tộc',            nguoi.nationality, 'Kinh'));
  ra.push(oChu('contact',    'Liên hệ',             nguoi.contact,    'Điện thoại, email, Zalo…'));

  ra.push(veNhan('Ghi chú'));
  ra.push(oNhieuDong('note', nguoi.note,
                     'Chuyện gia đình cần nhớ, điều không có ô riêng…'));

  if (laCheDoThem()) {
    const phanCaNhan = ra.splice(chiSoCaNhanBatDau);
    bocCaNhanKhoa = document.createElement('div');
    bocCaNhanKhoa.append(...phanCaNhan);
    ra.push(bocCaNhanKhoa);
    capNhatKhoaCaNhan();
  }

  if (N.cheDo === 'sua') ra.push(...veKhoiQuanHe(nguoi));

  return ra;
}

function khoiTimNguoiCoSan() {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:4px';

  const oNhap = document.createElement('input');
  oNhap.type = 'text';
  oNhap.placeholder = 'Bỏ trống nếu là người mới — gõ tên hoặc mã để tìm người đã có';
  oNhap.style.cssText = KIEU_O;
  oNhap.setAttribute('aria-label', 'Tìm người đã có trong hệ thống');

  const the = document.createElement('div');
  let dangNap = false;
  let loiNap  = '';

  function veThe() {
    the.innerHTML = '';
    if (!nguoiCoSanChon) return;
    const hang = document.createElement('div');
    hang.style.cssText =
      'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;' +
      'padding:9px 11px;border:1px solid var(--sd-vang-vien,#cdbf98);border-radius:9px;' +
      'background:var(--sd-vang-nen,#fbf6e8);font-size:12px;line-height:1.5';

    const chu = document.createElement('span');
    chu.style.cssText = 'flex:1 1 200px;min-width:0';
    chu.textContent = '✓ Dùng người đã có: ' + nguoiCoSanChon.ten +
      ' (' + nguoiCoSanChon.id + ')' +
      (nguoiCoSanChon.cacCay ? ' — đã có ở: ' + nguoiCoSanChon.cacCay : '');

    const bo = document.createElement('button');
    bo.type = 'button';
    bo.textContent = 'Bỏ chọn, tự nhập người mới';
    bo.style.cssText =
      'margin-left:auto;padding:3px 9px;font-size:11px;white-space:nowrap;' +
      'border:1px solid var(--sd-vang-vien,#cdbf98);border-radius:6px;background:var(--sd-giay,#fffdf9);cursor:pointer';
    bo.addEventListener('click', () => {
      nguoiCoSanChon = null;
      loiNap = '';
      dangNap = false;
      oNhap.value = '';
      dienTuNguoiCoSan(NGUOI_TRONG);
      veThe();
      capNhatKhoaCaNhan();
    });

    hang.append(chu, bo);
    the.append(hang);

    const duoi = document.createElement('div');
    duoi.style.cssText =
      'margin-top:5px;font-size:11px;line-height:1.5;color:var(--sd-chu-vua,#6a625a)';
    duoi.textContent = dangNap
      ? 'Đang đọc hồ sơ của người này từ máy chủ…'
      : (loiNap
        ? '⚠ ' + loiNap + ' Vẫn nối được, chỉ là không xem trước được hồ sơ.'
        : 'Hồ sơ bên dưới lấy từ cơ sở dữ liệu và KHÔNG sửa ở đây được — ' +
          'một người chỉ có một bản ghi cho mọi gia phả. Muốn sửa thì thêm ' +
          'xong, mở hồ sơ người ấy ra sửa; sửa ở đâu cũng hiện ở mọi cây.');
    the.append(duoi);
  }

  const nhac = document.createElement('div');
  nhac.style.cssText = 'margin-top:5px;font-size:12px;line-height:1.5;color:var(--sd-vang,#8a5a2b)';
  const nhacNguoiTrongCay = (chuoi) => {
    nhac.textContent = '';
    const kim = String(chuoi || '').trim();
    if (kim.length < 2 || !state.index) return;
    const thay = [...state.index.personById.values()].filter((p) =>
      p.id.toLowerCase() === kim.toLowerCase() || matchesSearch(fullName(p), kim)).slice(0, 3);
    if (thay.length === 0) return;
    nhac.textContent = thay.map((p) => fullName(p) + ' (' + p.id + ')').join(', ') +
      ' đã có trong gia phả này nên ô này không liệt kê. Muốn nối làm vợ/chồng, ' +
      'cha mẹ hay con: đóng form, bấm vào ô của người này trên sơ đồ → 🔗 Kết nối.';
  };

  ganGoiY(oNhap, {
    tim: async (chuoi) => {
      const kq = await timNguoiMoiCay(chuoi);
      const ds = kq.ok ? kq.ds : [];
      if (ds.length === 0) nhacNguoiTrongCay(chuoi); else nhac.textContent = '';
      return ds;
    },
    ve: dongNguoiCayKhac,
    giaTri: (m) => m.ten,
    khiChon: (m) => {
      nguoiCoSanChon = { id: m.maNguoi, ten: m.ten, cacCay: m.cacCay, gioi: m.gioi };
      veThe();
      capNhatKhoaCaNhan();
      napDayDu(m.maNguoi);
    },
  });

  async function napDayDu(ma) {
    dangNap = true;
    veThe();
    let kq;
    try {
      kq = await docNguoiTheoMa(ma);
    } catch (e) {
      kq = { ok: false, loi: e && e.message ? e.message : String(e) };
    }
    dangNap = false;
    if (!nguoiCoSanChon || nguoiCoSanChon.id !== ma) return;

    if (!kq.ok || !kq.nguoi) {
      loiNap = kq.loi || 'Không đọc được hồ sơ của người này.';
      veThe();
      return;
    }
    loiNap = '';
    nguoiCoSanChon.gioi = kq.nguoi.sex || nguoiCoSanChon.gioi;
    dienTuNguoiCoSan(kq.nguoi);
    veThe();
    capNhatKhoaCaNhan();
  }

  boc.append(oNhap, nhac, the);
  return [veNhan('Người này đã có trong hệ thống chưa?'), boc];
}

function dienTuNguoiCoSan(nguoi) {
  const ten = mucTenChinh(nguoi);
  datO('surname', ten.surname);
  datO('middle',  ten.middle);
  datO('given',   ten.given);

  tenPhu = docTenPhu(nguoi);
  veLaiTenPhu();

  if (o.sex && typeof o.sex.datKhoa === 'function') o.sex.datKhoa(true, nguoi.sex || 'U');

  const sinh = khoiNgayCua(nguoi.birth);
  const mat  = khoiNgayCua(nguoi.death);
  datO('birth',      sinh.raw);
  datO('birthPlace', sinh.place);
  datO('death',      mat.raw);
  datO('deathPlace', mat.place);
  datO('burialPlace', nguoi.burialPlace);
  datO('gio', nguoi.vn && nguoi.vn.gio);
  datO('chi', nguoi.vn && nguoi.vn.branch);

  datO('title',       nguoi.title);
  datO('occupation',  nguoi.occupation);
  datO('education',   nguoi.education);
  datO('religion',    nguoi.religion);
  datO('residence',   nguoi.residence);
  datO('nationality', nguoi.nationality);
  datO('contact',     nguoi.contact);
  datO('note',        nguoi.note);

  if (o.living) o.living.checked = nguoi.living === true;
}

function datO(khoa, giaTri) {
  const el = o[khoa];
  if (!el || typeof el.value !== 'string') return;
  el.value = coGiaTri(giaTri) ? String(giaTri) : '';
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function capNhatKhoaCaNhan() {
  if (bocCaNhanKhoa) {
    const khoa = !!nguoiCoSanChon;
    bocCaNhanKhoa.style.opacity = khoa ? '.88' : '1';
    bocCaNhanKhoa.style.pointerEvents = khoa ? 'none' : 'auto';
    for (const el of bocCaNhanKhoa.querySelectorAll('input, textarea, select')) {
      if (el.tagName === 'SELECT' || el.type === 'checkbox') el.disabled = khoa;
      else el.readOnly = khoa;
      el.style.background = khoa ? 'var(--sd-nen-nhat,#f4efe6)' : 'var(--sd-giay,#fff)';
    }
  }
  if (o.sex && typeof o.sex.datKhoa === 'function') {
    o.sex.datKhoa(nguoiCoSanChon ? true : khoaGioiGoc,
                  nguoiCoSanChon ? (nguoiCoSanChon.gioi || null) : gioiGoc);
  }
}

function veKhoiTenPhu(nguoi) {
  tenPhu = docTenPhu(nguoi);
  khoiTenPhu = document.createElement('div');
  veLaiTenPhu();
  return khoiTenPhu;
}

function docTenPhu(nguoi) {
  const ds = Array.isArray(nguoi.names) ? nguoi.names : [];
  const chinh = ds.find((n) => n && n.type === 'chinh') || ds[0] || null;
  return ds
    .filter((n) => n && n !== chinh)
    .map((n) => ({
      type: coGiaTri(n.type) ? String(n.type) : 'khac',
      goc:  { surname: n.surname || '', middle: n.middle || '', given: n.given || '' },
      chu:  fullName(n),
    }));
}

function veLaiTenPhu() {
  if (!khoiTenPhu) return;
  khoiTenPhu.innerHTML = '';

  tenPhu.forEach((muc, i) => khoiTenPhu.append(veHangTenPhu(muc, i)));

  const them = document.createElement('button');
  them.type = 'button';
  them.textContent = '+ Thêm tên khác';
  them.setAttribute('aria-label', 'Thêm tên khác');
  them.style.cssText = KIEU_NUT_CHAN + 'width:100%;margin-top:6px;text-align:center;' +
    'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px dashed var(--sd-vien,#ddd5ca)';
  them.addEventListener('click', () => {
    tenPhu.push({ type: 'huy', goc: { surname: '', middle: '', given: '' }, chu: '' });
    veLaiTenPhu();
    const oCuoi = khoiTenPhu.querySelector('input[data-ten-phu="' + (tenPhu.length - 1) + '"]');
    if (oCuoi) oCuoi.focus();
  });
  khoiTenPhu.append(them);
}

function veHangTenPhu(muc, i) {
  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;align-items:center';

  const chon = document.createElement('select');
  chon.setAttribute('aria-label', 'Loại tên khác ' + (i + 1));
  chon.style.cssText = KIEU_O + 'width:auto;flex:0 1 auto;min-width:0;padding-right:6px';
  const danhSach = LOAI_TEN_PHU.slice();
  if (!danhSach.some((x) => x.ma === muc.type)) {
    danhSach.push({ ma: muc.type, chu: nhanLoaiTenPhu(muc.type) });
  }
  for (const loai of danhSach) {
    const op = document.createElement('option');
    op.value = loai.ma;
    op.textContent = loai.chu;
    if (loai.ma === muc.type) op.selected = true;
    chon.append(op);
  }
  chon.addEventListener('change', () => { muc.type = chon.value; });

  const o1 = document.createElement('input');
  o1.type = 'text';
  o1.value = muc.chu;
  o1.placeholder = 'Bá';
  o1.setAttribute('aria-label', 'Tên khác ' + (i + 1));
  o1.setAttribute('data-ten-phu', String(i));
  o1.style.cssText = KIEU_O + 'flex:1 1 140px;min-width:0';
  o1.addEventListener('input', () => { muc.chu = o1.value; });

  const bo = document.createElement('button');
  bo.type = 'button';
  bo.textContent = '✕';
  bo.setAttribute('aria-label', 'Bỏ tên khác ' + (i + 1));
  bo.style.cssText =
    'flex:0 0 auto;width:38px;height:38px;font-size:15px;font-family:inherit;' +
    'border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    'background:var(--sd-nen,#faf8f5);color:var(--sd-chu-phu,#8a8078);border:1px solid var(--sd-vien,#e6e0d8)';
  bo.addEventListener('click', () => { tenPhu.splice(i, 1); veLaiTenPhu(); });

  hang.append(chon, o1, bo);
  return hang;
}

function phanTenPhu(muc) {
  const chu = String(muc.chu || '').trim();
  if (chu === fullName(muc.goc)) {
    return Object.assign({ type: muc.type }, muc.goc);
  }
  return { type: muc.type, surname: '', middle: '', given: chu };
}

function veKhoiQuanHe(nguoi) {
  const index = state.index;
  if (!index || !index.personById.has(nguoi.id)) return [];

  quanHe = docQuanHe(index, nguoi.id);
  if (quanHe.chaMe.length === 0 && quanHe.banDoi.length === 0 &&
      quanHe.con.length === 0) {
    quanHe = null;
    return [];
  }

  const ra = [veNhan('Quan hệ')];

  const nhac = document.createElement('div');
  nhac.textContent =
    'Ở đây chỉ SỬA những quan hệ đã có. Thêm hoặc gỡ một người nằm ở vòng ' +
    'tròn — mục Kết nối và Gỡ nối.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
  ra.push(nhac);

  if (quanHe.chaMe.length > 0) {
    ra.push(veNhanNhom('Cha mẹ'));
    quanHe.chaMe.forEach((m, i) => ra.push(veHangChaMe(m, i)));
  }

  if (quanHe.banDoi.length > 0) {
    ra.push(veNhanNhom('Vợ / chồng'));
    quanHe.banDoi.forEach((m, i) => ra.push(veHangBanDoi(m, i)));
    const nhacBac = document.createElement('div');
    nhacBac.textContent =
      'Ô số là THỨ BẬC: 1 là vợ cả / chồng đầu, 2 là vợ thứ hai… Không phải ' +
      'chỗ đứng trái phải trên sơ đồ.';
    nhacBac.style.cssText =
      'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';
    ra.push(nhacBac);
  }

  if (quanHe.con.length > 0) {
    ra.push(veNhanNhom('Con'));
    quanHe.con.forEach((m, i) => ra.push(veHangCon(m, i)));
  }

  return ra;
}

function docQuanHe(index, personId) {
  const ra = { mocId: personId, chaMe: [], banDoi: [], con: [] };

  for (const u of getParentUnions(index, personId)) {
    const muc = (Array.isArray(u.children) ? u.children : [])
      .find((c) => c && c.personId === personId);
    const cu = (muc && muc.relation) || 'birth';
    ra.chaMe.push({ unionId: u.id, ten: keTenPartner(u.id), cu, moi: cu,
                     ngoai: capCoNguoiNgoaiCay(u) });
  }

  const dsCapBanDoi = getPartnerUnions(index, personId);
  const ngoaiTheoCap = new Map(dsCapBanDoi.map((u) => [u.id, capCoNguoiNgoaiCay(u)]));

  for (const u of dsCapBanDoi) {
    const ttCu = maTrangThaiCap(u);
    ra.banDoi.push({
      unionId: u.id,
      ten:     tenBanDoiTrongCap(index, u, personId),
      ttCu, ttMoi: ttCu,
      bacCu:  rankCua(u, personId),
      bacMoi: String(rankCua(u, personId)),
      ngoai:  ngoaiTheoCap.get(u.id) || null,
    });
  }

  for (const m of getChildren(index, personId)) {
    ra.con.push({
      unionId:  m.unionId,
      personId: m.personId,
      ten:      tenNguoi(m.personId),
      cu:       m.relation,
      moi:      m.relation,
      ngoai:    ngoaiTheoCap.get(m.unionId) || null,
    });
  }

  return ra;
}

function veNhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:16px;margin-bottom:2px;font-size:11px;font-weight:600;' +
    'letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078)';
  return d;
}

function veMucQuanHe(ten, cacO) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:12px';

  const d = document.createElement('div');
  d.textContent = ten;
  d.style.cssText =
    'font-size:13px;line-height:1.4;color:var(--sd-chu,#2a2622);margin-bottom:4px;' +
    'overflow-wrap:anywhere';

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px;align-items:center';
  hang.append(...cacO);

  boc.append(d, hang);
  return boc;
}

function oChonQuanHe(nhan, maCu, phia, khiDoi) {
  const chon = document.createElement('select');
  chon.setAttribute('aria-label', nhan);
  chon.style.cssText = KIEU_O + 'width:auto;flex:1 1 auto;min-width:0;padding-right:6px';

  const ds = QUAN_HE_CON_NHAN.slice();
  if (!ds.some((x) => x.ma === maCu)) ds.push({ ma: maCu, con: maCu, chaMe: maCu });

  for (const q of ds) {
    const op = document.createElement('option');
    op.value = q.ma;
    op.textContent = nhanQuanHeCon(q.ma, phia);
    if (q.ma === maCu) op.selected = true;
    chon.append(op);
  }
  chon.addEventListener('change', () => khiDoi(chon.value));
  return chon;
}

function veHangChaMe(m, i) {
  const chon = oChonQuanHe('Quan hệ với cha mẹ ' + (i + 1), m.cu, 'chaMe',
                            (ma) => { m.moi = ma; });
  if (!m.ngoai) return veMucQuanHe(m.ten, [chon]);

  chon.disabled = true;
  const { nut, ghiChu } = veKhoaNgoaiCay('go_con', m.unionId, quanHe.mocId, m.ngoai);
  const muc = veMucQuanHe(m.ten, [chon, nut]);
  muc.append(ghiChu);
  return muc;
}

function veHangCon(m, i) {
  const chon = oChonQuanHe('Quan hệ với con ' + (i + 1), m.cu, 'con', (ma) => { m.moi = ma; });
  if (!m.ngoai) return veMucQuanHe(m.ten, [chon]);

  chon.disabled = true;
  const { nut, ghiChu } = veKhoaNgoaiCay('go_con', m.unionId, m.personId, m.ngoai);
  const muc = veMucQuanHe(m.ten, [chon, nut]);
  muc.append(ghiChu);
  return muc;
}

function veHangBanDoi(m, i) {
  const chon = document.createElement('select');
  chon.setAttribute('aria-label', 'Cặp ' + (i + 1) + ' bây giờ');
  chon.style.cssText = KIEU_O + 'width:auto;flex:1 1 auto;min-width:0;padding-right:6px';

  const CAC = TRANG_THAI_CAP.slice();
  if (!CAC.some((x) => x.ma === m.ttCu)) CAC.push({ ma: m.ttCu, chu: m.ttCu });

  for (const c of CAC) {
    const op = document.createElement('option');
    op.value = c.ma;
    op.textContent = c.chu;
    if (c.ma === m.ttCu) op.selected = true;
    chon.append(op);
  }
  chon.addEventListener('change', () => { m.ttMoi = chon.value; });

  const bac = document.createElement('input');
  bac.type = 'text';
  bac.inputMode = 'numeric';
  bac.value = m.bacMoi;
  bac.setAttribute('aria-label',
    'Đây là cặp thứ mấy của ' + tenNguoi(quanHe ? quanHe.mocId : '') + '?');
  bac.style.cssText = KIEU_O + 'flex:0 0 56px;width:56px;min-width:0;text-align:center';
  bac.addEventListener('input', () => { m.bacMoi = bac.value; });

  if (!m.ngoai) return veMucQuanHe(m.ten, [chon, bac]);

  chon.disabled = true;
  bac.disabled = true;
  const { nut, ghiChu } = veKhoaNgoaiCay('go_vo_chong', m.unionId, m.ngoai.id, m.ngoai);
  const muc = veMucQuanHe(m.ten, [chon, bac, nut]);
  muc.append(ghiChu);
  return muc;
}

function veKhoaNgoaiCay(loai, unionId, personId, ngoai) {
  const tenNgoai = (ngoai && ngoai.p && fullName(ngoai.p)) || (ngoai && ngoai.id) || '';

  const ghiChu = document.createElement('div');
  ghiChu.textContent =
    tenNgoai + ' không thuộc gia phả này nên không sửa được ở đây. Sai thì gửi ' +
    'đề nghị để Quản trị hệ thống gỡ.';
  ghiChu.style.cssText = 'font-size:11px;line-height:1.4;color:var(--sd-chu-phu,#8a8078);margin-top:2px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = '✉ Đề nghị sửa';
  nut.setAttribute('aria-label', 'Đề nghị gỡ quan hệ với ' + tenNgoai);
  nut.style.cssText =
    'flex:0 0 auto;min-height:36px;padding:0 10px;font-size:12px;font-family:inherit;' +
    'border-radius:8px;cursor:pointer;touch-action:manipulation;' +
    'background:var(--sd-nen,#faf8f5);color:var(--sd-chu-vua,#5c554e);border:1px solid var(--sd-vien,#e6e0d8)';

  let boc = null;
  nut.addEventListener('click', () => {
    if (boc) { boc.remove(); boc = null; return; }
    boc = veHopGuiDeNghi(loai, unionId, personId, tenNgoai, () => {
      boc = null;
      nut.disabled = true;
      nut.textContent = '✉ Đã gửi — chờ duyệt';
    });
    ghiChu.after(boc);
  });

  return { nut, ghiChu };
}

function veHopGuiDeNghi(loai, unionId, personId, tenNgoai, khiXong) {
  const boc = document.createElement('div');
  boc.style.cssText =
    'margin-top:6px;padding:8px;border-radius:8px;background:var(--sd-nen,#faf8f5);' +
    'border:1px solid var(--sd-vien,#e6e0d8)';

  const nhan = document.createElement('div');
  nhan.textContent = 'Vì sao quan hệ với ' + tenNgoai + ' cần gỡ?';
  nhan.style.cssText = 'font-size:12px;color:var(--sd-chu-vua,#5c554e);margin-bottom:4px';

  const oLyDo = document.createElement('textarea');
  oLyDo.rows = 2;
  oLyDo.maxLength = 1000;
  oLyDo.placeholder = 'Bắt buộc — Quản trị hệ thống đọc câu này để quyết định.';
  oLyDo.style.cssText = KIEU_O + 'font-family:inherit;resize:vertical';

  const loi = document.createElement('div');
  loi.style.cssText =
    'margin-top:6px;padding:7px 9px;font-size:12px;line-height:1.4;border-radius:7px;' +
    'color:var(--sd-do,#8a3a2a);background:var(--sd-do-nen,#fbf0ec);border:1px solid var(--sd-do-vien,#f0d8d0)';
  loi.hidden = true;

  const bGui = document.createElement('button');
  bGui.type = 'button';
  bGui.textContent = 'Gửi đề nghị';
  bGui.style.cssText = KIEU_NUT_CHAN +
    'flex:1 1 auto;background:var(--sd-vang-dac,#8a6a3a);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-vang,#8a6a3a);font-weight:600';

  const bHuy = document.createElement('button');
  bHuy.type = 'button';
  bHuy.textContent = 'Thôi';
  bHuy.style.cssText = KIEU_NUT_CHAN +
    'flex:0 0 auto;background:var(--sd-giay,#fffdf9);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)';
  bHuy.addEventListener('click', () => boc.remove());

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px;margin-top:6px';
  hang.append(bGui, bHuy);

  bGui.addEventListener('click', async () => {
    const lyDo = oLyDo.value.trim();
    if (!lyDo) {
      loi.textContent = 'Cần ghi lý do trước khi gửi.';
      loi.hidden = false;
      return;
    }
    bGui.disabled = true; bHuy.disabled = true; oLyDo.disabled = true;
    bGui.textContent = 'Đang gửi…';
    loi.hidden = true;

    let kq;
    try { kq = await nopDeNghiQuanHe(loai, unionId, personId, lyDo); }
    catch (e) { kq = { ok: false, loi: (e && e.message) || 'Lỗi không rõ.' }; }

    if (!kq || kq.ok === false) {
      bGui.disabled = false; bHuy.disabled = false; oLyDo.disabled = false;
      bGui.textContent = 'Gửi đề nghị';
      loi.textContent = (kq && (kq.loi || kq.lyDo)) || 'Máy chủ từ chối.';
      loi.hidden = false;
      return;
    }

    if (typeof khiXong === 'function') khiXong();
    boc.remove();
  });

  boc.append(nhan, oLyDo, loi, hang);
  return boc;
}

function apThayDoiQuanHe(cay) {
  const ra = { tree: cay, diff: {}, capDoi: [] };
  if (!quanHe) return ra;

  const theoMa = new Map();
  const nhan = (kq) => {
    if (!kq || !kq.thayDoi) return;
    ra.tree = kq.tree;
    Object.assign(ra.diff, kq.diff);
    theoMa.set(kq.union.id, kq.union);
  };

  for (const m of quanHe.chaMe) {
    if (m.moi === m.cu) continue;
    nhan(updateChildRelation(ra.tree, m.unionId, quanHe.mocId, m.moi));
  }

  for (const m of quanHe.con) {
    if (m.moi === m.cu) continue;
    nhan(updateChildRelation(ra.tree, m.unionId, m.personId, m.moi));
  }

  for (const m of quanHe.banDoi) {
    const changes = {};
    if (m.ttMoi !== m.ttCu) changes.status = m.ttMoi;

    const n = Number(String(m.bacMoi).trim());
    if (Number.isFinite(n) && n > 0 && n !== m.bacCu) changes.ranks = { [quanHe.mocId]: n };

    if (Object.keys(changes).length === 0) continue;
    nhan(updateUnion(ra.tree, m.unionId, changes));
  }

  ra.capDoi = [...theoMa.values()];
  return ra;
}

function keThayDoiQuanHe(qh) {
  if (!qh || qh.capDoi.length === 0) return '';
  const n = qh.capDoi.length;
  return ' Sửa quan hệ ở ' + n + ' cặp.';
}

function veChonGioi(sexHienTai, biKhoa) {
  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px';

  let dangChon = GIOI.some((g) => g.ma === sexHienTai) ? sexHienTai : 'U';
  let khoa = !!biKhoa;
  const cacNut = [];

  const veLai = () => {
    for (const { ma, nut } of cacNut) {
      const chon = ma === dangChon;
      nut.disabled = khoa;
      nut.style.cssText = KIEU_NUT_CHON +
        (khoa ? 'cursor:not-allowed;opacity:.5;' : '') +
        (chon
          ? 'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622);font-weight:600'
          : 'background:var(--sd-nen,#faf8f5);color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8)');
    }
  };

  for (const g of GIOI) {
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.textContent = g.chu;
    nut.addEventListener('click', () => { if (!khoa) { dangChon = g.ma; veLai(); } });
    cacNut.push({ ma: g.ma, nut });
    hang.append(nut);
  }
  veLai();

  o.sex = {
    value: '',
    doc: () => dangChon,
    datKhoa: (dong, ma) => { khoa = !!dong; if (ma) dangChon = ma; veLai(); },
  };
  return hang;
}

function veDongGioi(gioiMoc, gioiNguoc, tenMoc) {
  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hop = document.createElement('input');
  hop.type = 'checkbox';
  hop.checked = false;
  hop.style.cssText = 'width:18px;height:18px;accent-color:var(--sd-chu,#2a2622)';
  hop.addEventListener('change', () => {
    if (o.sex && typeof o.sex.datKhoa === 'function') {
      o.sex.datKhoa(!hop.checked, hop.checked ? gioiMoc : gioiNguoc);
    }
  });
  o.dongGioi = hop;

  const chu = document.createElement('span');
  chu.textContent = 'Hôn nhân đồng giới — cùng giới với ' + tenMoc;

  nhan.append(hop, chu);
  return nhan;
}

function veConSong(dangSong) {
  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:10px;padding:9px 11px;' +
    'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hop = document.createElement('input');
  hop.type = 'checkbox';
  hop.checked = dangSong === true;
  hop.style.cssText = 'width:18px;height:18px;accent-color:var(--sd-chu,#2a2622)';
  o.living = hop;

  const chu = document.createElement('span');
  chu.textContent = 'Người này còn sống';

  nhan.append(hop, chu);
  return nhan;
}

function oQuanHeMoi(nhan, phia) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px;display:flex';

  const chon = oChonQuanHe(nhan, 'birth', phia, () => {});
  o.quanHe = chon;

  boc.append(chon);
  return boc;
}

function docQuanHeMoi() {
  const v = o.quanHe ? String(o.quanHe.value || '') : '';
  return QUAN_HE_CON_NHAN.some((x) => x.ma === v) ? v : 'birth';
}

function veKhoiXoaNguoi(nguoi) {
  if (N.cheDo !== 'sua' || !nguoi || !nguoi.id) return [];
  if (!suaDuoc()) return [];

  const vach = document.createElement('div');
  vach.style.cssText = 'margin-top:22px;border-top:1px solid var(--sd-vien-nhat,#f0ebe4);padding-top:14px';

  const nhan = document.createElement('div');
  nhan.textContent = 'Xoá khỏi gia phả';
  nhan.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--sd-chu-phu,#8a8078);margin-bottom:6px';

  const giai = document.createElement('div');
  giai.textContent =
    'Xoá mềm: bản ghi vẫn nằm nguyên trong file, chỉ mang thêm một cái cờ, và ' +
    'sơ đồ thôi vẽ ra. Lấy lại được bất cứ lúc nào từ thùng rác.';
  giai.style.cssText = 'font-size:12px;line-height:1.5;color:var(--sd-chu-phu,#8a8078);margin-bottom:8px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'xoa-nguoi';
  nut.textContent = 'Xoá ' + tenNguoi(nguoi.id) + ' khỏi gia phả';
  nut.style.cssText = KIEU_NUT_CHAN +
    'width:100%;text-align:center;' +
    'background:var(--sd-do-nen,#fbf0ec);color:var(--sd-do,#8a3a2a);border:1px solid var(--sd-do-vien,#f0d8d0);font-weight:600';

  nut.addEventListener('click', () => {
    const xuLy = N.xuLyNgoai;
    closePersonForm();
    xoaNguoi(nguoi.id, xuLy);
  });

  vach.append(nhan, giai, nut);
  return [vach];
}

async function handleSave(nguoi) {
  if (N.dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  const thayDoi = gomThayDoi();

  const kq = updatePerson(state.tree, nguoi.id, thayDoi, { boi, luc });
  if (!kq) { hienNhan('Không tìm thấy bản ghi của người này nữa. Tải lại trang rồi thử lại.', true); return; }

  const anh       = apThayDoiAnh(kq.tree, nguoi.id, { boi, luc });
  const sauAnh    = anh ? anh.tree   : kq.tree;
  const nguoiCuoi = anh ? anh.person : kq.person;

  const qh        = apThayDoiQuanHe(sauAnh);
  const cayCuoi   = qh.tree;
  const diffCuoi  = Object.assign({}, kq.diff, anh ? anh.diff : null, qh.diff);

  if (!kq.thayDoi && !anh && qh.capDoi.length === 0) {
    hienNhan('Chưa có gì thay đổi so với bản đang lưu, nên không cần lưu lại.', false);
    return;
  }

  const indexMoi = buildIndex(cayCuoi);
  const raSoat = validateAll(cayCuoi, indexMoi, 'person', { personId: nguoi.id });

  if (!raSoat.canSave) {
    hienNhan('Chưa lưu được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  if (raSoat.warnings.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn lưu';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn lưu" nếu bạn biết là đúng:', false,
             raSoat.warnings.map((m) => m.message));
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const nguoiMoi = nguoiCuoi;
  const anhThem  = anh ? anh.themVao : [];
  const anhGoRa  = anh ? anh.goRa    : [];
  const capMoi   = qh.capDoi;
  let ketQua;
  try {
    ketQua = await luuCay(
      (cay) => {
        const ds = Array.isArray(cay.persons) ? cay.persons : [];
        const i = ds.findIndex((p) => p && p.id === nguoi.id);
        if (i >= 0) ds[i] = JSON.parse(JSON.stringify(nguoiMoi));

        for (const u of capMoi) {
          if (!Array.isArray(cay.unions)) cay.unions = [];
          const j = cay.unions.findIndex((x) => x && x.id === u.id);
          if (j >= 0) cay.unions[j] = JSON.parse(JSON.stringify(u));
        }

        if (anhThem.length > 0 || anhGoRa.length > 0) {
          if (!Array.isArray(cay.media)) cay.media = [];
        }

        for (const m of anhThem) {
          if (cay.media.some((x) => x && x.id === m.id)) {
            throw new Error('Mã ảnh ' + m.id + ' vừa được dùng cho một tấm khác. ' +
                            'Tải lại trang rồi gắn ảnh lại.');
          }
          cay.media.push(JSON.parse(JSON.stringify(m)));
        }

        for (const m of anhGoRa) {
          const k = cay.media.findIndex((x) => x && x.id === m.id);
          if (k >= 0) cay.media[k] = JSON.parse(JSON.stringify(m));
        }
      },
      {
        action: 'update',
        target: nguoi.id,
        note:   'Sửa hồ sơ ' + fullName(nguoiMoi) + ' bằng form nhập liệu.' +
                keThayDoiAnh(anh) +
                keThayDoiQuanHe(qh),
        diff:   diffCuoi,
      }
    );
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(nguoi.id);
    return;
  }

  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';

  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa đúng bản ghi này trong lúc bạn đang gõ — có ' +
             'thể họ sửa từ một gia phả khác cùng chứa người ấy — nên app KHÔNG ' +
             'ghi đè lên bản của họ. Thay đổi của bạn chưa được lưu. Chép lại ' +
             'phần vừa gõ ra chỗ khác, tải lại trang, rồi sửa lại.', true);
    return;
  }
  hienNhan((ketQua && ketQua.loi) || 'Chưa lưu được, mà máy chủ không nói rõ vì sao.', true);
}

async function handleAddChild() {
  if (N.dangLuu) return;

  const luc    = stampNow();
  const boi    = (state.phien && state.phien.email) || '';
  const quanHe = docQuanHeMoi();

  if (noiVao && (await keoQuaQuanHeCu('con', noiVao.chaMeId, quanHe)) !== undefined) return;

  const dung = dungCayThemCon(state.tree, gomThayDoi(), quanHe, { boi, luc });
  if (!dung) {
    hienNhan('Không nối được người con vào chỗ này. Có thể gia phả vừa thay đổi ' +
             'trong lúc form đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }

  const thuTu = thuTuConTheoTuoi(dung.tree, dung.union.id);
  const lechThuTu = !!(thuTu && !thuTu.hopLe && thuTu.daDoi.indexOf(dung.person.id) >= 0);

  if (lechThuTu && sapXepLai) {
    const kqSap = reorderChildren(dung.tree, dung.union.id, thuTu.thuTuMoi);
    if (kqSap) {
      dung.tree  = kqSap.tree;
      dung.union = kqSap.union;
      Object.assign(dung.diff, kqSap.diff);
    }
  }

  const indexMoi = buildIndex(dung.tree);
  const raSoat = gopRaSoat(
    raSoatNguoiKhiThem(dung.tree, indexMoi, dung.person.id),
    validateAll(dung.tree, indexMoi, 'child',
                { childId: dung.person.id, unionId: dung.union.id })
  );

  if (!raSoat.canSave) {
    hienNhan('Chưa thêm được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  const canhBao = loiNhacCuaForm().concat(raSoat.warnings.map((m) => m.message));
  if (canhBao.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn thêm';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn thêm" nếu bạn biết là đúng:', false, canhBao);
    return;
  }

  if (lechThuTu && !daXemThuTu) {
    hoiThuTuAnhEm(thuTu, dung);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const nguoiMoi = dung.person;
  const unionMoi = dung.union;
  const tenMoi   = nguoiCoSanChon ? nguoiCoSanChon.ten
    : (coGiaTri(fullName(nguoiMoi)) ? fullName(nguoiMoi) : nguoiMoi.id);

  let ketQua;
  try {
    ketQua = await luuCay(
      (cay) => {
        if (!Array.isArray(cay.persons)) cay.persons = [];
        if (!Array.isArray(cay.unions))  cay.unions  = [];

        if (!nguoiCoSanChon) {
          if (cay.persons.some((p) => p && p.id === nguoiMoi.id)) {
            throw new Error('Mã ' + nguoiMoi.id + ' vừa được dùng cho một người khác. ' +
                            'Tải lại trang rồi thêm lại.');
          }
          cay.persons.push(JSON.parse(JSON.stringify(nguoiMoi)));
        }

        const i = cay.unions.findIndex((u) => u && u.id === unionMoi.id);
        if (i >= 0) cay.unions[i] = JSON.parse(JSON.stringify(unionMoi));
        else        cay.unions.push(JSON.parse(JSON.stringify(unionMoi)));
      },
      {
        action: 'create',
        target: nguoiMoi.id,
        note:   'Thêm ' + (quanHe === 'adopted' ? 'con nuôi ' : 'người con ') + tenMoi +
                ' vào ' + unionMoi.id +
                (dung.laUnionMoi ? ' (cặp mới, tạo cùng lúc)' : '') +
                (nguoiCoSanChon ? ' — người ĐÃ CÓ ở cây khác, kéo vào (b124a).'
                                : ' bằng form nhập liệu.'),
        diff:   dung.diff,
      }
    );
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(nguoiMoi.id);
    return;
  }

  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';

  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa đúng bản ghi này trong lúc bạn đang gõ — có ' +
             'thể họ sửa từ một gia phả khác cùng chứa người ấy — nên app KHÔNG ' +
             'ghi đè lên bản của họ. Người con này CHƯA được thêm. Chép lại ' +
             'phần vừa gõ ra chỗ khác, tải lại trang, rồi thêm lại.', true);
    return;
  }
  hienNhan((ketQua && ketQua.loi) || 'Chưa thêm được, mà máy chủ không nói rõ vì sao.', true);
}

async function handleAddDauTien() {
  if (N.dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  const kqP = taoHoacDungNguoi(state.tree, gomThayDoi(), { boi, luc });
  if (!kqP) {
    hienNhan('Không dựng được bản ghi. Tải lại trang rồi thử lại.', true);
    return;
  }

  const indexMoi = buildIndex(kqP.tree);
  const raSoat   = raSoatNguoiKhiThem(kqP.tree, indexMoi, kqP.person.id);

  if (!raSoat.canSave) {
    hienNhan('Chưa thêm được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  const canhBao = loiNhacCuaForm().concat(raSoat.warnings.map((m) => m.message));
  if (canhBao.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn thêm';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn thêm" nếu bạn biết là đúng:',
             false, canhBao);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const nguoiMoi = kqP.person;
  const tenMoi   = nguoiCoSanChon ? nguoiCoSanChon.ten
    : (coGiaTri(fullName(nguoiMoi)) ? fullName(nguoiMoi) : nguoiMoi.id);

  let ketQua;
  try {
    ketQua = await luuCay(
      (cay) => {
        if (!Array.isArray(cay.persons)) cay.persons = [];

        if (!nguoiCoSanChon) {
          if (cay.persons.some((p) => p && p.id === nguoiMoi.id)) {
            throw new Error('Mã ' + nguoiMoi.id + ' vừa được dùng cho một người khác. ' +
                            'Tải lại trang rồi thêm lại.');
          }
          cay.persons.push(JSON.parse(JSON.stringify(nguoiMoi)));
        }

        if (!cay.tree || typeof cay.tree !== 'object') cay.tree = {};
        if (!cay.tree.rootPersonId) cay.tree.rootPersonId = nguoiMoi.id;
      },
      {
        action: 'create',
        target: nguoiMoi.id,
        note:   'Thêm người đầu tiên của gia phả: ' + tenMoi +
                (nguoiCoSanChon ? ' — người ĐÃ CÓ ở cây khác, kéo vào (b124a).' : '.'),
        diff:   kqP.diff,
      }
    );
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(nguoiMoi.id);
    return;
  }

  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';

  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa đúng bản ghi này trong lúc bạn đang gõ — có ' +
             'thể họ sửa từ một gia phả khác cùng chứa người ấy — nên app KHÔNG ' +
             'ghi đè lên bản của họ. Người này CHƯA được thêm. Tải lại trang ' +
             'rồi xem lại — có thể họ đã thêm người đầu tiên rồi.', true);
    return;
  }
  hienNhan((ketQua && ketQua.loi) || 'Chưa thêm được, mà máy chủ không nói rõ vì sao.', true);
}

function dungNguoiCoSan(tree, id) {
  if (!tree || !Array.isArray(tree.persons) || !id) return null;
  if (tree.persons.some((p) => p && p.id === id)) return null;
  const stub = { id, deleted: false };
  return { tree: Object.assign({}, tree, { persons: tree.persons.concat([stub]) }),
           person: stub, diff: {} };
}

function quanHeDaCoSan(loai, mocId, nguoiId, quanHe) {
  const ds = (state.tree && Array.isArray(state.tree.unions)) ? state.tree.unions : [];
  const laCon = (u, id) => Array.isArray(u.children) && u.children.some((c) =>
    c && c.personId === id && (c.relation || 'birth') === (quanHe || 'birth'));
  const laCap = (u, id) => Array.isArray(u.partners) && u.partners.includes(id);
  return ds.find((u) => u && !u.deleted && (
    loai === 'banDoi' ? laCap(u, mocId) && laCap(u, nguoiId)
    : loai === 'chaMe' ? laCap(u, nguoiId) && laCon(u, mocId)
    : laCap(u, mocId) && laCon(u, nguoiId))) || null;
}

async function keoQuaQuanHeCu(loai, mocId, quanHe) {
  if (!nguoiCoSanChon) return undefined;
  const u = quanHeDaCoSan(loai, mocId, nguoiCoSanChon.id, quanHe);
  if (!u) return undefined;
  const banGhi = ((state.tree && state.tree.vanhDai) || []).find((p) => p && p.id === nguoiCoSanChon.id);
  if (!banGhi) return undefined;

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);
  const ketQua = await ghiBanGhi(banGhi, [], {
    action: 'create',
    target: banGhi.id,
    note:   'Kéo ' + nguoiCoSanChon.ten + ' vào gia phả này — quan hệ với ' +
            tenNguoi(mocId) + ' đã có sẵn ở ' + u.id + ', không khai lại.',
    diff:   {},
  });
  N.dangLuu = false;
  if (!N.lopPhu) return ketQua;
  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(banGhi.id);
    return ketQua;
  }
  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';
  hienLoiGhi(ketQua, 'Người này CHƯA được thêm.');
  return ketQua;
}

function taoHoacDungNguoi(tree, thayDoi, ghiNhan) {
  return nguoiCoSanChon ? dungNguoiCoSan(tree, nguoiCoSanChon.id)
                        : createPerson(tree, thayDoi, ghiNhan);
}

function dungCayThemCon(cay, thayDoi, quanHe, ghiNhan) {
  if (!cay || !noiVao) return null;

  let tree = cay;
  let unionId = noiVao.unionId || '';
  const diff = {};

  if (!unionId) {
    const kqU = createUnion(tree, [noiVao.chaMeId], {});
    if (!kqU) return null;
    tree = kqU.tree;
    unionId = kqU.union.id;
    Object.assign(diff, kqU.diff);
  }

  const kqP = taoHoacDungNguoi(tree, thayDoi, ghiNhan);
  if (!kqP) return null;
  tree = kqP.tree;
  Object.assign(diff, kqP.diff);

  const kqC = addChild(tree, unionId, kqP.person.id, quanHe);
  if (!kqC) return null;
  tree = kqC.tree;
  Object.assign(diff, kqC.diff);

  return {
    tree,
    person:     kqP.person,
    union:      kqC.union,
    laUnionMoi: !noiVao.unionId,
    diff,
  };
}

function raSoatNguoiKhiThem(tree, index, personId) {
  if (nguoiCoSanChon) {
    return { canSave: true, errors: [], warnings: [], skipped: [],
             counts: { total: 0, ok: 0, error: 0, warning: 0, skip: 0 } };
  }
  return validateAll(tree, index, 'person', { personId });
}

function hoiThuTuAnhEm(thuTu, dung) {
  const ten = (id) => tenTrongCay(dung.tree, id);
  const nam = (id) => (thuTu.nam.has(id) ? thuTu.nam.get(id) : null);
  const ke  = (ds) => ds.map((id) => ten(id) + (nam(id) ? ' (' + nam(id) + ')' : ''))
                        .join('  ·  ');

  const moiId  = dung.person.id;
  const namMoi = nam(moiId);
  const dungTruoc = thuTu.thuTuHienTai
    .slice(0, thuTu.thuTuHienTai.indexOf(moiId))
    .filter((id) => nam(id) !== null && namMoi !== null && nam(id) > namMoi);

  const cau = ten(moiId) + (namMoi ? ' sinh năm ' + namMoi : '') +
              ', lớn tuổi hơn ' +
              (dungTruoc.length === 1 ? ten(dungTruoc[0]) : dungTruoc.length + ' người') +
              ' đang đứng trước trong hàng anh chị em. Bạn muốn làm gì?';

  hienNhan(cau, false, [
    'Thứ tự hiện nay: ' + ke(thuTu.thuTuHienTai),
    'Nếu sắp lại theo tuổi: ' + ke(thuTu.thuTuMoi),
  ]);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';

  hang.append(
    nutChon('Vẫn thêm, giữ nguyên thứ tự', true, () => {
      daXemThuTu = true; sapXepLai = false; handleAddChild();
    }),
    nutChon('Thêm và sắp xếp lại theo tuổi', false, () => {
      daXemThuTu = true; sapXepLai = true; handleAddChild();
    }),
    nutChon('Huỷ bỏ — quay lại sửa', false, () => {
      daXemThuTu   = false;
      sapXepLai    = false;
      N.daXemCanhBao = false;
      N.nutLuu.textContent = 'Thêm người con';
      hienNhan('Chưa thêm gì cả. Sửa lại rồi bấm "Thêm người con".', false);
    }),
  );
  N.khoiKetQua.append(hang);
}

function loiNhacCuaForm() {
  const ra = [];
  const coTen = ['surname', 'middle', 'given'].some((k) => coGiaTri(docO(k)));
  if (!coTen) {
    ra.push('Bạn chưa gõ tên nào cả. Người không tên vẫn ghi được — gia phả cũ ' +
            'có thật những người chỉ còn nhớ là "con thứ ba của cụ" — nhưng app ' +
            'chưa có cách xoá người đã thêm, nên xin xem lại một lần nữa.');
  }
  return ra.concat(loiThuBacGoSai());
}

function gomThayDoi() {
  return {
    name: {
      surname: docO('surname'),
      middle:  docO('middle'),
      given:   docO('given'),
    },

    altNames: tenPhu.map(phanTenPhu),
    sex:         docO('sex'),
    living:      !!(o.living && o.living.checked),
    burialPlace: docO('burialPlace'),
    gio:         docO('gio'),
    note:        docO('note'),

    title:       docO('title'),
    occupation:  docO('occupation'),
    education:   docO('education'),
    religion:    docO('religion'),
    residence:   docO('residence'),
    nationality: docO('nationality'),
    contact:     docO('contact'),
    chi:         docO('chi'),
    birth: { raw: docO('birth'), place: docO('birthPlace') },
    death: { raw: docO('death'), place: docO('deathPlace') },
  };
}

function mucTenChinh(nguoi) {
  const ds = Array.isArray(nguoi.names) ? nguoi.names : [];
  const muc = ds.find((n) => n && n.type === 'chinh') || ds[0] || {};
  return { surname: muc.surname || '', middle: muc.middle || '', given: muc.given || '' };
}

const KIEU_HANG_TICH =
  'display:flex;align-items:flex-start;gap:9px;margin-top:6px;padding:9px 11px;' +
  'border:1px solid var(--sd-vien,#e6e0d8);border-radius:9px;background:var(--sd-nen,#faf8f5);' +
  'font-size:14px;line-height:1.4;cursor:pointer;touch-action:manipulation';

const KIEU_O_TICH = 'width:18px;height:18px;flex:0 0 auto;margin-top:1px;accent-color:var(--sd-chu,#2a2622)';

function dongNhac(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:11px;line-height:1.45;color:var(--sd-chu-phu,#8a8078);margin-top:4px';
  return d;
}

function quenCauTraLoiCu() {
  N.daXemCanhBao = false;
  daXemThuTu     = false;
  sapXepLai      = false;

  if (N.khoiKetQua) N.khoiKetQua.innerHTML = '';
  if (N.nutLuu && !N.dangLuu) N.nutLuu.textContent = tieuDeForm();

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);
}

function khoiChonChaMe() {
  const index = state.index;
  if (!index || !noiVao || !noiVao.mocId) return [];

  const mocId = noiVao.mocId;
  const dsCap = getPartnerUnions(index, mocId);
  if (dsCap.length === 0) return [];

  const ten = tenNguoi(mocId);
  const boc = document.createElement('div');
  chonChaMe = { mocId, cacO: [] };

  const themHang = (ma, dong1, dong2, chon) => {
    const nhan = document.createElement('label');
    nhan.style.cssText = KIEU_HANG_TICH;

    const nut = document.createElement('input');
    nut.type = 'radio';
    nut.name = 'giapha-cha-me';
    nut.value = ma;
    nut.checked = chon;
    nut.dataset.chaMeCap = ma;
    nut.style.cssText = KIEU_O_TICH;
    nut.addEventListener('change', () => { if (nut.checked) datChoNoiCon(ma); });
    chonChaMe.cacO.push({ ma, input: nut });

    const chu = document.createElement('span');
    const d1 = document.createElement('div');
    d1.textContent = dong1;
    const d2 = document.createElement('div');
    d2.textContent = dong2;
    d2.style.cssText = 'font-size:12px;color:var(--sd-chu-phu,#8a8078);margin-top:2px';
    chu.append(d1, d2);

    nhan.append(nut, chu);
    boc.append(nhan);
  };

  for (const u of dsCap) {
    const ngoai = capCoNguoiNgoaiCay(u);
    if (!ngoai) { themHang(u.id, keTenPartner(u.id), moTaCap(u), u.id === noiVao.unionId); continue; }
    themHang(u.id, ten + '  và  ' + ((ngoai.p && fullName(ngoai.p)) || ngoai.id) + ' (' + ngoai.id + ')',
             'Người kia không thuộc gia phả này — thêm con cho cặp này ở gia phả có cả hai người.',
             false);
    const o = chonChaMe.cacO[chonChaMe.cacO.length - 1];
    o.input.disabled = true;
    o.input.parentElement.style.opacity = '.5';
  }
  themHang('', 'Một mình ' + ten,
           'Chưa biết người kia là ai — app dựng một cặp riêng chỉ có ' + ten + '.',
           !noiVao.unionId);

  boc.append(dongNhac(
    'Trong gia phả này quan hệ cha mẹ – con đi QUA CẶP, nên câu hỏi phải là ' +
    '"cặp nào" chứ không phải "ai". Chọn nhầm thì đổi lại ngay ở đây, không ' +
    'phải đóng form.'));

  return [veNhan('Cha mẹ là ai?'), boc];
}

function capCoNguoiNgoaiCay(u) {
  const bien = state.index && state.index.vanhDaiById;
  if (!bien || !u) return null;
  const id = (Array.isArray(u.partners) ? u.partners : []).find((x) => bien.has(x));
  return id ? { id, p: bien.get(id) } : null;
}

function datChoNoiCon(unionId) {
  if (!noiVao || !noiVao.mocId) return;
  if ((noiVao.unionId || '') === unionId) return;

  if (unionId) {
    noiVao.unionId = unionId;
    delete noiVao.chaMeId;
  } else {
    noiVao.unionId = '';
    noiVao.chaMeId = noiVao.mocId;
  }
  quenCauTraLoiCu();
}

function conThatCua(u) {
  const index = state.index;
  return (Array.isArray(u && u.children) ? u.children : [])
    .filter((c) => c && c.personId && index && index.personById.has(c.personId));
}

function khoiConSanCo() {
  const index = state.index;
  if (!index || !noiVao || !noiVao.banDoiId) return [];

  const mocId = noiVao.banDoiId;
  const dsCap = getPartnerUnions(index, mocId).filter((u) => conThatCua(u).length > 0);
  const tichDuoc = dsCap.filter((u) => soPartner(u) < 2);
  const chiKe    = dsCap.filter((u) => soPartner(u) >= 2);
  if (dsCap.length === 0) return [];

  const ten = tenNguoi(mocId);
  const boc = document.createElement('div');
  conSanCo = [];

  for (const u of tichDuoc) {
    for (const c of conThatCua(u)) {
      const hang = document.createElement('div');
      hang.style.cssText = KIEU_HANG_TICH + ';flex-wrap:wrap;align-items:center';

      const hop = document.createElement('input');
      hop.type = 'checkbox';
      hop.checked = false;
      hop.dataset.conCua = u.id;
      hop.style.cssText = KIEU_O_TICH + ';margin-top:0';
      hop.addEventListener('change', () => chonNhomCon(u.id, hop.checked));

      const nhan = document.createElement('label');
      nhan.style.cssText =
        'display:flex;align-items:center;gap:9px;flex:1 1 140px;min-width:0;' +
        'cursor:pointer;touch-action:manipulation';
      const ten = document.createElement('span');
      ten.textContent = tenNguoi(c.personId);
      ten.style.cssText = 'overflow-wrap:anywhere';
      nhan.append(hop, ten);

      const oQh = oChonQuanHe('Quan hệ với ' + tenNguoi(c.personId),
                              c.relation || 'birth', 'con', () => {});
      oQh.dataset.quanHeCua = c.personId;
      const boQh = document.createElement('div');
      boQh.style.cssText = 'display:flex;flex:0 1 132px;min-width:112px';
      boQh.append(oQh);

      conSanCo.push({ personId: c.personId, unionId: u.id, hop, oQh });
      hang.append(nhan, boQh);
      boc.append(hang);
    }

    boc.append(dongNhac(
      'Mấy người trên là con của cặp ' + u.id + ', cặp mà ' + ten + ' đang đứng ' +
      'một mình. Tích một người là tích cả ' + conThatCua(u).length + ' người ' +
      'của cặp ấy, vì quan hệ cha mẹ – con đi QUA CẶP: bước vào cặp là thành ' +
      'cha/mẹ của tất cả, không có nửa vời.'));
  }

  for (const u of chiKe) {
    const d = document.createElement('div');
    d.textContent = 'Không tích được: ' +
      conThatCua(u).map((c) => tenNguoi(c.personId)).join(' · ') +
      ' (cặp ' + u.id + ' — ' + keTenPartner(u.id) + ' — đã đủ hai người).';
    d.style.cssText =
      'margin-top:6px;padding:9px 11px;font-size:12px;line-height:1.5;' +
      'border:1px dashed var(--sd-vien,#e6e0d8);border-radius:9px;color:var(--sd-chu-phu,#8a8078)';
    boc.append(d);
  }

  boc.append(dongNhac(
    'Không tích ô nào thì app dựng một CẶP MỚI, và người vừa thêm KHÔNG thành ' +
    'cha/mẹ của ai trong danh sách trên — đúng ca người vợ sau không phải mẹ ' +
    'của con chồng.'));

  return [veNhan('Con sẵn có của ' + ten), boc];
}

function chonNhomCon(unionId, bat) {
  for (const m of conSanCo) m.hop.checked = bat && m.unionId === unionId;
  datChoNoiBanDoi(bat ? unionId : '');
}

function datChoNoiBanDoi(unionId) {
  if (!noiVao || (noiVao.unionId || '') === unionId) return;
  noiVao.unionId = unionId;
  quenCauTraLoiCu();
  veLaiThuBac();
  veLaiHonNhan();
}

function veLaiThuBac() {
  if (!khoiThuBac) return;
  khoiThuBac.innerHTML = '';
  xoaThuBacNhap();
  khoiThuBac.append(...khoiHoiThuBac(noiVao.banDoiId, noiVao.unionId || ''));
}

function khoiHonNhan() {
  khoiHon = document.createElement('div');
  veLaiHonNhan();
  return [khoiHon];
}

function veLaiHonNhan() {
  if (!khoiHon) return;

  const daGoNgay = docO('marriage');
  const daGoNoi  = docO('marriagePlace');
  khoiHon.innerHTML = '';

  const u = (noiVao && noiVao.unionId && state.index)
    ? state.index.unionById.get(noiVao.unionId) : null;
  const m = (u && u.marriage && typeof u.marriage === 'object') ? u.marriage : null;

  const ngay = (m && coGiaTri(m.raw)) ? m.raw : daGoNgay;
  const noi  = (m && coGiaTri(m.place)) ? m.place : daGoNoi;

  khoiHon.append(veNhan('Cuộc hôn nhân này'));
  khoiHon.append(oChonTrangThaiCap((u && u.status) || 'married'));
  khoiHon.append(oNgay('marriage', { iso: null, raw: ngay, place: '' }, 'Ngày kết hôn'));
  khoiHon.append(oChu('marriagePlace', 'Nơi kết hôn', noi, 'Đình làng Vân, Hà Nam'));
}

function oChonTrangThaiCap(maCu) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const chon = document.createElement('select');
  chon.setAttribute('aria-label', 'Trạng thái của cặp');
  chon.style.cssText = KIEU_O;

  const ds = TRANG_THAI_CAP.slice();
  if (!ds.some((x) => x.ma === maCu)) ds.push({ ma: maCu, chu: nhanTrangThaiCap(maCu) });

  for (const t of ds) {
    const op = document.createElement('option');
    op.value = t.ma;
    op.textContent = t.chu;
    if (t.ma === maCu) op.selected = true;
    chon.append(op);
  }
  o.tinhTrangCap = chon;

  boc.append(veNhanO('Đang là vợ chồng hay đã ly hôn'), chon);
  return boc;
}

function docKhoiHonNhan() {
  const ma = o.tinhTrangCap ? String(o.tinhTrangCap.value || '') : '';
  const raw = docO('marriage').trim();
  return {
    status: ma || 'married',
    marriage: { raw, iso: parseLooseDate(raw).iso, place: docO('marriagePlace').trim() },
  };
}

function apQuanHeConDaChon(cay, unionId, diff) {
  let tree = cay;
  for (const m of conSanCo) {
    if (m.unionId !== unionId || !m.hop.checked) continue;
    const kq = updateChildRelation(tree, unionId, m.personId, String(m.oQh.value || 'birth'));
    if (!kq) return null;
    tree = kq.tree;
    Object.assign(diff, kq.diff);
  }
  return { tree };
}

function veLoiDaHoiOForm(cacCap) {
  if (!N.khoiKetQua || !cacCap || cacCap.length === 0) return;

  const d = document.createElement('div');
  d.textContent =
    'Về ' + cacCap.map((u) => 'cặp ' + u.id).join(' · ') + ': bạn vừa cố ý ' +
    'KHÔNG tích người con nào của nó ở khối "Con sẵn có" — tức người vừa thêm ' +
    'không phải cha/mẹ của họ — nên app dựng một cặp riêng, đúng ý bạn. Bấm ' +
    '"Vẫn thêm" để giữ cặp mới ấy.';
  d.style.cssText =
    'margin-top:10px;padding:7px 10px;font-size:12px;line-height:1.5;' +
    'border-radius:8px;background:var(--sd-nen,#faf8f5);border:1px solid var(--sd-vien-nhat,#f0ebe4);color:var(--sd-chu-vua,#5c554e)';
  N.khoiKetQua.append(d);
}

function capDaHoiOForm(unionId) {
  return conSanCo.some((m) => m.unionId === unionId);
}

export function quickAddParent(childId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(childId)) return;

  chonCap('chaMe', childId, xuLy, (unionId) => {
    moForm('themChaMe', NGUOI_TRONG, { childId, unionId }, xuLy);
  });
}

const GIOI_NGUOC = { M: 'F', F: 'M' };

export function quickAddSpouse(personId, xuLy = {}) {
  const index = state.index;
  const moc = index && index.personById.get(personId);
  if (!moc) return;

  const gioiNguoc = GIOI_NGUOC[moc.sex] || '';

  moForm('themBanDoi',
         Object.assign({}, NGUOI_TRONG, { sex: gioiNguoc || 'U' }),
         { banDoiId: personId, unionId: '', gioiMoc: moc.sex, gioiNguoc },
         xuLy);
}

async function handleAddNguoiThan() {
  if (N.dangLuu) return;

  const luc    = stampNow();
  const boi    = (state.phien && state.phien.email) || '';
  const quanHe = docQuanHeMoi();
  const laChaMe = N.cheDo === 'themChaMe';

  if (noiVao && (await keoQuaQuanHeCu(laChaMe ? 'chaMe' : 'banDoi',
                                      laChaMe ? noiVao.childId : noiVao.banDoiId,
                                      quanHe)) !== undefined) return;

  const dung = laChaMe
    ? dungCayThemChaMe(state.tree, gomThayDoi(), quanHe, { boi, luc })
    : dungCayThemBanDoi(state.tree, gomThayDoi(), { boi, luc });

  if (!dung) {
    hienNhan('Không nối được người này vào chỗ đã chọn. Có thể gia phả vừa thay ' +
             'đổi trong lúc form đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }

  const indexMoi = buildIndex(dung.tree);
  let raSoat = gopRaSoat(
    raSoatNguoiKhiThem(dung.tree, indexMoi, dung.person.id),
    validateAll(dung.tree, indexMoi, 'union',  { unionId: dung.union.id })
  );
  if (laChaMe) {
    raSoat = gopRaSoat(raSoat, validateAll(dung.tree, indexMoi, 'child',
      { childId: noiVao.childId, parentId: dung.person.id }));
  }

  if (!raSoat.canSave) {
    hienNhan('Chưa thêm được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  const canhBao = loiNhacCuaForm().concat(raSoat.warnings.map((m) => m.message));

  const capTrung = (!laChaMe && dung.laUnionMoi)
    ? capTrungNoiVaoDuoc(dung.tree, dung.union.id)
    : [];
  const capCu    = capTrung.filter((u) => !capDaHoiOForm(u.id));
  const capDaHoi = capTrung.filter((u) => capDaHoiOForm(u.id));

  if (canhBao.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn thêm';
    hienNhan(capCu.length > 0
      ? 'Có chỗ đáng xem lại — và ở đây bạn có hai đường đi, không chỉ một:'
      : 'Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
        'lỗi, nên app không chặn — bấm "Vẫn thêm" nếu bạn biết là đúng:',
      false, canhBao);
    veNutNoiVaoCapCu(dung.tree, capCu, dung.person);
    veLoiDaHoiOForm(capDaHoi);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const nguoiMoi = dung.person;
  const tenMoi   = nguoiCoSanChon ? nguoiCoSanChon.ten
    : (coGiaTri(fullName(nguoiMoi)) ? fullName(nguoiMoi) : nguoiMoi.id);
  const vai      = laChaMe
    ? (noiVao.gioi === 'F' ? 'mẹ' : (noiVao.gioi === 'M' ? 'cha' : 'cha/mẹ'))
    : 'vợ/chồng';
  const moc      = laChaMe ? noiVao.childId : noiVao.banDoiId;

  const ketQua = await ghiBanGhi(nguoiCoSanChon ? null : nguoiMoi, [dung.union], {
    action: 'create',
    target: nguoiMoi.id,
    note:   'Thêm ' + vai + ' ' + tenMoi + ' cho ' + tenNguoi(moc) +
            ' vào ' + dung.union.id +
            (dung.laUnionMoi ? ' (cặp mới, tạo cùng lúc)' : '') +
            (nguoiCoSanChon ? ' — người ĐÃ CÓ ở cây khác, kéo vào (b124a).' : '.'),
    diff:   dung.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(nguoiMoi.id);
    return;
  }

  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';
  hienLoiGhi(ketQua, 'Người này CHƯA được thêm.');
}

function dungCayThemChaMe(cay, thayDoi, quanHe, ghiNhan) {
  if (!cay || !noiVao || !noiVao.childId) return null;

  const kqP = taoHoacDungNguoi(cay, thayDoi, ghiNhan);
  if (!kqP) return null;

  let tree = kqP.tree;
  const diff = Object.assign({}, kqP.diff);

  if (noiVao.unionId) {
    const kqA = addPartner(tree, noiVao.unionId, kqP.person.id);
    if (!kqA) return null;
    Object.assign(diff, kqA.diff);
    return { tree: kqA.tree, person: kqP.person, union: kqA.union,
             laUnionMoi: false, diff };
  }

  const kqU = createUnion(tree, [kqP.person.id], {});
  if (!kqU) return null;
  tree = kqU.tree;
  Object.assign(diff, kqU.diff);

  const kqC = addChild(tree, kqU.union.id, noiVao.childId, quanHe);
  if (!kqC) return null;
  Object.assign(diff, kqC.diff);

  return { tree: kqC.tree, person: kqP.person, union: kqC.union,
           laUnionMoi: true, diff };
}

function dungCayThemBanDoi(cay, thayDoi, ghiNhan) {
  if (!cay || !noiVao || !noiVao.banDoiId) return null;

  const kqP = taoHoacDungNguoi(cay, thayDoi, ghiNhan);
  if (!kqP) return null;

  const tree = kqP.tree;
  const diff = Object.assign({}, kqP.diff);
  const hon  = docKhoiHonNhan();

  if (noiVao.unionId) {
    const kqA = addPartner(tree, noiVao.unionId, kqP.person.id);
    if (!kqA) return null;
    Object.assign(diff, kqA.diff);

    const sua = Object.assign({}, hon);
    const bac = docThuBacNhap();
    if (Object.keys(bac).length > 0) sua.ranks = bac;

    const kqR = updateUnion(kqA.tree, noiVao.unionId, sua);
    if (!kqR) return null;
    Object.assign(diff, kqR.diff);

    const kqC = apQuanHeConDaChon(kqR.tree, noiVao.unionId, diff);
    if (!kqC) return null;

    const uCuoi = kqC.tree.unions.find((x) => x && x.id === noiVao.unionId);
    if (!uCuoi) return null;

    return { tree: kqC.tree, person: kqP.person, union: uCuoi,
             laUnionMoi: false, diff };
  }

  const kqU = createUnion(tree, [noiVao.banDoiId, kqP.person.id],
                          Object.assign({ ranks: docThuBacNhap() }, hon));
  if (!kqU) return null;
  Object.assign(diff, kqU.diff);

  return { tree: kqU.tree, person: kqP.person, union: kqU.union,
           laUnionMoi: true, diff };
}

function capTrungNoiVaoDuoc(cay, unionMoiId) {
  const dsU = (cay && Array.isArray(cay.unions)) ? cay.unions : [];
  const ra = [];

  for (const x of timCapTrung(cay)) {
    if (x.unionA !== unionMoiId && x.unionB !== unionMoiId) continue;
    const banId = (x.unionA === unionMoiId) ? x.unionB : x.unionA;
    const u = dsU.find((y) => y && y.id === banId);
    if (u && !u.deleted && soPartner(u) < 2) ra.push(u);
  }
  return ra;
}

function veNutNoiVaoCapCu(cay, cacCap, nguoiMoi) {
  if (!N.khoiKetQua || !cacCap || cacCap.length === 0) return;

  const vai = nguoiMoi.sex === 'F' ? 'mẹ'
            : (nguoiMoi.sex === 'M' ? 'cha' : 'cha / mẹ');
  const tenMoi = tenTrongCay(cay, nguoiMoi.id);

  for (const u of cacCap) {
    const hang = document.createElement('div');
    hang.style.cssText = 'margin-top:10px';
    hang.append(nutChon('Nối vào cặp ' + u.id + ' sẵn có', false, () => {
      datChoNoiBanDoi(u.id);
      handleAddNguoiThan();
    }));
    N.khoiKetQua.append(hang);

    const con = (Array.isArray(u.children) ? u.children : [])
      .map((c) => tenTrongCay(cay, c && c.personId));

    const phu = document.createElement('div');
    phu.textContent = con.length > 0
      ? tenMoi + ' sẽ thành ' + vai + ' của ' + con.join(', ') + '.'
      : 'Hai người vẫn là một cặp — app không dựng thêm cặp thứ hai.';
    phu.style.cssText =
      'margin-top:5px;padding:0 3px;font-size:11px;line-height:1.5;color:var(--sd-chu-vua,#5c554e)';
    N.khoiKetQua.append(phu);
  }

  const cuoi = document.createElement('div');
  cuoi.textContent = 'Còn nếu đây thật sự là một cuộc hôn nhân KHÁC, bấm "Vẫn ' +
                     'thêm" ở dưới để giữ cặp mới.';
  cuoi.style.cssText =
    'margin-top:10px;padding:0 3px;font-size:11px;line-height:1.5;color:var(--sd-chu-phu,#8a8078)';
  N.khoiKetQua.append(cuoi);
}

export function linkExisting(personId, targetId, relationType, xuLy = {}) {
  const index = state.index;
  if (!index) return;

  const a = index.personById.get(personId);
  const b = index.personById.get(targetId);
  if (!a || !b) {
    moHopBao('Kết nối', 'Không tìm thấy một trong hai người. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (personId === targetId) {
    moHopBao('Kết nối', 'Không nối một người với chính họ được. Chọn một người khác.', true);
    return;
  }

  if (!TEN_QUAN_HE[relationType]) {
    hoiQuanHeNoi(personId, targetId, xuLy);
    return;
  }

  const daNoi = quanHeDaCo(personId, targetId);
  if (daNoi) {
    moHopBao('Kết nối',
      tenNguoi(targetId) + ' đã là ' + daNoi + ' của ' + tenNguoi(personId) +
      ' trong gia phả rồi.', false,
      ['Muốn bỏ mối nối ấy thì dùng "Gỡ nối" trong menu, không phải "Kết nối".']);
    return;
  }

  const vaiTro = relationType === 'parent' ? 'chaMe'
               : (relationType === 'spouse' ? 'banDoi' : 'con');

  chonCap(vaiTro, personId, xuLy, (unionId) => {
    moHopXacNhanNoi({ personId, targetId, loai: relationType, unionId }, xuLy);
  }, targetId);
}

function hoiQuanHeNoi(personId, targetId, xuLy) {
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);

  moHopChon('chon', xuLy, {
    tieuDe: 'Kết nối',
    phu:    A + '  ·  ' + personId + '   ←→   ' + B + '  ·  ' + targetId,
    cauMo:  'Hai người này là gì của nhau?',
    cacMuc: [
      { ma: 'parent', chu: B + ' là CHA / MẸ của ' + A,
        phu: 'B sẽ đứng vào một cặp cha mẹ của A.',
        chay: () => linkExisting(personId, targetId, 'parent', xuLy) },
      { ma: 'spouse', chu: B + ' là VỢ / CHỒNG của ' + A,
        phu: 'Hai người thành một cặp.',
        chay: () => linkExisting(personId, targetId, 'spouse', xuLy) },
      { ma: 'child', chu: B + ' là CON của ' + A,
        phu: 'B thành người con của một cặp của A.',
        chay: () => linkExisting(personId, targetId, 'child', xuLy) },
    ],
  });
}

function quanHeDaCo(personId, targetId) {
  const index = state.index;
  for (const m of getSpouses(index, personId))  if (m.personId === targetId) return 'vợ/chồng';
  for (const m of getChildren(index, personId)) if (m.personId === targetId) return 'con';
  for (const u of getParentUnions(index, personId)) {
    if ((Array.isArray(u.partners) ? u.partners : []).indexOf(targetId) >= 0) return 'cha/mẹ';
  }
  return '';
}

function moHopXacNhanNoi(ctx, xuLy) {
  const chan = moHopTrang('noi', xuLy, 'Kết nối',
                          tenNguoi(ctx.personId) + '  ←→  ' + tenNguoi(ctx.targetId));
  noiCtx = ctx;
  const { personId, targetId, loai, unionId } = ctx;

  const canTro = canTroLuu();
  if (canTro) {
    hienNhan(canTro, true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Nối xong thì:', false, cauKeNoi());

  const hoiNuoi = (loai === 'child') || (loai === 'parent' && !unionId);
  if (hoiNuoi) {
    N.khoiKetQua.append(veNhan(loai === 'child'
      ? 'Quan hệ của người con với cặp này'
      : 'Quan hệ của cha / mẹ này với ' + tenNguoi(personId)));
    N.khoiKetQua.append(oQuanHeMoi(loai === 'child'
      ? 'Quan hệ của người con với cặp này'
      : 'Quan hệ của cha / mẹ này với ' + tenNguoi(personId), loai === 'child' ? 'con' : 'chaMe'));
  } else {
    o.quanHe = null;
  }

  if (loai === 'spouse') {
    const ds = unionId
      ? [aiVaoCap(unionId, personId, targetId)]
      : [personId, targetId];
    for (const id of ds) gaiTruocChan(chan, khoiHoiThuBac(id, unionId));
  }

  N.nutLuu = nutChanXoa('Nối hai người này', false, () => chayNoi());
  chan.append(N.nutLuu, nutChanXoa('Không nối', false, () => closePersonForm()));
}

function aiVaoCap(unionId, personId, targetId) {
  const u = state.index && state.index.unionById.get(unionId);
  const cac = (u && Array.isArray(u.partners)) ? u.partners : [];
  return cac.indexOf(targetId) >= 0 ? personId : targetId;
}

function loiConDaCoChaMe(childId, unionId) {
  const index = state.index;
  if (!index || !childId) return '';
  const khac = getParentUnions(index, childId).filter((u) => u.id !== unionId);
  if (khac.length === 0) return '';

  return '⚠ ' + tenNguoi(childId) + ' ĐÃ CÓ cha mẹ trong gia phả: ' +
         khac.map((u) => keTenPartner(u.id) + '  ·  ' + u.id).join('   |   ') +
         '. Nối xong thì người này có ' + (khac.length + 1) + ' cặp cha mẹ — ' +
         'đúng khi đó là cha mẹ NUÔI hoặc cha mẹ KẾ, còn nếu chỉ là một cặp ghi ' +
         'trùng thì hãy "Không nối", gỡ cặp cũ trước rồi nối lại.';
}

function cauKeNoi() {
  const { personId, targetId, loai, unionId } = noiCtx;
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);
  const dong = [];

  if (loai === 'spouse') {
    const vao = unionId ? aiVaoCap(unionId, personId, targetId) : targetId;
    dong.push(A + ' và ' + B + ' thành vợ chồng' +
              (unionId ? ' trong cặp ' + unionId + ' — ' + tenNguoi(vao) +
                         ' là người bước vào cặp đang có.'
                       : ' trong một cặp mới.'));
    if (unionId) {
      const u = state.index.unionById.get(unionId);
      const cacCon = (Array.isArray(u && u.children) ? u.children : [])
        .map((c) => c && c.personId).filter((id) => id && state.index.personById.has(id));
      if (cacCon.length > 0) {
        dong.push('⚠ Cặp ' + unionId + ' đang có ' + cacCon.length + ' người con (' +
                  cacCon.map(tenNguoi).join(' · ') + '), nên ' + tenNguoi(vao) +
                  ' đồng thời thành cha/mẹ của họ. Trong gia phả này quan hệ cha ' +
                  'mẹ – con đi QUA cặp, không nối thẳng người với người.');
      }
    }
  } else if (loai === 'child') {
    dong.push(B + ' thành người con của ' +
              (unionId ? keTenPartner(unionId) + '  ·  ' + unionId
                       : A + ' (app tạo thêm một cặp mới cho riêng họ)') + '.');
    const canhBao = loiConDaCoChaMe(targetId, unionId);
    if (canhBao) dong.push(canhBao);
  } else {
    dong.push(B + ' thành cha / mẹ của ' + A +
              (unionId ? ', đứng chung cặp ' + unionId + ' với ' + keTenPartner(unionId) + '.'
                       : ' trong một cặp cha mẹ mới.'));
    const canhBao = loiConDaCoChaMe(personId, unionId);
    if (canhBao) dong.push(canhBao);
  }

  dong.push('Không ai bị xoá, và không mối nối nào đang có bị bỏ đi. Nối nhầm ' +
            'thì mở lại menu và dùng "Gỡ nối".');
  return dong;
}

async function chayNoi() {
  if (N.dangLuu || !noiCtx) return;

  const quanHe = docQuanHeMoi();
  const dung = dungCayNoi(quanHe);
  if (!dung) {
    hienNhan('Không nối được hai người này. Có thể gia phả vừa thay đổi trong lúc ' +
             'hộp đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }

  const { personId, targetId, loai } = noiCtx;
  const indexMoi = buildIndex(dung.tree);

  let raSoat = validateAll(dung.tree, indexMoi, 'union', { unionId: dung.union.id });
  if (loai === 'child') {
    raSoat = gopRaSoat(raSoat, validateAll(dung.tree, indexMoi, 'child',
      { childId: targetId, unionId: dung.union.id }));
  } else if (loai === 'parent') {
    raSoat = gopRaSoat(raSoat, validateAll(dung.tree, indexMoi, 'child',
      { childId: personId, parentId: targetId }));
  }

  if (!raSoat.canSave) {
    hienNhan('Chưa nối được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  const canhBao = loiThuBacGoSai().concat(raSoat.warnings.map((m) => m.message));
  if (canhBao.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn nối';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn nối" nếu bạn biết là đúng:',
             false, canhBao);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang nối…', false);

  const ketQua = await ghiBanGhi(null, [dung.union], {
    action: 'update',
    target: dung.union.id,
    note:   'Nối ' + tenNguoi(targetId) + ' làm ' + TEN_QUAN_HE[loai] + ' của ' +
            tenNguoi(personId) + ' qua ' + dung.union.id +
            (dung.laUnionMoi ? ' (cặp mới, tạo cùng lúc)' : '') + '.',
    diff:   dung.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hai người này CHƯA được nối.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(targetId);

  N.nutLuu = null;
  hienNhan('Đã nối ' + tenNguoi(targetId) + ' làm ' + TEN_QUAN_HE[loai] +
           ' của ' + tenNguoi(personId) + '.', false);

  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Xong', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}

function dungCayNoi(quanHe) {
  const { personId, targetId, loai, unionId } = noiCtx;
  let tree = state.tree;
  const diff = {};

  if (loai === 'spouse') {
    const bac = docThuBacNhap();

    if (unionId) {
      const kq = addPartner(tree, unionId, aiVaoCap(unionId, personId, targetId));
      if (!kq) return null;
      Object.assign(diff, kq.diff);

      if (Object.keys(bac).length === 0) {
        return { tree: kq.tree, union: kq.union, laUnionMoi: false, diff };
      }
      const kqR = updateUnion(kq.tree, unionId, { ranks: bac });
      if (!kqR) return null;
      Object.assign(diff, kqR.diff);
      return { tree: kqR.tree, union: kqR.union, laUnionMoi: false, diff };
    }

    const kq = createUnion(tree, [personId, targetId], { ranks: bac });
    if (!kq) return null;
    return { tree: kq.tree, union: kq.union, laUnionMoi: true, diff: kq.diff };
  }

  if (loai === 'child') {
    let uid = unionId;
    let laMoi = false;
    if (!uid) {
      const kqU = createUnion(tree, [personId], {});
      if (!kqU) return null;
      tree = kqU.tree; uid = kqU.union.id; laMoi = true;
      Object.assign(diff, kqU.diff);
    }
    const kqC = addChild(tree, uid, targetId, quanHe);
    if (!kqC) return null;
    Object.assign(diff, kqC.diff);
    return { tree: kqC.tree, union: kqC.union, laUnionMoi: laMoi, diff };
  }

  if (unionId) {
    const kq = addPartner(tree, unionId, targetId);
    if (!kq) return null;
    return { tree: kq.tree, union: kq.union, laUnionMoi: false, diff: kq.diff };
  }
  const kqU = createUnion(tree, [targetId], {});
  if (!kqU) return null;
  tree = kqU.tree;
  Object.assign(diff, kqU.diff);
  const kqC = addChild(tree, kqU.union.id, personId, quanHe);
  if (!kqC) return null;
  Object.assign(diff, kqC.diff);
  return { tree: kqC.tree, union: kqC.union, laUnionMoi: true, diff };
}

export { closePersonForm } from './form-nen.js';
export { khoiPhucNguoi, khoiPhucCap, donThungRac, khoiPhucNhieu,
         chuyenVaoThungRac } from './form-thung-rac.js';
export { openSapThuTu } from './form-sap-thu-tu.js';
export { goNoiNguoi, unlink } from './form-go-noi.js';
export { openSuaCon } from './form-sua-con.js';
export { openFamilyForm } from './form-gia-dinh.js';
export { openUnionForm } from './form-cap.js';
export { openMergeForm } from './form-gop.js';
export { xoaNguoi } from './form-xoa.js';
