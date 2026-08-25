/**
 * GOOGLE APPS SCRIPT KẾT NỐI 2 CHIỀU CHO WEBSITE ĐĂNG KÝ LỊCH HỌC
 * Google Sheet ID: 1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA
 * 
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA/edit
 * 2. Vào Tiện ích mở rộng (Extensions) -> Apps Script
 * 3. Dán toàn bộ mã này vào và bấm Lưu (Ctrl + S)
 * 4. Bấm "Triển khai" (Deploy) -> "Thực thi dưới dạng ứng dụng web" (New deployment -> Web App)
 *    - Thực thi dưới tên: Tôi (Execute as: Me)
 *    - Ai có quyền truy cập: Bất kỳ ai (Who has access: Anyone)
 * 5. Coppy URL Web App nhận được và dán vào biến GOOGLE_SCRIPT_URL trong Vercel Environment Variables!
 */

/**
 * GOOGLE APPS SCRIPT KẾT NỐI 2 CHIỀU ĐỒNG BỘ ĐỘNG & CHỐNG QUÁ TẢI (LOCKSERVICE)
 * Quản lý 2 trang tính:
 * 1. DangKyLichHoc : Lưu trữ danh sách học viên đăng ký
 * 2. Dropdown       : Chứa danh sách các Ca học / Khung giờ tùy chỉnh
 */

const SHEET_REGISTRATIONS = 'DangKyLichHoc';
const SHEET_DROPDOWN = 'Dropdown';
const MAX_SLOT_CAPACITY = 9;

// 1. Helper lấy trang tính theo tên (Tự động khởi tạo nếu chưa có)
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    // Nếu tìm theo tên không có, kiểm tra xem có sheet nào đang dùng tạm không
    if (sheetName === SHEET_REGISTRATIONS) {
      sheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1') || ss.getSheets()[0];
      if (sheet) {
        try { sheet.setName(SHEET_REGISTRATIONS); } catch (e) {}
      } else {
        sheet = ss.insertSheet(SHEET_REGISTRATIONS);
      }
    } else if (sheetName === SHEET_DROPDOWN) {
      sheet = ss.insertSheet(SHEET_DROPDOWN);
    }
  }

  // Khởi tạo cột tiêu đề nếu trang tính còn trống
  if (sheet.getLastRow() === 0) {
    if (sheetName === SHEET_REGISTRATIONS) {
      sheet.appendRow([
        'Mã Đăng Ký', 
        'Họ và Tên', 
        'Số Điện Thoại / Zalo', 
        'Email', 
        'Loại Học Viên', 
        'Số Buổi / Tuần', 
        'Các Ca Học Đã Chọn', 
        'Mục Tiêu Học Tập', 
        'Ghi Chú', 
        'Thời Gian Đăng Ký', 
        'Trạng Thái'
      ]);
      sheet.getRange("1:1").setFontWeight("bold").setBackground("#4F46E5").setFontColor("#FFFFFF");
    } else if (sheetName === SHEET_DROPDOWN) {
      sheet.appendRow(['Thứ / Ngày', 'Tên Ca', 'Thời Gian', 'Mô Tả / Trạng Thái']);
      // Dữ liệu mẫu ban đầu cho sheet Dropdown
      const defaultSlots = [
        ['Thứ 2', 'Ca Sáng', '08h00 - 10h00', 'Hoạt động'],
        ['Thứ 2', 'Ca Chiều', '14h00 - 16h00', 'Hoạt động'],
        ['Thứ 2', 'Ca Tối', '18h30 - 20h30', 'Hoạt động'],
        ['Thứ 2', 'Ca Tối Muộn', '20h30 - 22h00', 'Hoạt động'],
        ['Thứ 3', 'Ca Sáng', '08h00 - 10h00', 'Hoạt động'],
        ['Thứ 3', 'Ca Chiều', '14h00 - 16h00', 'Hoạt động'],
        ['Thứ 3', 'Ca Tối', '18h30 - 20h30', 'Hoạt động'],
        ['Thứ 3', 'Ca Tối Muộn', '20h30 - 22h00', 'Hoạt động'],
        ['Thứ 4', 'Ca Sáng', '08h00 - 10h00', 'Hoạt động'],
        ['Thứ 4', 'Ca Chiều', '14h00 - 16h00', 'Hoạt động'],
        ['Thứ 4', 'Ca Tối', '18h30 - 20h30', 'Hoạt động'],
        ['Thứ 4', 'Ca Tối Muộn', '20h30 - 22h00', 'Hoạt động'],
        ['Thứ 5', 'Ca Sáng', '08h00 - 10h00', 'Hoạt động'],
        ['Thứ 5', 'Ca Chiều', '14h00 - 16h00', 'Hoạt động'],
        ['Thứ 5', 'Ca Tối', '18h30 - 20h30', 'Hoạt động'],
        ['Thứ 5', 'Ca Tối Muộn', '20h30 - 22h00', 'Hoạt động'],
        ['Thứ 6', 'Ca Sáng', '08h00 - 10h00', 'Hoạt động'],
        ['Thứ 6', 'Ca Chiều', '14h00 - 16h00', 'Hoạt động'],
        ['Thứ 6', 'Ca Tối', '18h30 - 20h30', 'Hoạt động'],
        ['Thứ 6', 'Ca Tối Muộn', '20h30 - 22h00', 'Hoạt động'],
        ['Thứ 7', 'Ca Sáng', '08h00 - 10h00', 'Hoạt động'],
        ['Thứ 7', 'Ca Chiều', '14h00 - 16h00', 'Hoạt động'],
        ['Thứ 7', 'Ca Tối', '18h30 - 20h30', 'Hoạt động'],
        ['Thứ 7', 'Ca Tối Muộn', '20h30 - 22h00', 'Hoạt động'],
        ['Chủ Nhật', 'Ca Sáng', '08h00 - 10h00', 'Hoạt động'],
        ['Chủ Nhật', 'Ca Chiều', '14h00 - 16h00', 'Hoạt động'],
        ['Chủ Nhật', 'Ca Tối', '18h30 - 20h30', 'Hoạt động'],
        ['Chủ Nhật', 'Ca Tối Muộn', '20h30 - 22h00', 'Hoạt động']
      ];
      defaultSlots.forEach(row => sheet.appendRow(row));
      sheet.getRange("1:1").setFontWeight("bold").setBackground("#10B981").setFontColor("#FFFFFF");
    }
  }
  return sheet;
}

// 2. CHIỀU ĐỌC DỮ LIỆU (GET): Trả về ĐỒNG THỜI cả Đăng ký học viên & Danh sách Ca học từ sheet Dropdown
function doGet(e) {
  try {
    // A. Đọc dữ liệu học viên đăng ký
    const regSheet = getSheet(SHEET_REGISTRATIONS);
    const regData = regSheet.getDataRange().getValues();
    const registrations = [];

    if (regData && regData.length > 1) {
      const headers = regData[0].map(h => h ? h.toString().trim() : '');
      const rows = regData.slice(1);

      rows.forEach((row, index) => {
        const hasContent = row.some(cell => cell && cell.toString().trim() !== '');
        if (!hasContent) return;

        let item = { rowIndex: index + 2 };
        headers.forEach((header, colIndex) => {
          if (header) item[header] = row[colIndex];
        });

        // Ánh xạ linh hoạt tên cột
        item['Mã Đăng Ký'] = item['Mã Đăng Ký'] || item['MaDK'] || item['Mã'] || row[0] || ('DK-' + (index + 1));
        item['Họ và Tên'] = item['Họ và Tên'] || item['Họ tên'] || item['Full Name'] || row[1] || 'Học viên';
        item['Số Điện Thoại / Zalo'] = item['Số Điện Thoại / Zalo'] || item['Số điện thoại'] || item['SĐT'] || item['Phone'] || row[2] || 'N/A';
        item['Email'] = item['Email'] || row[3] || '';
        item['Loại Học Viên'] = item['Loại Học Viên'] || item['Loại học viên'] || row[4] || 'Cấp tốc';
        item['Số Buổi / Tuần'] = item['Số Buổi / Tuần'] || item['Số buổi'] || row[5] || '';
        item['Các Ca Học Đã Chọn'] = item['Các Ca Học Đã Chọn'] || item['Lịch học'] || item['Ca học'] || row[6] || '';
        item['Mục Tiêu Học Tập'] = item['Mục Tiêu Học Tập'] || item['Mục tiêu'] || row[7] || '';
        item['Ghi Chú'] = item['Ghi Chú'] || row[8] || '';
        item['Thời Gian Đăng Ký'] = item['Thời Gian Đăng Ký'] || row[9] || '';
        item['Trạng Thái'] = item['Trạng Thái'] || item['Trạng thái'] || row[10] || 'Chờ xác nhận';

        registrations.push(item);
      });
    }

    // B. Đọc dữ liệu ca học từ sheet Dropdown
    const dropdownSheet = getSheet(SHEET_DROPDOWN);
    const dropdownData = dropdownSheet.getDataRange().getValues();
    const dropdownSlots = [];

    if (dropdownData && dropdownData.length > 1) {
      const dropRows = dropdownData.slice(1);
      dropRows.forEach((row) => {
        if (!row[0] && !row[1]) return;
        const dayLabel = (row[0] || '').toString().trim();
        const shiftLabel = (row[1] || '').toString().trim();
        const shiftTime = (row[2] || '').toString().trim();
        const status = (row[3] || 'Hoạt động').toString().trim();

        if (status.toLowerCase().includes('khóa') || status.toLowerCase().includes('tắt')) {
          return; // Bỏ qua ca học bị đánh dấu khóa trong sheet Dropdown
        }

        const fullLabel = `${dayLabel} (${shiftLabel}${shiftTime ? ': ' + shiftTime : ''})`;
        dropdownSlots.push({
          day: dayLabel,
          shift: shiftLabel,
          time: shiftTime,
          label: fullLabel
        });
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success', 
        dropdowns: dropdownSlots,
        registrations: registrations 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. CHIỀU GHI DỮ LIỆU (POST): Xử lý Atomic LockService chống quá tải & mất dữ liệu khi nhiều học viên đăng ký cùng lúc
function doPost(e) {
  // Khóa hàng đợi LockService (Chờ tối đa 10 giây để xử lý tuần tự không bị tranh chấp)
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);

  if (!hasLock) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Hệ thống đang xử lý nhiều lượt đăng ký cùng lúc. Vui lòng bấm gửi lại sau vài giây!'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const sheet = getSheet(SHEET_REGISTRATIONS);
    const contents = JSON.parse(e.postData.contents);

    const requestedSlots = Array.isArray(contents.selectedSlots)
      ? contents.selectedSlots
      : (contents.selectedSlots ? [contents.selectedSlots] : []);

    // 1. Đếm số lượt đã đăng ký trong sheet để đảm bảo không ca nào vượt quá MAX_SLOT_CAPACITY (9 người)
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    const slotCounts = {};

    rows.forEach(row => {
      const selectedStr = row[6] || '';
      if (selectedStr) {
        const slots = selectedStr.toString().split(',').map(s => s.trim());
        slots.forEach(slot => {
          if (slot) {
            slotCounts[slot] = (slotCounts[slot] || 0) + 1;
          }
        });
      }
    });

    // 2. Kiểm tra xem có ca nào vượt quá 9 người không
    for (let i = 0; i < requestedSlots.length; i++) {
      const slotName = requestedSlots[i];
      const currentCount = slotCounts[slotName] || 0;
      if (currentCount >= MAX_SLOT_CAPACITY) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            status: 'error', 
            message: 'Ca học "' + slotName + '" đã đủ tối đa 9 người đăng ký. Vui lòng chọn ca học khác!' 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 3. Tạo mã đăng ký & Ghi dòng mới an toàn
    const registrationId = 'DK-' + Date.now().toString().slice(-6);
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    const newRow = [
      registrationId,
      contents.fullName || '',
      contents.phone || '',
      contents.email || '',
      contents.studentType || 'Cấp tốc',
      contents.sessionsPerWeek || '4 buổi/tuần',
      requestedSlots.join(', '),
      contents.goal || '',
      contents.notes || '',
      timestamp,
      'Chờ xác nhận'
    ];
    
    sheet.appendRow(newRow);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: 'Đăng ký lịch học thành công!', 
        registrationId: registrationId,
        data: contents 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    // Luôn nhả khóa hàng đợi sau khi hoàn tất
    lock.releaseLock();
  }
}

