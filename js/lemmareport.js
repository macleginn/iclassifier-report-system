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
						style: {width: '200px'},
						onchange: e => {
							getLemmaReport(e.target.value);
							lemmaReport.currentLemma = e.target.value;
						},
						value: lemmaReport.currentLemma
					},
					[m('option', {disabled: true, value: '---'}, '---')]
						.concat(lemmaReport.lemmaArr.map(lemmaTuple => m(
							'option', 
							{value: lemmaTuple[0]},
							`${
								lemmaData[lemmaTuple[0]] === undefined ? 'unknown' :
								lemmaData[lemmaTuple[0]].transliteration
							} (${lemmaTuple[1]})`
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
			meaning         = lemmaData[lemma].meaning;

		return m('div#lemma-tables', [
			m.trust(`<h3>Tokens for lemma <em>${transliteration}</em> (${meaning}):</h3>`),
			m(
				'ul.tokens-list', 
				getTokensForLemma(parseInt(lemma)).map(tokenDesc => m.trust(
					`<li>${tokenDesc}</li>`, 
				))
			),
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
		if (tokenData.hasOwnProperty(key) && tokenData[key].lemma_id === lemma) {
			let mdc = tokenData[key].mdc,
                clfArr = extractClfsFromString(tokenData[key].mdc_w_markup);
            if (projectType === 'hieroglyphic')
                clfArr = clfArr.map(
					mdc => 
					`<span class="hieroglyphic" style="font-size: 16pt">${mdc2glyph(mdc)}</span>`
				);
			if (clfArr.length > 0)
				result.push(`${mdc} (${clfArr.join(', ')})`);
			else
				result.push(mdc);
		}	
	return result;
}

function getLemmaReport(lemma) {
}

function drawLemmaGraph(lemma) {
}
			
