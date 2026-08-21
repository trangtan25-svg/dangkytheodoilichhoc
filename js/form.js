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

// 2. Render Multi-Select Slots Matrix Grid
function renderSlotsGrid() {
  const gridContainer = document.getElementById('slotsGrid');
  if (!gridContainer) return;

  gridContainer.innerHTML = '';

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

      const slotItem = document.createElement('div');
      slotItem.className = 'slot-item';
      slotItem.dataset.id = slotId;
      slotItem.dataset.label = slotLabel;

      slotItem.innerHTML = `
        <span class="slot-time">${shift.time}</span>
        <span class="slot-name">${shift.label}</span>
      `;

      slotItem.addEventListener('click', () => toggleSlotSelection(slotId, slotLabel, slotItem));

      dayCol.appendChild(slotItem);
    });

    gridContainer.appendChild(dayCol);
  });
}

// 3. Toggle Multi-select slot selection
function toggleSlotSelection(slotId, slotLabel, element) {
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

    try {
      // Send directly to Vercel Serverless API endpoint
      const res = await fetch(CONFIG.API.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.status === 'success') {
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
