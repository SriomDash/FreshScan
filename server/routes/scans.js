const express = require('express');
const router = express.Router();

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const { protect } = require('../middleware/auth');
const { predict, getScans, getStats, deleteScan } = require('../controllers/scanController');

// ─────────────────────────────────────────────
// Cloudinary Storage (NO LOCAL UPLOADS)
// ─────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'freshscan',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => {
      return `${Date.now()}-${file.originalname.split('.')[0]}`;
    },
  },
});

// ─────────────────────────────────────────────
// Multer setup
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
router.post('/predict', protect, upload.single('file'), predict);
router.get('/', protect, getScans);
router.get('/stats', protect, getStats);
router.delete('/:id', protect, deleteScan);

module.exports = router;