/**
 * Standardized API response helpers
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
  };
  if (data !== null) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

const created = (res, data = null, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const paginated = (res, { docs, total, page, limit }, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data: docs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};

const error = (res, message = 'Error', statusCode = 500, code = 'ERROR') => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};

module.exports = { success, created, paginated, error };
