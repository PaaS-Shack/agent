const ConfigMixin = require('config-service')

const defaultConfig = require('../config.json')

module.exports = {
    name: 'config',
    version: 1,
    mixins: [ConfigMixin],

    /**
     * Service settings
     */
    settings: {
        defaultConfig
    }
};