const {
  EmployeeInfo,
  PersonInfo,
  BusinessOwner,
  BusinessInfo,
  BusinessType,
} = require('../models');
const { Op } = require('sequelize');
const { decryptCode } = require('../utils/encrypt');
const { success, error } = require('../utils/response');

const ownerInclude = [
  {
    // Include person info for the owner only for (is_active = true) filter in getAllOwners
    model: PersonInfo,
    as: 'person',
      where: { is_active: true },
  },
  {
    model: BusinessInfo,
    as: 'business',
    include: [{ model: BusinessType, as: 'businessType' }],
  },
];

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getSearchTerm(query = {}) {
  const raw = query.searchquery ?? query.search;
  return typeof raw === 'string' ? raw.trim() : '';
}

function buildPersonSearchWhere({ searchTerm = '', onlyActive = false } = {}) {
  const where = {};
  if (onlyActive) {
    where.is_active = true;
  }
  if (searchTerm) {
    const likeValue = `%${searchTerm}%`;
    where[Op.or] = [
      { name: { [Op.like]: likeValue } },
      { phone: { [Op.like]: likeValue } },
    ];
  }
  console.log("employee where - ",where)
  return where;
}

function extractEmployeeFilters(query = {}) {
  return {
    businessOwnerId: parsePositiveInt(query.business_owner_id),
    businessInfoId: parsePositiveInt(query.business_info_id),
    businessTypeId: parsePositiveInt(query.business_type_id),
  };
}

function buildBusinessTypeInclude(filters) {
  const include = { model: BusinessType, as: 'businessType' };
  if (filters.businessTypeId) {
    include.where = { id: filters.businessTypeId };
    include.required = true;
  }
  return include;
}

function buildBusinessInclude(filters) {
  const include = {
    model: BusinessInfo,
    as: 'business',
    include: [buildBusinessTypeInclude(filters)],
  };
  const needsBusinessFilter = filters.businessInfoId || filters.businessTypeId;
  if (filters.businessInfoId) {
    include.where = { id: filters.businessInfoId };
  }
  if (needsBusinessFilter) {
    include.required = true;
  }
  return include;
}

function buildOwnerInclude(filters) {
  const ownerInclude = {
    model: BusinessOwner,
    as: 'owner',
    include: [
      { model: PersonInfo, as: 'person' },
      buildBusinessInclude(filters),
    ],
  };
  if (filters.businessOwnerId) {
    ownerInclude.where = { id: filters.businessOwnerId };
  }
  if (filters.businessOwnerId || filters.businessInfoId || filters.businessTypeId) {
    ownerInclude.required = true;
  }
  return ownerInclude;
}

function buildFullInclude(filters = {}, personOptions = {}) {
  const personInclude = { model: PersonInfo, as: 'person' };
  if (personOptions.where) {
    personInclude.where = personOptions.where;
  }
  return [personInclude, buildOwnerInclude(filters)];
}

const DEFAULT_PAGINATION_LIMIT = 20;
const MAX_PAGINATION_LIMIT = 100;

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

function photoPath(files, field) {
  return files && files[field] ? files[field][0].path : null;
}
// ── Get all employees (with full business info chain) ─────────
exports.getAllWithBusinessInfo = async (req, res) => {
  try {
    const { limit, offset, page } = getPaginationOptions(req.query);
    const filters = extractEmployeeFilters(req.query);
    const searchTerm = getSearchTerm(req.query);
    console.log('searchTerm:', searchTerm);
    const personWhere = buildPersonSearchWhere({ searchTerm });
    console.log('personWhere:', personWhere);
    const result = await EmployeeInfo.findAndCountAll({
      include: buildFullInclude(filters, personWhere ? { where: personWhere } : undefined),
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

exports.getAllOwners = async (req, res) => {
  try {
    //Get All Owners Only person.is_active = true
    const owners = await BusinessOwner.findAll({
      include: ownerInclude,
    });
    return success(res, owners);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

// Get all active employees with optional business filters

exports.getAllEmployees = async (req, res) => {
  try {
    //Get All Owners Only person.is_active = true
    const { limit, offset, page } = getPaginationOptions(req.query);
    const filters = extractEmployeeFilters(req.query);
    const searchTerm = getSearchTerm(req.query);
    const personWhere = buildPersonSearchWhere({ searchTerm, onlyActive: true });
    const result = await EmployeeInfo.findAndCountAll({
      include: buildFullInclude(filters, personWhere ? { where: personWhere } : undefined),
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

// ── Get employees filtered by business_info_id ────────────────
exports.getByBusinessInfo = async (req, res) => {
  try {
    const { business_info_id } = req.params;
    const businessInfoId = parsePositiveInt(business_info_id);
    if (!businessInfoId) return error(res, 'business_info_id is required', 400);

    const { limit, offset, page } = getPaginationOptions(req.query);
    const filters = {
      ...extractEmployeeFilters(req.query),
      businessInfoId,
    };
    const result = await EmployeeInfo.findAndCountAll({
      include: buildFullInclude(filters),
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

// ── Get employees filtered by business_owner_id ───────────────
exports.getByOwner = async (req, res) => {
  try {
    const { owner_id } = req.params;

    const ownerId = parsePositiveInt(owner_id);
    if (!ownerId) return error(res, 'owner_id is required', 400);

    const { limit, offset, page } = getPaginationOptions(req.query);
    const filters = {
      ...extractEmployeeFilters(req.query),
      businessOwnerId: ownerId,
    };
    const result = await EmployeeInfo.findAndCountAll({
      where: { business_owner_id: ownerId },
      include: buildFullInclude(filters),
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

// ── Get single employee by ID ─────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const employee = await EmployeeInfo.findByPk(req.params.id, {
      include: buildFullInclude(),
    });
    
    if (!employee) return error(res, 'Employee not found', 404);
    return success(res, employee);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = await EmployeeInfo.findByPk(req.params.id, {
      include: [{ model: PersonInfo, as: 'person' }],
    });
    if (!employee) return error(res, 'Employee not found', 404);

    const person = employee.person;
    if (!person) return error(res, 'Employee profile not found', 404);

    const {
      name, phone, nrc_number, active_address, business_owner_id,
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

    const employeeUpdates = {};
    if (business_owner_id !== undefined && Number(business_owner_id) !== employee.business_owner_id) {
      if (!business_owner_id) return error(res, 'business_owner_id is required to change owner', 400);
      const owner = await BusinessOwner.findByPk(business_owner_id);
      if (!owner) return error(res, 'BusinessOwner not found', 404);
      employeeUpdates.business_owner_id = Number(business_owner_id);
    }

    if (!Object.keys(personUpdates).length && !Object.keys(employeeUpdates).length) {
      return error(res, 'Nothing to update', 400);
    }

    if (Object.keys(personUpdates).length) {
      await person.update(personUpdates);
    }

    if (Object.keys(employeeUpdates).length) {
      await employee.update(employeeUpdates);
    }

    const updated = await EmployeeInfo.findByPk(req.params.id, {
      include: buildFullInclude(),
    });

    return success(res, updated, 'Employee updated');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

exports.removeEmployee = async (req, res) => {
  try {
    const employee = await EmployeeInfo.findByPk(req.params.id, {
      include: [{ model: PersonInfo, as: 'person' }],
    });
    if (!employee) return error(res, 'Employee not found', 404);

    const { person } = employee;
    if (!person) return error(res, 'Employee profile not found', 404);

    if (person.is_active) {
      await person.update({ is_active: false });
      return success(res, { is_active: person.is_active }, 'Employee deactivated');
    }

    return success(res, { is_active: person.is_active }, 'Employee already inactive');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

// ── Verify employee by encrypted card code ────────────────────
// Checks: code valid → employee exists → isActive
exports.verifyByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return error(res, 'code is required', 400);

    // Decrypt to get employee id
    const employeeId = decryptCode(code);
    if (!employeeId) {
      return res.status(200).json({
        success: false,
        isValid: false,
        isActive: false,
        isExist: false,
        message: 'Invalid or tampered card code',
      });
    }

    // Find employee
    const employee = await EmployeeInfo.findByPk(employeeId, {
      include: buildFullInclude(),
    });

    if (!employee) {
      return res.status(200).json({
        success: true,
        isValid: true,
        isExist: false,
        isActive: false,
        message: 'Employee does not exist',
      });
    }

    // Verify the stored code matches what was submitted
    const codeMatches = employee.encrypted_code === code;
    const isActive    = employee.person?.is_active === true;

    return res.status(200).json({
      success: true,
      isValid: codeMatches,
      isExist: true,
      isActive,
      message: !codeMatches
        ? 'Code mismatch – possible tampering'
        : isActive
          ? 'Employee is active and verified'
          : 'Employee exists but is inactive',
      employee: {
        id:               employee.id,
        name:             employee.person?.name,
        phone:            employee.person?.phone,
        nrc_number:       employee.person?.nrc_number,
        profile_photo:    employee.person?.profile_photo,
        active_address:   employee.person?.active_address,
        is_active:        isActive,
        owner:            employee.owner?.person?.name,
        business:         employee.owner?.business?.name,
        business_type:    employee.owner?.business?.businessType?.name,
      },
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

// ── Toggle isActive for a person ──────────────────────────────
exports.toggleActive = async (req, res) => {
  try {
    const employee = await EmployeeInfo.findByPk(req.params.id, {
      include: [{ model: PersonInfo, as: 'person' }],
    });
    if (!employee) return error(res, 'Employee not found', 404);

    const person = employee.person;
    await person.update({ is_active: !person.is_active });
    return success(res, { is_active: person.is_active }, `Employee ${person.is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    return error(res, 'Server error', 500);
  }
};
