const Enmap = require("enmap").default;

module.exports = {
  potd: new Enmap({ name: "potd" }),
  archipelago: new Enmap({ name: "archipelago" }),
  murder: new Enmap({ name: "murder" })
};