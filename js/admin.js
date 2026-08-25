/**
 * ADMIN SCHEDULE MANAGER MODULE (Texac Center Schedule)
 * Mở / Khóa, Thêm, Sửa và Xóa các khung giờ học trong tuần
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAdminEventListeners();
});

function renderAdminSlotsGrid() {
  const container = document.getElementById('adminSlotsGrid');
  if (!container) return;

  container.innerHTML = '';
  const daysList = CONFIG.DAYS || [];

  daysList.forEach(day => {
    const dayCol = document.createElement('div');
    dayCol.className = 'day-column';

    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = day.label;
    dayCol.appendChild(header);

    // Lấy đúng danh sách ca học được cấu hình riêng cho từng Thứ từ Google Sheets
    const daySpecificSlots = (state.dropdownSlots || []).filter(ds => ds.day === day.label && ds.shift);
    let shiftsToRender = [];

    if (daySpecificSlots.length > 0) {
      const seen = new Set();
      daySpecificSlots.forEach(ds => {
        if (!seen.has(ds.shift)) {
          seen.add(ds.shift);
          shiftsToRender.push({ key: ds.shift, label: ds.shift, time: ds.time || '' });
        }
      });
    } else {
      shiftsToRender = CONFIG.SHIFTS || [];
    }

    shiftsToRender.forEach(shift => {
      const matchedDrop = (state.dropdownSlots || []).find(ds => ds.day === day.label && (ds.shift === shift.label || (ds.label || '').toString().includes(shift.label)));
      const isLocked = matchedDrop && matchedDrop.status && (matchedDrop.status.toString().includes('khóa') || matchedDrop.status.toString().includes('tắt'));

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

function renderExistingSlotsTable() {
  const tbody = document.getElementById('existingSlotsTbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const slots = state.dropdownSlots || [];

  if (slots.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">
          Chưa có khung giờ nào được cấu hình trong sheet quanlykhunggio.
        </td>
      </tr>
    `;
    return;
  }

  slots.forEach(s => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';

    const isLocked = s.status && (s.status.toString().includes('khóa') || s.status.toString().includes('tắt'));

    tr.innerHTML = `
      <td style="padding: 12px; font-weight: 600;">${s.day || ''}</td>
      <td style="padding: 12px; font-weight: 700; color: var(--primary);">${s.shift || s.label || ''}</td>
      <td style="padding: 12px; color: var(--text-muted);">${s.time || '—'}</td>
      <td style="padding: 12px;">
        <span class="badge ${isLocked ? 'danger' : 'success'}" style="padding: 4px 8px; font-size: 0.78rem; border-radius: 4px;">
          ${isLocked ? '<i class="fa-solid fa-lock"></i> Đã khóa' : '<i class="fa-solid fa-check"></i> Hoạt động'}
        </span>
      </td>
      <td style="padding: 12px; text-align: center;">
        <div style="display: flex; gap: 6px; justify-content: center;">
          <button class="btn btn-sm btn-outline edit-slot-btn" data-day="${s.day}" data-shift="${s.shift}" data-time="${s.time || ''}" data-status="${s.status || 'Hoạt động'}" style="padding: 4px 10px; font-size: 0.78rem;">
            <i class="fa-solid fa-pen-to-square text-primary"></i> Sửa
          </button>
          <button class="btn btn-sm btn-danger delete-slot-btn" data-day="${s.day}" data-shift="${s.shift}" style="padding: 4px 10px; font-size: 0.78rem;">
            <i class="fa-solid fa-trash-can"></i> Xóa
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Gắn sự kiện Sửa ca
  tbody.querySelectorAll('.edit-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditSlotModal(btn.dataset.day, btn.dataset.shift, btn.dataset.time, btn.dataset.status);
    });
  });

  // Gắn sự kiện Xóa ca
  tbody.querySelectorAll('.delete-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteSingleSlot(btn.dataset.day, btn.dataset.shift, btn);
    });
  });
}

function openEditSlotModal(day, shift, time, status) {
  const modal = document.getElementById('editSlotModal');
  if (!modal) return;

  document.getElementById('editOldDay').value = day;
  document.getElementById('editOldShift').value = shift;

  document.getElementById('editNewDay').value = day;
  document.getElementById('editNewShift').value = shift;
  document.getElementById('editNewTime').value = time;
  document.getElementById('editNewStatus').value = (status || '').toString().includes('khóa') ? 'Đã khóa' : 'Hoạt động';

  modal.classList.remove('d-none');
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
      const targetDrop = (state.dropdownSlots || []).find(ds => ds.day === day && (ds.shift === shift || (ds.label || '').toString().includes(shift)));
      if (targetDrop) {
        targetDrop.status = targetStatus;
      } else {
        state.dropdownSlots.push({ day, shift, status: targetStatus, label: `${day} (${shift})` });
      }

      renderAdminSlotsGrid();
      renderExistingSlotsTable();
      if (typeof renderSlotsGrid === 'function') renderSlotsGrid();

    } else {
      if (typeof showToast === 'function') showToast(result.message || 'Cập nhật thất bại.', 'error');
      if (btnElement) btnElement.disabled = false;
    }
  } catch (err) {
    console.error('Update slot error:', err);
    if (typeof showToast === 'function') showToast('Lỗi kết nối máy chủ.', 'error');
    if (btnElement) btnElement.disabled = false;
  }
}

async function deleteSingleSlot(day, shift, btnElement) {
  if (!confirm(`Bạn có chắc chắn muốn XÓA ca học "${day} - ${shift}" khỏi Google Sheet quanlykhunggio?`)) {
    return;
  }

  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>...';
  }

  try {
    const res = await fetch(CONFIG.API.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteDropdownSlot',
        day: day,
        shift: shift
      })
    });

    const result = await res.json();
    if (result && result.status === 'success') {
      if (typeof showToast === 'function') {
        showToast(`Đã xóa ca học "${day} (${shift})" thành công!`, 'success');
      }

      // Re-fetch state and update UI
      if (typeof fetchScheduleData === 'function') {
        await fetchScheduleData();
      }

      renderAdminSlotsGrid();
      renderExistingSlotsTable();
      if (typeof renderSlotsGrid === 'function') renderSlotsGrid();

    } else {
      if (typeof showToast === 'function') showToast(result.message || 'Xóa ca học thất bại.', 'error');
      if (btnElement) btnElement.disabled = false;
    }
  } catch (err) {
    console.error('Delete slot error:', err);
    if (typeof showToast === 'function') showToast('Lỗi kết nối khi xóa ca học.', 'error');
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

      (state.dropdownSlots || []).forEach(ds => {
        ds.status = targetStatus;
      });

      renderAdminSlotsGrid();
      renderExistingSlotsTable();
      if (typeof renderSlotsGrid === 'function') renderSlotsGrid();

    } else {
      if (typeof showToast === 'function') showToast(result.message || 'Thao tác thất bại.', 'error');
    }
  } catch (err) {
    console.error('Toggle all error:', err);
    if (typeof showToast === 'function') showToast('Lỗi kết nối khi cập nhật ca học.', 'error');
  } finally {
    if (openBtn) openBtn.disabled = false;
    if (lockBtn) lockBtn.disabled = false;
  }
}

function setupAdminEventListeners() {
  const openAllBtn = document.getElementById('openAllSlotsBtn');
  const lockAllBtn = document.getElementById('lockAllSlotsBtn');
  const refreshAdminBtn = document.getElementById('refreshAdminSlotsBtn');
  const refreshExistingSlotsBtn = document.getElementById('refreshExistingSlotsBtn');
  const subNavBtns = document.querySelectorAll('.admin-subnav-btn');
  const addSlotForm = document.getElementById('addDropdownSlotForm');
  const editSlotForm = document.getElementById('editSlotForm');
  const editSlotCancelBtn = document.getElementById('editSlotCancelBtn');

  // Chuyển Sub-Pane trong Tab Quản trị
  subNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPaneId = btn.dataset.subpane;
      
      subNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.admin-subpane').forEach(pane => {
        if (pane.id === targetPaneId) {
          pane.classList.remove('d-none');
          pane.classList.add('active');
        } else {
          pane.classList.add('d-none');
          pane.classList.remove('active');
        }
      });

      if (targetPaneId === 'admin-pane-slots') {
        renderAdminSlotsGrid();
      } else if (targetPaneId === 'admin-pane-tracker' && typeof renderScheduleList === 'function') {
        renderScheduleList();
      } else if (targetPaneId === 'admin-pane-addslot') {
        renderExistingSlotsTable();
      }
    });
  });

  if (openAllBtn) openAllBtn.addEventListener('click', () => toggleAllSlotsStatus('Hoạt động'));
  if (lockAllBtn) lockAllBtn.addEventListener('click', () => toggleAllSlotsStatus('Đã khóa'));

  if (refreshAdminBtn) {
    refreshAdminBtn.addEventListener('click', async () => {
      if (typeof fetchScheduleData === 'function') await fetchScheduleData();
      renderAdminSlotsGrid();
      renderExistingSlotsTable();
      if (typeof showToast === 'function') showToast('Đã làm mới dữ liệu quản trị!', 'info');
    });
  }

  if (refreshExistingSlotsBtn) {
    refreshExistingSlotsBtn.addEventListener('click', async () => {
      if (typeof fetchScheduleData === 'function') await fetchScheduleData();
      renderExistingSlotsTable();
      if (typeof showToast === 'function') showToast('Đã làm mới danh sách ca học!', 'info');
    });
  }

  // Lắng nghe nút Chọn Tất Cả các Thứ trong form Thêm Ca Học
  const selectAllDaysAdd = document.getElementById('selectAllDaysAdd');
  if (selectAllDaysAdd) {
    selectAllDaysAdd.addEventListener('change', () => {
      const isChecked = selectAllDaysAdd.checked;
      document.querySelectorAll('input[name="newSlotDays"]').forEach(cb => {
        cb.checked = isChecked;
      });
    });
  }

  // Cập nhật lại trạng thái nút Chọn Tất Cả khi người dùng tick/untick lẻ từng Thứ
  document.querySelectorAll('input[name="newSlotDays"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const allCbs = Array.from(document.querySelectorAll('input[name="newSlotDays"]'));
      const allChecked = allCbs.every(c => c.checked);
      if (selectAllDaysAdd) selectAllDaysAdd.checked = allChecked;
    });
  });

  // Form Thêm Ca học mới vào Sheet quanlykhunggio (Cho phép chọn nhiều Thứ hoặc Chọn Tất Cả)
  if (addSlotForm) {
    addSlotForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const checkedDays = Array.from(document.querySelectorAll('input[name="newSlotDays"]:checked')).map(c => c.value);
      const shift = document.getElementById('newSlotShift').value.trim();
      const time = document.getElementById('newSlotTime').value.trim();

      if (checkedDays.length === 0) {
        if (typeof showToast === 'function') showToast('Vui lòng chọn ít nhất 1 Thứ để áp dụng ca học mới!', 'error');
        return;
      }

      if (!shift) {
        if (typeof showToast === 'function') showToast('Vui lòng nhập Tên ca học mới!', 'error');
        return;
      }

      const submitBtn = document.getElementById('addSlotSubmitBtn');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnSpinner = submitBtn.querySelector('.btn-spinner');

      btnText.classList.add('d-none');
      btnSpinner.classList.remove('d-none');
      submitBtn.disabled = true;

      let successCount = 0;
      let lastMsg = '';

      try {
        // Lặp qua tất cả các Thứ được chọn để gửi request thêm ca học vào Google Sheet
        for (const d of checkedDays) {
          const res = await fetch(CONFIG.API.REGISTER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'addDropdownSlot',
              day: d,
              shift: shift,
              time: time
            })
          });

          const result = await res.json();
          if (result && result.status === 'success') {
            successCount++;
          } else if (result.message) {
            lastMsg = result.message;
          }
        }

        if (successCount > 0) {
          if (typeof showToast === 'function') {
            showToast(`Đã thêm thành công ca học "${shift}" cho ${successCount}/${checkedDays.length} Thứ vào Google Sheet!`, 'success');
          }

          addSlotForm.reset();
          if (selectAllDaysAdd) selectAllDaysAdd.checked = false;

          if (typeof fetchScheduleData === 'function') await fetchScheduleData();

          renderAdminSlotsGrid();
          renderExistingSlotsTable();
          if (typeof renderSlotsGrid === 'function') renderSlotsGrid();

        } else {
          if (typeof showToast === 'function') showToast(lastMsg || 'Thêm ca học thất bại.', 'error');
        }
      } catch (err) {
        console.error('Add slot error:', err);
        if (typeof showToast === 'function') showToast('Lỗi kết nối khi thêm ca học.', 'error');
      } finally {
        btnText.classList.remove('d-none');
        btnSpinner.classList.add('d-none');
        submitBtn.disabled = false;
      }
    });
  }

  // Modal Chỉnh Sửa Ca Học
  if (editSlotCancelBtn) {
    editSlotCancelBtn.addEventListener('click', () => {
      document.getElementById('editSlotModal').classList.add('d-none');
    });
  }

  if (editSlotForm) {
    editSlotForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const oldDay = document.getElementById('editOldDay').value;
      const oldShift = document.getElementById('editOldShift').value;

      const newDay = document.getElementById('editNewDay').value;
      const newShift = document.getElementById('editNewShift').value.trim();
      const newTime = document.getElementById('editNewTime').value.trim();
      const newStatus = document.getElementById('editNewStatus').value;

      const submitBtn = document.getElementById('editSlotSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

      try {
        const res = await fetch(CONFIG.API.REGISTER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'editDropdownSlot',
            oldDay: oldDay,
            oldShift: oldShift,
            newDay: newDay,
            newShift: newShift,
            newTime: newTime,
            status: newStatus
          })
        });

        const result = await res.json();
        if (result && result.status === 'success') {
          if (typeof showToast === 'function') showToast(result.message || 'Đã cập nhật ca học thành công!', 'success');

          document.getElementById('editSlotModal').classList.add('d-none');

          if (typeof fetchScheduleData === 'function') await fetchScheduleData();

          renderAdminSlotsGrid();
          renderExistingSlotsTable();
          if (typeof renderSlotsGrid === 'function') renderSlotsGrid();

        } else {
          if (typeof showToast === 'function') showToast(result.message || 'Cập nhật thất bại.', 'error');
        }
      } catch (err) {
        console.error('Edit slot error:', err);
        if (typeof showToast === 'function') showToast('Lỗi kết nối khi lưu ca học.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu thay đổi';
      }
    });
  }
}
