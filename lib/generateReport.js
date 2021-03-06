var shared = require('./shared'),
    Promise = require("bluebird"),
    fs = Promise.promisifyAll(require('fs-extra')),
    colors = require('colors');
/**
 * our IIFE function
 */
var generateReport = (function() {
  var line = '',
      reportPath='';

  /**
   * Loops through the dirList, and calls generateRepoLine on each item in there.
   * @param  {[Array]} dirList [an array of objects, each containing the full path and updated version]
   * @return {[Promise]}         [returns a promise that isn't used.]
   */
  var loopThroughRepos = function(dirList) {
    return Promise.map(dirList, (dirObj) => generateRepoLine(dirObj));
  };

  /**
   * Generates a single line, which pertains to the obj passed to it, and adds it to the global var line.
   * @param  {[Object]} dirObj [an object which contains the full path and the updated version of a repo]
   * @return {[{Promise}]}        [returns a promise that isn't used.]
   */
  var generateRepoLine = function(dirObj) {
    var dir = dirObj.dir,
        version;
    //if we aren't tagging, the object isn't created, and there's only the dir path.
    if (typeof dirObj == "string") {
      dir = dirObj;
      version = "NA";
    } else {
      dir = dirObj.dir;
      version = dirObj.version;
    }
    var lastSlash = __dirname.lastIndexOf("/"),
        repoName = dir.substr(lastSlash+1);
            
    line += `
${version}  ${repoName}
`;
  return Promise.resolve();
  };

  /**
   * creates the initial paragraph and report description and adds it to line.
   * @return {[Promise]} [returns a promise that isn't used.]
   */
  var createInitialLines = function(dirList) {
    var changedReposNumber = dirList.length;
    if (shared.dryRunn) {

      line += `This was a Dry Run(n), no files were sent to Github.
The following ${changedReposNumber} repositories were affected :

`;
    } else {
    line +=`This was a live run(n), and the following repositories were updated on Github:

`;
    }

    line +=`
Version       Repository

`;
  return Promise.resolve();
  };

  /**
   * creates the report file and write the contents of the line var into it.
   * @return {[Promise]} [returns a promise that isn't used.]
   */
  var writeToFile = function() {
    return new Promise(function(pres, rej) {
      var currentDate = new Date(),
          dryOrLive =  (shared.dryRunn) ? '-dryRunn' : '-live',
          ReportName = currentDate.getFullYear() + "-" + currentDate.getMonth() + "-" + (currentDate.getDate() +1) + "-" + currentDate.getHours() + ":" + currentDate.getMinutes() + "-" + dryOrLive + '.txt',
          lastSlash = __dirname.lastIndexOf("/"),
          reportPath = __dirname.substr(0, lastSlash) + "/reports/" + ReportName;
       fs.ensureFileAsync(reportPath)
      .then(() => fs.writeFile(reportPath, line, (err, res) => pres(reportPath)));
    });

  };

  var ensureReportsDir = function() {
    var lastSlash = __dirname.lastIndexOf("/"),
        reportsDir = __dirname.substr(0, lastSlash) + "/reports";

    return fs.ensureDir(reportsDir);
  };

  var main = function(dirList) {
    return createInitialLines(dirList)
    .then(() => loopThroughRepos(dirList))
    .then(() => ensureReportsDir())
    .then(() => writeToFile())
    .then((reportPath) => {
      console.log(colors.green("A report has been generated for you @ " + reportPath));
      return Promise.resolve();
    });
  };

return {
  main: main
};
})();

module.exports = {
  main: generateReport.main
};
