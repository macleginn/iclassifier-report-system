let network, useUnicode = true;

let map = {
	view: () => {
		return m(
			'div',
			{style: {display: showMap ? 'block' : 'none'}},
			[
				m('div', {style: {display: 'grid', 'grid-template-columns': '1fr 1fr'}}, [
					m('div', {style: {'grid-column': '1/2'}}, [
						m('div', {style: {display: 'inline-block', 'vertical-align': 'top'}}, 'Select classifier levels to be included in the map:'),
						m('div', {style: { display: 'inline-block', 'margin-left': '10px' }}, [
							m('input[type=checkbox]', {id: 'include-lexical', checked: true}),
							m('label', {for: 'include-lexical'}, 'Lexical'), m('br'),
							m('input[type=checkbox]', {id: 'include-pragmatic', checked: true}),
							m('label', {for: 'include-pragmatic'}, 'Pragmatic'), m('br'),
							m('input[type=checkbox]', {id: 'include-derivational', checked: true}),
							m('label', {for: 'include-derivational'}, 'Derivational'), m('br'),
							m('input[type=checkbox]', {id: 'include-metatextual', checked: true}),
							m('label', {for: 'include-metatextual'}, 'Metatextual'), m('br'),
							m('input[type=checkbox]', {id: 'include-phonetic', checked: true}),
							m('label', {for: 'include-phonetic'}, 'Phonetic (incl. false etymology)'),
						])
					]),
					m('div', {style: {'grid-column': '2/3'}}, [
						m('div', {style: {display: 'inline-block', 'vertical-align': 'top'}}, 'Select classifier types to be included in the map:'),
						m('div', {style: { display: 'inline-block', 'margin-left': '10px' }}, [
							m('input[type=checkbox]', {id: 'include-taxonomic', checked: true}),
							m('label', {for: 'include-taxonomic'}, 'Taxonomic'), m('br'),
							m('input[type=checkbox]', {id: 'include-taxonomic_repeater', checked: true}),
							m('label', {for: 'include-taxonomic_repeater'}, 'Taxonomic repeater'), m('br'),
							m('input[type=checkbox]', {id: 'include-taxonomic_metaphoric', checked: true}),
							m('label', {for: 'include-taxonomic_metaphoric'}, 'Taxonomic metaphoric'), m('br'),
							m('input[type=checkbox]', {id: 'include-schematic', checked: true}),
							m('label', {for: 'include-schematic'}, 'Schematic'), m('br'),
							m('input[type=checkbox]', {id: 'include-unclear', checked: true}),
							m('label', {for: 'include-unclear'}, 'Unclear'),
						])
					]),
					m('div', {style: {'margin-top': '5px'}}, [
						m('input[type=button]', {value: 'Draw w/selected', onclick: e => { e.redraw = false; drawMapByLevelAndType(); } }),
						m('input[type=button]', {value: 'Draw w/unanalysed', onclick: e => { e.redraw = false; drawMapAll(); }}),
						m('div', {
								style: {
									display: projectType === 'hieroglyphic' ? 'inline-block' : 'none'
								}
							},
							[
								m('input[type=checkbox]', {
									id: 'use-unicode-checkbox',
									checked: useUnicode,
									onclick: e => { 
										e.redraw = false;
										useUnicode = !useUnicode; 
									}
								}),
								m('label', { for: 'use-unicode-checkbox' }, 
									'Use Unicode glyphs for hieroglyphs when available')
							]
						)
					])
				]),

				m('div', {id: 'clf-map', style:
						{
							width: 'calc(100vw-50px)',
							height: '600px',
							border: '1px dotted darkgrey',
							'margin-top': '15px',
							'margin-bottom': '5px',
							'background-color': 'white'
					}}),
				m('input[type=button]', {
					value: 'Switch background colour',
					onclick: e => {e.redraw=false; toggleBgrCol('clf-map');}}),
				m('input[type=button]', {
					style: {'margin-left': '5px'},
					value: 'Go fullscreen',
					onclick: e => {e.redraw=false; goFullScreen('clf-map');}}),
				m('input[type=button]', {
					style: {'margin-left': '5px'},
					value: 'Freeze the network',
					onclick: () => { network.setOptions({physics: false}); }})
			]);
	}
}

/**
 * This function draws the classifier map based on classifiers
 * found in tokens' transliteration/MDC fields. It does not allow for
 * filtering of classifier types.
 */
function drawMapAll() {

	let clfNodeDict = {},
		lemNodeDict = {},
		lemEdgeDict = {},
		clfEdgeDict = {};

	for (const key in tokenData) {
		if (!tokenData.hasOwnProperty(key)) { continue; }
		const tokenInfo = tokenData[key];
		let clfs = extractClfsFromString(tokenInfo['mdc_w_markup']),
			lemmaID = tokenInfo['lemma_id'];
		// We do not include lemmas without clfs:
		// too many data-points
		if (clfs.length < 1)
			continue;
		if (clfs.length === 1) {
			const edgeKey = `${clfs[0]}>${lemmaID}`;
			lemEdgeDict[edgeKey] = get(lemEdgeDict, edgeKey, 0) + 1;
		} else {
			clfs.sort(compareClfMDC); // A canonical order of clfs needed
									  // to create edges in the graph
			for (let i = 0; i < clfs.length-1; i++) {
				const edgeKey1 = `${clfs[i]}>${lemmaID}`;
				lemEdgeDict[edgeKey1] = get(lemEdgeDict, edgeKey1, 0) + 1;
				for (let j = i+1; j < clfs.length; j++) {
					let edgeKey2 = `${clfs[i]}>${clfs[j]}`;
					clfEdgeDict[edgeKey2] = get(clfEdgeDict, edgeKey2, 0) + 1;
				}
			}
		}
	}

	drawMapFromDicts(clfNodeDict,lemNodeDict,lemEdgeDict,clfEdgeDict);
}

/**
 * This function redraws the classifier map only showing classifiers
 * belonging to a particular set of levels. Unlike drawMapAll,
 * it doesn't extract classifiers from tokens: it takes the data from
 * the clf_parses table, so unanalysed classifiers will not be displayed.
 */
function drawMapByLevelAndType() {
	let clfNodeDict = {},
		lemNodeDict = {},
		lemEdgeDict = {},
		clfEdgeDict = {},
		clfCombsDict = {}; // To keep track of which clfs appear together

	let clfLevels = new Set();
	if (byID('include-lexical').checked)
		clfLevels.add(1);
	if (byID('include-pragmatic').checked)
		clfLevels.add(2);
	if (byID('include-derivational').checked)
		clfLevels.add(3);
	if (byID('include-metatextual').checked)
		clfLevels.add(4);
	if (byID('include-phonetic').checked)
		clfLevels.add(5);

	let clfTypes = new Set();
	if (byID('include-taxonomic').checked)
		clfTypes.add('taxonomic');
	if (byID('include-taxonomic_repeater').checked)
		clfTypes.add('taxonomic_repeater');
	if (byID('include-taxonomic_metaphoric').checked)
		clfTypes.add('taxonomic_metaphoric');
	if (byID('include-schematic').checked)
		clfTypes.add('schematic');
	if (byID('include-unclear').checked)
		clfTypes.add('unclear');

	// Iterate over clf_parses; extract clfs that have valid tokens
	// and are of the appropriate type. Connect classifiers with lemmas.
	for (const clfId in clfData) {
		if (!clfData.hasOwnProperty(clfId))
			continue;

		// Filtering
		const clf = clfData[clfId];
		if (!clfLevels.has(clf.clf_level))
			continue;
		// There may be several types.
		if (clf.clf_type === null)
			continue;
		let typeRequested = false;
		const typeArr = clf.clf_type.split(';');
		for (let clfType of typeArr)
			if (clfTypes.has(clfType.trim())) {
				typeRequested = true;
				break;
			}
		if (!typeRequested)
			continue;

		const tokenId = clf.token_id;
		if (tokenData[tokenId] === undefined)
			continue;
		const lemmaId = tokenData[tokenId].lemma_id;
		if (lemmaData[lemmaId] === undefined)
			continue;
		// We seem to have all the data we need; can add stuff to the
		// network.
		if (clfCombsDict.hasOwnProperty(tokenId))
			clfCombsDict[tokenId].push(clf.gardiner_number);
		else
			clfCombsDict[tokenId] = [clf.gardiner_number];

		const edgeKey = `${clf.gardiner_number}>${lemmaId}`;
		if (lemEdgeDict.hasOwnProperty(edgeKey))
			lemEdgeDict[edgeKey]++;
		else
			lemEdgeDict[edgeKey] = 1;
	}

	// Now we can add clf-to-clf edges
	for (const tokenId in clfCombsDict) {
		if (!clfCombsDict.hasOwnProperty(tokenId))
			continue;

		const clfArr = clfCombsDict[tokenId];
		if (clfArr.length === 1)
			continue;
		// Each classifier is connected to all subsequent ones
		for (let i = 0; i < clfArr.length-1; i++)
			for (let j = i+1; j < clfArr.length; j++) {
				const edgeKey = `${clfArr[i]}>${clfArr[j]}`;
				if (clfEdgeDict.hasOwnProperty(edgeKey))
					clfEdgeDict[edgeKey]++;
				else
					clfEdgeDict[edgeKey]=1;
			}
	}

	drawMapFromDicts(clfNodeDict,lemNodeDict,lemEdgeDict,clfEdgeDict);
}

function compareClfMDC(a, b) {
	// Separate alpha and numeric
	let isNumber = c => '0123456789'.indexOf(c) >= 0;
	let alphaA = '',
		alphaB = '',
		numericA = '',
		numericB = '',
		restA = '',
		restB = '';
	let stage = 1;
	for (let i = 0; i < a.length; i++) {
		const c = a.charAt(i);
		if (isNumber(c) && stage === 1) {
			stage = 2;
			numericA += c;
		} else if (isNumber(c)) {
			numericA += c;
		} else if (stage === 1) {
			alphaA += c;
		} else {
			restA += c;
		}
	}
	stage = 1;
	for (let i = 0; i < b.length; i++) {
		const c = b.charAt(i);
		if (isNumber(c) && stage === 1) {
			stage = 2;
			numericB += c;
		} else if (isNumber(c)) {
			numericB += c;
		} else if (stage === 1) {
			alphaB += c;
		} else {
			restB += c;
		}
	}
	if (numericA === '')
		numericA = 0;
	else
		numericA = parseInt(numericA);
	if (numericB === '')
		numericB = 0;
	else
		numericB = parseInt(numericB);
	if (alphaA.localeCompare(alphaB) !== 0) {
		return alphaA.localeCompare(alphaB)
	} else if (numericA !== numericB) {
		return numericA - numericB
	} else {
		return restA.localeCompare(restB);
	}
}

/**
 * A work-horse function for drawMapAll and drawMapByTypes
 */
async function drawMapFromDicts(
	clfNodeDict,
	lemNodeDict,
	lemEdgeDict,
	clfEdgeDict
) {
	let nodes = new vis.DataSet(),
		edges = new vis.DataSet(),
		graphData = {
			nodes: nodes,
			edges: edges
		},
		options = {
			layout: {
				improvedLayout: false
			},
		},
		container = document.getElementById('clf-map');

	// These should be different for cuneiform/hieroglyphs
	// vs. transliteration.
	let lemmaFont = 'sans-serif',
		clfFont = 'sanf-serif';
	if (projectType === 'cuneiform') {
		clfFont = '"cuneiform", sans-serif';
	} else if (projectType === 'hieroglyphic') {
		clfFont = '"hierofont", sans-serif';
		lemmaFont = '"Roboto", sans-serif';
	} else if (projectType === 'chinese') {
		clfFont = '"Noto Sans TC", sans-serif';
		lemmaFont = '"Noto Sans TC", sans-serif';
	}
	network = new vis.Network(container, graphData, options);

	for (const key in clfEdgeDict) {
		if (clfEdgeDict.hasOwnProperty(key)) {
			const head = key.split('>')[0];
			clfNodeDict[head] = get(clfNodeDict, head, 0) + 1;
		}
	}

	for (const key in lemEdgeDict) {
		if (!lemEdgeDict.hasOwnProperty(key)) { continue; }
		const [head, tail] = key.split('>');
		clfNodeDict[head] = get(clfNodeDict, head, 0) + 1;
		lemNodeDict[tail] = get(lemNodeDict, tail, 0) + 1;
	}

	const radius = 20;

	for (const key in clfNodeDict) {
		if (!clfNodeDict.hasOwnProperty(key)) { continue; }
		const clfGlyph = mdc2glyph(key);
		if (projectType !== 'hieroglyphic' || 
			(clfGlyph !== key && useUnicode)) {
			// Don't need to download stuff
			nodes.add({
				id: key,
				label: clfGlyph,
				color: 'beige',
				size: radius,
				font: {
					face: clfFont
				}
			});
			continue;
		}
		try {
			const response = await fetch('https://www.iclassifier.pw/api/jseshrender/?height=50&centered=true&mdc=' + key);
			if (!response.ok) {
				const error = await response.text();
				console.log(`Failed to download a Jsesh picture: ${error}`);
				nodes.add({
					id: key,
					label: clfGlyph,
					color: 'beige',
					size: radius
				});
				continue;
			}
			const data = await response.text();
			nodes.add({
				id: key,
				shape: 'image',
				image: 'data:image/png;base64,' + data,
				size: radius,
				shapeProperties: {
					useBorderWithImage: true,
					interpolation: true
				},
				font: {
					size: 100
				},
				color: 'beige',
			});
		} catch (error) {
			console.log(error);
			nodes.add({
				id: key,
				label: clfGlyph,
				color: 'beige',
				size: radius
			});
		}
	}

	for (const key in lemNodeDict) {
		if (!lemNodeDict.hasOwnProperty(key)) { continue; }
		// console.log(key);
		nodes.add({
			id: key,
			label: lemmaData.hasOwnProperty(key) ? lemmaData[key]['transliteration'] : 'NA',
			color: {
				background: 'white',
				border: 'black'
			},
			borderWidth: 1,
			shape: 'circle',
			font: {
				face: lemmaFont
			}
		});
	}

	for (const key in lemEdgeDict) {
		if (!lemEdgeDict.hasOwnProperty(key)) { continue; }
		let [head, tail] = key.split('>');
		edges.add({
			from: head,
			to: tail,
			width: lemEdgeDict[key],
			color: {
				color: 'blue'
			}
		});
	}

	for (const key in clfEdgeDict) {
		if (!clfEdgeDict.hasOwnProperty(key)) { continue; }
		let [head, tail] = key.split('>');
		edges.add({
			from: head,
			to: tail,
			width: clfEdgeDict[key],
			color: {
				color: 'brown'
			}
		});
	}

	// console.log('before physics');
	// network.setOptions( { physics: true } );
	// console.log('after physics');

	setTimeout(() => { network.fit(); }, 5000);
	setTimeout(() => { network.fit(); }, 8000);
	setTimeout(() => { network.fit(); }, 10000);
}