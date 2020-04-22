let clfReport = {
	currentClf: '---',
	view: () => {
		return m(
			'div',
			{style: {display: showClfReports ? 'block' : 'none'}},
			[
				m('h4', 'Select a classifier:'),
				m(
					'select',
					{
						style: {
							width: '150px',
							'font-size': '16pt',
							height: '50px'
						},
						onchange: e => {
							clfReport.currentClf = e.target.value;
							console.log(e.target.value);
						},
						value: clfReport.currentClf
					},
					[m('option', {disabled: true, value: '---'}, '---')]
						.concat(clfArr.map(clf => m('option', clf)))
				)
			]);
	}
}
