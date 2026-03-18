const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/vendorController');

router.get('/profile',   protect, getProfile);
router.patch('/profile', protect, updateProfile);

module.exports = router;
