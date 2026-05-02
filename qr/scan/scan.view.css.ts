namespace $ {

	$mol_style_define($bog_call_qr_scan, {
		display: 'flex',
		flex: { direction: 'column' },
		align: { items: 'center' },
		gap: $mol_gap.block,
		Video: {
			width: '90vmin',
			maxWidth: '480px',
			height: '90vmin',
			maxHeight: '480px',
			border: { radius: $mol_gap.round },
			background: { color: '#000000' },
			objectFit: 'cover',
		},
		Hint: {
			color: $mol_theme.shade,
			font: { size: '0.9rem' },
			textAlign: 'center',
		},
	})

}
