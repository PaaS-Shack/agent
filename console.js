const { ServiceBroker } = require("moleculer");

const nodeID = 'console'


const config = require('./config.json')

const keys = Object.keys(config)
for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    process.env[key] = config[key];
}

const transporter = process.env.TRANSPORT || {
    type: "TCP",
    options: {
        udpDiscovery: false,
        port: 5500,
        urls: [
            "127.0.0.1:4400/console"
        ],
    }
}

// Create broker
const broker = new ServiceBroker({
    namespace: "broker",
    hotReload: true,
    // nodeID,
    transporter,
    middlewares: [
        require("./middlewares/async-context.middleware"),
        require("./middlewares/check-permissions.middleware"),
        require("./middlewares/find-entity.middleware"),
    ],
});
broker.config = config

const loadService = (path) => {
    try {
        broker.loadService(path);
    } catch (e) {
        console.log(e)
    }
}


loadService("./agents/node.agent");

loadService("./services/config.service");

loadService("./services/services.service");
loadService("./services/services.templates.service");
loadService("./services/services.templates.instances.service");


// Start server
broker.start().then(() => broker.repl()).then(() => {

    for (let index = 0; index < config.dev.length; index++) {
        loadService(config.dev[index]);
    }
});
module.exports = broker

