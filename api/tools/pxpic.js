const axios = require('axios')
const qs = require('qs')
const { fromBuffer } = require('file-type')

const tools = ['removebg', 'enhance', 'upscale', 'restore', 'colorize']

const pxpic = {
  upload: async (buffer) => {
    const { ext, mime } = (await fromBuffer(buffer)) || {}
    const fileName = `${Date.now()}.${ext}`

    const folder = 'uploads'
    const response = await axios.post(
      'https://pxpic.com/getSignedUrl',
      { folder, fileName },
      { headers: { 'Content-Type': 'application/json' } }
    )

    const { presignedUrl } = response.data

    await axios.put(presignedUrl, buffer, { headers: { 'Content-Type': mime } })

    const cdnDomain = 'https://files.fotoenhancer.com/uploads/'
    const sourceFileUrl = `${cdnDomain}${fileName}`

    return sourceFileUrl
  },

  create: async (buffer, tool) => {
    if (!tools.includes(tool)) {
      return { error: `Pilih salah satu dari tools ini: ${tools.join(', ')}` }
    }

    const url = await pxpic.upload(buffer)
    const data = qs.stringify({
      imageUrl: url,
      targetFormat: 'png',
      needCompress: 'no',
      imageQuality: '100',
      compressLevel: '6',
      fileOriginalExtension: 'png',
      aiFunction: tool,
      upscalingLevel: '',
    })

    const config = {
      method: 'POST',
      url: 'https://pxpic.com/callAiFunction',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }

    const apiResponse = await axios.request(config)
    return apiResponse.data
  },
}

module.exports = {
  name: 'Pxpic',
  desc: 'AI Image Enhancer: removebg, upscale, restore, dll',
  category: 'Tools',
  params: ['tools', 'url'],
  run: async (req, res) => {
    const { tools: tool, url } = req.query
    if (!tool || !url) return res.status(400).json({ status: false, message: 'Parameter tools dan url wajib diisi' })

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response.data)

      const result = await pxpic.create(buffer, tool)
      return res.json({ status: true, result })
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message || e.toString() })
    }
  },
}