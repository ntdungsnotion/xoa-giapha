// Cấu hình — file DUY NHẤT cần sửa tay. Chỉ sửa những dòng có chữ ĐIỀN VÀO ĐÂY.
//
// SUPABASE_URL             : supabase.com → mở project → Project Settings → API Keys → "Project URL"
// SUPABASE_KHOA_CONG_KHAI  : cùng trang ấy → "Publishable key" (bắt đầu bằng sb_publishable_)
//                            ⚠ KHÔNG dán "Secret key" (sb_secret_…) — khoá ấy vượt qua mọi phân quyền.
// NGUOI_QUAN_LY            : email người quản lý, hiện cho người chưa được cấp quyền
// KHO_ANH                  : giữ nguyên 'anh' (trùng tên kho trong cai-dat.sql)
// SAO_LUU_WEB_APP          : tuỳ chọn — địa chỉ web app sao lưu (Apps Script); để '' vẫn chạy
export const SUPABASE_URL = 'ĐIỀN VÀO ĐÂY';

export const SUPABASE_KHOA_CONG_KHAI =
  'ĐIỀN VÀO ĐÂY';

export const NGUOI_QUAN_LY = 'ĐIỀN VÀO ĐÂY';

export const KHO_ANH = 'anh';

export const SAO_LUU_WEB_APP =
  '';

export function thieuCauHinh() {
  const chuaDien = (v) => !v || v === 'ĐIỀN VÀO ĐÂY';
  if (chuaDien(SUPABASE_URL) || chuaDien(SUPABASE_KHOA_CONG_KHAI)) {
    return 'Chưa điền địa chỉ Supabase. Mở file js/cau-hinh.js và điền ' +
           'hai giá trị SUPABASE_URL và SUPABASE_KHOA_CONG_KHAI.';
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL)) {
    return 'SUPABASE_URL trông không đúng khuôn. Phải có dạng ' +
           'https://xxxxxxxx.supabase.co — không có dấu / ở cuối, ' +
           'không kèm đường dẫn nào phía sau.';
  }

  if (/^sb_secret_|service_role/.test(SUPABASE_KHOA_CONG_KHAI)) {
    return 'Khoá đang điền là KHOÁ BÍ MẬT (secret / service_role) — nó vượt ' +
           'qua mọi phân quyền và TUYỆT ĐỐI không được để trong mã. Quay lại ' +
           'Project Settings → API Keys và chép đúng dòng "Publishable key".';
  }

  if (!/^(sb_publishable_|eyJ)/.test(SUPABASE_KHOA_CONG_KHAI)) {
    return 'Khoá không đúng khuôn. Khoá công khai của Supabase bắt đầu bằng ' +
           '"sb_publishable_" (bản mới) hoặc "eyJ" (bản cũ).';
  }
  return null;
}
