const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const Role = require('../models/role.model');

const CLIENT_ID = process.env.CLIENTID;
const CLIENT_SECRET = process.env.SECRETID;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || process.env.CALLBACKURL_BACK;

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
      callbackURL: CALLBACK_URL
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