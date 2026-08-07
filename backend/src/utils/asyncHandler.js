// Async controllerlardagi xatolarni ilib olib, error middleware ga uzatadi
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
