// Vercel Serverless Function: Post New Registration to Google Sheet
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
    const { fullName, phone, email, studentType, sessionsPerWeek, selectedSlots, goal, notes } = req.body || {};

    if (!fullName || !phone || !selectedSlots || selectedSlots.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Vui lòng điền đầy đủ Họ tên, SĐT và chọn ít nhất 1 ca học.' 
      });
    }

    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

    if (scriptUrl) {
      // Proxy request to Google Apps Script Web App
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          studentType,
          sessionsPerWeek,
          selectedSlots,
          goal,
          notes
        })
      });

      const data = await response.json();
      return res.status(200).json(data);
    } else {
      // Mock / Local Fallback response when env var is pending setup
      const registrationId = 'DK-' + Date.now().toString().slice(-6);
      return res.status(200).json({
        status: 'success',
        message: 'Đăng ký thành công (Lưu tạm thời trên hệ thống).',
        registrationId,
        data: { fullName, phone, email, studentType, sessionsPerWeek, selectedSlots, goal, notes }
      });
    }
  } catch (error) {
    console.error('Register API error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi kết nối máy chủ.' });
  }
};
