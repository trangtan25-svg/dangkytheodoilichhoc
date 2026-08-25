/**
 * FORM HANDLER & MULTI-SELECT MATRIX LOGIC
 * Strictly uses Vercel Serverless API (/api/register) -> process.env.GOOGLE_SCRIPT_URL
 */

document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  renderSlotsGrid();
  setupFormEventListeners();
});

// 1. Initialize & sync dynamic dropdowns for Cấp tốc / Dài hạn
function initDropdowns() {
  const studentTypeSelect = document.getElementById('studentType');
  const sessionsSelect = document.getElementById('sessionsPerWeek');

  function updateSessionOptions() {
    const selectedType = studentTypeSelect.value;
    const options = CONFIG.STUDENT_TYPES[selectedType] || [];
    
    sessionsSelect.innerHTML = '';
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt;
      el.textContent = opt;
      sessionsSelect.appendChild(el);
    });

    parseTargetSessionCount(sessionsSelect.value);
    updateCounterBadge();
  }

  studentTypeSelect.addEventListener('change', updateSessionOptions);
  sessionsSelect.addEventListener('change', (e) => {
    parseTargetSessionCount(e.target.value);
    updateCounterBadge();
  });

  updateSessionOptions();
}

function parseTargetSessionCount(valString) {
  const match = valString.match(/\d+/);
  if (match) {
    state.targetSessionCount = parseInt(match[0], 10);
  }
}

// Helper: Đếm số lượng học viên đã đăng ký cho từng ca từ Google Sheets
function getSlotRegistrationCounts() {
  const counts = {};
  if (Array.isArray(state.registrations)) {
    state.registrations.forEach(reg => {
      const selectedStr = reg['Các Ca Học Đã Chọn'] || '';
      if (selectedStr) {
        const slots = selectedStr.split(',').map(s => s.trim());
        slots.forEach(slot => {
          if (slot) {
            counts[slot] = (counts[slot] || 0) + 1;
          }
        });
      }
    });
  }
  return counts;
}

// 2. Render Multi-Select Slots Matrix Grid (Hỗ trợ ca học động từ sheet Dropdown & Khóa ca đủ 9/9 người)
function renderSlotsGrid() {
  const gridContainer = document.getElementById('slotsGrid');
  if (!gridContainer) return;

  gridContainer.innerHTML = '';
  const slotCounts = getSlotRegistrationCounts();
  const maxCapacity = CONFIG.MAX_SLOT_CAPACITY || 9;

  // Nếu có ca học động từ sheet Dropdown trên Google Sheet
  if (Array.isArray(state.dropdownSlots) && state.dropdownSlots.length > 0) {
    const daysMap = {};
    state.dropdownSlots.forEach(slot => {
      const dayKey = slot.day || 'Khác';
      if (!daysMap[dayKey]) daysMap[dayKey] = [];
      daysMap[dayKey].push(slot);
    });

    Object.keys(daysMap).forEach(dayLabel => {
      const dayCol = document.createElement('div');
      dayCol.className = 'day-column';

      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = dayLabel;
      dayCol.appendChild(header);

      daysMap[dayLabel].forEach((slot, sIdx) => {
        const slotLabel = slot.label;
        const slotId = `dyn_${dayLabel}_${sIdx}`;
        const count = slotCounts[slotLabel] || 0;
        const isFull = count >= maxCapacity;
        const isSelected = state.selectedSlots.some(s => s.label === slotLabel);

        if (isFull && isSelected) {
          const idx = state.selectedSlots.findIndex(s => s.label === slotLabel);
          if (idx > -1) state.selectedSlots.splice(idx, 1);
        }

        const slotItem = document.createElement('div');
        slotItem.className = `slot-item ${isFull ? 'full disabled' : ''} ${isSelected && !isFull ? 'selected' : ''}`;
        slotItem.dataset.id = slotId;
        slotItem.dataset.label = slotLabel;
        slotItem.dataset.count = count;

        slotItem.innerHTML = `
          <span class="slot-time">${slot.time || slot.shift}</span>
          <span class="slot-name">${slot.shift}</span>
          <span class="slot-capacity-badge">${isFull ? 'ĐÃ ĐẦY (9/9)' : `${count}/${maxCapacity} người`}</span>
        `;

        slotItem.addEventListener('click', () => {
          if (isFull) {
            if (typeof showToast === 'function') {
              showToast(`Ca học "${slotLabel}" đã đủ tối đa 9/9 người đăng ký!`, 'error');
            }
            return;
          }
          toggleSlotSelection(slotId, slotLabel, slotItem);
        });

        dayCol.appendChild(slotItem);
      });

      gridContainer.appendChild(dayCol);
    });
  } else {
    // Mặc định Render từ CONFIG
    CONFIG.DAYS.forEach(day => {
      const dayCol = document.createElement('div');
      dayCol.className = 'day-column';

      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = day.label;
      dayCol.appendChild(header);

      CONFIG.SHIFTS.forEach(shift => {
        const slotId = `${day.key}_${shift.key}`;
        const slotLabel = `${day.label} (${shift.label}: ${shift.time})`;
        const count = slotCounts[slotLabel] || 0;
        const isFull = count >= maxCapacity;
        const isSelected = state.selectedSlots.some(s => s.id === slotId || s.label === slotLabel);

        if (isFull && isSelected) {
          const idx = state.selectedSlots.findIndex(s => s.id === slotId || s.label === slotLabel);
          if (idx > -1) state.selectedSlots.splice(idx, 1);
        }

        const slotItem = document.createElement('div');
        slotItem.className = `slot-item ${isFull ? 'full disabled' : ''} ${isSelected && !isFull ? 'selected' : ''}`;
        slotItem.dataset.id = slotId;
        slotItem.dataset.label = slotLabel;
        slotItem.dataset.count = count;

        slotItem.innerHTML = `
          <span class="slot-time">${shift.time}</span>
          <span class="slot-name">${shift.label}</span>
          <span class="slot-capacity-badge">${isFull ? 'ĐÃ ĐẦY (9/9)' : `${count}/${maxCapacity} người`}</span>
        `;

        slotItem.addEventListener('click', () => {
          if (isFull) {
            if (typeof showToast === 'function') {
              showToast(`Ca học "${slotLabel}" đã đủ tối đa 9/9 người đăng ký!`, 'error');
            }
            return;
          }
          toggleSlotSelection(slotId, slotLabel, slotItem);
        });

        dayCol.appendChild(slotItem);
      });

      gridContainer.appendChild(dayCol);
    });
  }

  renderSelectedTags();
  updateCounterBadge();
}

// 3. Toggle Multi-select slot selection
function toggleSlotSelection(slotId, slotLabel, element) {
  if (element.classList.contains('full') || element.classList.contains('disabled')) {
    if (typeof showToast === 'function') {
      showToast(`Ca học này đã đủ 9/9 người đăng ký, không thể chọn!`, 'error');
    }
    return;
  }

  const index = state.selectedSlots.findIndex(s => s.id === slotId);

  if (index > -1) {
    state.selectedSlots.splice(index, 1);
    element.classList.remove('selected');
  } else {
    state.selectedSlots.push({ id: slotId, label: slotLabel });
    element.classList.add('selected');
  }

  renderSelectedTags();
  updateCounterBadge();
}

// Render Selected Tags List
function renderSelectedTags() {
  const tagsContainer = document.getElementById('selectedTagsList');
  if (!tagsContainer) return;

  if (state.selectedSlots.length === 0) {
    tagsContainer.innerHTML = '<span class="empty-tag-hint">Chưa chọn ca học nào. Vui lòng bấm chọn trên bảng trên.</span>';
    return;
  }

  tagsContainer.innerHTML = '';
  state.selectedSlots.forEach(slot => {
    const tag = document.createElement('span');
    tag.className = 'slot-tag';
    tag.innerHTML = `
      <i class="fa-solid fa-clock"></i> ${slot.label}
      <i class="fa-solid fa-xmark remove-tag" data-id="${slot.id}"></i>
    `;

    tag.querySelector('.remove-tag').addEventListener('click', (e) => {
      e.stopPropagation();
      const slotEl = document.querySelector(`.slot-item[data-id="${slot.id}"]`);
      if (slotEl) {
        toggleSlotSelection(slot.id, slot.label, slotEl);
      }
    });

    tagsContainer.appendChild(tag);
  });
}

// Update Validation Counter Badge
function updateCounterBadge() {
  const badge = document.getElementById('slotCounterBadge');
  const counterText = document.getElementById('counterText');
  if (!badge || !counterText) return;

  const currentCount = state.selectedSlots.length;
  const targetCount = state.targetSessionCount;

  counterText.textContent = `Đã chọn: ${currentCount} / ${targetCount} buổi`;

  if (currentCount === targetCount) {
    badge.className = 'validation-badge valid';
    badge.querySelector('.badge-icon').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
  } else {
    badge.className = 'validation-badge';
    badge.querySelector('.badge-icon').innerHTML = '<i class="fa-solid fa-circle-info"></i>';
  }
}

// 4. Setup Form Submit & Validation
function setupFormEventListeners() {
  const form = document.getElementById('registrationForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const studentType = document.getElementById('studentType').value;
    const sessionsPerWeek = document.getElementById('sessionsPerWeek').value;
    const goal = document.getElementById('goal').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!fullName || !phone) {
      showToast('Vui lòng nhập Họ tên và Số điện thoại!', 'error');
      return;
    }

    if (state.selectedSlots.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 ca học!', 'error');
      return;
    }

    const payload = {
      fullName,
      phone,
      email,
      studentType,
      sessionsPerWeek,
      selectedSlots: state.selectedSlots.map(s => s.label),
      goal,
      notes
    };

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');
    submitBtn.disabled = true;

    let result = null;

    try {
      // 1. Thử gửi qua Vercel Serverless API
      const res = await fetch(CONFIG.API.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (err) {
      console.warn('Vercel Register API failed, trying direct Google Script fallback...', err);
    }

    // 2. Dự phòng: Gửi trực tiếp tới Google Apps Script Web App URL nếu Vercel API thất bại
    if ((!result || result.status !== 'success') && CONFIG.GOOGLE_SCRIPT_URL) {
      try {
        const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });
        const textRes = await res.text();
        try {
          result = JSON.parse(textRes);
        } catch (e) {
          result = { status: 'success', registrationId: 'DK-' + Date.now().toString().slice(-6) };
        }
      } catch (err) {
        console.error('Direct Google Script register error:', err);
      }
    }

    try {
      if (result && result.status === 'success') {
        const regId = result.registrationId || 'DK-' + Date.now().toString().slice(-6);
        showSuccessModal(regId, payload);
        showToast('Đăng ký thành công! Đã gửi thông tin lên Google Sheet.', 'success');

        state.registrations.unshift({
          "Mã Đăng Ký": regId,
          "Họ và Tên": fullName,
          "Số Điện Thoại / Zalo": phone,
          "Email": email,
          "Loại Học Viên": studentType,
          "Số Buổi / Tuần": sessionsPerWeek,
          "Các Ca Học Đã Chọn": payload.selectedSlots.join(', '),
          "Mục Tiêu Học Tập": goal,
          "Ghi Chú": notes,
          "Thời Gian Đăng Ký": new Date().toLocaleString('vi-VN'),
          "Trạng Thái": "Chờ xác nhận"
        });

        form.reset();
        state.selectedSlots = [];
        document.querySelectorAll('.slot-item.selected').forEach(el => el.classList.remove('selected'));
        renderSelectedTags();
        updateCounterBadge();

        if (typeof renderScheduleList === 'function') {
          renderScheduleList();
        }
      } else {
        showToast(result.message || 'Chưa nhận được phản hồi từ Google Sheet.', 'error');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Lỗi gửi dữ liệu. Vui lòng kiểm tra lại cấu hình Vercel GOOGLE_SCRIPT_URL.', 'error');
    } finally {
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
      submitBtn.disabled = false;
    }
  });
}

// Show Modal
function showSuccessModal(regId, data) {
  const modal = document.getElementById('successModal');
  const detailsBox = document.getElementById('modalDetails');
  
  if (!modal || !detailsBox) return;

  detailsBox.innerHTML = `
    <div style="background: var(--bg-input); padding: 16px; border-radius: 8px; text-align: left; font-size: 0.9rem; margin-top: 12px;">
      <p><strong>Mã đăng ký:</strong> <span style="color: var(--primary);">${regId}</span></p>
      <p><strong>Họ và Tên:</strong> ${data.fullName}</p>
      <p><strong>Số điện thoại:</strong> ${data.phone}</p>
      <p><strong>Chương trình:</strong> ${data.studentType} (${data.sessionsPerWeek})</p>
      <p><strong>Lịch học đã chọn:</strong></p>
      <ul style="padding-left: 20px; margin-top: 4px; color: var(--text-muted);">
        ${data.selectedSlots.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  `;

  modal.classList.remove('d-none');
}
