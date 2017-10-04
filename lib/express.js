const lib = require('./');

module.exports = (opts, happyOpts) => {
  const happy = lib(happyOpts);

  const options = Object.assign({
    errorStatus: 500,
    status: {}
  }, opts);

  const handler = (req, res) => {
    const status = Object.assign({
      statusCode: happy.state !== happy.STATE.UNHAPPY ? 200 : options.errorStatus,
      contentType: 'text/plain',
      body: happy.state
    }, options.status[happy.state]);
    res.status(status.statusCode);
    res.set({
      'Content-Type': status.contentType,
      'x-happy': happy.state
    });
    res.send(status.body);
  };

  handler.happy = happy;

  return handler;
};
