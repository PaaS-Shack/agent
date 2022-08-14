"use strict";


module.exports = {
    // Service name
    name: "agent",
    version: 1,

    actions: {
        'agent.repo': {
            params: {
                npm: { type: "boolean", default: false, optional: true },
                remote: { type: "string", optional: false },
                branch: { type: "string", optional: false },
                cwd: { type: "string", optional: false },
            },
            async handler(ctx) {
                const { npm, remote, branch, cwd } = Object.assign({}, ctx.params);
                const nodeID = this.broker.nodeID;

                const isRepo = await ctx.call('v1.node.git.checkIsRepo', {
                    cwd
                }, { nodeID })

                if (!isRepo) {
                    await ctx.call('v1.node.fs.mkdir', {
                        path: cwd,
                        recursive: true
                    }, { nodeID });
                    await ctx.call('v1.node.git.addRemote', {
                        cwd,
                        path: remote
                    }, { nodeID });
                }

                await ctx.call('v1.node.git.checkout', {
                    cwd,
                    branch
                }, { nodeID });

                if (!isRepo || npm) {
                    await ctx.call('v1.node.cmd', {
                        cwd,
                        cmd: 'npm i'
                    }, { nodeID }).then((a) => {
                        console.log(a)
                    });
                }

                return true
            }
        },
        /**
         * Start a local service
         */
        'agent.start': {
            params: {
                service: { type: "string" },
                version: { type: "number", default: 1, optional: true },
                path: { type: "string", optional: false }
            },
            handler(ctx) {
                return this.startService(ctx.params.service, ctx.params.version, ctx.params.path).then((service) => this.mapService(service));
            }
        },

        /**
         * Stop a local service
         */
        'agent.stop': {
            params: {
                service: { type: "string" },
                version: { type: "number", default: 1, optional: true },
            },
            async handler(ctx) {
                return this.stopService(ctx.params.service, ctx.params.version).then((service) => this.mapService(service));
            }
        },

        /**
         * Stop a local service
         */
        'agent.reload': {
            params: {
                service: { type: "string" },
                version: { type: "number", default: 1, optional: true },
            },
            handler(ctx) {
                return this.reloadService(ctx.params.service, ctx.params.version, ctx.params.path).then((service) => this.mapService(service));
            }
        },

        /**
         * Stop a local service
         */
        'agent.status': {
            params: {
                service: { type: "string" },
                version: { type: "number", default: 1, optional: true },
            },
            handler(ctx) {
                return this.runningServices()
                    .then((services) => services.filter(item => item.name == ctx.params.service && item.version == ctx.params.version).shift())
                    .then((item) => (item ? {
                        'name': item.name,
                        'version': item.version,
                        'settings': item.settings,
                        'metadata': item.metadata
                    } : item));
            }
        },

        /**
         * Get list of available services
         *
         * @param {any} ctx
         * @returns
         */
        'agent.running'(ctx) {
            return this.runningServices().then((services) => services.map(service => this.mapService(service)));
        },
    },

    events: {
        async "services.created"(ctx) {
            const service = ctx.params.data;
            if (service.nodeID == this.broker.nodeID) {
                await this.actions['agent.start'](service, { parentCtx: ctx })
            }
        },
        async "services.removed"(ctx) {
            const service = ctx.params.data;
            if (service.nodeID == this.broker.nodeID) {
                await this.actions['agent.stop'](service, { parentCtx: ctx })
            }
        },
        async "services.reload"(ctx) {
            const service = ctx.params.data;
            if (service.nodeID == this.broker.nodeID) {
                await this.actions['agent.reload'](service, { parentCtx: ctx })
            }
        }
    },

    methods: {

        /**
         * read all file names
         */
        async runningServices() {
            return this.broker.services
                .filter(service => !/^\$/.test(service.name))
        },
        mapService(item) {
            if (!item) return item
            return {
                'name': item.name,
                'version': item.version,
                'settings': item.settings,
                'metadata': item.metadata
            }
        },

        /**
         * Start a local service by name
         *
         * @param {String} serviceName
         * @param {any} version
         */
        async startService(serviceName, version, filename) {
            const service = this.broker.getLocalService(`v${version}.${serviceName}`);
            if (service)
                return service
            this.logger.info(`Starting ${serviceName} from '${filename}'`);
            return this.broker.loadService(filename);
        },

        /**
         * Stop a local running service by name
         *
         * @param {String} serviceName
         * @param {any} version
         */
        async stopService(serviceName, version) {
            // TODO this.broker.getLocalService doesn't support version yet
            //const service = this.broker.getLocalService(serviceName, version);
            const service = this.broker.services.find(schema => schema.name == serviceName && (version == null || schema.version == version));
            if (!service)
                return service

            this.logger.info(`Stopping ${serviceName} from '${service.__filename}'`);
            await this.broker.destroyService(service).catch(console.log);

            delete require.cache[require.resolve(service.__filename)]
            return service
        },


        /**
         * reload a local running service by name
         *
         * @param {String} serviceName
         * @param {any} version
         */
        async reloadService(serviceName, version, path) {
            // TODO this.broker.getLocalService doesn't support version yet
            //const service = this.broker.getLocalService(serviceName, version);
            console.log(serviceName, version, path)
            const service = this.broker.services.find(schema => schema.name == serviceName && (version == null || schema.version == version));

            const promise = Promise.resolve()

            if (service)
                promise.then(() => this.stopService(serviceName, version))

            return promise.then(() => this.startService(serviceName, version, path))
        },
    },

    /**
     * Service created lifecycle event handler
     */
    created() {

    },

    /**
     * Service created lifecycle event handler
     */
    started() {

    },
    /**
     * Service created lifecycle event handler
     */
    stopped() {

    }
}