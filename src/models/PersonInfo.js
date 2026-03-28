const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('PersonInfo', {
    id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:            { type: DataTypes.STRING(255), allowNull: false },
    phone:           { type: DataTypes.STRING(20),  allowNull: true },
    profile_photo:   { type: DataTypes.STRING(500), allowNull: true },
    nrc_front_photo: { type: DataTypes.STRING(500), allowNull: true },
    nrc_back_photo:  { type: DataTypes.STRING(500), allowNull: true },
    nrc_number:      { type: DataTypes.STRING(100), allowNull: true },
    active_address:  { type: DataTypes.TEXT,        allowNull: true },
    is_active:       { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'person_infos' });
