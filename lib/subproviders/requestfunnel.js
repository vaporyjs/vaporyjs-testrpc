var Subprovider = require('@vapormask/web3-provider-engine/subproviders/subprovider.js');
var inherits = require("util").inherits;

inherits(RequestFunnel, Subprovider);

module.exports = RequestFunnel;

// See if any payloads for the specified methods are marked as external.
// If they are external, and match the method list, process them one at
// a time.
function RequestFunnel() {
  // We use an object here for O(1) lookups (speed).
  this.methods = {
    "vap_call": true,
    "vap_getStorageAt": true,
    "vap_sendTransaction": true,
    "vap_sendRawTransaction": true,

    // Ensure block filter and filter changes are process one at a time
    // as well so filter requests that come in after a transaction get
    // processed once that transaction has finished processing.
    "vap_newBlockFilter": true,
    "vap_getFilterChanges": true,
    "vap_getFilterLogs": true
  };
  this.queue = [];
  this.isWorking = false;
};

RequestFunnel.prototype.handleRequest = function(payload, next, end) {
  if (payload.external != true || this.methods[payload.method] != true) {
    return next();
  }

  this.queue.push([payload, next]);

  if (this.isWorking == false) {
    this.processNext();
  }
};

RequestFunnel.prototype.processNext = function() {
  var self = this;

  if (this.queue.length == 0) {
    this.isWorking = false;
    return;
  }

  this.isWorking = true;

  var item = this.queue.shift();
  var payload = item[0];
  var next = item[1];

  next(function(error, request, cb) {
    cb();
    self.processNext();
  });
};
