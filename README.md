# MCDC Employee Card System — Backend API

Node.js · Express · Sequelize · MySQL

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DB credentials

# 3. Seed database (creates tables + default business types + SuperAdmin)
npm run seed

# 4. Start server
npm run dev        # development (nodemon)
npm start          # production
```

Default SuperAdmin credentials after seeding:
- **Username**: `superadmin`
- **Password**: `Admin@1234`

---

## User Roles & Permissions

| Action              | SuperAdmin | Admin | Operator |
|---------------------|:----------:|:-----:|:--------:|
| Create User         | ✅          | ❌     | ❌        |
| Create Business     | ✅          | ✅     | ❌        |
| Create Owner        | ✅          | ✅     | ❌        |
| Create Employee     | ✅          | ✅     | ✅        |
| Toggle Active       | ✅          | ✅     | ❌        |
| View All            | ✅          | ✅     | ✅        |

---

## API Endpoints

### Auth
| Method | URL              | Body                          | Auth |
|--------|------------------|-------------------------------|------|
| POST   | /api/auth/login  | `{user_name, password}`       | None |

### Users (SuperAdmin only for create)
| Method | URL         | Body                                         |
|--------|-------------|----------------------------------------------|
| POST   | /api/users  | `{user_name, password, phone, user_type}`    |
| GET    | /api/users  | —                                            |

`user_type` options: `SuperAdmin` · `Admin` · `Operator`

### Business Types
| Method | URL                  | Body     |
|--------|----------------------|----------|
| GET    | /api/business-types  | —        |
| POST   | /api/business-types  | `{name}` |

### Businesses (BusinessInfo)
| Method | URL               | Body                                       |
|--------|-------------------|--------------------------------------------|
| POST   | /api/businesses   | `{business_type_id, name, location}`       |
| GET    | /api/businesses   | —                                          |
| GET    | /api/businesses/:id | —                                        |

### Persons — Create Owner
`POST /api/persons/owner`  
Form-data (multipart):

| Field             | Type   | Required |
|-------------------|--------|----------|
| name              | string | ✅        |
| business_info_id  | number | ✅        |
| phone             | string |          |
| nrc_number        | string |          |
| active_address    | string |          |
| profile_photo     | file   |          |
| nrc_front_photo   | file   |          |
| nrc_back_photo    | file   |          |

### Persons — Create Employee
`POST /api/persons/employee`  
Form-data (multipart):

| Field              | Type   | Required |
|--------------------|--------|----------|
| name               | string | ✅        |
| business_owner_id  | number | ✅        |
| phone              | string |          |
| nrc_number         | string |          |
| active_address     | string |          |
| profile_photo      | file   |          |
| nrc_front_photo    | file   |          |
| nrc_back_photo     | file   |          |

### Employees
| Method | URL                                          | Description                        |
|--------|----------------------------------------------|------------------------------------|
| GET    | /api/employees                               | All employees with full info       |
| GET    | /api/employees/:id                           | Single employee                    |
| GET    | /api/employees/by-business/:business_info_id | Employees by business              |
| GET    | /api/employees/by-owner/:owner_id            | Employees by owner                 |
| PATCH  | /api/employees/:id/toggle-active             | Activate / deactivate              |
| POST   | /api/employees/verify                        | Verify by encrypted card code      |

### Verify Endpoint
`POST /api/employees/verify`

```json
{ "code": "<encrypted_card_code>" }
```

Response:
```json
{
  "success": true,
  "isValid": true,
  "isExist": true,
  "isActive": true,
  "message": "Employee is active and verified",
  "employee": {
    "id": 1,
    "name": "Mg Mg",
    "phone": "09...",
    "nrc_number": "...",
    "profile_photo": "/uploads/photos/...",
    "is_active": true,
    "owner": "U Ko Ko",
    "business": "ညောင်ပင်ဈေး",
    "business_type": "လမ်းဘေးဈေးကောက် ကောက်ခံခွင့်လုပ်ငန်း"
  }
}
```

---

## Folder Structure

```
mcdc-backend/
├── src/
│   ├── app.js                          # Entry point
│   ├── config/
│   │   └── db.config.js                # Sequelize config
│   ├── models/
│   │   ├── index.js                    # Model loader + associations
│   │   ├── BusinessType.js
│   │   ├── BusinessInfo.js
│   │   ├── PersonInfo.js
│   │   ├── BusinessOwner.js
│   │   ├── EmployeeInfo.js
│   │   └── User.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── businessType.controller.js
│   │   ├── businessInfo.controller.js
│   │   ├── person.controller.js        # Owner + Employee creation
│   │   └── employee.controller.js      # Get, verify, toggle
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── businessType.routes.js
│   │   ├── businessInfo.routes.js
│   │   ├── person.routes.js
│   │   └── employee.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js          # JWT verify + role check
│   │   └── upload.middleware.js        # Multer photo upload
│   ├── utils/
│   │   ├── encrypt.js                  # AES card code gen/decrypt
│   │   └── response.js                 # Unified JSON responses
│   └── seeders/
│       └── seed.js                     # DB seed script
├── uploads/
│   └── photos/                         # Uploaded images (gitignored)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Encrypted Card Code

Each employee gets a unique card code generated at creation time:

```
generateEncryptedCode(employeeId)
  → AES encrypt "MCDC:<id>:<timestamp>" with ENCRYPT_SECRET
  → Base64url encode
```

The verify endpoint decrypts the code, extracts the employee ID, then checks `isExist` and `isActive`.
