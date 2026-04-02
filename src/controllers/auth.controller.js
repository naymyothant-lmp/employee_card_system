const jwt  = require('jsonwebtoken');
const { User } = require('../models');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'mcdc_jwt_secret_key_2024';

exports.login = async (req, res) => {
  try {
    const { user_name, password } = req.body;
    if (!user_name || !password) return error(res, 'user_name and password required', 400);

    const user = await User.findOne({ where: { user_name } });
    if (!user || !user.is_active) return error(res, 'Invalid credentials', 401);

    const valid = await user.validatePassword(password);
    if (!valid) return error(res, 'Invalid credentials', 401);

    const token = jwt.sign(
      { id: user.id, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return success(res, {
      token,
      user: { id: user.id, user_name: user.user_name, user_type: user.user_type, phone: user.phone },
    }, 'Login successful');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};
