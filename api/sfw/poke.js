const axios = require('axios');

module.exports = {
    name: 'Poke',
    desc: 'Random poke image from waifu.pics',
    category: 'SFW',
    async run(req, res) {
        try {
            const { data } = await axios.get('https://api.waifu.pics/sfw/poke');
            if (!data?.url) return res.status(500).json({ status: false, error: 'No image found' });

            res.status(200).json({
                status: true,
                url: data.url
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    }
}