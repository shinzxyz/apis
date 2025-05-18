// File: api/downloader/spotify2.js

const axios = require('axios');
const fetch = require('node-fetch');

module.exports = {
  name: 'Spotify v2',
  category: 'Downloader',
  desc: 'Download lagu dari Spotify dengan metode alternatif.',
  params: ['url'],
  async run({ query }, res) {
    try {
      if (!query || typeof query !== 'string' || !query.includes('spotify.com')) {
        return res.status(400).json({
          status: false,
          statusCode: 400,
          creator: 'yudz',
          message: 'Masukkan URL Spotify yang valid.'
        });
      }

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
        params: { link: query },
        headers
      });

      const meta = metaRes?.data?.data;
      if (!meta?.link || !meta?.title || !meta?.artists) {
        return res.status(500).json({
          status: false,
          statusCode: 500,
          creator: 'yudz',
          message: 'Gagal mendapatkan metadata dari Spotify.'
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
          statusCode: 500,
          creator: 'yudz',
          message: 'Gagal mendapatkan link download.'
        });
      }

      // Step 4: Fetch audio buffer
      const audioBuffer = await fetch(downloadUrl).then(r => r.buffer());

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${meta.title} - ${meta.artists}.mp3"`
      );
      res.send(audioBuffer);

    } catch (err) {
      res.status(500).json({
        status: false,
        statusCode: 500,
        creator: 'yudz',
        message: err.message || 'Terjadi kesalahan pada server.'
      });
    }
  }
};