/**
 * SCHEDULE TRACKER MODULE (READING FROM GOOGLE SHEET)
 */

document.addEventListener('DOMContentLoaded', () => {
  fetchScheduleData();
  setupScheduleEventListeners();
});

let currentFilter = 'all';
let searchQuery = '';

async function fetchScheduleData() {
  const container = document.getElementById('scheduleResultsGrid');
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i><p style="margin-top: 10px; color: var(--text-muted);">Đang tải dữ liệu thời khóa biểu từ Google Sheet...</p></div>';

  try {
    const res = await fetch(CONFIG.API.SCHEDULE);
    const result = await res.json();

    if (result.status === 'success' && Array.isArray(result.data)) {
      state.registrations = result.data;
      renderScheduleList();
    } else {
      renderScheduleList(); // Render state fallback
    }
  } catch (err) {
    console.error('Fetch schedule error:', err);
    renderScheduleList();
  }
}

function renderScheduleList() {
  const container = document.getElementById('scheduleResultsGrid');
  if (!container) return;

  let items = state.registrations || [];

  // Update Count Badges
  const countAll = items.length;
  const countPending = items.filter(i => (i['Trạng Thái'] || '').includes('Chờ')).length;
  const countConfirmed = items.filter(i => (i['Trạng Thái'] || '').includes('xác nhận')).length;

  document.getElementById('countAll').textContent = countAll;
  document.getElementById('countPending').textContent = countPending;
  document.getElementById('countConfirmed').textContent = countConfirmed;

  // Filter by Status
  if (currentFilter !== 'all') {
    items = items.filter(i => (i['Trạng Thái'] || '').includes(currentFilter));
  }

  // Filter by Search Query
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    items = items.filter(i => 
      (i['Họ và Tên'] || '').toLowerCase().includes(q) ||
      (i['Số Điện Thoại / Zalo'] || '').includes(q) ||
      (i['Email'] || '').toLowerCase().includes(q) ||
      (i['Mã Đăng Ký'] || '').toLowerCase().includes(q)
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-folder-open fa-3x" style="color: var(--text-muted); margin-bottom: 12px;"></i>
        <h4 style="font-size: 1.1rem;">Chưa tìm thấy dữ liệu đăng ký phù hợp</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Hãy thử tìm kiếm bằng SĐT khác hoặc chọn tab "Đăng ký Lịch học" để gửi đăng ký mới.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  items.forEach(item => {
    const isConfirmed = (item['Trạng Thái'] || '').includes('xác nhận');
    const statusClass = isConfirmed ? 'confirmed' : 'pending';
    const statusIcon = isConfirmed ? 'fa-circle-check' : 'fa-clock';

    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-card-header">
        <span style="font-weight: 800; font-size: 0.85rem; color: var(--primary);">${item['Mã Đăng Ký'] || 'DK-REG'}</span>
        <span class="status-badge ${statusClass}">
          <i class="fa-solid ${statusIcon}"></i> ${item['Trạng Thái'] || 'Chờ xác nhận'}
        </span>
      </div>

      <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px;">${item['Họ và Tên'] || 'Học viên'}</h3>
      
      <div style="font-size: 0.88rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px;">
        <div><i class="fa-solid fa-phone" style="width: 18px;"></i> ${item['Số Điện Thoại / Zalo'] || 'N/A'}</div>
        ${item['Email'] ? `<div><i class="fa-solid fa-envelope" style="width: 18px;"></i> ${item['Email']}</div>` : ''}
        <div><i class="fa-solid fa-fire" style="width: 18px;"></i> ${item['Loại Học Viên'] || 'Cấp tốc'} (${item['Số Buổi / Tuần'] || ''})</div>
      </div>

      <div style="background: var(--bg-input); padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.83rem;">
        <span style="font-weight: 700; color: var(--text-main); display: block; margin-bottom: 4px;">
          <i class="fa-solid fa-calendar-week text-primary"></i> Lịch học đăng ký:
        </span>
        <div style="color: var(--text-muted); line-height: 1.4;">
          ${item['Các Ca Học Đã Chọn'] || 'Chưa chọn ca'}
        </div>
      </div>

      ${item['Mục Tiêu Học Tập'] ? `
        <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
          <strong>Mục tiêu:</strong> ${item['Mục Tiêu Học Tập']}
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });
}

function setupScheduleEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const refreshBtn = document.getElementById('refreshScheduleBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      searchQuery = searchInput.value;
      renderScheduleList();
    });

    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        searchQuery = searchInput.value;
        renderScheduleList();
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchScheduleData();
      if (typeof showToast === 'function') {
        showToast('Đang làm mới dữ liệu từ Google Sheet...', 'info');
      }
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderScheduleList();
    });
  });
}
