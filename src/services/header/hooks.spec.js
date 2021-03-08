import { Link, useParams } from 'react-router-dom'
import { renderHook } from '@testing-library/react-hooks'

import { useUser } from 'services/user'

import { useMainNav, useSubNav } from './hooks'

jest.mock('services/user')
jest.mock('react-router-dom', () => ({
  Link: jest.fn(),
  useParams: jest.fn(),
}))

describe('useMainNav', () => {
  let hookData

  function setup(currentResource) {
    useParams.mockReturnValue(currentResource)
    hookData = renderHook(() => useMainNav())
  }

  describe('when called with no resources', () => {
    beforeEach(() => {
      setup({})
    })

    it('returns no links', () => {
      expect(hookData.result.current).toHaveLength(0)
    })
  })

  describe('when called with a provider', () => {
    beforeEach(() => {
      setup({
        provider: 'gh',
      })
    })

    it('returns the link to the provider', () => {
      expect(hookData.result.current).toEqual([
        {
          label: 'Github',
          to: '/gh',
          imageUrl: 'github-icon.svg',
        },
      ])
    })
  })

  describe('when called with a provider and owner', () => {
    beforeEach(() => {
      setup({
        provider: 'gh',
        owner: 'codecov',
      })
    })

    it('returns the link to the provider and owner', () => {
      expect(hookData.result.current).toEqual([
        {
          label: 'Github',
          to: '/gh',
          imageUrl: 'github-icon.svg',
        },
        {
          label: 'codecov',
          to: '/gh/codecov',
          imageUrl: 'https://github.com/codecov.png?size=40',
        },
      ])
    })
  })

  describe('when called with a provider, owner and repo', () => {
    beforeEach(() => {
      setup({
        provider: 'gh',
        owner: 'codecov',
        repo: 'gazebo',
      })
    })

    it('returns the link to the provider and owner', () => {
      expect(hookData.result.current).toEqual([
        {
          label: 'Github',
          to: '/gh',
          imageUrl: 'github-icon.svg',
        },
        {
          label: 'codecov',
          to: '/gh/codecov',
          imageUrl: 'https://github.com/codecov.png?size=40',
        },
        {
          label: 'gazebo',
          to: '/gh/codecov/gazebo',
          iconName: 'infoCircle',
        },
      ])
    })
  })
})

describe('useSubNav', () => {
  let hookData

  function setup(currentUser) {
    useParams.mockReturnValue({
      provider: 'gh',
    })
    useUser.mockReturnValue({ data: currentUser })
    hookData = renderHook(() => useSubNav())
  }

  describe('when called with no users', () => {
    beforeEach(() => {
      setup(null)
    })

    it('returns no links', () => {
      expect(hookData.result.current).toHaveLength(0)
    })
  })

  describe('when called with a user', () => {
    const user = {
      username: 'Shaggy',
      avatarUrl: '🚶‍♂️.jpeg',
    }

    beforeEach(() => {
      setup(user)
    })

    it('returns the link to the settings and sign out', () => {
      expect(hookData.result.current).toEqual([
        {
          label: 'Personal Settings',
          to: `/account/gh/${user.username}`,
          imageUrl: user.avatarUrl,
          LinkComponent: Link,
        },
        {
          label: 'Sign Out',
          href: '/sign-out',
          iconName: 'signOut',
        },
      ])
    })
  })
})
