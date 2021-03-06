// Copyright 2018 Jonah Snider

const { Command } = require('discord.js-commando');
const config = require('../../config');
const diceAPI = require('../../providers/diceAPI');
const { respond } = require('../../providers/simpleCommandResponse');

module.exports = class TransferCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'transfer',
			group: 'economy',
			memberName: 'transfer',
			description: 'Transfer oats to another user.',
			aliases: ['send', 'pay'],
			examples: ['transfer 500 @Dice'],
			args: [
				{
					key: 'amount',
					prompt: 'How many oats do you want to transfer?',
					type: 'float',
					parse: amount => diceAPI.simpleFormat(amount),
					min: config.minWager
				},
				{
					key: 'user',
					prompt: 'Who do you want to transfer oats to?',
					type: 'user'
				}
			],
			throttling: {
				usages: 1,
				duration: 30
			}
		});
	}

	async run(msg, { user, amount }) {
		try {
			msg.channel.startTyping();

			// Amount checking
			if(amount > await diceAPI.getBalance(msg.author.id)) {
				// eslint-disable-next-line max-len
				return msg.reply(`❌ You need to have at least \`${amount.toLocaleString()}\` ${config.currency.plural}. Your balance is \`${await diceAPI.getBalance(msg.author.id)}\`.`);
			}

			// No sending money to yourself
			if(msg.author.id === user.id) {
				return msg.reply('❌ You can\'t send money to yourself.');
			}

			// No sending money to bots
			if(user.bot === true && user.id !== this.client.user.id) {
				return msg.reply(`❌ You can't send ${config.currency.plural} to bots.`);
			}

			// Remove oats from sender
			await diceAPI.decreaseBalance(msg.author.id, amount);

			// Add oats to receiver
			await diceAPI.increaseBalance(user.id, amount);

			// Respond to author with success
			respond(msg);

			return null;
		} finally {
			msg.channel.stopTyping();
		}
	}
};
