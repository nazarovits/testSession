'use strict';

var mongoose = require('mongoose');
var db;

process.env.NODE_ENV = 'development';
process.env.HOST = 'http://localhost:8876';
process.env.PORT = 8876;
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'testSession';

mongoose.connect(process.env.DB_HOST, process.env.DB_NAME);
db = mongoose.connection;

db.on('error', function (err) {
    console.error('Connection Error: ', err);
});
db.once('open', function () {
    console.log('Connection to ' + process.env.DB_HOST + '/' + process.env.DB_NAME + ' is success');

    var sessionSchema = mongoose.Schema({
        _id: String,
        session: String,
        expires: Date
    }, {collection: 'sessions'});

    var sessions = db.model('sessions', sessionSchema);
    var port = process.env.PORT || 8877;
    var http = require('http');
    var path = require('path');
    var fs = require("fs");
    var express = require('express');
    var session = require('express-session');
    var logger = require('morgan');
    var bodyParser = require('body-parser');
    var consolidate = require('consolidate');
    var app = express();
    var MemoryStore = require('connect-mongo')(session);
    var sessionConfig = {
        db: db.name,
        host: db.host,
        port: db.port,
        saveUninitialized: false,
        resave: false
    };

    var allowCrossDomain = function (req, res, next) {
        var browser = req.headers['user-agent'];
        if (/Trident/.test(browser)) {
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        }
        next();
    };
    app.use(allowCrossDomain);

    app.use(express.static(__dirname + '/public'));
    app.engine('html', consolidate.swig);
    app.set('views', __dirname + '/public/static');
    app.set('view engine', 'html');
    app.use(logger('dev'));

    app.use(bodyParser.json({strict: false, inflate: false, limit: 1024 * 1024 * 5}));
    app.use(bodyParser.urlencoded({extended: false, limit: 1024 * 1024 * 5}));

    app.use(express.static(path.join(__dirname, 'public')));

    app.use(session({
        name: 'TestMongoSession',
        secret: '1q2w3e4r5tdhgkdfhgejflkejgkdlgh8j0jge4547hh',
        resave: false,
        saveUninitialized: false,
        store: new MemoryStore(sessionConfig)
    }));

    app.get('/isAuth', function (req, res, next) {
        console.log(JSON.stringify(req.session));

        if ((req.session) && (req.session.userId) && (req.session.loggedIn)) {
            res.status(200).send({success: 'authorized', userId: req.session.userId});
        } else {
            res.status(401).send({error:'unauthorized'});
        }
    });

    app.get('/signIn/:userId', function (req, res, next) {
        var userId = req.params.userId;

        req.session.userId = userId;
        req.session.loggedIn = true;

        res.status(200).send({success: 'success signIn'});
    });

    app.listen(port, function () {
        console.log('==============================================================');
        console.log('|| server start success on port=' + port + ' in ' + process.env.NODE_ENV + ' version ||');
        console.log('==============================================================\n');
    });
});