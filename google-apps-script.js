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

const SPREADSHEET_ID = '1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA';
const SHEET_REGISTRATIONS = 'DangKyLichHoc';
const SHEET_DROPDOWN = 'quanlykhunggio';
const MAX_SLOT_CAPACITY = 9;

// 1. Helper lấy trang tính theo tên (Truy xuất thông minh theo Spreadsheet ID & Tự nhận diện tên sheet)
function getSheet(sheetName) {
  let ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  let sheet = ss.getSheetByName(sheetName);

  // Nếu tìm chính xác chưa thấy, tìm kiếm không phân biệt hoa/thường hay khoảng trắng
  if (!sheet) {
    const sheets = ss.getSheets();
    const targetNorm = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (let i = 0; i < sheets.length; i++) {
      const sName = sheets[i].getName();
      const sNorm = sName.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (sNorm === targetNorm || 
          (sheetName === SHEET_DROPDOWN && (sNorm.includes('khunggio') || sNorm.includes('dropdown')))) {
        sheet = sheets[i];
        break;
      }
    }
  }

  if (!sheet) {
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
      // Dữ liệu mẫu ban đầu cho sheet Dropdown: Khung giờ 1 & Khung giờ 2 cho 7 ngày trong tuần
      const defaultSlots = [
        ['Thứ 2', 'Khung giờ 1', '', 'Hoạt động'],
        ['Thứ 2', 'Khung giờ 2', '', 'Hoạt động'],
        ['Thứ 3', 'Khung giờ 1', '', 'Hoạt động'],
        ['Thứ 3', 'Khung giờ 2', '', 'Hoạt động'],
        ['Thứ 4', 'Khung giờ 1', '', 'Hoạt động'],
        ['Thứ 4', 'Khung giờ 2', '', 'Hoạt động'],
        ['Thứ 5', 'Khung giờ 1', '', 'Hoạt động'],
        ['Thứ 5', 'Khung giờ 2', '', 'Hoạt động'],
        ['Thứ 6', 'Khung giờ 1', '', 'Hoạt động'],
        ['Thứ 6', 'Khung giờ 2', '', 'Hoạt động'],
        ['Thứ 7', 'Khung giờ 1', '', 'Hoạt động'],
        ['Thứ 7', 'Khung giờ 2', '', 'Hoạt động'],
        ['Chủ Nhật', 'Khung giờ 1', '', 'Hoạt động'],
        ['Chủ Nhật', 'Khung giờ 2', '', 'Hoạt động']
      ];
      defaultSlots.forEach(row => sheet.appendRow(row));
      sheet.getRange("1:1").setFontWeight("bold").setBackground("#10B981").setFontColor("#FFFFFF");
    }
  }
  return sheet;
}

// 2. CHIỀU ĐỌC DỮ LIỆU (GET): Trả về ĐỒNG THỜI cả Đăng ký học viên & Danh sách Ca học từ sheet quanlykhunggio
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
        item['Loại Học Viên'] = item['Loại Học Viên'] || item['Loại học viên'] || row[4] || '';
        item['Số Buổi / Tuần'] = item['Số Buổi / Tuần'] || item['Số buổi'] || row[5] || '';
        item['Các Ca Học Đã Chọn'] = item['Các Ca Học Đã Chọn'] || item['Lịch học'] || item['Ca học'] || row[6] || '';
        item['Mục Tiêu Học Tập'] = item['Mục Tiêu Học Tập'] || item['Mục tiêu'] || row[7] || '';
        item['Ghi Chú'] = item['Ghi Chú'] || row[8] || '';
        item['Thời Gian Đăng Ký'] = item['Thời Gian Đăng Ký'] || row[9] || '';
        item['Trạng Thái'] = item['Trạng Thái'] || item['Trạng thái'] || row[10] || 'Chờ xác nhận';

        registrations.push(item);
      });
    }

    // B. Đọc dữ liệu ca học từ sheet quanlykhunggio (Tự động nhận diện Dạng Ma trận hoặc Dạng Dòng)
    const dropdownSheet = getSheet(SHEET_DROPDOWN);
    const dropdownData = dropdownSheet.getDataRange().getValues();
    const dropdownSlots = [];

    if (dropdownData && dropdownData.length > 1) {
      const headers = dropdownData[0].map(h => (h || '').toString().trim());
      const isMatrixFormat = headers.some((h, idx) => idx > 0 && (h.toLowerCase().includes('khung giờ') || h.toLowerCase().includes('ca '))) &&
                             !headers[1].toLowerCase().includes('tên ca') && !headers[1].toLowerCase().includes('ca học');

      if (isMatrixFormat) {
        // DẠNG MA TRẬN: Dòng 1 chứa tên ca học (Col 1: Khung giờ 1, Col 2: Khung giờ 2...)
        for (let i = 1; i < dropdownData.length; i++) {
          const dayLabel = (dropdownData[i][0] || '').toString().trim();
          if (!dayLabel) continue;

          for (let col = 1; col < headers.length; col++) {
            const shiftLabel = headers[col];
            if (!shiftLabel) continue;
            const status = (dropdownData[i][col] || 'Hoạt động').toString().trim();

            dropdownSlots.push({
              day: dayLabel,
              shift: shiftLabel,
              time: '',
              status: status,
              label: `${dayLabel} (${shiftLabel})`
            });
          }
        }
      } else {
        // DẠNG DÒNG (Standard): Cột 1 = Thứ, Cột 2 = Tên ca, Cột 3 = Thời gian, Cột Trạng thái
        let statusColIndex = 3; // Mặc định là Cột D (0-indexed)
        headers.forEach((h, idx) => {
          const hLower = h.toLowerCase();
          if (hLower.includes('trạng thái') || hLower.includes('trang thai') || hLower.includes('khóa') || hLower.includes('mô tả') || hLower.includes('status')) {
            statusColIndex = idx;
          }
        });

        for (let i = 1; i < dropdownData.length; i++) {
          const row = dropdownData[i];
          if (!row[0] && !row[1]) continue;
          const dayLabel = (row[0] || '').toString().trim();
          const shiftLabel = (row[1] || '').toString().trim();
          const shiftTime = (row[2] || '').toString().trim();
          const status = (row[statusColIndex] !== undefined && row[statusColIndex] !== null && row[statusColIndex] !== '') 
            ? row[statusColIndex].toString().trim() 
            : 'Hoạt động';

          const fullLabel = shiftTime ? `${dayLabel} (${shiftLabel}: ${shiftTime})` : `${dayLabel} (${shiftLabel})`;
          dropdownSlots.push({
            day: dayLabel,
            shift: shiftLabel,
            time: shiftTime,
            status: status,
            label: fullLabel
          });
        }
      }
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

// 3. CHIỀU GHI DỮ LIỆU (POST): Xử lý Đăng ký mới, Nút Xác nhận & Quản trị Mở/Khóa ca (LockService)
function doPost(e) {
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
    const dropdownSheet = getSheet(SHEET_DROPDOWN);
    const contents = JSON.parse(e.postData.contents);

    // A. Hành động Thêm Khung giờ / Ca học mới vào sheet quanlykhunggio
    if (contents.action === 'addDropdownSlot') {
      const newDay = contents.day || 'Thứ 2';
      const newShift = contents.shift || 'Khung giờ mới';
      const newTime = contents.time || '';
      const newStatus = 'Hoạt động';

      dropdownSheet.appendRow([newDay, newShift, newTime, newStatus]);

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `Đã thêm thành công ca học "${newDay} (${newShift}${newTime ? ': ' + newTime : ''})" vào sheet quanlykhunggio!`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // B. Hành động Quản trị Mở / Khóa Đơn lẻ Ca học (Thông minh tự phát hiện Dạng Ma trận hoặc Dạng Dòng)
    if (contents.action === 'updateSlotStatus') {
      const targetDay = (contents.day || '').toString().trim().toLowerCase();
      const targetShift = (contents.shift || '').toString().trim().toLowerCase();
      const newStatus = contents.status || 'Đã khóa'; // 'Hoạt động' | 'Đã khóa'

      const dropData = dropdownSheet.getDataRange().getValues();

      if (dropData && dropData.length > 0) {
        const headers = dropData[0].map(h => (h || '').toString().trim());

        // 1. Kiểm tra xem Sheet có phải dạng Ma trận (Cột B, C... là Tên ca như "Khung giờ 1", "Khung giờ 2")
        let matrixColIndex = -1;
        for (let c = 1; c < headers.length; c++) {
          const hLower = headers[c].toLowerCase();
          if (hLower === targetShift || hLower.includes(targetShift) || targetShift.includes(hLower)) {
            if (!hLower.includes('tên ca') && !hLower.includes('thời gian') && !hLower.includes('trạng thái')) {
              matrixColIndex = c;
              break;
            }
          }
        }

        if (matrixColIndex > -1) {
          // Xử lý DẠNG MA TRẬN
          let foundRow = -1;
          for (let i = 1; i < dropData.length; i++) {
            const dayVal = (dropData[i][0] || '').toString().trim().toLowerCase();
            if (dayVal === targetDay || dayVal.includes(targetDay) || targetDay.includes(dayVal)) {
              foundRow = i + 1;
              break;
            }
          }
          if (foundRow > -1) {
            dropdownSheet.getRange(foundRow, matrixColIndex + 1).setValue(newStatus);
          } else {
            const newRowArr = new Array(headers.length).fill('');
            newRowArr[0] = contents.day;
            newRowArr[matrixColIndex] = newStatus;
            dropdownSheet.appendRow(newRowArr);
          }
        } else {
          // Xử lý DẠNG DÒNG (Standard)
          let statusColIndex = 4; // Mặc định Cột D (1-based index)
          for (let c = 0; c < headers.length; c++) {
            const hLower = headers[c].toLowerCase();
            if (hLower.includes('trạng thái') || hLower.includes('trang thai') || hLower.includes('khóa') || hLower.includes('mô tả') || hLower.includes('status')) {
              statusColIndex = c + 1;
              break;
            }
          }

          let foundRow = -1;
          for (let i = 1; i < dropData.length; i++) {
            const dayVal = (dropData[i][0] || '').toString().trim().toLowerCase();
            const shiftVal = (dropData[i][1] || '').toString().trim().toLowerCase();

            const dayMatch = (dayVal === targetDay) || dayVal.includes(targetDay) || targetDay.includes(dayVal);
            const shiftMatch = (shiftVal === targetShift) || shiftVal.includes(targetShift) || targetShift.includes(shiftVal);

            if (dayMatch && shiftMatch) {
              foundRow = i + 1;
              break;
            }
          }

          if (foundRow > -1) {
            dropdownSheet.getRange(foundRow, statusColIndex).setValue(newStatus);
          } else {
            dropdownSheet.appendRow([contents.day, contents.shift, '', newStatus]);
          }
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `Đã cập nhật trạng thái ca học ${contents.day} (${contents.shift}) sang "${newStatus}".`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // C. Hành động Quản trị Mở / Khóa Tất cả 7 ngày & Ca học
    if (contents.action === 'toggleAllSlots') {
      const newStatus = contents.status || 'Hoạt động';
      const dropData = dropdownSheet.getDataRange().getValues();

      if (dropData && dropData.length > 1) {
        const headers = dropData[0].map(h => (h || '').toString().trim());
        let statusColIndex = 4;
        for (let c = 0; c < headers.length; c++) {
          const hLower = headers[c].toLowerCase();
          if (hLower.includes('trạng thái') || hLower.includes('trang thai') || hLower.includes('khóa') || hLower.includes('mô tả') || hLower.includes('status')) {
            statusColIndex = c + 1;
            break;
          }
        }

        for (let i = 1; i < dropData.length; i++) {
          for (let col = 1; col < headers.length; col++) {
            const hLower = headers[col].toLowerCase();
            if (hLower.includes('khung giờ') || hLower.includes('ca ')) {
              dropdownSheet.getRange(i + 1, col + 1).setValue(newStatus);
            }
          }
          dropdownSheet.getRange(i + 1, statusColIndex).setValue(newStatus);
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `Đã cập nhật trạng thái tất cả ca học sang "${newStatus}".`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // C. Xử lý Hành động Nút Xác nhận từ Nhân viên
    if (contents.action === 'confirm' || contents.action === 'confirmRegistration') {
      const regId = contents.registrationId;
      const data = sheet.getDataRange().getValues();
      let foundIndex = -1;

      for (let i = 1; i < data.length; i++) {
        const rowRegId = data[i][0] ? data[i][0].toString().trim() : '';
        if (rowRegId === regId || ('DK-' + i) === regId) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex > -1) {
        sheet.getRange(foundIndex, 11).setValue('Đã xác nhận');
        return ContentService
          .createTextOutput(JSON.stringify({
            status: 'success',
            message: 'Đã xác nhận đăng ký thành công cho mã ' + regId
          }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Không tìm thấy mã đăng ký ' + regId + ' trong Google Sheet!'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

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

