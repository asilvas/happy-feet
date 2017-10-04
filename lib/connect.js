const lib = require('./');

module.exports = (opts, happyOpts) => {
  const happy = lib(happyOpts);
  
  const options = Object.assign({
    method: 'GET',
    url: '/_health',
    errorStatus: 500,
    status: {}
  }, opts);
  
  const handler = (req, res, next) => {
    if (req.method !== options.method || req.url !== options.url) {
      return void next();
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
  };

  handler.happy = happy;
  
  return handler;
};
