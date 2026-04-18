const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/', protect, restrictTo('admin'), getAllUsers);

module.exports = router;
