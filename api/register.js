// Vercel Serverless Function: Post New Registration to Google Sheet via process.env.GOOGLE_SCRIPT_URL
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

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const scriptUrl = (process.env.GOOGLE_SCRIPT_URL || '').trim();

    if (!scriptUrl) {
      return res.status(500).json({
        status: 'error',
        message: 'Chưa cấu hình biến môi trường GOOGLE_SCRIPT_URL trên Vercel. Vui lòng vào Vercel Settings -> Environment Variables để cài đặt.'
      });
    }

    const body = req.body || {};

    // 1. Trường hợp các Hành động Quản trị & Xác nhận từ nhân viên
    if (body.action) {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow'
      });

      const textResult = await response.text();
      let data;
      try { data = JSON.parse(textResult); } catch (e) { data = { status: 'success', raw: textResult }; }
      return res.status(200).json(data);
    }

    // 2. Trường hợp Học viên đăng ký mới
    const { fullName, phone, email, studentType, sessionsPerWeek, selectedSlots, goal, notes } = body;

    if (!fullName || !phone || !selectedSlots || selectedSlots.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Vui lòng điền đầy đủ Họ tên, SĐT và chọn ít nhất 1 ca học.' 
      });
    }

    // Forward registration payload to Code.gs Web App
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        fullName,
        phone,
        email,
        studentType,
        sessionsPerWeek,
        selectedSlots,
        goal,
        notes
      }),
      redirect: 'follow'
    });

    const textResult = await response.text();
    let data;
    try {
      data = JSON.parse(textResult);
    } catch (e) {
      data = { status: 'success', raw: textResult };
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Register API error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi kết nối máy chủ.' });
  }
};
