/**
 * GOOGLE APPS SCRIPT KẾT NỐI 2 CHIỀU CHO WEBSITE TEXAC CENTER SCHEDULE
 * Database ID: 1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA
 * Sheet Đăng ký: DangKyLichHoc
 * Sheet Khung giờ: quanlykhunggio
 */

const SPREADSHEET_ID = '1bv1twT1xlmRYWbEI3uzlEV-te5-pbtm5qIw7cqJa6HA';
const SHEET_REGISTRATIONS = 'DangKyLichHoc';
const SHEET_DROPDOWN = 'quanlykhunggio';
const MAX_SLOT_CAPACITY = 9;

// 0. Helper Xóa Dấu Tiếng Việt chuẩn xác
function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toString().trim();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 1. Helper lấy trang tính theo tên (Tìm kiếm 3 cấp độ siêu thông minh)
function getSheet(sheetName) {
  let ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    throw new Error("Không thể kết nối đến Google Spreadsheet ID: " + SPREADSHEET_ID);
  }

  // Cấp độ 1: Tìm đúng tên chính xác
  let sheet = ss.getSheetByName(sheetName);

  // Cấp độ 2: Tìm theo tên đã xóa dấu tiếng Việt & khoảng trắng
  if (!sheet) {
    const sheets = ss.getSheets();
    const targetNorm = removeVietnameseTones(sheetName);

    for (let i = 0; i < sheets.length; i++) {
      const sName = sheets[i].getName();
      const sNorm = removeVietnameseTones(sName);

      if (sNorm === targetNorm || 
          (sheetName === SHEET_DROPDOWN && (sNorm.includes('khunggio') || sNorm.includes('dropdown')))) {
        sheet = sheets[i];
        break;
      }
    }
  }

  // Cấp độ 3: Nếu là Sheet Ca học mà chưa tìm thấy, lấy ngay Sheet thứ 2 trong file Google Sheet
  if (!sheet && sheetName === SHEET_DROPDOWN && ss.getSheets().length >= 2) {
    sheet = ss.getSheets()[1];
  }

  // Cấp độ 4: Tự động khởi tạo nếu file trắng
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
        'Mã Đăng Ký', 'Họ và Tên', 'Số Điện Thoại / Zalo', 'Email', 
        'Loại Học Viên', 'Số Buổi / Tuần', 'Các Ca Học Đã Chọn', 
        'Mục Tiêu Học Tập', 'Ghi Chú', 'Thời Gian Đăng Ký', 'Trạng Thái'
      ]);
      sheet.getRange("1:1").setFontWeight("bold").setBackground("#4F46E5").setFontColor("#FFFFFF");
    } else if (sheetName === SHEET_DROPDOWN) {
      sheet.appendRow(['Thứ / Ngày', 'Tên Ca', 'Thời Gian', 'Mô Tả / Trạng Thái']);
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

// 2. CHIỀU ĐỌC DỮ LIỆU (GET)
function doGet(e) {
  try {
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

    const dropdownSheet = getSheet(SHEET_DROPDOWN);
    const dropdownData = dropdownSheet.getDataRange().getValues();
    const dropdownSlots = [];

    if (dropdownData && dropdownData.length > 1) {
      const headers = dropdownData[0].map(h => (h || '').toString().trim());
      const isMatrixFormat = headers.some((h, idx) => idx > 0 && (removeVietnameseTones(h).includes('khunggio') || removeVietnameseTones(h).includes('ca'))) &&
                             !removeVietnameseTones(headers[1]).includes('tenca');

      if (isMatrixFormat) {
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
        let statusColIndex = 3;
        headers.forEach((h, idx) => {
          const hNorm = removeVietnameseTones(h);
          if (hNorm.includes('trangthai') || hNorm.includes('khoa') || hNorm.includes('mota') || hNorm.includes('status')) {
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
        sheetUsed: dropdownSheet.getName(),
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

// 3. CHIỀU GHI DỮ LIỆU (POST)
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

    // A1. Thêm Khung giờ / Ca học mới vào sheet quanlykhunggio
    if (contents.action === 'addDropdownSlot') {
      const newDay = contents.day || 'Thứ 2';
      const newShift = contents.shift || 'Khung giờ mới';
      const newTime = contents.time || '';
      const newStatus = 'Hoạt động';

      dropdownSheet.appendRow([newDay, newShift, newTime, newStatus]);

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `Đã thêm thành công ca học "${newDay} (${newShift}${newTime ? ': ' + newTime : ''})" vào sheet "${dropdownSheet.getName()}"!`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // A2. Xóa Khung giờ / Ca học khỏi sheet quanlykhunggio
    if (contents.action === 'deleteDropdownSlot') {
      const targetDayNorm = removeVietnameseTones(contents.day);
      const targetShiftNorm = removeVietnameseTones(contents.shift);

      const dropData = dropdownSheet.getDataRange().getValues();

      for (let i = dropData.length - 1; i >= 1; i--) {
        const dayNorm = removeVietnameseTones(dropData[i][0]);
        const shiftNorm = removeVietnameseTones(dropData[i][1]);

        const dayMatch = (dayNorm === targetDayNorm) || dayNorm.includes(targetDayNorm) || targetDayNorm.includes(dayNorm);
        const shiftMatch = (shiftNorm === targetShiftNorm) || shiftNorm.includes(targetShiftNorm) || targetShiftNorm.includes(shiftNorm);

        if (dayMatch && shiftMatch) {
          dropdownSheet.deleteRow(i + 1);
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `Đã xóa thành công ca học "${contents.day} (${contents.shift})" khỏi sheet!`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // A3. Chỉnh sửa Khung giờ / Ca học trong sheet quanlykhunggio
    if (contents.action === 'editDropdownSlot') {
      const oldDayNorm = removeVietnameseTones(contents.oldDay || contents.day);
      const oldShiftNorm = removeVietnameseTones(contents.oldShift || contents.shift);

      const newDay = contents.newDay || contents.day;
      const newShift = contents.newShift || contents.shift;
      const newTime = contents.newTime !== undefined ? contents.newTime : (contents.time || '');
      const newStatus = contents.status || 'Hoạt động';

      const dropData = dropdownSheet.getDataRange().getValues();
      let updated = false;

      for (let i = 1; i < dropData.length; i++) {
        const dayNorm = removeVietnameseTones(dropData[i][0]);
        const shiftNorm = removeVietnameseTones(dropData[i][1]);

        const dayMatch = (dayNorm === oldDayNorm) || dayNorm.includes(oldDayNorm) || oldDayNorm.includes(dayNorm);
        const shiftMatch = (shiftNorm === oldShiftNorm) || shiftNorm.includes(oldShiftNorm) || oldShiftNorm.includes(shiftNorm);

        if (dayMatch && shiftMatch) {
          dropdownSheet.getRange(i + 1, 1).setValue(newDay);
          dropdownSheet.getRange(i + 1, 2).setValue(newShift);
          dropdownSheet.getRange(i + 1, 3).setValue(newTime);
          dropdownSheet.getRange(i + 1, 4).setValue(newStatus);
          updated = true;
          break;
        }
      }

      if (!updated) {
        dropdownSheet.appendRow([newDay, newShift, newTime, newStatus]);
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `Đã cập nhật ca học thành "${newDay} (${newShift})"!`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // B. Quản trị Mở / Khóa Đơn lẻ Ca học (Chuẩn hóa Tiếng Việt không dấu)
    if (contents.action === 'updateSlotStatus') {
      const targetDayNorm = removeVietnameseTones(contents.day);
      const targetShiftNorm = removeVietnameseTones(contents.shift);
      const newStatus = contents.status || 'Đã khóa';

      const dropData = dropdownSheet.getDataRange().getValues();

      if (dropData && dropData.length > 0) {
        const headers = dropData[0].map(h => (h || '').toString().trim());

        let matrixColIndex = -1;
        for (let c = 1; c < headers.length; c++) {
          const hNorm = removeVietnameseTones(headers[c]);
          if (hNorm === targetShiftNorm || hNorm.includes(targetShiftNorm) || targetShiftNorm.includes(hNorm)) {
            if (!hNorm.includes('tenca') && !hNorm.includes('thoigian') && !hNorm.includes('trangthai')) {
              matrixColIndex = c;
              break;
            }
          }
        }

        if (matrixColIndex > -1) {
          let foundRow = -1;
          for (let i = 1; i < dropData.length; i++) {
            const dayNorm = removeVietnameseTones(dropData[i][0]);
            if (dayNorm === targetDayNorm || dayNorm.includes(targetDayNorm) || targetDayNorm.includes(dayNorm)) {
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
          let statusColIndex = 4;
          for (let c = 0; c < headers.length; c++) {
            const hNorm = removeVietnameseTones(headers[c]);
            if (hNorm.includes('trangthai') || hNorm.includes('khoa') || hNorm.includes('mota') || hNorm.includes('status')) {
              statusColIndex = c + 1;
              break;
            }
          }

          let foundRow = -1;
          for (let i = 1; i < dropData.length; i++) {
            const dayNorm = removeVietnameseTones(dropData[i][0]);
            const shiftNorm = removeVietnameseTones(dropData[i][1]);

            const dayMatch = (dayNorm === targetDayNorm) || dayNorm.includes(targetDayNorm) || targetDayNorm.includes(dayNorm);
            const shiftMatch = (shiftNorm === targetShiftNorm) || shiftNorm.includes(targetShiftNorm) || targetShiftNorm.includes(shiftNorm);

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
          message: `Đã cập nhật trạng thái ca học ${contents.day} (${contents.shift}) sang "${newStatus}" trên sheet "${dropdownSheet.getName()}".`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // C. Quản trị Mở / Khóa Tất cả 7 ngày & Ca học
    if (contents.action === 'toggleAllSlots') {
      const newStatus = contents.status || 'Hoạt động';
      const dropData = dropdownSheet.getDataRange().getValues();

      if (dropData && dropData.length > 1) {
        const headers = dropData[0].map(h => (h || '').toString().trim());
        let statusColIndex = 4;
        for (let c = 0; c < headers.length; c++) {
          const hNorm = removeVietnameseTones(headers[c]);
          if (hNorm.includes('trangthai') || hNorm.includes('khoa') || hNorm.includes('mota') || hNorm.includes('status')) {
            statusColIndex = c + 1;
            break;
          }
        }

        for (let i = 1; i < dropData.length; i++) {
          for (let col = 1; col < headers.length; col++) {
            const hNorm = removeVietnameseTones(headers[col]);
            if (hNorm.includes('khunggio') || hNorm.includes('ca')) {
              dropdownSheet.getRange(i + 1, col + 1).setValue(newStatus);
            }
          }
          dropdownSheet.getRange(i + 1, statusColIndex).setValue(newStatus);
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: `Đã cập nhật trạng thái tất cả ca học sang "${newStatus}" trên sheet "${dropdownSheet.getName()}".`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // D. Nút Xác nhận từ Nhân viên
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

    // E1. Nút Xóa Học viên từ Nhân viên (Xóa dòng khỏi sheet DangKyLichHoc)
    if (contents.action === 'deleteRegistration' || contents.action === 'deleteStudent') {
      const regId = (contents.registrationId || contents.id || '').toString().trim();
      const targetNameNorm = removeVietnameseTones(contents.fullName || contents.name);

      const data = sheet.getDataRange().getValues();
      let foundIndex = -1;

      for (let i = 1; i < data.length; i++) {
        const rowRegId = data[i][0] ? data[i][0].toString().trim() : '';
        const nameNorm = removeVietnameseTones(data[i][1]);

        if ((regId && (rowRegId === regId || ('DK-' + i) === regId)) ||
            (targetNameNorm && (nameNorm === targetNameNorm || nameNorm.includes(targetNameNorm)))) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex > -1) {
        sheet.deleteRow(foundIndex);
        return ContentService
          .createTextOutput(JSON.stringify({
            status: 'success',
            message: 'Đã xóa thành công đơn đăng ký khỏi Google Sheet!'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Không tìm thấy đơn đăng ký để xóa trong Google Sheet!'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // E. Đăng ký Học viên Mới
    const requestedSlots = Array.isArray(contents.selectedSlots)
      ? contents.selectedSlots
      : (contents.selectedSlots ? [contents.selectedSlots] : []);

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
  } finally {
    lock.releaseLock();
  }
}
