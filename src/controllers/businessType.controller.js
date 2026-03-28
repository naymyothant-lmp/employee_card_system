const { BusinessType } = require('../models');
const { success, error } = require('../utils/response');

exports.list = async (req, res) => {
  try {
    const types = await BusinessType.findAll();
    return success(res, types);
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return error(res, 'name is required', 400);
    const type = await BusinessType.create({ name });
    return success(res, type, 'BusinessType created', 201);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return error(res, 'BusinessType name already exists', 409);
    return error(res, 'Server error', 500);
  }
};
