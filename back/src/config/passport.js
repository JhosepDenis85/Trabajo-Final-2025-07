const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const Role = require('../models/role.model');

const CLIENT_ID = process.env.CLIENTID;
const CLIENT_SECRET = process.env.SECRETID;
// Valor crudo por si el entorno local define explícitamente un callback
const RAW_CALLBACK = process.env.GOOGLE_CALLBACK_URL || process.env.CALLBACKURL_BACK;

// Avisos mínimos (no detiene ejecución)
if (!CLIENT_ID) console.warn('[OAuth] Falta CLIENTID en .env');
if (!CLIENT_SECRET) console.warn('[OAuth] Falta SECRETID en .env');

function resolveCallbackURL() {
  // Si estamos en Render usamos siempre el host público para evitar volver a localhost
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/api/auth/google/callback`;
  }
  // Si no estamos en Render y existe un callback explícito lo usamos
  if (RAW_CALLBACK) return RAW_CALLBACK;
  // Fallback local
  const port = process.env.PORT || 6969;
  const base = process.env.HOST_URL || `http://localhost:${port}`;
  return `${base}/api/auth/google/callback`;
}


// Asegura existencia rol 'user' si aún no se creó
async function ensureRoleUser() {
  let roleUser = await Role.findOne({ name: 'user' });
  if (!roleUser) roleUser = await Role.create({ name: 'user' });
  return roleUser;
}


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const u = await User.findById(id);
    done(null, u);
  } catch (e) {
    done(e);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: resolveCallbackURL()
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value)
          ? profile.emails[0].value.toLowerCase()
          : '';
        if (!email) return done(new Error('Email no provisto por Google'));

        let user = await User.findOne({ email });
        if (!user) {
          const roleUser = await Role.findOne({ name: 'user' });
          user = await User.create({
            username: email.split('@')[0],
            email,
            password: null,
            provider: 'google',
            roles: roleUser ? [roleUser._id] : []
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;