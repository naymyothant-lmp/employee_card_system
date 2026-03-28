const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('BusinessType', {
    id:   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  }, { tableName: 'business_types' });
