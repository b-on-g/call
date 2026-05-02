namespace $ {

	$mol_style_define($bog_call_host, {
		display: 'flex',
		flex: { direction: 'column' },
		gap: $mol_gap.block,
		padding: $mol_gap.block,
		Header: {
			display: 'flex',
			align: { items: 'center' },
			gap: $mol_gap.space,
		},
		Title: {
			font: { size: '1.25rem', weight: 'bold' },
			flex: { grow: 1 },
		},
		Body: {
			display: 'flex',
			flex: { direction: 'column' },
			align: { items: 'center' },
			gap: $mol_gap.block,
		},
		Step_label: {
			font: { weight: 'bold' },
		},
		Status: {
			color: $mol_theme.shade,
		},
		Error: {
			color: '#d32f2f',
		},
		Manual: {
			display: 'flex',
			flex: { direction: 'column' },
			gap: $mol_gap.space,
			width: '100%',
			maxWidth: '32rem',
		},
	})

}
