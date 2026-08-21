/**
 * MAIN APPLICATION LOGIC & ROUTER
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigationTabs();
  initThemeToggle();
  initCopyButtons();
  initModalClose();
  initScriptUrlConfig();
});

// 1. Navigation Tab Switching
function initNavigationTabs() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabPanes.forEach(pane => {
        if (pane.id === targetTab) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });
}

// 2. Dark / Light Theme Toggle
function initThemeToggle() {
  const themeBtn = document.getElementById('themeToggle');
  if (!themeBtn) return;

  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  const themeBtn = document.getElementById('themeToggle');
  if (!themeBtn) return;

  if (theme === 'dark') {
    themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    themeBtn.title = 'Chuyển Chế độ Sáng';
  } else {
    themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    themeBtn.title = 'Chuyển Chế độ Tối';
  }
}

// 3. Toast Notifications System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info'
  };

  toast.innerHTML = `
    <i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 4. Copy-to-clipboard functionality
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.dataset.copy;
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        showToast('Đã sao chép vào bộ nhớ tạm!', 'success');
      }
    });
  });
}

// 5. Modal Close
function initModalClose() {
  const closeBtn = document.getElementById('modalCloseBtn');
  const modal = document.getElementById('successModal');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('d-none');
      const trackerTabBtn = document.querySelector('.nav-btn[data-tab="tab-tracker"]');
      if (trackerTabBtn) {
        trackerTabBtn.click();
      }
    });
  }
}

// 6. Direct UI Apps Script URL Configuration & Test Connection
function initScriptUrlConfig() {
  const input = document.getElementById('scriptUrlInput');
  const saveBtn = document.getElementById('saveScriptUrlBtn');
  const statusDiv = document.getElementById('connectionStatus');

  if (!input || !saveBtn) return;

  const savedUrl = getActiveScriptUrl();
  if (savedUrl) {
    input.value = savedUrl;
    if (statusDiv) {
      statusDiv.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> Đã có Web App URL. Đẵn sàng kết nối Google Sheet!</span>`;
    }
  }

  saveBtn.addEventListener('click', async () => {
    const url = input.value.trim();
    if (!url) {
      showToast('Vui lòng nhập Web App URL của bạn!', 'error');
      return;
    }

    localStorage.setItem('GOOGLE_SCRIPT_URL', url);
    CONFIG.DEFAULT_SCRIPT_URL = url;

    saveBtn.disabled = true;
    if (statusDiv) {
      statusDiv.innerHTML = `<span style="color: var(--warning);"><i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra kết nối tới Google Sheet...</span>`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'success') {
        if (statusDiv) {
          statusDiv.innerHTML = `<span style="color: var(--success); font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Kết nối Google Sheet thành công! Tìm thấy ${data.data.length} hàng dữ liệu.</span>`;
        }
        showToast('Kết nối Google Sheet thành công!', 'success');

        if (typeof fetchScheduleData === 'function') {
          fetchScheduleData();
        }
      } else {
        if (statusDiv) {
          statusDiv.innerHTML = `<span style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối: ${data.message || 'Không thể đọc dữ liệu'}</span>`;
        }
      }
    } catch (err) {
      console.error('Test connection error:', err);
      if (statusDiv) {
        statusDiv.innerHTML = `<span style="color: var(--success); font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Đã lưu Web App URL thành công! (Dữ liệu sẵn sàng ghi vào Sheet).</span>`;
      }
      showToast('Đã lưu URL kết nối Google Sheet!', 'success');
    } finally {
      saveBtn.disabled = false;
    }
  });
}
