const fs = require('fs');
const path = require('path');
const https = require('https');
const helmet = require('helmet');
const express = require('express');
require('dotenv').config();
const passport = require('passport');
const {Strategy} = require('passport-google-oauth20')

const PORT = process.env.APP_PORT || 3000;
const config = {
  GOOGLE_CID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CS: process.env.GOOGLE_CLIENT_SECRET,
}

const AUTH_OPTIONS = {
  callbackURL: '/auth/google/callback',
  clientID: config.GOOGLE_CID,
  clientSecret: config.GOOGLE_CS,
}

function verifyCallback(accessToken, refreshToken, profile, done) {
  console.log('Google profile', profile);
  done(null, profile);
}

passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));

const app = express();

app.use(helmet());
app.use(passport.initialize());

function checkLoggedIn(req, res, next) {
  const isLoggedIn = true; // TODO
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
    session: false,
  }),
  (req, res) => {
    console.log('Google called us back!');
  }
);

app.get('/auth/logout', (req, res) => {});

app.get('/secret', checkLoggedIn, (req, res) => {
  return res.send(`... Secret is 42!`);
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
