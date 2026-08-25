/**
 * ADMIN SCHEDULE MANAGER MODULE (Texac Center Schedule)
 * Mở / Khóa các ngày học và ca học tùy chọn trong tuần
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAdminEventListeners();
});

function renderAdminSlotsGrid() {
  const container = document.getElementById('adminSlotsGrid');
  if (!container) return;

  container.innerHTML = '';
  const daysList = CONFIG.DAYS || [];
  const shiftsList = CONFIG.SHIFTS || [{ key: 'KG1', label: 'Khung giờ 1' }, { key: 'KG2', label: 'Khung giờ 2' }];

  daysList.forEach(day => {
    const dayCol = document.createElement('div');
    dayCol.className = 'day-column';

    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = day.label;
    dayCol.appendChild(header);

    shiftsList.forEach(shift => {
      const matchedDrop = (state.dropdownSlots || []).find(ds => ds.day === day.label && (ds.shift === shift.label || ds.label.includes(shift.label)));
      const isLocked = matchedDrop && matchedDrop.status && (matchedDrop.status.includes('khóa') || matchedDrop.status.includes('tắt'));

      const slotItem = document.createElement('div');
      slotItem.className = `slot-item ${isLocked ? 'full disabled' : ''}`;
      slotItem.style.cursor = 'default';
      slotItem.style.display = 'flex';
      slotItem.style.flexDirection = 'column';
      slotItem.style.alignItems = 'center';
      slotItem.style.padding = '12px 8px';

      slotItem.innerHTML = `
        <span class="slot-name" style="font-weight: 700; font-size: 0.88rem; display: block; margin-bottom: 4px;">${shift.label}</span>
        <span class="slot-capacity-badge" style="margin-bottom: 10px; ${isLocked ? 'background: rgba(239, 68, 68, 0.2); color: var(--danger); font-weight: 700;' : 'background: rgba(16, 185, 129, 0.2); color: var(--success); font-weight: 700;'}">
          ${isLocked ? '<i class="fa-solid fa-lock"></i> ĐÃ KHÓA' : '<i class="fa-solid fa-lock-open"></i> ĐANG MỞ'}
        </span>
        ${isLocked ? `
          <button class="btn btn-sm btn-success toggle-slot-btn" data-day="${day.label}" data-shift="${shift.label}" data-targetstatus="Hoạt động" style="padding: 4px 10px; font-size: 0.78rem; width: 100%;">
            <i class="fa-solid fa-lock-open"></i> Mở ca này
          </button>
        ` : `
          <button class="btn btn-sm btn-danger toggle-slot-btn" data-day="${day.label}" data-shift="${shift.label}" data-targetstatus="Đã khóa" style="padding: 4px 10px; font-size: 0.78rem; width: 100%;">
            <i class="fa-solid fa-lock"></i> Khóa ca này
          </button>
        `}
      `;

      dayCol.appendChild(slotItem);
    });

    container.appendChild(dayCol);
  });

  // Gắn sự kiện cho các Nút Mở/Khóa từng ca
  container.querySelectorAll('.toggle-slot-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const day = btn.dataset.day;
      const shift = btn.dataset.shift;
      const targetStatus = btn.dataset.targetstatus;
      updateSingleSlotStatus(day, shift, targetStatus, btn);
    });
  });
}

async function updateSingleSlotStatus(day, shift, targetStatus, btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Xử lý...';
  }

  try {
    const res = await fetch(CONFIG.API.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateSlotStatus',
        day: day,
        shift: shift,
        status: targetStatus
      })
    });

    const result = await res.json();
    if (result && result.status === 'success') {
      if (typeof showToast === 'function') {
        showToast(`Đã ${targetStatus === 'Hoạt động' ? 'MỞ' : 'KHÓA'} ca ${day} (${shift}) thành công!`, 'success');
      }

      // Update local state
      const targetDrop = (state.dropdownSlots || []).find(ds => ds.day === day && (ds.shift === shift || ds.label.includes(shift)));
      if (targetDrop) {
        targetDrop.status = targetStatus;
      } else {
        state.dropdownSlots.push({ day, shift, status: targetStatus, label: `${day} (${shift})` });
      }

      renderAdminSlotsGrid();
      if (typeof renderSlotsGrid === 'function') {
        renderSlotsGrid();
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(result.message || 'Cập nhật trạng thái thất bại.', 'error');
      }
      if (btnElement) btnElement.disabled = false;
    }
  } catch (err) {
    console.error('Update slot error:', err);
    if (typeof showToast === 'function') {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
    if (btnElement) btnElement.disabled = false;
  }
}

async function toggleAllSlotsStatus(targetStatus) {
  const openBtn = document.getElementById('openAllSlotsBtn');
  const lockBtn = document.getElementById('lockAllSlotsBtn');

  if (openBtn) openBtn.disabled = true;
  if (lockBtn) lockBtn.disabled = true;

  try {
    const res = await fetch(CONFIG.API.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggleAllSlots',
        status: targetStatus
      })
    });

    const result = await res.json();
    if (result && result.status === 'success') {
      if (typeof showToast === 'function') {
        showToast(`Đã ${targetStatus === 'Hoạt động' ? 'MỞ TẤT CẢ' : 'KHÓA TẤT CẢ'} ca học 7 ngày trong tuần!`, 'success');
      }

      // Update all local dropdown slots
      (state.dropdownSlots || []).forEach(ds => {
        ds.status = targetStatus;
      });

      renderAdminSlotsGrid();
      if (typeof renderSlotsGrid === 'function') {
        renderSlotsGrid();
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(result.message || 'Thao tác thất bại.', 'error');
      }
    }
  } catch (err) {
    console.error('Toggle all error:', err);
    if (typeof showToast === 'function') {
      showToast('Lỗi kết nối khi cập nhật ca học.', 'error');
    }
  } finally {
    if (openBtn) openBtn.disabled = false;
    if (lockBtn) lockBtn.disabled = false;
  }
}

function setupAdminEventListeners() {
  const openAllBtn = document.getElementById('openAllSlotsBtn');
  const lockAllBtn = document.getElementById('lockAllSlotsBtn');
  const refreshAdminBtn = document.getElementById('refreshAdminSlotsBtn');

  if (openAllBtn) {
    openAllBtn.addEventListener('click', () => toggleAllSlotsStatus('Hoạt động'));
  }

  if (lockAllBtn) {
    lockAllBtn.addEventListener('click', () => toggleAllSlotsStatus('Đã khóa'));
  }

  if (refreshAdminBtn) {
    refreshAdminBtn.addEventListener('click', () => {
      if (typeof fetchScheduleData === 'function') {
        fetchScheduleData();
      }
      renderAdminSlotsGrid();
      if (typeof showToast === 'function') {
        showToast('Đã làm mới dữ liệu quản trị!', 'info');
      }
    });
  }
}
