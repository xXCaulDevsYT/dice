// Copyright 2018 Jonah Snider

const { Command } = require('discord.js-commando');
const config = require('../../config');
const diceAPI = require('../../providers/diceAPI');
const winston = require('winston');

module.exports = class UserListCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'user-list',
			group: 'dev',
			memberName: 'user-list',
			description: `List all users of <@${config.clientID}>.`,
			details: 'Only the bot owner(s) may use this command.',
			aliases: ['list-users'],
			throttling: {
				usages: 2,
				duration: 40
			},
			ownerOnly: true
		});
	}

	async run(msg) {
		try {
			msg.channel.startTyping();

			const database = await diceAPI.allUsers();
			const userList = [];

			msg.reply('About to start fetching users, this could take an extremely long time.');
			for(let index = 0; index < database.length; index++) {
				winston.debug(`[COMMAND](USER-LIST) Checking ID #${index + 1}. ${database[index].id}`);
				userList.push(`${await this.client.users.fetch(database[index].id).tag} (\`${database[index].id}\`)`);
			}

			winston.debug(`[COMMAND](USER-LIST) First item in userList: ${userList[0]}`);

			return msg.reply(`👤 ${userList.join('\n')}\n
			${await diceAPI.totalUsers()} users in total. ${userList.length} users were listed.`, { split: true });
		} finally {
			msg.channel.stopTyping();
		}
	}
};
