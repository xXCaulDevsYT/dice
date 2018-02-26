// Copyright 2018 Jonah Snider

// Set up dependencies
const { CommandoClient, FriendlyError } = require('discord.js-commando');
const path = require('path');
const replaceall = require('replaceall');
const { MongoClient } = require('mongodb');
const MongoDBProvider = require('commando-provider-mongo');
const DBL = require('dblapi.js');
const winston = require('winston');
winston.level = 'debug';
const diceAPI = require('./providers/diceAPI');
const request = require('request');
const rules = require('./rules');

// Set up bot metadata
const client = new CommandoClient({
	commandPrefix: '$$',
	owner: '210024244766179329',
	disableEveryone: true,
	unknownCommandResponse: false,
	invite: 'https://discord.gg/NpUmRkj'
});

client.registry
	// Registers your custom command groups
	.registerGroups([
		['util', 'Utility'],
		['dev', 'Developer'],
		['economy', 'Economy'],
		['minecraft', 'Minecraft'],
		['games', 'Games'],
		['mod', 'Moderation'],
		['fun', 'Fun']
	])

	// Registers all built-in groups, commands, and argument types
	.registerDefaults()

	// Registers all of your commands in the ./commands/ directory
	.registerCommandsIn(path.join(__dirname, 'commands'));

// Store settings (like a server prefix) in a MongoDB collection called "settings"
client.setProvider(
	MongoClient.connect(process.env.MONGODB_URI)
		.then(bot => new MongoDBProvider(bot, 'settings'))
);

// Blacklist users from commands
client.dispatcher.addInhibitor(msg => {
	const blacklist = client.provider.get('global', 'blacklist', []);
	if (blacklist.includes(msg.author.id)) {
		return ['blacklisted', msg.reply(`You have been blacklisted from ${client.user.username}.`)];
	} else {
		return false;
	}
});

/* Update server counter on bot listings */
const dbl = new DBL(process.env.DISCORDBOTSORG_TOKEN);

// Bots.discord.pw
const sendBotsDiscordPWServerCount = () => {
	const options = {
		method: 'POST',
		url: 'https://bots.discord.pw/api/bots/388191157869477888/stats',
		headers: {
			'cache-control': 'no-cache',
			authorization: process.env.BOTSDISCORDPW_TOKEN
		},
		body: {
			shard_id: client.shard.id,
			shard_count: client.shard.count,
			server_count: client.guilds.size
		},
		json: true
	};

	request(options, (err, httpResponse, body) => {
		if (err) return winston.error(`[DICE] ${err}`);
		if (body) {
			winston.debug('[DICE] Bots.Discord.pw results', body);
		}
	});
};

const updateServerCount = () => {
	if (client.user.id === '388191157869477888') {
		winston.verbose('[DICE] Sending POST requests to bot listings.');
		sendBotsDiscordPWServerCount();
		dbl.postStats(client.guilds.size, client.shard.id, client.shard.count);
	}
};

// Everytime a server adds or removes Dice, announce it
const announceServerCount = async (serverCount, newServer, date) => {
	let changeTypeColor;
	if (newServer === true) {
		changeTypeColor = 0x4caf50;
	} else if (newServer === false) {
		changeTypeColor = 0xf44336;
	} else {
		changeTypeColor = 0xff9800;
	}

	// #stats channel
	client.channels.find('id', '399451781261950977').send({
		embed: {
			timestamp: date,
			color: changeTypeColor,
			fields: [{
				name: 'Server Count',
				value: `\`${serverCount}\` servers`
			},
			{
				name: 'User Count',
				value: `\`${(await diceAPI.totalUsers()) - 1}\` users`
			}
			]
		}
	});
};
/* Update server counter on bot listings */

client
	.on('unhandledRejection', error => {
		winston.error();
		client.channels.get('411563928816975883').send({
			embed: {
				title: 'Unhandled Promise Rejection',
				timestamp: new Date(),
				color: 0xf44336,
				description: `\`\`\`${error.stack}\`\`\``
			}
		});
	})
	.on('rejectionHandled', error => {
		winston.error();
		client.channels.get('411563928816975883').send({
			embed: {
				title: 'Handled Promise Rejection',
				timestamp: new Date(),
				color: 0xf44336,
				description: `\`\`\`${error.stack}\`\`\``
			}
		});
	})
	.on('uncaughtException', error => {
		winston.error();
		client.channels.get('411563928816975883').send({
			embed: {
				title: 'Uncaught Exception',
				timestamp: new Date(),
				color: 0xf44336,
				description: `\`\`\`${error.stack}\`\`\``
			}
		});
	})
	.on('warning', warning => {
		winston.warn();
		client.channels.get('411563928816975883').send({
			embed: {
				title: 'Warning',
				timestamp: new Date(),
				color: 0xff9800,
				description: `\`\`\`${warning.stack}\`\`\``
			}
		});
	})
	.on('commandError', (command, error) => {
		if (error instanceof FriendlyError) return;
		winston.error(`[DICE]: Error in command ${command.groupID}:${command.memberName}`, error);
		client.channels.get('411563928816975883').send({
			embed: {
				title: 'Command Error',
				timestamp: new Date(),
				color: 0xf44336,
				description: `Error in command \`${command.groupID}:${command.memberName}\`\n\`\`\`${error.stack}\`\`\``
			}
		});
	})
	.on('ready', () => {
		winston.info(`[DICE] Logged in as ${client.user.tag}!`);

		// Set game presence to the help command once loaded
		client.user.setActivity('for @Dice help or $$help', {
			type: 'WATCHING'
		});

		updateServerCount();
	})
	.on('guildCreate', async (guild) => {
		/* Bot joins a new server */
		let count = await client.shard.broadcastEval('this.guilds.size');
		count = count.reduce((prev, val) => prev + val, 0);
		updateServerCount();
		announceServerCount(count, true, guild.me.joinedAt);
	})
	.on('guildDelete', async () => {
		/* Bot leaves a server */
		let count = await client.shard.broadcastEval('this.guilds.size');
		count = count.reduce((prev, val) => prev + val, 0);
		updateServerCount();
		announceServerCount(count, false, new Date());
	})
	.on('guildMemberAdd', member => {
		/* If member joined on the official Dice server announce it */
		if (member.guild.id === rules.homeServerID) {
			const guild = client.guilds.get(rules.homeServerID);
			// #joins
			const channel = guild.channels.get('399432904809250849');
			channel.send({
				embed: {
					title: 'New Member',
					timestamp: member.joinedAt,
					color: 0x4caf50,
					author: {
						name: `${member.user.tag} (${member.user.id})`,
						icon_url: member.user.displayAvatarURL(128)
					},
					fields: [{
						name: '#⃣ Number of Server Members',
						value: `\`${guild.members.size}\` members`
					}]
				}
			});
		}
	})
	.on('commandBlocked', async (msg, reason) => {
		client.channels.get('399458745480118272').send({
			embed: {
				title: 'Command Blocked',
				author: {
					name: `${msg.author.tag} (${msg.author.id})`,
					icon_url: msg.author.displayAvatarURL(128)
				},
				timestamp: new Date(msg.createdTimestamp),
				fields: [{
					name: '📝 Message',
					value: msg.content
				}, {
					name: '⛔ Reason',
					value: reason
				},
				{
					name: '🏦 User Balance',
					value: `\`${await diceAPI.getBalance(msg.author.id)}\` ${rules.currencyPlural}`
				},
				{
					name: `🏦 ${client.user.username} Balance`,
					value: `\`${await diceAPI.getBalance(client.user.id)}\` ${rules.currencyPlural}`
				}
				]
			}
		});
	})
	.on('commandRun', async (cmd, promise, message) => {
		// Command logger
		client.channels.get('399458745480118272').send({
			embed: {
				title: 'Command Run',
				author: {
					name: `${message.author.tag} (${message.author.id})`,
					icon_url: message.author.displayAvatarURL(128)
				},
				timestamp: new Date(message.createdTimestamp),
				fields: [{
					name: '📝 Message',
					value: message.content
				},
				{
					name: '🏦 User Balance',
					value: `\`${await diceAPI.getBalance(message.author.id)}\` ${rules.currencyPlural}`
				},
				{
					name: `🏦 ${client.user.username} Balance`,
					value: `\`${await diceAPI.getBalance(client.user.id)}\` ${rules.currencyPlural}`
				}
				]
			}
		});

		winston.silly(`[DICE] Command run by ${message.author.tag} (${message.author.id}): ${message.content}`);
	})
	.on('message', async msg => {
		/* Protecting bot token */
		const warning = `[DICE] TOKEN COMPROMISED, REGENERATE IMMEDIATELY!\n
		https://discordapp.com/developers/applications/me/${client.user.id}\n`;

		if (msg.content.includes(process.env.BOT_TOKEN) && msg.editable) {
			// Message is from bot so edit it
			msg.edit(replaceall(process.env.BOT_TOKEN, '--snip--', msg.content));

			winston.error(`[DICE] ${warning}
			Bot token found and edited in message from this bot.\n
			Message: ${msg.content}`);
		} else if (msg.content.includes(process.env.BOT_TOKEN) && msg.deletable) {
			// Message can be deleted, so delete it
			msg.delete().then(() => {

				winston.error(`[DICE] ${warning}
				Bot token found and deleted in message by ${msg.author.tag} (${msg.author.id}).\n
				Message: ${msg.content}`);
			});
		} else if (msg.content.includes(process.env.BOT_TOKEN) && !msg.editable && !msg.deletable) {
			// Message can't be delete or edited

			winston.error(`[DICE] ${warning}
			Bot token found in message by ${msg.author.tag} (${msg.author.id}).\n
			Message: ${msg.content}`);
		}
		/* Protecting bot token */
	});

// Log in the bot
client.login(process.env.BOT_TOKEN);
