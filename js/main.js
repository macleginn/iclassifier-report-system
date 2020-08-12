const authURL    = 'https://www.iclassifier.pw/api/authserver',
	  requestURL = 'https://www.iclassifier.pw/api/egyptian-backend/readonly',
	  jseshURL   = 'https://iclassifier.pw/api/jseshrender/?mdc=';

let project          = null,
	projectType      = null,
	downloadingData  = false,
	showClfQueries   = false,
	showClfReports   = false,
	showLemmaReports = false,
	showMap          = false;

function setMenu(menuName) {
	showClfQueries   = false;
	showClfReports   = false;
	showLemmaReports = false;
	showMap          = false;
	switch (menuName) {
		case 'clfQueries':
			showClfQueries = true;
			break;
		case 'clfReports':
			showClfReports = true;
			break;
		case 'lemmaReports':
			showLemmaReports = true;
			break;
		case 'map':
			showMap = true;
			break;
		default:
			break;
	}
}

let tokenData      = null,
    clfData		   = null,
	compoundTokens = null,
	compoundParts  = null,
	clfArr         = [],
	lemmaData      = null,
	witnessData    = null;

// Data for classifier reports
let clfDict = {},
	comDict = {},
	lemDict = {},
	lemMean = {},
	posDict = {},
	ordDict = {},
	scrDict = {};

// A common part of classifier and lemma reports
let statsDiv = {
	view: vnode => {
		const dict   = vnode.attrs.data,
			  font   = vnode.attrs.font,
			  header = vnode.attrs.header;
		if (JSON.stringify(dict) === JSON.stringify({}))
			return m('div', 'No data');
		else {
			let sortedLemmaCounts = sortCounterDesc(dict);
			return m('div', m(statsTable, {
				data: sortedLemmaCounts,
				font: font,
				header: header
			}))
		}
	}
}

let statsTable = {
	view: vnode => {
		let rows   = vnode.attrs.data,
			font   = vnode.attrs.font,
			header = vnode.attrs.header,
			cssClass;
		if (font === 'unicode-egyptian')
			cssClass = font;
		else if (font === 'default')
			cssClass = null;
		else
			cssClass = projectType;

		return m('table.stats', [
			m(
				'tr',
				{style: {'border-bottom': '1px dotted black'}},
				[
					m('th',
						{style: {
							width: '570px',
							'text-align': 'left'}},
						header),
					m('th', {style: {'text-align': 'left'}}, 'Count')
				]
			)
		].concat(
			rows.map(row => m(
				'tr',
				[m('td', {class: cssClass}, row[0]), m('td', row[1])]
			)))
		);
	}
}

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

// A JS version of Python's "get" method for dicts.
function get(dict, key, plug) {
	if (dict.hasOwnProperty(key))
		return dict[key];
	else
		return plug;
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

function filterCompoundTokens() {
	compoundTokens = new Set();
	for (const key in tokenData) {
		if (!tokenData.hasOwnProperty(key))
			continue;
		const compoundId = tokenData[key].compound_id;
		if (compoundId !== null && compoundId !== "")
			compoundTokens.add(compoundId);
	}
}


function filterCompoundParts() {
	compoundParts = new Set();
	for (const key in tokenData) {
		if (!tokenData.hasOwnProperty(key))
			continue;
		if (tokenData[key].compound_id !== null &&
			tokenData[key].compound_id !== '')
			compoundParts.add(parseInt(key));
	}
}

function normaliseScript(scriptId) {
	switch (scriptId) {
		case 'thot-71':
			return 'hieratic';
		case 'thot-67':
			return 'demotic';
		case 'thot-83':
			return 'hieroglyphs';
		default:
			return scriptId;
	}
}


async function switchProject(element) {
	setMenu(null);
	clfReport.currentClf     = '---';
	lemmaReport.currentLemma = '---';

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
	filterCompoundTokens();
	filterCompoundParts();

	response = await fetch(`${requestURL}/${newProject}/clf_parses/all`);
	if (!response.ok) {
		const message = await response.text();
		alert("Failed to download classifier info from the server: " + message);
		return;
	}
	clfData = await response.json();

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

function toggleClfQueries() {
	setMenu('clfQueries');
	m.redraw();
}

function toggleClfReport(clf2Report) {
	console.log(clf2Report);
	if (clf2Report === undefined)
		clfReport.currentClf = '---';
	else
		clfReport.currentClf = clf2Report;
	byID('canvas1').innerHTML = '';
	byID('canvas2').innerHTML = '';
	setMenu('clfReports');
	m.redraw();
}

function toggleLemmaReport() {
	lemmaReport.currentLemma = '---';
	byID('canvas').innerHTML = '';
	setMenu('lemmaReports');
	m.redraw();
}

function toggleMap() {
	setMenu('map');
	m.redraw();
}

function toggleBgrCol(elementID) {
	const currentCol = byID(elementID).style['background-color'];
	byID(elementID).style['background-color'] = (currentCol === 'white') ? 'black' : 'white';
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
