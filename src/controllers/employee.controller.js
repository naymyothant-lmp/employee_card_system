const {
  EmployeeInfo,
  PersonInfo,
  BusinessOwner,
  BusinessInfo,
  BusinessType,
} = require('../models');
const { decryptCode } = require('../utils/encrypt');
const { success, error } = require('../utils/response');

// ── Full include chain ────────────────────────────────────────
const fullInclude = [
  {
    model: PersonInfo,
    as: 'person',
  },
  {
    model: BusinessOwner,
    as: 'owner',
    include: [
      { model: PersonInfo, as: 'person' },
      {
        model: BusinessInfo,
        as: 'business',
        include: [{ model: BusinessType, as: 'businessType' }],
      },
    ],
  },
];

// ── Get all employees (with full business info chain) ─────────
exports.getAllWithBusinessInfo = async (req, res) => {
  try {
    const employees = await EmployeeInfo.findAll({ include: fullInclude });
    return success(res, employees);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

// ── Get employees filtered by business_info_id ────────────────
exports.getByBusinessInfo = async (req, res) => {
  try {
    const { business_info_id } = req.params;

    const employees = await EmployeeInfo.findAll({
      include: [
        { model: PersonInfo, as: 'person' },
        {
          model: BusinessOwner,
          as: 'owner',
          required: true,
          where: { business_info_id },
          include: [
            { model: PersonInfo, as: 'person' },
            {
              model: BusinessInfo,
              as: 'business',
              include: [{ model: BusinessType, as: 'businessType' }],
            },
          ],
        },
      ],
    });

    return success(res, employees);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

// ── Get employees filtered by business_owner_id ───────────────
exports.getByOwner = async (req, res) => {
  try {
    const { owner_id } = req.params;

    const employees = await EmployeeInfo.findAll({
      where: { business_owner_id: owner_id },
      include: fullInclude,
    });

    return success(res, employees);
  } catch (err) {
    console.error(err);
    return error(res, 'Server error', 500);
  }
};

// ── Get single employee by ID ─────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const employee = await EmployeeInfo.findByPk(req.params.id, {
      include: fullInclude,
    });
    if (!employee) return error(res, 'Employee not found', 404);
    return success(res, employee);
  } catch (err) {
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
      include: fullInclude,
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
