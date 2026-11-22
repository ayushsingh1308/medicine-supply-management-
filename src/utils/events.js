// Tiny in-process event bus. Services emit, the Socket.IO layer listens.
const { EventEmitter } = require('events');
module.exports = new EventEmitter();
