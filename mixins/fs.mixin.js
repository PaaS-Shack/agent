"use strict";

const { MoleculerClientError, MoleculerRetryableError } = require("moleculer").Errors;

const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const constants = require("fs").constants;



module.exports = {
    name: "fs",
    version: 1,
    /**
     * Actions
     */
    actions: {
        'fs.access': {
            params: {
                path: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.access(params.path, constants.R_OK | constants.W_OK).then(() => true).catch(() => false)
            }
        },
        'fs.appendFile': {
            params: {
                path: { type: "string", empty: false, optional: false },
                data: { type: "string", empty: false, optional: false },
                encoding: { type: "string", default: 'utf8', empty: false, optional: true },
                mode: { type: "number", default: 0o666, optional: true },
                flag: { type: "string", default: 'a', empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.appendFile(params.path, params.data, {
                    encoding: params.encoding,
                    mode: params.mode,
                    flag: params.flag,
                }).then(() => true)
            }
        },
        'fs.chmod': {
            params: {
                path: { type: "string", empty: false, optional: false },
                mode: { type: "number", default: 0o666, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.chmod(params.path, params.mode).then(() => true)
            }
        },
        'fs.chown': {
            params: {
                path: { type: "string", empty: false, optional: false },
                gid: { type: "number", optional: false },
                uid: { type: "number", optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.chown(params.path, params.gid, params.uid).then(() => true)
            }
        },
        'fs.copyFile': {
            params: {
                src: { type: "string", empty: false, optional: false },
                dest: { type: "string", empty: false, optional: false },
                EXCL: { type: "boolean", default: true, optional: false },
                FICLONE: { type: "boolean", default: true, optional: false },
                FICLONE_FORCE: { type: "boolean", default: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                let mode = 0;
                if (params.EXCL)
                    mode |= constants.COPYFILE_EXCL;
                if (params.FICLONE)
                    mode |= constants.COPYFILE_FICLONE;
                if (params.FICLONE_FORCE)
                    mode |= constants.COPYFILE_FICLONE_FORCE;
                return fs.copyFile(params.src, params.dest, mode).then(() => true)
            }
        },
        'fs.link': {
            params: {
                src: { type: "string", empty: false, optional: false },
                dest: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.link(params.src, params.dest).then(() => true)
            }
        },
        'fs.mkdir': {
            params: {
                path: { type: "string", empty: false, optional: false },
                recursive: { type: "boolean", default: true, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.mkdir(params.path, { recursive: params.recursive }).then(() => true)
            }
        },
        'fs.mkdtemp': {
            params: {
                prefix: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.mkdtemp(path.join(os.tmpdir(), `${params.prefix}-`))
            }
        },
        'fs.readdir': {
            params: {
                path: { type: "string", empty: false, optional: false },
                encoding: { type: "string", default: 'utf8', empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.readdir(params.path, {
                    encoding: params.encoding
                })
            }
        },
        'fs.readFile': {
            params: {
                path: { type: "string", empty: false, optional: false },
                encoding: { type: "string", default: 'utf8', empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.readFile(params.path, {
                    encoding: params.encoding
                })
            }
        },
        'fs.readlink': {
            params: {
                path: { type: "string", empty: false, optional: false },
                encoding: { type: "string", default: 'utf8', empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.readlink(params.path, {
                    encoding: params.encoding
                })
            }
        },
        'fs.realpath': {
            params: {
                path: { type: "string", empty: false, optional: false },
                encoding: { type: "string", default: 'utf8', empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.realpath(params.path, {
                    encoding: params.encoding
                })
            }
        },
        'fs.rename': {
            params: {
                src: { type: "string", empty: false, optional: false },
                dest: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.rename(params.src, params.dest).then(() => true)
            }
        },
        'fs.rmdir': {
            params: {
                path: { type: "string", empty: false, optional: false },
                recursive: { type: "boolean", default: true, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.rmdir(params.path, {
                    recursive: params.recursive
                }).then(() => true)
            }
        },
        'fs.rm': {
            params: {
                path: { type: "string", empty: false, optional: false },
                recursive: { type: "boolean", default: true, optional: false },
                force: { type: "boolean", default: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.rm(params.path, {
                    force: params.force,
                    recursive: params.recursive
                }).then(() => true)
            }
        },
        'fs.stat': {
            params: {
                path: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.stat(params.path)
            }
        },
        'fs.unlink': {
            params: {
                path: { type: "string", empty: false, optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.unlink(params.path).then(() => true)
            }
        },
        'fs.writeFile': {
            params: {
                path: { type: "string", empty: false, optional: false },
                data: { type: "string", empty: false, optional: false },
                encoding: { type: "string", default: 'utf8', empty: false, optional: true },
                mode: { type: "number", default: 0o666, optional: true },
                flag: { type: "string", default: 'w', empty: false, optional: true },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return fs.writeFile(params.path, params.data, {
                    encoding: params.encoding,
                    mode: params.mode,
                    flag: params.flag,
                }).then(() => true)
            }
        },
    },
};