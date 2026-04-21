const {
  PersonInfo,
  BusinessOwner,
  EmployeeInfo,
  BusinessInfo,
  BusinessType,
} = require('../models');
const { generateEncryptedCode } = require('../utils/encrypt');
const { success, error } = require('../utils/response');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────
function photoPath(files, field) {
  if (files && files[field]) {
    const fullPath = files[field][0].path;
    console.log(fullPath);  // Optional: Keep for debugging, or remove if not needed
    // Get Relative Path
    return path.relative(process.cwd(), fullPath);
  }
  return null;
}

const ownerInclude = [
  { model: PersonInfo, as: 'person' },
  {
    model: BusinessInfo,
    as: 'businesses',
    through: { attributes: [] },
    include: [{ model: BusinessType, as: 'businessType' }],
  },
];

function parseBusinessInfoIds(payload = {}) {
  const ids = new Set();

  const addValue = (value) => {
    if (value === undefined || value === null) return;
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      ids.add(parsed);
    }
  };

  const collect = (value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          collect(parsed);
          return;
        } catch (err) {
          console.warn('Invalid business_info_ids payload', err);
        }
      }
      trimmed.split(',').forEach((item) => addValue(item));
      return;
    }
    addValue(value);
  };

  collect(payload.business_info_ids);
  if (payload.business_info_id !== undefined && payload.business_info_id !== null) {
    addValue(payload.business_info_id);
  }

  return Array.from(ids);
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const DEFAULT_PAGINATION_LIMIT = 20;
const MAX_PAGINATION_LIMIT = 100;

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1'].includes(normalized)) return true;
    if (['false', '0'].includes(normalized)) return false;
  }
  return null;
}

function getPaginationOptions(query = {}) {
  let limit = Number.parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = DEFAULT_PAGINATION_LIMIT;
  }
  limit = Math.min(limit, MAX_PAGINATION_LIMIT);

  let page = Number.parseInt(query.page, 10);
  if (!Number.isFinite(page) || page <= 0) {
    page = 1;
  }

  const offset = (page - 1) * limit;
  return { limit, offset, page };
}

function paginatedSuccess(res, result, { page, limit }) {
  const total = result.count || 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return success(res, {
    data: result.rows,
    meta: {
      total,
      limit,
      page,
      totalPages,
    },
  });
}

// ── Create Owner ──────────────────────────────────────────────
exports.createOwner = async (req, res) => {
  try {
    const {
      name, phone, nrc_number, active_address,
    } = req.body;

    if (!name) return error(res, 'name is required', 400);

    const businessInfoIds = parseBusinessInfoIds(req.body);
    if (!businessInfoIds.length) {
      return error(res, 'At least one business_info_id is required for owner', 400);
    }

    const businesses = await BusinessInfo.findAll({ where: { id: businessInfoIds } });
    if (businesses.length !== businessInfoIds.length) {
      return error(res, 'One or more BusinessInfo records not found', 404);
    }

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
      person_info_id: person.id,
    });

    await owner.setBusinesses(businessInfoIds);
    const refreshedOwner = await BusinessOwner.findByPk(owner.id, {
      include: ownerInclude,
    });

    return success(res, { person, owner: refreshedOwner }, 'Owner created', 201);
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

exports.listOwners = async (req, res) => {
  try {
    const { limit, offset, page } = getPaginationOptions(req.query);

    const result = await BusinessOwner.findAndCountAll({
      include: ownerInclude,
      limit,
      offset,
      distinct: true,
    });
    return paginatedSuccess(res, result, { page, limit });
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

//TODO :GET Employee by ID (Admin and above) - can be used for employee profile view and update
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await EmployeeInfo.findByPk(req.params.id, {
      include: [
        { model: PersonInfo, as: 'person' },
        {
          model: BusinessInfo,
          as: 'businessInfo',
          include: [{ model: BusinessType, as: 'businessType' }],
        },
        {
          model: BusinessOwner,
          as: 'owner',
          include: ownerInclude,
        },
      ],
    });
    if (!employee) return error(res, 'Employee not found', 404);
    return success(res, employee);
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
      name, phone, nrc_number, active_address,
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

    const businessInfoIds = parseBusinessInfoIds(req.body);
    let relationUpdated = false;
    if (businessInfoIds.length) {
      const businesses = await BusinessInfo.findAll({ where: { id: businessInfoIds } });
      if (businesses.length !== businessInfoIds.length) {
        return error(res, 'One or more BusinessInfo records not found', 404);
      }
      await owner.setBusinesses(businessInfoIds);
      relationUpdated = true;
    }

    if (!Object.keys(personUpdates).length && !relationUpdated) {
      return error(res, 'Nothing to update', 400);
    }

    if (Object.keys(personUpdates).length) {
      await person.update(personUpdates);
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
      name, phone, nrc_number, active_address, business_owner_id, business_info_id,
    } = req.body;

    if (!name)              return error(res, 'name is required', 400);
    if (!business_owner_id) return error(res, 'business_owner_id is required for employee', 400);
    if (!business_info_id)  return error(res, 'business_info_id is required for employee', 400);

    const ownerId = parsePositiveInt(business_owner_id);
    const businessInfoId = parsePositiveInt(business_info_id);
    if (!ownerId) return error(res, 'business_owner_id must be a positive integer', 400);
    if (!businessInfoId) return error(res, 'business_info_id must be a positive integer', 400);

    const owner = await BusinessOwner.findByPk(ownerId);
    if (!owner) return error(res, 'BusinessOwner not found', 404);

    const business = await BusinessInfo.findByPk(businessInfoId);
    if (!business) return error(res, 'BusinessInfo not found', 404);

    const ownsBusiness = await owner.hasBusiness(business);
    if (!ownsBusiness) {
      return error(res, 'BusinessOwner is not associated with this business_info_id', 400);
    }

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
      business_owner_id: ownerId,
      business_info_id:  businessInfoId,
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
