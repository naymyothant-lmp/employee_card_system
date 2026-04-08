require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const {
  sequelize,
  BusinessType,
  BusinessInfo,
  PersonInfo,
  BusinessOwner,
  EmployeeInfo,
  User,
} = require('../models');
const { generateEncryptedCode } = require('../utils/encrypt');

const BUSINESS_TYPES = [
  '‌ရေချိုး/အိမ်သာ',
  'ယဉ်ရပ်နားကောက်ခံ',
  'စားသောက်ဆိုင်',
  'ဘီးခွန်'
];

const BUSINESS_INFOS = [
  { name: 'Tinder Employer HQ', location: 'Ahlone Township' },
  { name: 'Tinder Employer Outlet', location: 'Kamaryut Township' },
];

const OWNER_PROFILE = {
  name: 'Tun Aung Start',
  phone: '09970000001',
  nrc_number: '9/KaNaNa(N)123456',
  active_address: 'No. 123, Sule Pagoda Road, Yangon',
};

const EMPLOYEE_PROFILE = {
  name: 'Mya Than Su',
  phone: '09970000002',
  nrc_number: '9/KaNaNa(N)654321',
  active_address: 'No. 12, Kabar Aye Pagoda Road, Yangon',
};

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('âœ… DB synced');

    // Seed business types
    for (const name of BUSINESS_TYPES) {
      await BusinessType.findOrCreate({ where: { name } });
    }
    console.log('âœ… Business types seeded');

    const businessType = await BusinessType.findOne();
    if (!businessType) throw new Error('Missing BusinessType after seeding');

    const businessInfos = [];
    for (const info of BUSINESS_INFOS) {
      const [business] = await BusinessInfo.findOrCreate({
        where: { name: info.name },
        defaults: {
          business_type_id: businessType.id,
          location: info.location,
        },
      });
      await business.update({
        business_type_id: businessType.id,
        location: info.location,
      });
      businessInfos.push(business);
    }
    console.log('âœ… Business infos seeded');

    const [ownerPerson] = await PersonInfo.findOrCreate({
      where: { name: OWNER_PROFILE.name, phone: OWNER_PROFILE.phone },
      defaults: { ...OWNER_PROFILE, is_active: true },
    });
    const [owner] = await BusinessOwner.findOrCreate({
      where: { person_info_id: ownerPerson.id },
      defaults: { person_info_id: ownerPerson.id },
    });
    await owner.setBusinesses(businessInfos.map((b) => b.id));
    console.log('âœ… Business owner seeded');

    const [employeePerson] = await PersonInfo.findOrCreate({
      where: { name: EMPLOYEE_PROFILE.name, phone: EMPLOYEE_PROFILE.phone },
      defaults: { ...EMPLOYEE_PROFILE, is_active: true },
    });

    const employeeBusinessId = businessInfos[0]?.id;
    if (!employeeBusinessId) throw new Error('No BusinessInfo available for employee seeding');

    const [employee, createdEmployee] = await EmployeeInfo.findOrCreate({
      where: { person_info_id: employeePerson.id },
      defaults: {
        person_info_id:    employeePerson.id,
        business_owner_id: owner.id,
        business_info_id:  employeeBusinessId,
      },
    });

    if (!createdEmployee && (employee.business_owner_id !== owner.id || employee.business_info_id !== employeeBusinessId)) {
      await employee.update({
        business_owner_id: owner.id,
        business_info_id:  employeeBusinessId,
      });
    }

    const code = generateEncryptedCode(employee.id);
    if (employee.encrypted_code !== code) {
      await employee.update({ encrypted_code: code });
    }
    console.log('âœ… Employee seeded');

    // Seed SuperAdmin user
    const [admin, created] = await User.findOrCreate({
      where: { user_name: 'superadmin' },
      defaults: {
        user_name: 'superadmin',
        password:  'Admin@1234',
        user_type: 'SuperAdmin',
        phone:     '09000000000',
      },
    });
    if (created) console.log('SuperAdmin created  (user: superadmin / pass: Admin@1234)');
    else         console.log('  SuperAdmin already exists');

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error(' Seed failed:', err);
    process.exit(1);
  }
}

seed();
