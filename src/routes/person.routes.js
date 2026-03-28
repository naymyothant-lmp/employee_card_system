const router = require('express').Router();
const ctrl   = require('../controllers/person.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { personUpload } = require('../middlewares/upload.middleware');

// Create Owner — Admin and above
router.post(
  '/owner',
  authenticate,
  authorize('SuperAdmin', 'Admin'),
  personUpload,
  ctrl.createOwner,
);

// Create Employee — all roles (Operator included)
router.post(
  '/employee',
  authenticate,
  authorize('SuperAdmin', 'Admin', 'Operator'),
  personUpload,
  ctrl.createEmployee,
);

module.exports = router;
