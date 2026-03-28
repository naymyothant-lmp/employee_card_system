const { BusinessInfo, BusinessType } = require('../models');
const { success, error } = require('../utils/response');

exports.create = async (req, res) => {
  try {
    const { business_type_id, name, location } = req.body;
    if (!business_type_id || !name) return error(res, 'business_type_id and name are required', 400);

    const typeExists = await BusinessType.findByPk(business_type_id);
    if (!typeExists) return error(res, 'BusinessType not found', 404);

    const business = await BusinessInfo.create({ business_type_id, name, location });
    return success(res, business, 'Business created', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.list = async (req, res) => {
  try {
    const businesses = await BusinessInfo.findAll({
      include: [{ model: BusinessType, as: 'businessType' }],
    });
    return success(res, businesses);
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const business = await BusinessInfo.findByPk(req.params.id, {
      include: [{ model: BusinessType, as: 'businessType' }],
    });
    if (!business) return error(res, 'Not found', 404);
    return success(res, business);
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};
