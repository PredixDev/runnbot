var GitHubApi = require('github'),
    argv = require('yargs')
    .array('requestedRepos')
    .array('excludedRepos')
    .options({
      dryRunn: {
        default: true,
        type: 'boolean'
      },
      designReposOnly: {
        default: false,
        type: 'boolean'
      },
      initialRunn: {
        default: false,
        type: 'boolean'
      },
      silent: {
        default: false,
        type: 'boolean'
      },
      componentReposOnly: {
        default: false,
        type: 'boolean'
      },
      includePxVisOnly: {
        default: false,
        type: 'boolean'
      },
      excludePxVis: {
        default: false,
        type: 'boolean'
      },
      includeSeed: {
        default: false,
        type: 'boolean'
      },
      noTag: {
        default: false,
        type: 'boolean'
      },
      noReset: {
        default: false,
        type: 'boolean'
      }
    })
    .argv,
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs-extra')),
    IsThere = require("is-there");
const sh = require('shelljs');
/**
 * our main shared object
 * @type {Object}
 */
var shared = {
  //pre-configure  our shared vars
  simpleGit: require('simple-git'),
  teamName: '',
  username: '',
  password: '',
  teamId: '',
  orgName: '',
  localPath: '',
  bump: '',
  message: '',
  developerModule: '',
  github: null,
  travisKey: '',
  /**
   * this function is called on error
   * @param  {[Error]} err [a description of the err]
   */
  errFunction: function (err) {
    console.log(err);
  },
  /**
   * creates a githubInstance that is promisified, and receives a username and password, as well as specific headers.
   * @return {[Promise]} [returns the Github object instance.]
   */
  createGithubInstance: function() {

    if (!shared.github) {
      // create the instance, add it to shared.githubInstance, then return
      var github = new GitHubApi({
        headers: {
            "user-agent": shared.orgName
        },
        Promise: require('bluebird')
      });

      github.authenticate({
        type: "basic",
        username: shared.username,
        password: shared.password
      });
      shared.github = Promise.promisifyAll(github);
    }

    return Promise.resolve(shared.github);
  },
  /**
   * gets a list of directories, compiled from a location created by the localPath flag and current location.
   * @return {[Promise]} [a list of directories/repos, each in full path]
   */
  getDirs: function() {
    var lastSlash = __dirname.lastIndexOf("/"),
        initialDir = __dirname.substr(0, lastSlash) + "/" + shared.localPath,
        readdir = Promise.promisify(fs.readdir);

    return readdir(initialDir)
    .error((e) => Promise.reject("I didn't find a directory with the path " + initialDir + ". If this is the first time you're running Runnbot, be sure to include the --initialRunn=true flag in your call to bring in the approriate repos."))
    .then(function(files) {
      var dirList = files
       .filter((filesOrDir) => {
         if (shared.excludedRepos) {
           //since this is the EXCLUDED list, we DON'T want to return the ones that match the filter.
          return (shared.excludedRepos.indexOf(filesOrDir) > -1) ? false : true;
         } else {
           //if shared.excludedRepos is off, just return true.
          return true;
         }
       })
       //add the full path to the file or dir name
       .map( (fileOrDir) => initialDir + "/" + fileOrDir)
       //removes all the files and folders that start with a .
       .filter((fileOrDir) => fileOrDir.substr(0, 1) !== "." && !fs.statSync(fileOrDir).isFile());
       return Promise.resolve(dirList);
    }).error(shared.errFunction);
 },
  ProgressBar: function(pbLength) {
   this.pbLength = pbLength;
   this.counter = 0;
   this.uptickProgressBar = function(repo) {
     this.counter++;
     if (shared.silent === false) {
        console.log(`finished ${this.counter}/${this.pbLength}: ${repo}`); // finished 12/49
     }
   };
   return this;
 },
 /**
  * Checks if the directory passed in exists under `dir` path
  *
  * @param  {String} dir - Full system path to a directory to check for 'passed in path sub-directory
  * @return {Promise} - Resolves with `true` if passed in path exists, otherwise resolves `false` (should never reject)
  */
 doesDirExist: function(dir, path) {
   return new Promise((resolve, reject) => {
     console.log(dir + "/" + path);
     IsThere(dir + "/" + path, function(dirStatus) {
       resolve(dirStatus);
     });
   });
 },
 doesFileExist: function(dir, file) {
     return new Promise((resolve, reject) => {
       let filePath = `${dir}/${file}`;
       fs.stat(filePath, (err, stat) => {
         if (err) {
           resolve(false); // If there's an error, resolve false
         } else if (stat.isFile()) {
           resolve(true); // If it is a file, resolve true
         } else {
           resolve(false); // Otherwise, default to resolve false
         }
       });
     });
   },
   /**
 * Asynchronously executes a shell command and returns a promise that resolves
 * with the result.
 *
 * @method execAsync
 * @param {String} cmd - The shellcommand to execute
 * @param {String} workingDir - The directory to execute the `cmd` in
 * @returns {Promise} - Resolves with the command results from `stdout`
*/
 execAsync: function(cmd, workingDir) {
  return new Promise(function(resolve, reject) {
    let opts = {};
    opts.silent = true;
    if (typeof workingDir === 'string' && workingDir.length) opts.cwd = workingDir;

    // Execute the command, reject if we exit non-zero
    sh.exec(cmd, opts, function(code, stdout, stderr) {
      if (code !== 0) return reject(new Error(stdout));
      return resolve(stdout);
    });
  });
 }
};

/**
 * configure all of the shared variables from the yargs.
 */
shared.localPath = (argv.localPath) ? argv.localPath : 'repos';
shared.excludedRepos = (argv.excludedRepos) ? argv.excludedRepos : '';
shared.requestedRepos = (argv.requestedRepos) ? argv.requestedRepos : [];
shared.designReposOnly = argv.designReposOnly;
shared.initialRunn = argv.initialRunn;
shared.teamName = (argv.teamName) ? argv.teamName : 'Px';
shared.orgName = (argv.orgName)? argv.orgName : 'PredixDev';
shared.dryRunn= argv.dryRunn;
//check if it was passed in as an arguement, and if it was NOT, check if it already has value - might have been set from another user supplied script
shared.message = (argv.message) ? argv.message : (shared.message) ? shared.message : '';
shared.bump = argv.bump;
shared.noReset = argv.noReset;
shared.username = argv.username;
shared.password = argv.password;
shared.updatedVersion = '';
shared.travisKey= argv.travisKey ? argv.travisKey : '';
shared.developerModule = argv.developerModule;
shared.silent = argv.silent;
shared.componentReposOnly = argv.componentReposOnly;
shared.includePxVisOnly = argv.includePxVisOnly;
shared.excludePxVis = argv.excludePxVis;
shared.includeSeed = argv.includeSeed;
shared.concurrency = (argv.concurrency) ? argv.concurrency : 500;
shared.noTag = argv.noTag;
module.exports = shared;
