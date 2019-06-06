const passport = require('passport');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;

const authenticationMiddleware = require('./middleware');


const user = {
    username: 'test',
    userpasswd: '12345',
    id: 1
  }


  function findUser (username, callback) {
    if (username === user.username) {
      return callback(null, user)
    }
    return callback(null)
  }
  
  passport.serializeUser(function (user, cb) {
    cb(null, user.username)
  })
  
  passport.deserializeUser(function (username, cb) {
    findUser(username, cb)
  })
  
  function initPassport () {
    passport.use(new LocalStrategy(
      (username, password, done) => {
        findUser(username, (err, user) => {
          if (err) {
            return done(err)
          }
  
          // User not found
          if (!user) {
            console.log('User not found')
            return done(null, false, { message: 'Invalid user' } );
          }
  
          if ( user.userpasswd !== password ) {
            return done( null, false, { message: 'Invalid password' } );
          };          
          /*
          // Always use hashed passwords and fixed time comparison
          bcrypt.compare(password, user.passwordHash, (err, isValid) => {
            if (err) {
              return done(err)
            }
            if (!isValid) {
              return done(null, false)
            }
            return done(null, user)
          })*/



        })
      }
    ))
  
    passport.authenticationMiddleware = authenticationMiddleware
  }
  
  module.exports = initPassport