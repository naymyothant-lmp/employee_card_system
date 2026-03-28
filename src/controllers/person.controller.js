const {
  PersonInfo,
  BusinessOwner,
  EmployeeInfo,
  BusinessInfo,
  BusinessType,
} = require('../models');
const { generateEncryptedCode } = require('../utils/encrypt');
const { success, error } = require('../utils/response');

// ── Helpers ───────────────────────────────────────────────────
function photoPath(files, field) {
  return files && files[field] ? files[field][0].path : null;
}

// ── Create Owner ──────────────────────────────────────────────
exports.createOwner = async (req, res) => {
  try {
    const {
      name, phone, nrc_number, active_address, business_info_id,
    } = req.body;

    if (!name)             return error(res, 'name is required', 400);
    if (!business_info_id) return error(res, 'business_info_id is required for owner', 400);

    const business = await BusinessInfo.findByPk(business_info_id);
    if (!business) return error(res, 'BusinessInfo not found', 404);

    const person = await PersonInfo.create({
      name,
      phone,
      nrc_number,
      active_address,
      profile_photo:   photoPath(req.files, 'profile_photo'),
      nrc_front_photo: photoPath(req.files, 'nrc_front_photo'),
      nrc_back_photo:  photoPath(req.files, 'nrc_back_photo'),
      is_active: true,
    });

    const owner = await BusinessOwner.create({
      person_info_id:   person.id,
      business_info_id: Number(business_info_id),
    });

    return success(res, { person, owner }, 'Owner created', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

// ── Create Employee ───────────────────────────────────────────
exports.createEmployee = async (req, res) => {
  try {
    const {
      name, phone, nrc_number, active_address, business_owner_id,
    } = req.body;

    if (!name)              return error(res, 'name is required', 400);
    if (!business_owner_id) return error(res, 'business_owner_id is required for employee', 400);

    const owner = await BusinessOwner.findByPk(business_owner_id);
    if (!owner) return error(res, 'BusinessOwner not found', 404);

    const person = await PersonInfo.create({
      name,
      phone,
      nrc_number,
      active_address,
      profile_photo:   photoPath(req.files, 'profile_photo'),
      nrc_front_photo: photoPath(req.files, 'nrc_front_photo'),
      nrc_back_photo:  photoPath(req.files, 'nrc_back_photo'),
      is_active: true,
    });

    const employee = await EmployeeInfo.create({
      person_info_id:    person.id,
      business_owner_id: Number(business_owner_id),
    });

    // Generate encrypted card code from employee id
    const code = generateEncryptedCode(employee.id);
    await employee.update({ encrypted_code: code });

    return success(res, { person, employee: { ...employee.toJSON(), encrypted_code: code } }, 'Employee created', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};
