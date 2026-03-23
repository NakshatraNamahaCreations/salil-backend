const express = require('express');
const router = express.Router();
const usersController = require('./admin.users.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

// Protect all routes
router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/', usersController.getUsers);
router.get('/admins', usersController.getAdmins);

router.post('/', usersController.createUser);
router.get('/:id', usersController.getUserDetails);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);
router.patch('/:id/block', usersController.toggleBlockStatus);

module.exports = router;
