var antimony = require('../../assets/sounds/Antimony.mp3')
var mira = require('../../assets/sounds/Mira.mp3')

export enum Sound {
    FormAlert = 'alert',
    FormSuccess = 'success',
}

const lookup = {
    [Sound.FormAlert]: mira,
    [Sound.FormSuccess]: antimony,
}

export function playSound(s: Sound) {
    if (lookup[s]) {
        // Why is the data url in `.default`? No idea. Some quirk of webpack's url loader, maybe?
        new Audio(lookup[s].default).play()
    }
}

export function playSuccess() {
    playSound(Sound.FormSuccess)
}

export function playAlert() {
    playSound(Sound.FormAlert)
}
