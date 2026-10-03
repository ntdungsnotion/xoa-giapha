import { mountKhung } from './pages/quan-tri/khung.js';

async function main() {
  const el = document.getElementById('app');
  if (!el) {
    console.error('[quan-tri] không tìm thấy phần tử #app trong QuanTri.html');
    return;
  }
  await mountKhung(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
