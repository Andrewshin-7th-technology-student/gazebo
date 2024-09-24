import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route } from 'react-router-dom'
import ResizeObserver from 'resize-observer-polyfill'

import { useFlags } from 'shared/featureFlags'

import TokenlessBanner from './TokenlessBanner'

jest.mock('shared/featureFlags')
global.ResizeObserver = ResizeObserver
const mockedUseFlags = useFlags as jest.Mock

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const server = setupServer()
beforeAll(() => {
  console.error = () => {}
  server.listen()
})
beforeEach(() => {
  server.resetHandlers()
  queryClient.clear()
})
afterAll(() => server.close())

const mockOwner = {
  ownerid: 1,
  username: 'codecov',
  avatarUrl: 'http://127.0.0.1/avatar-url',
  isCurrentUserPartOfOrg: true,
  isAdmin: true,
}

const wrapper =
  (
    initialEntries = ['/gh/codecov'],
    path = '/:provider/:owner'
  ): React.FC<React.PropsWithChildren> =>
  ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Route path={path}>{children}</Route>
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('TokenlessBanner', () => {
  function setup({ isAdmin = true, orgUploadToken = 'mock-token' } = {}) {
    mockedUseFlags.mockReturnValue({ tokenlessSection: true })

    server.use(
      graphql.query('DetailOwner', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.data({
            owner: {
              ...mockOwner,
              isAdmin: isAdmin,
            },
          })
        )
      }),
      graphql.query('GetOrgUploadToken', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.data({
            owner: {
              orgUploadToken: orgUploadToken,
            },
          })
        )
      })
    )

    return { user: userEvent.setup() }
  }

  it('should return null if no owner is provided', () => {
    setup()
    const { container } = render(<TokenlessBanner />, {
      wrapper: wrapper(['/gh/'], '/:provider'),
    })

    expect(container).toBeEmptyDOMElement()
  })

  describe('when user is admin', () => {
    it('should render content of AdminTokenlessBanner', async () => {
      setup({ isAdmin: true })
      render(<TokenlessBanner />, { wrapper: wrapper() })

      const content = await screen.findByText(
        /Uploading with token is now required./
      )
      expect(content).toBeInTheDocument()
    })

    it('should render token tooltip', async () => {
      setup({ isAdmin: true })
      render(<TokenlessBanner />, { wrapper: wrapper() })

      const tooltip = await screen.findByText(/the token/)
      expect(tooltip).toBeInTheDocument()
    })

    it('should render link to global upload token settings', async () => {
      setup({ isAdmin: true })
      render(<TokenlessBanner />, { wrapper: wrapper() })

      const link = await screen.findByRole('link', {
        name: /global upload token settings./,
      })

      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute(
        'href',
        '/account/gh/codecov/org-upload-token'
      )
    })
  })

  describe('when user is not admin', () => {
    it('should render content of MemberTokenlessBanner', async () => {
      setup({ isAdmin: false })
      render(<TokenlessBanner />, { wrapper: wrapper() })

      const content = await screen.findByText(
        /Uploading with token is now required./
      )
      expect(content).toBeInTheDocument()
    })

    it('should render token tooltip', async () => {
      setup({ isAdmin: false })
      render(<TokenlessBanner />, { wrapper: wrapper() })

      const tooltip = await screen.findByText(/the token/)
      expect(tooltip).toBeInTheDocument()
    })

    it('should render reach to admin copy', async () => {
      setup({ isAdmin: false })
      render(<TokenlessBanner />, { wrapper: wrapper() })

      const copy = await screen.findByText(
        /Contact your admins to manage the upload token settings./
      )
      expect(copy).toBeInTheDocument()
    })
  })

  describe('org upload token tooltip', () => {
    it('should render the tooltip', async () => {
      setup()
      render(<TokenlessBanner />, { wrapper: wrapper() })

      const tooltip = await screen.findByText(/the token/)
      expect(tooltip).toBeInTheDocument()
    })

    it('should render the content6 of the tooltip on hover', async () => {
      const { user } = setup()
      render(<TokenlessBanner />, { wrapper: wrapper() })

      await waitFor(() => screen.findByTestId(/token-trigger/))
      const tooltip = screen.getByTestId(/token-trigger/)
      await user.hover(tooltip)

      const tooltipContent = await screen.findByText(/mock-token/, {
        selector: '[role="tooltip"] div',
      })
      expect(tooltipContent).toBeInTheDocument()
    })

    it('should be rendered with eye off icon', async () => {
      const { user } = setup()
      render(<TokenlessBanner />, { wrapper: wrapper() })

      await waitFor(() => screen.findByTestId(/token-trigger/))
      const tooltip = screen.getByTestId(/token-trigger/)
      await user.hover(tooltip)

      const eyeIcon = await screen.findByText(/eye-off.svg/, {
        selector: '[role="tooltip"] svg',
      })
      expect(eyeIcon).toBeInTheDocument()
    })

    it('switches to eye on icon on click', async () => {
      const { user } = setup()
      render(<TokenlessBanner />, { wrapper: wrapper() })

      await waitFor(() => screen.findByTestId(/token-trigger/))
      const tooltip = screen.getByTestId(/token-trigger/)
      await user.hover(tooltip)

      const eyeIcon = await screen.findByText(/eye-off.svg/, {
        selector: '[role="tooltip"] svg',
      })
      expect(eyeIcon).toBeInTheDocument()

      await user.click(eyeIcon)

      const eyeOnIcon = await screen.findByText(/eye.svg/, {
        selector: '[role="tooltip"] svg',
      })
      expect(eyeOnIcon).toBeInTheDocument()
    })

    it('renders endcoded token on eye icon click', async () => {
      const { user } = setup()
      render(<TokenlessBanner />, { wrapper: wrapper() })

      await waitFor(() => screen.findByTestId(/token-trigger/))
      const tooltip = screen.getByTestId(/token-trigger/)
      await user.hover(tooltip)

      const eyeIcon = await screen.findByText(/eye-off.svg/, {
        selector: '[role="tooltip"] svg',
      })
      expect(eyeIcon).toBeInTheDocument()

      await user.click(eyeIcon)

      const encodedToken = await screen.findByText(/xxxx-xxxxx/, {
        selector: '[role="tooltip"] div',
      })
      expect(encodedToken).toBeInTheDocument()
    })

    it('renders copy token to clipboard', async () => {
      const { user } = setup()
      render(<TokenlessBanner />, { wrapper: wrapper() })

      await waitFor(() => screen.findByTestId(/token-trigger/))
      const tooltip = screen.getByTestId(/token-trigger/)
      await user.hover(tooltip)

      const copyButton = await screen.findByText(/clipboard-copy.svg/, {
        selector: '[role="tooltip"] svg',
      })
      expect(copyButton).toBeInTheDocument()
    })
  })
})
