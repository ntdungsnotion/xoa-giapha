import { fullName } from '../utils/text.js';
import { formatDate } from '../utils/date.js';

const NHAN_LOAI = {
  nguoi: 'Người', honnhan: 'Hôn nhân', con: 'Quan hệ cha mẹ – con',
  anh: 'Ảnh', nguon: 'Nguồn', cay: 'Thông tin chung của gia phả',
};

const TRUONG = {
  nguoi: {
    uid: 'Mã neo', names: 'Họ tên', sex: 'Giới tính', birth: 'Ngày sinh',
    death: 'Ngày mất', burial_place: 'Nơi an táng', title: 'Chức tước',
    occupation: 'Nghề nghiệp', education: 'Học vấn', religion: 'Tôn giáo',
    residence: 'Nơi ở', nationality: 'Dân tộc', living: 'Còn sống',
    photo_file_id: 'Ảnh đại diện', note: 'Ghi chú', deleted: 'Đã xoá',
    vn: 'Đời · Chi · ngày giỗ', meta: 'Thông tin hệ thống', branch_id: 'Chi/nhánh',
  },
  honnhan: {
    uid: 'Mã neo', partners: 'Vợ/chồng', partner_order: 'Thứ tự trên sơ đồ',
    ranks: 'Thứ bậc (cả/thứ)', status: 'Tình trạng hôn nhân',
    marriage: 'Ngày cưới', note: 'Ghi chú', deleted: 'Đã xoá',
  },
  con: { relation: 'Quan hệ', ord: 'Thứ tự con' },
  anh: {
    subject_id: 'Của ai/cặp nào', drive_file_id: 'Ảnh (bản nhỏ)',
    drive_file_id_lon: 'Ảnh (bản lớn)', caption: 'Chú thích', year: 'Năm',
    deleted: 'Đã xoá', meta: 'Thông tin hệ thống',
  },
  nguon: { title: 'Tên nguồn', author: 'Tác giả', note: 'Ghi chú' },
  cay: { name: 'Tên gia phả', root_person_id: 'Người trung tâm mặc định', note: 'Ghi chú' },
};

export function bangPhang(banGhi) {
  const ra = [];
  if (!banGhi) return ra;

  for (const loai of ['nguoi', 'honnhan', 'anh', 'nguon']) {
    for (const bg of banGhi[loai] || []) xepMotBanGhi(ra, loai, nhanBanGhi(loai, bg), bg.truoc, bg.sau);
  }
  for (const bg of banGhi.con || []) {
    xepMotBanGhi(ra, 'con', nhanCon(bg), bg.truoc, bg.sau);
  }
  if (banGhi.cay) {
    xepMotBanGhi(ra, 'cay', NHAN_LOAI.cay, banGhi.cay.truoc, banGhi.cay.sau);
  }
  return ra;
}

function xepMotBanGhi(ra, loai, nhanNguoi, truoc, sau) {
  const truong = TRUONG[loai];
  for (const khoa of Object.keys(truong)) {
    const gTruoc = truoc ? truoc[khoa] : undefined;
    const gSau   = sau   ? sau[khoa]   : undefined;
    if (bangNhau(gTruoc, gSau)) continue;
    ra.push({
      loai, nhanLoai: NHAN_LOAI[loai], nguoi: nhanNguoi, truong: truong[khoa],
      truoc: hienGiaTri(khoa, gTruoc), sau: hienGiaTri(khoa, gSau),
    });
  }
}

function nhanBanGhi(loai, bg) {
  const dong = bg.sau || bg.truoc;
  if (!dong) return bg.id;
  if (loai === 'nguoi') {
    const ten = fullName({ names: dong.names });
    return ten ? ten + ' (' + bg.id + ')' : bg.id;
  }
  if (loai === 'honnhan') {
    const doiTac = Array.isArray(dong.partners) && dong.partners.length
      ? dong.partners.join(' + ') : '';
    return 'Hôn nhân ' + bg.id + (doiTac ? ' (' + doiTac + ')' : '');
  }
  return bg.id;
}

function nhanCon(bg) {
  return 'Con ' + bg.personId + ' trong hôn nhân ' + bg.unionId;
}

function rong(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.values(v).every(rong);
  return false;
}

function hienGiaTri(khoa, v) {
  if (rong(v)) return '';
  if (khoa === 'names') return fullName({ names: v });
  if (khoa === 'birth' || khoa === 'death' || khoa === 'marriage') return formatDate(v);
  if (typeof v === 'boolean') return v ? 'Có' : 'Không';
  if (Array.isArray(v)) return v.join(' · ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function bangNhau(a, b) {
  if (a === b) return true;
  if (rong(a) && rong(b)) return true;
  if (rong(a) || rong(b)) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!bangNhau(a[i], b[i])) return false;
    return true;
  }

  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!bangNhau(a[k], b[k])) return false;
  }
  return true;
}
