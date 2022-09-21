import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react-hooks'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route } from 'react-router-dom'

import { useCommitErrors } from './useCommitErrors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
const wrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/gh/codecov/codecov-exe/commit/9']}>
    <Route path="/:provider/:owner/:repo/commit/:commit">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Route>
  </MemoryRouter>
)

const dataReturned = {
  owner: {
    repository: {
      commit: {
        yamlErrors: {
          edges: [{ node: { errorCode: 'invalid_yaml' } }],
        },
        botErrors: {
          edges: [{ node: { errorCode: 'repo_bot_invalid' } }],
        },
      },
    },
  },
}

const server = setupServer()

beforeAll(() => server.listen())
beforeEach(() => {
  server.resetHandlers()
  queryClient.clear()
})
afterAll(() => server.close())

describe('useCommitErrors', () => {
  let hookData

  function setup() {
    server.use(
      graphql.query(`CommitErrors`, (req, res, ctx) => {
        return res(ctx.status(200), ctx.data(dataReturned))
      })
    )
    hookData = renderHook(() => useCommitErrors(), {
      wrapper,
    })
  }

  describe('when called and user is authenticated', () => {
    beforeEach(() => {
      setup()
      return hookData.waitFor(() => hookData.result.current.isSuccess)
    })

    it('returns commit info', () => {
      expect(hookData.result.current.data).toEqual({
        botErrors: [{ errorCode: 'repo_bot_invalid' }],
        yamlErrors: [{ errorCode: 'invalid_yaml' }],
      })
    })
  })
})
