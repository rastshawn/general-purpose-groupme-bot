// GroupMe Bot
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


var botID =  "";
var testID = "";
var botName = "gp_bot";

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


// MODULES
var path = require('path'); // accessing tools folder
var express = require('express'); // for listening to incoming connections
var app = express();
var fs = require('fs'); // for writing information, like the swear jar
var request = require('request'); // for reading Wikipedia 
var xkcd = require('xkcd-api'); // api for grabbing XKCD comics


// Hosts an image. 
app.get("/groupme/balls.jpg", function(req, res) {
    res.sendFile("balls.jpg", {root: path.join(__dirname, TOOLS_FOLDER)});
});

// This is called whenever a message is sent in groupme. 
// The groupme bot system sends the message in a post request. 
app.post('/groupme', function(req, res) {

    var string = ""; // post data string

    // build the data string
    req.on('data', function(data) {
        string += data;
    });

    // when body is complete
    req.on('end', function(){
        var message = JSON.parse(string);

	// this ignores case when parsing commands to the bot.
        var args = message.text.toLowerCase().split(" ");

	// this allows the bot to ignore its own posts, causing a loop.     
        if (message.name == botName) return;        
 
	
	// RESPONDING TO COMMANDS

	// if something truly heinous is posted, 
	// clear the screen by posting a really long message. 
	if(message.text.toLowerCase() == "get that off my screen") {
            var s = "Okay!\nI'll\nget\nthat\noff\nof" +
		"\nyour\nscreen\nno\nproblem.\n\n\n";

            postToGroup(s);
       	}

	// post the lenny face when asked. 
	// the lenny face text is in a saved file in the tools folder. 
	if (args[0] == "(len)" || args[0] == "lenny" || args[0] == "!len") {
            fs.readFile(TOOLS_FOLDER + 'lenny.txt', "utf8", function(err,data) {
                postToGroup(data);
            });
        }
   
	// get tcount - a random number between 1 and 100. 
	// NO REROLLS
        if (args[0] == "!tcount") {
                var num = Math.floor(Math.random() * Math.floor(100)) + 1;
                var numString = "tcount: " + num;
                postToGroup(numString);
        }

	// Call the pupper bot when cute pics are needed. 
	if (args[0] == "sos" || args[0] == "!sos" || args[0] == "!pup"){
		pupper_bot();
	}

	// call the wikipedia random fact bot. 
	if (args[0] == "!wikifact") {
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
	}


	// This calls the xkcd api module. Posts image and alt text for 
	// a random, or a specified XKCD comic. 
	if (args[0] == "!xkcd"){
		if (args[1]){
			if (args[1] == "latest"){
				xkcd.latest(function(error, response) {
					if (error) console.error(error);
					else makeXKCDPost(response);
				});
			} else if (args[1] == "random") {
				xkcd.random(function(error, response) {
					if (error) console.error(error);
					else makeXKCDPost(response);
				});
			} else if (args[1] == "help") {
				postToGroup("Get latest comic: '!xkcd latest'"+
					"\nGet random comic: !xkcd or " + 
					"!xkcd random\nGetspecific comic: " + 
					"!xkcd 274"
				);
			} else if (isNaN(args[1])) {
				postToGroup("Command not recognized. try !xkcd help");
			} else {
				xkcd.get(args[1], function(error, response) {
					if (error) console.error(error);
					else makeXKCDPost(response);
				});
			}
		} else {
			xkcd.random(function(error, response) {
				if (error) console.error(error);
				else makeXKCDPost(response);
			});
		}
	}
	
	// This posts an amusing picture when asked. 
	// The picture is hosted from the tools folder. 
        if (args[0] == "!balls") {
            postToGroup("http://preznix.shawnrast.com:" + PORT + 
                "/groupme/balls.jpg");
        }
    });
});


// This crafts two posts from a comic object from the 
// XKCD api - one with the image and one with the alt text. 
function makeXKCDPost(comic){
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

		function(error, response, body){
			console.log(error);
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
					if (i != -1){
						article = article.substring(0, i);
					}

					// Split the entire article into
					// an array of sentences.
					var articleArray = article.split(". ");
					
					// pick a random sentence. 
					var sentence = articleArray[
						Math.floor(
							Math.random()*
							articleArray.length
						)
					];
					
					// add the period back to the sentence
					// (it is removed by the split command)
					// and post it to the group
					postToGroup(sentence + ".");
					
				}
			} catch(error) {
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
	    body : {
		"bot_id" : botID,
		"text" : text 
	    }
	},
	  function(error, response, body) {
	    console.log(body);
	    console.log(error);
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
function getNonSticky (i, subreddit) {

    request({
        url: 'https://reddit.com/r/' + subreddit + '/hot.json?limit=' + i

    }, function(error, response, body) {
        var data = JSON.parse(body).data;
        var content = data.children[i-1].data.url;
        if (data.children[i-1].data.stickied) {
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

// this just runs the app on the specified port. 
app.listen(PORT, function() {
    console.log('listening on ' + PORT);
});
