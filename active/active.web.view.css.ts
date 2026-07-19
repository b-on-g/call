namespace $ {

	$mol_style_define($bog_call_active, {
		display: 'flex',
		flex: { direction: 'column' },
		align: { items: 'center' },
		gap: $mol_gap.block,
		padding: $mol_gap.block,
		Indicator: {
			font: { size: '2rem' },
			'@': {
				quality: {
					good: { color: '#2e7d32' },
					degraded: { color: '#f9a825' },
					lost: { color: '#c62828' },
				},
			},
		},
		Status: {
			font: { size: '1.25rem', weight: 'bold' },
		},
		Quality: {
			color: $mol_theme.shade,
			textAlign: 'center',
			minHeight: '1.25rem',
		},
	})

}
