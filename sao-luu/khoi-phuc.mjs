import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const THU_TU = ['trees', 'persons', 'unions', 'branches', 'branch_access',
  'tree_persons', 'union_children', 'tree_members', 'media', 'sources', 'change_log',
  'imports', 'user_settings', 'cau_hinh', 'tai_khoan', 'doi_ma_toan_cuc',
  'de_xuat_gan_nguoi', 'de_nghi_quan_he', 'de_xuat_dong_ho'];

export function kiemFile(sl) {
  const loi = [];
  if (!sl || sl.khuon !== 'giapha-sao-luu') return ['Không phải file sao lưu gia phả (thiếu "khuon": "giapha-sao-luu").'];
  if (sl.phienBanKhuon !== 1) loi.push('Khuôn phiên bản ' + sl.phienBanKhuon + ' — script này chỉ biết bản 1.');
  const bang = sl.bang || {};
  for (const t of Object.keys(bang)) if (!THU_TU.includes(t)) loi.push('Bảng lạ "' + t + '" — chưa có trong THU_TU.');
  for (const t of THU_TU) {
    if (!Array.isArray(bang[t])) { loi.push('Thiếu bảng "' + t + '".'); continue; }
    if (sl.dem && sl.dem[t] !== undefined && sl.dem[t] !== bang[t].length) {
      loi.push('Bảng "' + t + '": khối dem ghi ' + sl.dem[t] + ' dòng, thực có ' + bang[t].length + '.');
    }
  }
  if (sl.thieuSoVoiMayChu) loi.push('Bản này tự khai THIẾU so với máy chủ: ' + sl.thieuSoVoiMayChu);
  return loi;
}

export function sinhSql(sl, tenFile) {
  const khoiDuLieu = THU_TU.map((t, i) => {
    const json = JSON.stringify(sl.bang[t]);
    let the = 'kp';
    while (json.includes('$' + the + '$')) the += 'x';
    return '  (' + (i + 1) + ", '" + t + "', $" + the + '$' + json + '$' + the + '$::jsonb)';
  }).join(',\n');
  const nhan = JSON.stringify({ tep: tenFile, taoLucVn: sl.taoLucVn || '', nguon: sl.nguon || '' });

  return `-- ============================================================
-- KHÔI PHỤC TOÀN PHẦN từ bản sao lưu ${tenFile}
-- Bản chụp lúc : ${sl.taoLucVn || '?'}   ·   nguồn: ${sl.nguon || '?'}
-- Sinh bởi     : supabase/sao-luu/khoi-phuc.mjs
-- ============================================================
-- ⚠ XOÁ SẠCH 19 bảng gia phả hiện có rồi đổ lại bản chụp trên. Mọi sửa đổi
--   SAU lúc chụp sẽ MẤT. Hỏng giữa chừng thì không gì bị đổi.
-- Bảng cuối cùng: mỗi bảng một dòng, cột ket_qua phải là ĐẠT cả.
-- ============================================================

begin;

-- Giờ UTC: đọc lại ngày giờ ra đúng dạng bản sao lưu ghi (+00:00), để so từng dòng.
set local timezone = 'UTC';

drop table if exists pg_temp._kp_du_lieu, pg_temp._kp_bao_cao;
create temp table _kp_du_lieu (thu_tu int primary key, bang text not null, dong jsonb not null);
create temp table _kp_bao_cao (thu_tu serial, muc text, chi_tiet text, ket_qua text);

insert into _kp_du_lieu (thu_tu, bang, dong) values
${khoiDuLieu};

do $khoi_phuc$
declare
  r        record;
  fk       record;
  tg       record;
  v_dong   jsonb;
  v_cot    text;
  v_n      int;
  v_that   int;
  v_bo     jsonb := '[]'::jsonb;
  v_ma     text;
  v_tat    text[] := '{}';
begin
  -- 0. Mọi bảng trong bản sao lưu phải có trên máy chủ.
  for r in select bang from _kp_du_lieu loop
    if to_regclass('public.' || quote_ident(r.bang)) is null then
      raise exception 'Máy chủ không có bảng public.% — lược đồ lệch với bản sao lưu', r.bang;
    end if;
  end loop;

  -- 1. Tắt trigger NGƯỜI DÙNG đang bật (Đời, nhật ký, chặn ghi đè, máy sao lưu…).
  --    Khoá ngoại vẫn gác — chúng là trigger hệ thống, không nằm trong số này.
  for tg in
    select t.tgrelid::regclass as bang, t.tgname
      from pg_trigger t
     where not t.tgisinternal and t.tgenabled <> 'D'
       and t.tgrelid in (select ('public.' || quote_ident(bang))::regclass from _kp_du_lieu)
  loop
    execute format('alter table %s disable trigger %I', tg.bang, tg.tgname);
    v_tat := v_tat || (tg.bang::text || '|' || tg.tgname);
  end loop;

  -- 2. Xoá sạch — một lệnh cho cả 19 bảng, để khoá ngoại giữa chúng không vướng.
  execute (select 'truncate table ' || string_agg(format('public.%I', bang), ', ') from _kp_du_lieu);

  -- 3. Đổ lại, cha trước con.
  for r in select * from _kp_du_lieu order by thu_tu loop
    v_dong := r.dong;

    -- 3a. Tài khoản đã mất: làm đúng điều khoá ngoại tự khai.
    for fk in
      select a.attname as cot, c.confdeltype as luat
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
       where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
         and c.conrelid = ('public.' || quote_ident(r.bang))::regclass
         and array_length(c.conkey, 1) = 1
    loop
      select count(*) into v_n from jsonb_array_elements(v_dong) e
       where e->>fk.cot is not null
         and not exists (select 1 from auth.users u where u.id::text = e->>fk.cot);
      continue when v_n = 0;
      v_bo := v_bo || jsonb_build_object('bang', r.bang, 'cot', fk.cot, 'so_dong', v_n,
        'lam', case fk.luat when 'c' then 'bỏ dòng' when 'n' then 'đặt trống' else '?' end,
        'tai_khoan', (select jsonb_agg(distinct e->>fk.cot) from jsonb_array_elements(v_dong) e
                       where e->>fk.cot is not null
                         and not exists (select 1 from auth.users u where u.id::text = e->>fk.cot)));
      if fk.luat = 'c' then
        select coalesce(jsonb_agg(e order by i), '[]'::jsonb) into v_dong
          from jsonb_array_elements(v_dong) with ordinality x(e, i)
         where not (e->>fk.cot is not null
                    and not exists (select 1 from auth.users u where u.id::text = e->>fk.cot));
      elsif fk.luat = 'n' then
        select coalesce(jsonb_agg(
                 case when e->>fk.cot is not null
                       and not exists (select 1 from auth.users u where u.id::text = e->>fk.cot)
                      then jsonb_set(e, array[fk.cot::text], 'null'::jsonb) else e end
                 order by i), '[]'::jsonb) into v_dong
          from jsonb_array_elements(v_dong) with ordinality x(e, i);
      else
        raise exception 'Bảng % cột % trỏ tới tài khoản đã mất, mà khoá ngoại không khai cascade/set null', r.bang, fk.cot;
      end if;
      insert into _kp_bao_cao (muc, chi_tiet, ket_qua)
      values ('tài khoản đã mất · ' || r.bang || '.' || fk.cot,
              v_n || ' dòng — ' || case fk.luat when 'c' then 'bỏ dòng' else 'đặt trống' end, 'LƯU Ý');
    end loop;

    -- 3b. Cột = khoá có trong bản sao lưu ∩ cột có trên máy chủ. Cột máy chủ có
    --     mà bản sao lưu không có → nhận giá trị mặc định (không phải null).
    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position) into v_cot
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = r.bang and c.is_generated = 'NEVER'
       and c.column_name in (select distinct k from jsonb_array_elements(v_dong) e, jsonb_object_keys(e) k);

    if jsonb_array_length(v_dong) > 0 then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)',
                     r.bang, v_cot, v_cot, r.bang) using v_dong;
    end if;

    execute format('select count(*) from public.%I', r.bang) into v_that;
    if v_that <> jsonb_array_length(v_dong) then
      raise exception 'Bảng %: đổ % dòng mà đếm lại được %', r.bang, jsonb_array_length(v_dong), v_that;
    end if;

    -- 3c. So TỪNG DÒNG: đọc lại bảng, chỉ giữ các cột bản sao lưu có, rồi
    --     "bản chụp EXCEPT ALL máy" phải rỗng. Lệch một dòng là huỷ cả lần khôi phục.
    execute format(
      'select count(*) from (select e from jsonb_array_elements($1) e
         except all
         select (select coalesce(jsonb_object_agg(j.key, j.value), ''{}'') from jsonb_each(to_jsonb(x)) j
                  where j.key in (select distinct k from jsonb_array_elements($1) e2, jsonb_object_keys(e2) k))
           from public.%I x) lech', r.bang) using v_dong into v_n;
    insert into _kp_bao_cao (muc, chi_tiet, ket_qua)
    values (r.bang, v_that || ' dòng · so từng dòng: ' || case when v_n = 0 then 'khớp' else v_n || ' dòng lệch' end,
            case when v_n = 0 then 'ĐẠT' else 'HỎNG' end);
    if v_n <> 0 then
      raise exception 'Bảng %: % dòng đọc lại KHÔNG khớp bản chụp — huỷ khôi phục', r.bang, v_n;
    end if;
  end loop;

  -- 4. Bộ đếm số tự tăng (change_log, imports) phải đứng SAU số lớn nhất vừa đổ.
  for r in
    select c.table_name as bang, c.column_name as cot,
           pg_get_serial_sequence(format('public.%I', c.table_name), c.column_name) as day_so
      from information_schema.columns c
     where c.table_schema = 'public' and c.column_default like 'nextval(%'
       and c.table_name in (select bang from _kp_du_lieu)
  loop
    execute format('select setval(%L, coalesce((select max(%I) from public.%I), 0) + 1, false)',
                   r.day_so, r.cot, r.bang);
  end loop;

  -- 5. Tài khoản mở SAU lúc chụp: trigger sau_khi_tao_user đã cấp dòng
  --    tai_khoan, bước 2 vừa xoá mất → cấp lại (cùng cách sinh mã ngắn của luoc-do/11).
  v_n := 0;
  for r in select u.id from auth.users u
            where not exists (select 1 from public.tai_khoan k where k.user_id = u.id) loop
    loop
      v_ma := left(translate(upper(substring(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 12)),
                             '0123456789ABCDEF', '23456789ABCDEFGH'), 6);
      exit when not exists (select 1 from public.tai_khoan where ma_ngan = v_ma);
    end loop;
    insert into public.tai_khoan (user_id, ma_ngan) values (r.id, v_ma);
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    insert into _kp_bao_cao (muc, chi_tiet, ket_qua)
    values ('tài khoản mở sau lúc chụp', v_n || ' tài khoản được cấp lại dòng tai_khoan (quyền trống)', 'LƯU Ý');
  end if;

  -- 6. Bật lại đúng những trigger bước 1 đã tắt.
  for tg in select split_part(x, '|', 1) as bang, split_part(x, '|', 2) as ten from unnest(v_tat) x loop
    execute format('alter table %s enable trigger %I', tg.bang, tg.ten);
  end loop;
  insert into _kp_bao_cao (muc, chi_tiet, ket_qua)
  values ('trigger', coalesce(array_length(v_tat, 1), 0) || ' trigger tắt lúc đổ, đã bật lại', 'ĐẠT');

  -- 7. Một dòng vào nhật ký hệ thống (nếu máy chủ đã có luoc-do/42).
  if to_regprocedure('public.ghi_nhat_ky(text, text, text, jsonb, uuid)') is not null then
    perform public.ghi_nhat_ky('backup', 'Khôi phục từ bản sao lưu', ${"'" + (sl.taoLucVn || '').replace(/'/g, "''") + "'"},
      jsonb_build_object('ban_sao_luu', '${nhan.replace(/'/g, "''")}'::jsonb, 'da_bo', v_bo));
  end if;
end
$khoi_phuc$;

commit;

select muc as "Mục", chi_tiet as "Chi tiết", ket_qua as "Kết quả" from _kp_bao_cao order by thu_tu;
`;
}

const DAY = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [vao, ra0] = process.argv.slice(2);
  if (!vao) { console.error('Cách dùng: node supabase/sao-luu/khoi-phuc.mjs <file-sao-luu.json> [file-ra.sql]'); process.exit(1); }
  const ra = resolve(ra0 || vao.replace(/\.json$/i, '') + '.khoi-phuc.sql');
  const REPO = resolve(DAY, '..') + sep;
  if (ra.toLowerCase().startsWith(REPO.toLowerCase())) {
    console.error('⚠ Từ chối ghi vào ' + ra + '\n  File SQL chứa cả gia phả, còn supabase/ là repo Public. Ghi ra ngoài repo.');
    process.exit(1);
  }
  const sl = JSON.parse(readFileSync(vao, 'utf8'));
  const loi = kiemFile(sl);
  if (loi.length) { console.error('✗ File sao lưu không dùng được:\n  - ' + loi.join('\n  - ')); process.exit(1); }
  writeFileSync(ra, sinhSql(sl, basename(vao)), 'utf8');
  console.log('Đã ghi ' + ra);
  console.log('Bản chụp ' + (sl.taoLucVn || '?') + ' · ' + THU_TU.map((t) => t + ' ' + sl.bang[t].length).join(' · '));
}
