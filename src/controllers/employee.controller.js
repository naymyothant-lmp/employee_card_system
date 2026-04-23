const {
  EmployeeInfo,
  PersonInfo,
  BusinessOwner,
  BusinessInfo,
  BusinessType,
  CardIssue,
} = require('../models');
const { Op } = require('sequelize');
const { decryptCode } = require('../utils/encrypt');
const { success, error } = require('../utils/response');
const { ISSUE_STATUS } = require('../models/CardIssue');
const e = require('express');

const ownerInclude = [
  {
    // Include person info for the owner only for (is_active = true) filter in getAllOwners
    model: PersonInfo,
    as: 'person',
    where: { is_active: true },
  },
  {
    model: BusinessInfo,
    as: 'businesses',
    through: { attributes: [] },
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
  console.log("employee where - ", where)
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
    as: 'businesses',
    through: { attributes: [] },
    include: [buildBusinessTypeInclude(filters)],
  };
  const needsBusinessFilter = filters.businessInfoId || filters.businessTypeId;
  if (filters.businessInfoId) {
    include.where = { id: filters.businessInfoId };
  }
  if (needsBusinessFilter) {
    include.required = true;
  }
  // return include;
}

function buildEmployeeBusinessInclude(filters = {}) {
  const include = {
    model: BusinessInfo,
    as: 'businessInfo',
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

function buildOwnerInclude(filters,{includeBusiness = true} ) {
  let includes =  [
      { model: PersonInfo, as: 'person' },
    ];
    if(includeBusiness){
      includes.push(buildBusinessInclude(filters));
    }

  const ownerInclude = {
    // where: { ...ownerFilters },
    model: BusinessOwner,
    as: 'owner',
    include: includes
  };
    // const ownerInclude = {
    //       model: BusinessOwner,
    //       as: 'owners',
    //       attributes: ['id'],
    //       through: { attributes: [] },
    //       include: [
    //         { model: PersonInfo, as: 'person' },
    //         buildBusinessInclude(filters),
    //       ],
    //       required: true,
    //     }
  if (filters.businessOwnerId) {
    ownerInclude.where = { id: filters.businessOwnerId };
  }
  if (filters.businessOwnerId || filters.businessInfoId || filters.businessTypeId) {
    ownerInclude.required = true;
  }
  return ownerInclude;
}

function buildFullInclude(filters = {}, personOptions = {},{includeOwnerBusiness = true} ) {
  const personInclude = { model: PersonInfo, as: 'person' };
  if (personOptions.where) {
    personInclude.where = personOptions.where;
  }
  return [personInclude, buildEmployeeBusinessInclude(filters), buildOwnerInclude(filters, { includeBusiness: includeOwnerBusiness })];
}

function buildOwnerListInclude(filters = {}, personWhere = {}) {
  const personInclude = { model: PersonInfo, as: 'person', where: { is_active: true, ...personWhere } };
  const businessTypeInclude = buildBusinessTypeInclude(filters);
  const businessInclude = {
    model: BusinessInfo,
    as: 'businesses',
    through: { attributes: [] },
    include: [businessTypeInclude],
  };
  if (filters.businessInfoId) {
    businessInclude.where = { id: filters.businessInfoId };
    businessInclude.required = true;
  }
  return [personInclude, businessInclude];
}

function extractOwnerFilters(query = {}) {
  return {
    businessInfoId: parsePositiveInt(query.business_info_id),
    businessTypeId: parsePositiveInt(query.business_type_id),
  };
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

    //Pagination,Search,Filter ,Added for getAllOwners
    const { limit, offset, page } = getPaginationOptions(req.query);
    const filters = extractOwnerFilters(req.query);
    const searchTerm = getSearchTerm(req.query);
    const personWhere = buildPersonSearchWhere({ searchTerm, onlyActive: true });
    const result = await BusinessOwner.findAndCountAll({
      include: buildOwnerListInclude(filters, personWhere),
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
      name, phone, nrc_number, active_address, business_owner_id, business_info_id,
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
    const ownerCandidate = business_owner_id !== undefined ? parsePositiveInt(business_owner_id) : undefined;
    if (business_owner_id !== undefined && !ownerCandidate) {
      return error(res, 'business_owner_id must be a positive integer', 400);
    }
    const businessCandidate = business_info_id !== undefined ? parsePositiveInt(business_info_id) : undefined;
    if (business_info_id !== undefined && !businessCandidate) {
      return error(res, 'business_info_id must be a positive integer', 400);
    }

    const ownerChanged = ownerCandidate !== undefined && ownerCandidate !== employee.business_owner_id;
    const businessChanged = businessCandidate !== undefined && businessCandidate !== employee.business_info_id;

    if (ownerChanged) {
      employeeUpdates.business_owner_id = ownerCandidate;
    }
    if (businessChanged) {
      employeeUpdates.business_info_id = businessCandidate;
    }

    if (ownerChanged || businessChanged) {
      const ownerIdToCheck = ownerChanged ? ownerCandidate : employee.business_owner_id;
      const businessIdToCheck = businessChanged ? businessCandidate : employee.business_info_id;

      const ownerForCheck = await BusinessOwner.findByPk(ownerIdToCheck);
      if (!ownerForCheck) return error(res, 'BusinessOwner not found', 404);

      const businessForCheck = await BusinessInfo.findByPk(businessIdToCheck);
      if (!businessForCheck) return error(res, 'BusinessInfo not found', 404);

      const ownsBusiness = await ownerForCheck.hasBusiness(businessForCheck);
      if (!ownsBusiness) {
        return error(res, 'BusinessOwner is not associated with this business_info_id', 400);
      }
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

// ── ADD TO ISSUE ──────────────────────────────────────────────
exports.addIssueCard = async (req, res) => {
  try {
    const {
      employee_ids,
    } = req.body;

    if (!employee_ids) return error(res, 'employee_ids is required', 400);

    const employeeIds = parseEmployeeIds(req.body);
    console.log('Parsed employeeIds:', employeeIds);
    if (!employeeIds.length) {
      return error(res, 'At least one employeeIds is required for owner', 400);
    }

    const employees = await EmployeeInfo.findAll({ where: { id: employeeIds } });
    console.log('Found employees for IDs:', employees.map(e => e.id));
    if (employees.length !== employeeIds.length) {
      return error(res, 'One or more EmployeeInfo records not found', 404);
    }

    //Prevent duplicate TO_ISSUE cards for the same employee
    const existingCards = await CardIssue.findAll({
      where: {
        employee_id: employeeIds,
        status: 'TO_ISSUE',
      },
    });
    const existingEmployeeIds = new Set(existingCards.map(card => card.employee_id));
    const filteredEmployeeIds = employeeIds.filter(id => !existingEmployeeIds.has(id));

    if (!filteredEmployeeIds.length) {
      return error(res, 'All specified employees already have a TO_ISSUE card', 400);
    }

    let employeeCards = [];
    for (let index = 0; index < filteredEmployeeIds.length; index++) {
      const employee_id = filteredEmployeeIds[index];
      const Card = await CardIssue.create({
        employee_id: employee_id,
        status: ISSUE_STATUS.includes('TO_ISSUE') ? 'TO_ISSUE' : ISSUE_STATUS[0],
      });

      employeeCards.push(employee_id)

    }

    return success(res, { employeeCards }, 'Cards added', 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

//UPDATE STATUS TO ISSUED
exports.updateIssueCard = async (req, res) => {
  try {
    const { card_issue_id } = req.params;

    const cardIssue = await CardIssue.findByPk(card_issue_id);
    if (!cardIssue) return error(res, 'CardIssue record not found', 404);

    await cardIssue.update({ status: 'ISSUED' });

    return success(res, cardIssue, 'Card status updated to ISSUED');
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

//GET ALL CARDS TO ISSUE
exports.getCardsToIssue = async (req, res) => {
  try {
    const { limit, offset, page } = getPaginationOptions(req.query);
    const filters = extractEmployeeFilters(req.query);
    const searchTerm = getSearchTerm(req.query);
    const personWhere = buildPersonSearchWhere({ searchTerm });
    
    const result = await CardIssue.findAndCountAll({
      where: { status: 'TO_ISSUE' },
      include: {
        model: EmployeeInfo,
        as: 'employee',
        required: true,
        include: buildFullInclude(filters, personWhere ? { where: personWhere } : undefined,{includeOwnerBusiness: false}),
      },
      limit,
      offset,
    });

    console.log('Cards to issue result:', result);
    result.count= result.rows.length; // Override count to reflect actual number of records returned after filters
    return paginatedSuccess(res, result, { page, limit });
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
}

//GET ALL Employees with  issued cards count with filters and name search , pagination
exports.getEmployeesWithIssuedCards = async (req, res) => {
  try {
    const { limit, offset, page } = getPaginationOptions(req.query);
    const filters = extractEmployeeFilters(req.query);
    const searchTerm = getSearchTerm(req.query);
    const personWhere = buildPersonSearchWhere({ searchTerm });

    const result = await EmployeeInfo.findAndCountAll({
      include: [
        ...buildFullInclude(filters, personWhere ? { where: personWhere } : undefined),
        {
          model: CardIssue,
          as: 'cardIssues',
          where: { status: 'ISSUED' },
          required: false,
        },
      ],
      limit,
      offset,
      distinct: true,
    });

    // Map the result to include issued cards count
    const mappedResult = {
      count: result.count,
      rows: result.rows.map(employee => ({
        ...employee.toJSON(),
        issuedCardsCount: employee.cardIssues ? employee.cardIssues.length : 0,
      })),
    };

    return paginatedSuccess(res, mappedResult, { page, limit });
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
}


function parseEmployeeIds(payload = {}) {
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
          console.warn('Invalid employee_ids payload', err);
        }
      }
      trimmed.split(',').forEach((item) => addValue(item));
      return;
    }
    addValue(value);
  };

  collect(payload.employee_ids);
  if (payload.employee_id !== undefined && payload.employee_id !== null) {
    addValue(payload.employee_id);
  }

  return Array.from(ids);
}

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
    const isActive = employee.person?.is_active === true;
    const businessRecord = employee.businessInfo || employee.owner?.businesses?.[0];
    const businessTypeRecord = businessRecord?.businessType;

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
        id: employee.id,
        name: employee.person?.name,
        phone: employee.person?.phone,
        nrc_number: employee.person?.nrc_number,
        profile_photo: employee.person?.profile_photo,
        active_address: employee.person?.active_address,
        is_active: isActive,
        owner: employee.owner?.person?.name,
        business: businessRecord?.name,
        business_type: businessTypeRecord?.name,
        business_info_id: businessRecord?.id ?? employee.business_info_id,
        business_info: businessRecord,
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
