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

function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
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
    const sheet = initSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map((row, index) => {
      let item = { rowIndex: index + 2 };
      headers.forEach((header, colIndex) => {
        item[header] = row[colIndex];
      });
      return item;
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

// 2. CHIỀU GHI DỮ LIỆU (POST): Nhận đăng ký mới từ Web và append vào Google Sheet
function doPost(e) {
  try {
    const sheet = initSheet();
    const contents = JSON.parse(e.postData.contents);
    
    const registrationId = 'DK-' + Date.now().toString().slice(-6);
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    const newRow = [
      registrationId,
      contents.fullName || '',
      contents.phone || '',
      contents.email || '',
      contents.studentType || 'Cấp tốc',
      contents.sessionsPerWeek || '4 buổi/tuần',
      Array.isArray(contents.selectedSlots) ? contents.selectedSlots.join(', ') : (contents.selectedSlots || ''),
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
