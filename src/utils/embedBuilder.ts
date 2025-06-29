import { EmbedBuilder, APIEmbedField, ColorResolvable } from 'discord.js';

export class SimpleEmbedBuilder {
  private embed: EmbedBuilder;

  constructor() {
    this.embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTimestamp();
  }

  setTitle(title: string) {
    this.embed.setTitle(title);
    return this;
  }

  setDescription(description: string) {
    this.embed.setDescription(description);
    return this;
  }

  setColor(color: ColorResolvable) {
    this.embed.setColor(color);
    return this;
  }

  setFooter(text: string, iconURL?: string) {
    this.embed.setFooter({ text, iconURL });
    return this;
  }

  setTimestamp(date?: Date) {
    this.embed.setTimestamp(date);
    return this;
  }

  addField(name: string, value: string, inline = false) {
    this.embed.addFields({ name, value, inline });
    return this;
  }

  addFields(fields: APIEmbedField[]) {
    this.embed.addFields(fields);
    return this;
  }

  setThumbnail(url: string) {
    this.embed.setThumbnail(url);
    return this;
  }

  setImage(url: string) {
    this.embed.setImage(url);
    return this;
  }

  setAuthor(name: string, iconURL?: string, url?: string) {
    this.embed.setAuthor({ name, iconURL, url });
    return this;
  }

  build() {
    return this.embed;
  }
}

// Example usage:
// const embed = new SimpleEmbedBuilder()
//   .setTitle('Hello')
//   .setDescription('World')
//   .setColor('Blue')
//   .build();
// channel.send({ embeds: [embed] });