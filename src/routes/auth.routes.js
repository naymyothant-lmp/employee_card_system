const router = require('express').Router();
const { login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/login', login);
router.get('/me',authenticate,getMe)

module.exports = router;
