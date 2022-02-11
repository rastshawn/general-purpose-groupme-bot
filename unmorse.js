const morse = require('morse');
const emojiRegex = require('emoji-regex');
const wordlist = require('wordlist-english');
const englishWords = wordlist['english'];

let a = ['a', 'b'];

// const countDistinctChars = function(str) {
//     str = str.replaceAll('/', '').replaceAll(' ', '');

//     let num = 0;
//     while (str != '') {
//         str = str.replaceAll(str[0], '');
//         num++;
//     }
//     return num;
// }


const getDistinctChars = function(str) {
    let distinctSymbols = [];

    // first trim off and store emojis, 
    // then get all other characters

    // Emojis
    const emojisInOrder = str.match(emojiRegex());
    const distinctEmojis = [...new Set(emojisInOrder)]; // from https://stackoverflow.com/a/42123984
    //console.log(distinctEmojis);
    distinctEmojis.forEach((emoji) => {
        // store it as a symbol
        distinctSymbols.push(emoji);

        // and remove it from the starting string
        str = str.replaceAll(emoji, '');
    })

    // Now get the rest of the characters
    while (str != '') {
        const charToStore = str[0];
        // store it as a symbol
        distinctSymbols.push(charToStore);
        // and remove it from the starting string
        str = str.replaceAll(charToStore, '');
        
    }
    return distinctSymbols;
}


const countDistinctChars = function(str) {
    return getDistinctChars(str).length;
}

const countMatchesInWordList = function(wordArr) {
    let numMatches = 0;
    wordArr.forEach((word) => {
        if (englishWords.includes(word)) {
            numMatches++;
        }
    })
    return numMatches;
}

const decodeToArr = function(str, dot_char, dash_char) {
    let strWithoutSlashes = str.replaceAll(' ', '').replaceAll('/', '');
    if (countDistinctChars(strWithoutSlashes) > 2) {
        return ['cannot be translated'];
    }
    let dotdash = str.replaceAll(dot_char, '.').replaceAll(dash_char, '-');
    
    let words = dotdash.split('/').map(word => word.trim());
    
    let outputWords = [];
    words.forEach((word) => {
        let letters = word.split(' ');
        let decodedWord = '';
        letters.forEach((letter) => {
            decodedWord += morse.decode(letter.trim()).toLowerCase();
        })

        outputWords.push(decodedWord);
    });

    return outputWords;
}

const unMorse = function(str) {
    let strWithoutSlashes = str.replaceAll(' ', '').replaceAll('/', '');
    let distinctChars = getDistinctChars(strWithoutSlashes);

    if (distinctChars.length > 2) {
        return "cannot be translated";
    }

    let attempt1 = decodeToArr(str, distinctChars[0], distinctChars[1]);
    let attempt2 = decodeToArr(str, distinctChars[1], distinctChars[0]);

    return ((countMatchesInWordList(attempt1) > countMatchesInWordList(attempt2)) ? attempt1 : attempt2).join(' ');
}


let test1 = '✉️✉️✉️ ✉️ 📦✉️ 📦✉️✉️ / 📦📦 ✉️';
let test2 = '📦📦📦 📦 ✉️📦 ✉️📦📦 / ✉️✉️ 📦';

let test3 = 'a✉️✉️✉️ ✉️ 📦✉️ 📦✉️✉️ / 📦📦 ✉️';
let test4 = '📦📦📦 ✉️ ✉️.📦 ✉️📦📦 / ✉️✉️ 📦';


console.log(unMorse(test1));
console.log(unMorse(test2));
console.log(unMorse(test3));
console.log(unMorse(test4));

//console.log(countDistinctChars(test1.replaceAll(' ', '').replaceAll('/', '')));

// let testString = '📦ab✉️📦b✉️a✉️✉️a';
// console.log(getDistinctChars(testString));
// console.log(countDistinctChars(testString));
// console.log(
// englishWords.includes("aardvark"),
// englishWords.includes("send"),
// englishWords.includes("me"));

export { unMorse };