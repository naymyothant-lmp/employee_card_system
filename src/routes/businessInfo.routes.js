const router = require('express').Router();
const ctrl   = require('../controllers/businessInfo.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/',     authenticate, authorize('SuperAdmin', 'Admin'), ctrl.create);
router.get('/',      authenticate, ctrl.list);
router.get('/:id',   authenticate, ctrl.getById);
router.patch('/:id', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.remove);

module.exports = router;
