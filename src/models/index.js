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
const BusinessOwnerBusinessInfo = require('./BusinessOwnerBusinessInfo')(sequelize);
const CardIssue = require('./CardIssue')(sequelize);


// ── Associations ──────────────────────────────────────────────
// BusinessType → BusinessInfo
BusinessType.hasMany(BusinessInfo, { foreignKey: 'business_type_id', as: 'businesses' });
BusinessInfo.belongsTo(BusinessType, { foreignKey: 'business_type_id', as: 'businessType' });

// PersonInfo → BusinessOwner (a person can be an owner)
PersonInfo.hasOne(BusinessOwner, { foreignKey: 'person_info_id', as: 'ownerProfile' });
BusinessOwner.belongsTo(PersonInfo, { foreignKey: 'person_info_id', as: 'person' });

// BusinessInfo ↔ BusinessOwner (many-to-many via pivot)
BusinessOwner.belongsToMany(BusinessInfo, {
  through: BusinessOwnerBusinessInfo,
  foreignKey: 'business_owner_id',
  otherKey: 'business_info_id',
  as: 'businesses',
});
BusinessInfo.belongsToMany(BusinessOwner, {
  through: BusinessOwnerBusinessInfo,
  foreignKey: 'business_info_id',
  otherKey: 'business_owner_id',
  as: 'owners',
});

// BusinessInfo → EmployeeInfo
BusinessInfo.hasMany(EmployeeInfo, { foreignKey: 'business_info_id', as: 'employees' });
EmployeeInfo.belongsTo(BusinessInfo, { foreignKey: 'business_info_id', as: 'businessInfo' });

// PersonInfo → EmployeeInfo
PersonInfo.hasOne(EmployeeInfo, { foreignKey: 'person_info_id', as: 'employeeProfile' });
EmployeeInfo.belongsTo(PersonInfo, { foreignKey: 'person_info_id', as: 'person' });

// EmployeeInfo → CardIssue
EmployeeInfo.hasMany(CardIssue,{ foreignKey: 'employee_id', as: 'cardIssues' })
CardIssue.belongsTo(EmployeeInfo,{foreignKey: 'employee_id', as: 'employee' })

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
  BusinessOwnerBusinessInfo,
  EmployeeInfo,
  User,
  CardIssue
};
