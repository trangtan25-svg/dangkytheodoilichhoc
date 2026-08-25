/**
 * MAIN APPLICATION LOGIC & ROUTER
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigationTabs();
  initThemeToggle();
  initCopyButtons();
  initModalClose();
});

// 1. Navigation Tab Switching with Password Authentication Protection (Pass: 12345)
function initNavigationTabs() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const authModal = document.getElementById('authPasswordModal');
  const authForm = document.getElementById('authPasswordForm');
  const authInput = document.getElementById('authPasswordInput');
  const authCancelBtn = document.getElementById('authPasswordCancelBtn');

  let pendingTab = null;

  function switchTab(targetTabId) {
    navButtons.forEach(b => {
      if (b.dataset.tab === targetTabId) b.classList.add('active');
      else b.classList.remove('active');
    });

    tabPanes.forEach(pane => {
      if (pane.id === targetTabId) pane.classList.add('active');
      else pane.classList.remove('active');
    });

    if (targetTabId === 'tab-admin' && typeof renderAdminSlotsGrid === 'function') {
      renderAdminSlotsGrid();
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Bảo mật bằng Mật khẩu (12345) cho Tab Theo dõi Lịch học & Quản trị Lịch học
      if ((targetTab === 'tab-tracker' || targetTab === 'tab-admin') && !state.isStaffAuthenticated) {
        pendingTab = targetTab;
        if (authModal) {
          authModal.classList.remove('d-none');
          if (authInput) {
            authInput.value = '';
            setTimeout(() => authInput.focus(), 100);
          }
        }
        return;
      }

      switchTab(targetTab);
    });
  });

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPassword = authInput ? authInput.value.trim() : '';

      if (enteredPassword === '12345') {
        state.isStaffAuthenticated = true;
        if (authModal) authModal.classList.add('d-none');
        if (typeof showToast === 'function') {
          showToast('Xác thực mật khẩu Quản trị viên thành công!', 'success');
        }
        if (pendingTab) {
          switchTab(pendingTab);
          pendingTab = null;
        } else {
          switchTab('tab-tracker');
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('Mật khẩu không chính xác! Vui lòng thử lại (Mật khẩu: 12345)', 'error');
        }
        if (authInput) {
          authInput.value = '';
          authInput.focus();
        }
      }
    });
  }

  if (authCancelBtn && authModal) {
    authCancelBtn.addEventListener('click', () => {
      authModal.classList.add('d-none');
      pendingTab = null;
    });
  }
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
