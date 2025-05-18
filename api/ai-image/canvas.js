const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

async function processImageWithGemini(buffer, mime, prompt) {
  const apiKeys = [
    "AIzaSyDnBPd_EhBfr73NssnThVQZYiKZVhGZewU", "AIzaSyA94OZD-0V4quRbzPb2j75AuzSblPHE75M",
    "AIzaSyB5aTYbUg2VQ0oXr5hdJPN8AyLJcmM84-A", "AIzaSyB1xYZ2YImnBdi2Bh-If_8lj6rvSkabqlA",
    "AIzaSyB9DzI2olokERvU_oH0ASSO2OKRahleC7U", "AIzaSyDsyj9oOFJK_-bWQFLIR4yY4gpLvq43jd4",
    "AIzaSyDpqC3y2ZZNlU9O93do36_uijl1HIJ-XKw", "AIzaSyCwO0UWohpAKGu32A0YYJaxpbj5lVInjss"
  ];
  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
  const genAI = new GoogleGenerativeAI(apiKey);

  const base64Image = buffer.toString("base64");
  const contents = [
    { text: prompt },
    { inlineData: { mimeType: mime, data: base64Image } }
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: { responseModalities: ["Text", "Image"] }
  });

  const response = await model.generateContent(contents);
  const part = response.response.candidates[0].content.parts.find(p => p.inlineData);
  if (!part) throw new Error("Gagal mendapatkan gambar hasil.");

  return Buffer.from(part.inlineData.data, "base64");
}

module.exports = {
  name: 'Gemini Canvas',
  desc: 'Edit gambar dengan AI (prompt manual)',
  category: 'AI Image',
  params: ['url', 'prompt'],
  async run(req, res) {
    const { url, prompt } = req.query;
    if (!url || !prompt) return res.status(400).json({ status: false, error: 'Parameter url dan prompt wajib diisi!' });

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const mime = response.headers['content-type'];

      const result = await processImageWithGemini(buffer, mime, prompt);
      res.setHeader('Content-Type', mime || 'image/png');
      res.end(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, error: err.message });
    }
  }
};