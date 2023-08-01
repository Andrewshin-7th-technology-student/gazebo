import { lazy, Suspense } from 'react'

import Footer from 'layouts/Footer'
import Header from 'layouts/Header'
import ErrorBoundary from 'layouts/shared/ErrorBoundary'
import NetworkErrorBoundary from 'layouts/shared/NetworkErrorBoundary'
import ToastNotifications from 'layouts/ToastNotifications'
import { useTracking } from 'services/tracking'
import GlobalBanners from 'shared/GlobalBanners'
import GlobalTopBanners from 'shared/GlobalTopBanners'
import LoadingLogo from 'ui/LoadingLogo'

import { useUserAccessGate } from './hooks/useUserAccessGate'

const LimitedHeader = lazy(() => import('layouts/LimitedHeader'))
const DefaultOrgSelector = lazy(() => import('pages/DefaultOrgSelector'))
const InstallationHelpBanner = lazy(() => import('./InstallationHelpBanner'))
const TermsOfService = lazy(() => import('pages/TermsOfService'))

const FullPageLoader = () => (
  <div className="mt-16 flex flex-1 items-center justify-center">
    <LoadingLogo />
  </div>
)

const OnboardingOrChildren = ({ children }) => {
  const { isFullExperience, showAgreeToTerms, showDefaultOrgSelector } =
    useUserAccessGate()

  if (showAgreeToTerms && !isFullExperience)
    return (
      <Suspense fallback={null}>
        <TermsOfService />
      </Suspense>
    )

  if (showDefaultOrgSelector && !isFullExperience)
    return (
      <Suspense fallback={null}>
        <DefaultOrgSelector />
      </Suspense>
    )

  return children
}

function BaseLayout({ children }) {
  const { isFullExperience, showAgreeToTerms, isLoading } = useUserAccessGate()

  useTracking()

  // Pause rendering of a page till we know if the user is logged in or not
  if (isLoading) return <FullPageLoader />

  return (
    <>
      {isFullExperience ? (
        <>
          <Header />
          <GlobalTopBanners />
        </>
      ) : (
        <Suspense fallback={null}>
          <LimitedHeader />
          {showAgreeToTerms && <InstallationHelpBanner />}
        </Suspense>
      )}
      <Suspense fallback={<FullPageLoader />}>
        <ErrorBoundary sentryScopes={[['layout', 'base']]}>
          <NetworkErrorBoundary>
            <main className="container mb-8 mt-2 flex grow flex-col gap-2 md:p-0">
              <GlobalBanners />
              <OnboardingOrChildren>{children}</OnboardingOrChildren>
            </main>
          </NetworkErrorBoundary>
        </ErrorBoundary>
      </Suspense>
      {isFullExperience && (
        <>
          <Footer />
          <ToastNotifications />
        </>
      )}
    </>
  )
}

export default BaseLayout
