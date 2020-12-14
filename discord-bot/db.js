const Enmap = require("enmap");

module.exports = {
  genreRoulette: new Enmap({ name : "genre", polling : true }),
  genreID: new Enmap({ name: "genreid" }),
  friList: new Enmap({ name: "friList" }),
  friID: new Enmap({ name: "friID" }),
  reviewDB: new Enmap({ name: "reviewDB" }),
};