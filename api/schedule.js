// Vercel Serverless Function: Fetch Registered Schedules from Google Sheet via process.env.GOOGLE_SCRIPT_URL
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const scriptUrl = (process.env.GOOGLE_SCRIPT_URL || '').trim();

    if (!scriptUrl) {
      return res.status(500).json({
        status: 'error',
        message: 'Chưa cấu hình biến môi trường GOOGLE_SCRIPT_URL trên Vercel.'
      });
    }

    const response = await fetch(scriptUrl, { 
      redirect: 'follow',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    const textResult = await response.text();

    if (textResult.trim().startsWith('<')) {
      return res.status(200).json({
        status: 'error',
        message: 'Google Apps Script trả về HTML thay vì JSON. Nguyên nhân: Bản triển khai Web App chưa chọn "Who has access: Anyone" (Ai có quyền truy cập: Bất kỳ ai).'
      });
    }

    let data;
    try {
      data = JSON.parse(textResult);
    } catch (e) {
      data = { status: 'error', message: 'Dữ liệu trả về không đúng định dạng JSON.' };
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Schedule API error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi kết nối Google Sheet.' });
  }
};
