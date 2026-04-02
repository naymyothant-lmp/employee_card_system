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

// Owner detail/update/delete — Admin and above
router.get(
  '/owner/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin'),
  ctrl.getOwnerById,
);
router.patch(
  '/owner/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin'),
  personUpload,
  ctrl.updateOwner,
);
router.delete(
  '/owner/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin'),
  ctrl.removeOwner,
);

// Create Employee — all roles (Operator included)
router.post(
  '/employee',
  authenticate,
  authorize('SuperAdmin', 'Admin', 'Operator'),
  personUpload,
  ctrl.createEmployee,
);

// Update Person — Admin and above
router.patch(
  '/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin'),
  personUpload,
  ctrl.updatePerson,
);

// Delete (deactivate) Person — Admin and above
router.delete(
  '/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin'),
  ctrl.removePerson,
);

module.exports = router;
