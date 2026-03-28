const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config');

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    pool: dbConfig.pool,
    logging: dbConfig.logging,
    define: dbConfig.define,
  }
);

// Import models
const BusinessType    = require('./BusinessType')(sequelize);
const BusinessInfo    = require('./BusinessInfo')(sequelize);
const PersonInfo      = require('./PersonInfo')(sequelize);
const BusinessOwner   = require('./BusinessOwner')(sequelize);
const EmployeeInfo    = require('./EmployeeInfo')(sequelize);
const User            = require('./User')(sequelize);

// ── Associations ──────────────────────────────────────────────
// BusinessType → BusinessInfo
BusinessType.hasMany(BusinessInfo, { foreignKey: 'business_type_id', as: 'businesses' });
BusinessInfo.belongsTo(BusinessType, { foreignKey: 'business_type_id', as: 'businessType' });

// PersonInfo → BusinessOwner (a person can be an owner)
PersonInfo.hasOne(BusinessOwner, { foreignKey: 'person_info_id', as: 'ownerProfile' });
BusinessOwner.belongsTo(PersonInfo, { foreignKey: 'person_info_id', as: 'person' });

// BusinessInfo → BusinessOwner
BusinessInfo.hasMany(BusinessOwner, { foreignKey: 'business_info_id', as: 'owners' });
BusinessOwner.belongsTo(BusinessInfo, { foreignKey: 'business_info_id', as: 'business' });

// PersonInfo → EmployeeInfo
PersonInfo.hasOne(EmployeeInfo, { foreignKey: 'person_info_id', as: 'employeeProfile' });
EmployeeInfo.belongsTo(PersonInfo, { foreignKey: 'person_info_id', as: 'person' });

// BusinessOwner → EmployeeInfo (employees belong to an owner)
BusinessOwner.hasMany(EmployeeInfo, { foreignKey: 'business_owner_id', as: 'employees' });
EmployeeInfo.belongsTo(BusinessOwner, { foreignKey: 'business_owner_id', as: 'owner' });

module.exports = {
  sequelize,
  Sequelize,
  BusinessType,
  BusinessInfo,
  PersonInfo,
  BusinessOwner,
  EmployeeInfo,
  User,
};
