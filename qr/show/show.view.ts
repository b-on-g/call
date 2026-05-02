namespace $.$$ {

	export class $bog_call_qr_show extends $.$bog_call_qr_show {

		_timer: ReturnType<typeof setInterval> | null = null

		@$mol_mem
		frame_index(next?: number): number {
			return next ?? 0
		}

		@$mol_mem
		current_frame() {
			const frames = this.frames()
			if (frames.length === 0) return ''
			const idx = this.frame_index() % frames.length
			this._ensure_timer()
			return frames[idx]
		}

		_ensure_timer() {
			if (this.frames().length <= 1) {
				if (this._timer) {
					clearInterval(this._timer)
					this._timer = null
				}
				return
			}
			if (this._timer) return
			this._timer = setInterval(() => {
				this.frame_index(this.frame_index() + 1)
			}, this.interval())
		}

		@$mol_mem
		status_text() {
			const frames = this.frames()
			if (frames.length <= 1) return ''
			return `${(this.frame_index() % frames.length) + 1} / ${frames.length}`
		}

		destructor() {
			if (this._timer) {
				clearInterval(this._timer)
				this._timer = null
			}
			super.destructor()
		}

	}

}
