const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'TotalFitur',
  desc: 'Menampilkan total semua fitur dari semua kategori',
  category: 'User',
  async run(req, res) {
    try {
      const baseDir = path.join(__dirname); // folder saat ini (misalnya: /api)
      const subdomains = fs.readdirSync(baseDir).filter(file => {
        const fullPath = path.join(baseDir, file);
        return fs.statSync(fullPath).isDirectory();
      });

      let total = 0;
      const detail = {};

      for (const sub of subdomains) {
        const subDir = path.join(baseDir, sub);
        const categories = fs.readdirSync(subDir).filter(f => fs.statSync(path.join(subDir, f)).isDirectory());

        for (const cat of categories) {
          const catDir = path.join(subDir, cat);
          const files = fs.readdirSync(catDir).filter(f => f.endsWith('.js'));
          total += files.length;
          const key = `${sub}/${cat}`;
          detail[key] = files.length;
        }
      }

      res.json({
        status: true,
        total,
        perKategori: detail
      });

    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  }
};