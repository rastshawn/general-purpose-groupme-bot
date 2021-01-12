// Copyright 2018 
// Shawn Rast
// rastshawn@gmail.com


// Test mode runs this on a different port. 
// Useful for having two different groupme groups - 
// one group with the test bot/port in it, 
// good group with the normal bot/port. 
// Allows for dev work without shutting down.
var TEST_MODE = false;
var TEST_PORT = 2501;
var PORT = 2500;

var config = require('./config');

var botID = config.botID; 
var testID = config.testID; 
var botName = config.botName;

// Run in test mode, if the -tets arg is present. 
process.argv.forEach(function (arg) {
	if (arg == "-test") {
		TEST_MODE = true;
		PORT = TEST_PORT;
		botID = testID;
	}
});

// The tools folder holds any files this requires.
// It contains a folder that it hosts to the web in order
// to post pictures to the group.
// It also contains a few text files that this reads
// in order to avoid having very long (or complicated) strings in this code. 
var TOOLS_FOLDER = "gpBot_tools/";

// timeout-set to avoid posting every time. 
var payRespects = true;

// MODULES
var path = require('path'); // accessing tools folder
var express = require('express'); // for listening to incoming connections
var app = express();
var fs = require('fs'); // for writing information, like the swear jar
var request = require('request'); // for reading Wikipedia 
var xkcd = require('xkcd-api'); // api for grabbing XKCD comics
const mysql = require('mysql'); // db

// set up db
let dbCredentials = config.dbCreds;
dbCredentials.charset = "utf8mb4";
var db;
let Connect = () => {
    db = mysql.createConnection(dbCredentials);
    return new Promise((resolve, reject) => {
        db.connect((err) => {
            if (err) {
                postToGroup("bot needs restarted, db error");
                console.log(err);
                reject("db issue");
            } else {
                console.log("connected to database");
                resolve();
            }
        });
    });
};

// wrap in promises
let Query = (query) => {
    return new Promise((resolve, reject) => {
        db.query(query, (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            } else { 
                resolve(result);
            }
        });
    });
};


// Host an image folder
app.use("/pics", express.static(path.join(__dirname, TOOLS_FOLDER+'images')));

// This is called whenever a message is sent in groupme. 
// The groupme bot system sends the message in a post request. 
app.post('/groupme', function (req, res) {

	var string = ""; // post data string

	// build the data string
	req.on('data', function (data) {
		string += data;
	});

	// when body is complete
	req.on('end', function () {
        let message = JSON.parse(string);
        handleMessage(message);
    });
});

function handleMessage(message) {

    // this ignores case when parsing commands to the bot.
    var args = message.text.toLowerCase().split(" ");

    // this allows the bot to ignore its own posts, causing a loop.     
    if (message.name == botName) return;


    // RESPONDING TO COMMANDS

    // if something truly heinous is posted, 
    // clear the screen by posting a really long message. 
    if (message.text.toLowerCase() == "get that off my screen") {
        var s = "Okay!\nI'll\nget\nthat\noff\nof" +
            "\nyour\nscreen\nno\nproblem.\n\n\n";

        postToGroup(s);

    }
    //Pay respects.
    if (args[0] == "f" && payRespects){
        postToGroup("F");
        payRespects = false;
        setTimeout(function() {
            payRespects = true;
        }, 10000);
    }


    switch (args[0]) {

        // post the lenny face when asked. 
        // the lenny face text is in a saved file in the tools folder. 
        case "(len)":
        case "lenny":
        case "!len":
            fs.readFile(TOOLS_FOLDER + 'lenny.txt', "utf8", function (err, data) {
                postToGroup(data);
            });
            break;

        // get tcount - a random number between 1 and 100. 
        // NO REROLLS
        case "!tcount":
            
            tCount(message);
            break;
        case "!tstats":
            tStats(message);
            break;
        // Call the pupper bot when cute pics are needed. 
        case "sos":
        case "!sos":
        case "!pup":
            pupper_bot();
            break;

        // call the wikipedia random fact bot. 
        case "!wikifact":
            // new args are needed because the args array
            // is all in lower case. The Wikipedia API is 
            // case sensitive (for all title words after the first). 
            var newArgs = message.text.split(" ");

            // if there's a word after "wikifact" find the article
            if (newArgs[1]) {
                var article = newArgs[1];
                var i = 1;
                while (newArgs[++i]) {
                    article += "%20" + newArgs[i];
                }
                randomSentenceFromWikipedia(article);
            } else {
                postToGroup("Enter an article title");
            }
            break;

        // This calls the xkcd api module. Posts image and alt text for 
        // a random, or a specified XKCD comic. 
        case "!xkcd":
            if (args[1]) {
                if (args[1] == "latest") {
                    xkcd.latest(function (error, response) {
                        if (error) console.error(error);
                        else makeXKCDPost(response);
                    });
                } else if (args[1] == "random") {
                    xkcd.random(function (error, response) {
                        if (error) console.error(error);
                        else makeXKCDPost(response);
                    });
                } else if (args[1] == "help") {
                    postToGroup("Get latest comic: '!xkcd latest'" +
                        "\nGet random comic: !xkcd or " +
                        "!xkcd random\nGetspecific comic: " +
                        "!xkcd 274"
                    );
                } else if (isNaN(args[1])) {
                    postToGroup("Command not recognized. try !xkcd help");
                } else {
                    xkcd.get(args[1], function (error, response) {
                        if (error) console.error(error);
                        else makeXKCDPost(response);
                    });
                }
            } else {
                xkcd.random(function (error, response) {
                    if (error) console.error(error);
                    else makeXKCDPost(response);
                });
            }
            break;

        // This posts an amusing picture when asked. 
        // The picture is hosted from the tools folder. 
        case "!balls":
            postLocalImage("balls.jpg");
            break;
        case "!approve":
        case "!accept":
            postLocalImage("kodiApprove.jpg");
            break;
        case "!deny":
        case "!reject":
            postLocalImage("kodiReject.jpg");
            break;
        case "!beans":
            getNonSticky(1, 'beansinthings');
            break;
        case "!grump":
            postLocalImage("grump.jpg");
            break;
        case "!👏":
            let newMessage = message;
            newMessage = newMessage.text.replace(/ /g, '👏');
            postToGroup(newMessage.substr(2));
            break;
        case "catjam":
        case "!catjam":
            postLocalImage("catjam.gif");
            break;
    }

    for (var index = 0; index<args.length; index++){
        if (args[index] == "rediculous"){
              postToGroup("*ridiculous");
              break;
        }
        if (args[index] == "cloud") {
            postLocalImage("cloud.jpeg");
            break;
        }
    }
}

// This crafts two posts from a comic object from the 
// XKCD api - one with the image and one with the alt text. 
function makeXKCDPost(comic) {
	postToGroup(comic.img);
	postToGroup("Title: " + comic.title + "\nalt: " + comic.alt);
}

// This grabs and posts a random sentence from a specified article. 
// The article passed to this is querystring formatted with spaces. 
function randomSentenceFromWikipedia(article) {

	// uses wikipedia's API
	var url = 'https://en.wikipedia.org/w/api.php?' +
		'action=query&prop=extracts&explaintext&format=json&&titles=' + article;
	request({
		url: url,
		method: "GET"
	},

		function (error, response, body) {
			if (error) console.log(error);
			var article = JSON.parse(body);
			try {

				// This nonsense with object keys is necessary
				// because Wikipedia's api returns the article
				// inside an object whose name changes every 
				// single time. 

				article = article.query.pages;
				var keys = Object.keys(article);
				article = article[keys[0]].extract;

				if (article == "") {
					postToGroup("article not found");
				} else {

					// i here is used to trim the article to the 
					// "further reading" section. That's because
					// any random sentence pulled from that area
					// would only be a citatation. 
					var i = article.indexOf("Further reading");
					if (i != -1) {
						article = article.substring(0, i);
					}

					// Split the entire article into
					// an array of sentences.
					var articleArray = article.split(". ");

					// pick a random sentence. 
					var sentence = articleArray[
						Math.floor(
							Math.random() *
							articleArray.length
						)
					];

					// add the period back to the sentence
					// (it is removed by the split command)
					// and post it to the group
					postToGroup(sentence + ".");

				}
			} catch (error) {
				// A lot can go wrong with the wikipedia API - 
				// I wrote this really quickly and couldn't figure out
				// all of the nuance in a half hour. 
				// Rather than return nothing (and shut down the bot) 
				// if the API doesn't work as I expect, or if an article
				// with the specified title doesn't exist, it 
				// provides the user with at least some output

				postToGroup("something broke");
			}
		}
	);
}

// Posts the specified text to the group the bot is in. 
function postToGroup(text) {
	request({
		url: 'https://api.groupme.com/v3/bots/post',
		method: "POST",
		json: true,
		body: {
			"bot_id": botID,
			"text": text
		}
	},
		function (error, response, body) {
		    if (error) console.log(error);
        }
	);
}

// This bot cycles through a series of animal-related subreddits, and when called, 
// posts the first image on the 'hot' feed for that subreddit. 

// subIndex is global to ensure that they get looped through. 
var subIndex = 0;
function pupper_bot() {
	var sublist = [
		"germanshepherds",
		"corgis",
		"rarepuppers",
		"greyhounds",
		"italiangreyhounds",
		"greatpyrenees",
		"husky",
		"kittens",
		"tippytaps",
		"trashpandas",
		"aww",
		"eyebleach",
		"blep",
		"puppies"
	];

	var sub = sublist[subIndex++];
	if (subIndex >= sublist.length) subIndex = 0;
	getNonSticky(1, sub);

}

// This helps out the pupper bot function by actually
// retrieving the image. It's a little beefier than it should be 
// because the reddit API, when sorting by hot, always puts stickied
// posts on the front of the array - so for this bot, always seeing
// stickied posts would break the bot. 
//
// It calls the reddit API, downloading at first only one object. 
// If the first object returned is a stickied post, it calls itself 
// again, this time pulling down the first two posts from reddit. 
// Then the first 3, then 4, then so on. 
//
// It eventually posts the very first non-stickied post to the group.
function getNonSticky(i, subreddit) {

	request({
		url: 'https://reddit.com/r/' + subreddit + '/hot.json?limit=' + i

	}, function (error, response, body) {
		var data = JSON.parse(body).data;
		var content = data.children[i - 1].data.url;
		if (data.children[i - 1].data.stickied) {
			i++;
			getNonSticky(i, subreddit);
		} else {
			if (content) {
				postToGroup(content);
			} else {
				// if the hot post from any of the subreddit somehow
				// doesn't contain an image, it tells the group.
				postToGroup("not an image, sorry");
			}

		}
	});
}

function postLocalImage(filename){
    postToGroup(`https://gpbot.shawnrast.com/pics/${filename}`);
}

function tCount(messageObj) {

	// this is where the magic happens
	var tcount = Math.floor(Math.random() * Math.floor(100)) + 1;
	

	var userTypedTcount = messageObj.text.substr(1); // remove !
	
	addTStatsToDatabase(tcount, messageObj).then((isReroll) => {
        if (!isReroll) {
	        postToGroup(`${userTypedTcount}: ${tcount}`);

            if (tcount == 69) {
                postToGroup("n i c e");
            }

        } else {
            postToGroup('N O R E R O L L S');
        }
    });

	// check if something interesting has occured, example:
	
		// if this is [user]'s (n>3)th day in a row of t>80:
			// print "This is [user]'s nth good day in a row!
		
		// if 69 nice

		// check for matches and neighbors, post (maybe tag)	
}

function tStats(message) {
    let query = "CALL week_average()";
	
    Connect().then(() => {
        return Query(query);
    }).then((results) => {
        console.log(results);
        let message = 'Last 7 day stats:\n';
        for (let i = 0; i<results[0].length; i++){
            let user = results[0][i];
            message += `${user.Name}: ${user.AverageT} (${user.numRecords})\n`;
        }
        postToGroup(message);
    }).catch((e) => {
        console.log(e);  
    }).then(() => {
        db.end((err) => {
            console.log("db connection closed");
            if (err) 
                console.log(err);
        });
    });
    
    // handle printing stats to user


	// if normal, print:
	// today: 
		// highest: [name from db] with 88
		// lowest: [name from db] with 10
	// this week:
		// highest average: [name from db] with 70
		// lowest average: [name from db] with 40
		// highest: [name from db] with 100 on [date]
		// lowest: [name from db] with 3 on [date]


	// if more, print:
		//foreach member
			// [name from db]:
				// average this week: 77.4
				// average last week: 51.2
		
}

function addTStatsToDatabase(tcount, messageObj){

    return new Promise((resolve, reject) => {
        // user = getUser(groupmeUserId)
        // if user is null
            // make a new user
        // else if user.name != message.user.name
            // update saved name

        //	// add record to database now

        // addRecord(tcount, groupmeUserId, new Date())

        var user = {
            "GroupMeUserID" : messageObj.user_id,
            "Name" : messageObj.name
        }

        let addUser = (user) => {
            return Query(`INSERT INTO User(GroupMeUserID, Name) VALUES(${user.GroupMeUserID}, '${user.Name}')`);
        };
        let updateUser = (user) => {
            return Query(`UPDATE User SET Name='${user.Name}' WHERE GroupMeUserID=${user.GroupMeUserID}`);
        }

        let checkForRerolls = (user) => {
            let today = new Date();
            const offset = today.getTimezoneOffset() * 60 * 1000;

            // adapted from https://stackoverflow.com/questions/23593052/format-javascript-date-to-yyyy-mm-dd
            // offsets are because toiso moves to utc which is not what we want here
            let todayAdjusted = new Date(today.getTime() - offset).toISOString();
            let tomorrow = new Date(today.getTime() - offset + (3600*24*1000)).toISOString();
            let todayDateString = todayAdjusted.split('T')[0];
            let tomorrowDateString = tomorrow.split('T')[0];
           
            // datestring should now be in format 
                    // yyyy-mm-dd
            return Query(`SELECT * FROM TCount WHERE GroupMeUserID = ${user.GroupMeUserID} AND ` + 
                                `time BETWEEN '${todayDateString}' AND '${tomorrowDateString}'`);
        }


        // handle user
        // check if user is in db
        let query = `SELECT * FROM User WHERE GroupMeUserID = ${user.GroupMeUserID}`;

        Connect().then(() => {
            return Query(query);
        }).then((result) => {
            if (result.length > 0) {
                // user is in db, do names match?
                console.log("user is in db");
                // check if stored name matches current display name
                console.log(result);
                if (result[0].Name == user.Name) {
                    // names match, do nothing
                    return result;
                } else {
                    return updateUser(user);
                }
            } else {
                return addUser(user);
            }
        }).then(() => {
            return checkForRerolls(user);
        }).then((result) => {
            // if a reroll, SHAME
            if (result.length > 0) {
                console.log("result is present, must be reroll");
                resolve(true); 
                return;
            } else {
                // insert t record into database
                let query = `INSERT INTO TCount(GroupMeUserID, t) VALUES(${user.GroupMeUserID}, ${tcount})`;
                return Query(query);
            }
        }).then(() => {
           resolve(false); 
        }).then(()=> {
            db.end((err) => {
                console.log("db connection closed");
                if (err) 
                    console.log(err);
            });
        }).catch((e) => {
            console.log('tcount insert error');
            console.log(e); 
        });
    });
}





// this just runs the app on the specified port. 
app.listen(PORT, function () {
	console.log('listening on ' + PORT);
});

