var supertest = require('supertest'),
  config = require('../config.json'),
  filedb = require('diskdb'),
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  //http_post = require('http-post'),
  should = require('should');

var testPostForm = require('../paphos-discover.json');
var testclientPort = 8090,
  clientHost = "http://localhost:"+testclientPort,
  serverAgent,
  app = express(), serverCall;

var collection = config.db.collection,
  db = filedb.connect(config.db.dir, [collection]);



describe("Tests", function () {

  var clientApp;
  // REST tests
  describe("REST tests", function () {

    before(function (done) {
      db[collection].remove({}, true);

      clientApp = require('../app'),
      serverAgent = supertest.agent(testPostForm.moduleUrl);
      app.use(bodyParser.urlencoded({extended: false}));
      app.use(bodyParser.json());

      serverCall = app.listen(testclientPort);
      console.info("*** Start test server ***");
      //removeTestSample(done);
      done();
    });

    this.timeout(10000);

    it("should return default api page", function (done) {
        serverAgent
        .get('/ok')
        .expect("Content-type", /json/)
        .expect(200)
        .end(function (err, res) {
          if (err || res.error) throw err || res.error;

          should(res.body.success).equal(true);

          done();
        });
    });

    it("should check service call", function (done) {

      app.post('/api/services/subscribe', function (req, res) {
        should(req.body.error).not.equal(true);

        should(req.body).have.property('name', testPostForm.name);
        should(req.body).have.property('moduleUrl', testPostForm.moduleUrl);
        should(req.body).have.property('clientUrl', testPostForm.clientUrl);
        should(req.body).have.property('title', testPostForm.title);
        res.sendStatus(200);
        //done();
      });

      request
      .post({url: testPostForm.moduleUrl + '/api/subscription/subscribe', form:{
          name: 'testClient',
          clientUrl: clientHost
      }}, function(err, data) {
          if(data.body !== undefined && data.body.msg !== undefined) return;

          should(data.status).not.equal(500);
          done();
      });

    });

    var sendTestPostData = {
        name: "testSubscriber",
        clientUrl: clientHost
    };

    /*it("should return success message for insertion in DB", function (done) {

        serverAgent
        .post('/api/subscription/subscribe')
        .send(sendTestPostData)
        .end(function (err, res) {
          if (err || res.error) {
              done();
              throw (err || res.error);
          }

          should(res.status).ok();
          should(res.body).have.property('msg');

          should(res.statusCode).equal(200);
          done();
        });
    });*/

    it("should return subscriber data", function (done) {

        serverAgent
        .get('/api/subscription/ping?clientUrl=' + clientHost)
        .end(function (err, res) {
          if (err || res.error) throw (err || res.error);

          should(res.status).ok();
          should(res.body).have.property('msg');
          should(res.statusCode).equal(200);

          should(res.body.msg.clientUrl).equal(clientHost);
          should(res.body.msg.status).equal(1);

          done();
        });
    });


    it("should return ERROR message for duplicate insertion in DB", function (done) {

        serverAgent
        .post('/api/subscription/subscribe')
        .send(sendTestPostData)
        .end(function (err, res) {
          if (err) throw err;

          should(res.body).have.property('msg');

          should(res.statusCode).equal(500);
          done();
        });
    });

    after(function (done) {
      db[collection].remove({}, true);
      clientApp.server.close();
      serverCall.close();
      console.info("*** Stop test server ***");
      //removeTestSample(done);
      done();
    });

  });

});
