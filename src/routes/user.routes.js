const { Router } = require('express');
const authJwt = require('../middelwares/authJwt');
const { isAdmin } = require('../middelwares/roles');
const controller = require('../controllers/user.controller');

const router = Router();

// Cabeceras básicas (CORS sencillo)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
  next();
});

// ===== ENDPOINTS ORIGINALES DE TEST =====
router.get('/test/all', controller.allAccess);
router.get('/test/user', authJwt.verifyToken, controller.onlyUser);
router.get('/test/moderator', authJwt.verifyToken, authJwt.isModerator, controller.onlyModerator);
router.get('/test/admin', authJwt.verifyToken, authJwt.isAdmin, controller.onlyAdmin);

// ===== NUEVOS ENDPOINTS USUARIOS (ROLES) =====
// Listar todos (admin)
router.get('/users', authJwt.verifyToken, isAdmin, controller.listUsers);

// Obtener por id
router.get('/users/:id', authJwt.verifyToken, controller.getUserById);

// Actualizar roles (admin) Body: { "roles": ["admin"] }
router.put('/users/:id', authJwt.verifyToken, isAdmin, controller.updateUserRoles);

module.exports = router;