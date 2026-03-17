import { useState, useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { updateTask } from '../api/tasks'
import { parseNotes, serializeNotes } from '../lib/task-metadata'

type Phase = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK'

const PHASE_LABELS: Record<Phase, string> = {
  WORK: 'Focus',
  SHORT_BREAK: 'Short Break',
  LONG_BREAK: 'Long Break',
}

const RING_COLORS: Record<Phase, string> = {
  WORK: '#6366f1',       // indigo-500
  SHORT_BREAK: '#22c55e', // green-500
  LONG_BREAK: '#3b82f6',  // blue-500
}

const BG_COLORS: Record<Phase, string> = {
  WORK: 'bg-indigo-50',
  SHORT_BREAK: 'bg-green-50',
  LONG_BREAK: 'bg-blue-50',
}

const LABEL_COLORS: Record<Phase, string> = {
  WORK: 'text-indigo-600',
  SHORT_BREAK: 'text-green-600',
  LONG_BREAK: 'text-blue-600',
}

const LS_WORK = 'pomodoro-work'
const LS_SHORT = 'pomodoro-short-break'
const LS_LONG = 'pomodoro-long-break'

interface Durations {
  work: number
  shortBreak: number
  longBreak: number
}

function loadDurations(): Durations {
  return {
    work: parseInt(localStorage.getItem(LS_WORK) ?? '25'),
    shortBreak: parseInt(localStorage.getItem(LS_SHORT) ?? '5'),
    longBreak: parseInt(localStorage.getItem(LS_LONG) ?? '15'),
  }
}

function saveDurations(d: Durations) {
  localStorage.setItem(LS_WORK, String(d.work))
  localStorage.setItem(LS_SHORT, String(d.shortBreak))
  localStorage.setItem(LS_LONG, String(d.longBreak))
}

function getPhaseDuration(phase: Phase, durations: Durations): number {
  if (phase === 'WORK') return durations.work * 60
  if (phase === 'SHORT_BREAK') return durations.shortBreak * 60
  return durations.longBreak * 60
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function PomodoroPage() {
  const [durations, setDurations] = useState<Durations>(loadDurations)
  const [phase, setPhase] = useState<Phase>('WORK')
  const [timeLeft, setTimeLeft] = useState(() => loadDurations().work * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedWork, setCompletedWork] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<Durations>(loadDurations)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentFocusTask = useAppStore((s) => s.currentFocusTask)
  const setCurrentFocusTask = useAppStore((s) => s.setCurrentFocusTask)
  const focusTaskData = useAppStore((s) =>
    s.currentFocusTask
      ? (s.tasks[s.currentFocusTask.listId] ?? []).find((t) => t.id === s.currentFocusTask!.taskId)
      : null
  )

  const totalTime = getPhaseDuration(phase, durations)
  const progress = totalTime > 0 ? 1 - timeLeft / totalTime : 1
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  // Tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  // Phase transition when time runs out
  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return
    setIsRunning(false)

    let nextPhase: Phase
    let nextWork = completedWork
    if (phase === 'WORK') {
      nextWork = completedWork + 1
      setCompletedWork(nextWork)
      nextPhase = nextWork % 4 === 0 ? 'LONG_BREAK' : 'SHORT_BREAK'
      incrementFocusTaskPomos()
      fireNotification('Pomodoro complete! 🍅', 'Time for a break.')
    } else {
      nextPhase = 'WORK'
      fireNotification("Break's over!", 'Time to focus.')
    }

    setPhase(nextPhase)
    setTimeLeft(getPhaseDuration(nextPhase, durations))
    // Auto-start next phase
    setTimeout(() => setIsRunning(true), 500)
  }, [timeLeft, isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update document title while running
  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTime(timeLeft)} — ${PHASE_LABELS[phase]}`
    } else {
      document.title = 'Artha'
    }
    return () => { document.title = 'Artha' }
  }, [timeLeft, isRunning, phase])

  // Request notification permission
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function fireNotification(title: string, body?: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    }
  }

  // Increment completedPomos on focus task after a WORK session
  async function incrementFocusTaskPomos() {
    const focusTask = useAppStore.getState().currentFocusTask
    if (!focusTask) return
    const storeTasks = useAppStore.getState().tasks[focusTask.listId] ?? []
    const task = storeTasks.find((t) => t.id === focusTask.taskId)
    if (!task) return

    const { userNotes, metadata } = parseNotes(task.notes ?? '')
    const newMetadata = { ...metadata, completedPomos: metadata.completedPomos + 1 }
    const newNotes = serializeNotes(userNotes, newMetadata)

    useAppStore.getState().setTasks(focusTask.listId,
      storeTasks.map((t) => t.id === focusTask.taskId ? { ...t, notes: newNotes, metadata: newMetadata } : t)
    )
    try {
      await updateTask(focusTask.listId, focusTask.taskId, { notes: newNotes })
    } catch {
      useAppStore.getState().setTasks(focusTask.listId, storeTasks)
    }
  }

  function handleStart() {
    requestNotificationPermission()
    setIsRunning(true)
  }
  function handlePause() { setIsRunning(false) }
  function handleReset() {
    setIsRunning(false)
    setTimeLeft(getPhaseDuration(phase, durations))
  }

  function handleSaveSettings() {
    const clamped: Durations = {
      work: Math.max(1, Math.min(99, settingsDraft.work)),
      shortBreak: Math.max(1, Math.min(99, settingsDraft.shortBreak)),
      longBreak: Math.max(1, Math.min(99, settingsDraft.longBreak)),
    }
    setDurations(clamped)
    saveDurations(clamped)
    setShowSettings(false)
    // Reset timer to new duration if not running
    if (!isRunning) {
      setTimeLeft(getPhaseDuration(phase, clamped))
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="pomodoro-page">
      <div className="max-w-md mx-auto w-full px-4 py-8 flex flex-col items-center gap-6">

        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Pomodoro</h1>
          <button
            onClick={() => { setShowSettings((v) => !v); setSettingsDraft(durations) }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Settings"
            data-testid="settings-button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 shadow-sm" data-testid="settings-panel">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Timer Durations (minutes)</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {(['work', 'shortBreak', 'longBreak'] as const).map((key) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">
                    {key === 'work' ? 'Work' : key === 'shortBreak' ? 'Short Break' : 'Long Break'}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={settingsDraft[key]}
                    onChange={(e) => setSettingsDraft((d) => ({ ...d, [key]: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center outline-none focus:border-indigo-400"
                    data-testid={`duration-${key}`}
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveSettings}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                data-testid="save-settings"
              >
                Save
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Current focus task */}
        {currentFocusTask && (
          <div
            className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm"
            data-testid="focus-task"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Focusing on</p>
              <p className="text-sm font-medium text-gray-800 truncate max-w-[260px]">{currentFocusTask.title}</p>
              {focusTaskData && (
                <p className="text-xs text-gray-400 mt-0.5">
                  🍅 {focusTaskData.metadata.completedPomos}
                  {focusTaskData.metadata.estimatedPomos > 0 && ` / ${focusTaskData.metadata.estimatedPomos}`}
                  {' '}pomodoro{focusTaskData.metadata.completedPomos !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => setCurrentFocusTask(null)}
              className="text-gray-300 hover:text-gray-500 transition-colors ml-2 shrink-0"
              aria-label="Clear focus task"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Phase tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full" data-testid="phase-tabs">
          {(['WORK', 'SHORT_BREAK', 'LONG_BREAK'] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (isRunning) return
                setPhase(p)
                setTimeLeft(getPhaseDuration(p, durations))
              }}
              disabled={isRunning}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                phase === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed'
              }`}
              data-testid={`phase-tab-${p}`}
            >
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>

        {/* SVG Ring Timer */}
        <div className={`relative rounded-full p-4 ${BG_COLORS[phase]} transition-colors`} data-testid="timer-ring">
          <svg width="220" height="220" viewBox="0 0 200 200">
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            {/* Progress ring */}
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke={RING_COLORS[phase]}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
            />
            {/* Time display */}
            <text
              x="100"
              y="96"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="36"
              fontWeight="700"
              fill="#111827"
              fontFamily="ui-monospace, monospace"
              data-testid="time-display"
            >
              {formatTime(timeLeft)}
            </text>
            {/* Phase label */}
            <text
              x="100"
              y="126"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="500"
              fill={RING_COLORS[phase]}
            >
              {PHASE_LABELS[phase]}
            </text>
          </svg>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-2" data-testid="session-dots">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < (completedWork % 4) ? 'bg-indigo-500' : 'bg-gray-200'
              }`}
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">
            {Math.floor(completedWork / 4) > 0 && `${Math.floor(completedWork / 4)} cycle${Math.floor(completedWork / 4) > 1 ? 's' : ''} · `}
            {completedWork} session{completedWork !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3" data-testid="timer-controls">
          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-3 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Reset"
            data-testid="reset-button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Start / Pause */}
          {isRunning ? (
            <button
              onClick={handlePause}
              className={`px-10 py-3 rounded-full text-white font-semibold text-sm transition-colors shadow-md ${
                phase === 'WORK' ? 'bg-indigo-600 hover:bg-indigo-700' :
                phase === 'SHORT_BREAK' ? 'bg-green-600 hover:bg-green-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
              data-testid="pause-button"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleStart}
              className={`px-10 py-3 rounded-full text-white font-semibold text-sm transition-colors shadow-md ${
                phase === 'WORK' ? 'bg-indigo-600 hover:bg-indigo-700' :
                phase === 'SHORT_BREAK' ? 'bg-green-600 hover:bg-green-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
              data-testid="start-button"
            >
              Start
            </button>
          )}

          {/* Skip phase */}
          <button
            onClick={() => {
              setIsRunning(false)
              setTimeLeft(0)
            }}
            className="p-3 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Skip"
            data-testid="skip-button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Phase indicator text */}
        <p className={`text-sm font-medium ${LABEL_COLORS[phase]}`}>
          {phase === 'WORK'
            ? isRunning ? 'Stay focused!' : 'Ready to focus?'
            : isRunning ? 'Take a breather' : 'Break time!'}
        </p>

      </div>
    </div>
  )
}

export default PomodoroPage
