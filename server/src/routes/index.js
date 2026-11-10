const express = require('express');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.use('/auth', require('./authRoutes'));
router.use('/students', require('./studentRoutes'));
router.use('/posters', require('./posterRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/jobs', require('./jobRoutes'));
router.use('/applications', require('./applicationRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/conversations', require('./conversationRoutes'));
router.use('/reports', require('./reportRoutes'));

module.exports = router;
