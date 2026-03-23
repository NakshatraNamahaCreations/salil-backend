const express = require('express');
const router = express.Router();
const bookController = require('./book.controller');
const validate = require('../../common/validate');
const { createBookSchema, updateBookSchema, listBooksSchema } = require('./book.validators');
const { authenticate, authorize } = require('../../common/auth.middleware');
const uploadImage = require('../../common/uploadImage');

const optionalCoverUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return next();
  uploadImage.single('coverImage')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

// FormData sends arrays as JSON strings — parse them before Joi validation
const parseFormFields = (req, res, next) => {
  if (req.body) {
    if (typeof req.body.genres === 'string' && req.body.genres) {
      try {
        req.body.genres = JSON.parse(req.body.genres);
      } catch {
        req.body.genres = req.body.genres.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (typeof req.body.tags === 'string' && req.body.tags) {
      try {
        req.body.tags = JSON.parse(req.body.tags);
      } catch {
        req.body.tags = req.body.tags.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
  }
  next();
};

// ─── Admin Book Routes (/api/v1/admin/books) ─────────────
const adminRouter = express.Router();

adminRouter.use(authenticate, authorize('admin', 'superadmin'));

adminRouter.post('/', optionalCoverUpload, parseFormFields, validate(createBookSchema), bookController.adminCreateBook);
adminRouter.get('/', validate(listBooksSchema), bookController.adminGetBooks);
adminRouter.get('/:id', bookController.adminGetBook);
adminRouter.put('/:id', optionalCoverUpload, parseFormFields, validate(updateBookSchema), bookController.adminUpdateBook);
adminRouter.delete('/:id', bookController.adminDeleteBook);
adminRouter.patch('/:id/feature', bookController.adminToggleFeatured);

// ─── Author Book Routes (/api/v1/author/books) ───────────
const authorRouter = express.Router();

authorRouter.use(authenticate, authorize('author'));

authorRouter.post('/', optionalCoverUpload, parseFormFields, validate(createBookSchema), bookController.authorCreateBook);
authorRouter.get('/', validate(listBooksSchema), bookController.authorGetBooks);
authorRouter.put('/:id', optionalCoverUpload, parseFormFields, validate(updateBookSchema), bookController.authorUpdateBook);

// ─── Public / Reader Routes (/api/v1/reader/books) ───────
const readerRouter = express.Router();

readerRouter.get('/', validate(listBooksSchema), bookController.getPublicBooks);
readerRouter.get('/:slug', bookController.getBookBySlug);

module.exports = { adminRouter, authorRouter, readerRouter };
