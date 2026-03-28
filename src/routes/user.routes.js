const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Only SuperAdmin can create users
router.post('/',   authenticate, authorize('SuperAdmin'), ctrl.createUser);
router.get('/',    authenticate, authorize('SuperAdmin', 'Admin'), ctrl.listUsers);

module.exports = router;
