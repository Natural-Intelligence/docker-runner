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

## People

This package was developed by Itamar Arjuan and with the generous help of Sefi Eini!
From the Natural Intelligence infrastructure team 

## License
  [MIT](LICENSE)

