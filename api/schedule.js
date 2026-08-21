// Vercel Serverless Function: Fetch Registered Schedules & Status from Google Sheet
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

    if (scriptUrl) {
      const response = await fetch(scriptUrl);
      const data = await response.json();
      return res.status(200).json(data);
    } else {
      // Mock data fallback if Google Apps Script URL is not set yet
      return res.status(200).json({
        status: 'success',
        isMock: true,
        data: [
          {
            "Mã Đăng Ký": "DK-892101",
            "Họ và Tên": "Nguyễn Văn An",
            "Số Điện Thoại / Zalo": "0987654321",
            "Email": "nguyenvanan@gmail.com",
            "Loại Học Viên": "Cấp tốc",
            "Số Buổi / Tuần": "5 buổi/tuần",
            "Các Ca Học Đã Chọn": "Thứ 2 (Ca Tối: 18h30-20h30), Thứ 3 (Ca Tối: 18h30-20h30), Thứ 4 (Ca Tối: 18h30-20h30), Thứ 5 (Ca Tối: 18h30-20h30), Thứ 6 (Ca Tối: 18h30-20h30)",
            "Mục Tiêu Học Tập": "Luyện thi Cấp tốc 1 tháng",
            "Ghi Chú": "Muốn học giảng viên kinh nghiệm",
            "Thời Gian Đăng Ký": "21/08/2026 14:30:00",
            "Trạng Thái": "Đã xác nhận"
          },
          {
            "Mã Đăng Ký": "DK-892102",
            "Họ và Tên": "Trần Thị Mai",
            "Số Điện Thoại / Zalo": "0912345678",
            "Email": "tranmai@gmail.com",
            "Loại Học Viên": "Dài hạn",
            "Số Buổi / Tuần": "3 buổi/tuần",
            "Các Ca Học Đã Chọn": "Thứ 2 (Ca Chiều: 14h00-16h00), Thứ 4 (Ca Chiều: 14h00-16h00), Thứ 6 (Ca Chiều: 14h00-16h00)",
            "Mục Tiêu Học Tập": "Tích lũy kiến thức cơ bản đến nâng cao",
            "Ghi Chú": "Học ca chiều",
            "Thời Gian Đăng Ký": "21/08/2026 15:10:00",
            "Trạng Thái": "Chờ xác nhận"
          }
        ]
      });
    }
  } catch (error) {
    console.error('Schedule API error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi kết nối Google Sheet.' });
  }
};
