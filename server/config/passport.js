const passport = require('passport');
const User = require('../models/User');

// Validate environment variables
const validateGoogleOAuthConfig = () => {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
  const missing = required.filter(key => {
    if (!process.env[key]) return true;
    if (process.env[key].includes('your_')) return true;
    if (key === 'GOOGLE_CALLBACK_URL' && process.env.NODE_ENV === 'production' && process.env[key].includes('localhost')) return true;
    return false;
  });
  
  if (missing.length > 0) {
    console.warn(`⚠️  Google OAuth will not work. Missing or invalid config: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

if (validateGoogleOAuthConfig()) {
  const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value.toLowerCase()
              : null;

          const avatar =
            profile.photos && profile.photos[0]
              ? profile.photos[0].value
              : undefined;

          const requestedRole = req?.cookies?.oauth_role === 'organizer' ? 'organizer' : 'attendee';

          let user = await User.findOne({ googleId: profile.id });

          if (!user && email) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              if (!user.avatar && avatar) user.avatar = avatar;
              user.isVerified = true;
              await user.save({ validateBeforeSave: false });
            }
          }

          if (!user) {
            const userFields = {
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatar,
              isVerified: true,
              role: requestedRole,
            };

            if (requestedRole === 'organizer') {
              userFields.approvalStatus = 'pending';
              userFields.approved = false;
            }

            user = await User.create(userFields);
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  console.log('✅ Google OAuth strategy loaded');
} else {
  console.log('⚠️  Google OAuth skipped — credentials not set or invalid');
}

module.exports = passport;