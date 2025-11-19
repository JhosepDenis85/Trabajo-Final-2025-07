const { Router } = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authJwt = require('../middelwares/authJwt');
const verifySignUp = require('../middelwares/verifySignUp');

const router = Router();

// Local
router.post('/auth/validate', authController.validate);
router.post('/auth/signup', verifySignUp.checkDuplicateUsernameOrEmail, authController.signup);
router.post('/auth/signin', authController.signin);
router.get('/auth/profile', authJwt.verifyToken, authController.profile);

// Google OAuth: inicia login
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

// Google OAuth: callback
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failed?reason=oauth' }),
  authController.googleCallback
);

// Éxito / error
router.get('/auth/success', authController.authSuccessPage);
router.get('/auth/failed', authController.authFailedPage);

module.exports = router;