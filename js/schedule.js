/**
 * SCHEDULE TRACKER & ADMIN APPROVAL MODULE (Texac Center Schedule)
 * Quản lý danh sách học viên, lọc theo Thứ/Ca/Trạng thái và duyệt/xóa đơn
 */

document.addEventListener('DOMContentLoaded', () => {
  fetchScheduleData();
  setupScheduleEventListeners();
});

let currentFilter = 'all';
let filterDay = 'all';
let filterShift = 'all';
let searchQuery = '';
let currentViewMode = 'table'; // 'table' | 'grid' | 'cards' (Mặc định dạng Bảng để cực kỳ dễ nhìn)

async function fetchScheduleData(forceRefresh = false) {
  const container = document.getElementById('scheduleResultsGrid');
  if (!container) return;

  // Tối ưu hóa hiệu năng: Nếu đã có dữ liệu trong bộ nhớ dưới 30 giây & không ép buộc làm mới -> Render tức thì < 5ms!
  const CACHE_TTL_MS = 30000;
  if (!forceRefresh && state.registrations && state.registrations.length > 0 && state.lastFetchTime && (Date.now() - state.lastFetchTime) < CACHE_TTL_MS) {
    updateDynamicShiftFilter();
    renderScheduleList();
    if (typeof renderSlotsGrid === 'function') renderSlotsGrid();
    return;
  }

  // Chỉ hiển thị spinner tải khi bộ nhớ trống
  if (!state.registrations || state.registrations.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i><p style="margin-top: 10px; color: var(--text-muted);">Đang tải dữ liệu thời khóa biểu từ Google Sheet...</p></div>';
  }

  let success = false;
  let lastErrorMessage = '';

  try {
    const res = await fetch(CONFIG.API.SCHEDULE + '?t=' + Date.now());
    if (res.ok) {
      const result = await res.json();
      if (result.status === 'success') {
        state.registrations = Array.isArray(result.registrations) ? result.registrations : (Array.isArray(result.data) ? result.data : []);
        state.dropdownSlots = Array.isArray(result.dropdowns) ? result.dropdowns : [];
        state.lastFetchTime = Date.now();
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
    updateDynamicShiftFilter();
    renderScheduleList();
    if (typeof renderSlotsGrid === 'function') {
      renderSlotsGrid();
    }
  } else {
    renderErrorNotice(container, lastErrorMessage);
  }
}

function updateDynamicShiftFilter() {
  const shiftSelect = document.getElementById('filterShiftSelect');
  if (!shiftSelect) return;

  const currentVal = shiftSelect.value;
  const shiftsList = (Array.isArray(state.dropdownSlots) && state.dropdownSlots.length > 0)
    ? Array.from(new Set(state.dropdownSlots.map(s => s.shift || s.label)))
    : ['Khung giờ 1', 'Khung giờ 2', 'Khung giờ 3'];

  shiftSelect.innerHTML = '<option value="all">⏰ Tất cả Ca học</option>';
  shiftsList.forEach(sName => {
    const opt = document.createElement('option');
    opt.value = sName;
    opt.textContent = sName;
    shiftSelect.appendChild(opt);
  });

  if (shiftsList.includes(currentVal)) {
    shiftSelect.value = currentVal;
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

function renderScheduleList() {
  const container = document.getElementById('scheduleResultsGrid');
  if (!container) return;

  let allRegistrations = state.registrations || [];

  // Update Thống kê Dashboard
  const countAll = allRegistrations.length;
  const countPending = allRegistrations.filter(i => (i['Trạng Thái'] || '').toString().includes('Chờ')).length;
  const countConfirmed = allRegistrations.filter(i => (i['Trạng Thái'] || '').toString().includes('xác nhận')).length;
  
  let totalSlotsPicked = 0;
  allRegistrations.forEach(r => {
    const str = (r['Các Ca Học Đã Chọn'] || '').toString();
    if (str) {
      totalSlotsPicked += str.split(',').filter(s => s.trim()).length;
    }
  });

  const countAllEl = document.getElementById('countAll');
  const countPendingEl = document.getElementById('countPending');
  const countConfirmedEl = document.getElementById('countConfirmed');

  const statTotal = document.getElementById('statTotalStudents');
  const statPending = document.getElementById('statPendingStudents');
  const statConfirmed = document.getElementById('statConfirmedStudents');
  const statSlots = document.getElementById('statTotalSlotsPicked');

  if (countAllEl) countAllEl.textContent = countAll;
  if (countPendingEl) countPendingEl.textContent = countPending;
  if (countConfirmedEl) countConfirmedEl.textContent = countConfirmed;

  if (statTotal) statTotal.textContent = countAll;
  if (statPending) statPending.textContent = countPending;
  if (statConfirmed) statConfirmed.textContent = countConfirmed;
  if (statSlots) statSlots.textContent = totalSlotsPicked;

  let items = [...allRegistrations];

  // 1. Lọc theo Trạng Thái (Tab Pill)
  if (currentFilter !== 'all') {
    items = items.filter(i => (i['Trạng Thái'] || '').toString().includes(currentFilter));
  }

  // 2. Lọc theo Thứ (Dropdown)
  if (filterDay !== 'all') {
    items = items.filter(i => (i['Các Ca Học Đã Chọn'] || '').toString().includes(filterDay));
  }

  // 3. Lọc theo Ca học (Dropdown)
  if (filterShift !== 'all') {
    items = items.filter(i => (i['Các Ca Học Đã Chọn'] || '').toString().includes(filterShift));
  }

  // 4. Lọc theo Từ khóa tìm kiếm
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    items = items.filter(i => 
      (i['Họ và Tên'] || '').toString().toLowerCase().includes(q) ||
      (i['Số Điện Thoại / Zalo'] || '').toString().toLowerCase().includes(q) ||
      (i['Email'] || '').toString().toLowerCase().includes(q) ||
      (i['Mã Đăng Ký'] || '').toString().toLowerCase().includes(q) ||
      (i['Các Ca Học Đã Chọn'] || '').toString().toLowerCase().includes(q)
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-folder-open fa-3x" style="color: var(--text-muted); margin-bottom: 12px;"></i>
        <h4 style="font-size: 1.1rem; font-weight: 700;">Không tìm thấy dữ liệu đăng ký phù hợp</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Hãy thử chọn lại bộ lọc hoặc nhập từ khóa tìm kiếm khác.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  // CHẾ ĐỘ 1: DẠNG BẢNG QUẢN TRỊ DỄ NHÌN (TABLE VIEW - MẶC ĐỊNH)
  if (currentViewMode === 'table') {
    container.style.display = 'block';
    
    const tableCard = document.createElement('div');
    tableCard.className = 'card';
    tableCard.style.padding = '0';
    tableCard.style.overflow = 'hidden';

    let tableHtml = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
          <thead>
            <tr style="background: rgba(255,255,255,0.04); border-bottom: 2px solid var(--border-color); color: var(--text-muted); text-transform: uppercase; font-size: 0.76rem; letter-spacing: 0.5px;">
              <th style="padding: 14px 16px; width: 60px;">STT</th>
              <th style="padding: 14px 16px; min-width: 180px;">Học Viên</th>
              <th style="padding: 14px 16px; min-width: 160px;">Liên Hệ</th>
              <th style="padding: 14px 16px; min-width: 250px;">Các Ca Học Đăng Ký</th>
              <th style="padding: 14px 16px; min-width: 130px;">Thời Gian</th>
              <th style="padding: 14px 16px; width: 130px;">Trạng Thái</th>
              <th style="padding: 14px 16px; width: 150px; text-align: center;">Hành Động</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach((item, index) => {
      const isConfirmed = (item['Trạng Thái'] || '').toString().includes('xác nhận');
      const phone = (item['Số Điện Thoại / Zalo'] || '').toString().trim();
      const cleanPhone = phone.replace(/[^0-9]/g, '');

      // Parse ca học thành các badge pills nhỏ gọn
      const rawSlotsStr = (item['Các Ca Học Đã Chọn'] || '').toString();
      const slotArray = rawSlotsStr.split(',').map(s => s.trim()).filter(s => s);
      const slotPills = slotArray.map(slot => {
        return `<span style="display: inline-block; background: rgba(79, 70, 229, 0.12); color: var(--primary); font-weight: 600; font-size: 0.76rem; padding: 3px 8px; border-radius: 4px; margin: 2px 2px 2px 0; border: 1px solid rgba(79, 70, 229, 0.2);"><i class="fa-solid fa-clock text-warning" style="margin-right: 3px;"></i>${slot}</span>`;
      }).join('');

      tableHtml += `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 14px 16px; font-weight: 700; color: var(--text-muted);">${index + 1}</td>
          
          <td style="padding: 14px 16px;">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">${item['Họ và Tên'] || 'Học viên'}</div>
            <div style="font-size: 0.78rem; color: var(--primary); font-weight: 700; margin-top: 2px;">
              ${item['Mã Đăng Ký'] || 'DK-REG'} ${item['Loại Học Viên'] ? `• <span style="color: var(--text-muted);">${item['Loại Học Viên']}</span>` : ''}
            </div>
          </td>

          <td style="padding: 14px 16px;">
            <div style="font-weight: 700; font-size: 0.88rem;">${phone || 'N/A'}</div>
            <div style="display: flex; gap: 6px; margin-top: 4px;">
              ${cleanPhone ? `
                <a href="https://zalo.me/${cleanPhone}" target="_blank" class="btn btn-sm btn-outline" style="padding: 2px 6px; font-size: 0.72rem; color: #0068ff; border-color: rgba(0,104,255,0.3);">
                  <i class="fa-solid fa-comment-dots"></i> Zalo
                </a>
                <a href="tel:${cleanPhone}" class="btn btn-sm btn-outline" style="padding: 2px 6px; font-size: 0.72rem; color: var(--success); border-color: rgba(16,185,129,0.3);">
                  <i class="fa-solid fa-phone"></i> Gọi
                </a>
              ` : ''}
            </div>
          </td>

          <td style="padding: 14px 16px;">
            <div style="line-height: 1.4;">
              ${slotPills || '<span style="color: var(--text-muted); font-style: italic;">Chưa chọn ca</span>'}
            </div>
          </td>

          <td style="padding: 14px 16px; font-size: 0.78rem; color: var(--text-muted);">
            ${item['Thời Gian Đăng Ký'] || '—'}
          </td>

          <td style="padding: 14px 16px;">
            <span class="badge ${isConfirmed ? 'success' : 'warning'}" style="padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; font-weight: 700;">
              ${isConfirmed ? '<i class="fa-solid fa-check-double"></i> Đã duyệt' : '<i class="fa-solid fa-clock"></i> Chờ duyệt'}
            </span>
          </td>

          <td style="padding: 14px 16px; text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
              ${!isConfirmed ? `
                <button class="btn btn-sm btn-success confirm-student-btn" data-regid="${item['Mã Đăng Ký']}" style="padding: 5px 10px; font-size: 0.78rem; white-space: nowrap;">
                  <i class="fa-solid fa-circle-check"></i> Duyệt
                </button>
              ` : ''}
              <button class="btn btn-sm btn-danger delete-student-btn" data-regid="${item['Mã Đăng Ký']}" data-name="${item['Họ và Tên'] || 'Học viên'}" data-rowindex="${item.rowIndex || ''}" style="padding: 5px 10px; font-size: 0.78rem; white-space: nowrap;">
                <i class="fa-solid fa-trash-can"></i> Xóa
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </div>
    `;

    tableCard.innerHTML = tableHtml;
    container.appendChild(tableCard);

  } else if (currentViewMode === 'grid') {
    // CHẾ ĐỘ 2: XEM THEO THỨ & CA HỌC (GRID VIEW - 7 CỘT HIỂN THỊ CÙNG 1 KHUNG HÌNH)
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(7, minmax(130px, 1fr))';
    container.style.gap = '8px';
    container.style.overflowX = 'auto';
    container.style.paddingBottom = '10px';

    const daysList = CONFIG.DAYS || [
      { key: 'T2', label: 'Thứ 2' },
      { key: 'T3', label: 'Thứ 3' },
      { key: 'T4', label: 'Thứ 4' },
      { key: 'T5', label: 'Thứ 5' },
      { key: 'T6', label: 'Thứ 6' },
      { key: 'T7', label: 'Thứ 7' },
      { key: 'CN', label: 'Chủ Nhật' }
    ];

    daysList.forEach(day => {
      const dayCard = document.createElement('div');
      dayCard.className = 'card';
      dayCard.style.padding = '10px 6px';
      dayCard.style.minWidth = '0';

      let dayHtml = `
        <div style="text-align: center; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid var(--primary);">
          <h3 style="font-size: 0.92rem; font-weight: 800; color: var(--primary); margin: 0; white-space: nowrap;"><i class="fa-solid fa-calendar-day"></i> ${day.label}</h3>
        </div>
      `;

      // Lấy danh sách ca học cấu hình riêng cho từng Thứ từ state.dropdownSlots
      const daySpecificSlots = (state.dropdownSlots || []).filter(ds => ds.day === day.label && (ds.shift || ds.label));
      let shiftsList = [];
      if (daySpecificSlots.length > 0) {
        shiftsList = Array.from(new Set(daySpecificSlots.map(s => s.shift || s.label)));
      } else {
        shiftsList = ['Khung giờ 1', 'Khung giờ 2'];
      }

      shiftsList.forEach(shiftName => {
        const matchedStudents = items.filter(reg => {
          const selectedStr = (reg['Các Ca Học Đã Chọn'] || '').toString();
          return selectedStr.includes(day.label) && selectedStr.includes(shiftName);
        });

        const studentCount = matchedStudents.length;

        dayHtml += `
          <div style="background: var(--bg-input); padding: 8px 6px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid ${studentCount >= 9 ? 'var(--danger)' : 'var(--primary)'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 2px;">
              <span style="font-weight: 700; font-size: 0.78rem; color: var(--text-main); white-space: nowrap;"><i class="fa-solid fa-clock text-warning"></i> ${shiftName}</span>
              <span class="slot-capacity-badge" style="font-size: 0.68rem; padding: 1px 4px; white-space: nowrap;">${studentCount}/9</span>
            </div>
        `;

        if (matchedStudents.length === 0) {
          dayHtml += `<p style="font-size: 0.72rem; color: var(--text-muted); font-style: italic; margin: 2px 0; text-align: center;">Trống</p>`;
        } else {
          dayHtml += `<div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">`;
          matchedStudents.forEach(st => {
            const isConfirmed = (st['Trạng Thái'] || '').toString().includes('xác nhận');
            const phone = (st['Số Điện Thoại / Zalo'] || '').toString();

            dayHtml += `
              <div style="background: var(--bg-card); padding: 6px 6px; border-radius: 4px; font-size: 0.76rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                <div>
                  <div style="font-weight: 700; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${st['Họ và Tên'] || ''}">${st['Họ và Tên'] || 'Học viên'}</div>
                  <div style="font-size: 0.7rem; color: var(--text-muted);">${phone || ''}</div>
                </div>
                <div style="display: flex; gap: 3px; align-items: center; justify-content: flex-end; margin-top: 2px;">
                  ${isConfirmed ? `
                    <span style="font-size: 0.68rem; color: var(--success); font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 2px 5px; border-radius: 3px; white-space: nowrap;">
                      <i class="fa-solid fa-check"></i> Duyệt
                    </span>
                  ` : `
                    <button class="btn btn-sm btn-success confirm-student-btn" data-regid="${st['Mã Đăng Ký']}" style="padding: 2px 6px; font-size: 0.68rem; white-space: nowrap;" title="Duyệt đơn">
                      <i class="fa-solid fa-check"></i> Duyệt
                    </button>
                  `}
                  <button class="btn btn-sm btn-danger delete-student-btn" data-regid="${st['Mã Đăng Ký']}" data-name="${st['Họ và Tên'] || 'Học viên'}" data-rowindex="${st.rowIndex || ''}" style="padding: 2px 6px; font-size: 0.68rem; white-space: nowrap;" title="Xóa đơn">
                    <i class="fa-solid fa-trash-can"></i>
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
    // CHẾ ĐỘ 3: XEM DẠNG THẺ HỌC VIÊN (CARDS VIEW)
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    container.style.gap = '20px';

    items.forEach(item => {
      const isConfirmed = (item['Trạng Thái'] || '').toString().includes('xác nhận');
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
          ${!isConfirmed ? `
            <button class="btn btn-sm btn-success confirm-student-btn" data-regid="${item['Mã Đăng Ký']}">
              <i class="fa-solid fa-circle-check"></i> Duyệt đơn
            </button>
          ` : `
            <span style="font-size: 0.8rem; color: var(--success); font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-check-double"></i> Đã duyệt
            </span>
          `}
          <button class="btn btn-sm btn-danger delete-student-btn" data-regid="${item['Mã Đăng Ký']}" data-name="${item['Họ và Tên'] || 'Học viên'}" data-rowindex="${item.rowIndex || ''}">
            <i class="fa-solid fa-trash-can"></i> Xóa
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // Gắn sự kiện cho các Nút Xác Nhận Duyệt của Nhân viên
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

function setupScheduleEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const refreshBtn = document.getElementById('refreshScheduleBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const filterDaySelect = document.getElementById('filterDaySelect');
  const filterShiftSelect = document.getElementById('filterShiftSelect');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  const viewTableBtn = document.getElementById('viewModeTableBtn');
  const viewGridBtn = document.getElementById('viewModeGridBtn');
  const viewCardsBtn = document.getElementById('viewModeCardsBtn');

  // Chuyển đổi 3 Chế độ Xem
  if (viewTableBtn && viewGridBtn && viewCardsBtn) {
    viewTableBtn.addEventListener('click', () => {
      currentViewMode = 'table';
      viewTableBtn.classList.add('active');
      viewGridBtn.classList.remove('active');
      viewCardsBtn.classList.remove('active');
      renderScheduleList();
    });

    viewGridBtn.addEventListener('click', () => {
      currentViewMode = 'grid';
      viewGridBtn.classList.add('active');
      viewTableBtn.classList.remove('active');
      viewCardsBtn.classList.remove('active');
      renderScheduleList();
    });

    viewCardsBtn.addEventListener('click', () => {
      currentViewMode = 'cards';
      viewCardsBtn.classList.add('active');
      viewTableBtn.classList.remove('active');
      viewGridBtn.classList.remove('active');
      renderScheduleList();
    });
  }

  // Tra cứu tìm kiếm
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

  // Nút Làm mới dữ liệu (Thực hiện tải lại trực tiếp từ Google Sheet)
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchScheduleData(true);
      if (typeof showToast === 'function') {
        showToast('Đang làm mới dữ liệu trực tiếp từ Google Sheet...', 'info');
      }
    });
  }

  // Lọc theo Tab Trạng thái Pill
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderScheduleList();
    });
  });

  // Dropdown Lọc theo Thứ
  if (filterDaySelect) {
    filterDaySelect.addEventListener('change', () => {
      filterDay = filterDaySelect.value;
      renderScheduleList();
    });
  }

  // Dropdown Lọc theo Ca học
  if (filterShiftSelect) {
    filterShiftSelect.addEventListener('change', () => {
      filterShift = filterShiftSelect.value;
      renderScheduleList();
    });
  }

  // Nút Reset Xóa Bộ Lọc
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      currentFilter = 'all';
      filterDay = 'all';
      filterShift = 'all';
      searchQuery = '';

      if (searchInput) searchInput.value = '';
      if (filterDaySelect) filterDaySelect.value = 'all';
      if (filterShiftSelect) filterShiftSelect.value = 'all';

      filterBtns.forEach(b => {
        if (b.dataset.filter === 'all') b.classList.add('active');
        else b.classList.remove('active');
      });

      renderScheduleList();
      if (typeof showToast === 'function') {
        showToast('Đã xóa tất cả bộ lọc!', 'info');
      }
    });
  }
}
