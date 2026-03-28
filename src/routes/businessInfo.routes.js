const router = require('express').Router();
const ctrl   = require('../controllers/businessInfo.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/',     authenticate, authorize('SuperAdmin', 'Admin'), ctrl.create);
router.get('/',      authenticate, ctrl.list);
router.get('/:id',   authenticate, ctrl.getById);

module.exports = router;
