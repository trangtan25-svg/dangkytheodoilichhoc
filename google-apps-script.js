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

const SHEET_NAME = 'DangKyLichHoc';

// Lấy trang tính thông minh: Ưu tiên 'DangKyLichHoc', nếu không có sẽ tự tìm trang tính đầu tiên chứa dữ liệu
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getLastRowCount() > 0) {
        sheet = sheets[i];
        break;
      }
    }
  }

  if (!sheet) {
    sheet = ss.getSheets()[0] || ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRowCount() === 0) {
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
  }
  return sheet;
}

// 1. CHIỀU ĐỌC DỮ LIỆU (GET): Trả về danh sách thời khóa biểu & lịch đã đăng ký cho Web
function doGet(e) {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0].map(h => h ? h.toString().trim() : '');
    const rows = data.slice(1);
    
    const result = [];
    rows.forEach((row, index) => {
      const hasContent = row.some(cell => cell && cell.toString().trim() !== '');
      if (!hasContent) return;

      let item = { rowIndex: index + 2 };
      headers.forEach((header, colIndex) => {
        if (header) item[header] = row[colIndex];
      });

      // Ánh xạ linh hoạt linh hoạt các tên cột nếu người dùng nhập tiêu đề hơi khác
      item['Mã Đăng Ký'] = item['Mã Đăng Ký'] || item['MaDK'] || item['Mã'] || row[0] || ('DK-' + (index + 1));
      item['Họ và Tên'] = item['Họ và Tên'] || item['Họ tên'] || item['Họ Tên'] || item['Full Name'] || row[1] || 'Học viên';
      item['Số Điện Thoại / Zalo'] = item['Số Điện Thoại / Zalo'] || item['Số điện thoại'] || item['SĐT'] || item['Phone'] || row[2] || 'N/A';
      item['Email'] = item['Email'] || row[3] || '';
      item['Loại Học Viên'] = item['Loại Học Viên'] || item['Loại học viên'] || row[4] || 'Cấp tốc';
      item['Số Buổi / Tuần'] = item['Số Buổi / Tuần'] || item['Số buổi'] || row[5] || '';
      item['Các Ca Học Đã Chọn'] = item['Các Ca Học Đã Chọn'] || item['Lịch học'] || item['Ca học'] || item['Các ca học'] || row[6] || '';
      item['Mục Tiêu Học Tập'] = item['Mục Tiêu Học Tập'] || item['Mục tiêu'] || row[7] || '';
      item['Ghi Chú'] = item['Ghi Chú'] || row[8] || '';
      item['Trạng Thái'] = item['Trạng Thái'] || item['Trạng thái'] || row[10] || 'Chờ xác nhận';

      result.push(item);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. CHIỀU GHI DỮ LIỆU (POST): Nhận đăng ký mới từ Web và append vào Google Sheet với kiểm tra giới hạn 9 người/ca
function doPost(e) {
  try {
    const sheet = getSheet();
    const contents = JSON.parse(e.postData.contents);
    const MAX_SLOT_CAPACITY = 9;

    const requestedSlots = Array.isArray(contents.selectedSlots)
      ? contents.selectedSlots
      : (contents.selectedSlots ? [contents.selectedSlots] : []);

    // Đếm số lượng đăng ký hiện tại trong Sheet để đảm bảo không ca nào > 9 người
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
  }
}
