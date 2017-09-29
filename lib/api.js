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

    const statusCode = happy.state === happy.STATE.HAPPY ? 200 : options.errorStatus;
    const statusMessage = happy.state;
    const status = Object.assign({
      statusCode,
      statusMessage
    }, options.status[happy.state]);
    res.statusCode = status.statusCode;
    res.statusMessage = status.statusMessage;
    res.end();
  });
  
  server.listen(options.port);

  return {
    server,
    happy
  };
};
