"use strict";

const { MoleculerClientError, MoleculerRetryableError } = require("moleculer").Errors;

const simpleGit = require('simple-git');

module.exports = {
    name: "gits",
    version: 1,
    /**
     * Default settings
     */
    settings: {

    },
    /**
     * Actions
     */
    actions: {
        'git.checkIsRepo': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                bare: { type: "boolean", default: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                try {
                    return simpleGit(params.cwd).checkIsRepo(params.bare ? 'bare' : undefined)
                } catch (err) {
                    return false
                }
            }
        },
        'git.checkout': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                branch: { type: "string", empty: false, default: 'main', optional: true },
                commit: { type: "string", empty: false, optional: true },
                origin: { type: "string", empty: false, default: 'origin', optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                const origin = params.origin;
                return Promise.resolve()
                    .then(() => repo.pull(origin, params.branch))
                    .then(() => repo.checkout(params.commit ? params.commit : params.branch))
                    .then(() => repo.log())
                    .then(({ latest }) => latest);
            }
        },
        'git.pull': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                origin: { type: "string", empty: false, default: 'origin', optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                const origin = params.origin;
                return Promise.resolve()
                    .then(() => repo.pull(origin))
                    .then(() => repo.log())
                    .then(({ latest }) => latest);
            }
        },
        'git.fetchBare': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                path: { type: "string", empty: false, optional: false },
                origin: { type: "string", empty: false, default: 'origin', optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const origin = params.origin;
                const repo = await this.getRepo(params.cwd, true)
                const remotes = await repo.getRemotes()
                if (!remotes.find((el) => el.name == origin))
                    await repo.addRemote(origin, params.path)
                return Promise.resolve()
                    .then(() => repo.fetch(origin));
            }
        },
        'git.push': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                path: { type: "string", empty: false, optional: false },
                branch: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                return Promise.resolve()
                    .then(() => repo.push(params.path, params.branch))
            }
        },
        'git.fetch': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                origin: { type: "string", empty: false, default: 'origin', optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                return Promise.resolve()
                    .then(() => repo.fetch(params.origin))
            }
        },
        'git.status': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                path: { type: "string", empty: false, optional: false },
                branch: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                return Promise.resolve()
                    .then(() => repo.checkout(params.branch))
                    .then(() => repo.status())
            }
        },
        'git.init': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                bare: { type: "boolean", default: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = simpleGit(params.cwd, {
                    progress({ method, stage, progress }) {
                        console.log(`git.${method} ${stage} stage ${progress}% complete`);
                    },
                });
                return repo.checkIsRepo(params.bare ? 'bare' : undefined)
                    .then((isRepo) => !isRepo && repo.init(params.bare))
                    .then(() => repo)
            }
        },
        'git.log': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                branch: { type: "string", empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                return Promise.resolve()
                    .then(() => repo.checkout(params.branch))
                    .then(() => repo.log())
            }
        },
        'git.getRemotes': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                branch: { type: "string", empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                return Promise.resolve()
                    .then(() => repo.checkout(params.branch))
                    .then(() => repo.getRemotes(true))
            }
        },
        'git.addRemote': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                path: { type: "string", empty: false, optional: true },
                origin: { type: "string", empty: false, default: 'origin', optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                return Promise.resolve()
                    .then(() => repo.addRemote(params.origin, params.path))
            }
        },
        'git.removeRemote': {
            params: {
                cwd: { type: "string", empty: false, optional: false },
                origin: { type: "string", empty: false, default: 'origin', optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const repo = await this.getRepo(params.cwd)
                return Promise.resolve()
                    .then(() => repo.removeRemote(params.origin))
            }
        },
    },
    /**
     * Methods
     */
    methods: {
        async getRepo(cwd, bare = false) {
            const repo = simpleGit(cwd, {
                progress({ method, stage, progress }) {
                    console.log(`git.${method} ${stage} stage ${progress}% complete`);
                },
            });
            return repo.checkIsRepo(bare ? 'bare' : undefined)
                .then((isRepo) => !isRepo && repo.init(bare))
                .then(() => repo)
        }
    }
};