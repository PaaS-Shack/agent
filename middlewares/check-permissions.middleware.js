"use strict";

const _ = require("lodash");
const { MoleculerClientError } = require("moleculer").Errors;
//const C = require("../constants");

module.exports = {
	name: "CheckPermissions",

	// Wrap local action handlers
	localAction(handler, action) {
		// If this feature enabled
		if (action.permissions) {
			const permissions = Array.isArray(action.permissions)
				? action.permissions
				: [action.permissions];

			const permNames = [];
			const permFuncs = [];
			permissions.forEach(p => {
				if (_.isFunction(p)) {
					// Add custom permission function
					return permFuncs.push(p);
				}

				


				if (_.isString(p)) {

					// if (p == C.ROLE_AUTHENTICATED) {
					// 	// Check if user is logged in
					// 	return permFuncs.push(async ctx => {
					// 		return !!ctx.meta.userID;
					// 	});
					// }

					// if (p == C.ROLE_OWNER) {
					// 	// Check if user is owner of the app
					// 	return permFuncs.push(async ctx => {
					// 		if (_.isFunction(ctx.service.isOwner))
					// 			return ctx.service.isOwner.call(this, ctx);
					// 		return false;
					// 	});
					// }

					// if (p == C.ROLE_MEMBER) {
					// 	// Check if user is a member of the app
					// 	return permFuncs.push(async ctx => {
					// 		if (_.isFunction(ctx.service.isMember))
					// 			return ctx.service.isMember.call(this, ctx);
					// 		return false;
					// 	});
					// }

					// if (p == C.ROLE_APP_OWNER) {
					// 	// Check if user is owner of the app
					// 	return permFuncs.push(async ctx => {
					// 		if (_.isFunction(ctx.service.isAppOwner))
					// 			return ctx.service.isAppOwner.call(this, ctx);
					// 		return false;
					// 	});
					// }

					// if (p == C.ROLE_APP_MEMBER) {
					// 	// Check if user is member of the entity
					// 	return permFuncs.push(async ctx => {
					// 		if (_.isFunction(ctx.service.isAppMember))
					// 			return ctx.service.isAppMember.call(this, ctx);
					// 		return false;
					// 	});
					// }
					// if (p == C.ROLE_ADMINISTRATOR || p == C.ROLE_SYSTEM) {
					// 	// Check if user is member of the entity
					// 	return permFuncs.push(async ctx => {
					// 		if(!ctx.meta.roles)return true
					// 		return ctx.meta.roles.includes(C.ROLE_ADMINISTRATOR) || ctx.meta.roles.includes(C.ROLE_SYSTEM)
					// 	});
					// }

					// Add role or permission name
					permNames.push(p);
				}
			});

			return async function CheckPermissionsMiddleware(ctx) {
				let res = false;

				if (ctx.meta.$repl == true) res = true;
				//if (ctx.meta.roles && (ctx.meta.roles.includes(C.ROLE_ADMINISTRATOR) || ctx.meta.roles.includes(C.ROLE_SYSTEM))) res = true;
				if (permFuncs.length == 0) res = true;

				if (res !== true) {
					if (permFuncs.length > 0) {
						const results = await ctx.broker.Promise.all(
							permFuncs.map(async fn => fn.call(this, ctx))
						);
						res = results.some(r => !!r);
					}

					if (res !== true)
						throw new MoleculerClientError(
							"You have no right for this operation!",
							401,
							"ERR_HAS_NO_ACCESS",
							{ action: action.name }
						);
				}

				// Call the handler
				return handler(ctx);
			}.bind(this);
		}

		// Return original handler, because feature is disabled
		return handler;
	}
};
