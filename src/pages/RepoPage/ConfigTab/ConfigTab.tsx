import { lazy, Suspense } from 'react'
import { Switch, useParams } from 'react-router-dom'

import { SentryRoute } from 'sentry'

import SidebarLayout from 'layouts/SidebarLayout'
import { useOwner, useUser } from 'services/user'
import LoadingLogo from 'ui/LoadingLogo'
import Sidemenu from 'ui/Sidemenu'

import ConfigurationManager from './tabs/ConfigurationManager'

const NotFound = lazy(() => import('../../NotFound'))
const GeneralTab = lazy(() => import('./tabs/GeneralTab'))
const YamlTab = lazy(() => import('./tabs/YamlTab'))
const BadgesAndGraphsTab = lazy(() => import('./tabs/BadgesAndGraphsTab'))
const AchievementsTab = lazy(() => import('./tabs/AchievementsTab'))

const tabLoading = (
  <div className="flex size-full items-center justify-center">
    <LoadingLogo />
  </div>
)

interface URLParams {
  owner: string
}

function ConfigTab() {
  const { owner } = useParams<URLParams>()
  const { data: currentOwner } = useOwner({ username: owner })
  const { data: currentUser } = useUser()
  const isPersonalSettings =
    currentUser?.user?.username?.toLowerCase() === owner?.toLowerCase()

  if (!currentOwner?.isCurrentUserPartOfOrg) return <NotFound />

  const sideMenuLinks = [
    {
      pageName: 'configuration',
      exact: true,
      children: 'Configuration Manager',
    },
    {
      pageName: 'configGeneral',
    },
    { pageName: 'configYaml' },
    { pageName: 'configBadge' },
    ...(!isPersonalSettings ? [{ pageName: 'achievements' }] : []),
  ]

  return (
    <div className="mt-2">
      <SidebarLayout sidebar={<Sidemenu links={sideMenuLinks} />}>
        <Suspense fallback={tabLoading}>
          <Switch>
            <SentryRoute path="/:provider/:owner/:repo/config" exact>
              <ConfigurationManager />
            </SentryRoute>
            <SentryRoute path="/:provider/:owner/:repo/config/general" exact>
              <GeneralTab />
            </SentryRoute>
            <SentryRoute path="/:provider/:owner/:repo/config/yaml" exact>
              <YamlTab />
            </SentryRoute>
            <SentryRoute path="/:provider/:owner/:repo/config/badge" exact>
              <BadgesAndGraphsTab />
            </SentryRoute>
            {!isPersonalSettings ? (
              <SentryRoute
                path="/:provider/:owner/:repo/config/achievements"
                exact
              >
                <AchievementsTab />
              </SentryRoute>
            ) : null}
            <SentryRoute path="/:provider/:owner/:repo/config/*">
              <NotFound />
            </SentryRoute>
          </Switch>
        </Suspense>
      </SidebarLayout>
    </div>
  )
}

export default ConfigTab
