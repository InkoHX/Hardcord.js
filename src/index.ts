import { Client as BaseClient, ClientOptions, Collection, Message } from 'discord.js'
import parser from 'yargs-parser'

export interface Argument {
  commandName: string
  args: Array<string | number>
  flags: {
    [key: string]: string | boolean | number
  }
}

export interface Command extends Omit<Argument, 'commandName'> {
  message: Message
}

export type CommandFunction = (command: Command) => Promise<void> | void

export class Client extends BaseClient {
  public readonly commands: Collection<string, CommandFunction> = new Collection()
  public readonly commandPrefix: string = '$>'
  public readonly ignoreMention: boolean = false

  public constructor(options?: ClientOptions) {
    super(options)

    this.on('message', message => this._handleMessage(message))
  }

  public addCommand(commandName: string, fnc: CommandFunction): this {
    this.commands.set(commandName, fnc)

    return this
  }

  private _handleMessage(message: Message) {
    if (message.system || message.author.bot) return

    const hasMention = !this.ignoreMention && new RegExp(`^<@!?${this.user!.id}>`).test(message.content)
    const hasCommandPrefix = message.content.startsWith(this.commandPrefix)

    if (!(hasMention || hasCommandPrefix)) return

    const {
      commandName,
      args,
      flags
    } = this._parseContent(message.content)

    const command = this.commands.get(commandName)

    if (!command) return

    try {
      command({
        args,
        flags,
        message
      })
    } catch (error) {
      message.reply(error, { code: 'ts' })
    }
  }

  private _parseContent(content: string): Argument {
    const result = parser(content
      .replace(new RegExp(`^<@!?${this.user!.id}>`), '')
      .replace(this.commandPrefix, '')
    )

    const commandName = String(result['_'][0])
    const args = result['_'].slice(1).map(value => typeof value === 'string' ? value.replace(/^['"](.*)['"]$/, '$1') : value)
    const flags = Object.fromEntries(Object.entries(result).filter(value => !Array.isArray(value[1])))

    return {
      commandName,
      flags,
      args
    }
  }
}
