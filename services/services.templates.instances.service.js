"use strict";

const DbService = require("db-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "services.templates.instances",
	version: 1,

	mixins: [
		DbService({}),
		//ConfigLoader(['services.**']),
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
		rest: "/v1/services-templates/",

		fields: {

			serviceType: {
				type: "string",
				required: true,
				trim: true,
				empty: false
			},

			template: {
				type: "string",
				empty: false,
				required: true,
				populate: {
					action: "v1.services.template.resolve",
					params: {
						//fields: ['id', 'address', 'family', "internal", "public", "tunnel"]
					}
				},
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
				empty: false
			},
			version: {
				type: "number",
				required: false,
				default: 1,
			},
			scalable: {
				type: "boolean",
				required: true,
				default: false,
			},


			count: {
				type: "number",
				virtual: true,
				populate: function (ctx, values, entities, field) {
					return Promise.all(
						entities.map(async entity => {
							return await ctx.call("v1.services.count", {
								query: { instance: this.encodeID(entity._id) },
							})
						})
					);
				}
			},
		},

		defaultPopulates: ['count'],

		scopes: {

		},

		defaultScopes: []
	},

	/**
	 * Actions
	 */

	actions: {
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
	},

	/**
	 * Events
	 */
	events: {

	},

	/**
	 * Methods
	 */
	methods: {

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

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};
