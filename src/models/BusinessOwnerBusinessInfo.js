const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('BusinessOwnerBusinessInfo', {
    id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    business_owner_id: { type: DataTypes.INTEGER, allowNull: false },
    business_info_id:  { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'owner_business',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['business_owner_id', 'business_info_id'] },
    ],
  });
