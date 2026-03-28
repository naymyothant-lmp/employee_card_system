require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, BusinessType, User } = require('../models');

const BUSINESS_TYPES = [
  'ယာဉ်အပ်နှံ ကောက်ခံခွင့်လုပ်ငန်း',
  'ယာဉ်ရပ်နား(ကန့်သတ်) ကောက်ခံခွင့်လုပ်ငန်း',
  'ရေချိုး/အိမ်သာအသုံးပြုခ ကောက်ခံခွင့်လုပ်ငန်း',
  'လမ်းဘေးဈေးကောက် ကောက်ခံခွင့်လုပ်ငန်း',
  'ဆိပ်ကမ်းခွန်(ယာဉ်ရပ်နား+လမ်းဘေးဈေးကောက်) ကောက်ခံခွင့်လုပ်ငန်း',
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✅ DB synced');

    // Seed business types
    for (const name of BUSINESS_TYPES) {
      await BusinessType.findOrCreate({ where: { name } });
    }
    console.log('✅ Business types seeded');

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
    if (created) console.log('✅ SuperAdmin created  (user: superadmin / pass: Admin@1234)');
    else         console.log('ℹ️  SuperAdmin already exists');

    console.log('🎉 Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
