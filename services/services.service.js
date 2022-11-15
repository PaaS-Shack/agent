"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const config = require('../config.json')

/**
 * attachments of addons service
 */
module.exports = {
	name: "services",
	version: 1,

	mixins: [
		DbService({}),
		Cron
	],

	/**
	 * Service dependencies
	 */
	dependencies: [

	],
	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/services/",

		fields: {

			nodeID: {
				type: "string",
				required: true,
			},

			path: {
				type: "string",
				required: true,
				trim: true,
				empty: false
			},

			service: {
				type: "string",
				required: true,
				trim: true,
				empty: false,
				validate: "validateSingle",
			},

			version: {
				type: "number",
				required: false,
				default: 1,
			},

			onStart: {
				type: "string",
				required: false,
				trim: true,
				empty: false
			},

			onStop: {
				type: "string",
				required: false,
				trim: true,
				empty: false
			},

			template: {
				type: "string",
				empty: false,
				required: true,
				populate: {
					action: "v1.services.templates.resolve",
					params: {
						//fields: ['id', 'address', 'family', "internal", "public", "tunnel"]
					}
				},
			},

			instance: {
				type: "string",
				empty: false,
				required: true,
				populate: {
					action: "v1.services.templates.instances.resolve",
					params: {
						//fields: ['id', 'address', 'family', "internal", "public", "tunnel"]
					}
				},
			},


			running: {
				type: "boolean",
				virtual: true,
				populate(ctx, values, entities, field) {
					return Promise.all(
						entities.map(async entity => {
							return (ctx || this.broker).call("v1.node.agent.status", { service: entity.service, version: entity.version }, { nodeID: entity.nodeID }).then((res) => res ? true : false).catch(() => false)
						})
					);
				}
			},

		},

		defaultPopulates: ['running'],

		scopes: {

		},

		defaultScopes: []
	},

	crons: [
		{
			name: "Starting all services",
			cronTime: "*/30 * * * *",
			onTick: {
				action: "v1.services.startAll"
			}
		}
	],
	/**
	 * Actions
	 */

	actions: {
		resolveService: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				return this.findEntity(ctx, { query: params });
			}
		},
		cleanNode: {
			description: "Add members to the addon",
			params: {
				nodeID: { type: "string", empty: false, optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const entities = await this.findEntities(ctx, { query: { nodeID: params.nodeID } })

				return Promise.allSettled(entities.map((entity) => this.removeEntity(ctx, { id: entity.id })))
			}
		},
		startAll: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				let services = await this.findEntities(ctx, {});

				for (let index = 0; index < services.length; index++) {
					const service = services[index];
					await ctx.call('v1.node.agent.start', service, { nodeID: service.nodeID }).catch(() => null)

				}
			}
		},
		reloadAll: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				let services = await this.findEntities(ctx, {});

				for (let index = 0; index < services.length; index++) {
					const service = services[index];
					await ctx.call('v1.node.agent.reload', service, { nodeID: service.nodeID })
						.catch(() =>
							ctx.call('v1.node.agent.start', service, { nodeID: service.nodeID }).catch(() => null)
						)
				}
			}
		},
		startAllAgents: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const templates = await ctx.call('v1.services.templates.find', {
					query: {
						autoloadAgent: true
					}
				})
				const list = await ctx.call("$node.list");
				const promises = [];

				for (let index = 0; index < list.length; index++) {
					const node = list[index];
					if (isNaN(node.id.split('-').pop())) {
						for (let i = 0; i < templates.length; i++) {
							const template = templates[i];
							promises.push(this.actions.startTemplate({
								template: template.id,
								nodeID: node.id,
								services: false,
								agents: true,
							}, { parentCtx: ctx }))
						}
					}
				}

				return Promise.allSettled(promises)
			}
		},
		boostrapDomains: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const promises = []

				const certs = new Set()

				const domainList = await ctx.call('v1.domains.find')

				for (let index = 0; index < config.domains.length; index++) {
					const domainInfo = config.domains[index];

					let domain = domainList.find((domain) => domain.domain == domainInfo.domain)

					if (!domain) {
						domain = await ctx.call('v1.domains.create', {
							domain: domainInfo.domain
						})
						console.log(domain)
						domainList.push(domain)
					}
					console.log(domainInfo)
					promises.push(domain)

					for (let i = 0; i < domainInfo.records.length; i++) {
						const recordInfo = domainInfo.records[i];

						certs.add(recordInfo.fqdn)
						for (let j = 0; j < recordInfo.data.length; j++) {
							const data = recordInfo.data[j];
							const entity = {
								domain: domain.id,
								fqdn: recordInfo.fqdn,
								...data
							}
							let found = await ctx.call('v1.domains.records.resolveRecord', entity)

							if (!found) {
								console.log(found, entity)
								found = await ctx.call('v1.domains.records.create', entity).catch((err) => err)
							}
							promises.push(found)
						}



					}
					await Promise.allSettled(promises);
					await ctx.call('v1.domains.sync')

					for (let index = 0; index < domainInfo.routes.length; index++) {
						const routeInfo = domainInfo.routes[index];

						for (let j = 0; j < domainInfo.routers.length; j++) {
							const data = domainInfo.routers[j];
							const entity = {
								domain: domain.id,
								fqdn: routeInfo.vHost,
								type: 'A',
								data
							}
							console.log(entity)
							let found = await ctx.call('v1.domains.records.resolveRecord', entity)

							if (!found) {
								console.log(found, entity)
								found = await ctx.call('v1.domains.records.create', entity)
							}
							promises.push(found)
						}
						if (routeInfo.certOnly) {
							certs.add(routeInfo.vHost)

							continue;
						}

						let route = await ctx.call('v1.routes.resolveRoute', {
							vHost: routeInfo.vHost
						})

						if (!route) {
							route = await ctx.call('v1.routes.create', {
								vHost: routeInfo.vHost,
								strategy: 'LatencyStrategy'
							})
						}
						promises.push(route);
						if (Array.isArray(routeInfo.hosts)) {
							for (let i = 0; i < routeInfo.hosts.length; i++) {
								const hostInfo = routeInfo.hosts[i];
								let host = await ctx.call('v1.routes.hosts.resolveHost', {
									route: route.id,
									vHost: routeInfo.vHost,
									...hostInfo
								})

								if (!host) {
									host = await ctx.call('v1.routes.hosts.create', {
										route: route.id,
										vHost: routeInfo.vHost,
										...hostInfo
									})
								}
								promises.push(host)
							}
						}


					}



				}
				await Promise.allSettled(promises)
				promises.push(ctx.call('v1.domains.sync'))
				promises.push(ctx.call('v1.routes.sync'))

				await Promise.allSettled(promises)

				for (const domain of certs.values()) {

					const found = await ctx.call('v1.certificates.letsencrypt.resolveDomain', { domain }).catch(() => null)
					if (!found) {
						promises.push(ctx.call('v1.certificates.letsencrypt.dns', { domain }))
					}
				}

				return Promise.allSettled(promises);
			}
		},
		boostrap: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const promises = []

				const services = await ctx.call('v1.services.templates.instances.find')

				for (let index = 0; index < config.bootstrap.length; index++) {
					const element = config.bootstrap[index];
					const templates = new Set();
					const list = []


					for (let i = 0; i < element.services.length; i++) {
						const serviceName = element.services[i];
						const service = services.find((s) => s.service == serviceName)
						if (!service) {
							continue;
						}
						templates.add(service.template)
						list.push(service)
					}
					for (let i = 0; i < element.agents.length; i++) {
						const serviceName = element.agents[i];
						const service = services.find((s) => s.service == serviceName)
						if (!service) {
							continue;
						}
						templates.add(service.template)
						list.push(service)
					}

					for (const id of templates.values()) {
						const template = await ctx.call('v1.services.templates.resolve', {
							id
						});
						const cwd = `/mnt/${template.name}`;
						promises.push(ctx.call('v1.services.updateTemplateRepo', {
							template: id,
							nodeID: element.nodeID
						}).then(() => {
							return Promise.allSettled(list
								.filter((service) => service.template == id)
								.map((templateService) => {
									return ctx.call('v1.services.create', {
										nodeID: element.nodeID,
										path: `${cwd}/${templateService.path}`,
										service: templateService.service,
										version: templateService.version,
										template: id,
										instance: templateService.id,
									})
								}))
						}))
					}



				}

				return Promise.all(promises)
			}
		},
		updateAllTemplateRepo: {
			description: "Add members to the addon",
			params: {
				template: { type: "string", empty: false, optional: false },
			},
			async handler(ctx) {
				const { template } = Object.assign({}, ctx.params);

				const services = await this.findEntities(null, {
					query: {
						template
					}
				})

				let nodes = new Set()
				for (let index = 0; index < services.length; index++) {
					const entity = services[index];
					nodes.add(entity.nodeID)
				}
				const promises = []
				for (const nodeID of nodes.values()) {
					console.log(nodeID)
					promises.push(ctx.call('v1.services.updateTemplateRepo', {
						template,
						nodeID
					}).then((res) => { return { ...res, nodeID } }))

				}


				return Promise.allSettled(promises)
			}
		},
		updateTemplateRepo: {
			description: "Add members to the addon",
			params: {
				template: { type: "string", empty: false, optional: false },
				nodeID: { type: "string", empty: false, optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const nodeID = params.nodeID;

				const template = await ctx.call('v1.services.templates.resolve', {
					id: params.template
				});

				const cwd = `/mnt/${template.name}`;

				const access = await ctx.call('v1.node.fs.access', {
					path: cwd
				}, { nodeID });

				if (!access) {
					await ctx.call('v1.node.fs.mkdir', {
						path: cwd
					}, { nodeID });
				}

				return ctx.call('v1.node.agent.repo', {
					npm: true,
					remote: template.remote,
					branch: template.branch,
					cwd,
				}, { nodeID });
			}
		},
		deploy: {
			description: "Add members to the addon",
			params: {
				services: [{ type: "array", items: "string", empty: false, optional: false }],
				ddns: [{ type: "array", items: "string", empty: false, optional: false }],
				proxy: [{ type: "array", items: "string", empty: false, optional: false }],
				dnsDomain: { type: "string", empty: false, optional: false },
				mainDomain: { type: "string", empty: false, optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const templates = await ctx.call('v1.services.templates.find', {

				})

				const services = await ctx.call('v1.services.templates.instances.find', {
					query: { serviceType: 'service' }
				})
				const agents = await ctx.call('v1.services.templates.instances.find', {
					query: { serviceType: 'agent' }
				})

				const list = await ctx.call("$node.list").then((res) => res.filter((node) => isNaN(node.id.split('-').pop())).map((node) => node.id))
				const promises = [];

				for (let index = 0; index < list.length; index++) {
					const nodeID = list[index];
					for (let i = 0; i < templates.length; i++) {
						const template = templates[i];
						const cwd = `/tmp/${template.name}`;
						await ctx.call('v1.node.agent.repo', {
							npm: true,
							remote: template.remote,
							branch: template.branch,
							cwd,
						}, { nodeID }).catch((err) => {
							console.log('v1.node.agent.repo', 'error', template);
						});
					}
				}

				for (let index = 0; index < list.length; index++) {
					const nodeID = list[index];
					for (let i = 0; i < agents.length; i++) {
						const agent = agents[i];
						const template = templates.find((template) => template.id == agent.template)
						const cwd = `/tmp/${template.name}`
						promises.push(ctx.call('v1.services.create', {
							nodeID,
							path: `${cwd}/${agent.path}`,
							service: agent.service,
							version: agent.version,
							template: template.id,
							instance: agent.id,
						}))
					}
				}

				return Promise.allSettled(promises)
			}
		},
		test: {
			description: "Add members to the addon",
			params: {},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const hosts = await ctx.call('v1.routes.hosts.find')

				return Promise.allSettled(hosts.map((host) => {
					return ctx.call('v1.routes.hosts.update', {
						id: host.id,
						cluster: 'default'
					})
				}))
			}
		},
		startTemplate: {
			description: "Add members to the addon",
			params: {
				template: { type: "string", empty: false, optional: false },
				nodeID: { type: "string", empty: false, optional: true },
				services: { type: "boolean", default: true, optional: true },
				agents: { type: "boolean", default: false, optional: true },
				npm: { type: "boolean", default: true, optional: true },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const nodeID = params.nodeID
				if (!nodeID) {

					const list = await ctx.call("$node.list");
					const promises = [];

					for (let index = 0; index < list.length; index++) {
						const node = list[index];
						if (isNaN(node.id.split('-').pop())) {
							promises.push(this.actions.startTemplate({
								...params,
								nodeID: node.id
							}, { parentCtx: ctx }))
						}
					}
					return Promise.all(promises)
				}

				const template = await ctx.call('v1.services.templates.resolve', {
					id: params.template,
					populate: ['services', 'agents']
				})

				const cwd = `/mnt/${template.name}`

				const access = await ctx.call('v1.node.fs.access', {
					path: cwd
				}, { nodeID });

				if (!access) {
					await ctx.call('v1.node.fs.mkdir', {
						path: cwd
					}, { nodeID })
				}

				await ctx.call('v1.node.agent.repo', {
					npm: params.npm,
					remote: template.remote,
					branch: template.branch,
					cwd,
				}, { nodeID }).then((res) => { console.log(res) }).catch((err) => { console.log(err) });

				const promises = [];

				if (params.services) {
					for (let index = 0; index < template.services.length; index++) {
						const templateService = template.services[index];
						promises.push(ctx.call('v1.services.create', {
							nodeID,
							path: `${cwd}/${templateService.path}`,
							service: templateService.service,
							version: templateService.version,
							template: template.id,
							instance: templateService.id,
						})
							.catch(() =>
								ctx.call('v1.services.resolveService', {
									service: templateService.service,
									version: templateService.version,
									nodeID
								}).then((service) => ctx.call('v1.services.reload', { id: service.id })))
						);
					}
				}
				if (params.agents) {
					for (let index = 0; index < template.agents.length; index++) {
						const templateService = template.agents[index];

						promises.push(ctx.call('v1.services.create', {
							nodeID,
							path: `${cwd}/${templateService.path}`,
							service: templateService.service,
							version: templateService.version,
							template: template.id,
							instance: templateService.id,
						})
							.catch(() =>
								ctx.call('v1.services.resolveService', {
									service: templateService.service,
									version: templateService.version,
									nodeID
								}).then((service) => ctx.call('v1.services.reload', { id: service.id })))
						);
					}
				}

				return Promise.all(promises);
			}
		},

		reload: {
			rest: 'POST /:id/reload',
			description: "Add members to the addon",
			params: {
				id: { type: "string", empty: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const service = await this.resolveEntities(ctx, { id: params.id })
				return ctx.call('v1.node.agent.reload', service, { nodeID: service.nodeID });
			}
		},

		start: {
			rest: 'POST /:id/start',
			description: "Add members to the addon",
			params: {
				id: { type: "string", empty: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const service = await this.resolveEntities(ctx, { id: params.id })
				return ctx.call('v1.node.agent.start', service, { nodeID: service.nodeID });
			}
		},

		stop: {
			rest: 'POST /:id/stop',
			description: "Add members to the addon",
			params: {
				id: { type: "string", empty: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const service = await this.resolveEntities(ctx, { id: params.id })
				return ctx.call('v1.node.agent.stop', service, { nodeID: service.nodeID });
			}
		},

		removeAll: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const services = await this.findEntities(ctx, { scope: false })
				return Promise.allSettled(services.map((service) => {
					return this.removeEntities(ctx, { id: service.id })
				}))
			}
		},

		stopAll: {
			description: "Add members to the addon",
			params: {

			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const services = await this.findEntities(ctx, { scope: false })
				return Promise.allSettled(services.map((service) => {
					return this.actions.stop({ id: service.id })
				}))
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		async "$node.connected"(ctx) {
			const params = Object.assign({}, ctx.params);

			setTimeout(async () => {
				const nodeID = params.node.id
				const keys = Object.keys(config)
				for (let index = 0; index < keys.length; index++) {
					const key = keys[index];
					const value = config[key];
					if (key !== 'services' && !Array.isArray(value))
						await ctx.call('v1.node.setEnv', { key, value }, { nodeID }).catch(() => {

						})
				}

				let services = await this.findEntities(ctx, { query: { nodeID } });

				for (let index = 0; index < services.length; index++) {
					const service = services[index];

					await ctx.call('v1.node.agent.start', service, { nodeID })
				}

				this.logger.info(`Node '${params.node.id}' is connected! $node.connected`, services);
			}, 1000)

		},
		async "$node.disconnected"(ctx) {
			const params = Object.assign({}, ctx.params);
			const nodeID = params.node.id
			this.logger.info(`Node '${params.node.id}' is connected! $node.disconnected`);
		},
	},

	/**
	 * Methods
	 */
	methods: {
		async validateSingle({ ctx, value, params, id, entity }) {

			return this.countEntities(ctx, {
				query: {
					nodeID: params.nodeID,
					service: params.service,
					version: params.version,
				}
			}).then((count) => count > 0 ? `Dup item` : true)
		},
		async seedDB() {
			const entities = []
			if (entities.length)
				await this.createEntities(null, entities)

		},
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
		//this.actions.startAll().catch(() => null)
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};
