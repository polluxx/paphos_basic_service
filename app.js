'use strict';

var express = require('express'),
  http = require('http'),
  path = require('path'),
  filedb = require('diskdb'),
  config = require('./config.json'),
  cors = require('cors'),
  async = require('async'),
  bodyParser = require('body-parser'),
  PaphosService = require('./paphos-service.js');

var app = express();
app.config = config;

var serviceConfig = require('./paphos-discover.json');

async.auto({
  'db': function (next) {
    try {
      next(null, filedb.connect(config.db.dir, [config.db.collection]));
    } catch (err) {
      next(err);
    }
  },
  'server': ['db', function (next, data) {
    app.db = data.db;
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    app.server = http.createServer(app);

    app.use(cors());

    app.use(function (req, res, next) {
      req.app = app;
      next();
    });
    next();
  }],
  'service': ['server', function (next) {
    next(null, new PaphosService(app, config.db.collection, next));
  }],
  'checkStack': ['service', function (next, data) {
    data.service.CheckStack(next);
  }],
  'routes': function (next, data) {
    app.use('/ok', (req, res) => res.json({ success: true }));
    app.use('/timeout', (req, res) => {
      setTimeout(function() {
        res.json({ success: true });
      }, 20000);
    });
    app.use('/paphos-discover.json', (req, res) => res.json(serviceConfig));

    function response(resp, message, code) {
      var responseRes = {
        msg: message
      };

      resp.status(code).json(responseRes);
    }

    app.post('/api/subscription/subscribe', (req, resp, next) => {
      data.service.Call(req.body, function (err) {
        if (err) {
          response(resp, err, 500);
          return next(err);
        }

        response(resp, "Your request was successfull. Wait for response please.", 200);
      });
    });

    app.get('/api/subscription/ping', (req, resp, next) => {
      if (!req.query || !req.query.clientUrl) {
        return response(resp, "You must provide clientUrl param!", 500);
      }

      data.service.Ping(req.query.clientUrl, function (err, result) {
        if (err) {
          response(resp, err, 500);
          return next(err);
        }

        response(resp, result.call, 200);
      });
    });

    next();
  }
}, function () {
  console.info('Listening on port: ' + config.port);
  app.server.listen(config.port);
});

module.exports = app;