var express = require('express');
var chai = require('chai');
var expect = chai.expect;
var GridFsStorage = require('../index');
var setting = require('./utils/settings');
var uploads = require('./utils/uploads');
var request = require('supertest');
var multer = require('multer');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var GridFS = require('gridfs-stream');
var md5File = require('md5-file');

chai.use(require('chai-interface'));

var app = express();

describe('GridFS storage', function () {
    var result,
        db, gfs;

    before(function (done) {
        MongoClient.connect(setting.mongoUrl(), function (err, database) {
            if (err) {
                return done(err);
            }

            db = database;
            gfs = GridFS(db, mongo);

            var storageUrl = GridFsStorage({
                url: setting.mongoUrl()
            });

            var storageGfs = GridFsStorage({
                gfs: gfs
            });

            var uploadUrl = multer({
                storage: storageUrl
            });

            var uploadGfs = multer({
                storage: storageGfs
            });

            app.post('/url', uploadUrl.array('photos', 2), function (req, res) {
                res.send({headers: req.headers, files: req.files, body: req.body});
            });

            app.post('/gfs', uploadGfs.array('photos', 2), function (req, res) {
                res.send({headers: req.headers, files: req.files, body: req.body});
            });

            done();
        });
    });

    describe('url created instance', function () {
        beforeEach(function (done) {
            request(app)
                .post('/url')
                .attach('photos', uploads.files[0])
                .attach('photos', uploads.files[1])
                .end(function (err, res) {
                    result = res.body;
                    done();
                });
        });

        it('should store the files on upload', function () {
            expect(result.files).to.be.an('array');
            expect(result.files).to.have.length(2);
        });

        it('should use a 16 bytes long in hexadecimal format naming by default', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('filename').that.matches(/^[a-f0-9]{32}$/);
            });
            done();
        });

        it('should have a metadata property with the value null', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('metadata').that.is.a('null');
            });
            done();
        });

        it('should have a id property with the stored file id', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('id').that.is.a('string');
            });
            done();
        });

        it('should have a grid property with the stored file info', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('grid').that.have.interface({
                    chunkSize: Number,
                    contentType: String,
                    filename: String,
                    length: Number,
                    md5: String,
                    uploadDate: String,
                    _id: String
                });
            });
            done();
        });

        it('should have then same MD5 signature than the upload', function (done) {
            result.files.forEach(function (file, index) {
                expect(file.grid.md5).to.be.equal(md5File(uploads.files[index]));
            });
            done()
        });

        afterEach(function () {
            db.collection('fs.files').deleteMany({})
                .then(function () {
                    return db.collection('fs.chunks').deleteMany({});
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });
    });

    describe('gfs created instance', function () {
        beforeEach(function (done) {
            request(app)
                .post('/gfs')
                .attach('photos', uploads.files[0])
                .attach('photos', uploads.files[1])
                .end(function (err, res) {
                    result = res.body;
                    done();
                });
        });

        it('should store the files on upload', function () {
            expect(result.files).to.be.an('array');
            expect(result.files).to.have.length(2);
        });

        it('should use a 16 bytes long in hexadecimal format naming by default', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('filename').that.matches(/^[a-f0-9]{32}$/);
            });
            done();
        });

        it('should have a metadata property with the value null', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('metadata').that.is.a('null');
            });
            done();
        });

        it('should have a id property with the stored file id', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('id').that.is.a('string');
            });
            done();
        });

        it('should have a grid property with the stored file info', function (done) {
            result.files.forEach(function (file) {
                expect(file).to.have.property('grid').that.have.interface({
                    chunkSize: Number,
                    contentType: String,
                    filename: String,
                    length: Number,
                    md5: String,
                    uploadDate: String,
                    _id: String
                });
            });
            done();
        });

        it('should have then same MD5 signature than the upload', function (done) {
            result.files.forEach(function (file, index) {
                expect(file.grid.md5).to.be.equal(md5File(uploads.files[index]));
            });
            done()
        });

        afterEach(function (done) {
            db.collection('fs.files').deleteMany({})
                .then(function () {
                    return db.collection('fs.chunks').deleteMany({});
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });
    });

    after(function (done) {
        db.dropDatabase(done);
    });

});