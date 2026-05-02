namespace $ {

	export type $bog_call_payload = {
		v: 1
		t: 'offer' | 'answer'
		s: string
		n: string
		d: string
	}

	const FRAME_PREFIX = 'v1|'
	const MAX_PER_FRAME = 1500

	export class $bog_call_codec extends $mol_object2 {

		static encode(payload: $bog_call_payload): string[] {
			const sdp = $bog_call_codec.filter_sdp(payload.s)
			const compact: $bog_call_payload = { ...payload, s: sdp }
			const json = JSON.stringify(compact)
			const pako = require('pako') as typeof import('pako')
			const compressed = pako.deflateRaw(json, { level: 9 })
			const b64 = $bog_call_codec.b64u_encode(compressed)
			const total = Math.max(1, Math.ceil(b64.length / MAX_PER_FRAME))
			const frames: string[] = []
			for (let i = 0; i < total; i++) {
				const chunk = b64.slice(i * MAX_PER_FRAME, (i + 1) * MAX_PER_FRAME)
				frames.push(`${FRAME_PREFIX}${i}/${total}|${chunk}`)
			}
			return frames
		}

		static parse_frame(text: string): { index: number, total: number, chunk: string } | null {
			const match = /^v1\|(\d+)\/(\d+)\|([\s\S]*)$/.exec(text)
			if (!match) return null
			return {
				index: Number(match[1]),
				total: Number(match[2]),
				chunk: match[3],
			}
		}

		static decode(frames: string[]): $bog_call_payload {
			const indexed = new Map<number, string>()
			let total = 0
			for (const text of frames) {
				const f = $bog_call_codec.parse_frame(text)
				if (!f) throw new Error('Bad QR frame')
				indexed.set(f.index, f.chunk)
				total = f.total
			}
			if (indexed.size < total) throw new Error('Incomplete frame set')
			let b64 = ''
			for (let i = 0; i < total; i++) {
				const part = indexed.get(i)
				if (part === undefined) throw new Error('Missing fragment ' + i)
				b64 += part
			}
			const bytes = $bog_call_codec.b64u_decode(b64)
			const pako = require('pako') as typeof import('pako')
			const json = pako.inflateRaw(bytes, { to: 'string' })
			const payload = JSON.parse(json) as $bog_call_payload
			if (payload.v !== 1) throw new Error('Unsupported payload version')
			return payload
		}

		static filter_sdp(sdp: string): string {
			const lines = sdp.split(/\r?\n/)
			const out: string[] = []
			for (const line of lines) {
				if (!line) continue
				if (line.startsWith('a=candidate:') && !/typ host/.test(line)) continue
				out.push(line)
			}
			return out.join('\r\n') + '\r\n'
		}

		static b64u_encode(bytes: Uint8Array): string {
			let s = ''
			for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
			const b64 = btoa(s)
			return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
		}

		static b64u_decode(s: string): Uint8Array {
			const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
			const bin = atob(padded)
			const bytes = new Uint8Array(bin.length)
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
			return bytes
		}

	}

}
