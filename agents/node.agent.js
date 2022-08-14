"use strict";

const os = require('os');
const { exec } = require('child_process');

const Pty = require("node-pty");
const Streams = require('stream')

const GitService = require("../mixins/git.mixin");
const FSService = require("../mixins/fs.mixin");
const AgentService = require("../mixins/agent.mixin");

module.exports = {
    name: "node",
    version: 1,
    mixins: [
        GitService,
        FSService,
        AgentService
    ],

    /**
     * Default settings
     */
    settings: {

    },


    dependencies: [

    ],
    /**
     * Actions
     */
    actions: {
        heartbeat: {
            params: {},
            permissions: ['node.heartbeat'],
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                const hostname = os.hostname();
                const arch = os.arch();
                const platform = os.platform();
                const totalmem = os.totalmem();
                const freemem = os.freemem();


                const molecular = await ctx.call("$node.health")

                const cpus = os.cpus();
                let cpuStr = cpus[0].model.split(' ')

                let cpu = {
                    vendor: cpuStr[0],
                    family: cpuStr[1],
                    model: cpuStr[2],
                    speedString: cpuStr.pop(),
                    cores: cpus.length,
                    ...molecular.cpu
                }

                cpu.speed = Number(cpu.speedString.substr(0, cpu.speedString.length - 3))

                if (isNaN(cpu.speed)) {
                    cpu.speed = Number((cpus[0].speed / 1000).toFixed(2))
                }

                let memory = {
                    ...molecular.mem
                }
                memory.used = memory.total - memory.free;


                return {
                    hostname,
                    arch,
                    platform,
                    memory,
                    cpu,
                    region: this.settings.region,
                    role: this.settings.role,
                    index: this.settings.index,
                    ...molecular.os
                };
            }
        },
        ping: {
            params: {},
            async handler(ctx) {
                return this.broker.ping()
            }
        },
        cmd: {
            params: {
                cmd: { type: "string", optional: false },
                cwd: { type: "string", default: process.cwd(), optional: true }
            },
            permissions: ['node.cmd'],
            async handler(ctx) {
                const { cmd, cwd } = ctx.params
                return new Promise((resolve, reject) => {
                    exec(cmd, { cwd: cwd }, (err, stdout, stderr) => {
                        if (err) reject(err)
                        else resolve({ stdout, stderr })
                    });
                })
            }
        },
        setEnv: {
            params: {
                key: { type: "string", optional: false },
                value: { type: "string", optional: false }
            },
            permissions: ['node.cmd'],
            async handler(ctx) {
                const { key, value } = ctx.params
                return process.env[key] = value;
            }
        },
        getEnv: {
            params: {
                key: { type: "string", optional: true }
            },
            permissions: ['node.cmd'],
            async handler(ctx) {
                const { key } = ctx.params
                return key ? process.env[key] : process.env;
            }
        },
        shutdown: {
            params: {},
            permissions: ['node.shutdown'],
            async handler(ctx) {
                return new Promise((resolve, reject) => {
                    resolve()
                    setTimeout(async () => {
                        await this.broker.stop()
                        exec('shutdown -h now');
                    }, 1000)
                })
            }
        },
        reboot: {
            params: {},
            permissions: ['node.reboot'],
            async handler(ctx) {
                return new Promise((resolve, reject) => {
                    resolve()
                    setTimeout(async () => {
                        await this.broker.stop()
                        exec('reboot');
                    }, 1000)
                })
            }
        },
        restart: {
            params: {},
            permissions: ['node.restart'],
            async handler(ctx) {
                return new Promise((resolve, reject) => {
                    resolve()
                    setTimeout(async () => {
                        await this.broker.stop()
                        process.exit()
                    }, 1000)
                })
            }
        },

        ttyStream: {
            params: {},
            permissions: ['node.ttyStream'],
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);


                const stream = new Streams.PassThrough()

                let onWriteData = (data) => {
                    this.ttyWriteStream.write(data)
                }
                let onReadData = (data) => {
                    stream.write(data)
                }

                let onEnd = (data) => {
                    ctx.params.removeListener('data', onWriteData);
                    this.ttyReadStream.removeListener('data', onReadData)
                }

                ctx.params.on('data', onWriteData);
                ctx.params.once('finish', onEnd);

                for (let index = 0; index < this.logs.length; index++) {
                    const data = this.logs[index];
                    stream.write(data)
                }

                this.ttyReadStream.on('data', onReadData)
                return stream
            }
        },
        listNetworks: {
            params: {},
            permissions: ['node.listNetworks'],
            async handler(ctx) {
                return this.listNetworks()
            }
        },

    },

    /**
     * Methods
     */
    methods: {
        createPty() {

            if (!this.ttyReadStream)
                this.ttyReadStream = new Streams.PassThrough()
            if (!this.ttyWriteStream) {
                this.ttyWriteStream = new Streams.PassThrough()

                this.ttyWriteStream.on('data', (data) => {
                    this.tty.write(data)
                });
            }

            this.logs = []
            this.tty = Pty.spawn("bash", [], {
                name: 'xterm-color',
                cols: 120,
                rows: 40,
                cwd: process.env.PWD,
                env: Object.assign({}, process.env)
            });
            this.tty.on('data', (data) => {
                this.logs.push(data)
                if (this.logs.length > 50) {
                    this.logs.shift()
                }
                this.ttyReadStream.write(data)
            });

            this.tty.on('exit', (code, signal) => {
                this.createPty();
            });
        },
        //networking
        listNetworks() {
            let networkInterfaces = os.networkInterfaces();
            let interfaces = []
            const attached = this.settings.attached;
            for (const [dev, value] of Object.entries(networkInterfaces)) {
                if (dev.substring(0, 3) == 'br-') {
                    continue;
                }
                const arry = value
                    .filter((iface) =>
                        //iface.family == 'IPv4' &&
                        iface.address.substring(0, 3) !== '127' &&
                        iface.address !== '::1')
                    .map((iface) => {
                        let ip = iface.address.split('.');
                        const endDot = ip.pop();

                        iface.dev = dev;
                        iface.family = iface.family.toLowerCase();;
                        iface.public = ip[0] !== '10' && ip[0] !== '172';
                        iface.tunnel = dev.substring(0, 3) == 'tun' || dev.substring(0, 2) == 'wg' || dev.substring(0, 'shared'.length) == 'shared';

                        if (iface.family == 'ipv4') {
                            iface.network = `${ip.join('.')}.0/24`;
                            iface.broadcast = `${ip.join('.')}.255`;
                            iface.subip = `${ip.join('.')}`;
                        } else {
                            iface.network = null;
                            iface.broadcast = null;
                            iface.subip = null;

                            if (iface.scopeid != 0) {
                                iface.public = false
                            }

                        }

                        iface.gateway = endDot == '1';


                        iface.docker = dev.substring(0, 6) == 'docker' || dev.substring(0, 3) == 'br-' || dev.substring(0, 4) == 'veth';
                        iface.internal = !iface.public && !iface.tunnel && !iface.docker;

                        if (!iface.internal && ip[0] == '192' && ip[1] == '168') {
                            iface.internal = true
                        }
                        return iface;
                    });

                interfaces.push(...arry)

            }

            return interfaces;
        }
    },
    events: {

    },
    async stopped() {
        this.tty.kill();
    },

    async started() {
        this.createPty();
    }
};