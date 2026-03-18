const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { protect } = require('../middleware/auth');
const { predict, getScans, getStats, deleteScan } = require('../controllers/scanController');

// Store file in memory (we forward the buffer directly to the AI model)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

router.post('/predict',  protect, upload.single('file'), predict);
router.get('/',          protect, getScans);
router.get('/stats',     protect, getStats);
router.delete('/:id',    protect, deleteScan);

module.exports = router;
