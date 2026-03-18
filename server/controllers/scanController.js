const axios = require('axios');
const FormData = require('form-data');
const Scan = require('../models/Scan');

const AI_URL = () => `${process.env.AI_BASE_URL}${process.env.AI_PREDICT_ENDPOINT}`;

// POST /api/scans/predict  — upload image → AI → save → return result
exports.predict = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    // ── Forward image to AI model ─────────────────────
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename:    req.file.originalname || 'image.jpg',
      contentType: req.file.mimetype,
    });

    let aiData;
    try {
      const aiRes = await axios.post(AI_URL(), form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });
      aiData = aiRes.data;
    } catch (aiErr) {
      const status = aiErr.response?.status;
      if (status === 400) return res.status(400).json({ message: 'Invalid image file' });
      if (status === 503) return res.status(503).json({ message: 'AI model is offline' });
      return res.status(502).json({ message: 'Could not reach AI model' });
    }

    // ── Normalise AI response ─────────────────────────
    const fruit   = aiData.fruit   || 'Unknown';
    const quality = aiData.quality || 'Unknown';
    const isFresh = quality.toLowerCase() === 'fresh';

    // ── Persist to MongoDB ────────────────────────────
    const scan = await Scan.create({
      vendor:            req.vendor._id,
      vendorId:          req.vendor.vendorId,
      fruit,
      quality,
      isFresh,
      imageOriginalName: req.file.originalname,
    });

    res.status(201).json({ scan });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/scans  — paginated scan history for current vendor
exports.getScans = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      Scan.find({ vendor: req.vendor._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      Scan.countDocuments({ vendor: req.vendor._id }),
    ]);

    res.json({ scans, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/scans/stats  — dashboard stats for current vendor
exports.getStats = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const [totals, recentScans, byFruit] = await Promise.all([
      // Aggregate totals
      Scan.aggregate([
        { $match: { vendor: vendorId } },
        {
          $group: {
            _id: null,
            total:   { $sum: 1 },
            fresh:   { $sum: { $cond: ['$isFresh', 1, 0] } },
            rotten:  { $sum: { $cond: ['$isFresh', 0, 1] } },
          },
        },
      ]),

      // Last 7 days daily scan counts
      Scan.aggregate([
        {
          $match: {
            vendor: vendorId,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count:  { $sum: 1 },
            fresh:  { $sum: { $cond: ['$isFresh', 1, 0] } },
            rotten: { $sum: { $cond: ['$isFresh', 0, 1] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

   // By fruit
      Scan.aggregate([
        { $match: { vendor: vendorId } },
        {
          $group: {
            _id:    '$fruit',
            count:  { $sum: 1 },
            fresh:  { $sum: { $cond: ['$isFresh', 1, 0] } },
            rotten: { $sum: { $cond: ['$isFresh', 0, 1] } },
          }
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);


    const t = totals[0] || { total: 0, fresh: 0, rotten: 0 };
    const freshRate = t.total > 0 ? Math.round((t.fresh / t.total) * 100) : 0;

    res.json({
      total:      t.total,
      fresh:      t.fresh,
      rotten:     t.rotten,
      freshRate,
      dailyTrend: recentScans,
      byFruit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/scans/:id
exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({ _id: req.params.id, vendor: req.vendor._id });
    if (!scan) return res.status(404).json({ message: 'Scan not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
