/**
 * SCHEDULE TRACKER MODULE (READING FROM GOOGLE SHEET)
 */

document.addEventListener('DOMContentLoaded', () => {
  fetchScheduleData();
  setupScheduleEventListeners();
});

let currentFilter = 'all';
let searchQuery = '';
let currentViewMode = 'grid'; // 'grid' | 'cards'

async function fetchScheduleData() {
  const container = document.getElementById('scheduleResultsGrid');
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i><p style="margin-top: 10px; color: var(--text-muted);">Đang tải dữ liệu thời khóa biểu từ Google Sheet...</p></div>';

  let success = false;
  let lastErrorMessage = '';

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
    } else {
      lastErrorMessage = `Lỗi máy chủ HTTP ${res.status}. Vui lòng kiểm tra lại cấu hình biến môi trường GOOGLE_SCRIPT_URL trên Vercel.`;
    }
  } catch (err) {
    console.error('Fetch schedule error:', err);
    lastErrorMessage = 'Lỗi kết nối mạng hoặc serverless function không phản hồi.';
  }

  if (success) {
    renderScheduleList();
    if (typeof renderSlotsGrid === 'function') {
      renderSlotsGrid();
    }
  } else {
    renderErrorNotice(container, lastErrorMessage);
  }
}

function renderErrorNotice(container, errorMessage = '') {
  container.innerHTML = `
    <div style="grid-column: 1/-1; padding: 40px 24px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--danger); text-align: center;">
      <i class="fa-solid fa-triangle-exclamation fa-3x text-danger" style="margin-bottom: 16px;"></i>
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">Chưa kết nối được với Google Sheet qua Vercel</h3>
      <p style="color: var(--danger); font-size: 0.95rem; max-width: 600px; margin: 0 auto 12px auto; font-weight: 600;">
        ${errorMessage || 'Không thể lấy dữ liệu thời khóa biểu.'}
      </p>
      <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 600px; margin: 0 auto;">
        Vui lòng kiểm tra biến môi trường <code>GOOGLE_SCRIPT_URL</code> trong <strong>Vercel Project Settings -&gt; Environment Variables</strong> và đảm bảo bạn đã Redeploy phiên bản mới nhất.
      </p>
    </div>
  `;
}

// Hàm Nhân viên Xác nhận Đăng ký học viên -> Đồng bộ trực tiếp lên Google Sheet
async function confirmStudentRegistration(registrationId, btnElement) {
  if (!registrationId) return;

  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang duyệt...';
  }

  try {
    const res = await fetch(CONFIG.API.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirmRegistration',
        registrationId: registrationId
      })
    });

    const result = await res.json();
    if (result && result.status === 'success') {
      if (typeof showToast === 'function') {
        showToast(`Đã xác nhận đăng ký thành công cho mã ${registrationId}!`, 'success');
      }

      // Cập nhật trạng thái cục bộ
      const target = (state.registrations || []).find(r => r['Mã Đăng Ký'] === registrationId);
      if (target) {
        target['Trạng Thái'] = 'Đã xác nhận';
      }

      renderScheduleList();
      if (typeof renderSlotsGrid === 'function') {
        renderSlotsGrid();
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(result.message || 'Chưa thể xác nhận đăng ký.', 'error');
      }
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác nhận';
      }
    }
  } catch (err) {
    console.error('Confirm error:', err);
    if (typeof showToast === 'function') {
      showToast('Lỗi kết nối khi xác nhận đăng ký.', 'error');
    }
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác nhận';
    }
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

  const countAllEl = document.getElementById('countAll');
  const countPendingEl = document.getElementById('countPending');
  const countConfirmedEl = document.getElementById('countConfirmed');

  if (countAllEl) countAllEl.textContent = countAll;
  if (countPendingEl) countPendingEl.textContent = countPending;
  if (countConfirmedEl) countConfirmedEl.textContent = countConfirmed;

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

  // CHẾ ĐỘ 1: XEM THEO THỨ & CA HỌC (GRID VIEW)
  if (currentViewMode === 'grid') {
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
    container.style.gap = '20px';

    // 7 Ngày trong tuần
    const daysList = CONFIG.DAYS || [
      { key: 'T2', label: 'Thứ 2' },
      { key: 'T3', label: 'Thứ 3' },
      { key: 'T4', label: 'Thứ 4' },
      { key: 'T5', label: 'Thứ 5' },
      { key: 'T6', label: 'Thứ 6' },
      { key: 'T7', label: 'Thứ 7' },
      { key: 'CN', label: 'Chủ Nhật' }
    ];

    const shiftsList = (Array.isArray(state.dropdownSlots) && state.dropdownSlots.length > 0)
      ? Array.from(new Set(state.dropdownSlots.map(s => s.shift || s.label)))
      : ['Khung giờ 1', 'Khung giờ 2'];

    daysList.forEach(day => {
      const dayCard = document.createElement('div');
      dayCard.className = 'card';
      dayCard.style.padding = '18px';

      let dayHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid var(--primary);">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary);"><i class="fa-solid fa-calendar-day"></i> ${day.label}</h3>
        </div>
      `;

      shiftsList.forEach(shiftName => {
        // Tìm các học viên đăng ký ca học này trong ngày này
        const matchedStudents = items.filter(reg => {
          const selectedStr = (reg['Các Ca Học Đã Chọn'] || '').toString();
          return selectedStr.includes(day.label) && selectedStr.includes(shiftName);
        });

        const studentCount = matchedStudents.length;

        dayHtml += `
          <div style="background: var(--bg-input); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px; border-left: 4px solid ${studentCount >= 9 ? 'var(--danger)' : 'var(--primary)'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);"><i class="fa-solid fa-clock text-warning"></i> ${shiftName}</span>
              <span class="slot-capacity-badge" style="font-size: 0.8rem; padding: 2px 8px;">${studentCount}/9 người</span>
            </div>
        `;

        if (matchedStudents.length === 0) {
          dayHtml += `<p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin: 4px 0;">Chưa có học viên đăng ký ca này</p>`;
        } else {
          dayHtml += `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">`;
          matchedStudents.forEach(st => {
            const isConfirmed = (st['Trạng Thái'] || '').includes('xác nhận');
            dayHtml += `
              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 8px 10px; border-radius: 6px; font-size: 0.84rem; border: 1px solid var(--border-color);">
                <div>
                  <div style="font-weight: 700;">${st['Họ và Tên'] || 'Học viên'}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> ${st['Số Điện Thoại / Zalo'] || ''} | <span style="color: var(--primary);">${st['Mã Đăng Ký'] || ''}</span></div>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                  ${isConfirmed ? `
                    <span style="font-size: 0.75rem; color: var(--success); font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                      <i class="fa-solid fa-check-double"></i> Đã duyệt
                    </span>
                  ` : `
                    <button class="btn btn-sm btn-success confirm-student-btn" data-regid="${st['Mã Đăng Ký']}" style="padding: 4px 8px; font-size: 0.76rem; white-space: nowrap;">
                      <i class="fa-solid fa-circle-check"></i> Xác nhận
                    </button>
                  `}
                  <button class="btn btn-sm btn-danger delete-student-btn" data-regid="${st['Mã Đăng Ký']}" data-name="${st['Họ và Tên'] || 'Học viên'}" data-rowindex="${st.rowIndex || ''}" style="padding: 4px 8px; font-size: 0.76rem; white-space: nowrap;">
                    <i class="fa-solid fa-trash-can"></i> Xóa
                  </button>
                </div>
              </div>
            `;
          });
          dayHtml += `</div>`;
        }

        dayHtml += `</div>`;
      });

      dayCard.innerHTML = dayHtml;
      container.appendChild(dayCard);
    });

  } else {
    // CHẾ ĐỘ 2: XEM DẠNG THẺ HỌC VIÊN (CARDS VIEW)
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    container.style.gap = '20px';

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
          ${item['Loại Học Viên'] ? `<div><i class="fa-solid fa-fire" style="width: 18px;"></i> ${item['Loại Học Viên']} (${item['Số Buổi / Tuần'] || ''})</div>` : ''}
        </div>

        <div style="background: var(--bg-input); padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.83rem; margin-bottom: 12px;">
          <span style="font-weight: 700; color: var(--text-main); display: block; margin-bottom: 4px;">
            <i class="fa-solid fa-calendar-week text-primary"></i> Lịch học đăng ký:
          </span>
          <div style="color: var(--text-muted); line-height: 1.4;">
            ${item['Các Ca Học Đã Chọn'] || 'Chưa chọn ca'}
          </div>
        </div>

        ${item['Mục Tiêu Học Tập'] ? `
          <div style="margin-bottom: 14px; font-size: 0.8rem; color: var(--text-muted);">
            <strong>Mục tiêu:</strong> ${item['Mục Tiêu Học Tập']}
          </div>
        ` : ''}

        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color); display: flex; justify-content: flex-end; gap: 8px; align-items: center;">
          ${isConfirmed ? `
            <span style="font-size: 0.8rem; color: var(--success); font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-check-double"></i> Đã xác nhận đăng ký
            </span>
          ` : `
            <button class="btn btn-sm btn-success confirm-student-btn" data-regid="${item['Mã Đăng Ký']}">
              <i class="fa-solid fa-circle-check"></i> Xác nhận Đăng ký
            </button>
          `}
          <button class="btn btn-sm btn-danger delete-student-btn" data-regid="${item['Mã Đăng Ký']}" data-name="${item['Họ và Tên'] || 'Học viên'}" data-rowindex="${item.rowIndex || ''}">
            <i class="fa-solid fa-trash-can"></i> Xóa
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // Gắn sự kiện cho các Nút Xác Nhận của Nhân viên
  document.querySelectorAll('.confirm-student-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const regId = btn.dataset.regid;
      confirmStudentRegistration(regId, btn);
    });
  });

  // Gắn sự kiện cho các Nút Xóa Đơn Đăng ký
  document.querySelectorAll('.delete-student-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const regId = btn.dataset.regid;
      const studentName = btn.dataset.name;
      const rowIndex = btn.dataset.rowindex;
      deleteStudentRegistration(regId, studentName, rowIndex, btn);
    });
  });
}

// Hàm Nhân viên Xóa Đơn Đăng ký học viên -> Đồng bộ trực tiếp xóa dòng trên Google Sheet
async function deleteStudentRegistration(registrationId, studentName, rowIndex, btnElement) {
  if (!confirm(`Bạn có chắc chắn muốn XÓA đơn đăng ký của học viên "${studentName}" khỏi Google Sheet?`)) {
    return;
  }

  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Xóa...';
  }

  try {
    const res = await fetch(CONFIG.API.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteRegistration',
        registrationId: registrationId,
        fullName: studentName,
        rowIndex: rowIndex ? parseInt(rowIndex) : null
      })
    });

    const result = await res.json();
    if (result && result.status === 'success') {
      if (typeof showToast === 'function') {
        showToast(result.message || `Đã xóa đơn đăng ký của học viên "${studentName}" thành công!`, 'success');
      }

      await fetchScheduleData();

    } else {
      if (typeof showToast === 'function') {
        showToast(result.message || 'Xóa đơn đăng ký thất bại.', 'error');
      }
      if (btnElement) btnElement.disabled = false;
    }
  } catch (err) {
    console.error('Delete student registration error:', err);
    if (typeof showToast === 'function') {
      showToast('Lỗi kết nối khi xóa học viên.', 'error');
    }
    if (btnElement) btnElement.disabled = false;
  }
}

function setupScheduleEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const refreshBtn = document.getElementById('refreshScheduleBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const viewGridBtn = document.getElementById('viewModeGridBtn');
  const viewCardsBtn = document.getElementById('viewModeCardsBtn');

  if (viewGridBtn && viewCardsBtn) {
    viewGridBtn.addEventListener('click', () => {
      currentViewMode = 'grid';
      viewGridBtn.classList.add('active');
      viewCardsBtn.classList.remove('active');
      renderScheduleList();
    });

    viewCardsBtn.addEventListener('click', () => {
      currentViewMode = 'cards';
      viewCardsBtn.classList.add('active');
      viewGridBtn.classList.remove('active');
      renderScheduleList();
    });
  }

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
