# Emotes Configuration

This file contains all the emotes that Yeonji can use in her responses.

## How to Add Custom Server Emotes

1. Open `src/config/emotes.ts`
2. Add your server's custom emotes to the `CUSTOM_EMOTES` object:

```typescript
export const CUSTOM_EMOTES = {
  // Static emotes: <:name:id>
  yeonjiLove: '<:yeonjiLove:123456789012345678>',
  yeonjiWink: '<:yeonjiWink:876543210987654321>',
  
  // Animated emotes: <a:name:id>  
  yeonjiDance: '<a:yeonjiDance:111222333444555666>',
} as const;
```

## How to Get Emote IDs

### Method 1: Developer Mode (Recommended)
1. Enable Developer Mode in Discord Settings > Advanced > Developer Mode
2. Right-click on any custom emote in chat
3. Click "Copy ID"
4. The format will be `<:emoteName:emoteID>` for static or `<a:emoteName:emoteID>` for animated

### Method 2: Escape the Emote
1. Type `\:emotename:` in Discord chat
2. Send the message
3. Discord will show the full emote code

## Emote Categories

- **Standard Emojis**: Work in all Discord servers
- **Custom Emotes**: Server-specific emotes that only work in servers where the bot has access
- **Contextual Usage**: Different emotes are suggested based on conversation context

## Usage in Code

```typescript
// Get random emotes
EmoteManager.getRandomEmotes(2);

// Get contextual emotes
EmoteManager.getContextualEmotes('victory');

// Get emotes by category
EmoteManager.getRandomEmote('gaming');
```
