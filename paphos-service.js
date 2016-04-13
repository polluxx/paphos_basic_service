'use strict';
var async = require('async'),
  request = require('request');

var subscriptionConfig = {
  "method": "api/services/subscribe",
  "protocol": "http"
};

function BaseService(app, collection) {
  this.app = app;
  this.client = {};
  this.collection = collection;

  this.defaultServiceData = ['title', 'name', 'moduleUrl', 'apiUrl'];
  this.defaultClientData = ['name', 'clientUrl'];

  this.statusNames = {
    0: "Unsubscribed",
    1: "Subscribed"
  };

  console.log("Initialize new base service");


  try {
    this.db = this.app.db;

  } catch (err) {
    this.app.log.error(err);
    next(err);
  }
}

BaseService.prototype.CheckStack = function (next) {
  var uncheckedServicesList = this.db[this.collection].find({status: 0});
  if (!uncheckedServicesList.length) return next();

  var self = this;

  var checkList = uncheckedServicesList.map((record) => {
    return new Promise(function (resolve, reject) {
      self.Serve(record, reject);
    });
  });

  Promise.all(checkList)
    .then(function (resp) {
      console.log(resp);
      next();
    })
    .catch(next);
};

BaseService.prototype.Call = function (clientData, next) {
  var self = this;

  async.auto({
      validate: next => {
        self.Validate(clientData, next);
      },
      saveClient: ['validate', (next, result) => {
        self.AddClient(result.validate, next);
      }]
    },
    err => {
      if (err) {
        console.error(err);
        return next(err);
      }

      console.info("Successfully connected with client ID - " + clientData.clientUrl);
      next();
    });


}

BaseService.prototype.Ping = function (clientUrl, next) {
  var record = this.db[this.collection].findOne({clientUrl: clientUrl});
  if (!record) return next("There are no subscriber with ID: " + clientUrl);

  if (record.status === 0) return next("Subscriber with ID: " + clientUrl + " is not subscribed. Please make a new call to the service.");

  next(null, record);
}

BaseService.prototype.Serve = function (clientData, next) {
  var self = this,
    config = this.app.config;

  async.auto({
    send: function (next) {
      var openPort = config.port !== 80 ? ":" + config.port : "",
        protocolMatcher = /(http|https|tcp):\/\//,
        protocol = config.url.match(protocolMatcher).length ? config.url.match(protocolMatcher)[0] : "",
        urlMatch = new RegExp('/(\)/'),
        splitter = function (slice, index) {
          return index == 0 ? slice + openPort : slice
        },
        moduleUrl = protocol + config.url.replace(protocolMatcher, "").split('/').map(splitter).join('/'),
        apiUrl = protocol + config.apiUrl.replace(protocolMatcher, "").split('/').map(splitter).join('/'),
        sendData = {
          moduleUrl: moduleUrl,
          apiUrl: apiUrl,
          name: config.serviceData.name,
          title: config.serviceData.title
        };
      console.log(sendData);
      request
        .post({
            url: subscriptionConfig.protocol + "://" + clientData.clientUrl + "/" + subscriptionConfig.method,
            form: sendData
          },
          function (err, response, body) {
            if (err || response.statusCode !== 200) {
              err = body || "An error occured when trying to send post req to: " + clientData.clientUrl;
              console.error(err);
              return next(err);
            }

            console.info("Successfully subscribe client.");
            next();
          });

      next();
    },
    updateRecord: ['send', function (next) {
      var find = {clientUrl: clientData.clientUrl},
        dataToUpdate = {
          status: 1
        },
        options = {
          multi: false,
          upsert: false
        };

      var errorMessage, updated;
      try {
        updated = self.db[self.collection].update(find, dataToUpdate, options);
      } catch (err) {
        errorMessage = err;
      } finally {
        if (errorMessage !== undefined || updated.updated !== 1) {
          errorMessage = errorMessage || "There are error happend when trying to update DB record: " + JSON.stringify(clientData);
          console.error(errorMessage);
          return next(errorMessage);
        }

        console.info("Subscriber " + clientData.clientUrl + " was succesfully subscribed.");
        next();
      }
    }]
  });

  next();
}

BaseService.prototype.AddClient = function (clientData, next) {

  var self = this;

  if (!clientData || !clientData.clientUrl) {
    var err = "There no clientUrl in request: " + JSON.stringify(clientData);
    this.app.log.error(err);
    return next(err);
  }

  async.auto({
      // check if record is not in the DB
      recordCheck: function (next) {
        var record = self.db[self.collection].findOne({clientUrl: clientData.clientUrl});
        if (record && record.status === 1) {
          var message = "Subscriber is in DB. No need to add it.";
          console.error(message);
          return next(message);
        }

        record = record || clientData;
        next(null, record);
      },
      // insert record to the DB? or if it already in DB - send request to subscriber
      insert: ['recordCheck', function (next, record) {
        record = record.recordCheck;
        // check if subscriber is in DB, and if it is - send request to him
        if (record.status !== undefined && record.status === 0) return next(null, record);
        record.status = 0;

        try {
          self.db[self.collection].save(record);
        } catch (err) {
          console.error("Error when trying to insert to DB: " + err);
          return next(err);
        }

        next(null, record);
      }],
      // send request to subscriber
      serve: ['insert', function (next, record) {
        self.Serve(record.insert, next);
      }]
    },
    function (err) {
      if (err) {
        return next(err);
      }

      next();
    });

  next();
}

BaseService.prototype.Validate = function (clientData, next) {
  var self = this, clientObjectKeys = Object.keys(clientData);
  var results = clientObjectKeys.filter(key => {
    return ~self.defaultClientData.indexOf(key);
  });
  if (this.defaultClientData.length !== results.length) return next("Please provide mandatory fields! They are: " + this.defaultClientData.join(', '));

  var protocolChk = new RegExp("/~http/", "gi");
  if (!protocolChk.test(results.clientUrl)) {
    results.clientUrl = "http://" + results.clientUrl;
  }

  var resultingData = {};

  results.forEach(param => {
    resultingData[param] = clientData[param];
  });
  next(null, resultingData);
}

module.exports = BaseService;
