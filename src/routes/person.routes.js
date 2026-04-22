const router = require('express').Router();
const ctrl   = require('../controllers/person.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { personUpload } = require('../middlewares/upload.middleware');

// Create Owner — Admin and above
router.post(
  '/owner',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  personUpload,
  ctrl.createOwner,
);

// Owner detail/update/delete — Admin and above
router.get(
  '/owner/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  ctrl.getOwnerById,
);
router.patch(
  '/owner/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  personUpload,
  ctrl.updateOwner,
);
router.delete(
  '/owner/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  ctrl.removeOwner,
);

// List Owners — Admin and above
router.get(
  '/owners',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  ctrl.listOwners,
);

// Create Employee — all roles (Operator included)
router.post(
  '/employee',
  authenticate,
  authorize('SuperAdmin', 'Admin', 'Operator'),
  personUpload,
  ctrl.createEmployee,
);

// Employee detail/update/delete — Admin and above
router.get(
  '/employee/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  ctrl.getEmployeeById,
);

// Update Person — Admin and above
router.patch(
  '/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  personUpload,
  ctrl.updatePerson,
);

// Delete (deactivate) Person — Admin and above
router.delete(
  '/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin','Operator'),
  ctrl.removePerson,
);

module.exports = router;
