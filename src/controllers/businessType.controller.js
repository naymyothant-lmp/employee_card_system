const { BusinessType } = require('../models');
const { Op } = require('sequelize');
const { success, error } = require('../utils/response');

const DEFAULT_PAGINATION_LIMIT = 20;
const MAX_PAGINATION_LIMIT = 100;

function getPaginationOptions(query = {}) {
  let limit = Number.parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = DEFAULT_PAGINATION_LIMIT;
  }
  limit = Math.min(limit, MAX_PAGINATION_LIMIT);

  let page = Number.parseInt(query.page, 10);
  if (!Number.isFinite(page) || page <= 0) {
    page = 1;
  }

  const offset = (page - 1) * limit;
  return { limit, offset, page };
}

function paginatedSuccess(res, result, { page, limit }) {
  const total = result.count || 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return success(res, {
    data: result.rows,
    meta: {
      total,
      limit,
      page,
      totalPages,
    },
  });
}

function getSearchTerm(query = {}) {
  const raw = query.searchquery ?? query.search;
  return typeof raw === 'string' ? raw.trim() : '';
}

function buildBusinessTypeWhere(query = {}) {
  const searchTerm = getSearchTerm(query);
  const where = {};

  if (searchTerm) {
    where.name = { [Op.like]: `%${searchTerm}%` };
  }

  return where;
}

//BusinessType Lists
exports.list = async (req, res) => {
  try {
    //Add Pagination and Search And Filter 
    const { limit, offset, page } = getPaginationOptions(req.query);
    const where = buildBusinessTypeWhere(req.query);
    const result = await BusinessType.findAndCountAll({
      where,
      limit,
      offset,
    });
    return paginatedSuccess(res, result, { page, limit });
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

exports.update = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return error(res, 'name is required', 400);

    const type = await BusinessType.findByPk(req.params.id);
    if (!type) return error(res, 'BusinessType not found', 404);

    await type.update({ name });
    return success(res, type, 'BusinessType updated');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return error(res, 'BusinessType name already exists', 409);
    return error(res, 'Server error', 500);
  }
};

exports.remove = async (req, res) => {
  try {
    const type = await BusinessType.findByPk(req.params.id);
    if (!type) return error(res, 'BusinessType not found', 404);

    await type.destroy();
    return success(res, null, 'BusinessType deleted');
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};
