# omegle_bot

# Install

npm install

# Start Server

npm start

# Customize

- training.json includes all the data for the personal bot
- spam.json includes known strings that will trigger the bot to auto-disconnect

# Training.json

- likes: the common interests that will be used to find other strangers in omegle
- initialMessages: array of messages that will be sent intially as a greeting
- followUpMessagesSingle: array of messages that will be used as the leading part of the topic subject (eg. I see we both like politics)
- followUpMessageMulti: Same as above except trigger when stranger has multiple common interests (eg. I see we both like movies 
and music)
- questions: this is the third message automatically sent regardless of what the user says to draw out a conversation, the code will pick one of the common likes in random and use that to look up a specific and custom question regarding that subject. For example if the stranger and you both share politics for interests then "questions": { "politics": "are you left or right?" } will be used.
- topics & skills: These have a 1:1 relationship for the talkify bot, a set of objects with keys that specify the subject of the conversation. For example "age": ["how old are you", "age"] will match the "age" subject when the stranger says how old are you or how old r u or "age?" and the reply for that set of responses is in the skills object.


# Notes

- Captcha works however it requires your server to be omegle.com
- Editing your hosts file to use omegle.com:3001 will fix that
- Manually accepting the captcha on the real site and then using this app can be used as a workaround
- Bot will send the initial message and wait until the user says something to send the subsequent messages
- All the timing and artificial delays are found in the bot.js file around line 70.