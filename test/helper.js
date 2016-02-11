var chai = require('chai');
var assert = require('assert');
var expect = chai.expect;
var Connection = require('mongodb-connection-model');

module.exports.chai = chai;
module.exports.assert = assert;
module.exports.expect = expect;

module.exports.connection =
  new Connection({ hostname: '127.0.0.1', port: 27018, ns: 'data-service' });

module.exports.insertTestDocuments = function(client) {
  var collection = client.database.collection('test');
  collection.insertMany([{ a: 1 }, { a: 2 }]);
};

module.exports.deleteTestDocuments = function(client) {
  var collection = client.database.collection('test');
  collection.deleteMany();
};
