const Enmap = require("enmap");

module.exports = {
  potdID: new Enmap({ name: "potdID" }),
  genreRoulette: new Enmap({ name : "genre", polling : true }),
  genreID: new Enmap({ name: "genreid" }),
  friList: new Enmap({ name: "friList" }),
  friID: new Enmap({ name: "friID" }),
};