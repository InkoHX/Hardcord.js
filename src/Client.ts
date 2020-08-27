import { Client as BaseClient, ClientOptions, Collection, Message } from 'discord.js'

import { CommandBuilder } from '.'

export class Client extends BaseClient {
  public readonly commands: Collection<string, CommandBuilder> = new Collection()
  public readonly commandPrefix: string = '$>'
  public readonly ignoreMention: boolean = false

  public constructor(options?: ClientOptions) {
    super(options)

    this.on('message', message => this._handleMessage(message))
  }

  public addCommand(commandName: string, builder: CommandBuilder): this {
    this.commands.set(commandName, builder)

    return this
  }

  private _handleMessage(message: Message) {
    if (message.system || message.author.bot) return

    const USER_MENTION_PATTERN = new RegExp(`^<@!?${this.user!.id}> ?`)

    const hasMention = !this.ignoreMention && USER_MENTION_PATTERN.test(message.content)
    const hasCommandPrefix = message.content.startsWith(this.commandPrefix)

    if (!(hasMention || hasCommandPrefix)) return

    const escapeContent = message.content
      .replace(USER_MENTION_PATTERN, '')
      .replace(this.commandPrefix, '')

    const commandName = [...this.commands.keys()]
      .find(commandName => escapeContent.startsWith(commandName))

    const command = commandName
      ? this.commands.get(commandName)
      : null

    command?.run(message)
  }
}
