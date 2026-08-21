// Vercel Serverless Function: Fetch Registered Schedules from Google Sheet
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
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL || req.query.scriptUrl;

    if (scriptUrl && scriptUrl.startsWith('http')) {
      const response = await fetch(scriptUrl, { redirect: 'follow' });
      const textResult = await response.text();
      let data;
      try {
        data = JSON.parse(textResult);
      } catch (e) {
        data = { status: 'error', message: 'Dữ liệu trả về không đúng định dạng JSON' };
      }
      return res.status(200).json(data);
    } else {
      return res.status(200).json({
        status: 'warning',
        needConfig: true,
        data: []
      });
    }
  } catch (error) {
    console.error('Schedule API error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Lỗi kết nối Google Sheet.' });
  }
};
