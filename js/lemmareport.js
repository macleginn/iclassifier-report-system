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
							getLemmaReport(parseInt(e.target.value));
							lemmaReport.currentLemma = e.target.value;
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

				m(lemmaMap, {lemma: lemmaReport.currentLemma}),
				m(lemmaStats, {lemma: lemmaReport.currentLemma})
			]);
	}
}

let lemmaMap = {
	onupdate: vnode => {
		if (vnode.attrs.lemma !== '---')
			drawLemmaGraph(vnode.attrs.lemma);
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
			result.push(key);
	return result;
}

/**
 * Extracts classifiers from the token and shows hieroglyphs
 * in a larger font compared to the Latin text.
 */
function showTokenWithClfs(tokenId) {
	let mdc    = tokenData[tokenId].mdc,
		clfArr = extractClfsFromString(tokenData[tokenId].mdc_w_markup);
	if (projectType === 'hieroglyphic')
		clfArr = clfArr.map(
			mdc => 
			`<span class="hieroglyphic" style="font-size: 16pt">${mdc2glyph(mdc)}</span>`
		);
	if (clfArr.length > 0)
		return `${mdc} (${clfArr.join(', ')})`;
	else
		return mdc;
}

function getLemmaReport(lemma) {
	clfDict = {};
	comDict = {};
	scrDict = {};

	for (const key in tokenData) {
		if (tokenData.hasOwnProperty(key) && tokenData[key].lemma_id === lemma) {
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

function drawLemmaClfGraph(lemma) {
	console.log('drawLemmaGraph stub');
	return lemma;
}
			
