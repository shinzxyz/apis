// File: api/downloader/spotify2.js

const axios = require('axios');
const fetch = require('node-fetch');

module.exports = {
  name: 'Spotify v2',
  desc: 'Download lagu Spotify via metode alternatif (spotify-down.com)',
  category: 'Downloader',
  params: ['url'],
  async run(req, res) {
    const { url } = req.query;

    if (!url || !/https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(url)) {
      return res.status(400).json({
        status: false,
        error: 'Parameter url harus berisi link Spotify track yang valid.'
      });
    }

    try {
      const encodeBase64 = (trackUrl, trackName, artistName) => {
        const raw = `__/:${trackUrl}:${trackName}:${artistName}`;
        return Buffer.from(raw).toString('base64');
      };

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://spotify-down.com/',
        'Content-Type': 'application/json'
      };

      // Step 1: Get metadata
      const metaRes = await axios.post('https://spotify-down.com/api/metadata', null, {
        params: { link: url },
        headers
      });

      const meta = metaRes?.data?.data;
      if (!meta?.link || !meta?.title || !meta?.artists) {
        return res.status(500).json({
          status: false,
          error: 'Gagal mendapatkan metadata dari Spotify.'
        });
      }

      // Step 2: Generate token
      const encoded = encodeBase64(meta.link, meta.title, meta.artists);

      // Step 3: Get download link
      const dlRes = await axios.get('https://spotify-down.com/api/download', {
        params: {
          link: meta.link,
          n: meta.title,
          a: meta.artists,
          t: encoded
        },
        headers
      });

      const downloadUrl = dlRes?.data?.data?.link;
      if (!downloadUrl) {
        return res.status(500).json({
          status: false,
          error: 'Gagal mendapatkan link download dari server.'
        });
      }

      // Step 4: Download audio buffer
      const audioBuffer = await fetch(downloadUrl).then(r => r.buffer());

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${meta.title} - ${meta.artists}.mp3"`);
      return res.end(audioBuffer);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        error: err.message || 'Terjadi kesalahan server.'
      });
    }
  }
};