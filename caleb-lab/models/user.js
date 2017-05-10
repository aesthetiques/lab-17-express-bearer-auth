'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const mongoose = require('mongoose');
const createError = require('http-errors');
const debug = require('debug')('cfgram:user-model');

const Schema = mongoose.Schema;

const userSchema = Schema({
  username: {type: String, required: true, unique: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  findhash: {type: String, unique: true},
});

userSchema.methods.generatePasswordHash = function(password){
  debug('#generatePasswordHash');

  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if(err) return reject(createError(401,'password hash failed'));
      this.password = hash;
      resolve(this);
    });
  });
};

userSchema.methods.comparePasswordHash = function(password){
  debug('#comparePassword');

  return new Promise((resolve, reject) => {
    bcrypt.compare(password, this.password, (err, valid) => {
      if(err) return reject(createError(401, 'Password validataion failed'));
      if(!valid) return reject(createError(401, 'wrong password, you n\'wah '));

      resolve(this);
    });
  });
};

userSchema.methods.generateFindHash = function(){
  debug('#generateFindHash');

  return new Promise((resolve, reject) => {
    let tries = 0;

    let _generateFindHash = () => {
      this.findhash = crypto.randomBytes(32).toString('hex');
      this.save()
      .then(() => resolve(this.findhash))
      .catch(err => {//potentially need err as a single param here. doubtful, since wwe don't use it.
        console.log(err);
        if(tries > 3) return reject(createError(401, 'Generate findhash failed.'));
        tries ++;
        _generateFindHash();
      });
    };

    _generateFindHash();
  });
};

userSchema.methods.generateToken = function(){
  debug('#generateToken');

  return new Promise((resolve, reject) => {
    this.generateFindHash()
    .then(findHash => resolve(jwt.sign({token: findHash}, process.env.APP_SECRET)))
    .then(token => resolve(token))
    .catch(err => {
      console.log(err);
      reject(createError(401, 'Generate Token Failed'));
    });
    resolve(this);
  });
};

module.exports = mongoose.model('user', userSchema);
