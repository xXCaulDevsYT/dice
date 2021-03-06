// Copyright 2018 Jonah Snider

const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const config = require('../../config');
const diceAPI = require('../../providers/diceAPI');

module.exports = class SimulateGameCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'simulate-game',
			group: 'games',
			memberName: 'simulate-game',
			description: 'Simulate a round of the betting game.',
			aliases: ['practice-game', 'sim-game', 'simulate-dice', 'sim-dice'],
			examples: ['simulate-game 250 4', 'sim 23-game 2.01'],
			clientPermissions: ['EMBED_LINKS'],
			args: [{
				key: 'wager',
				prompt: 'How much do you want to wager? (whole number)',
				type: 'integer',
				min: config.minWager
			}, {
				key: 'multiplier',
				prompt: 'How much do you want to multiply your wager by?',
				type: 'float',
				// Round multiplier to second decimal place
				parse: multiplier => diceAPI.simpleFormat(multiplier),
				min: config.minMultiplier,
				max: config.maxMultiplier
			}],
			throttling: {
				usages: 2,
				duration: 1
			}
		});
	}

	run(msg, { wager, multiplier }) {
		// Round numbers to second decimal place
		const randomNumber = diceAPI.simpleFormat(Math.random() * config.maxMultiplier);

		// Get boolean if the random number is greater than the multiplier
		const gameResult = randomNumber > diceAPI.winPercentage(multiplier);

		const embed = new MessageEmbed({
			title: `**${wager} 🇽 ${multiplier}**`,
			fields: [{
				name: '🔢 Random Number Result',
				value: randomNumber.toString(),
				inline: true
			},
			{
				name: '📊 Win Chance',
				value: `${diceAPI.simpleFormat(diceAPI.winPercentage(multiplier))}%`,
				inline: true
			},
			{
				name: '💵 Wager',
				value: wager.toString(),
				inline: true
			},
			{
				name: '🇽 Multiplier',
				value: multiplier.toString(),
				inline: true
			}
			]
		});

		if(gameResult === true) {
			// Red color and loss message
			embed.setColor(0xf44334);
			embed.setDescription(`You would have lost \`${wager.toLocaleString()}\` ${config.currency.plural}.`);
		} else {
			// Green color and win message
			embed.setColor(0x4caf50);
			// eslint-disable-next-line max-len
			embed.setDescription(`Your profit would have been \`${diceAPI.simpleFormat((wager * multiplier) - wager).toLocaleString()}\` ${config.currency.plural}!`);
		}

		return msg.replyEmbed(embed);
	}
};
