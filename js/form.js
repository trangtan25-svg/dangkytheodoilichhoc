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
  if (!studentTypeSelect || !sessionsSelect) return;

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
    // Nếu số ca học đã chọn đang nhiều hơn số buổi mới chọn ở dropdown, tự động giới hạn lại đúng số buổi
    if (state.selectedSlots.length > state.targetSessionCount) {
      const removedSlots = state.selectedSlots.slice(state.targetSessionCount);
      state.selectedSlots = state.selectedSlots.slice(0, state.targetSessionCount);
      
      // Bỏ class selected trên các ô bị thừa
      removedSlots.forEach(slot => {
        const slotEl = document.querySelector(`.slot-item[data-id="${slot.id}"]`);
        if (slotEl) slotEl.classList.remove('selected');
      });

      renderSelectedTags();
    }
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

// 2. Render Multi-Select Slots Matrix Grid (Đảm bảo LUÔN LUÔN hiển thị ĐỦ 7 NGÀY trong tuần x Khung giờ 1 & 2)
function renderSlotsGrid() {
  const gridContainer = document.getElementById('slotsGrid');
  if (!gridContainer) return;

  gridContainer.innerHTML = '';
  const slotCounts = getSlotRegistrationCounts();
  const maxCapacity = CONFIG.MAX_SLOT_CAPACITY || 9;

  // Xác định danh sách ca học (Lấy từ Dropdown sheet nếu có, hoặc dùng CONFIG.SHIFTS mặc định)
  let shiftsToRender = CONFIG.SHIFTS;
  if (Array.isArray(state.dropdownSlots) && state.dropdownSlots.length > 0) {
    const customShifts = [];
    const seen = new Set();
    state.dropdownSlots.forEach(s => {
      const shiftName = s.shift || s.label;
      if (shiftName && !seen.has(shiftName)) {
        seen.add(shiftName);
        customShifts.push({ key: shiftName, label: shiftName, time: s.time || '' });
      }
    });
    if (customShifts.length > 0) {
      shiftsToRender = customShifts;
    }
  }

  // LUÔN LUÔN VÒNG LẶP 7 NGÀY TRONG TUẦN (Thứ 2 -> Chủ Nhật)
  CONFIG.DAYS.forEach(day => {
    const dayCol = document.createElement('div');
    dayCol.className = 'day-column';

    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = day.label;
    dayCol.appendChild(header);

    shiftsToRender.forEach(shift => {
      const slotId = `${day.key}_${shift.key}`;
      const slotLabel = shift.time ? `${day.label} (${shift.label}: ${shift.time})` : `${day.label} (${shift.label})`;
      const count = slotCounts[slotLabel] || 0;

      // Kiểm tra xem Ca học có bị Admin khóa không
      const matchedDrop = (state.dropdownSlots || []).find(ds => ds.day === day.label && (ds.shift === shift.label || (ds.label || '').toString().includes(shift.label)));
      const isAdminLocked = matchedDrop && matchedDrop.status && (matchedDrop.status.toString().includes('khóa') || matchedDrop.status.toString().includes('tắt'));

      const isFull = count >= maxCapacity;
      const isDisabled = isFull || isAdminLocked;
      const isSelected = state.selectedSlots.some(s => s.id === slotId || s.label === slotLabel);

      if (isDisabled && isSelected) {
        const idx = state.selectedSlots.findIndex(s => s.id === slotId || s.label === slotLabel);
        if (idx > -1) state.selectedSlots.splice(idx, 1);
      }

      const slotItem = document.createElement('div');
      slotItem.className = `slot-item ${isDisabled ? 'full disabled' : ''} ${isSelected && !isDisabled ? 'selected' : ''}`;
      slotItem.dataset.id = slotId;
      slotItem.dataset.label = slotLabel;
      slotItem.dataset.count = count;

      let badgeText = `${count}/${maxCapacity} người`;
      if (isAdminLocked) badgeText = 'ĐÃ KHÓA';
      else if (isFull) badgeText = 'ĐÃ ĐẦY (9/9)';

      slotItem.innerHTML = `
        <span class="slot-name" style="font-weight: 700; font-size: 0.88rem; display: block; margin-bottom: 2px;">${shift.label}</span>
        ${shift.time ? `<span class="slot-time">${shift.time}</span>` : ''}
        <span class="slot-capacity-badge">${badgeText}</span>
      `;

      slotItem.addEventListener('click', () => {
        if (isDisabled) {
          if (isAdminLocked && typeof showToast === 'function') {
            showToast(`Ca học "${slotLabel}" hiện tại đã bị Khóa bởi Quản trị viên!`, 'error');
          }
          return;
        }
        toggleSlotSelection(slotId, slotLabel, slotItem);
      });

      dayCol.appendChild(slotItem);
    });

    gridContainer.appendChild(dayCol);
  });

  renderSelectedTags();
  updateCounterBadge();
}

// 3. Toggle Multi-select slot selection (Khóa không cho chọn vượt quá số buổi đăng ký)
function toggleSlotSelection(slotId, slotLabel, element) {
  if (element.classList.contains('full') || element.classList.contains('disabled')) {
    if (typeof showToast === 'function') {
      showToast(`Ca học này đã đủ 9/9 người đăng ký hoặc đang bị khóa, không thể chọn!`, 'error');
    }
    return;
  }

  const index = state.selectedSlots.findIndex(s => s.id === slotId);

  if (index > -1) {
    state.selectedSlots.splice(index, 1);
    element.classList.remove('selected');
  } else {
    const targetLimit = state.targetSessionCount || 4;
    if (state.selectedSlots.length >= targetLimit) {
      if (typeof showToast === 'function') {
        showToast(`Bạn đã chọn đủ ${targetLimit} buổi/tuần theo số buổi đăng ký! Vui lòng bỏ chọn ca khác nếu muốn đổi ca học.`, 'warning');
      }
      return;
    }
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

// Update Validation Counter Badge (Hiển thị Đã chọn: X / Y buổi)
function updateCounterBadge() {
  const badge = document.getElementById('slotCounterBadge');
  const counterText = document.getElementById('counterText');
  if (!badge || !counterText) return;

  const currentCount = state.selectedSlots.length;
  const targetLimit = state.targetSessionCount || 4;

  counterText.textContent = `Đã chọn: ${currentCount} / ${targetLimit} buổi`;

  if (currentCount === targetLimit) {
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
    const studentTypeSelect = document.getElementById('studentType');
    const sessionsSelect = document.getElementById('sessionsPerWeek');
    const studentType = studentTypeSelect ? studentTypeSelect.value : 'Cấp tốc';
    const sessionsPerWeek = sessionsSelect ? sessionsSelect.value : '4 buổi/tuần';
    const goal = document.getElementById('goal').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!fullName || !phone) {
      showToast('Vui lòng nhập Họ tên và Số điện thoại!', 'error');
      return;
    }

    const targetLimit = state.targetSessionCount || 4;

    if (state.selectedSlots.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 ca học trên bảng thời khóa biểu!', 'error');
      return;
    }

    if (state.selectedSlots.length !== targetLimit) {
      showToast(`Bạn đăng ký gói ${sessionsPerWeek}, vui lòng chọn đúng đủ ${targetLimit} ca học trên bảng (Hiện tại bạn đã chọn ${state.selectedSlots.length} ca).`, 'error');
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

    try {
      // Gửi đăng ký tới Vercel Serverless API (/api/register)
      const res = await fetch(CONFIG.API.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();

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

        if (typeof fetchScheduleData === 'function') {
          fetchScheduleData();
        }
      } else {
        showToast(result.message || 'Chưa nhận được phản hồi từ Google Sheet.', 'error');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Lỗi gửi dữ liệu. Vui lòng kiểm tra biến môi trường GOOGLE_SCRIPT_URL trên Vercel.', 'error');
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
      <p><strong>Chương trình:</strong> ${data.studentType || 'Cấp tốc'} (${data.sessionsPerWeek || ''})</p>
      <p><strong>Lịch học đã chọn:</strong></p>
      <ul style="padding-left: 20px; margin-top: 4px; color: var(--text-muted);">
        ${data.selectedSlots.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  `;

  modal.classList.remove('d-none');
}
