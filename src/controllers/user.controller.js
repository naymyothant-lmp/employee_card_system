const { User } = require('../models');
const { success, error } = require('../utils/response');

exports.createUser = async (req, res) => {
  try {
    const { user_name, password, phone, user_type } = req.body;
    const allowed = ['SuperAdmin', 'Admin', 'Operator'];
    if (!allowed.includes(user_type)) return error(res, 'Invalid user_type', 400);

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
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    return success(res, users);
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};
