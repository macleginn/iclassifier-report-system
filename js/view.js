let report = {
	view: () => {
		return m(
			'div#report-main',
			[
				m('div#button-row', [
					m('button', {
						disabled: project === null,
						onclick: toggleClfQueries
					}, 'Show classifier queries'),
					m('button', {
						disabled: project === null,
						onclick: toggleClfReport
					}, 'Show classifier reports'),
					m('button', {
						disabled: project === null,
						onclick: toggleLemmaReport,
						style: {'margin-left': '5px', 'margin-right': '5px'}
					}, 'Show lemma reports'),
					m('button', {
						disabled: project === null,
						onclick: toggleMap
					}, 'Show classifier map')
				]),

				m(
					'div#download', {
						style: {
							display: downloadingData ? 'block' : 'none',
							'margin-top': '5px'
						}
					},
					m('span', 'Fetching data...')
				),

				m(clfQueries),

				m(clfReport),

				m(lemmaReport),

				m(map)
			]
		);
	}
}
