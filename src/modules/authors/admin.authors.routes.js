const express = require('express');
const router = express.Router();
const ctrl = require('./admin.authors.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/', ctrl.getAuthors);
router.post('/', ctrl.createAuthor);
router.get('/:id', ctrl.getAuthor);
router.put('/:id', ctrl.updateAuthor);
router.delete('/:id', ctrl.deleteAuthor);
router.patch('/:id/approve', ctrl.approveAuthor);
router.patch('/:id/revoke', ctrl.revokeAuthor);

module.exports = router;
