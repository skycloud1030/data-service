var helper = require('./helper');

var assert = helper.assert;
var expect = helper.expect;
var eventStream = helper.eventStream;
var ObjectId = require('bson').ObjectId;

var DataService = require('../lib/data-service');

describe('DataService', function() {
  var service = new DataService(helper.connection);

  before(require('mongodb-runner/mocha/before')({
    port: 27018
  }));
  after(require('mongodb-runner/mocha/after')());

  before(function(done) {
    service.connect(done);
  });

  describe('#deleteOne', function() {
    it('deletes the document from the collection', function(done) {
      service.insertOne('data-service.test', {
        a: 500
      }, {}, function(err) {
        assert.equal(null, err);
        service.deleteOne('data-service.test', {
          a: 500
        }, {}, function(er) {
          assert.equal(null, er);
          service.find('data-service.test', {
            a: 500
          }, {}, function(error, docs) {
            assert.equal(null, error);
            expect(docs.length).to.equal(0);
            done();
          });
        });
      });
    });
  });

  describe('#dropCollection', function() {
    before(function(done) {
      service.client.database.createCollection('bar', {}, function(error) {
        assert.equal(null, error);
        done();
      });
    });

    it('drops a collection', function(done) {
      const dbName = 'data-service';
      service.dropCollection(`${dbName}.bar`, function(error) {
        assert.equal(null, error);
        service.listCollections(dbName, {}, function(err, items) {
          assert.equal(null, err);
          expect(items).to.not.include({name: 'bar', options: {}});
          done();
        });
      });
    });
  });

  describe('#dropDatabase', function() {
    before(function(done) {
      service.client.database.db('mangoDB').createCollection('testing',
      {}, function(error) {
        assert.equal(null, error);
        done();
      });
    });

    it('drops a database', function(done) {
      service.dropDatabase('mangoDB', function(error) {
        assert.equal(null, error);
        helper.listDatabases(service.client, function(err, dbs) {
          assert.equal(null, err);
          expect(dbs).to.not.have.property({name: 'mangoDB'});
          done();
        });
      });
    });
  });

  describe('#dropIndex', function() {
    before(function(done) {
      service.client.database.collection('test').createIndex({
        a: 1
      }, {}, function(error) {
        assert.equal(null, error);
        done();
      });
    });

    it('removes an index from a collection', function(done) {
      const namespace = 'data-service.test';
      service.dropIndex(namespace, 'a_1', function(error) {
        assert.equal(null, error);
        service.indexes(namespace, {}, function(err, indexes) {
          assert.equal(null, err);
          expect(indexes).to.not.have.property({name: 'a_1'});
          done();
        });
      });
    });
  });

  describe('#deleteMany', function() {
    it('deletes the document from the collection', function(done) {
      service.insertOne('data-service.test', {
        a: 500
      }, {}, function(err) {
        assert.equal(null, err);
        service.deleteMany('data-service.test', {
          a: 500
        }, {}, function(er) {
          assert.equal(null, er);
          service.find('data-service.test', {
            a: 500
          }, {}, function(error, docs) {
            assert.equal(null, error);
            expect(docs.length).to.equal(0);
            done();
          });
        });
      });
    });
  });

  describe('#aggregate', function() {
    before(function(done) {
      helper.insertTestDocuments(service.client, function() {
        done();
      });
    });

    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    it('returns a cursor for the documents', function(done) {
      var count = 0;
      service.aggregate('data-service.test',
        [{$match: {}}, {$group: {_id: '$a', total: {$sum: '$a'} } }],
        {'cursor': { batchSize: 10000 }}
      ).forEach(function() { count++; }, function(err) {
        assert.equal(null, err);
        expect(count).to.equal(2);
        done();
      });
    });
    it('returns null, calls callback', function(done) {
      service.aggregate('data-service.test',
        [{$match: {}}, {$group: {_id: '$a', total: {$sum: '$a'} } }],
        {},
        function(error, result) {
          assert.equal(null, error);
          expect(result.length).to.equal(2);
          done();
        });
    });
  });

  describe('#find', function() {
    before(function(done) {
      helper.insertTestDocuments(service.client, function() {
        done();
      });
    });

    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    it('returns a cursor for the documents', function(done) {
      service.find('data-service.test', {}, {
        skip: 1
      }, function(error, docs) {
        assert.equal(null, error);
        expect(docs.length).to.equal(1);
        done();
      });
    });
  });

  describe('#findOneAndReplace', function() {
    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    var id = new ObjectId();

    it('returns the updated document', function(done) {
      service.insertOne('data-service.test', {
        _id: id,
        a: 500
      }, {}, function(err) {
        assert.equal(null, err);
        service.findOneAndReplace(
          'data-service.test',
          {
            _id: id
          },
          {
            b: 5
          },
          {
            returnOriginal: false
          }, function(error, result) {
            expect(error).to.equal(null);
            expect(result._id.toString()).to.deep.equal(id.toString());
            expect(result.b).to.equal(5);
            expect(result.hasOwnProperty('a')).to.equal(false);
            done();
          }
        );
      });
    });
  });

  describe('#collection', function() {
    it('returns the collection details', function(done) {
      service.collection('data-service.test', {}, function(err, coll) {
        assert.equal(null, err);
        expect(coll.ns).to.equal('data-service.test');
        expect(coll.index_count).to.equal(1);
        done();
      });
    });
  });

  describe('#listCollections', function() {
    it('returns the collections', function(done) {
      service.listCollections('data-service', {}, function(err, collections) {
        assert.equal(null, err);
        // For <3.2 system.indexes is returned with listCollections
        expect(collections.length).to.equal(1);
        expect(collections[0]).to.include.keys(['name', 'options']);
        expect(collections[0].name).to.equal('test');
        expect(collections[0].options).to.deep.equal({});
        done();
      });
    });
  });

  describe('#updateCollection', function() {
    it('returns the update result', function(done) {
      service.updateCollection('data-service.test', {}, function(err, result) {
        assert.equal(null, err);
        expect(result.ok).to.equal(1.0);
        done();
      });
    });
  });

  describe('#count', function() {
    context('when a filter is provided', function() {
      it('returns a count for the matching documents', function(done) {
        service.count('data-service.test', {
          a: 1
        }, {}, function(error, count) {
          assert.equal(null, error);
          expect(count).to.equal(0);
          done();
        });
      });
    });
  });

  describe('#shardedCollectionDetail', function() {
    it('returns the collection details', function(done) {
      service.shardedCollectionDetail('data-service.test', function(err, detail) {
        assert.equal(null, err);
        expect(detail.ns).to.equal('data-service.test');
        expect(detail.index_count).to.equal(1);
        done();
      });
    });
  });

  describe('#database', function() {
    it('returns the database details', function(done) {
      service.database('data-service', {}, function(err, database) {
        assert.equal(null, err);
        expect(database._id).to.equal('data-service');
        expect(database.stats.document_count).to.not.equal(undefined);
        done();
      });
    });
  });

  describe('#disconnect', function() {
    after(function(done) {
      service.connect(done);
    });

    it('disconnects the database', function(done) {
      service.disconnect();
      service.count('data-service.test', {}, {}, function(error) {
        expect(error.message).to.equal('topology was destroyed');
        done();
      });
    });
  });

  describe('#createCollection', function() {
    after(function(done) {
      service.client.database.dropCollection('foo', {}, function(error) {
        assert.equal(null, error);
        done();
      });
    });

    it('creates a new collection', function(done) {
      var options = {};
      service.createCollection('data-service.foo', options, function(error) {
        assert.equal(null, error);
        service.listCollections('data-service', {}, function(err, items) {
          assert.equal(null, err);
          // For <3.2 system.indexes is returned with listCollections
          expect(items.length).to.equal(2);
          expect(items[0]).to.include.keys(['name', 'options']);
          expect(items[1]).to.include.keys(['name', 'options']);
          expect(items[0].options).to.deep.equal({});
          expect(items[1].options).to.deep.equal({});
          if (items[0].name === 'foo') {
            expect(items[1].name).to.equal('test');
          } else if (items[0].name === 'test') {
            expect(items[1].name).to.equal('foo');
          } else {
            assert(false, 'Collection returned from listCollections has incorrect name');
          }
          done();
        });
      });
    });
  });

  describe('#createIndex', function() {
    after(function(done) {
      var testCollection = service.client.database.collection('test');
      testCollection.dropIndex('a_1', {}, function() {
        testCollection.dropIndex('b_1', {}, function() {
          testCollection.dropIndex('a_-1_b_1', {}, function() {
            done();
          });
        });
      });
    });

    context('when options are provided', function() {
      it('creates a new index with the provided options', function(done) {
        const namespace = 'data-service.test';
        var spec = {a: 1};
        var options = {unique: true};
        service.createIndex(namespace, spec, options, function(error) {
          assert.equal(null, error);
          service.indexes(namespace, {}, function(err, indexes) {
            assert.equal(null, err);
            expect(indexes.length).to.equal(2);
            done();
          });
        });
      });
    });

    context('when no options are provided', function() {
      it('creates a new single index', function(done) {
        const namespace = 'data-service.test';
        var spec = {b: 1};
        var options = {};
        service.createIndex(namespace, spec, options, function(error) {
          assert.equal(null, error);
          service.indexes(namespace, {}, function(err, indexes) {
            assert.equal(null, err);
            expect(indexes.length).to.equal(3);
            done();
          });
        });
      });

      it('creates a new compound index', function(done) {
        const namespace = 'data-service.test';
        var spec = {a: -1, b: 1};
        var options = {};
        service.createIndex(namespace, spec, options, function(error) {
          assert.equal(null, error);
          service.indexes(namespace, {}, function(err, indexes) {
            assert.equal(null, err);
            expect(indexes.length).to.equal(4);
            done();
          });
        });
      });
    });
  });

  describe('#get', function() {
    context('when the url is /instance', function() {
      context('when passing options', function() {
        it('returns the instance details', function(done) {
          service.get('/instance', {}, function(err, instance) {
            assert.equal(null, err);
            expect(instance.host).to.not.equal(undefined);
            expect(instance.port).to.equal(27018);
            done();
          });
        });
      });

      context('when passing no options', function() {
        it('returns the instance details', function(done) {
          service.get('/instance', function(err, instance) {
            assert.equal(null, err);
            expect(instance.host).to.not.equal(undefined);
            expect(instance.port).to.equal(27018);
            done();
          });
        });
      });
    });

    context('when the url is /databases/:database', function() {
      context('when passing options', function() {
        it('returns the database details', function(done) {
          service.get('/databases/data-service', {}, function(err, database) {
            assert.equal(null, err);
            expect(database._id).to.equal('data-service');
            expect(database.stats.document_count).to.not.equal(undefined);
            done();
          });
        });
      });

      context('when passing no options', function() {
        it('returns the database details', function(done) {
          service.get('/databases/data-service', function(err, database) {
            assert.equal(null, err);
            expect(database._id).to.equal('data-service');
            expect(database.stats.document_count).to.not.equal(undefined);
            done();
          });
        });
      });
    });
  });

  describe('#instance', function() {
    it('returns the instance', function(done) {
      service.instance({}, function(err, instance) {
        assert.equal(null, err);
        expect(instance._id).to.not.equal(undefined);
        expect(instance.databases[0]._id).to.not.equal(undefined);
        done();
      });
    });
  });

  describe('#indexes', function() {
    it('returns the indexes', function(done) {
      service.indexes('data-service.test', {}, function(err, indexes) {
        assert.equal(null, err);
        expect(indexes[0].name).to.equal('_id_');
        expect(indexes[0].size).to.be.a('number');
        done();
      });
    });
  });

  describe('#insertOne', function() {
    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    it('inserts the document into the collection', function(done) {
      service.insertOne('data-service.test', {
        a: 500
      }, {}, function(err) {
        assert.equal(null, err);
        service.find('data-service.test', {
          a: 500
        }, {}, function(error, docs) {
          assert.equal(null, error);
          expect(docs.length).to.equal(1);
          done();
        });
      });
    });
  });

  describe('#insertMany', function() {
    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    it('inserts the documents into the collection', function(done) {
      service.insertMany('data-service.test', [{
        a: 500
      }, {
        a: 500
      }], {}, function(err) {
        assert.equal(null, err);
        service.find('data-service.test', {
          a: 500
        }, {}, function(error, docs) {
          assert.equal(null, error);
          expect(docs.length).to.equal(2);
          done();
        });
      });
    });
  });

  describe('#sample', function() {
    before(function(done) {
      helper.insertTestDocuments(service.client, function() {
        done();
      });
    });

    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    context('when no filter is provided', function() {
      it('returns a stream of sampled documents', function(done) {
        var seen = 0;
        service.sample('data-service.test', {})
          .pipe(eventStream.through(function(doc) {
            seen++;
            this.emit('data', doc);
          }, function() {
            this.emit('end');
            expect(seen).to.equal(2);
            done();
          }));
      });
    });
  });

  describe('#updateOne', function() {
    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    it('updates the document', function(done) {
      service.insertOne('data-service.test', {
        a: 500
      }, {}, function(err) {
        assert.equal(null, err);
        service.updateOne('data-service.test', {
          a: 500
        }, {
          $set: {
            a: 600
          }
        }, {}, function(er) {
          assert.equal(null, er);
          service.find('data-service.test', {
            a: 600
          }, {}, function(error, docs) {
            assert.equal(null, error);
            expect(docs.length).to.equal(1);
            done();
          });
        });
      });
    });
  });

  describe('#updateMany', function() {
    after(function(done) {
      helper.deleteTestDocuments(service.client, function() {
        done();
      });
    });

    it('updates the documents', function(done) {
      service.insertMany('data-service.test', [{
        a: 500
      }, {
        a: 500
      }], {}, function(err) {
        assert.equal(null, err);
        service.updateMany('data-service.test', {
          a: 500
        }, {
          $set: {
            a: 600
          }
        }, {}, function(er) {
          assert.equal(null, er);
          service.find('data-service.test', {
            a: 600
          }, {}, function(error, docs) {
            assert.equal(null, error);
            expect(docs.length).to.equal(2);
            done();
          });
        });
      });
    });
  });
});
