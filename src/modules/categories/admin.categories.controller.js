const Category = require('./Category.model');
const Tag = require('./Tag.model');
const AppError = require('../../common/AppError');
const logger = require('../../common/logger');

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name) throw AppError.badRequest('Category name is required');
    const generateSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = new Category({ name, slug: generateSlug });
    await category.save();
    logger.info(`Admin ${req.user.userId} created category ${category._id}`);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) return next(AppError.badRequest('Category slug already exists'));
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw AppError.notFound('Category not found');
    logger.info(`Admin ${req.user.userId} deleted category ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getTags = async (req, res, next) => {
  try {
    const tags = await Tag.find().sort({ usageCount: -1, name: 1 });
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};

exports.createTag = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) throw AppError.badRequest('Tag name is required');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const tag = new Tag({ name, slug });
    await tag.save();
    logger.info(`Admin ${req.user.userId} created tag ${tag._id}`);
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    if (error.code === 11000) return next(AppError.badRequest('Tag already exists'));
    next(error);
  }
};

exports.deleteTag = async (req, res, next) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) throw AppError.notFound('Tag not found');
    logger.info(`Admin ${req.user.userId} deleted tag ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Tag deleted' });
  } catch (error) {
    next(error);
  }
};
