const Joi = require('joi');

const createChapterSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    orderNumber: Joi.number().integer().min(1).optional(),
    sourceType: Joi.string().valid('richtext', 'pdf').default('richtext'),
    rawPdfUrl: Joi.string().uri().allow('').optional(),
    contentHtml: Joi.string().allow('').optional(),
    isFree: Joi.boolean().default(false),
    coinCost: Joi.number().integer().min(0).default(0),
    estimatedReadTime: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('draft', 'scheduled', 'published', 'archived').default('draft'),
  }),
};

const updateChapterSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    orderNumber: Joi.number().integer().min(1).optional(),
    sourceType: Joi.string().valid('richtext', 'pdf').optional(),
    rawPdfUrl: Joi.string().uri().allow('').optional(),
    contentHtml: Joi.string().allow('').optional(),
    isFree: Joi.boolean().optional(),
    coinCost: Joi.number().integer().min(0).optional(),
    estimatedReadTime: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('draft', 'scheduled', 'published', 'archived').optional(),
  }),
};

const reorderSchema = {
  body: Joi.object({
    orderNumber: Joi.number().integer().min(1).required(),
  }),
};

const publishSchema = {
  body: Joi.object({
    status: Joi.string().valid('draft', 'scheduled', 'published').required(),
    scheduledAt: Joi.date().when('status', { is: 'scheduled', then: Joi.required() }),
  }),
};

module.exports = { createChapterSchema, updateChapterSchema, reorderSchema, publishSchema };
