const router = require('express').Router();
const ctrl   = require('../controllers/employee.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { personUpload } = require('../middlewares/upload.middleware');

// Get all employees with full business info
router.get('/', authenticate, ctrl.getAllWithBusinessInfo);
router.get('/owners', authenticate, ctrl.getAllOwners);
router.get('/employees', authenticate, ctrl.getAllEmployees);

// Get employees by business info id
router.get('/by-business/:business_info_id', authenticate, ctrl.getByBusinessInfo);

// Get employees by owner id
router.get('/by-owner/:owner_id', authenticate, ctrl.getByOwner);

// Get single employee
router.get('/by-id/:id', authenticate, ctrl.getById);//by-id for route conflict 

// Update employee — Admin and above (Operators included)
router.patch(
  '/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin', 'Operator'),
  personUpload,
  ctrl.updateEmployee,
);

// Delete employee — Admin and above (Operators included)
router.delete(
  '/:id',
  authenticate,
  authorize('SuperAdmin', 'Admin', 'Operator'),
  ctrl.removeEmployee,
);

// Toggle active status — Admin and above
router.patch('/:id/toggle-active', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.toggleActive);

router.post('/verify',authenticate, ctrl.verifyByCode);
router.post('/addToIssue',authenticate, ctrl.addIssueCard);
router.put('/updateIssueStatus/:card_issue_id',authenticate, ctrl.updateIssueCard);

router.get('/cardToIssue', authenticate, ctrl.getCardsToIssue);
router.get('/issuedCards', authenticate, ctrl.getEmployeesWithIssuedCards);

module.exports = router;
