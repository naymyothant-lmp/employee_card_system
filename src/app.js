require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { sequelize } = require('./models');

// Routes
const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const businessTypeRoutes = require('./routes/businessType.routes');
const businessInfoRoutes = require('./routes/businessInfo.routes');
const personRoutes       = require('./routes/person.routes');
const employeeRoutes     = require('./routes/employee.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/business-types', businessTypeRoutes);
app.use('/api/businesses',     businessInfoRoutes);
app.use('/api/persons',        personRoutes);
app.use('/api/employees',      employeeRoutes);

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'MCDC Employee Card System' })
);

// 404
//TODO::Re-enable
// app.use((req, res) =>
//   res.status(404).json({ success: false, message: 'Route not found' })
// );

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connected');
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    app.listen(PORT, () =>
      
      console.log(`🚀 MCDC server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  });
