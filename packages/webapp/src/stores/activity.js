/**
 * Activity item levels
 *
 * 0 - debug - shows (some) internal state changes
 * 1 - normal - operational messages for the user
 * 2 - urgent - things the user needs to be aware of, but not errors
 * 3 - immediate - information the user needs to know to continue immediately using the system.
**/

function extendLogs(level) {
  return (state, newLog) => {
    if (newLog.overwrite) {
      state.logs = state.logs.map(log => {
        return log.text === newLog.overwrite ? newLog : log
      })
      return
    }
    if (newLog.append) {
      state.logs = state.logs.map(log => {
        return newLog.append.startsWith(log.text) ? {
          ...log,
          text: newLog.append,
        } : log
      })
      return
    }
    state.logs = [...state.logs, {
      level,
      ...(typeof newLog === 'string' ? { text: newLog } : newLog),
    }].slice(-10)
  }
}

export default {
  state: {
    logs: [
      {
        level: 0,
        text: 'Activity store initialized',
      }
    ]
  },
  mutations: {
    logDebug: extendLogs(0),
    logNormal: extendLogs(1),
    logUrgent: extendLogs(2),
    logImmediate: extendLogs(3),
  },
  actions: {
    initDB: ({ commit }) => commit('logDebug', 'Global store initDB'),
    init: ({ commit }) => commit('logDebug', 'Global store init'),
    logDelay: async ({ state, commit }, { delay, level, log }) => {
      await new Promise(r => setTimeout(r, delay))
      extendLogs(level)(state, log)
    },
  },
}
