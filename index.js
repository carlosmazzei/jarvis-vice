"use strict";
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");

const { WebhookClient } = require("dialogflow-fulfillment");
const { Card, Suggestion, Image } = require("dialogflow-fulfillment");
const smartthings = require("./smartthings.js");
const spotify = require("./spotify.js");
const nest = require("./nest.js");
const microsoft = require("./microsoft.js");
const utils = require("./utils.js");
const weather = require('weather-js');


let app = express();

process.env.DEBUG = "dialogflow:debug"; // enables lib debugging statements

app.use(bodyParser.json());

app.get('/', function (request, response) {
  response.send('Hello, world! From vice')
});

app.post("/", (request, response) => {
  console.log("Dialogflow Request headers: " + JSON.stringify(request.headers));
  console.log("Dialogflow Request body: " + JSON.stringify(request.body));
  const agent = new WebhookClient({ request, response });

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function turnOnLight(agent) {
    return new Promise((resolve, reject) => {
      smartthings.light("switch", "on").then(result => {
        agent.add(result); // response to dialogflow
        console.log(result);
        resolve();
      });
    });
  }

  function turnOffLight(agent) {
    return new Promise((resolve, reject) => {
      smartthings.light("switch", "off").then(result => {
        agent.add(result); // response to dialogflow
        console.log(result);
        resolve();
      });
    });
  }

  // Add your own functions below:

  function showCamera(agent) {
    agent.add(new Image(nest.camera(2)));
  }

  function turnOnOutlet(agent) {
    return new Promise((resolve, reject) => {
      smartthings.outlet("on").then(result => {
        agent.add(result);
        console.log(result);
        resolve();
      });
    });
  }

  function turnOffOutlet(agent) {
    return new Promise((resolve, reject) => {
      agent.add("Switching off outlet...");
      smartthings.outlet("off").then(result => {
        agent.add(result);
        console.log(result);
        resolve();
      });
    });
  }

  function turnOnOutlet(agent) {
    return new Promise((resolve, reject) => {
      smartthings.outlet("on").then(result => {
        agent.add(result);
        console.log(result);
        resolve();
      });
    });
  }

  function unlockDoor(agent) {
    return new Promise((resolve, reject) => {
      smartthings.lock("unlock").then(result => {
        agent.add(result);
        console.log(result);
        resolve();
      });
    });
  }

  function lockDoor(agent) {
    return new Promise((resolve, reject) => {
      smartthings.lock("lock").then(result => {
        agent.add(result);
        console.log(result);
        resolve();
      });
    });
  }

  function checkWeather(agent) {
    let location = "Sao Paulo";

    return new Promise((resolve, reject) => {
      weather.find({search: location, degreeType: 'C'}, function(err, result) {
        if(err) resolve(`Error: ${err}`);
        console.log(result[0]);
        let currentWeather = result[0].current;

        agent.add(`Current temperature in ${location} is ${currentWeather.temperature}`);

        if (currentWeather.temperature > 20) {
          resolve(turnOnOutlet(agent));
        } else {
          resolve(turnOffOutlet(agent));
        }

      });
    });
  }

  function welcomeHome(agent) {
    return new Promise((resolve, reject) => {
      agent.add("Welcome home sir!");
      turnOnLight(agent).then( () => {
        unlockDoor(agent).then( () => {
          turnOnOutlet(agent).then( () => {
            let song = "spotify:track:3lX49Bqy21Y5HneUJ7p55G";
            let sonosData = {
              name: `Today's song`,
              sonosUri: spotify.sonosUri(song)
            }  
            smartthings.sonos("playTrack", sonosData).then(result => {
              agent.add(result);
              console.log(result);
              resolve();
            }); // end sonos
          }); // end outlet
        }); // end unlock door
      }); // end turn on light
    }); // end Promise
  }

  function bye(agent) {
    return new Promise((resolve, reject) => {
      agent.add("Welcome home sir!");
      turnOffLight(agent).then( () => {
        lockDoor(agent).then( () => {
          turnOffOutlet(agent).then( () => {  
            smartthings.sonos("pause").then(result => {
              agent.add(result);
              console.log(result);
              resolve();
            }); // end sonos
          }); // end outlet
        }); // end unlock door
      }); // end turn on light
    }); // end Promise
  }

  function customModel(agent) {
    let url = nest.camera(2);

    return new Promise((resolve, reject) => {
      agent.add(new Image(url));
      microsoft
        .prediction(url)
        .then(prediction => {
          if (prediction.down > 0.6) {
            agent.add("Thumbs down");
          } else if (prediction.up > 0.6) {
            agent.add("Thumbs up");
          } else {
            agent.add("No good prediction");
          }
          resolve();
        })
        .catch(error => {
          agent.add(`Error: ${error}`);
          console.log(`Error: ${error}`);
          resolve();
        });
    });
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set("Default Welcome Intent", welcome);
  intentMap.set("Default fallbackback Intent", fallback);
  intentMap.set("set.lights.off", turnOffLight);
  intentMap.set("set.lights.on", turnOnLight);
  intentMap.set("show.camera.happy", showCamera);
  intentMap.set("bye.bye", bye);
  intentMap.set("weather", checkWeather);
  intentMap.set("welcome.home", welcomeHome);
  intentMap.set("Custom model", customModel);

  // Add your own intents below:

  agent.handleRequest(intentMap);
});

app.set("port", process.env.PORT || 5000);
app.listen(app.get("port"), () => {
  console.log(`JARVIS is online at http://localhost:${app.get("port")}`);
});
