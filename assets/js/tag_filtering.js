function createTagsDropdown(tags_hashtable) {
	for (var key in tags_hashtable) {
		var values = tags_hashtable[key];
		var title = key;

		if (title == 'since') {
			title = 'API Version';
		}

		if (title == 'deprecated') {
			var menu = $("#menu");
			var widget = '';
			widget += '<li>';
			widget += '<button type="button" id="show-deprecated" class="btn navbar-btn btn-default" data-toggle="button" aria-pressed="false" autocomplete="off">'
			widget += 'Show deprecated symbols';
			widget += '</button>';
			widget += '</li>';
			menu.append(widget);
		} else {
			var menu = $('#menu');
			var widget = '<li class="dropdown">';
			widget += '<a class="dropdown-toggle" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
			widget += title.capitalizeFirstLetter() + ' ';
			widget += '<span class="caret"></span></a>';
			widget += '<ul class="dropdown-menu" id="' + key + '-menu">';

			widget += '<li><a id="' + key + '">Reset</a></li>';
			widget += '<li role="separator" class="divider"></li>';

			values.map(function (item) {
				widget += '<li><a id="'+ key + '">';
				widget += item;
				widget += '</a></li>';
			});
			widget += '</ul>';
			widget += '</li>';
			menu.append(widget);
		}
	}
}

function createTagsHashtable() {
	var tags_hashtable = {};

	$('div[data-hotdoc-tags]').map(function() {
		taglist = $(this).attr('data-hotdoc-tags');
		var tags = taglist.split(';');
		if (tags.length == 1) {
			return;
		}

		tags.map(function(item) {
			var key_value = item.split(':');
			if (key_value.length != 2) {
				return;
			}

			var key = key_value[0];
			var value = key_value[1];
			if (!tags_hashtable[key]) {
				tags_hashtable[key] = [];
			}
			if ($.inArray(value, tags_hashtable[key]) == -1) {
				tags_hashtable[key].push(value);
			}
		});
	});

	return tags_hashtable;
}

function parseTags(item) {
	var taglist = item.attr('data-hotdoc-tags');
	var tags_table = {};

	if (taglist === undefined) {
		return null;
	}

	var tags = taglist.split(';');

	tags.map(function(item) {
		var key_value = item.split(':');
		if (key_value.length != 2) {
			return;
		}

		var key = key_value[0];
		var value = key_value[1];
		tags_table[key] = value;
	});

	var dump = JSON.stringify(tags_table, null, 4);
	return tags_table;
}

function compareDefault(all_values, filter_value, item_value) {
	return (filter_value == item_value);
}

function doCompareVersions(all_values, filter_value, item_value) {
	if (item_value === undefined) {
		return true;
	}

	return (compareVersions(filter_value, item_value) >= 0);
}

function doCompareStability(all_values, filter_value, item_value) {
	if (item_value === undefined) {
		/* We consider API as stable by default */
		if (filter_value == 'unstable') {
			return false;
		} else {
			return true;
		}
	}

	return (filter_value == item_value);
}

function doCompareDeprecated(all_values, filter_value, item_value) {
	var since = all_values['since'];

	/* Item isn't marked as deprecated */
	if (item_value === undefined) {
		return true;
	}

	/* Item is marked as deprecated, but we show deprecated */
	if (filter_value == true) {
		return true;
	}

	/* Item is marked as deprecated and we show the latest version */
	if (since === undefined) {
		return false;
	}

	/* returns false if item was deprecated at the version we filter on */
	return (compareVersions (since, item_value) < 0);
}

function setupFilters() {
	var mainEl = $('#main');
	var transitionDuration = 800;
	var currentFilters = {};
	var customCompareFunctions = {'since': doCompareVersions,
		'stability': doCompareStability,
		'deprecated': doCompareDeprecated};

	var navSelector = '#toc';
	var $myNav = $(navSelector);

	var tags_hashtable = createTagsHashtable();
	createTagsDropdown(tags_hashtable);
	for (var key in tags_hashtable) {
		currentFilters[key] = undefined;
		if (key == 'deprecated') {
			currentFilters[key] = $(this).hasClass('active');
			$('#show-deprecated').click(function() {
				currentFilters["deprecated"] = !$(this).hasClass('active');
				mainEl.isotope({filter: isotopeFilter});
			})
		} else {
			$('#' + key + '-menu a').click(function() {
				var key = $(this).attr('id');
				if ($(this).text() == "Reset")
					currentFilters[key] = undefined;
				else
					currentFilters[key] = $(this).text();

				mainEl.isotope({filter: isotopeFilter});
			});
		}
	}

	function shouldBeVisible(item) {
		var item_tags = parseTags(item);

		if (!item_tags) {
			return true;
		}

		var res = true;

		for (var key in currentFilters) {
			var compareFunction = customCompareFunctions[key];
			if (compareFunction === undefined) {
				compareFunction = compareDefault;
			}

			value = currentFilters[key];
			if (value === undefined) {
				continue;
			}

			if (!compareFunction (currentFilters, value, item_tags[key])) {
				res = false;
				break;
			}
		}

		return res;
	}

	function isotopeFilter() {
		if ($(this).hasClass('summary_section_title')) {
			res = false;
			var next = $(this).nextUntil(".summary_section_title");

			next.map(function () {
				if (shouldBeVisible($(this))) {
					res = true;
				}
			});
			return res;
		} else if ($(this).hasClass('symbol_section')) {
			res = false;
			var next = $(this).nextUntil(".symbol_section");

			next.map(function () {
				if (shouldBeVisible($(this))) {
					res = true;
				}
			});
			return res;
		}

		return shouldBeVisible ($(this));
	}

	var $grid = mainEl.isotope({
		layoutMode: 'vertical',
		animationEngine: 'best-available',
		containerStyle: "margin-left: 15px;",
		filter: isotopeFilter,
		animationOptions: {
			duration: transitionDuration
		},
	});

	Toc.init($myNav);

	function layoutTimer(){

		setTimeout(function(){
			mainEl.isotope('layout');
		}, transitionDuration);
	}

	layoutTimer();

	$grid.on( 'arrangeComplete', function( event, filteredItems ) {
		$("h1:not(.always-hide-toc),h2:not(.always-hide-toc),h3:not(.always-hide-toc),h4:not(.always-hide-toc),h5:not(.always-hide-toc),h6:not(.always-hide-toc)").removeAttr("data-toc-skip");
		$("h1:hidden,h2:hidden,h3:hidden,h4:hidden,h5:hidden,h6:hidden").attr("data-toc-skip", "true");
		$myNav.empty();
		Toc.init($myNav);
	})

	// Isotope messes with our anchors positions
	var hash_index = window.location.href.indexOf("#");
	if (hash_index != -1) {
		var hash = window.location.href.substring(hash_index + 1);
		location.hash = "#" + hash;
	}

	// From navbar_offset_scroller.js
	scroll_if_anchor(window.location.hash);

	$("#content-column").attrchange(function(attrName) {
		if (attrName=='class') {
			layoutTimer();
		}
	});
}
