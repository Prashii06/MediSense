// config/storage.js
const storage = process.env.NODE_ENV === 'development' 
  ? require('./localStorage') 
  : require('./cosStorage');

module.exports = storage;