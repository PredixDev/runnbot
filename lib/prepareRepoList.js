var shared = require('./shared');
var Promise = require("bluebird");

/**
 * Our IIFE function
 */
var prepareRepoList = (function() {

  /**
   * loops through the requested repo list, and calls the changeRepoToFullPath function on each item in the requested list.
   * @return {[Promise]} [a dir list which holds a list of requested full path dirs]
   */
  var loopThroughRequestedRepos = function() {
    var requestedRepos = shared.requestedRepos;
    return Promise.all(requestedRepos.map((repo) => changeRepoToFullPath(repo)));
  };

  /**
   * add a full path to each requested repo.
   * @param  {[String]} repo [a repo name]
   * @return {[Promise]}      [the repo full path]
   */
  var changeRepoToFullPath = function(repo) {
    //find the last / - since we are in the lib folder, we need the location of that last /
    var lastSlash = __dirname.lastIndexOf("/"),
        //create the full repo path by adding the requested localPath and repo name, starting from the previously found last /
        dir = __dirname.substr(0, lastSlash) + "/" + shared.localPath + "/" + repo;
    return Promise.resolve(dir);
  };

  /**
   * The prediux-ui repo doesn't have a master branch, and will reject its promise everytime. this function excludes it from the repo list.
   * @param  {[Array]} dirList [a list of dirs]
   * @return {[Promsie]} [a list of dirs without the predix-ui repo]
   */
  var removePredixUI = function(dirList) {
    return Promise.filter(dirList, (dir) => {
      var lastSlash = dir.lastIndexOf("/"),
          dirName = dir.substr(lastSlash+1);
      return dirName !== "predix-ui";
    });
  };

  /**
   * filters out the design repos only
   * @param  {[Array]} dirList [a list of dirs]
   * @return {[Promise]} [a list of deisgn repos only]
   */
  var designReposOnly = function(dirList) {
      return Promise.filter(dirList, (dir) => dir.substr(dir.length-7) === '-design');
  };

  /**
   * our Main function. checks if the requested flags is on, and if so, calls a function that loops through the requested repos
   * if not, calls the getDirs function, removePredixUI function, checks on the design only flag, and returns the dirList.
   * @return {[type]} [description]
   */
  var main = function() {
    if (shared.requestedRepos.length) {
      return loopThroughRequestedRepos()
      .then((dirList) => Promise.resolve(dirList));
    } else {
      return shared.getDirs()
      .then(removePredixUI)
      .then((dirList) => (shared.designReposOnly) ? designReposOnly(dirList) : Promise.resolve(dirList))
      .then((dirList) => Promise.resolve(dirList));
    }
  };

  return {
    main: main
  };
})();

module.exports = {
  main: prepareRepoList.main
};