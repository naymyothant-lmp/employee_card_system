const { BusinessInfo, BusinessType, BusinessOwner } = require('../models');
const { Op } = require('sequelize');
const { success, error } = require('../utils/response');

const DEFAULT_PAGINATION_LIMIT = 20;
const MAX_PAGINATION_LIMIT = 100;

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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

function buildBusinessWhere(query = {}) {
  const businessTypeId = parsePositiveInt(query.business_type_id);
  const nameFilter = typeof query.name === 'string' ? query.name.trim() : '';
  const locationFilter = typeof query.location === 'string' ? query.location.trim() : '';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const where = {};
  const andClauses = [];

  if (businessTypeId) {
    andClauses.push({ business_type_id: businessTypeId });
  }


  if (nameFilter) {
    andClauses.push({ name: { [Op.like]: `%${nameFilter}%` } });
  }

  if (locationFilter) {
    andClauses.push({ location: { [Op.like]: `%${locationFilter}%` } });
  }

  if (search) {
    andClauses.push({
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
      ],
    });
  }

  if (andClauses.length) {
    where[Op.and] = andClauses;
  }

  return where;
}

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
    const { limit, offset, page } = getPaginationOptions(req.query);
    const where = buildBusinessWhere(req.query);
    const result = await BusinessInfo.findAndCountAll({
      where,
      include: [{ model: BusinessType, as: 'businessType' }],
      limit,
      offset,
      distinct: true,
    });
    return paginatedSuccess(res, result, { page, limit });
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.getByOwner = async (req, res) => {
  try {
    const ownerId = parsePositiveInt(req.params.owner_id ?? req.query.owner_id);
    if (!ownerId) return error(res, 'owner_id is required', 400);

    const { limit, offset, page } = getPaginationOptions(req.query);
    const where = buildBusinessWhere(req.query);

    const result = await BusinessInfo.findAndCountAll({
      where,
      include: [
        { model: BusinessType, as: 'businessType' },
        {
          model: BusinessOwner,
          as: 'owners',
          attributes: ['id'],
          through: { attributes: [] },
          where: { id: ownerId },
          required: true,
        },
      ],
      limit,
      offset,
      distinct: true,
    });

    return paginatedSuccess(res, result, { page, limit });
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const business = await BusinessInfo.findByPk(req.params.id, {
      include: [{ model: BusinessType, as: 'businessType' }],
    });
    if (!business) return error(res, 'Not found', 204);
    return success(res, business);
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const { business_type_id, name, location } = req.body;
    const business = await BusinessInfo.findByPk(req.params.id);
    if (!business) return error(res, 'Business not found', 404);

    const updates = {};

    if (business_type_id) {
      const typeExists = await BusinessType.findByPk(business_type_id);
      if (!typeExists) return error(res, 'BusinessType not found', 404);
      updates.business_type_id = business_type_id;
    }

    if (name !== undefined) {
      // if (!name) return error(res, 'name cannot be empty', 400);
      updates.name = name;
    }

    if (location !== undefined) {
      updates.location = location;
    }

    if (!Object.keys(updates).length) {
      return error(res, 'Nothing to update', 400);
    }

    await business.update(updates);
    return success(res, business, 'Business updated');
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};

exports.remove = async (req, res) => {
  try {
    const business = await BusinessInfo.findByPk(req.params.id);
    if (!business) return error(res, 'Business not found', 404);

    await business.destroy();
    return success(res, null, 'Business deleted');
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};
