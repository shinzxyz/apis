// File: api/downloader/spotify2.js

const axios = require('axios');
const fetch = require('node-fetch');

module.exports = {
  name: 'Spotify v2',
  category: 'Downloader',
  desc: 'Download lagu dari Spotify dengan metode alternatif.',
  params: ['url'],
  async run({ query }, res) {
    const spotifydown = async (url) => {
      if (!/open\.spotify\.com/.test(url)) throw new Error('Input URL dari Spotify!');

      const encodeBase64 = (trackUrl, trackName, artistName) => {
        const raw = `__/:${trackUrl}:${trackName}:${artistName}`;
        return Buffer.from(raw).toString('base64');
      };

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://spotify-down.com/',
      };

      const metaRes = await axios.post('https://spotify-down.com/api/metadata', null, {
        params: { link: url },
        headers,
      });

      const meta = metaRes?.data?.data;
      if (!meta?.link) throw new Error('Gagal mendapatkan metadata.');

      const encoded = encodeBase64(meta.link, meta.title, meta.artists);

      const dlRes = await axios.get('https://spotify-down.com/api/download', {
        params: {
          link: meta.link,
          n: meta.title,
          a: meta.artists,
          t: encoded,
        },
        headers,
      });

      return {
        metadata: meta,
        download: dlRes?.data?.data?.link,
      };
    };

    try {
      if (!query) return res.status(400).json({ status: false, message: 'Masukkan URL Spotify.' });

      const result = await spotifydown(query);
      if (!result.download) return res.status(500).json({ status: false, message: 'Gagal mendapatkan link download.' });

      const audioBuffer = await fetch(result.download).then(r => r.buffer());

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${result.metadata.title || 'spotify'} - ${result.metadata.artists || 'track'}.mp3"`);
      res.send(audioBuffer);

    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  }
};