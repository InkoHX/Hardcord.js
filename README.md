# discord.js-command-handler

This module can be used with Discord.js to create Discord bot commands easily.

## Install

Also, the package is not available to the public.

## Example

```js
const { Client } = require('@inkohx/discord.js-command-handler')

const client = new Client()

// Don't respond to Mentions.
client.ignoreMention = true
// command prefix to ">"
client.commandPrefix = '>'

client.addCommand('ping', ({
  message,
  flags,
  args
}) => {
  message.reply('Pong!')
})

client.login()
```
