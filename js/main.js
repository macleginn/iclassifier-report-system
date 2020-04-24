const authURL    = 'https://www.iclassifier.pw/api/authserver',
	  requestURL = 'https://www.iclassifier.pw/api/egyptian-backend/readonly',
	  jseshURL   = 'https://iclassifier.pw/api/jseshrender/?mdc=';

let project          = null,
	projectType      = null,
	downloadingData  = false,
	showClfReports   = false,
	showLemmaReports = false,
	showMap          = false;

let tokenData   = null,
	clfArr      = [],
	lemmaData   = null,
	witnessData = null;

// Data for classifier reports
let clfDict = {},
	comDict = {},
	lemDict = {},
	posDict = {},
	ordDict = {},
	scrDict = {};

function cmpInts(a, b) {
    let aInt = parseInt(a),
        bInt = parseInt(b);
    if (aInt < bInt)
        return -1;
    else if (aInt > bInt)
        return 1;
    else
        return 0;
}

function sortCounterDesc(dict) {
	let result = [];
	for (const key in dict)
		if (dict.hasOwnProperty(key))
			result.push([key, dict[key]]);
	result.sort((a, b) => -1 * cmpInts(a[1], b[1]));
	return result;
}

function byID(id) {
	return document.getElementById(id);
}


function goFullScreen(elementID) {
	let element = byID(elementID);
	if (element.requestFullscreen) {
		element.requestFullscreen();
	} else if (element.mozRequestFullScreen) {
		element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen();
	}
}

function extractClfsFromString(s) {
    let inside_clf = false,
        temp = [],
        result = [];
    if (s === null)
        return result;
    for (let i = 0; i < s.length; i++) {
        if (s.charAt(i) === '~') {
            if (inside_clf) {
                result.push(temp.join(''));
                temp = [];
                inside_clf = false;
            } else {
                inside_clf = true;
            }
        } else {
            if (inside_clf)
                temp.push(s.charAt(i));
        }
    }
    return result
}

function mdc2glyph(mdc) {
	if (projectType !== 'hieroglyphic')
		return mdc;

	if (mdc2uni.hasOwnProperty(mdc))
		return mdc2uni[mdc];
	else
		return mdc;
}

async function switchProject(element) {
	showClfReports   = false;
	showLemmaReports = false;
	showMap          = false;
	clfReport.currentClf = '---';

	byID('canvas1').innerHTML = '';
	byID('canvas2').innerHTML = '';

	// Disable the buttons while loading the data.
	project = null;
	downloadingData = true;
	m.redraw();

	const fields     = element.value.split('|'),
		  newProject = fields[0];
	projectType = fields[1];
	
	let response = await fetch(`${requestURL}/${newProject}/tokens/all`);
	if (!response.ok) {
		const message = await response.text();
		alert("Failed to download token info from the server: " + message);
		return;
	}
	tokenData = await response.json();

	// Extract classifiers
	let clfSet = new Set();
	for (const key in tokenData) {
		if (!tokenData.hasOwnProperty(key))
			continue;

		const mdc = tokenData[key].mdc_w_markup,
		      clfs = extractClfsFromString(mdc);
		for (const clf of clfs) {
			let glyph = mdc2glyph(clf);
			if (clf !== glyph)
				clfSet.add(`${glyph} (${clf})`);
			else
				clfSet.add(glyph);
		}
	}
	clfArr = Array.from(clfSet);
	clfArr.sort();

	response = await fetch(`${requestURL}/${newProject}/lemmas/all`);
	if (!response.ok) {
		const message = await response.text();
		alert("Failed to download lemma info from the server: " + message);
		return;
	}
	lemmaData = await response.json();

	response = await fetch(`${requestURL}/${newProject}/witnesses/all`);
		if (!response.ok) {
		const message = await response.text();
		alert("Failed to download witness info from the server: " + message);
		return;
	}
	witnessData = await response.json();

	// Turn the buttons back on.
	project = newProject;
	downloadingData = false;
	m.redraw();
}

function toggleClfReport() {
	showClfReports   = true;
	showLemmaReports = false;
	showMap          = false;
	m.redraw();
}

function toggleLemmaReport() {
	showClfReports   = false,
	showLemmaReports = true,
	showMap          = false;
	m.redraw();
}

function toggleMap() {
	showClfReports   = false,
	showLemmaReports = false,
	showMap          = true;
	m.redraw();
}

async function fetchProjects() {
	const response = await fetch(`${authURL}/getprojectsforbrowsing`);
	if (!response.ok) {
		alert("Couldn’t download the list of projects from the server.");
				return;
	}

	const data = await response.json();
	let projectSelect = byID('project-select');
	for (const key in data) {
		if (!data.hasOwnProperty(key))
			continue;
		let option = document.createElement('option');
		option.text  = data[key].title;
		option.value = `${key}|${data[key].type}`;
		projectSelect.appendChild(option);
	}
	projectSelect.value = '---';
}

document.addEventListener('DOMContentLoaded', fetchProjects);
