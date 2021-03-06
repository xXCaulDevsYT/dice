// Copyright 2018 Jonah Snider

const moment = require('moment');
const { Command } = require('discord.js-commando');
const config = require('../../config');
const packageData = require('../../package');

module.exports = class BotInfoCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'bot-info',
			group: 'util',
			memberName: 'bot-info',
			description: `Information about <@${config.clientID}>.`,
			aliases: [
				'github',
				'uptime',
				'git',
				'version',
				'bot',
				'memory',
				'ram',
				'memory-usage',
				'ram-usage'
			],
			clientPermissions: ['EMBED_LINKS'],
			throttling: {
				usages: 3,
				duration: 8
			}
		});
	}

	run(msg) {
		try {
			msg.channel.startTyping();
			return msg.replyEmbed({
				title: 'Dice',
				url: 'https://github.com/PizzaFox/dice',
				color: 0x4caf50,
				// eslint-disable-next-line max-len
				description: `${this.client.user} is made by PizzaFox#0075. It was first a game bot based off the game [bustadice](https://bustadice.com). Later, more features were created and added, one by one creating the ${this.client.user} we have today. In March 2018 Dice was accepted into the [Discoin](https://dice.js.org/discoin) network, a system allowing for participating bots to convert currencies.`,
				thumbnail: { url: this.client.user.displayAvatarURL({ format: 'webp' }) },
				fields: [{
					name: '🕒 Uptime',
					value: moment.duration(this.client.uptime).humanize(),
					inline: true
				}, {
					name: '🎲 Dice version',
					value: `v${packageData.version}`,
					inline: true
				}, {
					name: '🔧 GitHub',
					value: `${this.client.user} is open source! [See the repository](https://github.com/PizzaFox/dice).`,
					inline: true
				}, {
					name: '🤠 Support team',
					value: 'okthx#1013 and Mr.Pig McOinks#3425'
				}, {
					name: '⚙ RAM usage',
					value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} megabytes`,
					inline: true
				}]
			});
		} finally {
			msg.channel.stopTyping();
		}
	}
};
