const axios = require('axios');
const FormData = require('form-data');
const streamifier = require('streamifier');
const Scan = require('../models/Scan');
const cloudinary = require('../config/cloudinary');

const AI_URL = () =>
  `${process.env.AI_BASE_URL}${process.env.AI_PREDICT_ENDPOINT}`;

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getRangeStart(range) {
  const now = new Date();
  const start = new Date(now);

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return start;
    case '3d':
      start.setDate(start.getDate() - 3);
      return start;
    case '15d':
      start.setDate(start.getDate() - 15);
      return start;
    case '7d':
    default:
      start.setDate(start.getDate() - 7);
      return start;
  }
}

// Upload buffer → Cloudinary
function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'freshscan',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// AI call (FastAPI multipart)
async function sendBufferToAI(file) {
  const form = new FormData();

  form.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  const response = await axios.post(AI_URL(), form, {
    headers: {
      ...form.getHeaders(),
    },
    timeout: 60000,
  });

  return response.data;
}

// Extract prediction safely
function extractPrediction(aiData) {
  if (!aiData) return { fruit: 'Unknown', quality: 'Unknown' };

  if (aiData.fruit || aiData.quality) {
    return {
      fruit: aiData.fruit || 'Unknown',
      quality: aiData.quality || 'Unknown',
    };
  }

  if (aiData.data && aiData.data[0]) {
    const result = aiData.data[0];
    return {
      fruit: result.fruit || 'Unknown',
      quality: result.quality || 'Unknown',
    };
  }

  return { fruit: 'Unknown', quality: 'Unknown' };
}

// ─────────────────────────────────────────────────────────
// POST /api/scans/predict
// ─────────────────────────────────────────────────────────

exports.predict = async (req, res) => {
  let uploadedImage = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // 1️⃣ AI
    let aiData;
    try {
      aiData = await sendBufferToAI(req.file);
      console.log('AI RESPONSE:', aiData);
    } catch (aiErr) {
      console.error('AI ERROR:', JSON.stringify(aiErr.response?.data, null, 2));
      return res.status(502).json({
        message: 'Could not reach AI model',
        error: aiErr.response?.data || aiErr.message,
      });
    }

    const { fruit, quality } = extractPrediction(aiData);
    const isFresh = quality?.toLowerCase() === 'fresh';

    // 2️⃣ Cloudinary
    try {
      uploadedImage = await uploadBufferToCloudinary(req.file.buffer);
    } catch (err) {
      return res.status(502).json({
        message: 'Cloudinary upload failed',
        error: err.message,
      });
    }

    // 3️⃣ Mongo
    let scan;
    try {
      scan = await Scan.create({
        vendor: req.vendor._id,
        vendorId: req.vendor.vendorId,
        fruit,
        quality,
        isFresh,
        imageOriginalName: req.file.originalname,
        imagePath: uploadedImage.secure_url,
        cloudinaryPublicId: uploadedImage.public_id,
      });
    } catch (err) {
      if (uploadedImage?.public_id) {
        await cloudinary.uploader.destroy(uploadedImage.public_id);
      }
      return res.status(500).json({ message: err.message });
    }

    return res.status(201).json({ message: 'Scan successful', scan });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/scans
// ─────────────────────────────────────────────────────────

exports.getScans = async (req, res) => {
  try {
    const scans = await Scan.find({ vendor: req.vendor._id })
      .sort({ createdAt: -1 });

    res.json({ scans });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// 🔥 FIXED STATS (THIS FIXES YOUR DASHBOARD)
// ─────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const range = req.query.range || '7d';
    const startDate = getRangeStart(range);

    const matchStage = {
      vendor: vendorId,
      createdAt: { $gte: startDate },
    };

    const [totals, dailyTrend, byFruit, rottenTrend] = await Promise.all([

      // totals
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            fresh: { $sum: { $cond: ['$isFresh', 1, 0] } },
            rotten: { $sum: { $cond: ['$isFresh', 0, 1] } },
          },
        },
      ]),

      // daily trend
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            count: { $sum: 1 },
            fresh: { $sum: { $cond: ['$isFresh', 1, 0] } },
            rotten: { $sum: { $cond: ['$isFresh', 0, 1] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // by fruit
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$fruit',
            count: { $sum: 1 },
            fresh: { $sum: { $cond: ['$isFresh', 1, 0] } },
            rotten: { $sum: { $cond: ['$isFresh', 0, 1] } },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // rotten trend
      Scan.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
              fruit: '$fruit',
            },
            total: { $sum: 1 },
            rotten: { $sum: { $cond: ['$isFresh', 0, 1] } },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            fruit: '$_id.fruit',
            rottenRate: {
              $round: [
                {
                  $multiply: [
                    {
                      $cond: [
                        { $eq: ['$total', 0] },
                        0,
                        { $divide: ['$rotten', '$total'] },
                      ],
                    },
                    100,
                  ],
                },
                1,
              ],
            },
          },
        },
        { $sort: { date: 1 } },
      ]),
    ]);

    const t = totals[0] || { total: 0, fresh: 0, rotten: 0 };

    const freshRate = t.total > 0 ? Math.round((t.fresh / t.total) * 100) : 0;
    const rottenRate = t.total > 0 ? Math.round((t.rotten / t.total) * 100) : 0;

    res.json({
      total: t.total,
      fresh: t.fresh,
      rotten: t.rotten,
      freshRate,
      rottenRate,
      dailyTrend,
      byFruit,
      rottenTrend,
    });

  } catch (err) {
    console.error('STATS ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────

exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({
      _id: req.params.id,
      vendor: req.vendor._id,
    });

    if (!scan) return res.status(404).json({ message: 'Not found' });

    if (scan.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(scan.cloudinaryPublicId);
    }

    res.json({ message: 'Deleted' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};