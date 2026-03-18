const axios = require('axios');
const FormData = require('form-data');
const Scan = require('../models/Scan');

const AI_URL = () => `${process.env.AI_BASE_URL}${process.env.AI_PREDICT_ENDPOINT}`;

exports.predict = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname || 'image.jpg', contentType: req.file.mimetype });
    let aiData;
    try {
      const aiRes = await axios.post(AI_URL(), form, { headers: form.getHeaders(), timeout: 30000 });
      aiData = aiRes.data;
    } catch (aiErr) {
      const status = aiErr.response?.status;
      if (status === 400) return res.status(400).json({ message: 'Invalid image file' });
      if (status === 503) return res.status(503).json({ message: 'AI model is offline' });
      return res.status(502).json({ message: 'Could not reach AI model' });
    }
    const fruit = aiData.fruit || 'Unknown';
    const quality = aiData.quality || 'Unknown';
    const isFresh = quality.toLowerCase() === 'fresh';
    const todayStr = new Date().toISOString().split('T')[0];
    const distinctDays = await Scan.distinct('batchDate', { vendor: req.vendor._id });
    let batchNumber = distinctDays.length;
    if (!distinctDays.includes(todayStr)) batchNumber += 1;
    const scan = await Scan.create({ vendor: req.vendor._id, vendorId: req.vendor.vendorId, fruit, quality, isFresh, imageOriginalName: req.file.originalname, batchDate: todayStr, batchNumber });
    res.status(201).json({ scan });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getScans = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const filter = { vendor: req.vendor._id };
    if (req.query.date) filter.batchDate = req.query.date;
    if (req.query.batch) filter.batchNumber = parseInt(req.query.batch);
    const [scans, total] = await Promise.all([
      Scan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Scan.countDocuments(filter),
    ]);
    res.json({ scans, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const [totals, byFruit, batches] = await Promise.all([
      Scan.aggregate([{ $match: { vendor: vendorId } }, { $group: { _id: null, total: { $sum: 1 }, fresh: { $sum: { $cond: ['$isFresh', 1, 0] } }, rotten: { $sum: { $cond: ['$isFresh', 0, 1] } } } }]),
      Scan.aggregate([{ $match: { vendor: vendorId } }, { $group: { _id: '$fruit', fresh: { $sum: { $cond: ['$isFresh', 1, 0] } }, rotten: { $sum: { $cond: ['$isFresh', 0, 1] } }, total: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 8 }]),
      Scan.aggregate([{ $match: { vendor: vendorId } }, { $group: { _id: '$batchDate', batchNumber: { $first: '$batchNumber' }, total: { $sum: 1 }, fresh: { $sum: { $cond: ['$isFresh', 1, 0] } }, rotten: { $sum: { $cond: ['$isFresh', 0, 1] } } } }, { $sort: { _id: -1 } }]),
    ]);
    const t = totals[0] || { total: 0, fresh: 0, rotten: 0 };
    res.json({ total: t.total, fresh: t.fresh, rotten: t.rotten, freshRate: t.total > 0 ? Math.round((t.fresh / t.total) * 100) : 0, byFruit, batches });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getDaywiseStats = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const [totals, byFruit, scans] = await Promise.all([
      Scan.aggregate([{ $match: { vendor: vendorId, batchDate: date } }, { $group: { _id: null, total: { $sum: 1 }, fresh: { $sum: { $cond: ['$isFresh', 1, 0] } }, rotten: { $sum: { $cond: ['$isFresh', 0, 1] } } } }]),
      Scan.aggregate([{ $match: { vendor: vendorId, batchDate: date } }, { $group: { _id: '$fruit', fresh: { $sum: { $cond: ['$isFresh', 1, 0] } }, rotten: { $sum: { $cond: ['$isFresh', 0, 1] } }, total: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      Scan.find({ vendor: vendorId, batchDate: date }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    const t = totals[0] || { total: 0, fresh: 0, rotten: 0 };
    res.json({ date, total: t.total, fresh: t.fresh, rotten: t.rotten, freshRate: t.total > 0 ? Math.round((t.fresh / t.total) * 100) : 0, byFruit, scans });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getBatchwiseStats = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const batchNumber = parseInt(req.query.batch) || 1;
    const [totals, byFruit, scans] = await Promise.all([
      Scan.aggregate([{ $match: { vendor: vendorId, batchNumber } }, { $group: { _id: null, total: { $sum: 1 }, fresh: { $sum: { $cond: ['$isFresh', 1, 0] } }, rotten: { $sum: { $cond: ['$isFresh', 0, 1] } }, date: { $first: '$batchDate' } } }]),
      Scan.aggregate([{ $match: { vendor: vendorId, batchNumber } }, { $group: { _id: '$fruit', fresh: { $sum: { $cond: ['$isFresh', 1, 0] } }, rotten: { $sum: { $cond: ['$isFresh', 0, 1] } }, total: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      Scan.find({ vendor: vendorId, batchNumber }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    const t = totals[0] || { total: 0, fresh: 0, rotten: 0, date: null };
    res.json({ batchNumber, date: t.date, total: t.total, fresh: t.fresh, rotten: t.rotten, freshRate: t.total > 0 ? Math.round((t.fresh / t.total) * 100) : 0, byFruit, scans });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({ _id: req.params.id, vendor: req.vendor._id });
    if (!scan) return res.status(404).json({ message: 'Scan not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
