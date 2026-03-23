const Joi = require('joi');

const createBookSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(5000).allow('').optional(),
    authorId: Joi.string().optional(),
    genres: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
    categoryId: Joi.string().optional(),
    tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
    bookLanguage: Joi.string().optional(),
    coverImage: Joi.string().allow('').optional(),
    contentType: Joi.string().valid('ebook', 'audiobook').optional(),
    isFeatured: Joi.boolean().optional(),
    isFree: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
    ebookPrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    audiobookPrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    comboPrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
  }).options({ allowUnknown: true, stripUnknown: false }),
};

const updateBookSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(5000).allow('').optional(),
    authorId: Joi.string().optional(),
    genres: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
    categoryId: Joi.string().optional(),
    tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
    bookLanguage: Joi.string().optional(),
    coverImage: Joi.string().allow('').optional(),
    contentType: Joi.string().valid('ebook', 'audiobook').optional(),
    isFeatured: Joi.boolean().optional(),
    isFree: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
    ebookPrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    audiobookPrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    comboPrice: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
    isPublished: Joi.boolean().optional(),
  }).options({ allowUnknown: true, stripUnknown: false }),
};

const listBooksSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow('').optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
    authorId: Joi.string().optional(),
    categoryId: Joi.string().optional(),
    contentType: Joi.string().valid('ebook', 'audiobook').optional(),
    bookLanguage: Joi.string().optional(),
    isFeatured: Joi.boolean().optional(),
    sortBy: Joi.string().valid('createdAt', 'title', 'totalReads', 'averageRating').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

module.exports = { createBookSchema, updateBookSchema, listBooksSchema };
