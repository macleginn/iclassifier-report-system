let tokenDisplayType = 'all';  // Other possible values: 'standalone', 'compound-part'

let lemmaFilterDict = {};

let lemmaReport = {
	onupdate: () => {
		// A bug workaround.
		if (lemmaReport.currentLemma !== '---')
			byID('lemma-report-select').value = lemmaReport.currentLemma;
	},
	currentLemma: '---',
	lemmaArr: [],
	view: () => {
		if (lemmaReport.currentLemma !== '---')
			window.location.hash = `!${project}/lemmas/${lemmaReport.currentLemma}`;

		let tokenCounts = {};
		for (const key in tokenData)
			if (tokenData.hasOwnProperty(key)) {
				let lemmaID = tokenData[key].lemma_id;
				if (lemmaID === '' || lemmaID === null)
					continue;
				if (!tokenCounts.hasOwnProperty(lemmaID))
					tokenCounts[lemmaID] = 0;
				tokenCounts[lemmaID]++;
			}
		lemmaReport.lemmaArr = sortCounterDesc(tokenCounts);
		return m(
			'div',
			{style: {display: showLemmaReports ? 'block' : 'none'}},
			[
				m('h4', 'Select a lemma (only lemmas with at least one token are listed):'),
				m('br'),
				m(
					'select',
					{
						id: 'lemma-report-select',
						style: {width: '400px'},
						onchange: e => {
							tokenDisplayType = 'all';
							getLemmaReport(parseInt(e.target.value));
							lemmaReport.currentLemma = parseInt(e.target.value);
						},
						value: lemmaReport.currentLemma
					},
					[m('option', {disabled: true, value: '---'}, '---')]
						.concat(lemmaReport.lemmaArr.map(lemmaTuple => m(
							'option', 
							{value: lemmaTuple[0]},
							`${lemmaTuple[1]}: ${
								lemmaData[lemmaTuple[0]] === undefined ? 'unknown' :
								lemmaData[lemmaTuple[0]].transliteration
							} (${
								lemmaData[lemmaTuple[0]] === undefined ? 'unknown' :
								lemmaData[lemmaTuple[0]].meaning
							})`
						)))
				), m('br'), m('br'),
				m(listMenu, {
					menuName: 'lemma-search-menu',
					dataList: lemmaReport.lemmaArr,
					filterDict: lemmaFilterDict,
					filterFunction: (tuple, containerID) => {
						const lemmaID = parseInt(tuple[0]),
							transliteration = lemmaData[lemmaID] === undefined ? 'unknown' : lemmaData[lemmaID].transliteration,
							meaning         = lemmaData[lemmaID] === undefined ? 'unknown' : lemmaData[lemmaID].meaning;
						let test = get(lemmaFilterDict, containerID, '').toLowerCase();
						return (transliteration + meaning).toLowerCase().indexOf(test) >= 0;
					},
					divBuilderCallback: tuple => {
						const lemmaID = parseInt(tuple[0]),
							transliteration = lemmaData[lemmaID] === undefined ? 'unknown' : lemmaData[lemmaID].transliteration,
							meaning         = lemmaData[lemmaID] === undefined ? 'unknown' : lemmaData[lemmaID].meaning;
						let button = document.createElement('div');
						button.innerText = `${tuple[1]}: ${transliteration} (${meaning})`;
						button.classList.add('menu-button-value');
						button.onclick = () => {
							byID('lemma-search-menu').style.display = 'none';
							tokenDisplayType = 'all';
							getLemmaReport(lemmaID);
							lemmaReport.currentLemma = lemmaID;
							m.redraw();
						}
						return button;
					}
				}),
				m(listMenuButton, { menuName: 'lemma-search-menu' }),

				m('br'),				
				m('h4', 'Report token types:'),
				m('br'),
				m(
					'select',
					{
						value: tokenDisplayType,
						style: {width: '400px'},
						onchange: e => { 
							tokenDisplayType = e.target.value;
							getLemmaReport(lemmaReport.currentLemma);
						}
					},
					[
						m('option', {value: 'all'}, 'All'),
						m('option', {value: 'standalone'}, 'Standalone tokens'),
						m('option', {value: 'compound'}, 'Compound tokens'),
						m('option', {value: 'compound-part'}, 'Parts of compounds')
					]
				),

				m(lemmaMap, {lemma: lemmaReport.currentLemma}),
				m(lemmaStats, {lemma: lemmaReport.currentLemma})
			]);
	}
}

let lemmaMap = {
	onupdate: vnode => {
		if (vnode.attrs.lemma !== '---')
			drawLemmaClfGraph(vnode.attrs.lemma);
	},
	view: () => m('div', [
		m('h3', 'Classifier co-occurrence graph'),
		m('div#canvas', {style: {
			width: '640px', height: '480px', 'marign-bottom': '5px', 'background-color': 'white'
		}}),
		m('button', {onclick: e => {e.redraw=false; toggleBgrCol('canvas');}}, 
			'Switch background color'),
		m('button', {onclick: e => {e.redraw=false; goFullScreen('canvas');}}, 
			'Go fullscreen')
	])
}

let lemmaStats = {
	view: vnode => {
		if (vnode.attrs.lemma === '---')
			return;
		
		const lemma         = vnode.attrs.lemma,
			transliteration = lemmaData[lemma].transliteration,
			meaning         = lemmaData[lemma].meaning;

		let tokensForLemma  = getTokensForLemma(parseInt(lemma));
		if (tokenDisplayType === 'compound-part')
			tokensForLemma = preprocessCompoundParts(tokensForLemma);

		return m('div#lemma-tables', [
			m.trust(`<h3>Tokens for lemma <em>${transliteration}</em> (${meaning}):</h3>`),
			m('div',
				{style: {
					'max-height': '300px', 
					overflow: 'auto', 
					width: '640px',
					'background-color': 'white'
				}},
				m(
					'ul.tokens-list', 
					tokensForLemma.map(tokenId => tokenDisplayType === 'compound-part' ?
						m.trust(`<li>${showCompoundPartWithClfs(tokenId)}</li>`,) :
						m.trust(`<li>${showTokenWithClfs(tokenId)}</li>`,)
					)
				)),
			m('h3', `Classifier statistics for the lemma${tokenDisplayType === 'compound-part' ? ' (tokens functioning as compound parts)' : ''}`),
			m(statsDiv, {data: clfDict, font: '', header: 'Classifier'}),
			m('div', {style: {display: tokenDisplayType === 'compound-part'}}, [
				m('h3', "Classifier statistics for compounds including this lemma's tokens as parts"),
				m(statsDiv, {data: outerCompoundClfDict, font: '', header: 'Classifier'})
			]),
			m('h3', 'Classifier combinations with this lemma'),
			m(statsDiv, {data: comDict, font: '', header: 'Classifier combination'}),
			m('h3', 'Script statistics'),
			m(statsDiv, {data: scrDict, font: 'default', header: 'Script'}),
		])
	}
}	

function getTokensForLemma(lemma) {
	let result = [];
	for (const key in tokenData) {
		if (tokenData.hasOwnProperty(key) && tokenData[key].lemma_id === lemma)
			if (tokenDisplayType === 'all')
				result.push(key);
			else if (tokenDisplayType === 'standalone' && !compoundParts.has(parseInt(key)))
				result.push(key);
			else if (tokenDisplayType === 'compound' && compoundTokens.has(parseInt(key)))
				result.push(key);
			else if (tokenDisplayType === 'compound-part' && compoundParts.has(parseInt(key))) {
				result.push(key);
			}
	}
	result.sort();
	return result;
}

function getLemmaReport(lemma) {
	clfDict = {};
	comDict = {};
	scrDict = {};
	outerCompoundClfDict = {};

	for (const key in tokenData) {
		if (tokenData.hasOwnProperty(key) && tokenData[key].lemma_id === lemma) {
			if (tokenDisplayType === 'compound-part' && !compoundParts.has(parseInt(key))) {
				continue;
			} else if (tokenDisplayType === 'standalone' && compoundParts.has(parseInt(key))) {
				continue;
			} else if (tokenDisplayType === 'compound' && !compoundTokens.has(parseInt(key))) {
				continue;
			}

			let clfArr = extractClfsFromString(tokenData[key].mdc_w_markup);
			if (projectType === 'hieroglyphic')
				clfArr = clfArr.map(c => mdc2glyph(c));

			// Classifier statistics
			for (const clf of clfArr) {
				if (!clfDict.hasOwnProperty(clf))
					clfDict[clf] = 0;
				clfDict[clf]++;
			}

			// Encompassing-compound classifier statistics
			if (tokenDisplayType === 'compound-part' && compoundPartGraph.hasOwnProperty(key)) {
				const compoundId = compoundPartGraph[key];
				let compoundClfs = extractClfsFromString(tokenData[compoundId].mdc_w_markup);
				if (projectType === 'hieroglyphic')
					compoundClfs = compoundClfs.map(c => mdc2glyph(c));
				compoundClfs.map(c => {
					if (!outerCompoundClfDict.hasOwnProperty(c)) { outerCompoundClfDict[c] = 0; }
					outerCompoundClfDict[c]++;
				});
			}

			// Classifier-combination statistics
			if (clfArr.length > 0) {
				let combination = clfArr.join('+');
				if (!comDict.hasOwnProperty(combination))
					comDict[combination] = 0;
				comDict[combination]++;
			}

			// Script statistics
			const witnessId = tokenData[key].witness_id;
			if (witnessId !== null && witnessId !== '') {
				if (witnessData[witnessId] === undefined) {
					console.log(`Witness data for witness_id ${witnessId} is undefined.`);
					continue;
				}	
				let script = witnessData[witnessId].script;
				if (script !== null && script !== '') {
					script = normaliseScript(script);
					if (!scrDict.hasOwnProperty(script))
						scrDict[script] = 0;
					scrDict[script]++;
				}
			}
		}
	}
	return lemma;
}

async function drawLemmaClfGraph(lemma) {
	let idCounter = 2; // The centre node has id = 1;

	let nodes = new vis.DataSet(),
		edges = new vis.DataSet(),
		graphData = {
			nodes: nodes,
			edges: edges
		},
		options = {
			nodes: { size: 40 }
		},
		container = document.getElementById('canvas');

	let centralNodeFont;
	switch (projectType) {
		case 'cuneiform':
			options.nodes.font = {face: 'cuneiform'};
			centralNodeFont = 'cuneiform';
			break;
		case 'hieroglyphic':
			// Use Roboto for the lemma and hierofont for classifiers.
			options.nodes.font = {face: 'hierofont'};
			centralNodeFont = 'Roboto';
			break;
		case 'chinese':
			options.nodes.font = {face: 'Noto Sans TC'};
			centralNodeFont = 'Noto Sans TC';			
			break;
		default:
			break;
	}

	new vis.Network(container, graphData, options);

	let lemmaString = '';
	if (lemmaData[lemma] !== undefined) {
		lemmaString = lemmaData[lemma].transliteration;
		if (lemmaData[lemma].meaning !== '' && lemmaData[lemma].meaning !== null)
			lemmaString = lemmaString + `\n(${firstMeaning(lemmaData[lemma].meaning)})`;
	}
	nodes.add({id: 1, label: lemmaString, color: {background: 'lightgreen'},
		font: {face: centralNodeFont}});

	let radius = 10;

	for (const clfKey in clfDict) {
		if (!clfDict.hasOwnProperty(clfKey))
			continue;

		const count      = clfDict[clfKey],
			boundCounter = idCounter;

		// The second case checks that the glyph is already a hieroglyph
		if (projectType !== 'hieroglyphic' || clfKey.codePointAt(0) >= 256) {
			// Don't need to download stuff
			nodes.add({id: boundCounter, label: clfKey, color: '#b0c0ff', size: radius});
		} else {
			try {
				const response = await fetch(
					'https://www.iclassifier.pw/api/jseshrender/?height=100&centered=true&mdc=' + clfKey
				);
				if (!response.ok) {
					// Failed to visualise MdC
					console.log(`Failed to visualise MDC for ${clfKey}`);
					nodes.add({
						id: boundCounter,
						label: clfKey,
						color: '#b0c0ff',
						size: radius
					});
				} else {
					const base64 = await response.text();
					nodes.add({
						id: boundCounter,
						shape: 'image',
						image: 'data:image/png;base64,' + base64,
						size: radius,
						shapeProperties: {
							useBorderWithImage: true,
							interpolation: true
						},
						color: '#b0c0ff',
					});
				}
			} catch (err) {
				console.log(`Failed to visualise MDC for ${clfKey}`);
				nodes.add({
					id: boundCounter,
					label: clfKey,
					color: '#b0c0ff',
					size: radius
				});
			}
		}
		edges.add({
			from: 1,
			to: boundCounter,
			width: count,
			length: 5.0 / count,
			color: '#b0c0ff'
		});
		idCounter++;
	}
}

/**
 * Groups compound parts by the ids of their enclosing compounds.
 */
function preprocessCompoundParts(tokenIDArr) {
	let result = [];
	for (const tokenID of tokenIDArr) {
		const compoundID = tokenData[tokenID].compound_id;
		result.push([compoundID, tokenID]);
	}
	// We don't care about the particular ordering as long as
	// the same id's go together.
	result.sort();
	return result;
}

const colours = [
	'red',
	'green',
	'blue',
	'brown',
	'goldenrod',
	'cyan',
	'magenta',
	'beige',
	'white',
	'orange'
];

function colourClassifiers(mdc_w_markup) {
	if (mdc_w_markup === null)
		return '';

	let colourIndex = 0,
		buffer = [],
		insideClf = false;
	for (let i = 0; i < mdc_w_markup.length; i++) {
		if (mdc_w_markup.charAt(i) === '~') {
			if (!insideClf) {
				insideClf = true;
				buffer.push(`<span style="color: ${colours[colourIndex++]}">`);
			} else {
				insideClf = false;
				buffer.push('</span>');
			}
		} else
			buffer.push(mdc_w_markup.charAt(i));
	}
	return buffer.join('');
}

function showCompoundPartWithClfs(idTuple) {
	const [compoundID, partID] = idTuple,
		partWithClfs = showTokenWithClfs(partID),
		compoundMDC = tokenData[compoundID].mdc,
		compoundMDCWMarkup = tokenData[compoundID].mdc_w_markup;
	let compoundSpan;
	if (compoundMDCWMarkup === null || compoundMDCWMarkup === '')
		compoundSpan = compoundMDC;
	else
		compoundSpan = colourClassifiers(compoundMDCWMarkup);
	return `Compound: ${compoundSpan} (${compoundID}). Token: ${partWithClfs} (${partID})`;
}