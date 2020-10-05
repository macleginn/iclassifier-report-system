const authURL    = 'https://www.iclassifier.pw/api/authserver',
// const authURL    = 'http://127.0.0.1:21000',
	requestURL = 'https://www.iclassifier.pw/api/egyptian-backend/readonly',
	  // requestURL = 'http://127.0.0.1:11000/readonly',
	  jseshURL   = 'https://iclassifier.pw/api/jseshrender/?mdc=';

let path             = null,
	project          = null,
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

// An adjacency list for the compound-part graph.
// To extract compound neighbours, query the list twice.
let compoundPartGraph = null;

// Data for classifier reports
let clfDict = {},
	comDict = {},
	lemDict = {},
	lemMean = {},
	posDict = {},
	ordDict = {},
	scrDict = {},
	outerCompoundClfDict = {},
	tokensForClf = [];

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

function startswith(inputString, prefix) {
	return inputString.indexOf(prefix) === 0;
}

function endswith(inputString, prefix) {
	const slen = inputString.length,
		plen = prefix.length;
	return inputString.indexOf(prefix) !== -1 && inputString.slice(slen-plen) === prefix;
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
	compoundPartGraph = {};
	for (const key in tokenData) {
		if (!tokenData.hasOwnProperty(key))
			continue;
		const compoundId = tokenData[key].compound_id;
		if (compoundId !== null && compoundId !== "") {
			compoundTokens.add(parseInt(compoundId));
			// Add the edge to the part-compound graph
			compoundPartGraph[key] = compoundId;
			if (!compoundPartGraph.hasOwnProperty(compoundId))
				compoundPartGraph[compoundId] = [];
			compoundPartGraph[compoundId].push(key);
		}
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

	// Modify the displayed URL
	window.location.hash = '!' + project;

	checkThePathAndRedraw();
}

function toggleClfReport(clf2Report) {
	lemmaReport.currentLemma = '---';
	window.location.hash = `!${project}/classifiers`;
	console.log(clf2Report);
	if (clf2Report === undefined) {
		clfReport.currentClf = '---';
		byID('canvas1').innerHTML = '';
		byID('canvas2').innerHTML = '';
	} else {
		clfReport.currentClf = clf2Report;
		getClfReport(clf2Report);
	}
	setMenu('clfReports');
	m.redraw();
}

function checkThePathAndRedraw() {
	// Check the path for a particular report
	if (path === null || path.length === 0)  //
		m.redraw();
	else {
		const reportType = path[0];
		path = path.slice(1);
		switch (reportType) {
			case 'lemmas':
				toggleLemmaReport();
				break;
			case 'classifiers':
				let clf2Report;
				if (path !== null && path.length > 0) {
					// Classifiers can contain weird characters.
					clf2Report = decodeURI(path[0]);
					path.length = 0;
				}
				toggleClfReport(clf2Report);
				break;
			case 'clfqueries':
				toggleClfQueries();
				break;
			case 'map':
				toggleMap();
				break;
			default:
				m.redraw()
				alert(`Wrong report type: ${reportType}`);
				break;
		}
	}
}

function toggleClfQueries() {
	setMenu('clfQueries');
	m.redraw();
	window.location.hash = `!${project}/clfqueries`;
}

function toggleLemmaReport() {
	clfReport.currentClf = '---';
	if (path !== null && path.length > 0) {
		getLemmaReport(parseInt(path[0]));
		lemmaReport.currentLemma = parseInt(path[0]);
		path.length = 0;
	} else {
		lemmaReport.currentLemma = '---';
	}
	byID('canvas').innerHTML = '';
	setMenu('lemmaReports');
	m.redraw();
	window.location.hash = `!${project}/lemmas`;
}

function toggleMap() {
	setMenu('map');
	m.redraw();
	window.location.hash = `!${project}/map`;
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

	// Check for routes.
	const url = window.location.href;
	console.log(url);
	let parts = url.split('#!');
	if (parts.length === 1)
		projectSelect.value = '---';
	else {
		parts = parts[1].split('/');
		// Select a project.
		const key = parts[0];
		if (data.hasOwnProperty(key)) {
			projectSelect.value = `${key}|${data[key].type}`;
			path = parts.slice(1);
			switchProject(projectSelect);
		} else {
			alert(`Wrong project tag in the URL: ${key}`);
			path = null;
			projectSelect.value = '---';
		}
	}
}

/**
 * A function for prettyfying lemma meanings in graphs.
 */
function firstMeaning(meaning) {
	if (meaning === null || meaning === undefined)
		return '';
	meaning = meaning.split(';')[0];
	meaning = meaning.split(',')[0];
	return meaning;
}

/**
 * Extracts classifiers from the token and shows hieroglyphs
 * in a larger font compared to the Latin text together with
 * witness name and coordinates when those are available.
 */
function showTokenWithClfs(tokenId) {
	let	clfArr       = extractClfsFromString(tokenData[tokenId].mdc_w_markup),
		colouredSpan = colourClassifiers(tokenData[tokenId].mdc_w_markup);

	if (projectType === 'hieroglyphic')
		clfArr = clfArr.map(
			mdc =>
				`<span class="hieroglyphic" style="font-size: 16pt">${mdc2glyph(mdc)}</span>`
		);

	const witnessID = tokenData[tokenId].witness_id;
	let witnessName = null,
		witnessLine = tokenData[tokenId].coordinates_in_witness;

	if (witnessID !== '' && witnessID !== null && witnessData[witnessID] !== undefined) {
		witnessName = witnessData[witnessID].name;
	}
	let witnessString = '';
	if (witnessName !== null) {
		witnessString = ` (${witnessName}`;
		if (witnessLine !== null && witnessLine !== '')
			witnessString = witnessString + `: ${witnessLine})`;
		else
			witnessString = witnessString + ')';
	}
	if (clfArr.length > 0)
		return `${colouredSpan} (${clfArr.join(', ')})${witnessString}`;
	else
		return colouredSpan + witnessString;
}

document.addEventListener('DOMContentLoaded', fetchProjects);
