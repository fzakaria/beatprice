/*
GLOBAL VARIABLE DECLARATION
*/
var API_MAP = { "Beatport" : "http://api.beatport.com/catalog/tracks",
				 "iTunes" : "http://itunes.apple.com/search" };


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
	$.ajax({
		type: 'GET',
		url: API_MAP["Beatport"],
		dataType: 'json',
		success: function(data) 
		{
			//if the ajax was called on an invalid URL, this how we can check that the song created is invalid. I'm open to better suggestions.
			current_song.valid = false;
			if (data.results.length == 0)
			{
				console.warning("Couldn't find a track for id:%s", track_id);
				return;
			}
			if (data.results.length == 0)
			{
				console.warning("Found too many tracks for id:%s", track_id);
				return;
			}
			current_song.valid = true;
			current_song.title = data.results[0].name;
			current_song.mixName = data.results[0].mixName;
			current_song.price = data.results[0].price;
			//Add the artists and role i.e. Artist or Remixer
			current_song.artists = [];
			for (var artist_index in data.results[0].artists)
			{
				current_song.artists.push( new Artist(data.results[0].artists[artist_index].type, data.results[0].artists[artist_index].name));
			}
		},
	    complete: function(response) 
	    {
        },
        error: function() 
        {
        	console.error("Error getting Beatport song data via ajax call.");	
        },
		data: {id : track_id},
		async: false
	});
};


function lookup_cheaper_songs(bp_song)
{
	search_itunes(bp_song);
};

function search_itunes(bp_song)
{
	//Itunes doesn't append 'Original Mix to titles when no mix available'
	var qualified_name = bp_song.title;
	if (bp_song.mixName != "Original Mix")
	{
		qualified_name += " " + bp_song.mixName;
	}
	var media_type = "music";
	var entity_type = "song";

	$.getJSON(API_MAP["iTunes"],{ term : qualified_name, media : media_type, entity:entity_type}, function(data){
		if (data.resultCount < 1)
			console.log("Found no matching song on iTunes");
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


function start_track_page()
{
	var current_path = window.location.pathname;
	var current_id = current_path.split('/').pop();
	newSong = new BeatportSong(current_id);
	if (!newSong.valid)
	{
		return;
	}
	console.log(newSong);
	//Lets now search for cheaper songs!
	lookup_cheaper_songs(newSong);
};

start_track_page();
