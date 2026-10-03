export function duongDan(...doan) {
  return doan.filter(Boolean).map((d) => encodeURIComponent(d)).join('/');
}
