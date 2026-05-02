namespace $.$$ {

	type BarcodeDetectorLike = {
		detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
	}

	export class $bog_call_qr_scan extends $.$bog_call_qr_scan {

		_loop: number | null = null
		_canvas: HTMLCanvasElement | null = null
		_last_frame: string = ''
		_last_at: number = 0

		on_decode(text?: string): null {
			return null
		}

		@$mol_mem
		stream() {
			const promise = navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false,
			})
			const stream = $mol_wire_sync(promise as any) as unknown as MediaStream
			return Object.assign(stream, {
				destructor: () => stream.getTracks().forEach(t => t.stop()),
			})
		}

		@$mol_mem
		detector(): BarcodeDetectorLike | null {
			const ctor = (window as any).BarcodeDetector
			if (!ctor) return null
			try {
				return new ctor({ formats: ['qr_code'] }) as BarcodeDetectorLike
			} catch {
				return null
			}
		}

		@$mol_mem
		jsqr() {
			if (this.detector()) return null
			const lib = require('jsqr') as { default?: any } | any
			return (lib.default ?? lib) as (
				data: Uint8ClampedArray,
				width: number,
				height: number,
			) => null | { data: string }
		}

		Video(): $mol_view {
			const v = super.Video() as $mol_view
			this._ensure_loop(v.dom_node() as HTMLVideoElement)
			return v
		}

		_ensure_loop(video: HTMLVideoElement) {
			if (this._loop !== null) return
			const tick = async () => {
				if (!this.scanning() || !video.isConnected) {
					this._loop = null
					return
				}
				if (video.videoWidth > 0) {
					try {
						const text = await this._scan_once(video)
						if (text) this._on_decoded(text)
					} catch {
						/* ignore frame errors */
					}
				}
				this._loop = window.setTimeout(tick, 120)
			}
			this._loop = window.setTimeout(tick, 120)
		}

		async _scan_once(video: HTMLVideoElement): Promise<string | null> {
			const det = this.detector()
			if (det) {
				const codes = await det.detect(video)
				return codes[0]?.rawValue ?? null
			}
			const jsqr = this.jsqr()
			if (!jsqr) return null
			if (!this._canvas) this._canvas = document.createElement('canvas')
			const c = this._canvas
			c.width = video.videoWidth
			c.height = video.videoHeight
			const ctx = c.getContext('2d', { willReadFrequently: true })
			if (!ctx) return null
			ctx.drawImage(video, 0, 0, c.width, c.height)
			const img = ctx.getImageData(0, 0, c.width, c.height)
			const code = jsqr(img.data, img.width, img.height)
			return code?.data ?? null
		}

		_on_decoded(text: string) {
			const now = Date.now()
			if (text === this._last_frame && now - this._last_at < 600) return
			this._last_frame = text
			this._last_at = now
			$mol_wire_async(this).on_decode(text)
		}

		destructor() {
			if (this._loop !== null) {
				clearTimeout(this._loop)
				this._loop = null
			}
			super.destructor()
		}

	}

}
