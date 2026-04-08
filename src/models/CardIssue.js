const { DataTypes } = require('sequelize');

const ISSUE_STATUS = ['TO_ISSUE', 'ISSUED'];

module.exports = (sequelize) =>
  sequelize.define('CardIssue', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employee_id:  { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.ENUM(...ISSUE_STATUS), allowNull: false },
  }, { tableName: 'card_issue' });

  module.exports.ISSUE_STATUS = ISSUE_STATUS;