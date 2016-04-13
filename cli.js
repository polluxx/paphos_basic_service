'use strict';

var program = require('commander'),
  config = require('./config.json'),
  serviceUrl = "127.0.0.1:" + config.port,
  async = require('async'),
  request = require('supertest').agent(serviceUrl);

program
  .version('0.1')
  .description('Basic service command line utility');

function ping(next) {
  console.info("Ping!");

  request
    .get('/api')
    .expect("Content-type", /json/)
    .expect(200)
    .end(function (err, res) {
      if (err) {
        console.error(err);
        return next(err);
      }
      console.info("Pong!");
      next();
    });
}

program
  .command('ping')
  .description('Checks if current service is active')
  .action(ping);


program.parse(process.argv);

if (!program.args.length) program.help();
