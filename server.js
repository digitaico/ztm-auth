const fs = require('fs');
const path = require('path');
const https = require('https');
const helmet = require('helmet');
const express = require('express');
require('dotenv').config();
const passport = require('passport');
const {Strategy} = require('passport-google-oauth20')
const cookieSession = require('cookie-session');

const PORT = process.env.APP_PORT || 3000;
const config = {
  GOOGLE_CID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CS: process.env.GOOGLE_CLIENT_SECRET,
  SESSION_SECKEY: process.env.CLIENT_SESSION_SECRET_KEY,
  SESSION_ROTATED_SECKEY: process.env.CLIENT_SESSION_ROTATED_SECRET_KEY,
}

const GOOGLE_AUTH_OPTIONS = {
  callbackURL: '/auth/google/callback',
  clientID: config.GOOGLE_CID,
  clientSecret: config.GOOGLE_CS,
}

function verifyCallback(accessToken, refreshToken, profile, done) {
  console.log('Google profile', profile);
  done(null, profile);
}

passport.use(new Strategy(GOOGLE_AUTH_OPTIONS, verifyCallback));

// Save the session to cookie
passport.serializeUser((user, done) => {
  done(null, {
    id: user.id,
    email: user.emails[0],
    name: user.name
  });
});

// Read session content
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

const app = express();

app.use(helmet());
app.use(cookieSession({
  name: 'session',
  maxAge: 24 * 60 * 60 * 1000,
  keys: [config.SESSION_SECKEY, config.SESSION_ROTATED_SECKEY]
}));

app.use(passport.initialize());
app.use(passport.session());

function checkLoggedIn(req, res, next) {
  const isLoggedIn = req.isAuthenticated() && req.user;
  if (!isLoggedIn) {
    return res.status(401).json({
      error: 'You must be logged in!'
    });
  }
  next();
};

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['email', 'profile'],
  }),
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/failure',
    successRedirect: '/',
    session: true,
  }),
  (req, res) => {
    console.log('Google called us back!');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout();
  return res.redirect('/');
});

app.get('/secret', checkLoggedIn, (req, res) => {
  return res.send(`... Secret is 42!`);
});

app.get('/about', checkLoggedIn, (req, res) => {
  return res.send(`... Hola Somo SoJo!`);
});

app.get('/failure', (req, res) => {
  return res.send('...Failed to Log in !! - jea');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}, app).listen(PORT, () => {
  console.log(`... listening on port ${PORT}`);
});
