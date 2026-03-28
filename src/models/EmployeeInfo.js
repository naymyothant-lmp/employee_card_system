const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('EmployeeInfo', {
    id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    person_info_id:    { type: DataTypes.INTEGER, allowNull: false },
    business_owner_id: { type: DataTypes.INTEGER, allowNull: false },
    // Encrypted card code generated from employee id
    encrypted_code:    { type: DataTypes.TEXT,    allowNull: true },
  }, { tableName: 'employee_infos' });
