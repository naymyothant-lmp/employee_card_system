const router = require('express').Router();
const ctrl   = require('../controllers/businessType.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/',  authenticate, ctrl.list);
router.post('/', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.create);

module.exports = router;
