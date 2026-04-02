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

const ownerInclude = [
  { model: PersonInfo, as: 'person' },
  {
    model: BusinessInfo,
    as: 'business',
    include: [{ model: BusinessType, as: 'businessType' }],
  },
];

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

exports.getOwnerById = async (req, res) => {
  try {
    const owner = await BusinessOwner.findByPk(req.params.id, {
      include: ownerInclude,
    });
    if (!owner) return error(res, 'Owner not found', 404);
    return success(res, owner);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.updateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const owner = await BusinessOwner.findByPk(id);
    if (!owner) return error(res, 'Owner not found', 404);

    const person = await PersonInfo.findByPk(owner.person_info_id);
    if (!person) return error(res, 'Owner profile not found', 404);

    const {
      name, phone, nrc_number, active_address, business_info_id,
    } = req.body;

    const personUpdates = {};
    if (name !== undefined) personUpdates.name = name;
    if (phone !== undefined) personUpdates.phone = phone;
    if (nrc_number !== undefined) personUpdates.nrc_number = nrc_number;
    if (active_address !== undefined) personUpdates.active_address = active_address;

    ['profile_photo', 'nrc_front_photo', 'nrc_back_photo'].forEach((field) => {
      const path = photoPath(req.files, field);
      if (path) personUpdates[field] = path;
    });

    const ownerUpdates = {};
    if (business_info_id !== undefined && Number(business_info_id) !== owner.business_info_id) {
      if (!business_info_id) return error(res, 'business_info_id is required to change business', 400);
      const business = await BusinessInfo.findByPk(business_info_id);
      if (!business) return error(res, 'BusinessInfo not found', 404);
      ownerUpdates.business_info_id = Number(business_info_id);
    }

    if (!Object.keys(personUpdates).length && !Object.keys(ownerUpdates).length) {
      return error(res, 'Nothing to update', 400);
    }

    if (Object.keys(personUpdates).length) {
      await person.update(personUpdates);
    }

    if (Object.keys(ownerUpdates).length) {
      await owner.update(ownerUpdates);
    }

    const refreshed = await BusinessOwner.findByPk(id, {
      include: ownerInclude,
    });

    return success(res, refreshed, 'Owner updated');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.removeOwner = async (req, res) => {
  try {
    const owner = await BusinessOwner.findByPk(req.params.id, {
      include: [{ model: PersonInfo, as: 'person' }],
    });
    if (!owner) return error(res, 'Owner not found', 404);

    const { person } = owner;
    if (!person) return error(res, 'Owner profile not found', 404);

    if (person.is_active) {
      await person.update({ is_active: false });
      return success(res, { is_active: person.is_active }, 'Owner deactivated');
    }

    return success(res, { is_active: person.is_active }, 'Owner already inactive');
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

exports.updatePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const person = await PersonInfo.findByPk(id);
    if (!person) return error(res, 'Person not found', 404);

    const { name, phone, nrc_number, active_address } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (nrc_number !== undefined) updates.nrc_number = nrc_number;
    if (active_address !== undefined) updates.active_address = active_address;

    ['profile_photo', 'nrc_front_photo', 'nrc_back_photo'].forEach((field) => {
      const path = photoPath(req.files, field);
      if (path) updates[field] = path;
    });

    if (!Object.keys(updates).length) {
      return error(res, 'Nothing to update', 400);
    }

    await person.update(updates);
    return success(res, person, 'Person updated');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.removePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const person = await PersonInfo.findByPk(id);
    if (!person) return error(res, 'Person not found', 404);

    if (person.is_active) {
      await person.update({ is_active: false });
      return success(res, { is_active: person.is_active }, 'Person deactivated');
    }

    return success(res, { is_active: person.is_active }, 'Person already inactive');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};
