import type { Music } from './types'

export const music: Music = {
  headlineKey: 'data.music.headline',
  introKey: 'data.music.intro',
  tracks: [
    {
      id: 'escape',
      nameKey: 'data.music.tracks.escape.name',
      typeKey: 'data.music.tracks.escape.type',
      descKey: 'data.music.tracks.escape.desc',
    },
    {
      id: 'javaInstrument',
      nameKey: 'data.music.tracks.javaInstrument.name',
      typeKey: 'data.music.tracks.javaInstrument.type',
      descKey: 'data.music.tracks.javaInstrument.desc',
    },
  ],
  toolKeys: ['data.music.skills.kontakt', 'data.music.skills.midi', 'data.music.skills.spectrum'],
  skillKeys: [
    'data.music.skills.drums',
    'data.music.skills.guitar',
    'data.music.skills.theory',
    'data.music.skills.kontakt',
    'data.music.skills.midi',
    'data.music.skills.spectrum',
  ],
  launchpadNotes: [
    { note: 'C4', color: '#00D9FF' },
    { note: 'D4', color: '#FF9F43' },
    { note: 'E4', color: '#A55EEA' },
    { note: 'F4', color: '#A855F7' },
    { note: 'G4', color: '#FF6B9D' },
    { note: 'A4', color: '#4ECDC4' },
    { note: 'B4', color: '#00D9FF' },
    { note: 'C5', color: '#FF006E' },
  ],
}
