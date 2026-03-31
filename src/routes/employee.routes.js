const router = require('express').Router();
const ctrl   = require('../controllers/employee.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Get all employees with full business info
router.get('/', authenticate, ctrl.getAllWithBusinessInfo);
router.get('/owners', authenticate, ctrl.getAllOwners);

// Get employees by business info id
router.get('/by-business/:business_info_id', authenticate, ctrl.getByBusinessInfo);

// Get employees by owner id
router.get('/by-owner/:owner_id', authenticate, ctrl.getByOwner);

// Get single employee
router.get('/:id', authenticate, ctrl.getById);

// Toggle active status — Admin and above
router.patch('/:id/toggle-active', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.toggleActive);

// Verify employee by encrypted card code — public (scan use case) or authenticated
router.post('/verify', ctrl.verifyByCode);

module.exports = router;
