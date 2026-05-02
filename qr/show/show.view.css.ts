namespace $ {

	$mol_style_define($bog_call_qr_show, {
		display: 'flex',
		flex: { direction: 'column' },
		align: { items: 'center' },
		gap: $mol_gap.block,
		padding: $mol_gap.block,
		Frame: {
			width: '90vmin',
			maxWidth: '480px',
			height: '90vmin',
			maxHeight: '480px',
		},
		Status: {
			color: $mol_theme.shade,
			font: { size: '0.9rem' },
		},
	})

}
