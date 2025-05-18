const axios = require('axios');

module.exports = {
  name: 'Smeme',
  desc: 'Generate meme dari gambar dengan teks atas & bawah',
  category: 'Tools',
  params: ['url', 'atas', 'bawah'],
  async run(req, res) {
    const { url, atas, bawah } = req.query;

    if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi!' });

    try {
      const ext = /\.(mp4|mov|webm)$/i.test(url) ? 'webp' : 'jpg';
      const memeUrl = `https://api.memegen.link/images/custom/${encodeURIComponent(atas || '-')}/${encodeURIComponent(bawah || '-')}.${ext}?background=${encodeURIComponent(url)}`;
      
      const response = await axios.get(memeUrl, { responseType: 'arraybuffer' });

      res.setHeader('Content-Type', response.headers['content-type']);
      res.setHeader('Content-Disposition', 'inline; filename=smeme.' + ext);
      res.end(response.data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, error: err.message });
    }
  }
};