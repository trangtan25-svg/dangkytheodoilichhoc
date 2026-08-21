// Vercel Serverless Function: Post New Registration to Google Sheet
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
    const bodyData = req.body || {};
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL || bodyData.scriptUrl;

    if (scriptUrl && scriptUrl.startsWith('http')) {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyData),
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
    } else {
      // Return notice asking for Script URL
      const registrationId = 'DK-' + Date.now().toString().slice(-6);
      return res.status(200).json({
        status: 'warning',
        needConfig: true,
        message: 'Chưa cấu hình GOOGLE_SCRIPT_URL trên Vercel. Dữ liệu tạm thời lưu tại trình duyệt.',
        registrationId,
        data: bodyData
      });
    }
  } catch (error) {
    console.error('Register API error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi kết nối máy chủ.' });
  }
};
