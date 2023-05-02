import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route } from 'react-router-dom'

import CommitDetailFileExplorer from './CommitDetailFileExplorer'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
const server = setupServer()

const mockNoFiles = {
  username: 'nicholas-codecov',
  repository: {
    commit: {
      pathContents: {
        results: [],
        __typename: 'PathContents',
      },
    },
  },
}

const mockListData = {
  username: 'nicholas-codecov',
  repository: {
    commit: {
      pathContents: {
        results: [
          {
            __typename: 'PathContentFile',
            hits: 9,
            misses: 0,
            partials: 0,
            lines: 10,
            name: 'file.js',
            path: 'a/b/c/file.js',
            percentCovered: 100.0,
          },
        ],
        __typename: 'PathContents',
      },
    },
  },
}

const mockTreeData = {
  username: 'nicholas-codecov',
  repository: {
    commit: {
      pathContents: {
        results: [
          {
            __typename: 'PathContentDir',
            hits: 9,
            misses: 0,
            partials: 0,
            lines: 10,
            name: 'src',
            path: 'src',
            percentCovered: 100.0,
          },
          {
            __typename: 'PathContentFile',
            hits: 9,
            misses: 0,
            partials: 0,
            lines: 10,
            name: 'file.js',
            path: 'a/b/c/file.js',
            percentCovered: 100.0,
          },
        ],
        __typename: 'PathContents',
      },
    },
  },
}

const wrapper =
  (initialEntries = ['/gh/codecov/cool-repo/commit/sha256/tree/a/b/c']) =>
  ({ children }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Route path="/:provider/:owner/:repo/commit/:commit/tree/:path+">
            {children}
          </Route>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

beforeAll(() => {
  server.listen()
})
afterEach(() => {
  queryClient.clear()
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

describe('CommitDetailFileExplorer', () => {
  function setup(noFiles = false) {
    const user = userEvent.setup()
    const requestFilters = jest.fn()

    server.use(
      graphql.query('CommitPathContents', (req, res, ctx) => {
        requestFilters(req.variables.filters)

        if (noFiles || req.variables?.filters?.searchValue) {
          return res(ctx.status(200), ctx.data({ owner: mockNoFiles }))
        }

        if (
          req.variables?.filters?.displayType &&
          req.variables?.filters?.displayType === 'LIST'
        ) {
          return res(ctx.status(200), ctx.data({ owner: mockListData }))
        }

        return res(ctx.status(200), ctx.data({ owner: mockTreeData }))
      })
    )

    return { requestFilters, user }
  }

  describe('rendering table', () => {
    describe('displaying the table head', () => {
      beforeEach(() => setup())

      it('has a files column', () => {
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        const files = screen.getByText('Files')
        expect(files).toBeInTheDocument()
      })

      it('has a tracked lines column', () => {
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        const trackedLines = screen.getByText('Tracked lines')
        expect(trackedLines).toBeInTheDocument()
      })

      it('has a covered column', () => {
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        const covered = screen.getByText('Covered')
        expect(covered).toBeInTheDocument()
      })

      it('has a partial column', () => {
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        const partial = screen.getByText('Partial')
        expect(partial).toBeInTheDocument()
      })

      it('has a missed column', () => {
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        const missed = screen.getByText('Missed')
        expect(missed).toBeInTheDocument()
      })

      it('has a coverage column', () => {
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        const coverage = screen.getByText('Coverage %')
        expect(coverage).toBeInTheDocument()
      })
    })

    describe('table is displaying file tree', () => {
      describe('default sort is set', () => {
        it('sets default sort to name asc', async () => {
          const { requestFilters } = setup()
          render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

          await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

          await waitFor(() =>
            expect(requestFilters).toBeCalledWith({
              ordering: { direction: 'ASC', parameter: 'NAME' },
            })
          )
        })
      })

      describe('displaying a directory', () => {
        beforeEach(() => setup())

        it('has the correct url', async () => {
          render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

          await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

          const link = screen.getByRole('link', {
            name: 'folder.svg src',
          })
          expect(link).toHaveAttribute(
            'href',
            '/gh/codecov/cool-repo/commit/sha256/tree/a/b/c/src'
          )
        })
      })

      describe('displaying a file', () => {
        beforeEach(() => setup())

        it('has the correct url', async () => {
          render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

          await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

          const link = screen.getByRole('link', {
            name: 'document.svg file.js',
          })
          expect(link).toHaveAttribute(
            'href',
            '/gh/codecov/cool-repo/commit/sha256/blob/a/b/c/file.js'
          )
        })
      })
    })

    describe('table is displaying file list', () => {
      describe('display type is set', () => {
        it('set to list', async () => {
          const { requestFilters } = setup()
          render(<CommitDetailFileExplorer />, {
            wrapper: wrapper([
              '/gh/codecov/cool-repo/commit/123/tree/a/b/c?displayType=list',
            ]),
          })

          await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

          expect(requestFilters).toBeCalledWith({
            displayType: 'LIST',
            ordering: { direction: 'DESC', parameter: 'MISSES' },
          })
        })
      })

      describe('displaying a file', () => {
        beforeEach(() => setup())

        it('has the correct url', async () => {
          render(<CommitDetailFileExplorer />, {
            wrapper: wrapper([
              '/gh/codecov/cool-repo/commit/sha256/tree/a/b/c?displayType=list',
            ]),
          })

          await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

          const link = screen.getByRole('link', {
            name: /a\/b\/c\/file.js/i,
          })
          expect(link).toHaveAttribute(
            'href',
            '/gh/codecov/cool-repo/commit/sha256/blob/a/b/c/file.js'
          )
        })
      })
    })

    describe('there is no results found', () => {
      beforeEach(() => {
        setup(true)
      })

      it('displays error fetching data message', async () => {
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

        const message = screen.getByText(
          'There was a problem getting repo contents from your provider'
        )
        expect(message).toBeInTheDocument()
      })
    })
  })

  describe.each([
    ['Files', 'NAME'], // I don't know why NAME is reversed...
  ])('sorting on %s column', (column, code) => {
    describe('desc order', () => {
      beforeEach(() => jest.clearAllMocks())
      it('sets the api variables', async () => {
        const { requestFilters, user } = setup()
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

        let header = screen.getByText(column)
        await user.click(header)

        expect(requestFilters).toHaveBeenLastCalledWith({
          ordering: { direction: 'DESC', parameter: code },
        })
      })
    })

    describe('asc order', () => {
      beforeEach(() => jest.clearAllMocks())
      it('sets the api variables', async () => {
        const { requestFilters, user } = setup()
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

        let header = screen.getByText(column)
        await user.click(header)
        header = screen.getByText(column)
        await user.click(header)

        expect(requestFilters).toHaveBeenLastCalledWith({
          ordering: { direction: 'ASC', parameter: code },
        })
      })
    })
  })

  describe.each([
    ['Tracked lines', 'LINES'],
    ['Covered', 'HITS'],
    ['Partial', 'PARTIALS'],
    ['Missed', 'MISSES'],
    ['Coverage %', 'COVERAGE'],
  ])('sorting on %s column', (column, code) => {
    describe('desc order', () => {
      beforeEach(() => jest.clearAllMocks())
      it('sets the api variables', async () => {
        const { requestFilters, user } = setup()
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

        let header = screen.getByText(column)
        await user.click(header)
        header = screen.getByText(column)
        await user.click(header)

        expect(requestFilters).toHaveBeenLastCalledWith({
          ordering: { direction: 'DESC', parameter: code },
        })
      })
    })

    describe('asc order', () => {
      beforeEach(() => jest.clearAllMocks())
      it('sets the api variables', async () => {
        const { requestFilters, user } = setup()
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

        let header = screen.getByText(column)
        await user.click(header)

        expect(requestFilters).toHaveBeenLastCalledWith({
          ordering: { direction: 'ASC', parameter: code },
        })
      })
    })
  })

  describe('searching on the table', () => {
    describe('api variables are being set', () => {
      it('sets the correct api variables', async () => {
        const { requestFilters, user } = setup()
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

        const search = await screen.findByRole('textbox', {
          name: 'Search for files',
        })
        await user.type(search, 'cool-file.rs')

        await waitFor(() => {
          expect(requestFilters).toHaveBeenCalledWith({
            searchValue: 'cool-file.rs',
            ordering: { direction: 'ASC', parameter: 'NAME' },
          })
        })
      })
    })

    describe('there are no files to be found', () => {
      it('displays no items found message', async () => {
        const { user } = setup()
        render(<CommitDetailFileExplorer />, { wrapper: wrapper() })

        await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'))

        const dir = await screen.findByText('src')
        expect(dir).toBeInTheDocument()

        const search = await screen.findByRole('textbox', {
          name: 'Search for files',
        })
        await user.type(search, 'cool-file.rs')

        const noResults = await screen.findByText(/no results found/i)
        expect(noResults).toBeInTheDocument()
      })
    })
  })
})
