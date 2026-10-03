export const APP_NAME     = 'Gia phả';
export const DATA_VERSION = 1;

export const PHOTO = {
  maxWidth:    400,
  jpegQuality: 0.82,
  maxWidthLon:    1600,
  jpegQualityLon: 0.85,
  thumbSize:   200,

  banKinhTrenO: 37,

  leTrenO:       0,
};

export const LAYOUT = {
  nodeWidth:  120,

  nodeHeight:  98,

  nodeHeightNgayGio: 109,

  hGap:        28,

  vGap:        38,
  spouseGap:   16,

  khoangSatChu: 12,

  buocThanhNgang: 4,

  khoangNetVong: 5,

  lechNetDai:   8,

  kheBangTen:   10,
  noiTenToiDa:  18,

  stubLength:  14,
  stubRadius:   6,

  stubLengthNgang: 14,

  spouseStepMax:    8,
  spouseStepPadTop: 6,

  blockGap:    56,
};

export const O_CHU = {
  dong: {
    ten: { co: 11,  cao: 13 },
    nam: { co: 9.5, cao: 11 },
    gio: { co: 9.5, cao: 11 },
  },
  le:       4,

  tenChuan: 'Nguyễn Thượng Phương',

  hGap:      12,
  spouseGap:  8,
  vGap:      28,

  cungCao:   6,
  cungBuoc:  3,
  cungTran: 12,
};

export const DEFAULT_SCOPE = {
  ancestors:           2,
  descendants:         2,
  spouseOfDescendants: true,
  k:                   1,
};

export const LOAI_TEN_PHU = [
  { ma: 'huy',        chu: 'Tên huý' },
  { ma: 'tu',         chu: 'Tên tự' },
  { ma: 'thuy',       chu: 'Tên thụy' },
  { ma: 'phap_danh',  chu: 'Pháp danh' },
  { ma: 'thuong_goi', chu: 'Thường gọi' },
  { ma: 'khac',       chu: 'Tên khác' },
];

export function nhanLoaiTenPhu(ma) {
  const m = String(ma || '').trim();
  if (m === '') return '';
  const muc = LOAI_TEN_PHU.find((x) => x.ma === m);
  return muc ? muc.chu : m;
}

export const QUAN_HE_CON_NHAN = [
  { ma: 'birth',   con: 'Con đẻ',         chaMe: 'Cha mẹ đẻ' },
  { ma: 'adopted', con: 'Con nuôi',       chaMe: 'Cha mẹ nuôi' },
  { ma: 'step',    con: 'Con riêng',      chaMe: 'Cha dượng / mẹ kế' },
  { ma: 'foster',  con: 'Con nuôi dưỡng', chaMe: 'Cha mẹ nuôi dưỡng' },
  { ma: 'thua_tu', con: 'Con thừa tự',    chaMe: 'Cha mẹ thừa tự' },
];

export function nhanQuanHeCon(ma, phia) {
  const m = String(ma || '').trim();
  if (m === '') return '';
  const muc = QUAN_HE_CON_NHAN.find((x) => x.ma === m);
  return muc ? muc[phia === 'chaMe' ? 'chaMe' : 'con'] : m;
}

export function chuThichQuanHe(ma, phia) {
  const m = String(ma || '').trim();
  if (m === '' || m === 'birth') return '';
  const chu = nhanQuanHeCon(m, phia);
  return chu ? chu.charAt(0).toLowerCase() + chu.slice(1) : '';
}

export const TRANG_THAI_CAP = [
  { ma: 'married',  chu: 'Đang là vợ chồng' },
  { ma: 'divorced', chu: 'Đã ly hôn' },
];

export function nhanTrangThaiCap(ma) {
  const m = String(ma || '').trim() || 'married';
  const muc = TRANG_THAI_CAP.find((x) => x.ma === m);
  return muc ? muc.chu : m;
}

const SAN_CAO_HOP = 340;

export function rongHop(coSo, toiDa, tiLeVw = 62) {
  return 'clamp(' + coSo + 'px, ' + tiLeVw + 'vw, ' + toiDa + 'px)';
}

export function caoHop(tiLeVh, le = 20) {
  return 'max(' + tiLeVh + 'vh, min(' + SAN_CAO_HOP + 'px, ' +
         'calc(100vh - ' + haiLe(le) + ')))';
}

export const RONG_NUT_TOI_DA = '320px';

export function leLopPhu(le = 20) {
  return 'min(' + le + 'px, ' + (le / 5) + 'vh) ' + le + 'px';
}

function haiLe(le) {
  return 'min(' + (le * 2) + 'px, ' + (le * 2 / 5) + 'vh)';
}

export function vaiTroBangChu(vaiTro) {
  if (vaiTro === 'quan_tri_he_thong') return 'Quản trị hệ thống';
  if (vaiTro === 'quan_tri') return 'Quản trị gia phả';
  if (vaiTro === 'sua') return 'Thành viên';
  if (vaiTro === 'xem') return 'Khách';
  if (vaiTro === 'sao_luu') return 'Tài khoản sao lưu';
  return vaiTro || '';
}
