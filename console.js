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
    nodeID,
    transporter
});
broker.config = config

const loadService = (path) => {
    try {
        broker.loadService(path);
    } catch (e) {
        console.log(e)
    }
}

loadService("./services/services.service");
loadService("./services/services.templates.service");
loadService("./services/services.templates.instances.service");

// Start server
broker.start().then(() => broker.repl());
module.exports = broker

