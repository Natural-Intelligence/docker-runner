'use strict';

var _ = require('lodash');
var fs = require('fs');
var exec = require('child-process-promise').exec;
var Promise = require("bluebird");
var chalk = require('chalk');

module.exports = (function DockerServiceRunnerClassWrapper(_) {
    function DockerServiceRunner() {
    }

    var _dockerContainers = [];
    var _dockerRepositoriesRootFolder = '/usr/local/docker';

    DockerServiceRunner.prototype.run = function run(optionsPlural) {
        var _this = this, i = 0, promises;

        return new Promise(function runPromise(resolve, reject) {
            promises = _.map(optionsPlural, function (opt) {
                return _this.runSingle(opt)
            });

            Promise.all(promises).then(function killAllContainersThen() {
                resolve();
            }).catch(function killAllContainersCatcher(e) {
                reject({
                    message: 'Could not run all images error attached',
                    err: e
                });
            });
        });
    };

    DockerServiceRunner.prototype.runSingle = function runSingle(options) {
        var _this = this;

        return new Promise(function runMainPromise(resolve, reject) {
            if (_this.validateOptions(options)) {
                // Basic validations for what we need in order to run
                DockerServiceRunner.validateDockerRootFolderExists()
                    .then(function validateDockerRootFolderExistsThen() {
                        console.log('validating terminal..');
                        return DockerServiceRunner.validateRunningInDockerTerminal();
                    })
                    .then(function validateRunningInDockerTerminalThen() {
                        console.log('validating git is installed..');
                        return DockerServiceRunner.validateGitInstalled();
                    })
                    .then(function validateGitInstalledThen() {
                        console.log('resolving repository..');
                        return _this.resolveGitRepository(options);
                    })
                    .then(function resolveGitRepositoryThen() {
                        console.log('build image..');
                        return _this.dockerBuild(options);
                    })
                    .then(function dockerBuildThen() {
                        console.log('running container..');
                        return _this.dockerRunContainer(options);
                    })
                    .then(function dockerRunMainThen() {
                        var message = 'Service started as a docker container listening on port: ' + options.port;
                        console.log(message);
                        resolve({message: message});
                    })
                    .catch(function catchResolver(e) {
                        console.log(e.message);
                        reject({message: e.message, err: e});
                    });
            }
        });
    };

    DockerServiceRunner.prototype.stop = function stop() {
        var _this = this, i = 0, promises = [];

        return new Promise(function stopPromise(resolve, reject) {
            for (i = 0; i < _dockerContainers.length; i++) {
                promises.push(_this.stopSingleContainer(i));
            }

            Promise.all(promises).then(function killAllContainersThen() {
                resolve();
            }).catch(function killAllContainersCatcher(e) {
                reject({
                    message: 'Could not kill all running containers, please kill manually using docker ps',
                    err: e
                });
            });
        });
    };

    DockerServiceRunner.prototype.stopSingleContainer = function stopSingleContainer(index) {
        return new Promise(function stopSingleContainerPromise(resolve, reject) {
            if (index in _dockerContainers) {
                console.log('Stopping container of service ' + _dockerContainers[index].name + '..');
                exec('docker kill ' + _dockerContainers[index].ref).then(function dockerKillContainerThen() {
                    console.log('Container of service ' + _dockerContainers[index].name + ' stopped successfully!');
                    resolve();
                }).catch(function dockerKillContainerCatcher(e) {
                    reject(e);
                });
            }
        });
    };

    DockerServiceRunner.prototype.dockerRunContainer = function dockerRunContainer(options) {
        var _this = this, port = options.port;

        return new Promise(function dockerRunContainerPromise(resolve, reject) {
            exec('docker run -d -p ' + port + ':' + port + ' -e "port=' + port + '" ' + options.name)
                .then(function dockerRunContainerThen(result) {
                    console.log('docker run output to stdout:');
                    console.log(result.stdout);
                    if (result.stdout.length > 0) {
                        _dockerContainers.push({
                            port: options.port,
                            ref: _.trim(result.stdout),
                            name: options.name
                        });

                        _this.dockerRunPollNodeProcessUp(options).then(function () {
                            resolve();
                        });

                    }
                }).catch(function dockerRunContainerCatch(e) {
                var message = 'Cannot start container of service ' + options.name + ' on port ' + options.port + ' error attached';
                console.log(message);
                if (e.stderr.indexOf('port is already allocated') !== -1) {
                    console.warn(chalk.yellow('NOTICE: port ' + options.port + ' already taken! Docker container won\'t run'));
                    resolve();
                } else {
                    console.log(e);
                    reject({message: message, err: e});
                }
            });
        });
    };

    DockerServiceRunner.prototype.dockerRunPollNodeProcessUp = function dockerRunPollNodeProcessUp(options, timeout) {
        timeout = timeout || 5000;
        var _this = this;
        return new Promise(function dockerRunPollNodeProcessUpPromise(resolve, reject) {
            exec('curl docker-host:' + options.port + '/status').then(function dockerImagesGrepThen(result) {
                console.log('resolved');
                console.log(result.stdout);
                resolve();
            }).catch(function (e) {
                if (timeout >= 0) {
                    setTimeout(function () {
                        _this.dockerRunPollNodeProcessUp(options, timeout - 200).then(function () {
                            resolve();
                        });
                    }, 200);
                } else {
                    reject('Timeout server not loading');
                }
            });
        })
    };

    DockerServiceRunner.prototype.validateOptions = function validateOptions(options) {
        if ('name' in options) {
            if (options.name.toLowerCase() != options.name) {
                console.log('options.name with ' + options.name + ' is not a valid name for this service , please use all lowercase characters! (example: ' + options.name.toLowerCase() + ')');
                return false;
            }
        }

        return true;
    };

    DockerServiceRunner.prototype.dockerBuild = function dockerBuild(options) {
        var _this = this, targetDir = _this.getRepositoryPath(options);

        // This method requires polling since the promise returned is fulfilled a lot before the image is actually
        // ready for usage.

        return exec('cd ' + targetDir + ' && docker build -t ' + options.name + ' .')
            .catch(function dockerBuildCatcher(e) {
                throw({
                    message: 'Cannot generate Docker image for service ' + options.name + '\n' + 'attached is the error in full:' + '\n',
                    err: e
                });
            });
    };

    DockerServiceRunner.prototype.getRepositoryPath = function getRepositoryPath(options) {
        return _dockerRepositoriesRootFolder + '/' + _.trim(options.name, '/');
    };

    DockerServiceRunner.prototype.resolveGitRepository = function resolveGitRepository(options) {
        var _this = this, targetDir = _this.getRepositoryPath(options);
        // If git repository directory exists, only pull otherwise clone.
        return (DockerServiceRunner.directoryExists(targetDir)) ? exec('cd ' + targetDir + ' && git reset --hard && git pull') : _this.cloneGitRepository(options);
    };

    DockerServiceRunner.prototype.cloneGitRepository = function cloneGitRepository(options) {
        var _this = this, targetDir = _this.getRepositoryPath(options);
        console.log('cloning repository..');
        return exec('git clone ' + options.git + ' ' + targetDir);
    };

    DockerServiceRunner.directoryExists = function directoryExists(dirPath) {
        try {
            // Query the entry
            var stats = fs.lstatSync(dirPath);

            // Is it a directory?
            if (stats.isDirectory()) {
                // Yes it is, nothing more to do here , we finished our validation
                return true;
            }
        } catch (e) {
            // Directory doesn't exist
        }

        return false;
    };

    DockerServiceRunner.validateGitInstalled = function validateGitInstalled() {
        exec('git').then(function gitThen(result) {
            return Promise.resolve({message: 'All good! carry on!', stdout: result.stdout});
        }).catch((err) => {
            return Promise.reject({
                message: 'You don\'t have git installed! please run (Linux: apt-get install git / Mac: brew install git)',
                error: err
            });
        });
    };

    DockerServiceRunner.validateRunningInDockerTerminal = function validateRunningInDockerTerminal() {
        return new Promise(function (resolve, reject) {
            exec('docker ps').then(function dockerProcessesThen() {
                resolve();
            }).catch(function dockerTerminalCatch(e) {
                reject({message: 'You are not running in a Docker terminal!', err: e});
            });
        });
    };

    DockerServiceRunner.validateDockerRootFolderExists = function validateDockerRootFolderExists() {
        console.log('validating root docker directory exists');
        var existFlag = DockerServiceRunner.directoryExists(_dockerRepositoriesRootFolder);

        if (!existFlag) {
            // Create the root directory
            return exec('mkdir -p ' + _dockerRepositoriesRootFolder);
        }

        return Promise.resolve({message: 'Directory already exists, were all good!'});
    };

    return DockerServiceRunner;
})(_);