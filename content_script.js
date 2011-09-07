/*
GLOBAL VARIABLE DECLARATION
*/
var scraped_songs = [];
var SCRAPE_DEBUG = false;
var timeout = null;
var API_MAP = { "track" : "http://api.beatport.com/catalog/tracks", "release" : "http://api.beatport.com/catalog/tracks",
				 "iTunes" : "http://itunes.apple.com/search" };
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
    start();
}

document.addEventListener("DOMSubtreeModified", function() {
    if(timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(listener, 1000);
}, false);

/*
This class will handle holding song information for 
songs scraped and collected while the user browses beatport
*/
function BeatportSong(type, track_id){
	this.type = type;
	this.id = track_id;

	if (this.type == "track")
	{
		$.getJSON(API_MAP[this.type],{ id : this.id, format: "json", v : "1.0" }, function(data){
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
			assign_song_values(this, data.results[0]);
			lookup_cheaper_songs(this);
		});
	}
};

function assign_song_values(beatport_song, track)
{
	dbprint(track);
	beatport_song.title = track.name;
	beatport_song.price = track.price.usd; //let's just do USD for now
	beatport_song.qualified_name = track.name + " ("+ track.mixName + ")";
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
		console.debug("searching: "+bp_song.qualified_name);
		for (var trackIndex in data.results)
		{
			var track = data.results[trackIndex];
			console.debug("\tFound track: " + track.trackName);
			console.debug("\tFor the price: "+ track.trackPrice);
		}	
	});
};


BeatportSong.prototype.type = "SongType";
BeatportSong.prototype.id = "SongID";
BeatportSong.prototype.artist = "SongArtist";
BeatportSong.prototype.title = "SongTitle";
BeatportSong.prototype.qualified_name = "Name&Mix";
BeatportSong.prototype.price = 0;


/*
This is the main scraping function. It works by searching for all the buy_button_links
which are the green cart buttons with the price on them. 
General Steps of the extension will be:
1. Scrape the page for all purchasable songs
2. Use beatport API to determine price and song information. We need to scrape song type (release, chart , etc..) in order to call proper API
3. Use song information collected to try and find matching songs in other stores and find lowest possible price.
4. Display found listings to user in popup window or directly on the screen
*/
function start()
{
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

