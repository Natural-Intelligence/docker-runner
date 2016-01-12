# docker-runner

Docker runner is a utility for compiling and running docker containers from plain GitHub or BitBucket repositories
which are dockerized (have a valid and compiling Dockerfile in place) 

This can be very useful in end 2 end testing incase you want to be able to fire up a service or services as a dependency
for your tests execution.

This can also be a general purpose docker running tool as well

## Prerequisites

You need to have Docker installed on your Mac or Linux machine
Git should be installed

In Ubuntu run:
```bash
$ sudo apt-get -y install git docker 
```

In a Mac you should install the latest Docker toolbox available from here:
https://www.docker.com/docker-toolbox

Git can be installed using an Installer .dmg file or using brew with the following command:
```bash
$ brew install git 
```

## Install
To install this package run:

```bash
npm install docker-runner
```

## Usage Examples
  
```javascript

var DockerRunner = require('docker-runner');

var docker = new DockerRunner();

docker.run([{
   git: 'git@github.com:example-account/example-docker-repository.git',
   name: 'myimage',
   port: 3000
}]).then(function (){
   // Do stuff
}).catch((e) => {
    // Do something with the error
});
```

Pay attention to the fact you are sending over an array of objects, you can send multiple objects with repositories
, names of images and ports and the docker runner will automatically load all of them providing a resolved promise once done.

To stop the container or containers you have run , when you want to finish using them (code wise) you can run the following
command on the same instance of docker from the previous example:

```javascript
docker.stop()
.then(function () {
    // All containers have surely been killed by this point.
}).catch(function (e) {
    console.log('Could not stop the containers error attached');
    console.log(e);
});
```


## Small word of caution
When using a Mac for your development, make sure to run your Node process from within a Docker enabled terminal
Use your LaunchPad and launch a Docker terminal using the Docker Quickstart Terminal (which will open in your default console application)
Otherwise the commands underneath this tool will not be able to use the docker command to send commands to the Docker VM.

## People

This package was developed by Itamar Arjuan and with the generous help of Sefi Eini!
From the Natural Intelligence infrastructure team 

## License
  [MIT](LICENSE)

