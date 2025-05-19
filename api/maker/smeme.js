const axios = require('axios');

module.exports = {
  name: 'Smeme',
  desc: 'Generate meme dari gambar',
  category: 'Maker',
  params: ['url', 'atas', 'bawah'],
  async run(req, res) {
    const { url, atas, bawah } = req.query;
    if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi!' });

    try {
      // Paksa output selalu jpg karena .webp sering ditolak
      const memeUrl = `https://api.memegen.link/images/custom/${encodeURIComponent(atas || '-')}/${encodeURIComponent(bawah || '-')}.jpg?background=${encodeURIComponent(url)}`;

      const result = await axios.get(memeUrl, { responseType: 'arraybuffer' });

      res.setHeader('Content-Type', result.headers['content-type'] || 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline; filename=smeme.jpg');
      res.end(result.data);
    } catch (err) {
      console.error('Memegen error:', err.response?.data || err.message);
      return res.status(500).json({
        status: false,
        error: err.response?.data?.message || err.message
      });
    }
  }
};