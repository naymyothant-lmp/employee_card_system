const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Only SuperAdmin can create users
router.post('/',   authenticate, authorize('SuperAdmin'), ctrl.createUser);
router.get('/',    authenticate, authorize('SuperAdmin', 'Admin'), ctrl.listUsers);

// Profile update for logged-in user
router.patch('/profile', authenticate, ctrl.updateProfile);

// User detail/update/delete — Admin and above
router.get('/:id', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.getUserById);
router.patch('/:id', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.updateUser);
router.delete('/:id', authenticate, authorize('SuperAdmin', 'Admin'), ctrl.removeUser);

module.exports = router;
