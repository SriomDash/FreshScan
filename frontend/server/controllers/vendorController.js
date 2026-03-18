const Vendor = require('../models/Vendor');

// GET /api/vendor/profile
exports.getProfile = async (req, res) => {
  res.json({ vendor: req.vendor });
};

// PATCH /api/vendor/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      { name },
      { new: true, runValidators: true }
    );
    res.json({ vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
