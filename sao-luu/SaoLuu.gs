var THU_TU_DOC = {
  trees:          'id',
  tree_members:   'tree_id,user_id',
  branches:       'tree_id,id',
  branch_access:  'tree_id,user_id,branch_id',
  tree_persons:   'tree_id,person_id',
  persons:        'id',
  unions:         'id',
  union_children: 'union_id,person_id',
  media:          'id',
  sources:        'tree_id,id',
  change_log:     'id',
  imports:        'id',
  user_settings:  'user_id,tree_id'
};

var BANG_HE_THONG = ['cau_hinh', 'tai_khoan', 'doi_ma_toan_cuc',
                     'de_xuat_gan_nguoi', 'de_nghi_quan_he', 'de_xuat_dong_ho'];

var BANG_NHAT_KY = ['nhat_ky_lo_rac', 'nhat_ky_he_thong'];

var SO_DONG_MOI_TRANG = 1000;
var TEN_THU_MUC_MAC_DINH = 'Sao luu gia pha (Supabase)';
var SO_BAN_GIU_MAC_DINH = 30;
var KHUON_TEN_FILE = 'giapha-sao-luu-';

var TEN_THU_MUC_ANH = 'Anh';
var GIAY_CHEP_ANH_TOI_DA = 270;
var SO_LOI_LIEN_TIEP_TOI_DA = 5;

function kiemTraKetNoi() {
  var cauHinh = docCauHinh_();
  var dong = ['Kết nối tới: ' + cauHinh.url, ''];
  var tong = 0;
  var demDoc = {};
  Object.keys(THU_TU_DOC).forEach(function (bang) {
    var n = demDong_(cauHinh, bang);
    demDoc[bang] = n;
    tong += n;
    dong.push('  ' + bang + ': ' + n + ' dòng');
  });
  var heThong = docBangHeThong_(cauHinh);
  if (heThong.loi) {
    dong.push('  (sáu bảng hệ thống): LỖI — ' + heThong.loi);
  } else {
    BANG_HE_THONG.forEach(function (bang) {
      dong.push('  ' + bang + ': ' + heThong.bang[bang].length + ' dòng');
    });
  }
  var nhatKy = docNhatKy_(cauHinh);
  if (nhatKy.loi) {
    dong.push('  (hai bảng nhật ký): LỖI — ' + nhatKy.loi);
  } else {
    BANG_NHAT_KY.forEach(function (bang) {
      dong.push('  ' + bang + ': ' + nhatKy.bang[bang].length + ' dòng');
    });
  }
  var nguoi = docNguoiDung_(cauHinh);
  dong.push('  (tài khoản đăng nhập): ' + nguoi.length + ' người');
  dong.push('');
  dong.push('Tổng cộng ' + tong + ' dòng dữ liệu gia phả.');

  var demThat = docDemThat_(cauHinh);
  dong.push('');
  dong.push(demThat.loi
    ? 'Đối chiếu với máy chủ: LỖI — ' + demThat.loi
    : (soVoiMayChu_(demDoc, demThat.dem) ||
       'Đối chiếu với máy chủ: ĐỦ — đọc được mọi dòng máy chủ đang có.'));
  var ket = dong.join('\n');
  Logger.log(ket);
  return ket;
}

function saoLuuNgay() {
  var cauHinh = null;
  try {
    cauHinh = docCauHinh_();
    var banSao = gomSaoLuu_(cauHinh);

    var loiCanhBao = soVoiLanTruoc_(banSao.dem);

    var thuMuc = layThuMuc_(cauHinh);
    var ten = KHUON_TEN_FILE + cauHinh.dauThoiGian + '.json';
    var noiDung = JSON.stringify(banSao, null, 1);
    var file = thuMuc.createFile(ten, noiDung, 'application/json');
    var loiDau = baoDauVanTay_(cauHinh, noiDung, ten);

    nhoDemLanNay_(banSao.dem);

    var daXoa = (loiCanhBao || banSao.thieuSoVoiMayChu) ? 0 : donBanCu_(thuMuc, cauHinh.soBanGiu);

    if (banSao.thieuSoVoiMayChu) {
      guiThu_('[Gia phả] ⛔ Bản sao lưu THIẾU dữ liệu so với máy chủ',
              banSao.thieuSoVoiMayChu + '\n\nFile vẫn đã được ghi: ' + ten +
              '\nBản sao lưu cũ CHƯA bị dọn — lần này bỏ qua bước dọn.');
    }
    if (loiCanhBao) {
      guiThu_('[Gia phả] ⚠ Bản sao lưu hôm nay ít dữ liệu hơn hẳn lần trước',
              loiCanhBao + '\n\nFile vẫn đã được ghi: ' + ten +
              '\nVà bản sao lưu cũ CHƯA bị dọn — lần này bỏ qua bước dọn.');
    }

    var anh = chepAnhAnToan_(cauHinh, thuMuc, banSao.khoAnh.tep);

    var ketQua = 'Đã ghi ' + ten + ' (' + file.getSize() + ' byte). ' +
                 'Xoá ' + daXoa + ' bản cũ. Ảnh: chép thêm ' + anh.chepThem +
                 ', còn ' + anh.chuaChep + ' tấm chưa chép' +
                 (anh.loi ? ' — ' + anh.loi : '') + '.';
    var demBao = {};
    Object.keys(banSao.dem).forEach(function (k) { demBao[k] = banSao.dem[k]; });
    demBao.anh_chep_them = anh.chepThem;
    demBao.anh_chua_chep = anh.chuaChep;
    baoNhatKy_(cauHinh, {
      ok: true, tenFile: ten, soByte: file.getSize(), daXoa: daXoa,
      canhBao: [loiCanhBao || '', anh.loi ? 'Chép ảnh: ' + anh.loi : '', loiDau,
                banSao.loiNhatKy ? 'Chưa chép được nhật ký hệ thống (đã dán luoc-do/65 chưa?): ' +
                                   banSao.loiNhatKy : '']
        .filter(Boolean).join('\n'),
      thieu: banSao.thieuSoVoiMayChu || '', dem: demBao
    });
    Logger.log(ketQua);
    return ketQua;

  } catch (loi) {
    if (cauHinh) {
      baoNhatKy_(cauHinh, { ok: false, loi: loi && loi.message ? loi.message : String(loi) });
    }
    guiThu_('[Gia phả] ⛔ SAO LƯU HỎNG',
            'Bản sao lưu hằng ngày không chạy được.\n\n' +
            'Lỗi: ' + (loi && loi.message ? loi.message : String(loi)) + '\n\n' +
            'Mở script.google.com → dự án sao lưu → bấm chạy hàm ' +
            '`kiemTraKetNoi` để xem hỏng ở đâu.');
    throw loi;
  }
}

function datLichSaoLuu() {
  goLichSaoLuu();
  ScriptApp.newTrigger('saoLuuNgay').timeBased().everyDays(1).atHour(2).create();
  var ket = 'Đã đặt lịch: mỗi ngày một lần, khoảng 2 giờ sáng.';
  Logger.log(ket);
  return ket;
}

function goLichSaoLuu() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'saoLuuNgay') {
      ScriptApp.deleteTrigger(t);
      n++;
    }
  });
  Logger.log('Đã gỡ ' + n + ' lịch cũ.');
  return n;
}

function gomSaoLuu_(cauHinh) {
  var demThat = docDemThat_(cauHinh);
  var bang = {};
  var dem = {};
  Object.keys(THU_TU_DOC).forEach(function (ten) {
    var dong = docBang_(cauHinh, ten);
    bang[ten] = dong;
    dem[ten] = dong.length;
  });

  var heThong = docBangHeThong_(cauHinh);
  if (!heThong.loi) {
    BANG_HE_THONG.forEach(function (ten) {
      bang[ten] = heThong.bang[ten];
      dem[ten] = heThong.bang[ten].length;
    });
  }

  var nhatKy = {};
  var docNk = docNhatKy_(cauHinh);
  if (!docNk.loi) {
    BANG_NHAT_KY.forEach(function (ten) {
      nhatKy[ten] = docNk.bang[ten];
      dem[ten] = docNk.bang[ten].length;
    });
  }

  var nguoiDung = docNguoiDung_(cauHinh);
  dem.nguoiDung = nguoiDung.length;

  var khoAnh = docKhoAnh_(cauHinh);
  dem.anh = khoAnh.tep.length;

  return {
    khuon: 'giapha-sao-luu',
    phienBanKhuon: 1,
    taoLuc: cauHinh.taoLuc,
    taoLucVn: cauHinh.taoLucVn,
    nguon: cauHinh.url,
    khongChua: 'Mật khẩu tài khoản (Supabase không cho đọc) và tệp ảnh ' +
               '(ảnh chép riêng vào thư mục con "' + TEN_THU_MUC_ANH +
               '" cạnh file này; khoAnh chỉ là danh sách).',
    dem: dem,
    bang: bang,
    nguoiDung: nguoiDung,
    khoAnh: khoAnh,
    loiBangHeThong: heThong.loi || '',
    nhatKy: nhatKy,
    loiNhatKy: docNk.loi || '',
    demMayChu: demThat.dem || null,
    loiDemThat: demThat.loi || '',
    thieuSoVoiMayChu: demThat.dem ? (soVoiMayChu_(dem, demThat.dem) || '') : ''
  };
}

function docDemThat_(cauHinh) {
  try {
    var kq = goi_(cauHinh, cauHinh.url + '/rest/v1/rpc/sao_luu_dem_that', 'đếm số dòng thật', {});
    if (!kq || kq.ok !== true || !kq.dem) {
      return { loi: (kq && kq.loi) || 'Máy chủ không trả số dòng thật (đã dán luoc-do/45 chưa?).' };
    }
    return { dem: kq.dem };
  } catch (e) {
    return { loi: String(e && e.message ? e.message : e).slice(0, 300) };
  }
}

function soVoiMayChu_(demDoc, demThat) {
  var loi = [];
  Object.keys(THU_TU_DOC).forEach(function (ten) {
    var that = Number(demThat[ten]);
    var doc = Number(demDoc[ten]) || 0;
    if (!isNaN(that) && doc < that) {
      loi.push('  ' + ten + ': máy chủ có ' + that + ', sao lưu đọc được ' + doc);
    }
  });
  if (!loi.length) return null;
  return 'Đối chiếu với máy chủ: THIẾU — máy sao lưu không được thấy hết dữ liệu:\n\n' +
         loi.join('\n') + '\n\n' +
         'Thường do một cây chưa có tài khoản sao lưu. Dán lại luoc-do/45-sao-luu-du-cay.sql ' +
         '(nó bù cho mọi cây) rồi chạy lại saoLuuNgay. Thiếu ở persons · unions · ' +
         'union_children · media mà cây đủ thì là dữ liệu mồ côi — dán luoc-do/67.';
}

function baoNhatKy_(cauHinh, ketQua) {
  try {
    goi_(cauHinh, cauHinh.url + '/rest/v1/rpc/ghi_sao_luu_dem', 'ghi nhật ký sao lưu',
         { p_ket_qua: ketQua });
  } catch (e) {
    Logger.log('Không ghi được nhật ký sao lưu (bỏ qua): ' +
               String(e && e.message ? e.message : e).slice(0, 300));
  }
}

function baoDauVanTay_(cauHinh, noiDung, ten) {
  try {
    var byte = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, noiDung,
                                       Utilities.Charset.UTF_8);
    var hex = byte.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
    var kq = goi_(cauHinh, cauHinh.url + '/rest/v1/rpc/ghi_bam_sao_luu', 'ghi dấu vân tay',
                  { p_bam: hex, p_ten_file: ten, p_tao_luc_vn: cauHinh.taoLucVn });
    if (!kq || kq.ok !== true) throw new Error((kq && kq.loi) || 'máy chủ không nhận');
    return '';
  } catch (e) {
    return 'Chưa ghi được dấu vân tay (đã dán luoc-do/54 chưa?) — nút Khôi phục sẽ ' +
           'không nhận file này. ' + String(e && e.message ? e.message : e).slice(0, 200);
  }
}

function docBangHeThong_(cauHinh) {
  try {
    var url = cauHinh.url + '/rest/v1/rpc/sao_luu_bang_he_thong';
    var kq = goi_(cauHinh, url, 'đọc sáu bảng hệ thống', {});
    if (!kq || kq.ok !== true || !kq.bang) {
      return { loi: (kq && kq.loi) || 'Máy chủ không trả sáu bảng hệ thống.' };
    }
    var thieu = BANG_HE_THONG.filter(function (t) { return !Array.isArray(kq.bang[t]); });
    if (thieu.length) return { loi: 'Máy chủ thiếu bảng: ' + thieu.join(', ') };
    return { bang: kq.bang };
  } catch (e) {
    return { loi: String(e && e.message ? e.message : e).slice(0, 300) };
  }
}

function docNhatKy_(cauHinh) {
  try {
    var url = cauHinh.url + '/rest/v1/rpc/sao_luu_nhat_ky';
    var kq = goi_(cauHinh, url, 'đọc nhật ký hệ thống', {});
    if (!kq || kq.ok !== true || !kq.bang) {
      return { loi: (kq && kq.loi) || 'Máy chủ không trả nhật ký hệ thống.' };
    }
    var thieu = BANG_NHAT_KY.filter(function (t) { return !Array.isArray(kq.bang[t]); });
    if (thieu.length) return { loi: 'Máy chủ thiếu bảng: ' + thieu.join(', ') };
    return { bang: kq.bang };
  } catch (e) {
    return { loi: String(e && e.message ? e.message : e).slice(0, 300) };
  }
}

var DOC_QUA_HAM = { tree_persons: 'sao_luu_tree_persons' };

function docBang_(cauHinh, ten) {
  if (DOC_QUA_HAM[ten]) {
    var kq, loi = '';
    try {
      kq = goi_(cauHinh, cauHinh.url + '/rest/v1/rpc/' + DOC_QUA_HAM[ten], 'đọc bảng ' + ten, {});
      if (!kq || kq.ok !== true || !Array.isArray(kq.dong)) loi = (kq && kq.loi) || JSON.stringify(kq).slice(0, 200);
    } catch (e) {
      loi = e && e.message ? e.message : String(e);
    }
    if (loi) {
      throw new Error('Không đọc được bảng ' + ten + ' qua hàm ' + DOC_QUA_HAM[ten] +
                      ' (đã dán luoc-do/66 chưa?): ' + loi);
    }
    return kq.dong;
  }
  var tatCa = [];
  var offset = 0;
  for (;;) {
    var url = cauHinh.url + '/rest/v1/' + ten +
              '?select=*&order=' + encodeURIComponent(THU_TU_DOC[ten]) +
              '&limit=' + SO_DONG_MOI_TRANG + '&offset=' + offset;
    var trang = goi_(cauHinh, url, 'đọc bảng ' + ten);
    if (!trang.length) break;
    tatCa = tatCa.concat(trang);
    if (trang.length < SO_DONG_MOI_TRANG) break;
    offset += SO_DONG_MOI_TRANG;
  }
  return tatCa;
}

function demDong_(cauHinh, ten) {
  if (DOC_QUA_HAM[ten]) return docBang_(cauHinh, ten).length;
  var url = cauHinh.url + '/rest/v1/' + ten + '?select=*&limit=1';
  var res = goiTho_(cauHinh, url, 'đếm bảng ' + ten, { Prefer: 'count=exact' });
  var dai = String(res.getHeaders()['content-range'] ||
                   res.getHeaders()['Content-Range'] || '');
  var sau = dai.split('/')[1];
  return sau && sau !== '*' ? Number(sau) : 0;
}

function docNguoiDung_(cauHinh) {
  var url = cauHinh.url + '/rest/v1/rpc/ds_tai_khoan';
  var duLieu = goi_(cauHinh, url, 'đọc danh sách tài khoản', {});
  var ds = Array.isArray(duLieu) ? duLieu : [];
  return ds.map(function (u) {
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at
    };
  });
}

function docKhoAnh_(cauHinh) {
  var tep = [];
  var tongByte = 0;
  var thuMuc = lietKeKho_(cauHinh, '');
  thuMuc.forEach(function (muc) {
    if (muc.id) return;
    lietKeKho_(cauHinh, muc.name + '/').forEach(function (t) {
      if (!t.id) return;
      var co = (t.metadata && t.metadata.size) || 0;
      tongByte += co;
      tep.push({ ten: muc.name + '/' + t.name, byte: co, capNhat: t.updated_at });
    });
  });
  return { kho: cauHinh.khoAnh, tep: tep, tongByte: tongByte };
}

function lietKeKho_(cauHinh, tienTo) {
  var ra = [];
  var offset = 0;
  for (;;) {
    var url = cauHinh.url + '/storage/v1/object/list/' + cauHinh.khoAnh;
    var trang = goi_(cauHinh, url, 'liệt kê kho ảnh', {
      prefix: tienTo,
      limit: SO_DONG_MOI_TRANG,
      offset: offset,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (!trang.length) break;
    ra = ra.concat(trang);
    if (trang.length < SO_DONG_MOI_TRANG) break;
    offset += SO_DONG_MOI_TRANG;
  }
  return ra;
}

function goi_(cauHinh, url, viec, than) {
  var res = goiTho_(cauHinh, url, viec, null, than);
  var chu = res.getContentText();
  try {
    return JSON.parse(chu);
  } catch (e) {
    throw new Error('Máy chủ trả về thứ không phải JSON khi ' + viec + ': ' +
                    chu.slice(0, 200));
  }
}

function dangNhap_(cauHinh) {
  if (cauHinh.phieu) return cauHinh.phieu;
  cauHinh.phieu = xinPhieu_(cauHinh, cauHinh.email, cauHinh.matKhau,
    'Không đăng nhập được tài khoản sao lưu. ' +
    'Kiểm EMAIL_SAO_LUU và MAT_KHAU_SAO_LUU trong Script Properties. ' +
    'Tài khoản này tạo ở Supabase → Authentication → Users, và phải được ' +
    'thêm vào bảng tree_members với role = sao_luu — xem luoc-do/05-sao-luu.sql.');
  return cauHinh.phieu;
}

function xinPhieu_(cauHinh, email, matKhau, cauLoi) {
  var res = UrlFetchApp.fetch(
    cauHinh.url + '/auth/v1/token?grant_type=password',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { apikey: cauHinh.khoaCongKhai },
      payload: JSON.stringify({ email: email, password: matKhau }),
      muteHttpExceptions: true
    });

  var ma = res.getResponseCode();
  var chu = res.getContentText();
  if (ma < 200 || ma >= 300) {
    throw new Error(cauLoi + ' (mã ' + ma + ')');
  }

  var duLieu;
  try { duLieu = JSON.parse(chu); } catch (e) { duLieu = null; }
  if (!duLieu || !duLieu.access_token) {
    throw new Error('Cửa đăng nhập trả về thứ không có access_token. ' +
                    'Kiểm KHOA_CONG_KHAI có đúng project không.');
  }
  return duLieu.access_token;
}

function goiTho_(cauHinh, url, viec, themDau, than) {
  var dau = {
    apikey: cauHinh.khoaCongKhai,
    Authorization: 'Bearer ' + dangNhap_(cauHinh)
  };
  if (themDau) Object.keys(themDau).forEach(function (k) { dau[k] = themDau[k]; });

  var chonLua = { method: than ? 'post' : 'get', headers: dau,
                  muteHttpExceptions: true };
  if (than) {
    chonLua.contentType = 'application/json';
    chonLua.payload = JSON.stringify(than);
  }

  var res = UrlFetchApp.fetch(url, chonLua);
  var ma = res.getResponseCode();
  if (ma >= 200 && ma < 300) return res;

  var than = '';
  try { than = String(res.getContentText() || '').slice(0, 300); } catch (e) { than = ''; }

  var giaiThich;
  if (ma === 401 || ma === 403) {
    giaiThich = /in browser|secret API key/i.test(than)
      ? 'Đang dùng khoá BÍ MẬT, mà Supabase chặn loại khoá ấy khi gọi từ Apps ' +
        'Script. Sao lưu bản này KHÔNG dùng khoá bí mật nữa: điền ' +
        'KHOA_CONG_KHAI (sb_publishable_…) cùng EMAIL_SAO_LUU và ' +
        'MAT_KHAU_SAO_LUU, rồi xoá hẳn KHOA_BI_MAT. Xem luoc-do/05-sao-luu.sql.'
      : 'Bị từ chối dù đã đăng nhập. Nhiều khả năng tài khoản sao lưu chưa ' +
        'được thêm vào bảng tree_members với role = sao_luu, hoặc file ' +
        'luoc-do/05-sao-luu.sql chưa chạy. Máy chủ nói: ' + than;
  } else if (ma === 404) {
    giaiThich = 'Không tìm thấy. Có thể bảng chưa dựng — bốn file trong ' +
                'luoc-do/ đã chạy đủ chưa?';
  } else {
    giaiThich = 'Máy chủ trả mã ' + ma + '. Máy chủ nói: ' + than;
  }
  throw new Error('Hỏng khi ' + viec + '. ' + giaiThich);
}

function layThuMuc_(cauHinh) {
  if (cauHinh.thuMucId) return DriveApp.getFolderById(cauHinh.thuMucId);
  var co = DriveApp.getFoldersByName(TEN_THU_MUC_MAC_DINH);
  if (co.hasNext()) return co.next();
  return DriveApp.createFolder(TEN_THU_MUC_MAC_DINH);
}

function donBanCu_(thuMuc, soBanGiu) {
  var ds = [];
  var it = thuMuc.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    var ten = f.getName();
    if (ten.indexOf(KHUON_TEN_FILE) === 0) ds.push({ ten: ten, file: f });
  }
  ds.sort(function (a, b) { return a.ten < b.ten ? 1 : a.ten > b.ten ? -1 : 0; });

  var thangDaGiu = {};
  var daXoa = 0;
  ds.forEach(function (m, i) {
    var thang = m.ten.slice(KHUON_TEN_FILE.length, KHUON_TEN_FILE.length + 7);
    if (i < soBanGiu) { thangDaGiu[thang] = true; return; }
    if (!thangDaGiu[thang]) { thangDaGiu[thang] = true; return; }
    m.file.setTrashed(true);
    daXoa++;
  });
  return daXoa;
}

function chepAnhAnToan_(cauHinh, thuMucGoc, dsTep) {
  try {
    return chepAnhSangDrive_(cauHinh, thuMucGoc, dsTep);
  } catch (e) {
    return { chepThem: 0, chuaChep: dsTep.length,
             loi: String(e && e.message ? e.message : e).slice(0, 300) };
  }
}

function chepAnhSangDrive_(cauHinh, thuMucGoc, dsTep) {
  var kq = { chepThem: 0, chuaChep: 0, loi: '' };
  if (!dsTep.length) return kq;

  var goc = thuMucCon_(thuMucGoc, TEN_THU_MUC_ANH, true);
  var theoCay = {};
  var loiLienTiep = 0;

  for (var i = 0; i < dsTep.length; i++) {
    var t = dsTep[i];
    var cat = t.ten.indexOf('/');
    var cay = t.ten.slice(0, cat);
    var ten = t.ten.slice(cat + 1);
    if (!theoCay[cay]) theoCay[cay] = docThuMucAnh_(thuMucCon_(goc, cay, true));
    var o = theoCay[cay];
    var cu = o.co[ten];
    if (cu && (!t.byte || cu.getSize() === t.byte)) continue;

    if (hetGio_(cauHinh) || loiLienTiep >= SO_LOI_LIEN_TIEP_TOI_DA) { kq.chuaChep++; continue; }
    try {
      var blob = taiAnhVe_(cauHinh, t.ten).setName(ten);
      var moi = o.thuMuc.createFile(blob);
      if (cu) cu.setTrashed(true);
      o.co[ten] = moi;
      kq.chepThem++;
      loiLienTiep = 0;
    } catch (e) {
      kq.chuaChep++;
      loiLienTiep++;
      if (!kq.loi) kq.loi = t.ten + ': ' + String(e && e.message ? e.message : e).slice(0, 250);
    }
  }
  return kq;
}

function taiAnhVe_(cauHinh, duong) {
  var url = cauHinh.url + '/storage/v1/object/authenticated/' + cauHinh.khoAnh + '/' +
            duong.split('/').map(encodeURIComponent).join('/');
  return goiTho_(cauHinh, url, 'tải ảnh ' + duong).getBlob();
}

function hetGio_(cauHinh) {
  return Date.now() - cauHinh.batDauMs > GIAY_CHEP_ANH_TOI_DA * 1000;
}

function thuMucCon_(cha, ten, taoNeuThieu) {
  var co = cha.getFoldersByName(ten);
  if (co.hasNext()) return co.next();
  return taoNeuThieu ? cha.createFolder(ten) : null;
}

function docThuMucAnh_(thuMuc) {
  var co = {};
  var it = thuMuc.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed()) continue;
    co[f.getName()] = f;
  }
  return { thuMuc: thuMuc, co: co };
}

function khoiPhucAnh() {
  var cauHinh = docCauHinh_();
  var kho = PropertiesService.getScriptProperties();
  var email = (kho.getProperty('EMAIL_KHOI_PHUC') || '').trim();
  var matKhau = kho.getProperty('MAT_KHAU_KHOI_PHUC') || '';
  var chiCay = (kho.getProperty('KHOI_PHUC_CAY') || '').trim();
  if (!email || !matKhau) {
    throw new Error('Chưa điền tài khoản khôi phục. Mở Project Settings → ' +
      'Script Properties, thêm EMAIL_KHOI_PHUC và MAT_KHAU_KHOI_PHUC của một ' +
      'tài khoản Quản trị hệ thống. Chạy xong thì xoá hai dòng ấy. ' +
      '(Có web app rồi thì khỏi: trang Quản trị tự khôi phục ảnh.)');
  }
  if (!thuMucCon_(layThuMuc_(cauHinh), TEN_THU_MUC_ANH, false)) {
    throw new Error('Trên Drive chưa có thư mục "' + TEN_THU_MUC_ANH +
      '" — sao lưu đêm chưa chép tấm ảnh nào, không có gì để khôi phục.');
  }
  var phieuGhi = xinPhieu_(cauHinh, email, matKhau,
    'Không đăng nhập được tài khoản khôi phục. Kiểm EMAIL_KHOI_PHUC và ' +
    'MAT_KHAU_KHOI_PHUC trong Script Properties.');
  var kq = khoiPhucAnhBang_(cauHinh, phieuGhi, chiCay);
  var ket = cauKhoiPhucAnh_(kq) +
            (kq.conLai ? '\nBấm chạy lại khoiPhucAnh để làm tiếp.'
                       : '\nXONG. Nhớ xoá EMAIL_KHOI_PHUC và MAT_KHAU_KHOI_PHUC.');
  Logger.log(ket);
  return ket;
}

function cauKhoiPhucAnh_(kq) {
  return 'Khôi phục ảnh: tải lên ' + kq.taiLen + ' tấm, ' + kq.daCo +
         ' tấm kho đã có sẵn, bỏ qua ' + kq.moCoi + ' tấm không còn ai dùng' +
         ', còn ' + kq.conLai + ' tấm chưa tải.' +
         (kq.loi ? '\nLỗi đầu tiên: ' + kq.loi : '');
}

function khoiPhucAnhBang_(cauHinh, phieuGhi, chiCay) {
  var goc = thuMucCon_(layThuMuc_(cauHinh), TEN_THU_MUC_ANH, false);
  if (!goc) return { taiLen: 0, daCo: 0, moCoi: 0, conLai: 0,
                     loi: 'Trên Drive chưa có thư mục "' + TEN_THU_MUC_ANH + '".' };

  var coSan = {};
  docKhoAnh_(cauHinh).tep.forEach(function (t) { coSan[t.ten] = true; });

  var canDung = {};
  docBang_(cauHinh, 'media').forEach(function (m) {
    [m.drive_file_id, m.drive_file_id_lon].forEach(function (d) {
      if (d && String(d).indexOf('/') > 0) canDung[d] = true;
    });
  });

  var kq = { taiLen: 0, daCo: 0, moCoi: 0, conLai: 0, loi: '' };
  var loiLienTiep = 0;
  var cacCay = goc.getFolders();
  while (cacCay.hasNext()) {
    var thuMucCay = cacCay.next();
    var cay = thuMucCay.getName();
    if (chiCay && cay !== chiCay) continue;
    var tep = docThuMucAnh_(thuMucCay).co;
    Object.keys(tep).forEach(function (ten) {
      var duong = cay + '/' + ten;
      if (coSan[duong]) { kq.daCo++; return; }
      if (!canDung[duong]) { kq.moCoi++; return; }
      if (hetGio_(cauHinh) || loiLienTiep >= SO_LOI_LIEN_TIEP_TOI_DA) { kq.conLai++; return; }
      var loi = taiAnhLen_(cauHinh, phieuGhi, duong, tep[ten].getBlob());
      if (loi === '') { kq.taiLen++; loiLienTiep = 0; return; }
      if (loi === 'da_co') { kq.daCo++; loiLienTiep = 0; return; }
      kq.conLai++;
      loiLienTiep++;
      if (!kq.loi) kq.loi = duong + ': ' + loi;
    });
  }
  return kq;
}

function doGet() {
  return traJson_({ ok: true, may: 'giapha-sao-luu', phienBan: '0.10.0' });
}

function doPost(e) {
  var ra;
  try {
    var yc = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var cauHinh = docCauHinh_();
    xacMinhQtht_(cauHinh, yc.ve);
    if (yc.viec === 'danh-sach') {
      ra = { ok: true, ds: dsBanSaoLuu_(cauHinh) };
    } else if (yc.viec === 'tai') {
      ra = taiBanSaoLuu_(cauHinh, yc.id);
    } else if (yc.viec === 'sao-luu-ngay') {
      ra = { ok: true, cau: saoLuuNgay() };
    } else if (yc.viec === 'khoi-phuc-anh') {
      var kq = khoiPhucAnhBang_(cauHinh, yc.ve, '');
      ra = { ok: true, taiLen: kq.taiLen, daCo: kq.daCo, moCoi: kq.moCoi, conLai: kq.conLai,
             loi: kq.loi, cau: cauKhoiPhucAnh_(kq) };
    } else {
      ra = { ok: false, loi: 'Máy sao lưu không biết việc "' + String(yc.viec).slice(0, 40) + '".' };
    }
  } catch (err) {
    ra = { ok: false, loi: String(err && err.message ? err.message : err).slice(0, 500) };
  }
  return traJson_(ra);
}

function traJson_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function xacMinhQtht_(cauHinh, ve) {
  if (!ve || typeof ve !== 'string') throw new Error('Thiếu vé đăng nhập — hãy đăng nhập lại app.');
  var dau = { apikey: cauHinh.khoaCongKhai, Authorization: 'Bearer ' + ve };
  var ai = UrlFetchApp.fetch(cauHinh.url + '/auth/v1/user',
                             { method: 'get', headers: dau, muteHttpExceptions: true });
  if (ai.getResponseCode() !== 200) {
    throw new Error('Vé đăng nhập không hợp lệ hoặc đã hết hạn — đăng xuất rồi đăng nhập lại app.');
  }
  var la = UrlFetchApp.fetch(cauHinh.url + '/rest/v1/rpc/la_quan_tri_he_thong', {
    method: 'post', headers: dau, contentType: 'application/json', payload: '{}',
    muteHttpExceptions: true });
  if (la.getResponseCode() !== 200 || la.getContentText().trim() !== 'true') {
    throw new Error('Chỉ Quản trị hệ thống mới dùng được máy sao lưu.');
  }
}

function dsBanSaoLuu_(cauHinh) {
  var ds = [];
  var it = layThuMuc_(cauHinh).getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed() || !laTenBanSaoLuu_(f.getName())) continue;
    ds.push({ id: f.getId(), ten: f.getName(), byte: f.getSize() });
  }
  ds.sort(function (a, b) { return a.ten < b.ten ? 1 : a.ten > b.ten ? -1 : 0; });
  return ds.slice(0, 400);
}

function laTenBanSaoLuu_(ten) {
  return /^giapha-sao-luu-\d{4}-\d{2}-\d{2}-\d{4}\.json$/.test(ten);
}

function taiBanSaoLuu_(cauHinh, id) {
  var f;
  try { f = DriveApp.getFileById(String(id || '')); } catch (e) { f = null; }
  if (!f || f.isTrashed() || !laTenBanSaoLuu_(f.getName())) {
    return { ok: false, loi: 'Không có bản sao lưu này.' };
  }
  var thuMucId = layThuMuc_(cauHinh).getId();
  var trong = false;
  var cha = f.getParents();
  while (cha.hasNext()) { if (cha.next().getId() === thuMucId) { trong = true; break; } }
  if (!trong) return { ok: false, loi: 'Không có bản sao lưu này.' };
  return { ok: true, ten: f.getName(), noiDung: f.getBlob().getDataAsString('UTF-8') };
}

function taiAnhLen_(cauHinh, phieu, duong, blob) {
  var url = cauHinh.url + '/storage/v1/object/' + cauHinh.khoAnh + '/' +
            duong.split('/').map(encodeURIComponent).join('/');
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { apikey: cauHinh.khoaCongKhai, Authorization: 'Bearer ' + phieu,
               'x-upsert': 'false' },
    contentType: blob.getContentType() || 'image/jpeg',
    payload: blob.getBytes(),
    muteHttpExceptions: true
  });
  var ma = res.getResponseCode();
  if (ma >= 200 && ma < 300) return '';
  var than = '';
  try { than = String(res.getContentText() || '').slice(0, 200); } catch (e) { than = ''; }
  if (ma === 409 || /already exists|Duplicate/i.test(than)) return 'da_co';
  if (ma === 401 || ma === 403 || /row-level security/i.test(than)) {
    return 'bị từ chối — tài khoản khôi phục phải là Quản trị hệ thống (hoặc ' +
           'Quản trị gia phả của cây này), và cây không được nằm thùng rác. ' +
           'Máy chủ nói: ' + than;
  }
  return 'mã ' + ma + ': ' + than;
}

function soVoiLanTruoc_(dem) {
  var kho = PropertiesService.getScriptProperties();
  var thoChu = kho.getProperty('DEM_LAN_TRUOC');
  if (!thoChu) return null;
  var truoc;
  try { truoc = JSON.parse(thoChu); } catch (e) { return null; }

  var loi = [];
  Object.keys(truoc).forEach(function (bang) {
    var cu = Number(truoc[bang]) || 0;
    var moi = Number(dem[bang]) || 0;
    if (cu >= 10 && moi < cu / 2) {
      loi.push('  ' + bang + ': ' + cu + ' → ' + moi + ' dòng');
    }
  });
  if (!loi.length) return null;
  return 'Số dòng tụt hơn một nửa so với lần sao lưu trước:\n\n' +
         loi.join('\n') + '\n\n' +
         'Có thể là thật (ai đó dọn thùng rác), có thể là dữ liệu đã mất. ' +
         'Mở app kiểm bằng mắt trước khi để bản sao lưu cũ bị dọn đi.';
}

function nhoDemLanNay_(dem) {
  PropertiesService.getScriptProperties()
    .setProperty('DEM_LAN_TRUOC', JSON.stringify(dem));
}

function guiThu_(tieuDe, than) {
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), tieuDe, than);
  } catch (e) {
    Logger.log('Không gửi được thư: ' + e);
  }
}

function docCauHinh_() {
  var kho = PropertiesService.getScriptProperties();
  var url = (kho.getProperty('SUPABASE_URL') || '').trim().replace(/\/+$/, '');
  var khoaCongKhai = (kho.getProperty('KHOA_CONG_KHAI') || '').trim();
  var email = (kho.getProperty('EMAIL_SAO_LUU') || '').trim();
  var matKhau = kho.getProperty('MAT_KHAU_SAO_LUU') || '';

  if (!url || !khoaCongKhai || !email || !matKhau) {
    throw new Error('Chưa điền đủ cấu hình. Mở Project Settings → Script ' +
      'Properties và thêm BỐN dòng: SUPABASE_URL · KHOA_CONG_KHAI · ' +
      'EMAIL_SAO_LUU · MAT_KHAU_SAO_LUU. ' +
      'Hướng dẫn từng bước ở sao-luu/HUONG-DAN-SAO-LUU.md.');
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    throw new Error('SUPABASE_URL trông không đúng khuôn. Phải có dạng ' +
      'https://xxxxxxxx.supabase.co — không có dấu / ở cuối.');
  }

  if (/^sb_secret_|service_role/.test(khoaCongKhai)) {
    throw new Error('KHOA_CONG_KHAI đang là khoá BÍ MẬT. Bản sao lưu này ' +
      'không dùng khoá bí mật nữa — Supabase chặn nó khi gọi từ Apps Script, ' +
      'và loại đời cũ sắp bị khai tử. Chép đúng dòng "Publishable key" ' +
      '(sb_publishable_…) ở Project Settings → API Keys.');
  }
  if (!/^(sb_publishable_|eyJ)/.test(khoaCongKhai)) {
    throw new Error('KHOA_CONG_KHAI không đúng khuôn. Khoá công khai của ' +
      'Supabase bắt đầu bằng "sb_publishable_" (bản mới) hoặc "eyJ" ' +
      '(khoá anon đời cũ).');
  }

  var bay = new Date();
  return {
    url: url,
    khoaCongKhai: khoaCongKhai,
    email: email,
    matKhau: matKhau,
    phieu: null,
    khoAnh: (kho.getProperty('KHO_ANH') || 'anh').trim(),
    thuMucId: (kho.getProperty('THU_MUC_DRIVE') || '').trim(),
    soBanGiu: Number(kho.getProperty('SO_BAN_GIU')) || SO_BAN_GIU_MAC_DINH,
    batDauMs: bay.getTime(),
    taoLuc: bay.toISOString(),
    taoLucVn: Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'),
    dauThoiGian: Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd-HHmm')
  };
}
