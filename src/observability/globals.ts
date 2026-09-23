import { RingBuffer } from './ringBuffer'
import { Tracer } from './tracer'
import { LogStore } from './persistence'

export const ringBuffer = new RingBuffer()
export const tracer = new Tracer(ringBuffer)
export const logStore = new LogStore()
