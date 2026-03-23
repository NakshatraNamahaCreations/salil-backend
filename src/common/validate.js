const Joi = require('joi');
const AppError = require('./AppError');

/**
 * Creates a middleware that validates req.body, req.query, or req.params
 * against a Joi schema.
 *
 * @param {Object} schema - { body: Joi.object(), query: Joi.object(), params: Joi.object() }
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    ['params', 'query', 'body'].forEach((key) => {
      if (schema[key]) {
        const { error, value } = schema[key].validate(req[key], {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          error.details.forEach((detail) => {
            errors.push(detail.message.replace(/"/g, ''));
          });
        } else {
          req[key] = value; // replace with sanitized values
        }
      }
    });

    if (errors.length > 0) {
      return next(AppError.badRequest(errors.join('; '), 'VALIDATION_ERROR'));
    }

    next();
  };
};

module.exports = validate;
