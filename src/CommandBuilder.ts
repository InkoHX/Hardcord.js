import { Message } from 'discord.js'
import yargsParser from 'yargs-parser'

import { Client } from '.'
import { CommandError } from './CommandError'

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

  toNumber<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]?: number }>
  toNumber<K extends string>(key: K): Builder<F & { [key in K]?: number }>

  toBoolean<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]?: boolean }>
  toBoolean<K extends string>(key: K): Builder<F & { [key in K]?: boolean }>

  toString<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]?: string }>
  toString<K extends string>(key: K): Builder<F & { [key in K]?: string }>

  toArray<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]: ReadonlyArray<NonNullable<F[key]>> }>
  toArray<K extends string>(key: K): Builder<F & { [key in K]?: ReadonlyArray<string | number> }>
  toArray<K extends keyof F>(keys: ReadonlyArray<K>): Builder<Omit<F, K> & { [key in K]: ReadonlyArray<NonNullable<F[key]>> }>
  toArray<K extends string>(keys: ReadonlyArray<K>): Builder<F & { [key in K]?: ReadonlyArray<string | number> }>

  toCount<K extends keyof F>(key: K): Builder<Omit<F, K> & { [key in K]: number }>
  toCount<K extends string>(key: K): Builder<F & { [key in K]: number }>
  toCount<K extends keyof F>(keys: ReadonlyArray<K>): Builder<Omit<F, K> & { [key in K]: number }>
  toCount<K extends string>(keys: ReadonlyArray<K>): Builder<F & { [key in K]: number }>

  setAlias<KL extends keyof F, KS extends string>(longKey: KL, shortKey: KS): Builder<F & { [key in KS]: F[KL] }>
  setAlias<KL extends keyof F, KS extends string>(longKey: KL, shortKeys: KS[]): Builder<F & { [key in keyof KS]: F[KL] }>

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

  public toNumber<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]?: number | undefined }>
  public toNumber<K extends string>(key: K): Builder<{ [key in K]?: number | undefined }>
  public toNumber(key: string) {
    this._numbers.push(key)

    return this
  }

  public toBoolean<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]?: boolean | undefined }>
  public toBoolean<K extends string>(key: K): Builder<{ [key in K]?: boolean | undefined }>
  public toBoolean(key: string) {
    this._booleans.push(key)

    return this
  }

  public toString<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]?: string | undefined }>
  public toString<K extends string>(key: K): Builder<{ [key in K]?: string | undefined }>
  public toString(key: string) {
    this._strings.push(key)

    return this
  }

  // @ts-expect-error
  public toArray<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]: readonly NonNullable<{}[key]>[] }>
  public toArray<K extends string>(key: K): Builder<{ [key in K]?: readonly (string | number)[] | undefined }>
  public toArray<K extends never>(keys: readonly K[]): Builder<Pick<{}, never> & { [key in K]: readonly NonNullable<{}[key]>[] }>
  public toArray<K extends string>(keys: readonly K[]): Builder<{ [key in K]?: readonly (string | number)[] | undefined }>
  public toArray(keys: string | ReadonlyArray<string>) {
    if (typeof keys === 'string') this._arrays.push(keys)
    else keys.forEach(key => this._arrays.push(key))

    return this
  }

  // @ts-expect-error
  toCount<K extends never>(key: K): Builder<Pick<{}, never> & { [key in K]: number }>
  toCount<K extends string>(key: K): Builder<{ [key in K]: number }>
  toCount<K extends never>(keys: readonly K[]): Builder<Pick<{}, never> & { [key in K]: number }>
  toCount<K extends string>(keys: readonly K[]): Builder<{ [key in K]: number }>
  toCount(keys: string | ReadonlyArray<string>) {
    if (typeof keys === 'string') this._counts.push(keys)
    else keys.forEach(key => this._counts.push(key))

    return this
  }

  public setAlias<KL extends never, KS extends string>(longKey: KL, shortKey: KS): Builder<{ [key in KS]: {}[KL] }>
  public setAlias<KL extends never, KS extends string>(longKey: KL, shortKeys: KS[]): Builder<{ [key in keyof KS]: {}[KL] }>
  public setAlias(longKey: string, shortKeys: string | string[]) {
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
      if (!this.handler) throw new CommandError('Use the "setCommandHandler" method to set the handler.')

      this.handler({
        message,
        flags,
        args
      })
    } catch (error) {
      message.reply(error, { code: 'ts' })
      console.error(error)
    }
  }
}
