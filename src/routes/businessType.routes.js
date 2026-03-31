const router = require('express').Router();
const ctrl   = require('../controllers/businessType.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/',  authenticate, ctrl.list);
router.post('/', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.create);
router.patch('/:id', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.remove);

module.exports = router;
