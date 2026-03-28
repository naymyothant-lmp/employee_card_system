const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('BusinessOwner', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    person_info_id:   { type: DataTypes.INTEGER, allowNull: false },
    business_info_id: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'business_owners' });
