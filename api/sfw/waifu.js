const axios = require('axios');
const path = require('path');

module.exports = {
    name: 'waifu',
    desc: 'Random waifu from waifu.pics',
    category: 'SFW',
    async run(req, res) {
        try {
            // Ambil URL media
            const { data } = await axios.get('https://api.waifu.pics/sfw/waifu');
            const fileUrl = data?.url;
            if (!fileUrl) return res.status(500).json({ status: false, error: 'No media found' });

            // Ambil ekstensi file
            const ext = path.extname(fileUrl).toLowerCase();

            // Ambil buffer media
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });

            // Set header berdasarkan tipe file
            const contentType = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.mp4': 'video/mp4'
            }[ext] || 'application/octet-stream';

            res.setHeader('Content-Type', contentType);
            res.send(response.data);
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    }
}