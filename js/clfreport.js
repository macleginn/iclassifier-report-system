const selectStyle = {
	width: '150px',
	// 'font-size': '16pt',
	// height: '50px'
};

let clfFilterDict = {};

let clfReport = {
	currentClf: '---',
	clfType: 'any',
	clfLevel: 'any',
	onupdate: () => {
		if (clfReport.currentClf !== '---')
			byID('classifier-report-select').value = clfReport.currentClf;
	},
	view: () => {
		if (clfReport.currentClf !== '---')
			window.location.hash = `!${project}/classifiers/${clfReport.currentClf}`;
		return m(
			'div',
			{style: {display: showClfReports ? 'block' : 'none', 'padding-top': '0'}},
			[
				m('h4', 'Select a classifier: '),
				m('br'),
				m(
					'select',
					{
						id: 'classifier-report-select',
						style: selectStyle,
						onchange: e => {
							getClfReport(e.target.value);
							clfReport.currentClf = e.target.value;
						},
						value: clfReport.currentClf
					},
					[m('option', {disabled: true, value: '---'}, '---')]
						.concat(clfArr.map(clf => m(
							'option',
							{value: getClfMDC(clf)},
							clf)))
				),
				m('br'), m('br'),
				m(listMenu, {
					menuName: 'clf-search-menu',
					dataList: clfArr,
					filterDict: clfFilterDict,
					filterFunction: (clf, containerID) => {
						let test = get(clfFilterDict, containerID, '').toLowerCase();
						return clf.toLowerCase().indexOf(test) >= 0;
					},
					divBuilderCallback: clf => {
						let button = document.createElement('div');
						button.innerText = clf;
						button.classList.add('menu-button-value');
						button.onclick = () => {
							byID('clf-search-menu').style.display = 'none';
							getClfReport(getClfMDC(clf));
							clfReport.currentClf = getClfMDC(clf);
							m.redraw();
						}
						return button;
					}
				}),
				m(listMenuButton, { menuName: 'clf-search-menu' }),

				m('br'),
				m('h4', 'Subset by type:'),
				m('br'),
				m(
					'select',
					{
						style: selectStyle,
						onchange: e => {
							getClfReport(e.target.value);
							clfReport.clfType = e.target.value;
							if (clfReport.currentClf !== '---')
								getClfReport(clfReport.currentClf);
						},
						value: clfReport.clfType
					},
					clfTypeArr.map(typeTuple => m(
						'option',
						{value: typeTuple[0]},
						typeTuple[1]))
				),

				m('br'),
				m('h4', 'Subset by level:'),
				m('br'),
				m(
					'select',
					{
						style: selectStyle,
						onchange: e => {
							getClfReport(e.target.value);
							clfReport.clfLevel = e.target.value;
							if (clfReport.currentClf !== '---')
								getClfReport(clfReport.currentClf);
						},
						value: clfReport.clfLevel
					},
					clfLevelArr.map(levelTuple => m(
						'option',
						{value: levelTuple[0]},
						levelTuple[1]))
				),

				// The report components
				m(clfLemmaMap, {clf: clfReport.currentClf}),
				m(clfClfMap, {clf: clfReport.currentClf}),
				m(clfStats)


			]);
	}
}

let clfLemmaMap = {
	onupdate: vnode => {
		if (vnode.attrs.clf !== '---') {
			console.log('Drawing the lemma graph.');
			drawLemmaGraph(vnode.attrs.clf);
		}
	},
	view: () => m('div', [
		m('h3', 'Lemma co-occurrence graph'),
		m('div#canvas1', {style: {
			width: '640px', height: '480px', 'marign-bottom': '5px', 'background-color': 'white'
		}}),
		m('button', {onclick: e => {e.redraw=false; toggleBgrCol('canvas1');}},
			'Switch background color'),
		m('button', {onclick: e => {e.redraw=false; goFullScreen('canvas1');}},
			'Go fullscreen')
	])
}

let clfClfMap = {
	onupdate: vnode => {
		if (vnode.attrs.clf !== '---') {
			console.log('Drawing the clf-clf graph.');
			drawClfGraph(vnode.attrs.clf);
		}
	},
	view: () => m('div', [
		m('h3', 'Classifier co-occurrence graph'),
		m('div#canvas2', {style: {
			width: '640px', height: '480px', 'marign-bottom': '5px', 'background-color': 'white'
		}}),
		m('button', {onclick: e => {e.redraw=false; toggleBgrCol('canvas2')}},
			'Switch background color'),
		m('button', {onclick: e => {e.redraw=false; goFullScreen('canvas2')}},
			'Go fullscreen')
	])
}

let clfStats = {
	view: () => {
		return m('div#clf-tables', [
			m('h3', 'Lemma co-occurrence statistics'),
			m(statsDiv, {data: lemDict, font: 'unicode-egyptian', header: 'Lemma'}),
			m('h3', 'Classifier co-occurrence statistics'),
			m(statsDiv, {data: clfDict, font: '', header: 'Classifier'}),
			m('h3', 'Classifier combinations with this classifier'),
			m(statsDiv, {data: comDict, font: '', header: 'Classifier combination'}),
			m('h3', 'POS co-occurrence statistics'),
			m(statsDiv, {data: posDict, font: 'default', header: 'Part of speech'}),
			m('h3', 'Order statistics'),
			m(statsDiv, {data: ordDict, font: 'default', header: 'Classifier position'}),
			m('h3', 'Script statistics'),
			m(statsDiv, {data: scrDict, font: 'default', header: 'Script'}),
	])
	}
}

function getClfMDC(mdc) {
	// console.log(mdc);
	const parensRegex = /\((.+)\)/;
	if (mdc.match(parensRegex))
		return mdc.match(parensRegex)[1].trim();
	else
		return mdc;
}

function getClfReport(mdc) {
	mdc = getClfMDC(mdc);

	clfDict = {};
	comDict = {};
	lemDict = {};
	lemMean = {};
	posDict = {};
	ordDict = {};
	scrDict = {};

	for (const key in tokenData) {
		if (!tokenData.hasOwnProperty(key))
			continue;

		tokenInfo = tokenData[key];
		const glyph = mdc2glyph(mdc),
			clfs = extractClfsFromString(tokenInfo.mdc_w_markup);

		if (clfs.indexOf(mdc) === -1)
			continue;

		// Get parsed data
		let clfParse = {
			clf_level: null,
			clf_type: null
		};
		for (const clfParseKey in clfData)
			if (
				clfData.hasOwnProperty(clfParseKey) &&
				clfData[clfParseKey].token_id == key &&
				clfData[clfParseKey].gardiner_number === mdc
			) {
				clfParse = JSON.parse(JSON.stringify(clfData[clfParseKey]));
				break;
			}

		// If any subsetting was asked for, only
		// parsed classifiers will be shown.
		if (
			clfReport.clfLevel != 'any' &&
			clfReport.clfLevel != clfParse.clf_level
		)
			continue;

		let types = new Set();
		for (const clfType of String(clfParse.clf_type).split(';'))
			types.add(clfType);
		if (
			clfReport.clfType != 'any' &&
			!types.has(clfReport.clfType)
		)
			continue;

		let glyphs = clfs.map(x => x);
		if (projectType === 'hieroglyphic')
			glyphs = clfs.map(mdc => mdc2glyph(mdc));

		let combination = glyphs.join('+'),
			lemmaID = tokenInfo.lemma_id;

		// Order stats for this classifier
		const position = clfs.indexOf(mdc)+1;
		if (!ordDict.hasOwnProperty(position))
			ordDict[position] = 0;
		ordDict[position]++;

		// Combination stats for this classifier
		if (!comDict.hasOwnProperty(combination))
			comDict[combination] = 0;
		comDict[combination]++;

		// POS co-occurrence stats
		let pos = tokenInfo.pos;
		if (pos !== '' && pos !== null) {
			if (!posDict.hasOwnProperty(pos))
				posDict[pos] = 0;
			posDict[pos]++;
		}

		// Lemma co-occurrence stats
		if (lemmaData[lemmaID] !== undefined) {
			let lemma = lemmaData[lemmaID].transliteration,
				lemmaMeaning = lemmaData[lemmaID].meaning,
				key1;
			if (lemmaMeaning === null || lemmaMeaning.length === 0)
				key1 = lemma;
			else
				key1 = lemma + ' ‘' + lemmaMeaning + '’';
			if (!lemDict.hasOwnProperty(key1))
				lemDict[key1] = 0;
			lemDict[key1]++;
			lemMean[key1] = lemmaData[lemmaID].meaning;
        }

		// Script co-occurrence stats
		const witnessID = tokenInfo.witness_id;
		if (witnessID !== undefined &&
			witnessID !== null      &&
			witnessID !== ''        &&
			witnessData[witnessID] !== undefined) {
			const scriptId = witnessData[witnessID].script,
				  script   = normaliseScript(scriptId);
			if (script !== '' && script !== null) {
				if (!scrDict.hasOwnProperty(script))
					scrDict[script] = 0;
				scrDict[script]++;
			}
		}

        // CLF co-occurrence stats
		for (const value of glyphs) {
			if (value === glyph)
				continue;
			if (!clfDict.hasOwnProperty(value))
				clfDict[value] = 0;
			clfDict[value]++;
		}
    }
	// Done, draw the maps.

}

async function drawLemmaGraph(clf) {
	console.log(clf);
	let idCounter = 2; // Centre nodes have id = 1.
	const mdc = getClfMDC(clf),
		baseGlyph = mdc2glyph(mdc),
		radius = 10;

	console.log(clf, mdc, baseGlyph);

	// --- Lemma graph ---
	let nodes = new vis.DataSet(),
		edges = new vis.DataSet(),
		graphData = {
			nodes: nodes,
			edges: edges
		},
		options = {
			nodes: { size: 40 },
		},
		container = document.getElementById('canvas1');

	let centralNodeFont;
	switch (projectType) {
		case 'cuneiform':
			options.nodes.font = {face: 'cuneiform'};
			centralNodeFont = 'cuneiform';
			break;
		case 'hieroglyphic':
			// Use Roboto for lemmas and hierofont for the classifier.
			options.nodes.font = {face: 'Roboto'};
			centralNodeFont = 'hierofont';
			break;
		case 'chinese':
			options.nodes.font = {face: 'Noto Sans TC'};
			centralNodeFont = 'Noto Sans TC';
			break;
		default:
			break;
	}

	new vis.Network(container, graphData, options);

	// If a Unicode glyph is missing, use a picture for the centre node.
	if (projectType === 'hieroglyphic' && baseGlyph === clf) {
		try {
			const response = await fetch(
				'https://www.iclassifier.pw/api/jseshrender/?height=100&centered=true&mdc=' + mdc
			);
			if (!response.ok)
				nodes.add({id: 1, label: clf, color: {background: 'beige'}});
			else {
				const base64 = await response.text(),
					centreNode = {
						id: 1,
						shape: 'image',
						image: 'data:image/png;base64,' + base64,
						size: radius,
						color: 'beige',
						shapeProperties: {
							useBorderWithImage: true,
							interpolation: true
						}
					};
				nodes.add(centreNode);
			}
		} catch(err) {
			nodes.add({id: 1, label: clf, color: {background: 'beige'},
			font: {face: centralNodeFont}});
		}
	} else
		nodes.add({id: 1, label: baseGlyph, color: {background: 'beige'},
			font: {face: centralNodeFont}});

	// Populate the lemma graph
	for (const lemma in lemDict) {
		if (!lemDict.hasOwnProperty(lemma))
			continue;
		const meaningWords = lemMean[lemma].split(' '),
			shortMeaning = meaningWords.slice(0, 4).join(' ');
		nodes.add({
			id: idCounter,
			label: `${lemma.split(' ')[0]}\n(${shortMeaning})`,
			shape: 'circle',
			color: 'rgba(0, 255, 0, 0.4)'
		});
		edges.add({from: 1, to: idCounter, color: 'gray', width: lemDict[lemma]});
		idCounter++;
	}
}


async function drawClfGraph(clf) {
	console.log('Inside drawClfGraph');

	let idCounter = 2; // Centre nodes have id = 1.

	const mdc = getClfMDC(clf),
		baseGlyph = mdc2glyph(mdc),
		radius = 10;

	let nodes = new vis.DataSet(),
		edges = new vis.DataSet(),
		graphData = {
			nodes: nodes,
			edges: edges
		},
		options = {
			nodes: {
				size: 40,
				shape: 'box',
				shapeProperties: {
					borderRadius: 0
				}
			},
			interaction: {
				hover: true
			}
		},
		container = document.getElementById('canvas2');

	switch (projectType) {
		case 'cuneiform':
			options.nodes.font = {face: 'cuneiform'};
			break;
		case 'hieroglyphic':
			options.nodes.font = {face: 'hierofont'};
			break;
		case 'chinese':
			options.nodes.font = {face: 'Noto Sans TC'};
			break;
		default:
			break;
	}

	new vis.Network(container, graphData, options);

	// If a Unicode glyph is missing, use a picture for the centre node.
	if (projectType === 'hieroglyphic' && baseGlyph === mdc) {
		try {
			const response = await fetch(
				'https://www.iclassifier.pw/api/jseshrender/?height=100&centered=true&mdc=' + mdc
			);
			if (!response.ok)
				nodes.add({id: 1, label: clf, color: {background: 'beige'}});
			else {
				const base64 = await response.text(),
					centreNode = {
						id: 1,
						shape: 'image',
						image: 'data:image/png;base64,' + base64,
						size: radius,
						color: 'beige',
						shapeProperties: {
							useBorderWithImage: true,
							interpolation: true
						}
					};
				nodes.add(centreNode);
			}
		} catch(err) {
			nodes.add({id: 1, label: clf, color: {background: 'beige'}});
		}
	} else
		nodes.add({id: 1, label: baseGlyph, color: 'beige'});

	for (const clfKey in clfDict) {
		if (!clfDict.hasOwnProperty(clfKey))
			continue;

		const count      = clfDict[clfKey],
			boundCounter = idCounter;

		console.log(`${clfKey}: ${clfKey.codePointAt(0)}`);
		// The second case checks that the glyph is already a hieroglyph
		if (projectType !== 'hieroglyphic' || clfKey.codePointAt(0) >= 256) {
			// Don't need to download stuff
			nodes.add({id: boundCounter, label: clfKey, color: '#b0c0ff', size: radius});
			//edges.add({
			//	from: 1,
			//	to: boundCounter,
			//	width: count,
			//	length: 5.0 / count,
			//	color: '#b0c0ff'
			//});
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
