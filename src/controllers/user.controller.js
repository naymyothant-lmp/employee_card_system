const { User } = require('../models');
const { Op } = require('sequelize');
const { success, error } = require('../utils/response');

const USER_TYPES = ['SuperAdmin', 'Admin', 'Operator'];

const DEFAULT_PAGINATION_LIMIT = 20;
const MAX_PAGINATION_LIMIT = 100;

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1'].includes(normalized)) return true;
    if (['false', '0'].includes(normalized)) return false;
  }
  return null;
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

function buildUserWhere(query = {}) {
  const userTypeFilter = typeof query.user_type === 'string' ? query.user_type.trim() : '';
  const userNameFilter = typeof query.user_name === 'string' ? query.user_name.trim() : '';
  const phoneFilter = typeof query.phone === 'string' ? query.phone.trim() : '';
  const isActiveFilter = parseBoolean(query.is_active);
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const where = {};

  const andClauses = [];

  if (userTypeFilter && USER_TYPES.includes(userTypeFilter)) {
    andClauses.push({ user_type: userTypeFilter });
  }

  if (userNameFilter) {
    andClauses.push({ user_name: { [Op.like]: `%${userNameFilter}%` } });
  }

  if (phoneFilter) {
    andClauses.push({ phone: { [Op.like]: `%${phoneFilter}%` } });
  }

  if (isActiveFilter !== null) {
    andClauses.push({ is_active: isActiveFilter });
  }

  if (search) {
    andClauses.push({
      [Op.or]: [
        { user_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ],
    });
  }

  if (andClauses.length) {
    where[Op.and] = andClauses;
  }

  return where;
}

exports.createUser = async (req, res) => {
  try {
    const { user_name, password, phone, user_type } = req.body;
    if (!USER_TYPES.includes(user_type)) return error(res, 'Invalid user_type', 400);

    const exists = await User.findOne({ where: { user_name } });
    if (exists) return error(res, 'Username already taken', 409);

    const user = await User.create({ user_name, password, phone, user_type });
    const { password: _, ...data } = user.toJSON();
    return success(res, data, 'User created', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { limit, offset, page } = getPaginationOptions(req.query);
    const where = buildUserWhere(req.query);

    const result = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
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

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return error(res, 'User not found', 404);

    const {
      user_name, password, phone, user_type, is_active,
    } = req.body;

    const updates = {};

    if (user_name !== undefined) {
      if (!user_name) return error(res, 'user_name cannot be empty', 400);
      const existing = await User.findOne({ where: { user_name } });
      if (existing && existing.id !== user.id) return error(res, 'Username already taken', 409);
      updates.user_name = user_name;
    }

    if (password !== undefined) updates.password = password;
    if (phone !== undefined) updates.phone = phone;

    if (user_type !== undefined) {
      if (!USER_TYPES.includes(user_type)) return error(res, 'Invalid user_type', 400);
      updates.user_type = user_type;
    }

    if (is_active !== undefined) {
      const parsed = parseBoolean(is_active);
      if (parsed === null) return error(res, 'is_active must be a boolean', 400);
      updates.is_active = parsed;
    }

    if (!Object.keys(updates).length) {
      return error(res, 'Nothing to update', 400);
    }

    await user.update(updates);
    const { password: _, ...data } = user.toJSON();
    return success(res, data, 'User updated');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.removeUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'User not found', 404);

    if (user.is_active) {
      await user.update({ is_active: false });
      return success(res, { is_active: user.is_active }, 'User deactivated');
    }

    return success(res, { is_active: user.is_active }, 'User already inactive');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return error(res, 'User not found', 404);

    const { user_name, phone, password } = req.body;
    const updates = {};

    if (user_name !== undefined) {
      if (!user_name) return error(res, 'user_name cannot be empty', 400);
      const existing = await User.findOne({ where: { user_name } });
      if (existing && existing.id !== user.id) return error(res, 'Username already taken', 409);
      updates.user_name = user_name;
    }

    if (phone !== undefined) updates.phone = phone;
    if (password !== undefined) updates.password = password;

    if (!Object.keys(updates).length) {
      return error(res, 'Nothing to update', 400);
    }

    await user.update(updates);
    const { password: _, ...data } = user.toJSON();
    return success(res, data, 'Profile updated');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};
