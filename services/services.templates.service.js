"use strict";

const DbService = require("db-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "services.templates",
	version: 1,

	mixins: [
		DbService({}),
		//ConfigLoader(['services.**']),
	],

	/**
	 * Service dependencies
	 */
	dependencies: [
		'v1.services.templates.instances'
	],

	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/services-templates/",

		fields: {
			remote: {
				type: "string",
				required: true,
				trim: true,
				empty: false
			},
			branch: {
				type: "string",
				required: true,
				trim: true,
				empty: false
			},
			name: {
				type: "string",
				required: true,
				trim: true,
				empty: false
			},


			services: {
				type: "array",
				virtual: true,
				populate: function (ctx, values, entities, field) {
					return Promise.all(
						entities.map(async entity => {
							return ctx.call("v1.services.templates.instances.find", {
								query: { template: this.encodeID(entity._id), serviceType: 'service' },
							})
						})
					);
				}
			},

			agents: {
				type: "array",
				virtual: true,
				populate: function (ctx, values, entities, field) {
					return Promise.all(
						entities.map(async entity => {
							return ctx.call("v1.services.templates.instances.find", {
								query: { template: this.encodeID(entity._id), serviceType: 'agent' },
							})
						})
					);
				}
			},
		},

		defaultPopulates: [],

		scopes: {
			
		},

		defaultScopes: []
	},

	/**
	 * Actions
	 */

	actions: {
		
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

			if (entities.length) {
				for (let index = 0; index < entities.length; index++) {
					const entity = entities[index];
					const template = await this.createEntity(null, {
						remote: entity.remote,
						branch: entity.branch,
						name: entity.name,
					})
					for (let i = 0; i < entity.services.length; i++) {
						const serviceEntity = entity.services[i];
						serviceEntity.template = template.id;
						serviceEntity.serviceType = 'service';
						console.log(serviceEntity)
						await this.broker.call('v1.services.templates.instances.create', serviceEntity)
					}
					for (let i = 0; i < entity.agents.length; i++) {
						const serviceEntity = entity.agents[i];
						serviceEntity.template = template.id;
						serviceEntity.serviceType = 'agent';
						await this.broker.call('v1.services.templates.instances.create', serviceEntity)
					}
				}
			}

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
