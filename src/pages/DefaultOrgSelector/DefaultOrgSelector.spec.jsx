import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { Suspense } from 'react'
import { MemoryRouter, Route } from 'react-router-dom'
import { useIntersection } from 'react-use'

import { trackSegmentEvent } from 'services/tracking/segment'

import DefaultOrgSelector from './DefaultOrgSelector'

jest.mock('services/tracking/segment')
jest.mock('react-use/lib/useIntersection')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})
const server = setupServer()

let testLocation
const wrapper =
  (initialEntries = ['/gh/codecov/cool-repo']) =>
  ({ children }) =>
    (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Route path="/:provider/:owner/:repo">
            <Suspense fallback={null}>{children}</Suspense>
          </Route>
          <Route
            path="*"
            render={({ location }) => {
              testLocation = location
              return null
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  })
})
afterEach(() => {
  queryClient.clear()
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

describe('DefaultOrgSelector', () => {
  beforeEach(() => jest.resetModules())

  function setup({
    myOrganizationsData,
    useUserData,
    isValidUser = true,
  } = {}) {
    const mockMutationVariables = jest.fn()
    const mockWindow = jest.fn()
    window.open = mockWindow
    const fetchNextPage = jest.fn()

    const user = userEvent.setup()

    server.use(
      graphql.query('UseMyOrganizations', (req, res, ctx) => {
        if (!!req.variables.after) {
          fetchNextPage(req.variables.after)
        }
        return res(ctx.status(200), ctx.data(myOrganizationsData))
      }),
      graphql.query('CurrentUser', (req, res, ctx) => {
        if (!isValidUser) {
          return res(ctx.status(200), ctx.data({ me: null }))
        }
        return res(ctx.status(200), ctx.data(useUserData))
      }),
      graphql.mutation('updateDefaultOrganization', (req, res, ctx) => {
        mockMutationVariables(req.variables)
        return res(
          ctx.status(200),
          ctx.data({
            updateDefaultOrganization: {
              defaultOrg: {
                username: 'criticalRole',
              },
            },
          })
        )
      })
    )

    return {
      user,
      mockMutationVariables,
      mockWindow,
      fetchNextPage,
    }
  }

  describe('page renders', () => {
    beforeEach(() =>
      setup({
        useUserData: {
          me: {
            email: 'chetney@cr.com',
            termsAgreement: false,
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })
    )

    it('only renders the component after a valid user is returned from the useUser hook', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      let selectLabel = screen.queryByText(/What org would you like to setup?/)
      expect(selectLabel).not.toBeInTheDocument()

      selectLabel = await screen.findByText(/What org would you like to setup?/)
      expect(selectLabel).toBeInTheDocument()
    })

    it('renders the select input', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      expect(selectOrg).toBeInTheDocument()
    })

    it('renders the select input with the correct options', async () => {
      const { user } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      expect(orgInList).toBeInTheDocument()

      const addNewOrg = screen.getByRole('option', {
        name: 'plus-circle.svg Add GitHub organization',
      })
      expect(addNewOrg).toBeInTheDocument()
    })

    it('does not render add org on different providers', async () => {
      const { user } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, {
        wrapper: wrapper(['/gl/codecov/cool-repo']),
      })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      expect(orgInList).toBeInTheDocument()

      const addNewOrg = screen.queryByRole('option', {
        name: 'plus-circle.svg Add GitHub organization',
      })
      expect(addNewOrg).not.toBeInTheDocument()
    })

    it('opens new page on add org select', async () => {
      const { user, mockWindow } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, {
        wrapper: wrapper(['/gh/codecov/cool-repo']),
      })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const addNewOrg = screen.getByRole('option', {
        name: 'plus-circle.svg Add GitHub organization',
      })

      await user.click(addNewOrg)

      await waitFor(() =>
        expect(mockWindow).toBeCalledWith(
          'https://github.com/apps/codecov/installations/new',
          '_blank'
        )
      )
    })

    it('renders continue to app button', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const submit = await screen.findByRole('button', {
        name: /Continue to app/,
      })
      expect(submit).toBeInTheDocument()
    })

    it('links to help finding your org', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const helpFindingOrg = await screen.findByRole('link', {
        name: /GitHub app is required/,
      })
      expect(helpFindingOrg).toHaveAttribute(
        'href',
        'https://github.com/apps/codecov'
      )
    })
  })

  describe('on submit', () => {
    beforeEach(() => jest.resetAllMocks())

    it('tracks the segment event', async () => {
      const segmentMock = jest.fn()
      trackSegmentEvent.mockReturnValue(segmentMock)

      const { user } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /What org would you like to setup?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue to app/,
      })

      await user.click(submit)

      expect(trackSegmentEvent).toHaveBeenLastCalledWith({
        event: 'Onboarding default org selector',
        data: {
          org: 'criticalRole',
          ownerid: '1234',
          username: 'chetney',
        },
      })
    })

    it('fires update default org mutation', async () => {
      const { user, mockMutationVariables } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /What org would you like to setup?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue to app/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockMutationVariables).toHaveBeenLastCalledWith({
          input: {
            username: 'criticalRole',
          },
        })
      )

      await waitFor(() =>
        expect(testLocation.pathname).toBe('/gh/criticalRole')
      )
    })

    it('redirects to the default org page', async () => {
      const { user } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /What org would you like to setup?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue to app/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(testLocation.pathname).toBe('/gh/criticalRole')
      )
    })
  })

  describe('on submit with no default org selected', () => {
    beforeEach(() => jest.resetAllMocks())

    it('redirects to self org page', async () => {
      const segmentMock = jest.fn()
      trackSegmentEvent.mockReturnValue(segmentMock)

      const { user, mockMutationVariables } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const submit = await screen.findByRole('button', {
        name: /Continue to app/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockMutationVariables).toHaveBeenLastCalledWith({
          input: {
            username: 'chetney',
          },
        })
      )

      expect(testLocation.pathname).toBe('/gh/chetney')
    })

    it('renders load more on load more trigger', async () => {
      const { user } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const loadMore = await screen.findByText(/Loading more items.../)
      expect(loadMore).toBeInTheDocument()
    })
  })

  describe('no current user', () => {
    it('redirects to login', async () => {
      setup({
        useUserData: {
          me: null,
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      await waitFor(() => expect(testLocation.pathname).toBe('/login'))
    })
  })

  describe('on fetch next page', () => {
    it('renders next page', async () => {
      const { user, fetchNextPage } = setup({
        useUserData: {
          me: {
            email: 'personal@cr.com',
            trackingMetadata: {
              ownerid: '1234',
            },
            user: {
              username: 'chetney',
            },
          },
        },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })
      useIntersection.mockReturnValue({ isIntersecting: true })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      await waitFor(() => expect(fetchNextPage).toBeCalled())
      await waitFor(() => expect(fetchNextPage).toHaveBeenCalledWith('MTI='))
    })
  })
})
