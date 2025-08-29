import { MessageFlags } from 'discord.js';
import { Command, CommandContext } from './types';
import { awardCurrency, subtractCurrency } from '../utils/unbelieva';
import { queryYeonjiRPS } from '../utils/aiUtils';
import { activeRpsGames } from '../utils/botConstants';

export const rpsGameCommand: Command = {
  name: 'rps_game',
  execute: async (context: CommandContext) => {
    const { interaction, client } = context;

    const opponent = interaction.options.getUser('opponent') || client.user;
    const betAmount = interaction.options.getInteger('bet_amount') ?? 0;
    // Now support rounds from options, default to 1
    const rounds = interaction.options.getInteger('rounds') ?? 1;
    const validRounds = [1, 3, 5];
    const totalRounds = validRounds.includes(rounds) ? rounds : 1;
    const winTarget = Math.ceil(totalRounds / 2);

    // Forbid betting against the bot itself
    if (opponent && opponent.id === client.user?.id && betAmount > 0) {
      await interaction.reply({ content: 'You cannot place a bet when playing against the bot.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Check for active game
    if (!opponent) {
      await interaction.reply({ content: 'Opponent not found.', flags: MessageFlags.Ephemeral });
      return;
    }
    const gameKey = `rps:${interaction.channelId}:${interaction.user.id}:${opponent.id}`;
    if (activeRpsGames.has(gameKey)) {
      await interaction.reply({ content: 'You already have an active RPS game in this channel!', flags: MessageFlags.Ephemeral });
      return;
    }

    async function handleBetDeduction(userA: string, userB: string, amount: number): Promise<boolean> {
      try {
        await subtractCurrency(userA, amount);
        if (userB !== client.user?.id) {
          await subtractCurrency(userB, amount);
        }
        return true;
      } catch {
        return false;
      }
    }

    async function refundBet(userA: string, userB: string, amount: number) {
      try {
        await awardCurrency(userA, amount);
        if (userB !== client.user?.id) {
          await awardCurrency(userB, amount);
        }
      } catch {}
    }

    // PvP
    if (opponent && opponent.id !== client.user?.id) {
      if (betAmount > 0) {
        const betSuccess = await handleBetDeduction(interaction.user.id, opponent.id, betAmount);
        if (!betSuccess) {
          await interaction.reply({ content: 'Failed to deduct bet from one or both players. Make sure both have enough coins.', flags: MessageFlags.Ephemeral });
          return;
        }
      }

      let scores: Record<string, number> = { [interaction.user.id]: 0, [opponent.id]: 0 };
      let round = 1;
      let moves: Record<string, string> = {};
      let finished = false;

      const components: any[] = [
        {
          type: 1,
          components: [
            { type: 2, label: 'Rock', style: 1, customId: 'rps_rock' },
            { type: 2, label: 'Paper', style: 1, customId: 'rps_paper' },
            { type: 2, label: 'Scissors', style: 1, customId: 'rps_scissors' }
          ]
        }
      ];

      await interaction.reply({
        content: `Rock-Paper-Scissors! ${interaction.user} vs ${opponent}\nFirst to ${winTarget} wins! Both players, choose your move below:\n${betAmount > 0 ? `💸 Bet: ${betAmount} coins each! Winner takes all. 💸` : ''}`,
        components
      });

      const playFilter = (btn: any) => btn.user.id === opponent.id || btn.user.id === interaction.user.id;
      const playCollector = interaction.channel?.createMessageComponentCollector({ filter: playFilter, time: 60000 });

      // Register the game as active
      activeRpsGames.set(gameKey, { playCollector });

      playCollector?.on('collect', async btn => {
        if (finished) return;
        const userChoice = btn.customId.split('_')[1];
        moves[btn.user.id] = userChoice;
        await btn.deferUpdate();

        // If both played, resolve round
        if (moves[interaction.user.id] && moves[opponent.id]) {
          const user1 = interaction.user;
          const user2 = opponent;
          const choice1 = moves[user1.id];
          const choice2 = moves[user2.id];

          let result = '';
          let actionMsg = '';

          function capitalize(str: string) {
            return str.charAt(0).toUpperCase() + str.slice(1);
          }

          if (choice1 === choice2) {
            result = `Round ${round}: It's a tie!`;
          } else if (
            (choice1 === 'rock' && choice2 === 'scissors') ||
            (choice1 === 'paper' && choice2 === 'rock') ||
            (choice1 === 'scissors' && choice2 === 'paper')
          ) {
            actionMsg = `${capitalize(choice1)} beats ${choice2}`;
            scores[user1.id]++;
            result = `Round ${round}: ${actionMsg}. ${user1} wins!`;
          } else {
            actionMsg = `${capitalize(choice2)} beats ${choice1}`;
            scores[user2.id]++;
            result = `Round ${round}: ${actionMsg}. ${user2} wins!`;
          }

          let scoreMsg = `Score: ${user1} ${scores[user1.id]} - ${scores[user2.id]} ${user2}`;
          let nextMsg = '';
          round++;
          moves = {};

          // Check for match winner
          if (scores[user1.id] === winTarget || scores[user2.id] === winTarget) {
            finished = true;
            let winner = scores[user1.id] === winTarget ? user1 : user2;
            let winId = scores[user1.id] === winTarget ? user1.id : user2.id;
            let pool = betAmount > 0 ? betAmount * 2 : 0;
            if (pool > 0) {
              await awardCurrency(winId, pool);
            }
            await interaction.editReply({
              content: `${result}\n${scoreMsg}\n${winner} wins the match!${pool > 0 ? `\n🏆 ${winner} wins ${pool} coins!` : ''}`,
              components: []
            });
            playCollector.stop();
          } else {
            nextMsg = `\nNext round: Both players, choose your move below.`;
            await interaction.editReply({
              content: `${result}\n${scoreMsg}${nextMsg}`,
              components
            });
          }
        }
      });

      playCollector?.on('end', async _collected => {
        activeRpsGames.delete(gameKey);
        if (!finished) {
          await interaction.editReply({ content: 'Game timed out! Not all players made a move.', components: [] });
          if (betAmount > 0) {
            await refundBet(interaction.user.id, opponent.id, betAmount);
            await interaction.followUp({ content: 'Bet refunded to both players due to no response.', ephemeral: false });
          }
        }
      });
    } else {
      // PvE vs bot
      if (betAmount > 0) {
        const betSuccess = await handleBetDeduction(interaction.user.id, client.user?.id || '', betAmount);
        if (!betSuccess) {
          await interaction.reply({ content: 'Failed to deduct bet. Make sure you have enough coins.', ephemeral: false });
          return;
        }
      }

      let userScore = 0;
      let botScore = 0;
      let round = 1;
      let finished = false;

      const components = [
        {
          type: 1,
          components: [
            { type: 2, label: 'Rock', style: 1, customId: 'rps_rock' },
            { type: 2, label: 'Paper', style: 1, customId: 'rps_paper' },
            { type: 2, label: 'Scissors', style: 1, customId: 'rps_scissors' }
          ]
        }
      ];

      await interaction.reply({
        content: `🎮 **Rock-Paper-Scissors vs Yeonji!** 🎮\nFirst to ${winTarget} wins!\n**Round 1:**\nMake your move!${betAmount > 0 ? `\n💰 **Bet:** ${betAmount} coins! Winner takes all.` : ''}`,
        components
      });

      const filter = (i: any) => i.user.id === interaction.user.id;
      const collector = interaction.channel?.createMessageComponentCollector({ filter, time: 20000 });

      // Register the game as active
      const gameKeyBot = `rps:${interaction.channelId}:${interaction.user.id}:${client.user?.id}`;
      activeRpsGames.set(gameKeyBot, { collector });

      collector?.on('collect', async i => {
        if (finished) return;
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const userChoice = i.customId.split('_')[1];

        let rpsResult = '';
        let aiReply = '';              if (userChoice === botChoice) {
                rpsResult = `[Draw]`;
                try {
                  aiReply = await queryYeonjiRPS(userChoice, 'tie', round);
                } catch { aiReply = ''; }
              } else if (
                (userChoice === 'rock' && botChoice === 'scissors') ||
                (userChoice === 'paper' && botChoice === 'rock') ||
                (userChoice === 'scissors' && botChoice === 'paper')
              ) {
                userScore++;
                rpsResult = `[Win]`;
                try {
                  aiReply = await queryYeonjiRPS(userChoice, 'lose', round);
                } catch { aiReply = ''; }
              } else {
                botScore++;
                rpsResult = `[Loss]`;
                try {
                  aiReply = await queryYeonjiRPS(userChoice, 'win', round);
                } catch { aiReply = ''; }
              }

        let scoreMsg = `Score: You ${userScore} - ${botScore} Yeonji`;
        let nextMsg = '';
        round++;

        // Check for match winner
        if (userScore === winTarget || botScore === winTarget) {
          finished = true;
          let winner = userScore === winTarget ? interaction.user : client.user;
          let pool = betAmount > 0 ? betAmount * 2 : 0;
          if (userScore === winTarget && pool > 0) {
            await awardCurrency(interaction.user.id, pool);
          } else if (botScore === winTarget && pool > 0 && client.user) {
            await awardCurrency(client.user.id, pool);
          }
          await i.update({
            content: `I choose... **${botChoice}!** ${rpsResult} ${aiReply ? `\n${aiReply}` : ''}\n${scoreMsg}\n${winner} wins the match!${pool > 0 ? `\n🏆 ${winner} wins ${pool} coins!` : ''}`,
            components: []
          });
          collector.stop();
        } else {
          nextMsg = `\nNext round: Choose your move!`;
          await i.update({
            content: `I choose... **${botChoice}!** ${rpsResult} ${aiReply ? `\n${aiReply}` : ''}\n${scoreMsg}${nextMsg}`,
            components
          });
        }
      });

      collector?.on('end', async () => {
        activeRpsGames.delete(gameKeyBot);
        if (!finished && collector.collected.size === 0) {
          await interaction.editReply({ content: 'No move was made in time!', components: [] });
          if (betAmount > 0) {
            await refundBet(interaction.user.id, client.user?.id || '', betAmount);
            await interaction.followUp({ content: 'Bet refunded due to no response.', flags: MessageFlags.Ephemeral });
          }
        }
      });
    }
  }
};
