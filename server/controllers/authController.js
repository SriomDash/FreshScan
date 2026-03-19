const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const formatVendor = (vendor) => ({
  _id:      vendor._id,
  name:     vendor.name,
  email:    vendor.email,
  vendorId: vendor.vendorId,
  city:     vendor.city,
  state:    vendor.state,
  createdAt:vendor.createdAt,
});

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, city, state } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Please provide name, email and password' });

    const exists = await Vendor.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const vendor = await Vendor.create({ name, email, password, city: city||'', state: state||'' });
    const token = signToken(vendor._id);
    res.status(201).json({ token, vendor: formatVendor(vendor) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Please provide email and password' });

    const vendor = await Vendor.findOne({ email }).select('+password');
    if (!vendor || !(await vendor.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = signToken(vendor._id);
    res.json({ token, vendor: formatVendor(vendor) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ vendor: formatVendor(req.vendor) });
};
