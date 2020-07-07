let map = {
	view: () => {
		return m(
			'div',
			{style: {display: showMap ? 'block' : 'none'}},
			[
				m('span', 'Under construction. See '),
				m('a', {href: 'https://www.iclassifier.pw/ui/'}, 'the alpha version'),
				m('span', '.')
			]);
	}
}
