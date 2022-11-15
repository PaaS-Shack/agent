const { ServiceBroker } = require("moleculer");

const nodeID = require("os").hostname()

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

const config = {
    namespace: "broker",
    hotReload: false,
    nodeID,
    transporter,
    middlewares: [
        require("./middlewares/async-context.middleware"),
        require("./middlewares/check-permissions.middleware"),
        require("./middlewares/find-entity.middleware"),
    ],
}

// Create broker
const broker = new ServiceBroker(config);

const loadService = (path) => {
    try {
        broker.loadService(path);
    } catch (e) {
        console.log(e)
    }
}

loadService("./agents/node.agent");

// Start server
broker.start()
module.exports = broker

