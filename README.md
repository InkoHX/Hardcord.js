# Hardcord.js

The goal is to create a lightweight command framework.

## Install

**Also, the package is not available to the public.**

### NPM

```bash
npm install hardcord.js discord.js
```

### Yarn

```bash
yarn add hardcord.js discord.js
```

## Example

```ts
import { Client, CommandBuilder } from 'hardcord.js'

const client = new Client()

client.ignoreMention = true
client.commandPrefix = '>'

client.addCommand('ping', new CommandBuilder()
  .toBoolean('bool') // add "--bool" flag
  .setCommandHandler(({
    message,
    flags: {
      bool
    },
    args
  }) => {
    console.log(bool, args)
    // add your code
  })
)

client.login()
```
