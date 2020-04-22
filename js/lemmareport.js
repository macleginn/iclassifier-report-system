let lemmaReport = {
	view: () => {
		return m(
			'div',
			{style: {display: showLemmaReports ? 'block' : 'none'}},
			'Lemma report');
	}
}
