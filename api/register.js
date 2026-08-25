// Vercel Serverless Function: Post New Registration & Admin Actions to Google Sheet via process.env.GOOGLE_SCRIPT_URL
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

    // Gửi yêu cầu POST sang Google Apps Script Web App
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    });

    const textResult = await response.text();

    // Kiểm tra lỗi 401 / 403 / 404 hoặc HTML login redirect từ Google
    if (response.status === 401 || response.status === 403 || textResult.trim().startsWith('<')) {
      return res.status(200).json({
        status: 'error',
        message: 'Google Apps Script từ chối kết nối (Mã 401/403). NGUYÊN NHÂN: Khi Triển khai (Deploy) Web App trong Google Sheet, mục "Ai có quyền truy cập" (Who has access) PHẢI CHỌN LÀ "Bất kỳ ai" (Anyone).'
      });
    }

    if (response.status === 404) {
      return res.status(200).json({
        status: 'error',
        message: 'Không tìm thấy Google Web App (Mã 404). Vui lòng kiểm tra lại URL biến GOOGLE_SCRIPT_URL trên Vercel.'
      });
    }

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
