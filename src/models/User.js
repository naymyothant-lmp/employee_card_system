const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const USER_TYPES = ['SuperAdmin', 'Admin', 'Operator'];

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_type: { type: DataTypes.ENUM(...USER_TYPES), allowNull: false },
    user_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    password:  { type: DataTypes.STRING(255), allowNull: false },
    phone:     { type: DataTypes.STRING(20),  allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        user.password = await bcrypt.hash(user.password, 12);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  });

  User.prototype.validatePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
  };

  return User;
};
