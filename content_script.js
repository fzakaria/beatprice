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


function lookup_cheaper_songs(bp_song, element)
{
	search_itunes(bp_song, element);
};

function search_itunes(bp_song, element)
{
	//Itunes doesn't append 'Original Mix to titles when no mix available'
	var qualified_name = bp_song.title;
	if (bp_song.mixName != "Original Mix")
	{
		qualified_name += " " + bp_song.mixName;
	}
	var media_type = "music";
	var entity_type = "song";

	var MATCH_PERCENTAGE = 0.7;

	$.getJSON(API_MAP["iTunes"],{ term : qualified_name, media : media_type, entity:entity_type}, function(data){
		if (data.resultCount < 1)
		{
			console.log("Found no matching song on iTunes");
			return;
		}

		var newElementAttrib = "<table>"
		var count = 0;
		//Lets display first three tracks!
		for (var trackIndex in data.results)
		{
			if (count == 3)
			{
				break;
			}
			var track = data.results[trackIndex];
			var price = track.trackPrice;
			var currencyName = track.currency;
			var trackName = track.trackName;
			var trackURL = track.trackViewUrl;

			if (qualified_name.score(trackName) > MATCH_PERCENTAGE ||
				bp_song.title.score(trackName) > MATCH_PERCENTAGE)
				{
					newElementAttrib += "<tr>";
					newElementAttrib += "<td>";
					newElementAttrib += "<a href="+trackURL+">"+track.trackName+ " - " + price + currencyName + "</a>";
					newElementAttrib += "</td>";
					newElementAttrib += "</tr>";
					count ++;	
				}
		}

		if (count > 0)
		{
			//match was found! make visible the button
			$(element).show();
		}
		
		newElementAttrib += '</table>';
		element.setAttribute('data-content', newElementAttrib);	
	});
};

function CreateCheaperButtonElement()
{
	/*This button uses bootstrap.css found @http://twitter.github.com/bootstrap */
	var newElement = document.createElement('a');
	newElement.setAttribute("class", "btn danger");
	newElement.setAttribute('rel', 'popover');
	newElement.setAttribute('href', '#');
	newElement.setAttribute('data-content', '<a href="http://www.fzakaria.com">test content</a>');
	newElement.setAttribute('data-original-title', 'Beatport Price Checker')
	newElement.innerHTML = 'Found Cheaper!';
	return newElement;
}

function FindCheaperButtonSibling()
{
	/*page looks for element found in page that follows: it must follow www.beatport.com/track/<track-name>/<track-id> */
	var parent_element_array = $(".item-actions-playcart.clearfix");
	var sibling_element = null;
	if (parent_element_array.length != 1)
	{
		console.debug("Found more than one place to add new DOM element");
		return null;
	}
	sibling_element = parent_element_array[0];
	return sibling_element;
}

function InsertCheaperButtonElement(cheaperButton)
{
	var sibling = FindCheaperButtonSibling();
	sibling.setAttribute('style', 'width:200px;');
	$(sibling).after(cheaperButton);
	$(cheaperButton).hide();//hide initially unless we find cheaper song!
	$(cheaperButton).popover({
		html : true,
		delayOut: 1000,
		trigger: "hover"
	});
}


function start_track_page()
{
	/*Define all variables at start*/
	var current_path = window.location.pathname;
	var current_id = current_path.split('/').pop();
	var cheaperButton = CreateCheaperButtonElement();
	/*Step 1: 
	Check if page is a valid song page.
	it must follow www.beatport.com/track/<track-name>/<track-id>
	TO DO: Add parser to add this button for all purchasable songs (not just single track page)
	*/
	var newSong = new BeatportSong(current_id);
	if (!newSong.valid)
	{
		console.debug("Song not valid!");
		return;
	}
	console.log(newSong);

	/*Step 2: Insert the cheaper button. The button is hidden unless new songs are found!*/
	InsertCheaperButtonElement(cheaperButton);
	
	/*Step 3: Lets now search for cheaper songs! If we find any, add them to the cheaper button HTML and make visible!*/
	lookup_cheaper_songs(newSong, cheaperButton);

};

$.ajaxSetup({
  global: 'true'
});

$('a').ajaxSuccess(function() {
  console.debug("HERE!222222!!");
});

$(document).ready(function($)
{
	console.debug("HERE!112312451254235!");
});


$(window).load(function () {
 console.debug("HERE!1123123412412412514512412341235!")
});


start_track_page();