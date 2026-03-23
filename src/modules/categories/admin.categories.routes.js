const express = require('express');
const router = express.Router();
const ctrl = require('./admin.categories.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/categories', ctrl.getCategories);
router.post('/categories', ctrl.createCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

router.get('/tags', ctrl.getTags);
router.post('/tags', ctrl.createTag);
router.delete('/tags/:id', ctrl.deleteTag);

module.exports = router;
