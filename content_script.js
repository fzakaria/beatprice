/*
GLOBAL VARIABLE DECLARATION
*/
var scraped_songs = [];
var SCRAPE_DEBUG = true;
var timeout = null;
var API_MAP = { "Beatport" : "http://api.beatport.com/catalog/tracks",
				 "iTunes" : "http://itunes.apple.com/search" };


// The background page is asking us to find an address on the page.
if (window == top) {
  chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
    	if (req.is_beatport)
    		start();
    		sendResponse({is_beatport: true});
  });
};

/*
Debug specific functions go here
*/

function dbprint(value)
{
	if (SCRAPE_DEBUG)
	{
		console.debug(value);
	}
}
/*
In order to continously scrape the songs as the user browses around,
this hack works by listening to the DOMTree being modified. We need to attach
a timeout however because it fires multiple times for a single page change
*/
function listener()
{
    dbprint("listener fired.");
}

document.addEventListener("DOMSubtreeModified", function() {
    if(timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(listener, 1000);
}, false);


function Artist(role, name)
{
	this.role = role;
	this.name = name;
};

/*
This class will handle holding song information for 
songs scraped and collected while the user browses beatport
*/
function BeatportSong(track_id){
	current_song = this; //so we can
	current_song.id = track_id;
	$.getJSON(API_MAP["Beatport"],{ id : this.id, format: "json", v : "1.0" }, function(data){
		if (data.results.length == 0)
		{
			console.debug("Couldn't find anything for id: " + id);
			return;
		}
		if (data.results.length > 1)
		{
			console.debug("Found more than 1 track for that ID!")
			return;
		}
		current_song.title = data.results[0].name;
		current_song.mixName = data.results[0].mixName;
		current_song.price = data.results[0].price;
		//Add the artists and role i.e. Artist or Remixer
		for (var artist_index in data.results[0].artists)
		{
			current_song.artists.push( new Artist(data.results[0].artists[artist_index].type, data.results[0].artists[artist_index].name));
		}
	});
};

function assign_song_values(beatport_song, track)
{
	dbprint(track);
	beatport_song.name = track.name;
	beatport_song.price = track.price.usd; //let's just do USD for now
	beatport_song.qualified_name = track.name + " ("+ track.mixName + ")";
	beatport_song.artists = [];
	for (var artistIndex in track.artists)
	{
		beatport_song.artists.push( track.artists[artistIndex].name);
	}
};

function lookup_cheaper_songs(bp_song)
{
	search_itunes(bp_song);
};

function search_itunes(bp_song)
{
	$.getJSON(API_MAP["iTunes"],{ term : bp_song.qualified_name.replace(/\s/g,'+')}, function(data){
		if (data.resultCount < 1)
			return;
		for (var trackIndex in data.results)
		{
			var track = data.results[trackIndex];
			var isMatch = false;
			for (var artistIndex in bp_song.artists)
			{
				var pattern= new RegExp(bp_song.artists[artistIndex], "gi");
				if (pattern.test(track.artistName))
				{
					//We've found a pretty strong match!
					if (track.trackPrice < bp_song.price && track.trackPrice > 0) //trackPrice of -1 is AlbumOnly
					{
						bp_song.price = track.trackPrice;
						bp_song.url = track.trackViewUrl;
						console.debug("Found cheaper track!");
						console.debug("\tTitle: "+bp_song.qualified_name);
						console.debug("\tPrice: "+bp_song.price);
						console.debug("\tUrl: "+ bp_song.url);
						//send the scraped songs to the background.html file to be displayed in the popup
						chrome.extension.sendRequest(bp_song, function(response) {
						//we don't care bout the response
						});
					}
				}
			}

		}	
	});
};


BeatportSong.prototype.id = "SongID";
BeatportSong.prototype.artists = [];
BeatportSong.prototype.title = "SongTitle";
BeatportSong.prototype.mixname = "MixName";
BeatportSong.prototype.price = Object();
BeatportSong.prototype.url = "";

Artist.prototype.role = "Role";
Artist.prototype.name = "name";


/*
This is the main scraping function. It works by searching for all the buy_button_links
which are the green cart buttons with the price on them. 
General Steps of the extension will be:
1. Scrape the page for all purchasable songs
2. Use beatport API to determine price and song information. We need to scrape song type (release, chart , etc..) in order to call proper API
3. Use song information collected to try and find matching songs in other stores and find lowest possible price.
4. Display found listings to user in popup window or directly on the screen
*/
function start2()
{
	var song_buttons = $(".item-actions-playcart.clearfix");
	song_buttons.append('<a name="test" class="btn-pill btn-pill-large evtBuy"><span>Cheaper</span></a>');

	$.get(" http://api.beatport.com/catalog/tracks?id=3192674", function(data) { dbprint(data); console.log("Here"); });
	dbprint(test);
	return;

	var buy_button_links = $('a[name="buy_button_link"]');
	dbprint("Found: " + buy_button_links.length + " buy button links.");

	buy_button_links.each(function(index) {
		var data_buy = $(this).attr('data-buy');
		var item_type_pattern = /(track|release)\:([0-9]+)/
		var match = item_type_pattern.exec(data_buy);

		if (match == null)
			return;//essentially a continue;

		var item_type = match[1];
		var item_id = match[2];

		if (item_type == null || item_id == null)
			return;//essentially a "continue"

		if (item_type != "track")
			return;//right now I only care about making this work for individual tracks

		dbprint("Found match:\n")
		dbprint("\tType: "+ item_type);
		dbprint("\tID: " + item_id);

		newSong = new BeatportSong(item_type, item_id);
		scraped_songs.push(newSong);
	});
};

function start()
{
	var current_path = window.location.pathname;
	var current_id = current_path.split('/').pop();
	newSong = new BeatportSong(current_id);
	dbprint(newSong);
};

$("a").ajaxComplete(function(event,request, settings){
   console.log("HERERE!!!");
 });

start();
