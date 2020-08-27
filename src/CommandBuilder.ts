import { Message } from 'discord.js'
import yargsParser from 'yargs-parser'

import { Client, CommandError } from '.'

export interface CommandHandlerArgument<F = {}> {
  message: Message
  flags: Readonly<F & { [key: string]: unknown }>
  args: ReadonlyArray<string>
}

export type CommandHandler<F = {}> = (args: CommandHandlerArgument<F>) => Promise<void> | void

export interface Builder<F = {}> {
  readonly _aliases: { [key: string]: string[] }
  readonly _defaults: { [key: string]: any }
  readonly _numbers: string[]
  readonly _strings: string[]
  readonly _booleans: string[]
  readonly _arrays: string[]
  readonly _counts: string[]
  handler?: CommandHandler

  default<K extends keyof F, V = F[K]>(key: K, value: V): Builder<Omit<F, K> & { [key in K]: V }>
  default<K extends string, V>(key: K, value: V): Builder<F & { [key in K]: V }>

  number<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]?: number }>
  number<K extends string>(key: K): Builder<F & { [key in K]?: number }>

  boolean<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]?: boolean }>
  boolean<K extends string>(key: K): Builder<F & { [key in K]?: boolean }>

  string<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]?: string }>
  string<K extends string>(key: K): Builder<F & { [key in K]?: string }>

  array<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]: ReadonlyArray<NonNullable<F[key]>> }>
  array<K extends string>(key: K): Builder<F & { [key in K]?: ReadonlyArray<string | number> }>
  array<K extends keyof F>(keys: ReadonlyArray<K>): Builder<Omit<F, K> & { [key in K]: ReadonlyArray<NonNullable<F[key]>> }>
  array<K extends string>(keys: ReadonlyArray<K>): Builder<F & { [key in K]?: ReadonlyArray<string | number> }>

  count<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]: number }>
  count<K extends string>(key: K): Builder<F & { [key in K]: number }>
  count<K extends keyof F>(keys: ReadonlyArray<K>): Builder<Omit<F, K> & { [key in K]: number }>
  count<K extends string>(keys: ReadonlyArray<K>): Builder<F & { [key in K]: number }>

  alias<KL extends keyof F, KS extends string>(longKey: KL, shortKey: KS): Builder<F & { [key in KS]: F[KL] }>
  alias<KL extends keyof F, KS extends string>(longKey: KL, shortKeys: KS[]): Builder<F & { [key in keyof KS]: F[KL] }>

  setCommandHandler(fnc: CommandHandler<F>): Builder<F>

  run(message: Message): void
}

export class CommandBuilder implements Builder {
  readonly _aliases: { [key: string]: string[] } = {}
  readonly _defaults: { [key: string]: any } = {}
  readonly _numbers: string[] = []
  readonly _strings: string[] = []
  readonly _booleans: string[] = []
  readonly _arrays: string[] = []
  readonly _counts: string[] = []
  handler?: CommandHandler

  public default<K extends never, V = {}[K]>(key: K, value: V): Builder<Pick<{}, never> & { [key in K]: V }>
  public default<K extends string, V>(key: K, value: V): Builder<{ [key in K]: V }>
  public default(key: string, value: any) {
    this._defaults[key] = value

    return this
  }

  public number<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]?: number | undefined }>
  public number<K extends string>(key: K): Builder<{ [key in K]?: number | undefined }>
  public number(key: string) {
    this._numbers.push(key)

    return this
  }

  public boolean<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]?: boolean | undefined }>
  public boolean<K extends string>(key: K): Builder<{ [key in K]?: boolean | undefined }>
  public boolean(key: string) {
    this._booleans.push(key)

    return this
  }

  public string<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]?: string | undefined }>
  public string<K extends string>(key: K): Builder<{ [key in K]?: string | undefined }>
  public string(key: string) {
    this._strings.push(key)

    return this
  }

  // @ts-expect-error
  public array<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]: readonly NonNullable<{}[key]>[] }>
  public array<K extends string>(key: K): Builder<{ [key in K]?: readonly (string | number)[] | undefined }>
  public array<K extends never>(keys: readonly K[]): Builder<Pick<{}, never> & { [key in K]: readonly NonNullable<{}[key]>[] }>
  public array<K extends string>(keys: readonly K[]): Builder<{ [key in K]?: readonly (string | number)[] | undefined }>
  public array(keys: string | ReadonlyArray<string>) {
    if (typeof keys === 'string') this._arrays.push(keys)
    else keys.forEach(key => this._arrays.push(key))

    return this
  }

  // @ts-expect-error
  public count<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]: number }>
  public count<K extends string>(key: K): Builder<{ [key in K]: number }>
  public count<K extends never>(keys: readonly K[]): Builder<Pick<{}, never> & { [key in K]: number }>
  public count<K extends string>(keys: readonly K[]): Builder<{ [key in K]: number }>
  public count(keys: string | ReadonlyArray<string>) {
    if (typeof keys === 'string') this._counts.push(keys)
    else keys.forEach(key => this._counts.push(key))

    return this
  }

  public alias<KL extends never, KS extends string>(longKey: KL, shortKey: KS): Builder<{ [key in KS]: {}[KL] }>
  public alias<KL extends never, KS extends string>(longKey: KL, shortKeys: KS[]): Builder<{ [key in keyof KS]: {}[KL] }>
  public alias(longKey: string, shortKeys: string | string[]) {
    if (typeof shortKeys === 'string') {
      this._aliases[longKey] = [shortKeys]
    } else {
      this._aliases[longKey] = shortKeys
    }

    return this
  }

  public setCommandHandler(fnc: CommandHandler<{}>): Builder<{}> {
    this.handler = fnc

    return this
  }

  public run(message: Message): void {
    if (!this.handler) throw new CommandError('Use the "setCommandHandler" method to set the handler.')

    const client = message.client as Client
    const result = yargsParser(message.content
      .replace(new RegExp(`^<@!?${client.user!.id}>`), '')
      .replace(client.commandPrefix, ''), {
      alias: this._aliases,
      array: this._arrays,
      boolean: this._booleans,
      number: this._numbers,
      string: this._strings,
      count: this._counts,
      default: this._defaults,
      configuration: {
        "camel-case-expansion": false
      }
    })

    const args = result['_']
      .slice(1)
      .map(value => typeof value === 'string' ? value.replace(/^['"](.*)['"]$/, '$1') : value)
      .map(String)
    const flags = Object.fromEntries(Object.entries(result).filter(value => value[0] !== '_'))

    try {
      this.handler({
        message,
        flags,
        args
      })
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.reply(error, { code: 'ts' })
        console.error(error)
      } else if (typeof error === 'string') {
        message.reply(error)
      } else throw error
    }
  }
}
