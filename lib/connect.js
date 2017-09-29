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

    const statusCode = happy.state === happy.STATE.HAPPY ? 200 : options.errorStatus;
    const statusMessage = happy.state;
    const status = Object.assign({
      statusCode,
      statusMessage
    }, options.status[happy.state]);
    res.statusCode = status.statusCode;
    res.statusMessage = status.statusMessage;
    res.end();
  };

  handler.happy = happy;
  
  return handler;
};
