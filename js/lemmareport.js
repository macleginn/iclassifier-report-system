let tokenDisplayType = 'all';  // Other possible values: 'standalone', 'compound-part'

let lemmaReport = {
	currentLemma: '---',
	lemmaArr: [],
	view: () => {
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
				),

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
			'Go full screen')
	])
}

let lemmaStats = {
	view: vnode => {
		if (vnode.attrs.lemma === '---')
			return;
		
		const lemma         = vnode.attrs.lemma,
			transliteration = lemmaData[lemma].transliteration,
			meaning         = lemmaData[lemma].meaning,
		    tokensForLemma  = getTokensForLemma(parseInt(lemma));


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
					tokensForLemma.map(tokenId => m.trust(
						`<li>${showTokenWithClfs(tokenId)}</li>`, 
					))
				)),
			m('h3', 'Classifier statistics for the lemma'),
			m(statsDiv, {data: clfDict, font: '', header: 'Classifier'}),
			m('h3', 'Classifier combinations with this lemma'),
			m(statsDiv, {data: comDict, font: '', header: 'Classifier combination'}),
			m('h3', 'Script statistics'),
			m(statsDiv, {data: scrDict, font: 'default', header: 'Script'}),
		])
	}
}	

function getTokensForLemma(lemma) {
	let result = [];
	for (const key in tokenData)
		if (tokenData.hasOwnProperty(key) && tokenData[key].lemma_id === lemma)
			if (tokenDisplayType === 'all')
				result.push(key);
			else if (tokenDisplayType === 'standalone' && !compoundParts.has(key))
				result.push(key);
			else if (tokenDisplayType === 'compound-part' && compoundParts.has(key))
				result.push(key);
	return result;
}

/**
 * Extracts classifiers from the token and shows hieroglyphs
 * in a larger font compared to the Latin text together with
 * witness name and coordinates when those are available.
 */
function showTokenWithClfs(tokenId) {
	let mdc    = tokenData[tokenId].mdc,
		clfArr = extractClfsFromString(tokenData[tokenId].mdc_w_markup);
	
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
		return `${mdc} (${clfArr.join(', ')})${witnessString}`;
	else
		return mdc + witnessString;
}

function getLemmaReport(lemma) {
	clfDict = {};
	comDict = {};
	scrDict = {};

	for (const key in tokenData) {
		if (tokenData.hasOwnProperty(key) && tokenData[key].lemma_id === lemma) {
			if (tokenDisplayType === 'compound-part' && !compoundParts.has(key)) {
				continue;
			} else if (tokenDisplayType === 'standalone' && compoundParts.has(key)) {
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
			lemmaString = lemmaString + `\n(${lemmaData[lemma].meaning})`;
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
			
