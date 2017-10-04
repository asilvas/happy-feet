const lib = require('./');
const http = require('http');

module.exports = (opts, happyOpts) => {
  const happy = lib(happyOpts);

  const options = Object.assign({
    port: 80,
    method: 'GET',
    url: '/_health',
    errorStatus: 500,
    status: {}
  }, opts);

  const server = http.createServer((req, res) => {
    if (req.method !== options.method || req.url !== options.url) {
      res.statusCode = 404;
      return void res.end();
    }

    const status = Object.assign({
      statusCode: happy.state !== happy.STATE.UNHAPPY ? 200 : options.errorStatus,
      contentType: 'text/plain',
      body: happy.state
    }, options.status[happy.state]);
    res.writeHead(status.statusCode, {
      'Content-Type': status.contentType,
      'x-happy': happy.state
    });
    res.end(status.body);
  });
  
  server.listen(options.port);

  return {
    server,
    happy
  };
};
