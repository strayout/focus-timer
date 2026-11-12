import { useEffect } from 'react'
import { useTimer } from '@/hooks/useTimer'
import { useQuotes } from '@/hooks/useQuotes'
import { useLocalState } from '@/hooks/useLocalState'
import { PIP_KEY, PIP_SIZE, defaultPipPreferences, isPipPreferences } from '@/hooks/usePipWindow'
import { SETTINGS_KEY, defaultSettings, validSettings } from '@/lib/settings'
import { announceCompletion, playInteraction, prepareAudio } from '@/lib/feedback'
import { phaseOf } from '@/lib/progress'
import { closeCurrentWindow, isDesktop, resizeCurrentWindow, showWindow } from '@/adapters/desktop'
import { MiniTimer } from './MiniTimer'

const initialSettings = defaultSettings()
/** Root of the standalone floating window: a full peer of the main window on the shared stored state. */
export function MiniWindow() {
  const [settings] = useLocalState(SETTINGS_KEY, initialSettings, validSettings)
  const [preferences, setPreferences, storageFailed] = useLocalState(PIP_KEY, defaultPipPreferences, isPipPreferences)
  const timer = useTimer(() => announceCompletion(settings.sound))
  const { state } = timer
  const quotes = useQuotes(state.status === 'running', settings.interval)
  useEffect(() => { document.documentElement.classList.toggle('dark', settings.dark) }, [settings.dark])
  useEffect(() => { document.documentElement.dataset.phase = phaseOf(state.status) }, [state.status])
  useEffect(() => {
    void resizeCurrentWindow(PIP_SIZE.width, preferences.expanded ? PIP_SIZE.expanded : PIP_SIZE.collapsed).catch(() => { /* Content still collapses. */ })
  }, [preferences.expanded])
  function toggle() {
    if (state.status === 'running') { timer.pause(); if (settings.sound) playInteraction('pause'); return }
    prepareAudio()
    timer.start()
    if (settings.sound) playInteraction('start')
  }
  return <MiniTimer durationMs={state.durationMs} remainingMs={timer.remainingMs} status={state.status} quote={quotes.quote}
    expanded={preferences.expanded} locked={preferences.locked} storageFailed={storageFailed || timer.storageFailed}
    toggleExpanded={() => { if (!preferences.locked) setPreferences(p => ({ ...p, expanded: !p.expanded })) }}
    toggleLocked={() => setPreferences(p => ({ ...p, locked: !p.locked }))}
    toggle={toggle} reset={timer.reset} next={quotes.next}
    windowControls={isDesktop ? { openMain: () => void showWindow('main').catch(() => {}), close: () => void closeCurrentWindow().catch(() => {}) } : undefined} />
}
