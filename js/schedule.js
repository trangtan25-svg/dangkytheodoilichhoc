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

  let success = false;
  let lastErrorMessage = '';

  // Ưu tiên 1: Gọi trực tiếp Google Apps Script URL nếu đã được lưu trong CONFIG / localStorage
  if (CONFIG.GOOGLE_SCRIPT_URL) {
    try {
      const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL + (CONFIG.GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?') + 't=' + Date.now(), { redirect: 'follow' });
      if (res.ok) {
        const textRes = await res.text();
        if (textRes.trim().startsWith('<')) {
          lastErrorMessage = 'Bản triển khai Web App trên Google Script chưa chọn quyền "Anyone" (Bất kỳ ai). Google yêu cầu đăng nhập.';
        } else {
          const result = JSON.parse(textRes);
          if (result.status === 'success') {
            state.registrations = Array.isArray(result.registrations) ? result.registrations : (Array.isArray(result.data) ? result.data : []);
            state.dropdownSlots = Array.isArray(result.dropdowns) ? result.dropdowns : [];
            success = true;
          } else if (result.message) {
            lastErrorMessage = result.message;
          }
        }
      }
    } catch (err) {
      console.warn('Direct Google Script fetch error:', err);
    }
  }

  // Ưu tiên 2: Gọi qua Vercel API (/api/schedule) nếu chưa lấy được dữ liệu bằng URL trực tiếp
  if (!success) {
    try {
      const res = await fetch(CONFIG.API.SCHEDULE + '?t=' + Date.now());
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'success') {
          state.registrations = Array.isArray(result.registrations) ? result.registrations : (Array.isArray(result.data) ? result.data : []);
          state.dropdownSlots = Array.isArray(result.dropdowns) ? result.dropdowns : [];
          success = true;
        } else if (result.message) {
          lastErrorMessage = result.message;
        }
      } else if (res.status === 404) {
        lastErrorMessage = 'Môi trường hiện tại chưa cấu hình API Route (/api/schedule). Vui lòng dán Web App URL trực tiếp bên dưới.';
      }
    } catch (err) {
      console.warn('Vercel API endpoint unavailable:', err);
    }
  }

  if (success) {
    renderScheduleList();
    if (typeof renderSlotsGrid === 'function') {
      renderSlotsGrid();
    }
  } else {
    renderConnectionPrompt(container, lastErrorMessage);
  }
}

function renderConnectionPrompt(container, errorMessage = '') {
  const currentUrl = CONFIG.GOOGLE_SCRIPT_URL || '';
  container.innerHTML = `
    <div style="grid-column: 1/-1; padding: 32px 24px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--primary); text-align: center;">
      <i class="fa-solid fa-link-slash fa-3x text-warning" style="margin-bottom: 16px;"></i>
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">Chưa lấy được dữ liệu từ Google Sheet</h3>
      ${errorMessage ? `<p style="color: var(--danger); font-weight: 600; font-size: 0.95rem; background: rgba(239,68,68,0.1); padding: 10px; border-radius: 6px; margin: 12px auto; max-width: 650px;"><i class="fa-solid fa-triangle-exclamation"></i> ${errorMessage}</p>` : ''}
      <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 600px; margin: 0 auto 20px auto;">
        Vui lòng dán <strong>URL Web App từ Google Apps Script</strong> của bạn vào bên dưới để hoàn tất liên kết dữ liệu 2 chiều.
      </p>
      
      <div style="display: flex; gap: 10px; max-width: 650px; margin: 0 auto;">
        <input type="url" id="scriptUrlInput" value="${currentUrl}" placeholder="https://script.google.com/macros/s/AKfycb.../exec" style="flex: 1; padding: 10px 14px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-main); font-size: 0.9rem;">
        <button id="saveScriptUrlBtn" class="btn btn-primary" style="white-space: nowrap;">
          <i class="fa-solid fa-plug"></i> Kết nối ngay
        </button>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
        <i class="fa-solid fa-circle-info"></i> Sau khi bấm "Kết nối ngay", dữ liệu thời khóa biểu và số lượng học viên từng ca sẽ được hiển thị ngay lập tức!
      </p>
    </div>
  `;

  document.getElementById('saveScriptUrlBtn').addEventListener('click', () => {
    const inputVal = document.getElementById('scriptUrlInput').value.trim();
    if (!inputVal || !inputVal.includes('script.google.com')) {
      if (typeof showToast === 'function') showToast('Vui lòng dán đúng URL Google Apps Script dạng https://script.google.com/macros/s/.../exec', 'error');
      return;
    }
    localStorage.setItem('GOOGLE_SCRIPT_URL', inputVal);
    CONFIG.GOOGLE_SCRIPT_URL = inputVal;
    if (typeof showToast === 'function') showToast('Đã lưu cấu hình kết nối Google Sheet!', 'success');
    fetchScheduleData();
  });
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
