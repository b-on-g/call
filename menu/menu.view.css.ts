namespace $ {

	$mol_style_define($bog_call_menu, {
		display: 'flex',
		flex: { direction: 'column' },
		gap: $mol_gap.block,
		padding: $mol_gap.block,
		maxWidth: '32rem',
		margin: { left: 'auto', right: 'auto' },
		Title: {
			font: { size: '1.5rem', weight: 'bold' },
			textAlign: 'center',
		},
		Lead: {
			color: $mol_theme.shade,
			textAlign: 'center',
		},
		Form: {
			display: 'flex',
			flex: { direction: 'column' },
		},
		Buttons: {
			display: 'flex',
			flex: { direction: 'column' },
			gap: $mol_gap.space,
		},
		Hint: {
			color: $mol_theme.shade,
			textAlign: 'center',
			font: { size: '0.85rem' },
		},
	})

}
