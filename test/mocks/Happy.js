module.exports = () => {
  return HappyMock;
};

class HappyMock
{
  constructor(opts) {
    this.options = opts;
    this.state = undefined;
  }
}
