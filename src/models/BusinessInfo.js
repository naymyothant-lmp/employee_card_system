const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('BusinessInfo', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    business_type_id: { type: DataTypes.INTEGER, allowNull: false },
    name:             { type: DataTypes.STRING(255), allowNull: false },
    location:         { type: DataTypes.STRING(500), allowNull: true },
  }, { tableName: 'business_infos' });
