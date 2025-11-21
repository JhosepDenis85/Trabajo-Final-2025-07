const { Router } = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authJwt = require('../middelwares/authJwt');
const verifySignUp = require('../middelwares/verifySignUp');

const router = Router();

/*
 Mantienes las rutas originales con prefijo /auth (compatibilidad)
 pero se crean alias sin /auth para evitar /api/auth/auth/... y permitir
 endpoints estándar: /api/auth/signup, /api/auth/google, etc.
*/

// Rutas originales (se conservan)
router.post('/auth/validate', authController.validate);
router.post('/auth/signup', verifySignUp.checkDuplicateUsernameOrEmail, authController.signup);
router.post('/auth/signin', authController.signin);
router.get('/auth/profile', authJwt.verifyToken, authController.profile);
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failed?reason=oauth' }),
  authController.googleCallback
);
router.get('/auth/success', authController.authSuccessPage);
router.get('/auth/failed', authController.authFailedPage);

// Alias sin prefijo /auth (nuevos)
router.post('/validate', authController.validate);
router.post('/signup', verifySignUp.checkDuplicateUsernameOrEmail, authController.signup);
router.post('/signin', authController.signin);
router.get('/profile', authJwt.verifyToken, authController.profile);

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failed?reason=oauth' }),
  authController.googleCallback
);

router.get('/success', authController.authSuccessPage);
router.get('/failed', authController.authFailedPage);

module.exports = router;