import { hashQueryKey, notifyManager, Query, QueryCache } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'wagmi'

import type { GlobalErrorDispatch, GlobalErrorState } from './GlobalErrorProvider'
import { useSyncExternalStore } from './useSyncExternalStore'

const SLOW_THRESHOLD = 5000

const getBadQueries = (queryCache: QueryCache, renderedAt: number) => {
  const queries = queryCache.findAll([], { queryKey: ['graph'] }) // limit to subgraph queries
  const slowQueries: Query[] = []
  const errorQueries: Query[] = []

  queries.forEach((query) => {
    const { dataUpdatedAt } = query.state
    const elapsedTime = Date.now() - Math.max(dataUpdatedAt, renderedAt)

    if (
      elapsedTime > SLOW_THRESHOLD &&
      query.state.status === 'loading' &&
      query.getObserversCount() > 0
    ) {
      slowQueries.push(query)
    } else if (query.state.status === 'error') {
      errorQueries.push(query)
    }
  })

  return `${slowQueries.length}:${errorQueries.length}`
}

const slowQueriesHashKey = hashQueryKey(['slowQueriesKeyPlaceholder'])
const errorQueriesHashKey = hashQueryKey(['errorQueriesKeyPlaceholder'])

export const useHasSubgraphSyncErrors = (
  state: GlobalErrorState,
  dispatch: GlobalErrorDispatch,
) => {
  const { t } = useTranslation('common')

  const queryClient = useQueryClient()
  const queryCache = queryClient.getQueryCache()

  const renderedAt = useMemo(() => Date.now(), [])

  const badQueries = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        return queryCache.subscribe(() => {
          notifyManager.batchCalls(onStoreChange)
          setTimeout(() => {
            notifyManager.batchCalls(onStoreChange)
          }, SLOW_THRESHOLD)
        })
      },
      [queryCache],
    ),
    () => getBadQueries(queryCache, renderedAt),
    () => getBadQueries(queryCache, renderedAt),
  )

  const [slow, errors] = badQueries.split(':').map((x) => parseInt(x))

  useEffect(() => {
    const queryError = state.errors[errorQueriesHashKey]
    const slowError = state.errors[slowQueriesHashKey]

    if (!queryError && errors > 0) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: ['errorQueriesKeyPlaceholder'],
          title: t('errors.networkError.title'),
          message: t('errors.networkError.message'),
          type: 'ENSJSUnknownError',
          priority: 1,
        },
      })
    } else if (queryError) {
      dispatch({
        type: 'CLEAR_ERROR',
        payload: {
          key: ['errorQueriesKeyPlaceholder'],
        },
      })
    }

    if (!slowError && slow > 0) {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          key: ['slowQueriesKeyPlaceholder'],
          title: t('errors.networkLatency.title'),
          message: t('errors.networkLatency.message'),
          type: 'ENSJSSubgraphError',
          priority: 1,
        },
      })
    } else if (slowError) {
      dispatch({
        type: 'CLEAR_ERROR',
        payload: {
          key: ['slowQueriesKeyPlaceholder'],
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badQueries])
}