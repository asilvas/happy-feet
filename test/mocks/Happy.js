const { EventEmitter } = require('events');

module.exports = () => {
  return HappyMock;
};

class HappyMock extends EventEmitter
{
  constructor(opts) {
    super();
    this.options = opts;
    this.state = undefined;
  }
}
